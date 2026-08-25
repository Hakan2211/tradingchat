import {
  NewsCatalyst,
  NewsSourceKind,
  type NewsFeed,
  type NewsItem,
} from '@prisma/client';
import { prisma } from '../db.server';
import { nasdaqHaltsAdapter } from './adapters/nasdaq-halts';
import { secEdgarAdapter } from './adapters/sec-edgar';
import { wireAdapter } from './adapters/wires';
import { DEDUPE_WINDOW_MS, dedupeKeyFor } from './dedupe';
import { sessionAwareInterval } from './schedule';
import { scoreItem, type ScoreContext } from './score';
import { toFeedItem } from '../news.server';
import type { NewsAdapter, NewsFeedItem, RawItem } from './types';

/**
 * The poll loop: fetch -> normalise -> dedupe -> persist -> (M3) fan out.
 *
 * Same shape as the LiveKit reconciliation sweep in server/server.ts — timers
 * in the single long-lived Node process, guarded by an env flag. Nothing here
 * may throw into a timer: one dead wire must never stop EDGAR, so every fetch
 * is wrapped and failures are recorded on the feed row instead.
 */

const ADAPTERS: Partial<Record<NewsSourceKind, NewsAdapter>> = {
  [NewsSourceKind.SEC_EDGAR]: secEdgarAdapter,
  [NewsSourceKind.EXCHANGE_HALT]: nasdaqHaltsAdapter,
  // Every WIRE row shares this one adapter; the row IS the config.
  [NewsSourceKind.WIRE]: wireAdapter,
  // VENDOR_API (Finnhub) stays unbuilt — env-gated and off by default.
};

/**
 * How far back a cold start is allowed to look.
 *
 * Without this clamp, a feed whose `lastItemAt` is a week old (a deploy gap, a
 * dead container) would replay a week of filings into the feed as if they had
 * just broken. Two hours covers a restart and a pre-market gap; older than that
 * is history, not news.
 */
const MAX_LOOKBACK_MS = 2 * 60 * 60 * 1000;

/** Backoff ceiling for a failing feed, so a dead endpoint still recovers. */
const MAX_BACKOFF_MS = 5 * 60_000;

export type PreparedItem = RawItem & {
  dedupeKey: string;
  disposition: 'insert' | 'revise' | 'duplicate' | 'same-source-repeat';
  duplicateOf?: string;
  score: number;
  scoreReasons: string[];
};

/** Corroboration window: a pump wire plus a halt 30min apart is one event. */
const CORROBORATION_MS = 30 * 60_000;

/**
 * Build the scoring context for one item.
 *
 * Everything the scorer needs that lives in the database is gathered here, so
 * `score.ts` itself stays pure and testable against fixtures.
 */
export async function buildScoreContext(
  feed: NewsFeed,
  item: RawItem
): Promise<ScoreContext> {
  const tickers = item.tickers ?? [];

  if (tickers.length === 0) {
    return {
      catalyst: item.catalyst ?? NewsCatalyst.OTHER,
      tier: feed.tier,
      headline: item.headline,
      summary: item.summary,
      tickers,
      exchanges: [],
      onWatchlist: false,
      corroborated: false,
    };
  }

  const [universeRows, themeHit, scannerHit, corroborating] = await Promise.all([
    prisma.symbolUniverse.findMany({
      where: { ticker: { in: tickers } },
      select: { exchange: true },
    }),
    prisma.themeTicker.findFirst({
      where: { ticker: { in: tickers } },
      select: { id: true },
    }),
    prisma.scannerEntry.findFirst({
      where: { ticker: { in: tickers }, status: 'WATCHING' },
      select: { id: true },
    }),
    // Corroboration applies to WIRE items ONLY.
    //
    // Halts and filings ARE the corroborating evidence — asking whether a halt
    // is corroborated is the wrong question, and asking it caused a real bug:
    // a stored halt being re-scored matched ITSELF here, so every halt and
    // filing silently self-corroborated for +25 and a lifted cap.
    //
    // The self-exclusion below is belt-and-braces for the wire case, where two
    // rows from the same feed could otherwise vouch for each other.
    feed.kind === NewsSourceKind.WIRE
      ? prisma.newsItem.findFirst({
          where: {
            feed: {
              kind: { in: [NewsSourceKind.EXCHANGE_HALT, NewsSourceKind.SEC_EDGAR] },
            },
            tickers: { some: { ticker: { in: tickers } } },
            publishedAt: {
              gte: new Date(item.publishedAt.getTime() - CORROBORATION_MS),
              lte: new Date(item.publishedAt.getTime() + CORROBORATION_MS),
            },
            NOT: { AND: [{ feedKey: item.feedKey }, { externalId: item.externalId }] },
          },
          select: { id: true },
        })
      : null,
  ]);

  return {
    catalyst: item.catalyst ?? NewsCatalyst.OTHER,
    tier: feed.tier,
    headline: item.headline,
    summary: item.summary,
    tickers,
    exchanges: universeRows.map((row) => row.exchange),
    onWatchlist: Boolean(themeHit || scannerHit),
    corroborated: Boolean(corroborating),
  };
}

