# News Feed — Small-Cap Catalyst Wire

Plan for a Nuntiobot-style news feed inside tradingchat, built on **free,
redistributable sources**. Written 2026-08-22.

Approved scope decisions:
- **Placement:** dedicated `/news` page with live push over the existing
  Socket.IO connection (not auto-posted into a chat room).
- **Sources:** SEC EDGAR, PR wire RSS, Nasdaq/NYSE halts, plus optional free
  API tiers (see the licensing verdicts below — this is where the plan
  disagrees with the initial pick).
- **Alerts:** in-app toast + sound, driven by per-user watch rules.
- **Access:** active subscribers + staff, gated like the ChartLog download.

---

## 0. What the competition actually runs on

Researched 2026-08-22, because it changes what is worth building.

**Nuntiobot** publishes nothing about its stack. Its own site describes the
product as *"The honed event feed for filtered press releases, precision-tuned
activity scans and more."* That phrasing is the whole answer: **filtered press
releases**. It is wire RSS plus a good filter, not a privileged data feed.

**Benzinga** is not a source you can tap — it is a vendor, and an expensive
one. Benzinga Pro's own feed is an aggregation of Benzinga Wire (their in-house
newsdesk), InvestorsHub NewsWire, PRConnect Newswire, Juju Press, generic press
releases, and SEC filings — i.e. the same wires plus paid human reporters.

**Scanz** likewise licenses news from commercial vendors and pairs it with
scanning.

### The conclusion that shapes this plan

Everyone reads the same wires. Nobody has a secret feed. The differentiator is
**the filter and the speed**, not the source. So the engineering investment
goes into ticker extraction, catalyst classification and scoring (§4), not into
hunting exotic providers.

### Source verdicts

| Source | Free? | Verdict |
|---|---|---|
| **SEC EDGAR** | Yes, no key | **Build on it.** Public-domain US government data, no redistribution restriction. Highest-signal small-cap source that exists — 424B5/S-1/S-3 dilution, 8-K, 13D/G, 6-K. |
| **Nasdaq Trader halt feed** | Yes, no key | **Build on it.** Public XML, verified live on 2026-08-22. LULD halts are often the first sign a low-float name is moving. |
| **PR wires RSS** — a dozen of them, see §3c | Yes, no key | **Build on it**, storing headline + link + timestamp only. This is where the pump headlines break. Do not store or re-serve full article bodies — the headline is fact, the body is copyrighted. |
| **Finnhub** free tier | Key, 60 req/min | **Optional, off by default.** Useful as a gap-filler and for quotes. Free tiers of commercial vendors generally bar redistribution inside a paid product. Behind an env flag, easy to drop. |
| **FMP** | Key, 250 req/day | **Skip.** FMP's pricing page explicitly states that *display or redistribution requires a data agreement*. tradingchat is a $99/mo product — that is exactly the case their terms carve out. Also 250 calls/day cannot support polling. |
| **Reuters** | No | **Skip.** Public RSS is long gone; real access is LSEG/Refinitiv enterprise pricing. |
| **Finviz** | No | **Skip.** No official API, ToS forbids scraping, and Elite's export licence is personal-use. Legal risk with no upside — its news tab is itself just aggregated wires. |
| **Yahoo Finance per-ticker RSS** | Unofficial | **Maybe, later.** `feeds.finance.yahoo.com/rss/2.0/headline?s=TICKER` still responds but is undocumented, unreliable, and duplicates the wires. Not worth a v1 adapter. |

Note: "Globetrotter" from the brief is **GlobeNewswire** — already Tier 1 above.

---

## 1. Where this lives in the codebase

The app is a single long-lived Node process (`server/server.ts`) that owns both
Express/React-Router and Socket.IO. There is already a precedent for a
background job in it: the 45s LiveKit reconciliation sweep. **The news poller
is the same shape** — a `setInterval` loop started from `server.ts`, guarded by
an env flag.

New files:

```
app/utils/news/
  types.ts             adapter contract, enums, RawItem
  adapters/
    sec-edgar.ts       EDGAR "getcurrent" atom + data.sec.gov
    nasdaq-halts.ts    nasdaqtrader.com trade-halt RSS
    wires.ts           one generic RSS adapter, configured per wire
    finnhub.ts         optional, env-gated
  ingest.server.ts     poll loop, dedupe, persist, fan-out
  classify.ts          catalyst rules + scoring (pure, unit-testable)
  tickers.ts           symbol extraction + universe validation
  news.server.ts       requireNewsAccess(), feed queries
app/routes/app/news/news-index.tsx
app/routes/resources/news.tsx        watch-rule CRUD (Conform + Zod)
app/components/news/                 feed row, filter bar, catalyst badge, detail sheet
scripts/news-poll-once.mjs           run one cycle, print, exit — no DB writes
```

Touched: `server/server.ts` (start the poller), `app/routes.ts` (`/news`),
`app/components/homeLayout/app-sidebar.tsx` (nav item), `prisma/schema.prisma`.

---

## 2. Data model

SQLite has no array type, so list-ish fields are JSON strings — the same
tradeoff the rest of the schema already lives with.

**The wire list is data, not code.** There are a dozen-plus wires worth
ingesting and the list will keep changing — feeds move, wires get acquired, new
ones appear. So sources live in a `NewsFeed` **table**, not a Prisma enum:
adding a wire is an INSERT, not a migration + redeploy. Only the three
structurally different source *kinds* are an enum.

```prisma
enum NewsSourceKind {
  SEC_EDGAR     // filings — bespoke adapter
  EXCHANGE_HALT // halt feed — bespoke adapter
  WIRE          // generic RSS — N rows share one adapter
  VENDOR_API    // Finnhub etc. — env-gated, off by default
}

// Signal quality of a wire. Drives scoring (§4) and the UI badge — NOT
// whether we ingest it. See §3c for why the cheap wires still matter.
enum WireTier {
  MAJOR         // real filers use these; correlates with 8-K-worthy events
  STANDARD      // legitimate, lower volume
  PROMOTIONAL   // paid-placement wires — high beta, low trust
  SYNDICATOR    // redistributes others' releases; mostly duplicates
}

model NewsFeed {
  key                 String         @id          // "globenewswire", "prnewswire"
  name                String
  kind                NewsSourceKind
  tier                WireTier?                   // null for non-WIRE kinds
  url                 String
  enabled             Boolean        @default(true)
  pollIntervalSec     Int            @default(20)
  // cursor + health, per feed
  lastPolledAt        DateTime?
  lastItemAt          DateTime?
  lastError           String?
  consecutiveFailures Int            @default(0)
  items               NewsItem[]

  @@index([enabled])
}

enum NewsCatalyst {
  OFFERING        // 424B5, registered direct, ATM, "pricing of public offering"
  SHELF           // S-3, S-1 — dilution incoming, not yet priced
  REVERSE_SPLIT
  HALT
  RESUMPTION
  FDA             // Phase 1/2/3, IND, NDA, 510(k), Fast Track, orphan drug
  MERGER
  CONTRACT        // contract award, LOI, partnership
  EARNINGS
  INSIDER         // 13D/G, Form 4 clusters
  UPLISTING
  OTHER
}

model NewsItem {
  id          String       @id @default(cuid())
  feedKey     String       // -> NewsFeed.key
  feed        NewsFeed     @relation(fields: [feedKey], references: [key])
  externalId  String       // wire guid, EDGAR accession no., halt symbol+time
  dedupeKey   String       // normalized-headline hash, cross-source
  headline    String
  summary     String?      // short snippet only — never the full body
  url         String
  publishedAt DateTime
  ingestedAt  DateTime     @default(now())
  catalyst    NewsCatalyst @default(OTHER)
  score       Int          @default(0)   // 0-100 priority, see §4
  formType    String?      // 8-K, 424B5, 6-K
  haltReason  String?      // T1, T12, LUDP, H11
  raw         String?      // JSON of the source payload, for debugging
  tickers     NewsTicker[]

  @@unique([feedKey, externalId])
  @@index([publishedAt])
  @@index([dedupeKey])
  @@index([catalyst])
}

model NewsTicker {
  id         String   @id @default(cuid())
  ticker     String
  newsItemId String
  newsItem   NewsItem @relation(fields: [newsItemId], references: [id], onDelete: Cascade)

  @@unique([newsItemId, ticker])
  @@index([ticker])
}

// Per-user alert rules. Client-side matching (§6), so this is just storage.
model NewsWatch {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  label     String   @default("My alerts")
  tickers   String?  // JSON array of symbols; null = any
  catalysts String?  // JSON array of NewsCatalyst; null = any
  minScore  Int      @default(0)
  sound     Boolean  @default(true)
  enabled   Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
}

// Poll cursors live on NewsFeed above. Unlike liveSessions they must be
// durable, or every deploy replays or skips a window of news.

// Guards ticker extraction against false positives (§4).
model SymbolUniverse {
  ticker    String   @id
  name      String
  exchange  String   // NASDAQ, NYSE, AMEX, OTC
  cik       String?
  updatedAt DateTime @updatedAt

  @@index([cik])
}
```

