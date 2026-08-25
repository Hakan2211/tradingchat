/**
 * Sample every enabled feed repeatedly across a wall-clock ET window and report
 * what actually arrived. WRITES NOTHING.
 *
 * Built for the question the roadmap left open in section 7c: the
 * promotional-wire premise. Section 3c justified ingesting cheap wires on the
 * grounds that "a $50 paid-placement release on a 3M-float ticker at 07:15 ET
 * is precisely the setup this app's users trade" — but the only sample taken so
 * far was at 05:15 ET, an hour before promotional stock releases are supposed
 * to cluster, and it found ABNewswire carrying local-business SEO spam at 0%
 * ticker density. Section 7c deliberately left those feeds enabled and asked
 * for a real pre-market re-measure before disabling anything.
 *
 *   npx tsx scripts/news-measure-window.ts --from=07:00 --to=09:00
 *   npx tsx scripts/news-measure-window.ts --minutes=20 --interval=120
 *   npx tsx scripts/news-measure-window.ts --from=07:00 --to=09:00 --out=sample.json
 *
 * Why not news-poll-once.ts: its "new" count is measured against the feed
 * cursor, which a dry run never advances, so running it every few minutes
 * across a window counts the same items over and over. This keeps its own
 * identity set instead, so an item is counted once no matter how many sweeps
 * see it — the only way to total a two-hour window honestly.
 */
import 'dotenv/config';
import { NewsSourceKind, WireTier, type NewsFeed } from '@prisma/client';
import { prisma } from '../app/utils/db.server';
import { buildScoreContext } from '../app/utils/news/ingest.server';
import { scoreItem } from '../app/utils/news/score';
import { nasdaqHaltsAdapter } from '../app/utils/news/adapters/nasdaq-halts';
import { secEdgarAdapter } from '../app/utils/news/adapters/sec-edgar';
import { wireAdapter } from '../app/utils/news/adapters/wires';
import type { NewsAdapter, RawItem } from '../app/utils/news/types';
import { DEFAULT_ALERT_THRESHOLD } from '../app/utils/news/constants';
import { TRADING_TIME_ZONE, fromTradingWallClock } from '../app/utils/trading-time';

const ADAPTERS: Partial<Record<NewsSourceKind, NewsAdapter>> = {
  [NewsSourceKind.SEC_EDGAR]: secEdgarAdapter,
  [NewsSourceKind.EXCHANGE_HALT]: nasdaqHaltsAdapter,
  [NewsSourceKind.WIRE]: wireAdapter,
};

/** Same window the scorer uses, so in-window corroboration is measured alike. */
const CORROBORATION_MS = 30 * 60_000;

const args = process.argv.slice(2);
const arg = (name: string) =>
  args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

const outPath = arg('out');
const intervalMs = Number(arg('interval') ?? 180) * 1000;
const feedFilter = arg('feeds')?.split(',').filter(Boolean);

