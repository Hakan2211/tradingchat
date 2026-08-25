/**
 * News constants that BOTH the server and the browser need.
 *
 * Deliberately dependency-free. `score.ts` cannot serve this purpose: it
 * imports `NewsCatalyst` and `WireTier` from `@prisma/client` as runtime
 * VALUES (it keys a lookup table off them), and importing that module from a
 * route component pulls Prisma into the client bundle, where it is undefined —
 * which crashed the /news page on hydration with
 * "Cannot read properties of undefined (reading 'OFFERING')".
 *
 * Anything the client needs from the scoring layer belongs here instead.
 */

/** The score at or above which a watch rule fires, and the feed highlights. */
export const DEFAULT_ALERT_THRESHOLD = 60;

/**
 * Every `NewsCatalyst` value, as plain strings.
 *
 * Duplicated from the Prisma enum on purpose — see the module note above: the
 * generated enum is a runtime value and cannot cross into the browser. The
 * filter bar and the watch-rule form both key off this list, so a new catalyst
 * has to be added here as well as in `schema.prisma`.
 */
export const NEWS_CATALYSTS = [
  'OFFERING',
  'SHELF',
  'REVERSE_SPLIT',
  'HALT',
  'RESUMPTION',
  'FDA',
  'MERGER',
  'CONTRACT',
  'EARNINGS',
  'INSIDER',
  'UPLISTING',
  'OTHER',
] as const;

export type NewsCatalystName = (typeof NEWS_CATALYSTS)[number];