export type CycleOutcome = {
  feedKey: string;
  fetched: number;
  fresh: number;
  inserted: number;
  revised: number;
  duplicates: number;
  skippedOld: number;
  error?: string;
  items: PreparedItem[];
};

function cursorFor(feed: NewsFeed, now: Date, lookbackMs = MAX_LOOKBACK_MS): Date {
  const floor = new Date(now.getTime() - lookbackMs);
  if (!feed.lastItemAt) return floor;
  return feed.lastItemAt > floor ? feed.lastItemAt : floor;
}

/**
 * Whether a source revises items in place.
 *
 * The halt feed does: resumption times are empty on first publication and get
 * filled minutes or hours later, and it keeps re-listing halts for days. So its
 * items must bypass the cursor — an old halt can gain new information today —
 * and be compared against what we stored rather than assumed new.
 */
function revisesItems(feed: NewsFeed): boolean {
  return feed.kind === NewsSourceKind.EXCHANGE_HALT;
}

/**
 * Fields a revision may change. Everything else is written once.
 *
 * `score` is included deliberately. Without it a stored row keeps whatever it
 * scored when first seen, forever — so a halt that later gains corroboration
 * never rises, and any change to the scoring rules leaves old rows stale. It
 * also means a re-poll repairs rows written before a rule existed.
 *
 * Note this only reaches feeds that revise (halts). Filings and wires are
 * skipped by the cursor once stored: within the last hour `rescoreRecent`
 * covers them, and beyond that a rules change still needs a one-off pass over
 * the table — `prisma/rescore-news.ts`, see the roadmap's M6 notes.
 */
function hasRevision(
  existing: NewsItem,
  incoming: RawItem,
  score: number
): boolean {
  return (
    existing.headline !== incoming.headline ||
    existing.catalyst !== (incoming.catalyst ?? existing.catalyst) ||
    (existing.haltReason ?? null) !== (incoming.haltReason ?? null) ||
    existing.score !== score
  );
}

function parseAlsoSeenOn(value: string | null): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Decide what would happen to each fetched item, writing nothing.
 *
 * Split out from the write so `scripts/news-poll-once.ts` can show a real
 * cycle's decisions against the real database and still touch nothing — which
 * is the whole point of M1.
 */