Add to `User`: `newsWatches NewsWatch[]`.

---

## 3. Adapter contract

One interface, one poll loop, N sources. Adding a wire later is a config line,
not new plumbing.

```ts
export type RawItem = {
  externalId: string;
  feedKey: string;
  headline: string;
  url: string;
  publishedAt: Date;
  summary?: string;
  tickers?: string[];                  // when the source states them outright
  meta?: Record<string, string>;       // formType, haltReason, cik, market
};

export interface NewsAdapter {
  kind: NewsSourceKind;
  /** NY-session aware: fast during 04:00-20:00 ET, slow overnight. */
  pollIntervalMs(now: Date): number;
  fetch(feed: NewsFeed): Promise<RawItem[]>;
}
```

### 3a. SEC EDGAR

- Latest filings atom, one request per form type:
  `https://www.sec.gov/cgi-bin/browse-edgar?action=getcurrent&type=8-K&company=&dateb=&owner=include&count=100&output=atom`
  Repeat for `424B5`, `S-1`, `S-3`, `SC 13D`, `SC 13G`, `6-K`.
- **Mandatory:** a `User-Agent` header in the form
  `tradingchat <hbilgic1992@gmail.com>`. The SEC rejects requests without one.
- **Rate limit: 10 requests/second**, counted per IP across all machines.
  Exceed it and the IP gets throttled. Our budget is ~7 requests per cycle —
  nowhere near the ceiling, but the fetch helper should still serialize with a
  small delay rather than firing all form types at once.
- CIK → ticker via `https://www.sec.gov/files/company_tickers.json`, refreshed
  daily into `SymbolUniverse`. This is also the seed for the whole universe
  table.
- `externalId` = accession number (globally unique, stable).

### 3b. Nasdaq/NYSE halts

- `https://www.nasdaqtrader.com/rss.aspx?feed=tradehalts` — verified working
  2026-08-22, RSS 2.0.
- Fields per item: `IssueSymbol`, `IssueName`, `HaltDate`, `HaltTime`,
  `Market` (NASDAQ/AMEX), `ReasonCode` (T1, T12, H11, LUDP…),
  `ResumptionDate`, `ResumptionTime`, `PauseThresholdPrice`. Resumption fields
  are frequently empty on first publication and get filled on a later poll — so
  **halts are upserted, not insert-only**: the same `externalId`
  (`SYMBOL:HaltDate:HaltTime`) flips `HALT` → `RESUMPTION` when resumption data
  appears, and re-emits over the socket.
- Reason codes worth flagging loudly: `T1` (news pending), `LUDP` (volatility
  pause — the momentum one), `T12` (delisting/regulatory).

### 3c. PR wires — the registry

One generic RSS adapter, one `NewsFeed` row per wire. Mechanics first:

- `externalId` = feed `<guid>`, falling back to a hash of link + pubDate.
- Store `headline`, `url`, `publishedAt`, and at most a ~300 char `summary`.
  **Never persist the full body.**
- Wires republish and revise; the cross-source dedupe in §4 handles it.

#### Tiering — cheap wires are signal *and* poison

The wires are not interchangeable, and the instinct to only ingest the
reputable ones is wrong for this audience.

A $50 paid-placement release on a 3M-float ticker at 07:15 ET is precisely the
setup this app's users trade. Filtering promotional wires out would remove the
most tradeable events on the board. But those same wires are where fabricated
and paid-promotion "news" lands, and a feed that presents a KissPR blast with
the same weight as an 8-K teaches people to get run over.

**So: ingest everything, tier it, and let the tier drive the score and a visible
badge.** `PROMOTIONAL` items appear in the feed with a distinct badge and do
*not* clear the default alert threshold on their own — they need a
corroborating signal (a halt, a filing, a Theme ticker) to escalate.

#### The registry

Verified by probing each endpoint on **2026-08-22**. Status is what the feed
actually returned, not what its docs claim.

| Wire | Tier | Status | Notes |
|---|---|---|---|
| **GlobeNewswire** | MAJOR | ⚠ blocked from dev machine | 4 paths all connection-reset here — network-level block, not a dead feed. **Re-probe from the Coolify host before M2.** Highest-priority wire for small caps. |
| **PR Newswire** | MAJOR | ✅ 200, 20 items | `prnewswire.com/rss/news-releases-list.rss` — works today |
| **Business Wire** | MAJOR | ✅ 200, 4 items | `feed.businesswire.com/rss/home/?rss=<token>` — the token selects a category, so **one row per category**, not one row total |
| **ACCESS Newswire** (ex-ACCESSWIRE) | MAJOR | ✖ path unknown | Guessed paths 404'd. Heavily used by US small caps — worth discovering properly (below) |
| **Newsfile** | MAJOR | ✖ path unknown | Canadian small caps and mining. Same |
| **Newswire.com** | STANDARD | ✅ 200, 50 items | `newswire.com/newsroom/rss` — highest item count of anything probed |
| **News Direct** | STANDARD | ✅ 200, 10 items | `newsdirect.com/feed` |
| **WebWire** | STANDARD | ✖ path unknown | Guessed paths 404'd |
| **ACN Newswire** | STANDARD | ✖ path unknown | Asia-Pacific. Relevant for the China small-cap runners, which is a real recurring theme |
| **ABNewswire** | PROMOTIONAL | not probed | Cheap distribution. Ingest, badge it |
| **KissPR** | PROMOTIONAL | not probed | Cheap distribution. Ingest, badge it |
| **eReleases** | SYNDICATOR | skip | It is a **reseller that distributes onto PR Newswire** — its releases arrive via PR Newswire anyway. Ingesting it produces near-pure duplicates |
| **Comtex** | SYNDICATOR | skip | Aggregator/syndicator, not an originator. Same duplicate problem, and it lags the origin wire |
| **Thomson Reuters PR** | — | verify first | Thomson Reuters' PR-distribution product was wound down/absorbed years ago; do not assume a live endpoint exists. Confirm what it is today before spending time on it |

#### Feed discovery, instead of guessing URLs

Four of these 404'd on guessed paths, which is a plumbing problem, not a data
problem. Ship `scripts/news-discover-feed.mjs <homepage-url>`: fetch the page
with a browser User-Agent, parse
`<link rel="alternate" type="application/rss+xml">`, print every candidate with
its item count. Point it at the four unknowns, paste the winners into the
`NewsFeed` seed. This also becomes the tool for adding wire number 15 next year
without touching code.

Two mechanics learned while probing that the adapter must handle:

