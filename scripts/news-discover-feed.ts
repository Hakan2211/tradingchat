/**
 * Find a wire's RSS feed, instead of guessing URLs.
 *
 * Four of the wires in the registry 404'd on guessed paths — a plumbing
 * problem, not a data problem. This fetches a homepage the way a browser
 * would, reads the `<link rel="alternate">` tags the site itself advertises,
 * probes the conventional paths as a fallback, and then RANKS what it finds by
 * the only measure that matters: how many items carry a ticker we can resolve.
 *
 * A feed with 50 items and no resolvable tickers is worse than one with 10 and
 * seven — that is the lesson from PR Newswire's generic feed (§7b).
 *
 *   npx tsx scripts/news-discover-feed.ts https://www.accessnewswire.com
 *   npx tsx scripts/news-discover-feed.ts accessnewswire.com newsfilecorp.com
 *   npx tsx scripts/news-discover-feed.ts --json <url>
 *
 * Writes nothing. Paste the winner into prisma/seed-news-feeds.ts and re-seed.
 */
import 'dotenv/config';
import { prisma } from '../app/utils/db.server';
import { extractTickers } from '../app/utils/news/tickers';
import { parseWireRss } from '../app/utils/news/adapters/wires';
import { decodeEntities } from '../app/utils/news/xml';

/** Several wires 403 or reset the connection on a bare node-fetch UA. */
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';

const FETCH_TIMEOUT_MS = 20_000;

/** Conventional paths, tried only when the homepage advertises nothing. */
const FALLBACK_PATHS = [
  '/rss',
  '/feed',
  '/feed/',
  '/rss.xml',
  '/feeds/news.xml',
  '/atom.xml',
  '/rss/news',
  '/news/rss',
  '/newsroom/rss',
  '/rss/news-releases-list.rss',
];

const asJson = process.argv.includes('--json');
const targets = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));

function normalizeUrl(input: string): string {
  return /^https?:\/\//i.test(input) ? input : `https://${input}`;
}

async function get(url: string): Promise<{ ok: boolean; status: number; body: string; finalUrl: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/rss+xml,application/atom+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    const body = await response.text();
    return { ok: response.ok, status: response.status, body, finalUrl: response.url || url };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      body: error instanceof Error ? error.message : String(error),
      finalUrl: url,
    };
  } finally {
    clearTimeout(timer);
  }
}

/** `<link rel="alternate" type="application/rss+xml" href="...">`, any order. */
function advertisedFeeds(html: string, baseUrl: string): string[] {
  const found = new Set<string>();
  for (const tag of html.matchAll(/<link\b[^>]*>/gi)) {
    const raw = tag[0];
    if (!/rel=["']?alternate/i.test(raw)) continue;
    if (!/type=["']?application\/(rss|atom)\+xml/i.test(raw)) continue;
    const href = raw.match(/href=["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    try {
      found.add(new URL(decodeEntities(href), baseUrl).toString());
    } catch {
      // A malformed href is not worth failing the whole discovery over.
    }
  }
  return [...found];
}

type Candidate = {
  url: string;
  status: number;
  items: number;
  withTicker: number;
  density: number;
  sample: string[];
  note?: string;
};

async function evaluate(url: string): Promise<Candidate> {
  const response = await get(url);
  if (!response.ok) {
    return {
      url,
      status: response.status,
      items: 0,
      withTicker: 0,
      density: 0,
      sample: [],
      note: response.status === 0 ? `unreachable: ${response.body.slice(0, 60)}` : undefined,
    };
  }

  // Parsed by the SAME adapter that will ingest it, so a feed that looks fine
  // here cannot turn out to be unparseable in production.
  const items = parseWireRss(response.body, 'discovery');

  let withTicker = 0;
  const sample: string[] = [];
  for (const item of items) {
    const tickers = await extractTickers(`${item.headline} ${item.summary ?? ''}`);
    if (tickers.length) {
      withTicker++;
      if (sample.length < 3) sample.push(`[${tickers.join(' ')}] ${item.headline.slice(0, 62)}`);
    }
  }

  return {
    url: response.finalUrl,
    status: response.status,
    items: items.length,
    withTicker,
    density: items.length ? withTicker / items.length : 0,
    sample,
  };
}

async function discover(target: string) {
  const homepage = normalizeUrl(target);
  const results: Candidate[] = [];

  const page = await get(homepage);
  const advertised = page.ok ? advertisedFeeds(page.body, page.finalUrl) : [];

  if (!asJson) {
    console.log(`\n══ ${homepage}`);
    console.log(
      page.ok
        ? `   homepage ${page.status} · ${advertised.length} feed link(s) advertised`
        : `   homepage UNREACHABLE (${page.status || 'network'}) — ${page.body.slice(0, 70)}`
    );
  }

  const seen = new Set<string>();
  const queue = [...advertised];

  // Only fall back to guessing when the site advertises nothing useful.
  if (advertised.length === 0) {
    for (const path of FALLBACK_PATHS) {
      try {
        queue.push(new URL(path, homepage).toString());
      } catch {
        // ignore
      }
    }
  }

  for (const url of queue) {
    if (seen.has(url)) continue;
    seen.add(url);
    const candidate = await evaluate(url);
    if (candidate.items > 0 || candidate.status === 200) results.push(candidate);
  }

  results.sort((a, b) => b.density - a.density || b.items - a.items);

  if (!asJson) {
    if (results.length === 0) {
      console.log('   no working feed found — try the site map or a browser devtools check');
    }
    for (const candidate of results.slice(0, 6)) {
      const pct = Math.round(candidate.density * 100);
      console.log(
        `   ${String(candidate.status).padStart(3)} · ${String(candidate.items).padStart(3)} items · ` +
          `${String(candidate.withTicker).padStart(3)} with ticker (${String(pct).padStart(3)}%) · ${candidate.url}`
      );
      for (const line of candidate.sample) console.log(`         ${line}`);
      if (candidate.note) console.log(`         ${candidate.note}`);
    }
  }

  return { target: homepage, advertised, results };
}

async function main() {
  if (targets.length === 0) {
    console.log('Usage: npx tsx scripts/news-discover-feed.ts <homepage-url> [more...]');
    return;
  }

  const universe = await prisma.symbolUniverse.count();
  if (!asJson) {
    console.log(`news-discover-feed · universe ${universe} symbols`);
    if (universe === 0) {
      console.warn('⚠  SymbolUniverse empty — ticker density will read 0 for everything.');
    }
  }

  const all = [];
  for (const target of targets) all.push(await discover(target));

  if (asJson) console.log(JSON.stringify(all, null, 2));
  else console.log('\nPaste the winning URL into prisma/seed-news-feeds.ts, then re-seed.\n');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
