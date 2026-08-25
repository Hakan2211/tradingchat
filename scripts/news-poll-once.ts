/**
 * Run ONE news poll cycle and print what it would store. Writes nothing.
 *
 * This is the point of M1. Before any UI exists, run this repeatedly across a
 * trading day and read the output: if the signal is bad — wrong tickers, junk
 * catalysts, a feed that returns the same 15 rows forever — everything
 * downstream is wasted effort. Fix the filter here, where it is cheap.
 *
 *   npx tsx scripts/news-poll-once.ts
 *   npx tsx scripts/news-poll-once.ts --feed=nasdaq-halts
 *   npx tsx scripts/news-poll-once.ts --all       # include disabled feeds
 *   npx tsx scripts/news-poll-once.ts --lookback=1440   # widen the 2h clamp
 *   npx tsx scripts/news-poll-once.ts --why       # show score breakdowns
 *   npx tsx scripts/news-poll-once.ts --json      # machine-readable
 *   npx tsx scripts/news-poll-once.ts --commit    # actually write (opt-in)
 *
 * DRY RUN BY DEFAULT, like prisma/purge-old-messages.ts. `--commit` is the only
 * way to touch the database.
 */
import 'dotenv/config';
import { prisma } from '../app/utils/db.server';
import { runFeedCycle, type CycleOutcome } from '../app/utils/news/ingest.server';
import { isActiveSession } from '../app/utils/news/schedule';
import { DEFAULT_ALERT_THRESHOLD } from '../app/utils/news/constants';
import { TRADING_TIME_ZONE } from '../app/utils/trading-time';

const args = process.argv.slice(2);
const commit = args.includes('--commit');
const asJson = args.includes('--json');
const includeDisabled = args.includes('--all');
// Show the score breakdown per item — how you tune the filter.
const verbose = args.includes('--why');
const only = args.find((arg) => arg.startsWith('--feed='))?.split('=')[1];
// Widen the 2h cold-start clamp. Essential outside market hours: everything
// filed yesterday is older than the clamp, so a plain run shows nothing and a
// broken parser looks exactly like a quiet market.
const lookbackMinutes = Number(
  args.find((arg) => arg.startsWith('--lookback='))?.split('=')[1] ?? NaN
);
const lookbackMs = Number.isFinite(lookbackMinutes)
  ? lookbackMinutes * 60_000
  : undefined;

const etTime = new Intl.DateTimeFormat('en-US', {
  timeZone: TRADING_TIME_ZONE,
  hour12: false,
  year: '2-digit',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** `--json` must emit ONLY JSON, or piping it into jq breaks on the banner. */
const note = (...parts: unknown[]) => {
  if (!asJson) console.log(...parts);
};

const DISPOSITION_MARK = {
  insert: '+',
  revise: '~',
  duplicate: 'd',
  'same-source-repeat': '.',
} as const;

function printOutcome(outcome: CycleOutcome) {
  console.log(`\n── ${outcome.feedKey} ${'─'.repeat(Math.max(0, 60 - outcome.feedKey.length))}`);

  if (outcome.error) {
    console.log(`   ERROR: ${outcome.error}`);
    return;
  }

  console.log(
    `   fetched ${outcome.fetched} · new ${outcome.fresh} · duplicate ` +
      `${outcome.duplicates} · before cursor ${outcome.skippedOld}` +
      (commit ? ` · WROTE ${outcome.inserted} + revised ${outcome.revised}` : '')
  );

  // Only the interesting dispositions. A halt feed re-listing the same 15 rows
  // every cycle is normal and would drown everything else.
  const notable = outcome.items.filter(
    (item) => item.disposition === 'insert' || item.disposition === 'revise'
  );

  if (notable.length === 0) {
    console.log('   (nothing new this cycle)');
    return;
  }

  // Highest score first: the whole point is that the top of this list should
  // be worth trading and the bottom should be ignorable. Reading it in
  // published order hides whether the filter actually works.
  const ranked = [...notable].sort((a, b) => b.score - a.score);

  for (const item of ranked) {
    const mark = DISPOSITION_MARK[item.disposition];
    const when = etTime.format(item.publishedAt);
    const tickers = item.tickers?.length ? `[${item.tickers.join(' ')}]` : '[—]';
    const catalyst = (item.catalyst ?? 'OTHER').padEnd(13);
    const alerts = item.score >= DEFAULT_ALERT_THRESHOLD ? '!' : ' ';
    const score = String(item.score).padStart(3);
    console.log(
      `   ${mark}${alerts}${score}  ${when} ET  ${catalyst} ${tickers.padEnd(14)} ${item.headline.slice(0, 90)}`
    );
    if (verbose) console.log(`          ${item.scoreReasons.join(' · ')}`);
    else if (item.haltReason) console.log(`          reason ${item.haltReason}`);
  }
}

async function main() {
  const feeds = await prisma.newsFeed.findMany({
    where: {
      ...(includeDisabled ? {} : { enabled: true }),
      ...(only ? { key: only } : {}),
    },
    orderBy: { key: 'asc' },
  });

  if (feeds.length === 0) {
    console.log(
      only
        ? `No feed with key "${only}". Seed first: npx tsx prisma/seed-news-feeds.ts`
        : 'No enabled feeds. Seed first: npx tsx prisma/seed-news-feeds.ts'
    );
    return;
  }

  const universeSize = await prisma.symbolUniverse.count();
  if (universeSize === 0) {
    // Not fatal — EDGAR items would just come back ticker-less, which looks
    // like a parser bug rather than a missing seed. Say so plainly.
    console.warn(
      '\n⚠  SymbolUniverse is empty, so no CIK will resolve to a ticker.\n' +
        '   Run: npx tsx prisma/seed-symbol-universe.ts\n'
    );
  }

  const now = new Date();
  note(
    `\nnews-poll-once · ${etTime.format(now)} ET · ` +
      `${isActiveSession(now) ? 'ACTIVE session' : 'outside session (idle cadence)'}`
  );
  note(
    `universe: ${universeSize} symbols · mode: ${commit ? 'COMMIT' : 'DRY RUN'}` +
      (lookbackMs ? ` · lookback ${lookbackMinutes}min` : '')
  );

  const outcomes: CycleOutcome[] = [];
  for (const feed of feeds) {
    outcomes.push(await runFeedCycle(feed, { dryRun: !commit, lookbackMs }));
  }

  if (asJson) {
    console.log(JSON.stringify(outcomes, null, 2));
  } else {
    for (const outcome of outcomes) printOutcome(outcome);
  }

  const totalNew = outcomes.reduce((sum, outcome) => sum + outcome.fresh, 0);
  const wouldAlert = outcomes
    .flatMap((outcome) => outcome.items)
    .filter(
      (item) => item.disposition === 'insert' && item.score >= DEFAULT_ALERT_THRESHOLD
    ).length;
  const failed = outcomes.filter((outcome) => outcome.error);
  note(
    `\n${totalNew} new item(s) across ${feeds.length} feed(s), ` +
      `${wouldAlert} would clear the alert threshold (>=${DEFAULT_ALERT_THRESHOLD})` +
      (failed.length ? `, ${failed.length} feed(s) failed` : '') +
      (commit ? '.' : ' — DRY RUN, nothing written.\n')
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
