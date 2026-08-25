import { redirect } from 'react-router';
import { requireUserId } from '#/utils/auth.server';
import { prisma } from '#/utils/db.server';
import { isUserAuthorized } from '#/utils/permission.server';
import type { NewsFeedItem } from '#/utils/news/types';
import { parseRuleList, type NewsWatchRule } from '#/utils/news/watch';
import type { NewsCatalyst } from '@prisma/client';

/**
 * Access control and queries for the news feed.
 *
 * Gated like the ChartLog download, with one deliberate difference: ChartLog is
 * a yearly-plan perk, whereas the roadmap's approved scope puts news behind
 * "active subscribers + staff" — so a monthly member gets it. `isUserAuthorized`
 * is the same check the app layout already uses, which means an expired member
 * cannot slip through here just by keeping the URL.
 */

/** Staff run the community, so they get the feed regardless of plan. */
const STAFF_ROLES = ['admin', 'moderator'];

export type NewsAccess = { allowed: boolean; userId: string; isStaff: boolean };

/** Redirects to /login when signed out, via `requireUserId`. */
export async function getNewsAccess(request: Request): Promise<NewsAccess> {
  const userId = await requireUserId(request);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roles: { select: { name: true } },
      subscription: {
        select: { status: true, currentPeriodEnd: true, priceId: true },
      },
    },
  });

  // Staff first: a moderator need not hold a subscription at all, so checking
  // them after `isUserAuthorized` would reject them as inactive.
  const isStaff = Boolean(
    user?.roles.some((role) => STAFF_ROLES.includes(role.name))
  );
  if (isStaff) return { allowed: true, userId, isStaff: true };

  return { allowed: isUserAuthorized(user), userId, isStaff: false };
}

/** Loader guard: throws a redirect for anyone without access. */
export async function requireNewsAccess(request: Request): Promise<NewsAccess> {
  const access = await getNewsAccess(request);
  if (!access.allowed) {
    // Same destination the rest of the app uses for a lapsed member.
    throw redirect('/pricing');
  }
  return access;
}

/** Shared by the socket handler, which has a userId but no Request. */
export async function userHasNewsAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      roles: { select: { name: true } },
      subscription: {
        select: { status: true, currentPeriodEnd: true, priceId: true },
      },
    },
  });
  if (user?.roles.some((role) => STAFF_ROLES.includes(role.name))) return true;
  return isUserAuthorized(user);
}

export const NEWS_PAGE_SIZE = 60;

export type NewsFilters = {
  /** Substring match on ticker. */
  ticker?: string;
  catalysts?: NewsCatalyst[];
  feedKeys?: string[];
  minScore?: number;
  /**
   * Hide items with no resolvable ticker. ON by default.
   *
   * This is the filter that makes the page usable, and it is deliberately NOT
   * a score threshold or a "hide OTHER" rule. Hiding OTHER would hide every
   * 8-K — EDGAR headlines are synthesized as "8-K — COMPANY" and carry no
   * keywords to classify — and 8-Ks are among the most valuable rows here.
   * Ticker presence separates spam from signal without touching the filings:
   * you cannot trade what has no symbol.
   */
  withTickerOnly?: boolean;
};

export type NewsPage = {
  items: NewsFeedItem[];
  nextCursor: string | null;
};

/** Prisma row shape -> the payload the client and the socket both use. */
export function toFeedItem(row: {
  id: string;
  feedKey: string;
  headline: string;
  summary: string | null;
  url: string;
  publishedAt: Date;
  catalyst: NewsCatalyst;
  score: number;
  formType: string | null;
  haltReason: string | null;
  feed: { name: string; tier: string | null };
  tickers: { ticker: string }[];
}): NewsFeedItem {
  return {
    id: row.id,
    feedKey: row.feedKey,
    feedName: row.feed.name,
    tier: row.feed.tier,
    headline: row.headline,
    summary: row.summary,
    url: row.url,
    publishedAt: row.publishedAt.toISOString(),
    catalyst: row.catalyst,
    score: row.score,
    formType: row.formType,
    haltReason: row.haltReason,
    tickers: row.tickers.map((t) => t.ticker),
  };
}

export async function getNewsPage(
  filters: NewsFilters = {},
  cursor?: string | null
): Promise<NewsPage> {
  const where = {
    ...(filters.minScore ? { score: { gte: filters.minScore } } : {}),
    ...(filters.catalysts?.length ? { catalyst: { in: filters.catalysts } } : {}),
    ...(filters.feedKeys?.length ? { feedKey: { in: filters.feedKeys } } : {}),
    ...(filters.ticker
      ? { tickers: { some: { ticker: { contains: filters.ticker.toUpperCase() } } } }
      : filters.withTickerOnly
      ? { tickers: { some: {} } }
      : {}),
  };

  const rows = await prisma.newsItem.findMany({
    where,
    // publishedAt, not ingestedAt: a backfilled item belongs where it broke.
    // id breaks ties so the cursor cannot loop on same-timestamp rows.
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    take: NEWS_PAGE_SIZE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    include: {
      feed: { select: { name: true, tier: true } },
      tickers: { select: { ticker: true } },
    },
  });

  const hasMore = rows.length > NEWS_PAGE_SIZE;
  const page = hasMore ? rows.slice(0, NEWS_PAGE_SIZE) : rows;

  return {
    items: page.map(toFeedItem),
    nextCursor: hasMore ? page[page.length - 1].id : null,
  };
}

/** Source list for the filter bar. */
export async function getNewsSources() {
  return prisma.newsFeed.findMany({
    where: { enabled: true },
    select: { key: true, name: true, tier: true, kind: true },
    orderBy: { name: 'asc' },
  });
}

/**
 * Active themes, for the "Add to Theme" picker on a news row.
 *
 * INACTIVE themes are left out: they are the ones a moderator has retired, and
 * offering them here would be offering to add a fresh catalyst to a dead theme.
 * Note this is a UI filter only -- `buildScoreContext` counts a ThemeTicker row
 * whatever its parent theme's status, so an archived theme still carries its
 * tickers' +15.
 */
export async function getNewsThemes() {
  return prisma.theme.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, name: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
}

/**
 * A user's watch rules, JSON columns parsed, ready to ship to the client.
 *
 * Ordered oldest-first because `matchWatchRules` takes the first match — so
 * "first rule you made wins" is a rule the user can reason about.
 */
export async function getUserNewsWatches(
  userId: string
): Promise<NewsWatchRule[]> {
  const rows = await prisma.newsWatch.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      label: true,
      tickers: true,
      catalysts: true,
      minScore: true,
      sound: true,
      enabled: true,
    },
  });

  return rows.map((row) => ({
    ...row,
    tickers: parseRuleList(row.tickers),
    catalysts: parseRuleList(row.catalysts),
  }));
}