- **Send a browser `User-Agent`.** Several wires 403 or reset on a bare
  `node-fetch`/default UA. The SEC is the opposite case — it wants an
  identifying UA with a contact address (§3a). So UA is per-feed config, not a
  global constant.
- **Follow redirects** (`newsdirect.com/rss` → 301). Do not treat a 3xx as a
  failure.

#### Seeding

Ship the registry as `prisma/seed-news-feeds.ts` (idempotent upsert by `key`),
run from `db:seed`. Feeds start `enabled: false` except the verified ones, so a
half-known URL can be filled in and flipped on without a deploy.

---

## 4. The pipeline — this is the actual product

`fetch → normalize → dedupe → extract tickers → classify → score → persist → fan out`

### Dedupe

Two layers:
1. `@@unique([feedKey, externalId])` kills same-source repeats at the DB level.
2. **Cross-source**: the same PR arrives on GlobeNewswire and Finnhub minutes
   apart. Build `dedupeKey` = sha1 of the headline lowercased, punctuation and
   corporate suffixes (`inc`, `corp`, `ltd`, `plc`, `holdings`) stripped, first
   12 words kept. Within a rolling 6h window, first-seen wins; later arrivals
   only bump an `alsoSeenOn` list. Do **not** dedupe across a longer window —
   companies legitimately re-announce.

### Ticker extraction

Biggest source of false positives; guard it properly.

- **Halts:** symbol is given. Trivial.
- **EDGAR:** CIK → `SymbolUniverse`. Reliable.
- **Wires:** regex the headline + summary for `(NASDAQ: ABCD)`,
  `(NYSE American: XYZ)`, `(OTCQB: ABCD)`, `(Nasdaq Capital Market: ABCD)`.
  Then **validate every candidate against `SymbolUniverse`** before persisting.
  Without that check, bare-word matching turns `CEO`, `AI`, `FDA` and `NEWS`
  into tickers — which is precisely what makes cheap news bots unusable.
- No ticker found ≠ discard. Store the item ticker-less; it still shows in the
  unfiltered feed.

### Classify

Deterministic rules, no LLM in v1 — it must be testable and instant.

- **Form-type mapping first** (EDGAR is unambiguous): `424B5` → `OFFERING`,
  `S-3` → `SHELF`, `SC 13D` → `INSIDER`, `6-K`/`8-K` → fall through to
  keywords.
- **Keyword rules** for wires, highest-priority match wins:
  - `OFFERING`: "pricing of", "public offering", "registered direct",
    "at-the-market", "private placement", "warrant inducement"
  - `REVERSE_SPLIT`: "reverse stock split", "share consolidation"
  - `FDA`: "phase 1/2/3", "topline", "FDA clearance", "510(k)", "orphan drug",
    "fast track", "IND", "NDA submission"
  - `MERGER`: "definitive agreement", "to be acquired", "merger"
  - `CONTRACT`: "awarded", "letter of intent", "strategic partnership"
  - `UPLISTING`: "uplisting", "approved for listing on"
- Everything unmatched → `OTHER`. Fine. The feed shows it; the alerts do not.

### Score (0-100)

What separates a usable feed from a firehose. Roughly:

- Base by catalyst: `OFFERING`/`REVERSE_SPLIT` 70 (dilution is the small-cap
  trade), `FDA` 65, `HALT` 60, `MERGER` 55, `CONTRACT` 40, `EARNINGS` 30,
  `OTHER` 10.
- `+15` if the ticker is on a `ThemeTicker` row or an open `ScannerEntry` —
  **the app already knows what the community is watching**; use it.
- `+10` if exchange is NASDAQ/AMEX (small-cap venues) vs NYSE.
- `−20` for known fluff patterns: "announces participation in", "to present at",
  "investor conference", "appoints board member".
- **Wire tier**: `MAJOR` +10, `STANDARD` 0, `PROMOTIONAL` **−25 and capped at
  59** — below the default alert threshold. A promotional release therefore
  shows in the feed, badged, but cannot page anyone by itself.
- **Corroboration lifts the cap.** If a `PROMOTIONAL` item's ticker also has a
  halt or an EDGAR filing within ±30 min, drop the cap and add `+25`. A pump
  wire alone is noise; a pump wire *plus* a T1 halt is the trade. This is the
  single highest-value rule in the whole classifier and it falls straight out
  of ingesting the cheap wires rather than filtering them.

Score is a stored int so the feed can sort and filter on it, and watch rules can
say "only ≥60".

### Small-cap relevance — the honest caveat

Float is the one field that is **not** reliably free. Options, in order:

1. **Reuse what is already typed in.** `ThemeTicker.float` already exists and
   staff fill it in manually. Join on it where present — zero new cost.
2. **Shares outstanding from SEC XBRL** as a proxy:
   `data.sec.gov/api/xbrl/companyconcept/CIK##########/dei/EntityCommonStockSharesOutstanding.json`
   — free, public domain, but it is shares outstanding, *not* float, and it
   lags to the last filing.
3. Paid float data later, if it ever justifies itself.

Do not block v1 on this. Exchange + catalyst + score already filters most
large-cap noise, since large caps rarely file 424B5s at 3am.

---

## 5. Ingestion runtime

In `server/server.ts`, mirroring the LiveKit sweep block:

```ts
if (process.env.NEWS_INGEST_ENABLED === "true") {
  startNewsIngestion(io);
}
```

- **Env flag, default off.** Local dev must not poll continuously, and only one
  process should ever poll.
- Per-source timers, each from `pollIntervalMs(now)`: ~10s for EDGAR and halts
  during 04:00–20:00 ET, ~20s for wires, 5min overnight and on weekends. Use
  `TRADING_TIME_ZONE` from `app/utils/trading-time.ts` — do not hand-roll the
  ET conversion, it already handles DST.
- **Never let a source failure kill the loop.** Wrap each fetch in try/catch,
  write `lastError` and `consecutiveFailures` to the `NewsFeed` row, and back
  off exponentially (cap ~5min). One dead wire must not stop EDGAR.
- Cursor is `lastItemAt` per source; on boot, resume from it, but clamp the
  lookback to ~2h so a week-long outage does not replay a week of news into the
  feed as "new".

### SQLite write pressure

News writes are far more frequent than anything the app does today. Before M3:
- Confirm WAL is on. `app/utils/db.server.ts` sets no pragmas, so it is likely
  on the default journal mode — with the socket server reading while the poller
  writes, WAL is worth enabling explicitly.
- Batch each poll cycle's inserts into one transaction rather than N round
  trips.
- Retention: keep 90 days, purge nightly. `prisma/purge-old-messages.ts` is the
  template to copy — including its dry-run-by-default posture and the `VACUUM`,
  since SQLite does not shrink on DELETE.

---

## 6. Delivery and UI

### Fan-out

- On socket connect the server already knows `userId`. Resolve news access once
  and, if allowed, `socket.join("news")`.
- Poller emits `io.to("news").emit("news.item", payload)` per new item. Halt
  upserts re-emit the same id — the client replaces by id, so key the row on
  `NewsItem.id`.
- No per-user filtering server-side. Subscribers get everything; the client
  filters. Keeps the server dumb and lets filter changes apply instantly.

### `/news` page

- Loader: `requireNewsAccess(request)` (new `app/utils/news.server.ts`, modeled
  directly on `chartlog.server.ts` — staff bypass plus active subscription),
  then the most recent ~100 items with their tickers, cursor-paginated the way
  `chat-room.tsx` paginates messages.
- Virtualized list via `@tanstack/react-virtual` — already a dependency, and
  already the pattern in chat.
- Row: ET timestamp (via `trading-time.ts`), ticker chips, catalyst badge,
  source badge, headline as an external link. Colour the catalyst badge with the
  same helper shape as `scanner-status-badge.tsx` so it reads as one app.