export async function prepareCycle(
  feed: NewsFeed,
  raw: RawItem[],
  now = new Date(),
  lookbackMs = MAX_LOOKBACK_MS,
  adapter?: NewsAdapter
): Promise<{ prepared: PreparedItem[]; skippedOld: number }> {
  const cursor = cursorFor(feed, now, lookbackMs);
  const allowStale = revisesItems(feed);

  const candidates = allowStale ? raw : raw.filter((item) => item.publishedAt > cursor);
  const skippedOld = raw.length - candidates.length;

  const prepared: PreparedItem[] = [];
  // Wires republish within a single cycle too, so track the keys seen in this
  // batch alongside the ones already in the database.
  const seenThisBatch = new Set<string>();

  for (const item of candidates) {
    // Expensive per-item work happens HERE, on survivors only — never on the
    // whole fetched window.
    await adapter?.enrich?.(item);

    // A source with an authoritative id supplies its own key; only wire prose
    // falls back to the headline hash.
    const dedupeKey = item.dedupeKey ?? dedupeKeyFor(item.headline);

    const existing = await prisma.newsItem.findUnique({
      where: {
        feedKey_externalId: { feedKey: item.feedKey, externalId: item.externalId },
      },
    });

    // Scored before the disposition branch so a revision re-scores too: a halt
    // that gains corroboration is worth more than it was on first sight.
    const { score, reasons } = scoreItem(await buildScoreContext(feed, item));
    const scored = { ...item, dedupeKey, score, scoreReasons: reasons };

    if (existing) {
      prepared.push({
        ...scored,
        disposition:
          allowStale && hasRevision(existing, item, score)
            ? 'revise'
            : 'same-source-repeat',
      });
      continue;
    }

    if (seenThisBatch.has(dedupeKey)) {
      prepared.push({ ...scored, disposition: 'duplicate' });
      continue;
    }

    // Cross-source: the same release arriving from a second feed inside the
    // window is not a new event, it is the same one with another byline.
    const twin = await prisma.newsItem.findFirst({
      where: {
        dedupeKey,
        publishedAt: {
          gte: new Date(item.publishedAt.getTime() - DEDUPE_WINDOW_MS),
          lte: new Date(item.publishedAt.getTime() + DEDUPE_WINDOW_MS),
        },
      },
      select: { id: true, feedKey: true },
    });

    if (twin) {
      prepared.push({ ...scored, disposition: 'duplicate', duplicateOf: twin.id });
      continue;
    }

    seenThisBatch.add(dedupeKey);
    prepared.push({ ...scored, disposition: 'insert' });
  }

  return { prepared, skippedOld };
}

/**
 * Called with every item that was newly stored or revised, so the socket layer
 * can push it to the `news` room. Injected rather than imported so this module
 * never depends on socket.io.
 */
export type NewsBroadcast = (items: NewsFeedItem[]) => void;

/** Write a prepared batch. One transaction per cycle, not one per item. */
async function persistCycle(
  prepared: PreparedItem[]
): Promise<{ inserted: number; revised: number; touchedIds: string[] }> {
  let inserted = 0;
  let revised = 0;
  // Ids of everything a viewer should see appear or change.
  const touchedIds: string[] = [];

  await prisma.$transaction(async (tx) => {
    for (const item of prepared) {
      if (item.disposition === 'insert') {
        const created = await tx.newsItem.create({
          data: {
            feedKey: item.feedKey,
            externalId: item.externalId,
            dedupeKey: item.dedupeKey,
            headline: item.headline,
            summary: item.summary ?? null,
            url: item.url,
            publishedAt: item.publishedAt,
            catalyst: item.catalyst ?? undefined,
            score: item.score,
            formType: item.formType ?? null,
            haltReason: item.haltReason ?? null,
            raw: item.raw ? JSON.stringify(item.raw) : null,
            tickers: item.tickers?.length
              ? { create: item.tickers.map((ticker) => ({ ticker })) }
              : undefined,
          },
        });
        inserted++;
        touchedIds.push(created.id);
        continue;
      }

      if (item.disposition === 'revise') {
        const updated = await tx.newsItem.update({
          where: {
            feedKey_externalId: { feedKey: item.feedKey, externalId: item.externalId },
          },
          data: {
            headline: item.headline,
            catalyst: item.catalyst ?? undefined,
            score: item.score,
            haltReason: item.haltReason ?? null,
            raw: item.raw ? JSON.stringify(item.raw) : null,
          },
        });
        revised++;
        touchedIds.push(updated.id);
        continue;
      }

      if (item.disposition === 'duplicate' && item.duplicateOf) {
        // First-seen keeps the row; the later arrival only records that this
        // feed carried the story too.
        const twin = await tx.newsItem.findUnique({
          where: { id: item.duplicateOf },
          select: { alsoSeenOn: true },
        });
        const seen = parseAlsoSeenOn(twin?.alsoSeenOn ?? null);
        if (!seen.includes(item.feedKey)) {
          await tx.newsItem.update({
            where: { id: item.duplicateOf },
            data: { alsoSeenOn: JSON.stringify([...seen, item.feedKey]) },
          });
        }
      }
    }
  });

  return { inserted, revised, touchedIds };
}