const et = new Intl.DateTimeFormat('en-US', {
  timeZone: TRADING_TIME_ZONE,
  hour12: false,
  hour: '2-digit',
  minute: '2-digit',
});
const etFull = new Intl.DateTimeFormat('en-US', {
  timeZone: TRADING_TIME_ZONE,
  hour12: false,
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

/** "07:00" on today's ET date, as the real instant it names. */
function etToday(hhmm: string): Date {
  const [hour, minute] = hhmm.split(':').map(Number);
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: TRADING_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const [year, month, day] = today.split('-').map(Number);
  return fromTradingWallClock({ year, month, day, hour, minute });
}

type Seen = {
  feedKey: string;
  kind: NewsSourceKind;
  tier: WireTier | null;
  externalId: string;
  headline: string;
  publishedAt: Date;
  tickers: string[];
  catalyst: string;
  score: number;
  reasons: string[];
  /** Score with the wire tier ignored — what the -25 and the cap cost it. */
  scoreUntiered: number;
  /** Corroborated by a halt/filing seen in THIS run, not just in the table. */
  corroboratedInWindow: boolean;
  firstSeenAt: Date;
};

async function main() {
  const from = arg('from') ? etToday(arg('from')!) : new Date();
  const minutes = Number(arg('minutes') ?? NaN);
  const to = arg('to')
    ? etToday(arg('to')!)
    : new Date(from.getTime() + (Number.isFinite(minutes) ? minutes : 120) * 60_000);

  const feeds = (
    await prisma.newsFeed.findMany({ where: { enabled: true }, orderBy: { key: 'asc' } })
  ).filter((feed) => !feedFilter || feedFilter.includes(feed.key));

  console.log(
    `\nnews-measure-window · ${et.format(from)}-${et.format(to)} ET · ` +
      `${feeds.length} feed(s) · sweep every ${intervalMs / 1000}s · READ-ONLY`
  );

  // Wait for the window to open, so the run can be launched ahead of it.
  const wait = from.getTime() - Date.now();
  if (wait > 0) {
    console.log(`  waiting ${Math.round(wait / 60_000)}min for the window to open...`);
    await new Promise((resolve) => setTimeout(resolve, wait));
  }

  const seen = new Map<string, Seen>();
  /** Ticker -> publish instants of every halt/filing seen, for corroboration. */
  const evidence = new Map<string, number[]>();
  const errors = new Map<string, number>();
  /** Identities already rejected for being outside the window. */
  const rejected = new Set<string>();
  let sweeps = 0;

  while (Date.now() < to.getTime()) {
    sweeps++;
    const sweptAt = new Date();
    let fresh = 0;

    for (const feed of feeds) {
      const adapter = ADAPTERS[feed.kind];
      if (!adapter) continue;

      let raw: RawItem[];
      try {
        raw = await adapter.fetch(feed);
      } catch {
        errors.set(feed.key, (errors.get(feed.key) ?? 0) + 1);
        continue;
      }

      for (const item of raw) {
        const key = `${item.feedKey}::${item.externalId}`;
        if (seen.has(key) || rejected.has(key)) continue;

        // Only items PUBLISHED inside the window count. WebWire republishes its
        // whole 369-item history on every poll; counting that as arrival volume
        // would make it look a hundred times busier than it is.
        if (item.publishedAt < from || item.publishedAt > to) {
          rejected.add(key);
          continue;
        }

        // Enrichment is the expensive part (ticker extraction, classification),
        // so it runs on survivors only — same discipline as the real loop.
        await adapter.enrich?.(item);
        const tickers = item.tickers ?? [];

        const context = await buildScoreContext(feed, item);
        const { score, reasons } = scoreItem(context);
        // What this item would score if it were not on a tiered wire. The
        // difference IS the cost of the tier rule, which is the thing under test.
        const { score: scoreUntiered } = scoreItem({ ...context, tier: null });

        const at = item.publishedAt.getTime();
        const corroboratedInWindow = tickers.some((ticker) =>
          (evidence.get(ticker) ?? []).some(
            (when) => Math.abs(when - at) <= CORROBORATION_MS
          )
        );

        // Halts and filings ARE the evidence, so only they populate the index.
        if (feed.kind !== NewsSourceKind.WIRE) {
          for (const ticker of tickers) {
            evidence.set(ticker, [...(evidence.get(ticker) ?? []), at]);
          }
        }

        seen.set(key, {
          feedKey: feed.key,
          kind: feed.kind,
          tier: feed.tier,
          externalId: item.externalId,
          headline: item.headline,
          publishedAt: item.publishedAt,
          tickers,
          catalyst: String(item.catalyst ?? 'OTHER'),
          score,
          reasons,
          scoreUntiered,
          corroboratedInWindow,
          firstSeenAt: sweptAt,
        });
        fresh++;
      }
    }

    console.log(
      `  ${et.format(sweptAt)} ET  sweep ${String(sweeps).padStart(2)} · ` +
        `+${fresh} in-window · ${seen.size} total` +
        (errors.size
          ? ` · errors: ${[...errors].map(([k, n]) => `${k}x${n}`).join(' ')}`
          : '')
    );

    const remaining = to.getTime() - Date.now();
    if (remaining <= 0) break;
    await new Promise((resolve) => setTimeout(resolve, Math.min(intervalMs, remaining)));
  }

  report([...seen.values()], feeds, sweeps, errors, from, to);

  if (outPath) {
    const { writeFileSync } = await import('node:fs');
    writeFileSync(outPath, JSON.stringify([...seen.values()], null, 2));
    console.log(`\nRaw sample written to ${outPath}`);
  }
}

function report(
  items: Seen[],
  feeds: NewsFeed[],
  sweeps: number,
  errors: Map<string, number>,
  from: Date,
  to: Date
) {
  console.log(
    `\n${'='.repeat(78)}\n` +
      `${items.length} item(s) published ${et.format(from)}-${et.format(to)} ET ` +
      `across ${sweeps} sweep(s)\n${'='.repeat(78)}\n`
  );

  console.log(
    `${'feed'.padEnd(16)} ${'tier'.padEnd(12)} ${'items'.padStart(6)} ` +
      `${'ticker'.padStart(7)} ${'density'.padStart(8)} ${'alerts'.padStart(7)} ` +
      `${'corrob'.padStart(7)}`
  );
  console.log('-'.repeat(78));

  for (const feed of feeds) {
    const rows = items.filter((item) => item.feedKey === feed.key);
    const withTicker = rows.filter((item) => item.tickers.length > 0);
    const alerting = rows.filter((item) => item.score >= DEFAULT_ALERT_THRESHOLD);
    const corroborated = rows.filter((item) => item.corroboratedInWindow);
    const density = rows.length
      ? `${Math.round((withTicker.length / rows.length) * 100)}%`
      : '—';
    console.log(
      `${feed.key.padEnd(16)} ${String(feed.tier ?? '—').padEnd(12)} ` +
        `${String(rows.length).padStart(6)} ${String(withTicker.length).padStart(7)} ` +
        `${density.padStart(8)} ${String(alerting.length).padStart(7)} ` +
        `${String(corroborated.length).padStart(7)}` +
        (errors.get(feed.key) ? `   ${errors.get(feed.key)} fetch error(s)` : '')
    );
  }

  // The premise under test, stated as a number: does a promotional wire ever
  // carry a ticker, and does the corroboration rule ever fire on one?
  const promo = items.filter((item) => item.tier === WireTier.PROMOTIONAL);
  const promoTickered = promo.filter((item) => item.tickers.length > 0);
  console.log(
    `\nPROMOTIONAL wires: ${promo.length} item(s), ${promoTickered.length} with a ` +
      `ticker, ${promo.filter((i) => i.corroboratedInWindow).length} corroborated in-window`
  );

  // What the tier rule actually cost. An item whose untiered score would have
  // alerted but whose tiered score does not is the cap doing its job — or
  // suppressing the trade, depending on what the headline turns out to be.
  const suppressed = items.filter(
    (item) =>
      item.tier !== null &&
      item.scoreUntiered >= DEFAULT_ALERT_THRESHOLD &&
      item.score < DEFAULT_ALERT_THRESHOLD
  );
  console.log(
    `Tier rules suppressed ${suppressed.length} item(s) below the alert threshold ` +
      `(>=${DEFAULT_ALERT_THRESHOLD}):`
  );
  for (const item of suppressed.slice(0, 20)) {
    console.log(
      `  ${String(item.score).padStart(3)} (${String(item.scoreUntiered).padStart(3)} ` +
        `untiered)  ${item.feedKey.padEnd(14)} [${item.tickers.join(' ') || '—'}]  ` +
        `${item.headline.slice(0, 62)}`
    );
  }

  // The qualitative half: density alone cannot tell local-business SEO spam
  // from a low-float pump. Section 7c's call needs the headlines read.
  for (const feed of feeds.filter((f) => f.tier === WireTier.PROMOTIONAL)) {
    const rows = items.filter((item) => item.feedKey === feed.key);
    if (!rows.length) continue;
    console.log(`\n-- ${feed.key} · every in-window headline ${'-'.repeat(30)}`);
    for (const item of rows.sort((a, b) => +a.publishedAt - +b.publishedAt)) {
      console.log(
        `  ${etFull.format(item.publishedAt)} ET  ${String(item.score).padStart(3)}  ` +
          `[${item.tickers.join(' ') || '—'}]  ${item.headline.slice(0, 84)}`
      );
    }
  }

  const top = items
    .filter((item) => item.score >= DEFAULT_ALERT_THRESHOLD)
    .sort((a, b) => b.score - a.score);
  console.log(`\n-- ${top.length} item(s) clearing the alert threshold ${'-'.repeat(24)}`);
  for (const item of top.slice(0, 25)) {
    console.log(
      `  ${String(item.score).padStart(3)}  ${etFull.format(item.publishedAt)} ET  ` +
        `${item.feedKey.padEnd(14)} [${item.tickers.join(' ') || '—'}]  ` +
        `${item.headline.slice(0, 66)}`
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
