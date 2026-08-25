import { prisma } from '../db.server';
import {
  fromTradingWallClock,
  shiftTradingDay,
  tradingDay,
} from '../trading-time';

/**
 * Retention for the news feed: keep the last N days, delete the rest.
 *
 * News is by far the highest-volume table in this app — a single cold-start
 * cycle across nine feeds writes ~400 rows, and most of it is wire noise that
 * nobody will ever scroll back to. Without this the table grows without bound
 * and the SQLite file with it.
 *
 * The logic lives here rather than in `prisma/purge-old-news.ts` because it now
 * has two callers: that CLI (one-off, dry-run by default, prints a boundary
 * check) and the nightly in-process job below. They must not drift — a purge
 * that deletes a different set depending on how it was invoked is exactly the
 * kind of bug you only find after the rows are gone.
 */

export const DEFAULT_RETENTION_DAYS = 90;

/**
 * 02:30 ET. The extended session this app polls runs 04:00-20:00 ET, so this is
 * the middle of the only genuinely quiet stretch — late enough that the
 * post-market wires have gone quiet, early enough to finish before the 04:00
 * pre-market ramp. It matters because VACUUM takes an exclusive lock.
 */
const PURGE_HOUR_ET = 2;
const PURGE_MINUTE_ET = 30;

/**
 * Chunk size for the delete loop. A single huge deleteMany holds the write lock
 * long enough to stall the poller and the chat behind it.
 */
const CHUNK = 1000;

/**
 * Only VACUUM when a purge actually freed a meaningful slice of the file.
 *
 * In steady state the nightly job deletes roughly one day of items and the next
 * day's inserts reuse those pages, so a nightly VACUUM rewrites the whole
 * database to reclaim nothing. The first run after enabling retention on a
 * backlog is the case that needs it, and this threshold catches exactly that.
 */
const VACUUM_MIN_DELETED = 5_000;

export type PurgePlan = {
  days: number;
  cutoff: Date;
  total: number;
  toDelete: number;
  /** NewsTicker rows that cascade. Counted for the dry run's benefit. */
  tickerRows: number;
  newestDeleted: Date | null;
  oldestKept: Date | null;
};

export type PurgeResult = PurgePlan & {
  deleted: number;
  vacuumed: boolean;
  /** Set when VACUUM was attempted and lost to a lock. Rows are still gone. */
  vacuumError?: string;
};

/**
 * Rows older than the cutoff.
 *
 * Purge on publishedAt, not ingestedAt: a backfill that pulls in month-old
 * filings should still be subject to the same window, and an item's age to a
 * trader is when it broke, not when we happened to see it.
 */
const olderThan = (cutoff: Date) => ({ publishedAt: { lt: cutoff } });

export function retentionCutoff(days: number, now = new Date()): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

/** What a purge would do. Reads only — this is what the CLI dry run prints. */
export async function planPurge(
  days = DEFAULT_RETENTION_DAYS,
  now = new Date()
): Promise<PurgePlan> {
  const cutoff = retentionCutoff(days, now);
  const oldWhere = olderThan(cutoff);

  const [total, toDelete, tickerRows, newestDeleted, oldestKept] =
    await Promise.all([
      prisma.newsItem.count(),
      prisma.newsItem.count({ where: oldWhere }),
      prisma.newsTicker.count({ where: { newsItem: oldWhere } }),
      prisma.newsItem.findFirst({
        where: oldWhere,
        orderBy: { publishedAt: 'desc' },
        select: { publishedAt: true },
      }),
      prisma.newsItem.findFirst({
        where: { publishedAt: { gte: cutoff } },
        orderBy: { publishedAt: 'asc' },
        select: { publishedAt: true },
      }),
    ]);

  return {
    days,
    cutoff,
    total,
    toDelete,
    tickerRows,
    newestDeleted: newestDeleted?.publishedAt ?? null,
    oldestKept: oldestKept?.publishedAt ?? null,
  };
}

/**
 * Delete everything published before the cutoff.
 *
 * Safe to run while the poller is going: WAL plus busy_timeout (see
 * `db.server.ts`) means a delete batch and a poll cycle no longer lock each
 * other out. VACUUM still needs an exclusive lock, which is why it is both
 * optional and non-fatal.
 */
