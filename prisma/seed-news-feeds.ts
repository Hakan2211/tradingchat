/**
 * The news source registry.
 *
 * Sources are DATA, not code: adding a wire is a row here, not a migration and
 * a redeploy. Idempotent upsert by `key`, so re-running it is always safe and
 * it never clobbers a feed's cursor or health columns.
 *
 * `enabled` is deliberately false for every wire whose URL has not been
 * verified against the live endpoint. M1.5 (`scripts/news-discover-feed.ts`)
 * fills those in; flipping one on afterwards is an UPDATE, not a deploy.
 *
 *   npx tsx prisma/seed-news-feeds.ts
 */
import { NewsSourceKind, PrismaClient, WireTier } from '@prisma/client';

const prisma = new PrismaClient();

/** Identifies us to the SEC, which rejects requests without a contact address. */
const SEC_USER_AGENT = 'tradingchat hbilgic1992@gmail.com';

/** Several wires 403 or reset the connection on a bare node-fetch UA. */
const BROWSER_USER_AGENT = 'Mozilla/5.0 (compatible; tradingchat/1.0)';

type FeedSeed = {
  key: string;
  name: string;
  kind: NewsSourceKind;
  tier?: WireTier;
  url: string;
  enabled: boolean;
  pollIntervalSec: number;
  userAgent?: string;
  note?: string;
};

const FEEDS: FeedSeed[] = [
  // --- M1: verified live on 2026-08-25 ------------------------------------
  {
    key: 'sec-edgar',
    name: 'SEC EDGAR',
    kind: NewsSourceKind.SEC_EDGAR,
    // The `types` parameter is read by the adapter, which then issues one
    // request per form type. Widening the list needs no code change.
    url:
      'https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&output=atom' +
      '&types=8-K,424B5,S-1,S-3,SC 13D,SC 13G,6-K',
    enabled: true,
    pollIntervalSec: 10,
    userAgent: SEC_USER_AGENT,
  },
  {
    key: 'nasdaq-halts',
    name: 'Nasdaq Trade Halts',
    kind: NewsSourceKind.EXCHANGE_HALT,
    url: 'https://www.nasdaqtrader.com/rss.aspx?feed=tradehalts',
    enabled: true,
    pollIntervalSec: 10,
    userAgent: BROWSER_USER_AGENT,
  },

  // --- Wires, live. Verified against the live endpoints on 2026-08-25 and
  // measured for how often an item carries a resolvable ticker, which is what
  // actually decides whether a wire is worth polling. --------------------
  {
    key: 'newsdirect',
    name: 'News Direct',
    kind: NewsSourceKind.WIRE,
    tier: WireTier.STANDARD,
    url: 'https://newsdirect.com/feed',
    enabled: true,
    pollIntervalSec: 20,
    userAgent: BROWSER_USER_AGENT,
    note: '10 items, 7 with a ticker — best signal density probed. 301, follow it',
  },
  {
    key: 'prnewswire',
    name: 'PR Newswire (Financial Services)',
    kind: NewsSourceKind.WIRE,
    tier: WireTier.MAJOR,
    // NOT the generic news-releases-list feed: that returned 20 items with
    // ZERO resolvable tickers — private-company corporate PR. The financial
    // category is three times denser. See §7b of the roadmap.
    url: 'https://www.prnewswire.com/rss/financial-services-latest-news/financial-services-latest-news-list.rss',
    enabled: true,
    pollIntervalSec: 20,
    userAgent: BROWSER_USER_AGENT,
    note: '20 items, 6 with a ticker. Also carries non-English releases',
  },
  {
    key: 'newswire-com',
    name: 'Newswire.com',
    kind: NewsSourceKind.WIRE,
    tier: WireTier.STANDARD,
    url: 'https://www.newswire.com/newsroom/rss',
    enabled: true,
    pollIntervalSec: 20,
    userAgent: BROWSER_USER_AGENT,
    note: '50 items, 4 with a ticker — high volume, low density',
  },

  // --- M1.5: URL unknown or unreachable from the dev machine. Rows exist so
  // discovery can fill in the URL and flip `enabled` with no deploy. -------
  {
    key: 'globenewswire',
    name: 'GlobeNewswire',
    kind: NewsSourceKind.WIRE,
    tier: WireTier.MAJOR,
    url: 'https://www.globenewswire.com/RssFeed/orgclass/1/feedTitle/GlobeNewswire-News-about-Public-Companies',
    enabled: true,
    pollIntervalSec: 20,
    userAgent: BROWSER_USER_AGENT,
    note: 'VERIFIED 2026-08-25 from a real browser: this URL serves valid RSS, 20 items, "Contains the last 20 releases". The dev machine\'s connection resets were a network-level block, not a dead feed. Publishes exchange:symbol in <category domain=".../rss/stock"> — 15 of 20 items carried a US symbol there vs ~half in prose, which is why the adapter reads it',
  },
  {
    key: 'accessnewswire',
    name: 'ACCESS Newswire',
    kind: NewsSourceKind.WIRE,
    tier: WireTier.MAJOR,
    url: '',
    enabled: false,
    pollIntervalSec: 20,
    userAgent: BROWSER_USER_AGENT,
    note: 'BLOCKED 2026-08-25: homepage returns a Cloudflare challenge (403 "Just a moment"). Retry from the Coolify host, or find the feed in a real browser',
  },
  {
    key: 'newsfile',
    name: 'Newsfile',
    kind: NewsSourceKind.WIRE,
    tier: WireTier.MAJOR,
    url: '',
    enabled: false,
    pollIntervalSec: 20,
    userAgent: BROWSER_USER_AGENT,
    note: 'NOT FOUND 2026-08-25: homepage advertises no feed and every conventional path 404s. Needs a browser devtools check',
  },
  {
    key: 'webwire',
    name: 'WebWire',
    kind: NewsSourceKind.WIRE,
    tier: WireTier.STANDARD,
    // Found by scripts/news-discover-feed.ts on 2026-08-25 via the homepage's
    // own <link rel="alternate">. NOTE: plain http — the https host does not
    // answer. Public RSS with no credentials, so no TLS is acceptable here,
    // but do not copy this URL shape to anything authenticated.
    url: 'http://rssfeeds.webwire.com/webwire-recentheadlines',
    enabled: true,
    pollIntervalSec: 30,
    userAgent: BROWSER_USER_AGENT,
    note: '369 items, 21 with a ticker (6%) — very high volume, modest density',
  },
  {
    key: 'acnnewswire',
    name: 'ACN Newswire',
    kind: NewsSourceKind.WIRE,
    tier: WireTier.STANDARD,
    // acnnewswire.com/rss/ is an HTML INDEX of feeds, not a feed — which is why
    // guessing that path returned 200 with zero items. This is the English one.
    url: 'https://www.acnnewswire.com/rss/lang/english.xml',
    enabled: true,
    pollIntervalSec: 30,
    userAgent: BROWSER_USER_AGENT,
    note: 'Asia-Pacific — relevant to the China small-cap runners',
  },

  // --- Promotional. Ingested deliberately, NOT filtered out: a paid-placement
  // release on a 3M-float ticker at 07:15 ET is the setup this app's users
  // trade. They are score-capped below the alert threshold instead, and only
  // escalate when a halt or filing corroborates them (M2). ------------------
  {
    key: 'abnewswire',
    name: 'ABNewswire',
    kind: NewsSourceKind.WIRE,
    tier: WireTier.PROMOTIONAL,
    // Advertised on the homepage at a path none of the conventional guesses
    // covered (/pressreleases/feed/, not /feed/).
    url: 'https://www.abnewswire.com/pressreleases/feed/',
    enabled: true,
    pollIntervalSec: 60,
    userAgent: BROWSER_USER_AGENT,
    note: '50 items. Score-capped below the alert threshold by tier',
  },
  {
    key: 'kisspr',
    name: 'KissPR',
    kind: NewsSourceKind.WIRE,
    tier: WireTier.PROMOTIONAL,
    // kisspr.com now redirects to Brand Story Press Wire; this is its feed.
    url: 'https://brandstorypresswire.com/feed/',
    enabled: true,
    pollIntervalSec: 60,
    userAgent: BROWSER_USER_AGENT,
    note: '10 items, 0 with a ticker on discovery — watch whether it earns its poll',
  },
];