/**
 * Run one feed's full cycle. Never throws — a failure comes back on the outcome
 * and is recorded on the feed row for the M6 source-health view.
 */
/**
 * `lookbackMs` widens the cold-start window. Only the dry-run script passes it:
 * on a quiet pre-market every filing is older than the 2h clamp, so without a
 * way to widen it there is nothing to read and no way to tell a working parser
 * from a broken one.
 */
export async function runFeedCycle(
  feed: NewsFeed,
  options: { dryRun?: boolean; lookbackMs?: number; broadcast?: NewsBroadcast } = {}
): Promise<CycleOutcome> {
  const now = new Date();
  const adapter = ADAPTERS[feed.kind];

  const base: CycleOutcome = {
    feedKey: feed.key,
    fetched: 0,
    fresh: 0,
    inserted: 0,
    revised: 0,
    duplicates: 0,
    skippedOld: 0,
    items: [],
  };

  if (!adapter) return { ...base, error: `no adapter for kind ${feed.kind}` };

  try {
    const raw = await adapter.fetch(feed);
    const { prepared, skippedOld } = await prepareCycle(
      feed,
      raw,
      now,
      options.lookbackMs,
      adapter
    );

    const inserts = prepared.filter((item) => item.disposition === 'insert');
    const revisions = prepared.filter((item) => item.disposition === 'revise');
    const duplicates = prepared.filter((item) => item.disposition === 'duplicate');

    const outcome: CycleOutcome = {
      ...base,
      fetched: raw.length,
      fresh: inserts.length,
      duplicates: duplicates.length,
      skippedOld,
      items: prepared,
    };

    if (options.dryRun) return outcome;

    const { touchedIds, ...written } = await persistCycle(prepared);

    // Fan out AFTER the transaction commits, so a viewer can never receive an
    // item that a rollback then erases. Failure here must not fail the cycle —
    // the rows are already durable and the next page load will show them.
    if (options.broadcast && touchedIds.length) {
      try {
        const rows = await prisma.newsItem.findMany({
          where: { id: { in: touchedIds } },
          include: {
            feed: { select: { name: true, tier: true } },
            tickers: { select: { ticker: true } },
          },
        });
        options.broadcast(rows.map(toFeedItem));
      } catch (error) {
        console.warn('[news] fan-out failed (rows are stored):', error);
      }
    }

    // Advance the cursor only over what we actually accepted, so one item with
    // a skewed clock cannot skip the ones behind it.
    const newest = [...inserts, ...revisions].reduce<Date | null>(
      (latest, item) => (!latest || item.publishedAt > latest ? item.publishedAt : latest),
      null
    );

    await prisma.newsFeed.update({
      where: { key: feed.key },
      data: {
        lastPolledAt: now,
        lastItemAt:
          newest && (!feed.lastItemAt || newest > feed.lastItemAt) ? newest : feed.lastItemAt,
        lastError: null,
        consecutiveFailures: 0,
      },
    });

    return { ...outcome, ...written };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!options.dryRun) {
      await prisma.newsFeed
        .update({
          where: { key: feed.key },
          data: {
            lastPolledAt: now,
            lastError: message.slice(0, 500),
            consecutiveFailures: { increment: 1 },
          },
        })
        // Even the health write must not throw into the timer.
        .catch(() => {});
    }
    return { ...base, error: message };
  }
}

