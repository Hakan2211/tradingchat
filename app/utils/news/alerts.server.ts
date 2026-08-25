import { Prisma } from '@prisma/client';
import { prisma } from '../db.server';
import { isUserAuthorized } from '../permission.server';
import { matchWatchRules, parseRuleList, type NewsWatchRule } from './watch';
import type { FiredAlert, NewsFeedItem } from './types';

export type { FiredAlert };

/**
 * Watch-rule matching, moved to the server so that alerts survive the tab.
 *
 * Matching used to run only in the browser (roadmap §6): the server emitted
 * every item to the `news` room and each client decided what deserved a toast.
 * That is fine for a feed and wrong for an alert. The hook's own reasoning was
 * "the member is in a chat room when the 8-K drops" — but "the member had no
 * tab open at 07:15" is the same failure and the more common one, and a purely
 * client-side match has no answer to it. Two tabs also both matched, so one
 * event pinged twice.
 *
 * So a fired rule is now a row. The browser keeps `watch.ts` for previewing a
 * rule as it is edited; this module and that one share the same predicate, so
 * the two sides cannot drift.
 */

/** Staff run the community, so they get alerts regardless of plan. */
const STAFF_ROLES = ['admin', 'moderator'];

type WatchRow = {
  id: string;
  userId: string;
  label: string;
  tickers: string | null;
  catalysts: string | null;
  minScore: number;
  sound: boolean;
  user: {
    roles: { name: string }[];
    subscription: {
      status: string;
      currentPeriodEnd: Date | null;
      priceId: string | null;
    } | null;
  };
};

/**
 * Enabled rules, grouped by user, for users who may actually see the feed.
 *
 * One query rather than `userHasNewsAccess` per user: this runs on every
 * fan-out batch, and a query per member would scale with the community.
 *
 * Deliberately NOT cached. A short TTL would be cheap, but it would also mean a
 * member editing a rule waits for it to expire before the rule bites, and
 * "change a rule, watch it work" is the behaviour the client-side design got
 * right. One indexed read per batch is a price worth paying to keep it.
 */
async function eligibleRulesByUser(): Promise<Map<string, NewsWatchRule[]>> {
  const rows = (await prisma.newsWatch.findMany({
    where: { enabled: true },
    // Oldest first, because `matchWatchRules` takes the first match — so
    // "the first rule you made wins" holds here exactly as it does client-side.
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      userId: true,
      label: true,
      tickers: true,
      catalysts: true,
      minScore: true,
      sound: true,
      user: {
        select: {
          roles: { select: { name: true } },
          subscription: {
            select: { status: true, currentPeriodEnd: true, priceId: true },
          },
        },
      },
    },
  })) as WatchRow[];

  const byUser = new Map<string, NewsWatchRule[]>();
  // Access is a property of the user, not the rule, so decide it once.
  const allowed = new Map<string, boolean>();

  for (const row of rows) {
    let canSee = allowed.get(row.userId);
    if (canSee === undefined) {
      canSee =
        row.user.roles.some((role) => STAFF_ROLES.includes(role.name)) ||
        isUserAuthorized(row.user);
      allowed.set(row.userId, canSee);
    }
    if (!canSee) continue;

    const rule: NewsWatchRule = {
      id: row.id,
      label: row.label,
      tickers: parseRuleList(row.tickers),
      catalysts: parseRuleList(row.catalysts),
      minScore: row.minScore,
      sound: row.sound,
      enabled: true,
    };
    const existing = byUser.get(row.userId);
    if (existing) existing.push(rule);
    else byUser.set(row.userId, [rule]);
  }

  return byUser;
}

/**
 * Match a fan-out batch against every user's rules and persist what fired.
 *
 * Returns only the alerts this call actually created, so the caller emits each
 * one exactly once.
 *
 * The `@@unique([userId, newsItemId])` constraint is what makes that true. The
 * re-score sweep re-emits a CHANGED row under its existing id — deliberately,
 * so a row that gained the score to match a rule gets a second chance at it —
 * and without the constraint a row whose score merely drifted upwards would
 * alert again on every sweep.
 */
