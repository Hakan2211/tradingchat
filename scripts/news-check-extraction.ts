/**
 * Assert that ticker extraction still does what it is supposed to. WRITES
 * NOTHING; exits non-zero on the first disagreement.
 *
 *   npx tsx scripts/news-check-extraction.ts        # npm run news:check
 *
 * Ticker extraction is the product (roadmap §4): it is the whole reason this
 * feed beats a generic news bot, and it is also the single easiest thing to
 * break by loosening a regex "just a little". §7b asked for exactly this — the
 * classifier and extractor are pure functions, so give them real captured
 * headlines and test them directly.
 *
 * The fixture is a verbatim structural copy of GlobeNewswire's live feed from
 * 2026-08-25, quirks included: newlines inside the `<category>` tag, a trailing
 * space in `Nasdaq:QUCY `, a French translation sharing `dc:identifier` with its
 * English original, and foreign-only venues.
 *
 * Two of these cases are REGRESSIONS THAT ACTUALLY SHIPPED, and both were found
 * by running this fixture:
 *   - `(TSX-V: "DEX")` resolved to `V` — Visa — because the venue alternation
 *     listed `TSX` before `TSX-V` and the `-` was read as the separator.
 *   - `(NYSE American: NVA | ASX: NVA)` resolved `NVA` AND `ASX`, turning the
 *     second venue's NAME into a ticker.
 * If either comes back, this script fails.
 *
 * Requires a seeded `SymbolUniverse` (npm run db:seed:symbols) — validation is
 * the point, and against an empty universe everything trivially resolves to
 * nothing and every case would "pass".
 */
import 'dotenv/config';
import { prisma } from '../app/utils/db.server';
import { parseWireRss } from '../app/utils/news/adapters/wires';
import {
  extractMetadataTickerCandidates,
  extractTickerCandidates,
  validateTickers,
} from '../app/utils/news/tickers';

