/**
 * Retention purge for the news feed. Keeps the last 90 days, deletes the rest.
 *
 * News is by far the highest-volume table in this app — a single cold-start
 * cycle across nine feeds writes ~400 rows, and most of it is wire noise that
 * nobody will ever scroll back to. Without this the table grows without bound
 * and the SQLite file with it.
 *
 * Modelled on prisma/purge-old-messages.ts, including its posture:
 *   - DRY RUN BY DEFAULT. `--confirm` is the only thing that deletes.
 *   - VACUUM at the end, because SQLite does not shrink the file on DELETE.
 *
 * Simpler than the message purge in two ways: NewsTicker cascades on delete,
 * and there are no R2 image files or self-referencing reply chains to sever.
 *
 *   npx tsx prisma/purge-old-news.ts                  # dry run
 *   npx tsx prisma/purge-old-news.ts --confirm
 *   npx tsx prisma/purge-old-news.ts --days=30 --confirm
 *   npx tsx prisma/purge-old-news.ts --confirm --no-vacuum
 *
 * Intended to run nightly. Safe to run while the poller is going — WAL plus
 * busy_timeout (see app/utils/db.server.ts) means a delete batch and a poll
 * cycle no longer lock each other out, though VACUUM still needs an exclusive
 * lock and is best left to a quiet hour.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_RETENTION_DAYS = 90;

function retentionDays(): number {
  const arg = process.argv.find((a) => a.startsWith('--days='));
  if (!arg) return DEFAULT_RETENTION_DAYS;
  const days = Number(arg.split('=')[1]);
  if (!Number.isFinite(days) || days < 1) {
    throw new Error(`Invalid --days: "${arg.split('=')[1]}". Use a positive number.`);
  }
  return days;
}

const fmt = (d: Date | null | undefined) =>
  d ? d.toISOString().replace('.000Z', 'Z') : '—';

async function main() {
  const confirm = process.argv.includes('--confirm');
  const skipVacuum = process.argv.includes('--no-vacuum');
  const days = retentionDays();
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  console.log(`\nDatabase: ${process.env.DATABASE_URL ?? '(DATABASE_URL not set!)'}`);
  console.log(`Retention: ${days} days — delete items published BEFORE ${fmt(cutoff)}\n`);

  // Purge on publishedAt, not ingestedAt: a backfill that pulls in month-old
  // filings should still be subject to the same 90-day window, and an item's
  // age to a trader is when it broke, not when we happened to see it.
  const oldWhere = { publishedAt: { lt: cutoff } };

  const [total, toDelete, tickerRows, newestDeleted, oldestKept] = await Promise.all([
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

  console.log(`Total news items:      ${total}`);
  console.log(`  → will DELETE:       ${toDelete}`);
  console.log(`  → will KEEP:         ${total - toDelete}`);
  console.log(`Ticker rows cascading: ${tickerRows}`);
  console.log(`Boundary check:`);
  console.log(`  newest DELETED item: ${fmt(newestDeleted?.publishedAt)}`);
  console.log(`  oldest KEPT item:    ${fmt(oldestKept?.publishedAt)}\n`);

  if (toDelete === 0) {
    console.log('Nothing to delete. Done.\n');
    return;
  }

  if (!confirm) {
    console.log(
      `DRY RUN — nothing was deleted. Re-read the boundary check above, then ` +
        `re-run with --confirm to permanently delete ${toDelete} item(s) ` +
        `and ${tickerRows} cascaded ticker row(s).\n`
    );
    return;
  }

  // Chunked rather than one deleteMany: a single huge delete holds the write
  // lock long enough to stall the poller and the chat behind it.
  const CHUNK = 1000;
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
    console.log(`  deleted ${deleted}/${toDelete}...`);
    if (result.count === 0) break; // Defensive: never spin forever.
  }
  console.log(`Deleted ${deleted} news item(s) (+ cascaded ticker rows).`);

  if (skipVacuum) {
    console.log('VACUUM skipped (--no-vacuum). Disk space not reclaimed yet.\n');
    return;
  }

  // Non-fatal: VACUUM needs an exclusive lock and can lose to live traffic.
  // The rows are already gone either way.
  console.log('Running VACUUM to reclaim disk space...');
  try {
    await prisma.$executeRawUnsafe('VACUUM');
    console.log('VACUUM done.');
  } catch (error) {
    console.warn(
      'VACUUM skipped (database busy?). Rows ARE deleted; re-run during low ' +
        'traffic to reclaim disk:',
      error instanceof Error ? error.message : error
    );
  }

  console.log(`\n✅ Purge complete. Kept ${total - deleted} item(s).\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