export async function seedNewsFeeds(client: PrismaClient = prisma) {
  for (const feed of FEEDS) {
    const { note: _note, ...data } = feed;
    await client.newsFeed.upsert({
      where: { key: feed.key },
      // Config only. Never touch lastItemAt / lastError / consecutiveFailures —
      // re-seeding must not reset a running feed's cursor or replay news.
      update: {
        name: data.name,
        kind: data.kind,
        tier: data.tier ?? null,
        pollIntervalSec: data.pollIntervalSec,
        userAgent: data.userAgent ?? null,
        // A blank URL in the registry is a placeholder awaiting discovery, so
        // it must never wipe a URL that discovery already found. A non-blank
        // one IS the correction and does propagate — otherwise a wrong URL
        // committed here could never be fixed by re-seeding.
        ...(data.url ? { url: data.url } : {}),
        // Enabling propagates; disabling does not. A feed switched on against
        // the live database stays on, but the registry can promote a newly
        // verified one without anyone editing rows by hand.
        ...(data.enabled ? { enabled: true } : {}),
      },
      create: { ...data, tier: data.tier ?? null, userAgent: data.userAgent ?? null },
    });
  }

  const enabled = FEEDS.filter((feed) => feed.enabled).length;
  console.log(`📰 Seeded ${FEEDS.length} news feed(s), ${enabled} enabled.`);
}

// Only run standalone; importing this from prisma/seed.ts must not self-execute.
if (process.argv[1]?.includes('seed-news-feeds')) {
  seedNewsFeeds()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