const FIXTURE = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0"><channel>
<item>
<guid isPermaLink="true">https://www.globenewswire.com/news-release/2026/08/25/3350334/en/fuelcell.html</guid>
<link>https://www.globenewswire.com/news-release/2026/08/25/3350334/en/fuelcell.html</link>
<category
domain="https://www.globenewswire.com/rss/stock">Nasdaq:FCEL</category>
<category
domain="https://www.globenewswire.com/rss/ISIN">US35952H5028</category>
<title>FuelCell Energy Announces Third Quarter 2026 Results Conference Call</title>
<description><![CDATA[<p>DANBURY, Conn. -- FuelCell Energy, Inc. (Nasdaq: FCEL) -- announced results.</p>]]></description>
<pubDate>Tue, 25 Aug 2026 11:30 GMT</pubDate>
<dc:language>en</dc:language>
</item>
<item>
<guid isPermaLink="true">https://www.globenewswire.com/news-release/2026/08/25/3350335/en/almadex.html</guid>
<link>https://www.globenewswire.com/news-release/2026/08/25/3350335/en/almadex.html</link>
<category
domain="https://www.globenewswire.com/rss/stock">TSX-V:DEX</category>
<title>Almadex Commences Drilling at the King Copper-Gold Porphyry Target</title>
<description><![CDATA[<p>VANCOUVER -- Almadex Minerals Ltd. (TSX-V: "DEX") has commenced drilling.</p>]]></description>
<pubDate>Tue, 25 Aug 2026 11:30 GMT</pubDate>
<dc:language>en</dc:language>
</item>
<item>
<guid isPermaLink="true">https://www.globenewswire.com/news-release/2026/08/25/3350336/en/zevra.html</guid>
<link>https://www.globenewswire.com/news-release/2026/08/25/3350336/en/zevra.html</link>
<category
domain="https://www.globenewswire.com/rss/stock">Nasdaq:ZVRA</category>
<title>Zevra Therapeutics to Present New Long-Term Real-World Data on MIPLYFFA</title>
<description><![CDATA[Presentations from U.S. and German early access programs highlight sustained disease stabilization.]]></description>
<pubDate>Tue, 25 Aug 2026 11:30 GMT</pubDate>
<dc:language>en</dc:language>
</item>
<item>
<guid isPermaLink="true">https://www.globenewswire.com/news-release/2026/08/25/3350337/en/dynacor.html</guid>
<link>https://www.globenewswire.com/news-release/2026/08/25/3350337/en/dynacor.html</link>
<category
domain="https://www.globenewswire.com/rss/stock">TSX:DNG</category>
<category
domain="https://www.globenewswire.com/rss/stock">OTC Markets:DNGDF</category>
<title>Dynacor Group Announces September 2026 Dividend</title>
<description><![CDATA[Dynacor Group Inc. announces a monthly dividend of C$0.01333 per common share.]]></description>
<pubDate>Tue, 25 Aug 2026 11:30 GMT</pubDate>
<dc:language>en</dc:language>
</item>
<item>
<guid isPermaLink="true">https://www.globenewswire.com/news-release/2026/08/25/3350337/fr/dynacor-fr.html</guid>
<link>https://www.globenewswire.com/news-release/2026/08/25/3350337/fr/dynacor-fr.html</link>
<category
domain="https://www.globenewswire.com/rss/stock">OTC Markets:DNGDF</category>
<title>Groupe Dynacor declare son dividende pour septembre 2026</title>
<description><![CDATA[<p>MONTREAL -- Groupe Dynacor inc. (TSX : DNG) a le plaisir d'annoncer.</p>]]></description>
<pubDate>Tue, 25 Aug 2026 11:30 GMT</pubDate>
<dc:language>fr</dc:language>
</item>
<item>
<guid isPermaLink="true">https://www.globenewswire.com/news-release/2026/08/25/3350338/en/swvl.html</guid>
<link>https://www.globenewswire.com/news-release/2026/08/25/3350338/en/swvl.html</link>
<category
domain="https://www.globenewswire.com/rss/stock">Nasdaq:SWVL</category>
<title>Swvl Announces $13 Million Strategic Investment Round Priced At-The-Market Under Nasdaq Rules led by the Sawiris Family and Coefficient LP</title>
<description><![CDATA[<p>Swvl Holdings Corp (Nasdaq: SWVL) entered a definitive securities purchase agreement for a $13 million private placement.</p>]]></description>
<pubDate>Tue, 25 Aug 2026 11:30 GMT</pubDate>
<dc:language>en</dc:language>
</item>
<item>
<guid isPermaLink="true">https://www.globenewswire.com/news-release/2026/08/25/3350341/en/quantum-cyber.html</guid>
<link>https://www.globenewswire.com/news-release/2026/08/25/3350341/en/quantum-cyber.html</link>
<category
domain="https://www.globenewswire.com/rss/stock">Nasdaq:QUCY </category>
<title>Quantum Cyber Appoints Veteran Distribution Executive Dennis Schnur as Head of U.S. Sales</title>
<description><![CDATA[Six-Decade Wholesale Distribution Executive Joins Quantum Cyber to Lead the Company's U.S. Sales Build-Out.]]></description>
<pubDate>Tue, 25 Aug 2026 11:30 GMT</pubDate>
<dc:language>en</dc:language>
</item>
<item>
<guid isPermaLink="true">https://www.globenewswire.com/news-release/2026/08/25/3350331/da/bankinvest.html</guid>
<link>https://www.globenewswire.com/news-release/2026/08/25/3350331/da/bankinvest.html</link>
<category
domain="https://www.globenewswire.com/rss/stock">Copenhagen:BAIPFJ</category>
<title>Investeringsforeningen BankInvest Halvaarsrapport 2026</title>
<description><![CDATA[<p>Bestyrelsen har i dag behandlet og vedtaget halvaarsrapport 2026.</p>]]></description>
<pubDate>Tue, 25 Aug 2026 11:22 GMT</pubDate>
<dc:language>da</dc:language>
</item>
<item>
<guid isPermaLink="true">https://www.globenewswire.com/news-release/2026/08/25/3350329/en/nova.html</guid>
<link>https://www.globenewswire.com/news-release/2026/08/25/3350329/en/nova.html</link>
<category
domain="https://www.globenewswire.com/rss/stock">NYSE:NVA</category>
<category
domain="https://www.globenewswire.com/rss/stock">AUST:NVA.AX</category>
<title>Western Caucus Congressional Delegation Visits the Estelle Gold Project</title>
<description><![CDATA[<p>Nova Minerals Corp (NYSE American: NVA | ASX: NVA) hosted a Congressional delegation.</p>]]></description>
<pubDate>Tue, 25 Aug 2026 11:11 GMT</pubDate>
<dc:language>en</dc:language>
</item>
<item>
<guid isPermaLink="true">https://www.globenewswire.com/news-release/2026/08/25/3350294/en/loblaw.html</guid>
<link>https://www.globenewswire.com/news-release/2026/08/25/3350294/en/loblaw.html</link>
<category
domain="https://www.globenewswire.com/rss/stock">TSX:L</category>
<title>Loblaw August Food Inflation Report</title>
<description><![CDATA[<p>TORONTO -- Today, Loblaw released the latest edition of its Food Inflation Report.</p>]]></description>
<pubDate>Tue, 25 Aug 2026 11:00 GMT</pubDate>
<dc:language>en</dc:language>
</item>
</channel></rss>`;

/** Headline fragment -> the symbols extraction must end up with, and why. */
const EXPECTED: Array<{ match: string; tickers: string[]; why: string }> = [
  { match: 'FuelCell', tickers: ['FCEL'], why: 'metadata and prose agree' },
  {
    match: 'Almadex',
    tickers: [],
    why: 'REGRESSION GUARD: TSX-V must not yield V (Visa)',
  },
  {
    match: 'Zevra',
    tickers: ['ZVRA'],
    why: 'metadata only — the snippet never names the symbol',
  },
  {
    match: 'Dynacor Group Announces',
    tickers: [],
    why: 'TSX rejected; DNGDF is OTC but is not a US registrant in the universe',
  },
  { match: 'Swvl', tickers: ['SWVL'], why: 'metadata and prose agree' },
  {
    match: 'Quantum Cyber',
    tickers: ['QUCY'],
    why: 'metadata only, and its value carries a trailing space',
  },
  {
    match: 'Western Caucus',
    tickers: ['NVA'],
    why: 'REGRESSION GUARD: the second venue (ASX) must not become a ticker',
  },
  {
    match: 'Loblaw',
    tickers: [],
    why: 'TSX:L must not resolve to Loews on the NYSE',
  },
];

/** Items the parser must drop outright. */
const MUST_DROP = [
  { fragment: '/fr/', why: 'French translation of an English release' },
  { fragment: '/da/', why: 'Danish-only release' },
];

async function main() {
  const universe = await prisma.symbolUniverse.count();
  if (universe === 0) {
    throw new Error(
      'SymbolUniverse is empty — run `npm run db:seed:symbols` first, or every case passes vacuously.'
    );
  }
  console.log(`\nSymbolUniverse: ${universe} symbols\n`);

  const items = parseWireRss(FIXTURE, 'globenewswire');
  let failures = 0;

  for (const dropped of MUST_DROP) {
    const leaked = items.some((item) => item.url.includes(dropped.fragment));
    console.log(`${leaked ? 'FAIL' : 'ok  '}  dropped ${dropped.fragment} — ${dropped.why}`);
    if (leaked) failures += 1;
  }

  console.log('');

  for (const expected of EXPECTED) {
    const item = items.find((candidate) => candidate.headline.includes(expected.match));
    if (!item) {
      console.log(`FAIL  ${expected.match}: item missing from the parse`);
      failures += 1;
      continue;
    }

    const resolved = await validateTickers([
      ...extractMetadataTickerCandidates(item.symbolHints ?? []),
      ...extractTickerCandidates(`${item.headline} ${item.summary ?? ''}`),
    ]);

    const got = resolved.join(',') || '(none)';
    const want = expected.tickers.join(',') || '(none)';
    const pass = got === want;
    if (!pass) failures += 1;
    console.log(
      `${pass ? 'ok  ' : 'FAIL'}  ${expected.match.padEnd(24)} ${got.padEnd(10)} ${
        pass ? '' : `expected ${want} `
      }— ${expected.why}`
    );
  }

  if (failures > 0) {
    console.log(`\n${failures} failure(s).\n`);
    process.exitCode = 1;
    return;
  }
  console.log(`\nAll ${MUST_DROP.length + EXPECTED.length} checks passed.\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