export async function recordAlerts(
  items: NewsFeedItem[]
): Promise<FiredAlert[]> {
  if (items.length === 0) return [];

  const rulesByUser = await eligibleRulesByUser();
  if (rulesByUser.size === 0) return [];

  // Which (user, item) pairs have already alerted.
  //
  // The unique constraint below would catch these anyway, but relying on it
  // alone is wrong in practice: the re-score sweep re-emits rows constantly, so
  // the DUPLICATE IS THE COMMON PATH, and `db.server.ts` logs Prisma errors to
  // stdout. Letting it throw would fill the production log with unique-constraint
  // stack traces describing normal operation. One indexed read avoids all of it.
  const existing = await prisma.newsAlert.findMany({
    where: {
      userId: { in: [...rulesByUser.keys()] },
      newsItemId: { in: items.map((item) => item.id) },
    },
    select: { userId: true, newsItemId: true },
  });
  const alreadyAlerted = new Set(
    existing.map((row) => `${row.userId}:${row.newsItemId}`)
  );

  const fired: FiredAlert[] = [];

  for (const [userId, rules] of rulesByUser) {
    for (const item of items) {
      if (alreadyAlerted.has(`${userId}:${item.id}`)) continue;

      const rule = matchWatchRules(item, rules);
      if (!rule) continue;

      try {
        const row = await prisma.newsAlert.create({
          data: {
            userId,
            newsItemId: item.id,
            watchId: rule.id,
            // Snapshot: the rule can be renamed or deleted, and an alert in the
            // history still has to say what fired it.
            watchLabel: rule.label,
            score: item.score,
          },
          select: { id: true, firedAt: true, readAt: true },
        });

        fired.push({
          id: row.id,
          userId,
          item,
          watchId: rule.id,
          watchLabel: rule.label,
          sound: rule.sound,
          score: item.score,
          firedAt: row.firedAt.toISOString(),
          readAt: null,
        });
      } catch (error) {
        // P2002 is the unique constraint. The pre-filter above catches the
        // ordinary duplicate; reaching here means two fan-outs raced for the
        // same pair, which is still not an error — skip it and let anything
        // else surface.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          continue;
        }
        console.warn(
          `[news] could not record alert for user ${userId} on item ${item.id}:`,
          error
        );
      }
    }
  }

  return fired;
}

export const ALERT_HISTORY_LIMIT = 50;

/** Rows -> the shape the socket already delivers, so the client has one type. */
export async function getUserAlerts(
  userId: string,
  limit = ALERT_HISTORY_LIMIT
): Promise<FiredAlert[]> {
  const rows = await prisma.newsAlert.findMany({
    where: { userId },
    orderBy: { firedAt: 'desc' },
    take: limit,
    include: {
      newsItem: {
        include: {
          feed: { select: { name: true, tier: true } },
          tickers: { select: { ticker: true } },
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    item: {
      id: row.newsItem.id,
      feedKey: row.newsItem.feedKey,
      feedName: row.newsItem.feed.name,
      tier: row.newsItem.feed.tier,
      headline: row.newsItem.headline,
      summary: row.newsItem.summary,
      url: row.newsItem.url,
      publishedAt: row.newsItem.publishedAt.toISOString(),
      catalyst: row.newsItem.catalyst,
      // The item's CURRENT score, which a re-score may have moved since.
      score: row.newsItem.score,
      formType: row.newsItem.formType,
      haltReason: row.newsItem.haltReason,
      tickers: row.newsItem.tickers.map((ticker) => ticker.ticker),
    },
    watchId: row.watchId,
    watchLabel: row.watchLabel,
    // Not stored: `sound` belongs to the live ping, and replaying history must
    // never make a noise. Only the socket payload carries a true here.
    sound: false,
    // The score AT FIRE TIME, which is what explains why the rule matched.
    score: row.score,
    firedAt: row.firedAt.toISOString(),
    readAt: row.readAt?.toISOString() ?? null,
  }));
}

export async function countUnreadAlerts(userId: string): Promise<number> {
  return prisma.newsAlert.count({ where: { userId, readAt: null } });
}

/** `alertId` omitted marks the user's whole backlog read. */
export async function markAlertsRead(
  userId: string,
  alertId?: string
): Promise<number> {
  const result = await prisma.newsAlert.updateMany({
    // Always scoped by userId, so a forged id cannot touch another user's row.
    where: { userId, readAt: null, ...(alertId ? { id: alertId } : {}) },
    data: { readAt: new Date() },
  });
  return result.count;
}