/**
 * How far back the rolling re-score reaches.
 *
 * One hour, because `CORROBORATION_MS` is thirty minutes in each direction: an
 * item older than that can gain no new corroborating row, only a rules change,
 * and rules changes are what `prisma/rescore-news.ts` is for.
 */
const RESCORE_WINDOW_MS = 60 * 60_000;

/** Floor between sweeps, so a busy open cannot sweep once per cycle. */
const RESCORE_MIN_GAP_MS = 60_000;

/**
 * Kinds whose arrival can move ANOTHER row's score.
 *
 * Corroboration only ever looks at halts and filings, so only their inserts can
 * change what a stored wire is worth. Wires insert constantly and corroborate
 * nothing, so sweeping after a wire cycle would be pure cost.
 */
const CORROBORATING_KINDS: NewsSourceKind[] = [
  NewsSourceKind.EXCHANGE_HALT,
  NewsSourceKind.SEC_EDGAR,
];

/**
 * Re-score everything published in the recent window against the table as it
 * stands now.
 *
 * Scoring is order-dependent and feeds poll on independent timers, so an item is
 * scored against whatever evidence happened to have landed first. Feeds are
 * started in the order they come back from the database, so in practice a wire
 * item is scored before the 8-K that vouches for it — the filing arrives seconds
 * later on EDGAR's own timer, and the wire keeps the uncorroborated score it was
 * born with.
 *
 * Until M4 that was a stale number in a list. Now watch rules fire on score, so
 * the wire alerts at a score it will not keep, or — worse, because it is silent
 * — fails to alert at the score it would have earned once its filing landed.
 *
 * Re-emitting the changed rows is what closes the second case: matching is
 * client-side, so a row only gets another chance to match a rule if the client
 * sees it again. The alert hook keys off item id, so a row that already pinged
 * does not ping twice, and the feed page replaces the row rather than adding it.
 */
export async function rescoreRecent(
  options: {
    now?: Date;
    windowMs?: number;
    broadcast?: NewsBroadcast;
    /**
     * Restrict the sweep to items carrying one of these tickers.
     *
     * The ingest path leaves this unset: a new filing can corroborate anything
     * in the window. A Scanner/Theme edit is the opposite — it changes exactly
     * one input, `onWatchlist`, and only for its own ticker, so sweeping the
     * whole hour would re-score hundreds of rows to move at most a handful.
     */
    tickers?: string[];
  } = {}
): Promise<{ scanned: number; changed: NewsFeedItem[] }> {
  const now = options.now ?? new Date();
  const since = new Date(now.getTime() - (options.windowMs ?? RESCORE_WINDOW_MS));

  const rows = await prisma.newsItem.findMany({
    where: {
      publishedAt: { gte: since },
      ...(options.tickers?.length
        ? { tickers: { some: { ticker: { in: options.tickers } } } }
        : {}),
    },
    include: { feed: true, tickers: { select: { ticker: true } } },
  });

  const changed: NewsFeedItem[] = [];

  for (const row of rows) {
    // Same reconstruction `prisma/rescore-news.ts` does: the scorer takes a
    // RawItem, and a stored row is one minus the fields scoring ignores.
    const { score } = scoreItem(
      await buildScoreContext(row.feed, {
        feedKey: row.feedKey,
        externalId: row.externalId,
        headline: row.headline,
        url: row.url,
        publishedAt: row.publishedAt,
        summary: row.summary ?? undefined,
        catalyst: row.catalyst,
        tickers: row.tickers.map((ticker) => ticker.ticker),
      })
    );
    if (score === row.score) continue;

    await prisma.newsItem.update({ where: { id: row.id }, data: { score } });
    changed.push(toFeedItem({ ...row, score }));
  }

  if (options.broadcast && changed.length) {
    // Written already, so a failed fan-out costs a late alert, not a lost row.
    try {
      options.broadcast(changed);
    } catch (error) {
      console.warn('[news] re-score fan-out failed (rows are stored):', error);
    }
  }

  return { scanned: rows.length, changed };
}