- Filter bar: ticker search, catalyst multi-select, source toggles, min-score
  slider, "watchlist only" switch. Push filters into the URL via
  `useSearchParams`, matching how journal and chat already do it.
- Sidebar entry in `app-sidebar.tsx` — `Newspaper` from lucide-react, `/news`,
  same `SidebarMenuItem` block as Scanner/Themes.

### Alerts

- Client receives every `news.item`, matches against the user's `NewsWatch`
  rows (loaded once in the loader), and on a hit fires a `sonner` toast plus a
  short `new Audio()` ping. Both deps are already in the app.
- Browsers require a user interaction before audio plays — gate the sound
  behind a one-time "enable sound" click and remember it in localStorage.
- Watch-rule CRUD lives in `app/routes/resources/news.tsx` using Conform + Zod,
  exactly like `resources/scanner.tsx`.

### The integration that makes this ours, not a Discord bot

A news row gets **"Send to Scanner"** and **"Add to Theme"** buttons. One click
turns a 424B5 hit into a `ScannerEntry` with the ticker, date and headline
prefilled. Nuntiobot can post a headline into Discord; it cannot put that
headline into your watchlist, your themes and your journal. That is the whole
reason to build this in-app instead of subscribing to a bot.

---

## 7. Milestones

## 7a. Implementation status

**M1 shipped 2026-08-25.** Schema + migration, adapter contract, EDGAR and halt
adapters, `SymbolUniverse` seed, dedupe, cursor state and the dry-run script are
all in and verified against the live feeds. No UI, as planned.

```
app/utils/news/{types,xml,schedule,dedupe,tickers,classify,ingest.server}.ts
app/utils/news/adapters/{sec-edgar,nasdaq-halts}.ts
prisma/seed-news-feeds.ts          npm run db:seed:news
prisma/seed-symbol-universe.ts     npm run db:seed:symbols
scripts/news-poll-once.ts          npm run news:poll-once
```

`server/server.ts` starts the poller behind `NEWS_INGEST_ENABLED=true`
(default off). Verified end to end: 15 halts and 206 filings parsed, written,
re-polled idempotently, and revised in place.

### What running M1 changed

The milestone existed to test assumptions cheaply. Six were wrong.

1. **Headline-hash dedupe is wrong for filings and halts.** EDGAR headlines are
   synthesized as `FORM — COMPANY`, so GSK filing two different 6-Ks in one day
   produced two identical headlines and the second was discarded — including a
   **424B5 that was silently lost**. The same flaw would drop a repeat LUDP halt
   on a runner, the single event this feed exists to catch. Sources with an
   authoritative id (accession number, `SYMBOL:date:time`) now set
   `RawItem.dedupeKey` via `identityDedupeKey()`; the §4 headline hash applies
   to **wire prose only**. This is a constraint on M2, not a detail: the wire
   adapter must keep using the headline hash, and must be the only thing that
   does.

2. **EDGAR emits one entry per co-filer, sharing one accession number.** A
   Charter 8-K arrives three times (Charter + two CCO Holdings subsidiaries).
   Keeping the first entry kept a ticker-less subsidiary and threw away the one
   carrying `CHTR`. `mergeCoFilers()` now unions the tickers and lets the entry
   that identifies a tradeable company win — `(Subject)` outranking `(Filer)`,
   which is what makes 13D handling correct when those start appearing.

3. **`company_tickers_exchange.json` beats `company_tickers.json`** — it carries
   the exchange column §4's scoring needs. But it does **not** distinguish NYSE
   American from NYSE: as of 2026-08-25 it emits only Nasdaq / NYSE / OTC /
   CBOE / null. **So the §4 rule "+10 if exchange is NASDAQ/AMEX" cannot be
   implemented from this table.** The halt feed's own `Market` field is the
   only free AMEX signal we have. Decide in M2 whether to score NASDAQ alone or
   find another source. 198 symbols have no exchange and are stored `UNKNOWN`
   rather than guessed as OTC.

4. **The halt feed publishes ET wall clock with no timezone**, and its
   `<pubDate>` is only the halt *date* at midnight — useless. The real instant
   is composed from `HaltDate` + `HaltTime` through the new
   `fromTradingWallClock()` in `trading-time.ts` (the inverse of the existing
   display helper). Reading those fields as UTC would misplace every halt by
   four or five hours. Field names also differ from §3b: there is no
   `ResumptionTime` — it is `ResumptionQuoteTime` and `ResumptionTradeTime`,
   and the trade time is the one that matters.

5. **The halt feed is a standing list, not a stream.** It carried halts back to
   February — long-dead T12 delistings that never resumed. So it bypasses the
   cursor entirely (an old halt can still gain resumption data today) and every
   item is compared against what we stored. On first ingest all 15 look "new",
   which is correct; they sort to the bottom by `publishedAt`.

6. **The 2h cold-start clamp hides everything outside market hours**, which
   makes a broken parser look exactly like a quiet market. `--lookback=<minutes>`
   exists so the M1 read-the-output exercise is possible at 04:00 ET.

Smaller deviations from the plan as written: `alsoSeenOn` was in §4's dedupe
prose but missing from §2's model, so it is now a column; `NewsFeed` gained a
`userAgent` column because §3c's per-feed UA rule needs somewhere to live; and
the script is `.ts` run through `tsx` rather than `.mjs`, so it imports the real
adapters instead of reimplementing them — testing a copy would defeat the point.

### 7b. M2 — wires, extraction, classifier, scoring (2026-08-25)

Built immediately after M1 rather than after a day of reading, because M1 by
itself carried **no PR at all** — every wire row was disabled pending this
adapter, so there was nothing to read. Wire ingestion is what generates the
signal the M1 exercise is supposed to judge.

`adapters/wires.ts` (one generic RSS adapter, N registry rows),
`extractTickers()` in `tickers.ts`, `classifyHeadline()` in `classify.ts`, and
`score.ts`. Verified live in pre-market at 05:07 ET: 48 items in, **5 cleared
the alert threshold — all five dilution filings on small caps**, while the
supplement spam and law-firm solicitations landed at 0-10.

**Pre-market was never the gap.** The scheduler has always polled fast from
04:00 ET; §5's extended-session window was built for exactly this. What was
missing was the wire adapter. One cadence change did come out of it: wires now
idle at **60s** overnight rather than the shared 5min (`WIRE_IDLE_POLL_MS`).
The 5min idle exists to protect the SEC's per-IP rate limit where one cycle
costs seven requests; a wire cycle costs one request to a CDN, and wires
genuinely publish overnight — Asia-Pacific names and European filers do not
wait for New York.

#### Wire signal density, measured

Ticker-resolution rate is what decides whether a wire earns a poll, and it
varies far more than tier suggests:

| Wire | Items | With a resolvable ticker | Verdict |
|---|---|---|---|
| News Direct | 10 | **7** | Best density probed. Enabled |
| PR Newswire — *financial services* | 20 | 6 | Enabled |
| PR Newswire — *generic news-releases-list* | 20 | **0** | **Rejected.** Private-company corporate PR |
| Newswire.com | 50 | 4 | Enabled, but see below |

Two findings worth acting on:

1. **The generic PR Newswire feed the plan named in §3c is the wrong one** — 20
   items, zero resolvable tickers. The registry now points at the financial
   services category instead. The earnings/M&A/biotech categories were also
   probed and are worse (1/20 each), and all categories carry non-English
   releases.
2. **Newswire.com is mostly consumer-affiliate spam** — "NerveReset Drops
   Review 2026", "Medicinal Red Tea Detox". 13 of 13 fresh items had no ticker.
   It is left enabled because scoring floors it at 0, but if it stays this noisy
   it should be disabled rather than filtered. Worth a week of watching.

Two noise classes drove the fluff rules in `score.ts`, both discovered by
running it rather than by reasoning:

- **Law-firm securities-litigation solicitations** ("SPRY Investors Have
  Opportunity to Lead ... Securities Fraud Lawsuit"). High volume, and they
  carry a *valid* ticker so extraction cannot stop them — only scoring can.
  Three of the top twelve PR Newswire items.
- **Consumer-affiliate content-farm spam**, penalised separately and harder.

#### Known tradeoff in extraction

Ticker extraction only matches inside a parenthesised group naming an exchange
— `(NASDAQ: ABCD)`. A bare `(BMNR)`, which some wires use, is deliberately NOT
matched, so that release scored 5 with no ticker. Accepting that false negative
is the right call: `AI`, `NEWS` and `PC` are all real listed symbols, so bare
parenthesised matching would turn ordinary words into tickers — the exact
failure mode §4 warns about. If it matters later, the fix is bare-paren
matching plus a common-word stoplist, not loosening the guard.

#### Still open

- Scoring's "+10 NASDAQ/AMEX" is NASDAQ-only, per finding 3 in §7a.
- The 30-minute corroboration rule is implemented and wired, but has not yet
  fired on live data — no promotional wire is enabled to trigger it, since all
  four promotional/unknown wires still lack URLs (M1.5).
- The full-trading-day read still has not happened. It is now worth much more,
  because there is finally PR flowing through it.

### 7c. M1.5 — feed discovery (2026-08-25)

`scripts/news-discover-feed.ts` ships. It fetches a homepage with a browser UA,
reads the `<link rel="alternate">` tags the site advertises, falls back to
conventional paths only when a site advertises nothing, and parses every
candidate **with the same `parseWireRss` the ingester uses** — so a feed that
looks fine in discovery cannot turn out to be unparseable in production. It
ranks candidates by resolvable-ticker density rather than item count, which is
the lesson from PR Newswire's generic feed.

Registry went from 5 enabled feeds to 9.

| Wire | Outcome |
|---|---|
| **WebWire** | **Found** — `http://rssfeeds.webwire.com/webwire-recentheadlines`. Plain **http**; the https host does not answer |
| **ACN Newswire** | **Found** — `acnnewswire.com/rss/lang/english.xml`. `/rss/` is an HTML *index of feeds*, which is why guessing it returned 200 with zero items |
| **ABNewswire** | **Found** — `/pressreleases/feed/`, a path none of the conventional guesses covered |
| **KissPR** | **Found** — now redirects to `brandstorypresswire.com/feed/` |
| **GlobeNewswire** | **Still blocked.** Its homepage now loads from the dev machine, but every `/RssFeed/` path still connection-resets. Genuinely needs the Coolify-host probe |
| **ACCESS Newswire** | **Blocked** by a Cloudflare challenge (403 "Just a moment"). Retry from the Coolify host or grab the feed from a real browser |
| **Newsfile** | **Not found.** Advertises no feed; every conventional path 404s |

#### Measured density across all nine feeds

One cycle, 24h lookback, 05:15 ET:

| Feed | Fetched | New | With ticker | Density | Alerting |
|---|---|---|---|---|---|
| sec-edgar | 258 | 206 | 189 | **92%** | 18 |
| newsdirect | 10 | 8 | 4 | 50% | 0 |
| prnewswire (financial) | 20 | 18 | 8 | 44% | 0 |
| newswire-com | 50 | 50 | 2 | 4% | 1 |
| webwire | 369 | 73 | 3 | 4% | 0 |
| acnnewswire | 10 | 10 | 0 | 0% | 0 |
| abnewswire | 50 | 50 | 0 | 0% | 0 |
| kisspr | 10 | 0 | — | — | 0 |

**EDGAR is the product.** It is 92% resolvable and produced 18 of the 19
alerting items. Every wire combined produced one. That is worth holding onto
when deciding how much more wire plumbing to build.

#### The promotional-wire premise needs re-testing

§3c's rationale for ingesting cheap wires is that "a $50 paid-placement release
on a 3M-float ticker at 07:15 ET is precisely the setup this app's users
trade." On this sample that is not what ABNewswire carries — its feed was local
business SEO spam (plumbing, CNC machining, kitchen remodelling), 0 of 50 items
with any ticker at all.

That matters more than it looks: **with no resolvable ticker, the ±30 min
corroboration rule can never fire** for these feeds, so they deliver none of
the benefit that justified ingesting them, while adding ~60 rows a cycle.

They are deliberately left ENABLED anyway, because this sample is not decisive:
it was taken at 05:15 ET, and promotional stock releases cluster at 07:00-09:00.
Re-measure across a real pre-market before disabling anything. If ABNewswire,
ACN and KissPR are still at 0% by then, disable them — the plan's premise will
have been tested and found not to hold for these particular feeds.

#### Also worth watching

- **WebWire fetches 369 items per poll** at a 30s interval. It is the heaviest
  feed by far for 4% density; consider a longer interval or dropping it.
- Volume overall: a cold start now writes ~415 items in one cycle. Confirm the
  §5 retention purge and the WAL pragma before M3, not after.

### 7d. M3 — feed UI + live push (2026-08-25)

`/news` ships: access gating, cursor-paginated loader, socket fan-out,
virtualized feed, filter bar, sidebar entry. Verified in a real browser against
430 live rows.

```
app/utils/news.server.ts             requireNewsAccess, getNewsPage, toFeedItem
app/utils/news/constants.ts          client-safe constants
app/components/news/news-page.tsx    feed, filter bar, live push
app/components/news/news-badges.tsx  catalyst / ticker / source / score
app/routes/app/news/news-index.tsx   loader is also the pagination endpoint
```

Access follows the approved scope — active subscribers + staff — NOT ChartLog's
yearly-only rule. Entitlement is resolved ONCE on socket connect
(`socket.join("news")`) rather than filtered per item on every emit: the server
sends everything to the room and the client applies the user's own filters, so a
filter change applies instantly and the server stays dumb.

Prerequisites done first, both write-pressure (§5):

- **WAL was OFF.** The database was in the default `delete` journal mode, where
  a writer blocks every reader. Survivable when writes were only chat messages;
  not with a background poller writing ~400 rows a cycle. `db.server.ts` now
  sets `journal_mode=WAL` and `busy_timeout=5000` on connect — the second
  matters as much as the first, because two writers (chat and the poller)
  otherwise get an immediate SQLITE_BUSY rather than waiting.
- **`prisma/purge-old-news.ts`** — 90-day retention, dry-run by default,
  chunked deletes, VACUUM. Purges on `publishedAt`, not `ingestedAt`.
- **Wire enrichment moved behind the cursor filter.** WebWire republishes its
  whole 369-item window every poll and the cursor keeps two or three; enriching
  inside `fetch` ran extraction and classification ~370 times every 30s to throw
  nearly all of it away. The adapter contract gained an optional `enrich()` that
  the ingest loop calls on survivors only.

#### Four bugs the browser found that nothing else would have

1. **The page crashed on hydration.** The route imported
   `DEFAULT_ALERT_THRESHOLD` from `score.ts`, which imports `NewsCatalyst` and
   `WireTier` from `@prisma/client` as runtime VALUES to key its lookup table.
   That pulled Prisma into the client bundle, where it is undefined:
   *"Cannot read properties of undefined (reading 'OFFERING')"*. Anything the
   client needs from the scoring layer now lives in `constants.ts`.
   **`score.ts` must never be imported by a component.**

2. **The app's dark theme defines `--background` and `--foreground` as BOTH
   near-white** (`app.css:159` — `--background` is a light cream under `.dark`).
   So `bg-background text-foreground` renders white on white. This is
   pre-existing and not fixed here: changing a global token affects every page.
   Scanner and Themes already sidestep it with `bg-card`/`text-card-foreground`
   (19 and 16 uses), and the news page now matches. **Do not reach for
   `bg-background` in this codebase.**

3. **`text-primary` is invisible on dark surfaces** — `--primary` is a dark navy
   (`oklch(0.28 …)`). The ticker chips, the most scannable element on a row,
   were unreadable. They use an explicit sky pair with a `dark:` variant now,
   like the catalyst badges.

4. **Halts self-corroborated.** A stored halt being re-scored matched *itself*
   in the ±30 min corroboration lookup, taking every halt to 95 (+25 and a
   lifted cap). Corroboration now applies to WIRE items ONLY — halts and filings
   *are* the corroborating evidence, so asking whether one is corroborated is
   the wrong question. A T1 halt scores 70, not 95.

#### Two scoring-lifecycle gaps, now closed

Scores are stored so the feed can sort and filter in SQL, and that means they go
stale. Two fixes:

- `hasRevision` now includes `score`, so a re-polled halt repairs its own score
  and a halt that later gains corroboration actually rises.
- **`prisma/rescore-news.ts`** recomputes scores for rows already stored — the
  poller's cursor never revisits filings or wires, so a rules change would
  otherwise freeze every existing row at whatever it scored on arrival.
  **Run it after ANY change to `score.ts`.**

It also surfaced that **corroboration is order-dependent**: a wire item ingested
before its corroborating filing does not get the boost until a re-score. Within
one cycle feeds are processed alphabetically, so `prnewswire` is scored before
`sec-edgar` exists in the table. Closed in §7f by a rolling re-score of the last
hour.

#### Default filter

`/news` hides items with **no resolvable ticker** by default, with a toggle —
NOT "hide OTHER", which was the first instinct and is wrong: EDGAR headlines are
synthesized as "8-K — COMPANY" and carry no keywords, so every 8-K classifies as
OTHER. Hiding OTHER would hide the filings. Ticker presence separates spam from
signal without touching them.

### 7e. M4 — watch rules + alerts (2026-08-25)

Watch-rule CRUD, client-side matching, toast and sound. `NewsWatch` was already
in the M1 migration, so this milestone is code only — no schema change.

```
app/utils/news/watch.ts              matcher + parse helpers, client-safe
app/utils/news/alert-sound.ts        WebAudio ping + the localStorage opt-in
app/routes/resources/news-watch.tsx  create / update / toggle / delete
app/components/news/use-news-alerts.ts   the socket listener that alerts
app/components/news/news-alerts-dialog.tsx   list + form, one dialog
```

Verified in a real browser against the live poller: a rule created in the
dialog fired a toast for a Newswire.com item **while sitting in a chat room**,
carrying `label · catalyst · source · score` and an Open action.

#### The one deliberate departure from §6

§6 put matching on the /news page, with rules loaded in that route's loader.
That is the wrong place. An alert you only receive while looking at the feed is
not an alert — the member is in a chat room when the 8-K drops. `useNewsAlerts`
is mounted in the **app layout** instead, next to the DM-toast and live-session
listeners that already live there, and `newsWatches` ships from the layout
loader. Cost is one indexed query per authed page load returning at most 20
rows; the benefit is that alerts work everywhere.

A rule edit needs no special plumbing: the fetcher posts to
`/resources/news-watch`, React Router revalidates the layout loader, and the
hook picks up the new rules through a ref — without re-registering the socket
listener, which would drop events.

#### Three things the design has to get right

- **Unconstrained rules are refused.** No tickers, no catalysts and `minScore`
  0 matches every item on every wire — hundreds an hour, each its own toast.
  `isUnconstrained` is shared by the form and the action so both agree.
- **Burst control.** Past 10 toasts in a rolling minute the rest collapse into
  one self-updating "N more news alerts". The sound is separately throttled to
  one ping per 1.5s. 09:30 is the case that matters, and it is not the case you
  are looking at while building.
- **Alert once per item id.** A halt that gains its resumption time is
  re-emitted under the SAME id so the feed can replace the row. Without an
  alerted-id set that is a second ping for one event.

#### Ownership, and why it is `updateMany`

Watch rules are personal, so `resources/news-watch.tsx` is gated by
`requireNewsAccess` — NOT by the staff check `resources/scanner.tsx` uses.
That makes the id in the form the only thing standing between a member and
someone else's rules, so every write goes through `updateMany` / `deleteMany`
with `{ id, userId }` rather than `update({ where: { id } })`. A guessed cuid
then matches zero rows instead of another member's rule.

#### Sound is synthesised, not shipped

Two WebAudio sine blips rather than an mp3: the app has no audio assets and no
pipeline for them. Browsers refuse to start an AudioContext outside a user
gesture, so the toggle that turns sound on IS the unlock, and it plays a
confirming ping — a silent switch cannot prove it worked, and the member finds
out at 09:31 otherwise. The preference persists in localStorage; the unlock
cannot, so `playAlertPing` re-resumes a context a reload left suspended.

#### A fifth browser-only bug, in M3's code

The /news filter inputs used `bg-background` — the exact token §7d warns
against. In the dark theme that renders a cream field under near-white
inherited text, so a typed ticker was invisible: the URL said `?ticker=CANG`
and the box looked empty. Both inputs are `bg-transparent` now, with the
existing border doing the delineating. Two lines, and only a browser finds it.

#### Still open

- `NEWS_CATALYSTS` in `constants.ts` duplicates the Prisma enum, because the
  generated enum is a runtime value and cannot reach the browser. A new
  catalyst has to be added in both places; nothing enforces that.
- Alerts are per-tab and in-memory. Two open tabs both toast, and a closed tab
  misses everything — there is no unread-alert history.
- Alerts fire on a *stored* score, so anything that changes a score after
  ingest has to re-emit the row for the client to reconsider it. §7f does that
  for corroboration; a member adding a ticker to a Theme or the Scanner mid-day
  is the other input to `onWatchlist`, and nothing re-scores on that — those
  rows only catch up on the next sweep a filing happens to trigger.

### 7f. Rolling re-score of the recent window (2026-08-25)

The order-dependency §7d found was, until M4, a stale number in a list. Watch
rules changed what it costs: rules fire on `score`, so a wire item can alert at
a score it will not keep — or, worse because it is silent, fail to alert at the
score it would have earned once its filing landed.

Reproduced end to end on the dev database: a PROMOTIONAL wire carrying a
`$8.0 Million Registered Direct Offering` headline scores `70 - 25 = 45`, capped
at 59 by its tier. Its 424B5 arrives a minute later on EDGAR's own timer, which
would have taken the wire to 70 with the cap lifted. A `minScore: 60` rule
therefore never fires on the one item in the feed that most deserved it.

**`rescoreRecent()`** in `ingest.server.ts` re-runs `buildScoreContext` over
everything published in the last hour and writes back what moved. One hour
because `CORROBORATION_MS` is ±30 min: older than that, only a rules change can
move a score, and that is what `prisma/rescore-news.ts` is for.

Three decisions worth keeping:

- **Insert-driven, not on its own timer.** A sweep with no new evidence behind
  it can only find what the last one already fixed. It runs after a cycle that
  inserted, and only for `EXCHANGE_HALT` / `SEC_EDGAR` — corroboration looks at
  nothing else, so a wire cycle can move no other row's score. Throttled to one
  sweep a minute, because at the open EDGAR inserts on nearly every cycle.
- **Changed rows are re-emitted.** Matching is client-side, so a row only gets
  another chance against a rule if the client sees it again. The alert hook
  already keys off item id, so a row that pinged does not ping twice, and the
  feed page replaces the row rather than duplicating it — this needed no client
  change at all.
- **Not awaited by the feed timer**, and guarded by an in-flight flag, so a slow
  sweep delays no poll and two feeds finishing together sweep once.

Second sweep over the same window changes nothing, as it must.

### 7g. M5 — send-to-Scanner / add-to-Theme (2026-08-25)

Shipped. A news row gets **Send to Scanner** and **Add to Theme**, and the two
of them close the loop the scorer was already half of.

`score.ts` awards +15 when a ticker sits on a Theme or an open `ScannerEntry` —
the one signal a generic news bot structurally cannot have. Until M5 that bonus
only fired for tickers somebody had added by hand, elsewhere in the app, for
unrelated reasons. Now curating a row raises the score of the *next* headline on
that ticker.

Four decisions worth keeping:

- **The re-score hangs off the Scanner/Theme write path, not off the /news
  buttons.** `onWatchlist` is the other scoring input, and the only one the news
  pipeline does not own; §7f's sweep is insert-driven and runs only for halts and
  filings, so a watchlist edit moved nothing at all. That was invisible while
  watchlist edits were rare. Hooking only the news-originated route would have
  left the gap open for a moderator editing from the scanner page, where the
  effect on scoring is identical.
- **Every intent that changes membership is wired**, including the awkward ones:
  a rename needs the ticker read *before* the write (the old symbol loses the
  bonus), a cascading theme delete needs its tickers collected before they are
  gone, and a delete gets the ticker back from Prisma's own return value.
  `createTheme`/`updateTheme` are deliberately NOT wired — `buildScoreContext`
  does not filter on a theme's status, so renaming or archiving one changes no
  ticker's membership.
- **`rescoreRecent` gained a ticker filter.** The ingest path still sweeps the
  whole window, because a new filing can corroborate anything in it; a watchlist
  edit changes one input for one symbol. Measured on dev: 1 row swept instead of
  25.
- **The buttons post to the existing scanner and theme resource routes with
  their existing intents.** No parallel write path, so the permission check, the
  validation and the re-score hook are shared — and the buttons are staff-only by
  construction, since those routes already require admin or moderator. `/news` is
  open to every active subscriber, but the scanner and themes are one shared
  curated set, not a per-user watchlist. The loader gates the buttons so nobody
  is shown a control that would 403.

It is a prefilled form, not a true one-click write. The fields a headline knows
(ticker, date, description) are filled; the parts a single click would have to
guess — which of several tickers, which theme, the setup — are the ones a
moderator would want to correct.

`NewsRow` is now a div wrapping its link. The row was a single `<a>`, and the
curate buttons cannot nest inside one: invalid HTML, and every click would have
followed the wire link instead.

Verified end to end: a stored 6-K on VIPS scores 10, 25 with a WATCHING scanner
entry, and 10 again once that entry is closed.

### 7h. Alert durability (2026-08-25)

Shipped, and it **inverts §6**: watch rules are matched on the SERVER now, and a
fired rule is a `NewsAlert` row.

§6 put matching in the browser and M4 kept it there, with the reasoning that the
fan-out stays dumb and a rule change takes effect without a reconnect. Both are
true and neither survives contact with what an alert is for. The hook's own
justification for living in the app layout was "the member is in a chat room
when the 8-K drops" — but "the member had no tab open at 07:15" is that same
failure, it is the more common one, and a browser-side match has no answer to
it. Two tabs each matched, so one event pinged twice. And nothing was left to
come back to.

`watch.ts` stays shared and unchanged, so the rule editor previews a rule with
the same predicate the server matches on; the two sides cannot drift.

What the row stores, and why:

- **The rule's label is snapshot, not just referenced.** Members edit and delete
  rules constantly; an alert in the history still has to say what fired it long
  after that rule stopped existing.
- **The score AT FIRE TIME**, which is what explains the match. A later re-score
  moves `NewsItem.score`, not this.
- **`@@unique([userId, newsItemId])`** is what makes "emit each alert exactly
  once" true, and it matters more than it looks. §7f re-emits a changed row under
  its existing id — deliberately, so a row that gained the score to match a rule
  gets a second chance at it — and without the constraint any row whose score
  merely drifted upwards would alert again on every sweep.

Two implementation notes that are easy to undo by accident:

- **Duplicates are pre-filtered with one indexed read**, not left to the
  constraint. The duplicate is the COMMON path here, and `db.server.ts` logs
  Prisma errors to stdout — relying on the throw filled the log with
  unique-constraint stack traces describing normal operation. The catch stays as
  a race backstop.
- **The rule list is deliberately not cached.** A short TTL would be cheap, but
  it would mean a member edits a rule and waits for it to bite, and "change a
  rule, watch it work" is the one thing the client-side design got right. One
  indexed read per fan-out batch buys it back.

The app layout no longer ships watch rules on every authed page load; they
existed solely so the browser could match them.

Two tabs still each render their own toast — inherent to having two tabs. The
**ping** is claimed once per browser through `localStorage`, because two
overlapping sounds are the part that actually grates. That claim is not atomic
across tabs; the window is microseconds against milliseconds of socket delivery,
and losing the race costs one duplicate ping, so a lock protocol is not worth it.
Storage that throws falls back to playing — a duplicate ping beats silence.

The backlog surfaces as a **History** tab beside the rules, with an unread badge
on the bell. Read state is marked explicitly rather than on open: glancing at a
list is not the same as having dealt with what is in it. Alerts cascade with
their `NewsItem`, so the nightly purge takes 90-day-old alerts with it and
retention needs no rule of its own.

`FiredAlert` lives in `news/types.ts`, not beside the matcher — the hook renders
these in the browser, and importing a `.server` module for a type is erased in
theory and exactly the mistake that has cost this codebase debugging time.

### 7i. Production enablement and retention (2026-08-25)

`prisma/purge-old-news.ts` existed but nothing ran it. At ~450 rows a day that
was survivable while the poller only ran on a dev machine; enabling ingestion in
production is exactly when the table starts growing, so the two shipped
together.

The deleting moved to `app/utils/news/retention.server.ts`, which now has two
callers that must not drift: the CLI (unchanged posture — dry run by default,
boundary check, `--confirm`) and a nightly job behind the same
`NEWS_INGEST_ENABLED` flag as the poller. Same flag for the same two reasons: a
process that is not ingesting is not accumulating, and the flag is what keeps
this single-instance.

- **02:30 ET**, the middle of the only quiet stretch between the 20:00 close and
  the 04:00 pre-market ramp, because VACUUM takes an exclusive lock. On the
  spring-forward night that time does not exist and the run lands at 01:30 ET;
  left as is, since it is still hours short of the ramp.
- **The nightly job vacuums only past 5k deleted rows.** In steady state it
  removes one day of items and the next day's inserts reuse those pages, so
  vacuuming nightly would rewrite the whole database to reclaim nothing. The
  hand-run CLI keeps the opposite default — a purge you run yourself is usually
  the big one.
- `NEWS_RETENTION_DAYS` configures the window (default 90, `off` disables it
  without disabling ingestion). A malformed value warns and falls back; a typo
  must not take the boot down.

**`scripts/` was never in the production image.** The Dockerfile copied `build`,
`prisma`, `server`, `app` and `tsconfig.json` and nothing else, so
`news:discover` could not run on the Coolify host — which is the only place it
*can* run, GlobeNewswire and ACCESS Newswire being Cloudflare-blocked from dev
machines. Now copied.

**Production had never been seeded for news.** `entrypoint.sh` runs `db:seed`
only on first boot (guarded by `.setup_complete`, which prod passed long ago) and
`prisma/seed.ts` does not touch news at all — so `NewsFeed` and `SymbolUniverse`
are both empty there. Flipping the env var alone would start the poller for zero
feeds, and even with feeds seeded an empty `SymbolUniverse` resolves no ticker,
so every item scores −15 and the feed is noise. **Order matters:**
`startNewsIngestion` reads the enabled-feed list once at boot, so seed first,
flag second. The seeds are deliberately NOT in `entrypoint.sh`: it runs under
`set -e` and the symbol seed fetches from sec.gov, so an SEC outage would turn a
boot into a crash loop.


### Before M2




- Feed rows for all twelve wires are seeded; the six with unverified URLs are
  `enabled: false` with the URL blank, waiting on M1.5 discovery. Re-seeding
  never overwrites `url` or `enabled`, so discovery's findings survive.
- The dry-run script has NOT yet been run across a full trading day. That is the
  actual gate on M2 — the code is ready for it, the reading has not happened.

---

**M1 — Ingestion spine, no UI.** ✅ *Shipped 2026-08-25 — see §7a.*

Original scope: Schema + migration, adapter contract, EDGAR
and halt adapters, `SymbolUniverse` seed from `company_tickers.json`, dedupe,
cursor state. Ship `scripts/news-poll-once.mjs` that runs a single cycle and
prints what it *would* store. **Read that output for a full trading day before
building any UI** — if the signal is bad, everything downstream is wasted.

**M1.5 — Feed discovery.** `scripts/news-discover-feed.mjs`, then run it
against the four unknown wires (ACCESS Newswire, Newsfile, WebWire, ACN
Newswire) and **re-probe GlobeNewswire from the Coolify host**, which is
blocked from the dev machine. Fill in `prisma/seed-news-feeds.ts` and flip
those rows `enabled`. Small, but it gates M2 and is the difference between 4
wires and 12.

**M2 — Wires + extraction + classifier.** Generic RSS adapter driven by the
`NewsFeed` registry (per-feed User-Agent, follow redirects), `(NASDAQ: X)`
parser with universe validation, rules classifier, scoring including wire tier
and the ±30 min corroboration rule. Classifier and extractor are pure functions
— give them a fixture file of real headlines captured in M1 and test them
directly. Include known promotional releases in the fixtures and assert they
score below the alert threshold *unless* corroborated.

**M3 — Feed UI + live push.** `/news` route, access gating, socket room and
fan-out, virtualized feed, filter bar, sidebar entry.

**M4 — Watches + alerts.** `NewsWatch` CRUD, settings UI, toast + sound.

**M5 — Integrations.** Send-to-Scanner, add-to-Theme, bookmark a news item.
✅ *Send-to-Scanner and add-to-Theme shipped 2026-08-25 — see §7g. Bookmarking
a news item is NOT done.* Alert durability (§7h) shipped alongside it.

**M6 — Hardening.** Nightly retention purge, admin source-health view
(last poll, failures, items/hour per source), exponential backoff verified.
*Retention purge shipped early, 2026-08-25 — see §7i; it belonged with
production enablement. The admin source-health view is still open.*

M1–M2 are where the risk is. M3–M5 are ordinary app work on this codebase.

---

## 8. Risks and open questions

- **Signal quality is unknown until M1 runs.** The wires are noisy; the whole
  bet is that form-type + keyword + score filtering gets it usable. M1 exists
  specifically to test that cheaply.
- **Licensing.** SEC and Nasdaq are public domain — unrestricted. Wire RSS:
  headline + link + timestamp only, which is standard aggregator practice, and
  every item deep-links to the publisher. FMP and Finviz are excluded on terms
  grounds, not technical ones. If Finnhub is ever enabled, re-read its terms
  first — the app charges money, which changes what its free tier permits.
- **Single-process polling.** If the app is ever scaled to two containers, two
  pollers will double-write. The `@@unique([feedKey, externalId])` constraint
  makes that safe rather than corrupting, but the env flag should stay
  single-instance.
- **Windows dev quirk** — the orphaned-node-on-port-3000 issue noted in
  `live-sessions-roadmap.md` bites harder here, since a stale process keeps
  polling. Kill it properly between restarts.
- **Open:** should high-score items (≥80, e.g. an offering on a ticker in an
  active Theme) also drop into a chat room? Deliberately deferred — considered
  and rejected for v1 to keep the message table clean, but it is the obvious M7
  if people ask for it.

---

## 9. Open items — pick up here

Live state as of **2026-08-25**: ingestion is running in production, 10 feeds
enabled, retention purging nightly at 02:30 ET, M5 integrations and durable
alerts shipped. What is left, roughly in the order it is worth doing.

### 9a. Create a watch rule (5 minutes, do this first)

Nothing in the feed can page anyone until a `NewsWatch` rule exists, and there
are currently none. The whole alert pipeline — server-side matching, persisted
fires, unread history — is running and matching against an empty rule set.

On `/news` → **Alerts** → new rule: min score 60, no ticker list, no catalyst
list. That fires on anything clearing the alert threshold and nothing else.

Worth knowing when picking the score: GlobeNewswire is `MAJOR` tier, so an
offering headline there scores 70 base + 10 major wire + 10 NASDAQ = **90**. A
routine 6-K sits at 10–20. 60 is a wide gap in the right place.

### 9b. Act on the 07:00–09:00 promotional-wire sample

`scripts/news-measure-window.ts` was run across the 2026-08-25 pre-market window
to settle the question §7c left open: whether ABNewswire, KissPR and the other
promotional wires earn their poll. **The result has not been read yet.**

§3c justified ingesting them on the grounds that a paid-placement release on a
3M-float ticker at 07:15 ET is exactly this app's setup. The only sample taken
before this one was at 05:15 ET — an hour before promotional releases are
supposed to cluster — and found 0% ticker density.

If they come back at 0% again, disabling them is a seed edit and a re-seed, the
same path GlobeNewswire took in reverse: set `enabled: false` in
`prisma/seed-news-feeds.ts`… **except that disabling does NOT propagate through
the upsert** (see `seedNewsFeeds` — enabling propagates, disabling does not, so
that a feed switched on against the live database stays on). Flip those rows in
the database directly, or the registry and production will disagree.

Half an hour of work, not a milestone. Do not let it grow into one.

### 9c. Bookmark a news item — the rest of M5

M5 shipped send-to-Scanner and add-to-Theme; bookmarking was in the original
scope and was not built. The app already has a bookmark feature for chat
messages (`app/components/bookmark/`), so the question to answer first is
whether news bookmarks join that table or get their own.

### 9d. M6 — admin source-health view

Last poll, consecutive failures, items/hour per source. Every field it needs is
already on `NewsFeed` (`lastPolledAt`, `lastItemAt`, `lastError`,
`consecutiveFailures`) — this is a read-only page over columns the poller has
been maintaining since M1, not new plumbing.

The retention purge that was also part of M6 shipped early with production
enablement; see §7i.

### 9e. ACCESS Newswire — low priority, and say no if it grows

Feed URL still unknown; the homepage returns a Cloudflare challenge from the dev
machine. **Try loading it in a real browser first** — that is what settled
GlobeNewswire, whose URL had been correct in the registry the whole time while
node-fetch got connection-reset.

Bounded at one attempt. EDGAR produced 18 of 19 alerting items in the M2 sample
and all eight wires combined produced one; this is the 5%.

---

## 10. Found while shipping this, NOT part of this feature

### 10a. Express `trust proxy` is off behind Traefik

Spotted in the production log during news enablement on 2026-08-25:

```
ValidationError: The 'X-Forwarded-For' header is set but the Express
'trust proxy' setting is false (default).
  code: 'ERR_ERL_UNEXPECTED_X_FORWARDED_FOR'
```

Every request reaches the app through Traefik, so `express-rate-limit` sees the
proxy's IP for all of them and buckets the entire community into **one shared
limit** instead of one per user. A single noisy client can exhaust it for
everyone, and a genuine abuser is never individually limited.

The fix is one line in `server/server.ts` — `app.set('trust proxy', 1)`. The `1`
matters: blanket `true` trusts the whole `X-Forwarded-For` chain, which lets a
client spoof its own address by sending the header. `1` trusts exactly one hop,
which is what sits in front of this app.

It is small but it changes how EVERY request is identified, including the login
and password-reset limiters, so it wants its own change and its own verification
— not a line slipped into a news commit. Nothing to do with the news feed; it
was already true before any of this and is recorded here only because this is
where it was noticed.
