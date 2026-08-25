/**
 * Watch-rule matching. Runs in the BROWSER, on every `news.item` the socket
 * pushes, so this module must stay dependency-free for the same reason
 * `constants.ts` does: importing `@prisma/client` for its enum VALUES pulls
 * Prisma into the client bundle, where it is undefined. Type-only imports are
 * erased at build time and are fine; `NewsCatalyst` below is one.
 *
 * Matching is client-side by design (roadmap §6): the server emits every item
 * to the `news` room and each client decides what deserves an alert. That keeps
 * the fan-out dumb and makes a rule change take effect without a reconnect.
 */
import type { NewsFeedItem } from './types';

/** A `NewsWatch` row with its JSON columns already parsed. */
export type NewsWatchRule = {
  id: string;
  label: string;
  /** null or empty = any ticker. */
  tickers: string[] | null;
  /** null or empty = any catalyst. */
  catalysts: string[] | null;
  minScore: number;
  sound: boolean;
  enabled: boolean;
};

/**
 * The first enabled rule this item satisfies, or null.
 *
 * First match wins rather than collecting all of them: the caller needs one
 * toast and one answer to "should this ping", not a list. Rules arrive ordered
 * by creation, so the oldest rule is the one whose `sound` setting applies.
 */
export function matchWatchRules(
  item: NewsFeedItem,
  rules: NewsWatchRule[]
): NewsWatchRule | null {
  for (const rule of rules) {
    if (ruleMatches(item, rule)) return rule;
  }
  return null;
}

export function ruleMatches(item: NewsFeedItem, rule: NewsWatchRule): boolean {
  if (!rule.enabled) return false;
  if (item.score < rule.minScore) return false;

  if (rule.catalysts?.length && !rule.catalysts.includes(item.catalyst)) {
    return false;
  }

  if (rule.tickers?.length) {
    // Exact symbol match, not substring: "AAP" must not fire on AAPL.
    const wanted = new Set(rule.tickers);
    if (!item.tickers.some((ticker) => wanted.has(ticker))) return false;
  }

  return true;
}

/**
 * Parses a `NewsWatch` JSON column into a string array.
 *
 * Returns null for null, absent and malformed values alike. Malformed folds
 * into "no constraint" rather than throwing, because a corrupt column should
 * cost a user a too-broad rule, not a crashed feed page.
 */
export function parseRuleList(value: string | null): string[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    const list = parsed.filter((v): v is string => typeof v === 'string');
    return list.length ? list : null;
  } catch {
    return null;
  }
}

/** Splits the comma/space separated ticker input from the rule form. */
export function parseTickerInput(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .toUpperCase()
        .split(/[\s,]+/)
        .map((t) => t.trim())
        .filter(Boolean)
    )
  );
}

/**
 * A rule with no ticker list, no catalyst list and a zero score matches every
 * item on every wire — several hundred an hour, each its own toast. The form
 * rejects that shape; this is the shared predicate so the client and the
 * server agree on what "unconstrained" means.
 */
export function isUnconstrained(rule: {
  tickers: string[] | null;
  catalysts: string[] | null;
  minScore: number;
}): boolean {
  return (
    !rule.tickers?.length && !rule.catalysts?.length && rule.minScore <= 0
  );
}

/** Rules per user. Generous, but the loader ships these on every page load. */
export const MAX_WATCH_RULES = 20;
/** Symbols per rule. */
export const MAX_WATCH_TICKERS = 50;
