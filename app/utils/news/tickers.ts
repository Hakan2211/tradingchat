import { prisma } from '../db.server';

/**
 * Symbol resolution, guarded by `SymbolUniverse`.
 *
 * Ticker extraction is the biggest source of false positives in a news feed:
 * bare-word matching turns CEO, AI, FDA and NEWS into tickers, which is
 * exactly what makes cheap news bots unusable. So nothing becomes a
 * `NewsTicker` row unless the universe table has heard of it.
 *
 * The universe is ~10k rows seeded from the SEC's own ticker/exchange file, so
 * it is cached in memory rather than queried per item — the poll loop resolves
 * a CIK for every filing on every cycle.
 */

type Universe = {
  byTicker: Map<string, { ticker: string; exchange: string }>;
  byCik: Map<string, string[]>;
  loadedAt: number;
};

let cache: Universe | null = null;

/** The file is refreshed daily by the seed; an hour-old cache is plenty fresh. */
const CACHE_TTL_MS = 60 * 60_000;

/** CIKs are zero-padded to 10 digits in some SEC feeds and bare in others. */
export function normalizeCik(cik: string | number): string {
  return String(cik).replace(/\D/g, '').replace(/^0+/, '');
}

export function normalizeTicker(raw: string): string {
  return raw.trim().toUpperCase();
}

async function loadUniverse(): Promise<Universe> {
  const rows = await prisma.symbolUniverse.findMany({
    select: { ticker: true, exchange: true, cik: true },
  });
  const byTicker = new Map<string, { ticker: string; exchange: string }>();
  const byCik = new Map<string, string[]>();
  for (const row of rows) {
    byTicker.set(row.ticker, { ticker: row.ticker, exchange: row.exchange });
    if (!row.cik) continue;
    // One CIK can list several symbols (share classes, preferreds), and all of
    // them are legitimately "the company that filed".
    const existing = byCik.get(row.cik);
    if (existing) existing.push(row.ticker);
    else byCik.set(row.cik, [row.ticker]);
  }
  return { byTicker, byCik, loadedAt: Date.now() };
}

export async function getUniverse(): Promise<Universe> {
  if (!cache || Date.now() - cache.loadedAt > CACHE_TTL_MS) {
    cache = await loadUniverse();
  }
  return cache;
}

/** Drop the cache so the next read reflects a fresh seed. Used by the seeder. */
export function invalidateUniverseCache(): void {
  cache = null;
}

/** Every symbol the SEC associates with a filer CIK. Empty if unlisted. */
export async function tickersForCik(cik: string): Promise<string[]> {
  const universe = await getUniverse();
  return universe.byCik.get(normalizeCik(cik)) ?? [];
}

/**
 * Keep only candidates that are real listed symbols. This is the guard that
 * makes wire extraction (M2) safe to turn on.
 */
export async function validateTickers(candidates: string[]): Promise<string[]> {
  const universe = await getUniverse();
  const seen = new Set<string>();
  const valid: string[] = [];
  for (const candidate of candidates) {
    const ticker = normalizeTicker(candidate);
    if (seen.has(ticker)) continue;
    seen.add(ticker);
    if (universe.byTicker.has(ticker)) valid.push(ticker);
  }
  return valid;
}

/**
 * Halt symbols carry a suffix the SEC file does not use: Nasdaq writes
 * `GPUS-D` for a preferred series whose common stock is listed as `GPUS`.
 * Validate against the base symbol but keep the exact symbol that halted.
 */
export function baseSymbol(ticker: string): string {
  return normalizeTicker(ticker).split('-')[0];
}

/**
 * Exchange-prefixed symbol references in wire prose.
 *
 * Only ever matches inside a parenthesised group that names an exchange —
 * `(NASDAQ: ABCD)`, `(Nasdaq Capital Market: ABCD)`, `(OTCID: HPNN)`. Bare
 * uppercase words are NEVER candidates: that is what turns CEO, AI, FDA and
 * NEWS into tickers and makes cheap news bots unusable.
 *
 * Canadian venues are listed so their symbols are recognised and then dropped
 * by universe validation rather than silently mistaken for a US listing — the
 * SEC file only covers US registrants, and a TSXV-only name is not tradeable
 * by this audience anyway.
 */
const EXCHANGE_GROUP =
  /\(\s*(?:NYSE\s*American|NYSE\s*MKT|NASDAQ[^):]{0,30}|NYSE|AMEX|OTCQB|OTCQX|OTCID|OTC\s*Pink|OTCMKTS|OTC|CBOE|TSXV|TSX|CSE|NEO)\s*[:\-–]\s*([^)]{1,60})\)/gi;

/** Symbol-shaped tokens inside the group after the colon. */
const SYMBOL_TOKEN = /\b([A-Z][A-Z0-9]{0,5}(?:[.\-][A-Z]{1,2})?)\b/g;

/** Raw candidates, before universe validation. Exported for testing. */
export function extractTickerCandidates(text: string): string[] {
  const candidates: string[] = [];
  for (const group of text.matchAll(EXCHANGE_GROUP)) {
    const body = group[1];
    for (const token of body.matchAll(SYMBOL_TOKEN)) {
      candidates.push(token[1]);
    }
  }
  return candidates;
}

/**
 * Symbols a wire item is actually about: exchange-prefixed references that
 * survive validation against the listed universe.
 *
 * Returns [] rather than throwing when nothing validates — a release with no
 * resolvable ticker is still stored and still shows in the unfiltered feed, it
 * just cannot match a watch rule.
 */
export async function extractTickers(text: string): Promise<string[]> {
  const candidates = extractTickerCandidates(text);
  if (candidates.length === 0) return [];
  return validateTickers(candidates);
}
