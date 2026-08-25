/**
 * Seed `SymbolUniverse` from the SEC's own ticker file.
 *
 * This table is the guard that makes ticker extraction usable: without it,
 * bare-word matching on wire headlines turns CEO, AI, FDA and NEWS into
 * tickers. Nothing becomes a `NewsTicker` row unless it is in here.
 *
 * Uses `company_tickers_exchange.json` rather than `company_tickers.json`,
 * because it carries the exchange column — which the scoring rule needs
 * (NASDAQ/AMEX are the small-cap venues) and the plain file does not have.
 *
 * Public domain, no key, ~10k rows. Re-run daily; it is a pure upsert.
 *
 *   npx tsx prisma/seed-symbol-universe.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SOURCE_URL = 'https://www.sec.gov/files/company_tickers_exchange.json';

/** The SEC rejects requests that do not identify the caller with a contact. */
const USER_AGENT = 'tradingchat hbilgic1992@gmail.com';

type ExchangeFile = {
  fields: string[];
  data: Array<Array<string | number | null>>;
};

/**
 * SEC exchange labels are title case and inconsistent; ours are not.
 *
 * Caveat for scoring (M2): this file does NOT distinguish NYSE American from
 * NYSE — as of 2026-08-25 it emits only Nasdaq / NYSE / OTC / CBOE / null, with
 * no AMEX label at all. So "is this an AMEX name" cannot be answered from here;
 * the halt feed's own `Market` field is the reliable source for that.
 *
 * A null exchange (198 symbols today) is left UNKNOWN rather than guessed as
 * OTC — mislabelling them would quietly suppress their score.
 */
function normalizeExchange(value: string | null): string {
  const exchange = (value ?? '').trim().toUpperCase();
  if (!exchange || exchange === 'NULL') return 'UNKNOWN';
  if (exchange === 'NYSE AMERICAN' || exchange === 'NYSE MKT') return 'AMEX';
  if (exchange.startsWith('NASDAQ')) return 'NASDAQ';
  if (exchange.startsWith('NYSE')) return 'NYSE';
  if (exchange.startsWith('CBOE')) return 'CBOE';
  return exchange;
}

export type UniverseRow = {
  ticker: string;
  name: string;
  exchange: string;
  cik: string;
};

export function parseExchangeFile(payload: ExchangeFile): UniverseRow[] {
  const index = (field: string) => payload.fields.indexOf(field);
  const cikAt = index('cik');
  const nameAt = index('name');
  const tickerAt = index('ticker');
  const exchangeAt = index('exchange');

  if (cikAt < 0 || nameAt < 0 || tickerAt < 0) {
    throw new Error(`unexpected field layout: ${payload.fields.join(', ')}`);
  }

  const rows = new Map<string, UniverseRow>();
  for (const entry of payload.data) {
    const ticker = String(entry[tickerAt] ?? '').trim().toUpperCase();
    if (!ticker) continue;
    // A ticker is the primary key; the file lists each symbol once, but guard
    // against a duplicate silently failing the whole batch.
    rows.set(ticker, {
      ticker,
      name: String(entry[nameAt] ?? '').trim() || ticker,
      exchange: normalizeExchange(
        exchangeAt >= 0 ? (entry[exchangeAt] as string | null) : null
      ),
      // Stored bare (no zero padding) so it matches what the EDGAR atom feed
      // puts in its entry titles.
      cik: String(entry[cikAt] ?? '').replace(/\D/g, '').replace(/^0+/, ''),
    });
  }
  return [...rows.values()];
}

export async function seedSymbolUniverse(client: PrismaClient = prisma) {
  console.log(`📈 Fetching ${SOURCE_URL} ...`);
  const response = await fetch(SOURCE_URL, {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`SEC ticker file returned ${response.status}`);
  }

  const rows = parseExchangeFile((await response.json()) as ExchangeFile);
  if (rows.length < 1000) {
    // A truncated or reshaped file would otherwise quietly shrink the universe
    // and start rejecting real tickers.
    throw new Error(`only ${rows.length} symbols parsed — refusing to seed`);
  }

  // Chunked: SQLite takes one statement per upsert, and a single 10k-row
  // transaction holds the write lock long enough to block the chat.
  const CHUNK = 500;
  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    await client.$transaction(
      chunk.map((row) =>
        client.symbolUniverse.upsert({
          where: { ticker: row.ticker },
          update: { name: row.name, exchange: row.exchange, cik: row.cik },
          create: row,
        })
      )
    );
    written += chunk.length;
    if (written % 2500 === 0 || written === rows.length) {
      console.log(`   ${written}/${rows.length}`);
    }
  }

  const byExchange = rows.reduce<Record<string, number>>((counts, row) => {
    counts[row.exchange] = (counts[row.exchange] ?? 0) + 1;
    return counts;
  }, {});
  console.log(`📈 Symbol universe: ${rows.length} symbols`, byExchange);
}

if (process.argv[1]?.includes('seed-symbol-universe')) {
  seedSymbolUniverse()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