export async function purgeOldNews(
  options: {
    days?: number;
    now?: Date;
    /** `'auto'` vacuums only past VACUUM_MIN_DELETED. Default `'auto'`. */
    vacuum?: boolean | 'auto';
    onProgress?: (deleted: number, toDelete: number) => void;
  } = {}
): Promise<PurgeResult> {
  const days = options.days ?? DEFAULT_RETENTION_DAYS;
  const plan = await planPurge(days, options.now ?? new Date());

  if (plan.toDelete === 0) {
    return { ...plan, deleted: 0, vacuumed: false };
  }

  const oldWhere = olderThan(plan.cutoff);
  let deleted = 0;
  for (;;) {
    const batch = await prisma.newsItem.findMany({
      where: oldWhere,
      select: { id: true },
      take: CHUNK,
    });
    if (batch.length === 0) break;
    const result = await prisma.newsItem.deleteMany({
      where: { id: { in: batch.map((row) => row.id) } },
    });
    deleted += result.count;
    options.onProgress?.(deleted, plan.toDelete);
    if (result.count === 0) break; // Defensive: never spin forever.
  }

  const wanted = options.vacuum ?? 'auto';
  const shouldVacuum =
    wanted === true || (wanted === 'auto' && deleted >= VACUUM_MIN_DELETED);
  if (!shouldVacuum) return { ...plan, deleted, vacuumed: false };

  try {
    // SQLite does not shrink the file on DELETE.
    await prisma.$executeRawUnsafe('VACUUM');
    return { ...plan, deleted, vacuumed: true };
  } catch (error) {
    return {
      ...plan,
      deleted,
      vacuumed: false,
      vacuumError: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Retention window from the environment.
 *
 * `NEWS_RETENTION_DAYS=0` (or `off`) disables the nightly job without disabling
 * ingestion — the escape hatch for "the feed is misbehaving, keep everything
 * until I have looked at it". A malformed value warns and falls back rather
 * than crashing the boot: a typo here must not take the app down.
 */
export function configuredRetentionDays(
  raw = process.env.NEWS_RETENTION_DAYS
): number | null {
  if (raw === undefined || raw === '') return DEFAULT_RETENTION_DAYS;
  if (raw.trim().toLowerCase() === 'off') return null;

  const days = Number(raw);
  if (!Number.isFinite(days) || days < 0) {
    console.warn(
      `[news] ignoring invalid NEWS_RETENTION_DAYS="${raw}"; ` +
        `using ${DEFAULT_RETENTION_DAYS} days.`
    );
    return DEFAULT_RETENTION_DAYS;
  }
  return days === 0 ? null : days;
}

/**
 * The next 02:30 ET after `now`. DST-correct via `fromTradingWallClock`.
 *
 * On the spring-forward night 02:30 ET does not exist, and resolving it lands
 * at 01:30 ET — so that one run happens an hour early. Left as is: it is still
 * hours short of the 04:00 pre-market ramp, and the `>` comparison below means
 * the re-schedule after it picks the NEXT day rather than firing twice.
 */
export function nextPurgeAt(now: Date): Date {
  const at = (day: string) => {
    const [year, month, dayOfMonth] = day.split('-').map(Number);
    return fromTradingWallClock({
      year,
      month,
      day: dayOfMonth,
      hour: PURGE_HOUR_ET,
      minute: PURGE_MINUTE_ET,
    });
  };

  const today = tradingDay(now);
  const todaysRun = at(today);
  return todaysRun.getTime() > now.getTime()
    ? todaysRun
    : at(shiftTradingDay(today, 1));
}

/**
 * Start the nightly purge. Called from `server/server.ts` behind the same
 * `NEWS_INGEST_ENABLED` flag as the poller — a process that is not ingesting is
 * not accumulating, and that flag is also what guarantees a single instance.
 *
 * Self-scheduling timeout rather than setInterval, matching the poller: it
 * re-derives the next 02:30 ET each night, so it neither drifts nor doubles up
 * across a DST change.
 */
export function startNewsRetention(): () => void {
  const configured = configuredRetentionDays();
  if (configured === null) {
    console.log('[news] retention disabled (NEWS_RETENTION_DAYS).');
    return () => {};
  }
  // Re-bound as a plain number: the narrowing above does not follow the const
  // into the closures below on this TypeScript version.
  const days: number = configured;

  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  function scheduleNext() {
    if (stopped) return;
    const now = new Date();
    const at = nextPurgeAt(now);
    const delay = at.getTime() - now.getTime();
    console.log(
      `[news] retention: ${days}-day window, next purge ${at.toISOString()} ` +
        `(in ${Math.round(delay / 60_000)} min).`
    );
    timer = setTimeout(run, delay);
  }

  async function run() {
    if (stopped) return;
    try {
      const result = await purgeOldNews({ days });
      if (result.deleted === 0) {
        console.log(`[news] retention: nothing older than ${days} days.`);
      } else {
        console.log(
          `[news] retention: deleted ${result.deleted} item(s) published before ` +
            `${result.cutoff.toISOString()}; kept ${result.total - result.deleted}` +
            (result.vacuumed ? '; VACUUM done.' : '.')
        );
        if (result.vacuumError) {
          console.warn(
            `[news] retention: VACUUM skipped — ${result.vacuumError}`
          );
        }
      }
    } catch (error) {
      // Like every other background failure here: never throw into a timer.
      console.warn('[news] retention purge failed:', error);
    } finally {
      scheduleNext();
    }
  }

  scheduleNext();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