/** Exponential backoff on consecutive failures, capped so a feed recovers. */
function nextDelayMs(feed: NewsFeed, failures: number, now: Date): number {
  const adapter = ADAPTERS[feed.kind];
  const base = adapter
    ? adapter.pollIntervalMs(feed, now)
    : sessionAwareInterval(feed.pollIntervalSec, now);
  if (failures === 0) return base;
  return Math.min(base * 2 ** Math.min(failures, 6), MAX_BACKOFF_MS);
}

/**
 * Start the poller. Called from server/server.ts behind NEWS_INGEST_ENABLED,
 * which defaults off: local dev must not poll continuously, and only one
 * process may ever poll (two would double-write — safe, thanks to the unique
 * constraint, but wasteful).
 *
 * Self-scheduling timeouts rather than setInterval, so a slow cycle can never
 * overlap the next one.
 */
export function startNewsIngestion(broadcast?: NewsBroadcast): () => void {
  let stopped = false;
  const timers = new Set<NodeJS.Timeout>();

  // Sweep state, scoped to this run rather than the module, so a second
  // ingestion started in a test does not inherit the first one's throttle.
  let lastRescoreAt = 0;
  let rescoring = false;

  /**
   * Re-score the recent window after a cycle that could have changed it.
   *
   * Driven by inserts rather than by its own timer: a sweep with no new
   * evidence behind it can only find what the previous sweep already fixed.
   * The throttle bounds the other end — at the open, EDGAR inserts on nearly
   * every cycle, and re-scoring an hour of rows each time is real work.
   */
  async function maybeRescore(kind: NewsSourceKind, outcome: CycleOutcome) {
    if (stopped || rescoring) return;
    if (!outcome.inserted || !CORROBORATING_KINDS.includes(kind)) return;

    const at = Date.now();
    if (at - lastRescoreAt < RESCORE_MIN_GAP_MS) return;
    lastRescoreAt = at;
    rescoring = true;
    try {
      const { scanned, changed } = await rescoreRecent({ broadcast });
      if (changed.length) {
        console.log(
          `[news] re-scored ${changed.length} of ${scanned} recent item(s) ` +
            `after ${outcome.feedKey}`
        );
      }
    } catch (error) {
      // Like every other failure here: never throw into a timer.
      console.warn('[news] re-score sweep failed:', error);
    } finally {
      rescoring = false;
    }
  }

  async function scheduleFeed(key: string, failures: number) {
    if (stopped) return;

    // Re-read each cycle so the cursor is current and a feed disabled in the
    // database stops polling without a restart.
    const feed = await prisma.newsFeed.findUnique({ where: { key } });
    if (!feed || !feed.enabled) return;

    const outcome = await runFeedCycle(feed, { broadcast });
    const nextFailures = outcome.error ? failures + 1 : 0;

    if (outcome.error) {
      console.warn(`[news] ${key} failed (${nextFailures}x): ${outcome.error}`);
    } else if (outcome.inserted || outcome.revised) {
      console.log(
        `[news] ${key}: +${outcome.inserted} new, ${outcome.revised} revised, ` +
          `${outcome.duplicates} duplicate`
      );
    }

    // Not awaited: the sweep must not delay this feed's next poll. Its own
    // in-flight guard keeps two feeds finishing together from sweeping twice.
    void maybeRescore(feed.kind, outcome);

    if (stopped) return;
    const timer = setTimeout(() => {
      timers.delete(timer);
      void scheduleFeed(key, nextFailures);
    }, nextDelayMs(feed, nextFailures, new Date()));
    timers.add(timer);
  }

  void (async () => {
    const feeds = await prisma.newsFeed.findMany({
      where: { enabled: true },
      select: { key: true, kind: true },
    });
    const supported = feeds.filter((feed) => ADAPTERS[feed.kind]);
    console.log(
      `[news] ingestion started for ${supported.length} feed(s): ` +
        supported.map((feed) => feed.key).join(', ')
    );
    for (const feed of supported) void scheduleFeed(feed.key, 0);
  })();

  return () => {
    stopped = true;
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
  };
}
