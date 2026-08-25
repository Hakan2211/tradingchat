/**
 * Recompute `NewsItem.score` for rows already in the table.
 *
 * Scores are stored, not computed on read, so the feed can sort and filter on
 * them in SQL. The cost of that is staleness: only halts are re-examined by the
 * poller (filings and wires are skipped by the cursor once stored), so any
 * change to the rules in score.ts leaves every existing row frozen at whatever
 * it scored the day it arrived.
 *
 * Run this after ANY scoring change. It is the counterpart to the rules living
 * in a pure function — the rules can change freely, this makes the table agree.
 *
 *   npx tsx prisma/rescore-news.ts                 # dry run, shows the diff
 *   npx tsx prisma/rescore-news.ts --confirm
 *   npx tsx prisma/rescore-news.ts --confirm --since=2026-08-01
 *
 * DRY RUN BY DEFAULT, like the purge scripts.
 */
import { PrismaClient } from '@prisma/client';
import { scoreItem } from '../app/utils/news/score';
import { buildScoreContext } from '../app/utils/news/ingest.server';

const prisma = new PrismaClient();

const BATCH = 250;

async function main() {
  const confirm = process.argv.includes('--confirm');
  const sinceArg = process.argv.find((a) => a.startsWith('--since='))?.split('=')[1];
  const since = sinceArg ? new Date(`${sinceArg}T00:00:00.000Z`) : undefined;
  if (sinceArg && Number.isNaN(since!.getTime())) {
    throw new Error(`Invalid --since date: "${sinceArg}". Use YYYY-MM-DD.`);
  }

  const where = since ? { publishedAt: { gte: since } } : {};
  const total = await prisma.newsItem.count({ where });

  console.log(`\nDatabase: ${process.env.DATABASE_URL ?? '(DATABASE_URL not set!)'}`);
  console.log(`Re-scoring ${total} item(s)${since ? ` published since ${sinceArg}` : ''}`);
  console.log(`Mode: ${confirm ? 'COMMIT' : 'DRY RUN'}\n`);

  let processed = 0;
  let changed = 0;
  const examples: string[] = [];
  let cursor: string | undefined;

  for (;;) {
    const rows = await prisma.newsItem.findMany({
      where,
      orderBy: { id: 'asc' },
      take: BATCH,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        feed: true,
        tickers: { select: { ticker: true } },
      },
    });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1].id;

    for (const row of rows) {
      processed++;
      const context = await buildScoreContext(row.feed, {
        feedKey: row.feedKey,
        externalId: row.externalId,
        headline: row.headline,
        url: row.url,
        publishedAt: row.publishedAt,
        summary: row.summary ?? undefined,
        catalyst: row.catalyst,
        tickers: row.tickers.map((t) => t.ticker),
      });
      const { score } = scoreItem(context);
      if (score === row.score) continue;

      changed++;
      if (examples.length < 10) {
        examples.push(
          `  ${String(row.score).padStart(3)} -> ${String(score).padStart(3)}  ` +
            `${row.catalyst.padEnd(9)} ${row.headline.slice(0, 62)}`
        );
      }
      if (confirm) {
        await prisma.newsItem.update({ where: { id: row.id }, data: { score } });
      }
    }
    console.log(`  ${processed}/${total} scanned, ${changed} changed...`);
  }

  if (examples.length) {
    console.log(`\nSample changes:`);
    for (const line of examples) console.log(line);
  }

  console.log(
    `\n${changed} of ${processed} item(s) ${confirm ? 'updated' : 'would change'}.` +
      (confirm ? '\n' : ' Re-run with --confirm to write.\n')
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
