/**
 * Retention purge for the news feed, run by hand.
 *
 * The deleting itself lives in `app/utils/news/retention.server.ts`, which the
 * nightly in-process job also calls — see the note there on why. This file is
 * the operator's front end to it:
 *
 *   - DRY RUN BY DEFAULT. `--confirm` is the only thing that deletes.
 *   - Prints a boundary check (newest deleted vs oldest kept) to read first.
 *   - VACUUMs by default, because a hand-run purge is usually the big one.
 *     The nightly job decides for itself; see VACUUM_MIN_DELETED.
 *
 *   npx tsx prisma/purge-old-news.ts                  # dry run
 *   npx tsx prisma/purge-old-news.ts --confirm
 *   npx tsx prisma/purge-old-news.ts --days=30 --confirm
 *   npx tsx prisma/purge-old-news.ts --confirm --no-vacuum
 *
 * Safe to run while the poller is going — WAL plus busy_timeout (see
 * `app/utils/db.server.ts`) means a delete batch and a poll cycle no longer
 * lock each other out, though VACUUM still needs an exclusive lock and is best
 * left to a quiet hour.
 */
import 'dotenv/config';
import { prisma } from '../app/utils/db.server';
import {
  DEFAULT_RETENTION_DAYS,
  planPurge,
  purgeOldNews,
} from '../app/utils/news/retention.server';

function retentionDays(): number {
  const arg = process.argv.find((a) => a.startsWith('--days='));
  if (!arg) return DEFAULT_RETENTION_DAYS;
  const days = Number(arg.split('=')[1]);
  if (!Number.isFinite(days) || days < 1) {
    throw new Error(
      `Invalid --days: "${arg.split('=')[1]}". Use a positive number.`
    );
  }
  return days;
}

const fmt = (d: Date | null | undefined) =>
  d ? d.toISOString().replace('.000Z', 'Z') : '—';

async function main() {
  const confirm = process.argv.includes('--confirm');
  const skipVacuum = process.argv.includes('--no-vacuum');
  const days = retentionDays();

  console.log(
    `\nDatabase: ${process.env.DATABASE_URL ?? '(DATABASE_URL not set!)'}`
  );

  const plan = await planPurge(days);
  console.log(
    `Retention: ${days} days — delete items published BEFORE ${fmt(plan.cutoff)}\n`
  );
  console.log(`Total news items:      ${plan.total}`);
  console.log(`  → will DELETE:       ${plan.toDelete}`);
  console.log(`  → will KEEP:         ${plan.total - plan.toDelete}`);
  console.log(`Ticker rows cascading: ${plan.tickerRows}`);
  console.log(`Boundary check:`);
  console.log(`  newest DELETED item: ${fmt(plan.newestDeleted)}`);
  console.log(`  oldest KEPT item:    ${fmt(plan.oldestKept)}\n`);

  if (plan.toDelete === 0) {
    console.log('Nothing to delete. Done.\n');
    return;
  }

  if (!confirm) {
    console.log(
      `DRY RUN — nothing was deleted. Re-read the boundary check above, then ` +
        `re-run with --confirm to permanently delete ${plan.toDelete} item(s) ` +
        `and ${plan.tickerRows} cascaded ticker row(s).\n`
    );
    return;
  }

  const result = await purgeOldNews({
    days,
    // A hand-run purge is usually the big one, so reclaim the disk unless told
    // otherwise — the opposite default from the nightly job on purpose.
    vacuum: skipVacuum ? false : true,
    onProgress: (deleted, toDelete) =>
      console.log(`  deleted ${deleted}/${toDelete}...`),
  });

  console.log(
    `Deleted ${result.deleted} news item(s) (+ cascaded ticker rows).`
  );

  if (skipVacuum) {
    console.log('VACUUM skipped (--no-vacuum). Disk space not reclaimed yet.\n');
  } else if (result.vacuumed) {
    console.log('VACUUM done.');
  } else if (result.vacuumError) {
    // Non-fatal: VACUUM needs an exclusive lock and can lose to live traffic.
    // The rows are already gone either way.
    console.warn(
      'VACUUM skipped (database busy?). Rows ARE deleted; re-run during low ' +
        `traffic to reclaim disk: ${result.vacuumError}`
    );
  }

  console.log(`\n✅ Purge complete. Kept ${result.total - result.deleted} item(s).\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
