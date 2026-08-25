import { NewsSourceKind, type NewsFeed } from '@prisma/client';
import { classifyHeadline } from '../classify';
import { sessionAwareInterval, WIRE_IDLE_POLL_MS } from '../schedule';
import {
  extractMetadataTickerCandidates,
  extractTickerCandidates,
  validateTickers,
} from '../tickers';
import type { NewsAdapter, RawItem } from '../types';
import { blocks, plainText, tagText, tagTextAll } from '../xml';

/**
 * One generic RSS adapter, N wires. Each wire is a `NewsFeed` row, so adding
 * the next one is an INSERT — see docs/news-feed-roadmap.md §3c.
 *
 * This is where the pre-market pump headlines break, which is why the wires
 * matter as much as the filings: a paid-placement release on a 3M-float ticker
 * at 07:15 ET is the setup this feed exists for. Promotional wires are ingested
 * deliberately rather than filtered, then score-capped (see score.ts).
 *
 * LICENSING: store headline + link + timestamp + a short snippet ONLY. The
 * headline is fact; the body is copyrighted. Every item deep-links to the
 * publisher, which is standard aggregator practice.
 */

/** Never persist more than a snippet, no matter what the feed sends. */
const MAX_SUMMARY_CHARS = 300;

/**
 * Wires publish overnight — Asia-Pacific names and European 6-K filers do not
 * wait for New York. A wire poll is a single cheap request (unlike EDGAR's
 * seven against a rate-limited host), so wires idle far more tightly than the
 * shared default. Missing an 03:00 ET release by five minutes is a real cost;
 * one extra request a minute is not.
 */
function wireInterval(feed: NewsFeed, now: Date): number {
  const active = sessionAwareInterval(feed.pollIntervalSec, now);
  return Math.min(active, WIRE_IDLE_POLL_MS);
}

/**
 * RSS `<pubDate>` is RFC-822 with a real offset (`Tue, 25 Aug 2026 08:50:00
 * +0000`), so `Date` parses it correctly — unlike the halt feed's bare ET wall
 * clock. Atom-style `<published>`/`<updated>` are accepted as fallbacks because
 * a few wires serve Atom from an .rss path.
 */
function publishedAtFrom(item: string): Date | null {
  for (const tag of ['pubDate', 'published', 'updated', 'dc:date']) {
    const value = tagText(item, tag);
    if (!value) continue;
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

/**
 * `<guid>` is the stable id when present. Several wires omit it or emit a
 * non-permalink guid, so the link is the fallback — it is the canonical URL of
 * the release and is stable per item.
 */
function externalIdFrom(item: string, link: string, publishedAt: Date): string {
  const guid = tagText(item, 'guid');
  if (guid) return guid;
  return link || `${plainText(tagText(item, 'title'), 80)}:${publishedAt.toISOString()}`;
}

export function parseWireRss(xml: string, feedKey: string): RawItem[] {
  const items: RawItem[] = [];

  // `<item>` is RSS, `<entry>` is Atom. Try both so one adapter covers a wire
  // that quietly switches format.
  const rawItems = [...blocks(xml, 'item'), ...blocks(xml, 'entry')];

  for (const item of rawItems) {
    const headline = plainText(tagText(item, 'title'), 500);
    const link = tagText(item, 'link');
    const publishedAt = publishedAtFrom(item);
    if (!headline || !publishedAt) continue;

    // Drop translations. GlobeNewswire republishes the same release in French
    // or Danish under the same `dc:identifier` but a different headline — so
    // the headline-hash dedupe cannot collapse them, and the feed would carry
    // one event twice. Only skip when the wire states a non-English language:
    // most wires omit the tag entirely and must not be filtered out.
    const language = tagText(item, 'dc:language').toLowerCase();
    if (language && !language.startsWith('en')) continue;

    // Snippet only — never the full body.
    const summary = plainText(
      tagText(item, 'description') || tagText(item, 'summary'),
      MAX_SUMMARY_CHARS
    );

    items.push({
      feedKey,
      externalId: externalIdFrom(item, link, publishedAt),
      headline,
      url: link,
      publishedAt,
      summary: summary || undefined,
      // Structured `exchange:symbol` metadata, where the wire publishes it.
      // Resolved in `enrich`, not here: validation needs the database and this
      // parser is sync and pure so it can be tested against fixtures.
      symbolHints: tagTextAll(item, 'category', {
        attribute: 'domain',
        contains: '/rss/stock',
      }),
      // Wire items keep the headline-hash dedupe key (the ingest default):
      // unlike filings and halts these genuinely are republished across feeds,
      // which is exactly what that key exists to collapse.
      raw: { link, guid: tagText(item, 'guid') },
    });
  }

  return items;
}

export const wireAdapter: NewsAdapter = {
  kind: NewsSourceKind.WIRE,

  pollIntervalMs(feed, now) {
    return wireInterval(feed, now);
  },

  async fetch(feed) {
    if (!feed.url) {
      // A registry row whose URL is still unknown (awaiting M1.5 discovery).
      throw new Error(`feed ${feed.key} has no URL configured`);
    }

    const response = await fetch(feed.url, {
      headers: {
        // Several wires 403 or reset the connection on a bare node-fetch UA.
        'User-Agent': feed.userAgent ?? 'Mozilla/5.0 (compatible; tradingchat/1.0)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
      // newsdirect.com/rss 301s to /feed. A 3xx is not a failure.
      redirect: 'follow',
    });
    if (!response.ok) {
      throw new Error(`${feed.key} returned ${response.status}`);
    }

    // Deliberately NOT enriched here — see `enrich` below.
    return parseWireRss(await response.text(), feed.key);
  },

  async enrich(item) {
    // Headline AND snippet: wires routinely put the exchange:ticker in the
    // body's dateline rather than in the title.
    const searchText = `${item.headline} ${item.summary ?? ''}`;

    // Structured metadata first, prose second. Both go through the same
    // universe validation, so a wire that publishes neither still resolves
    // nothing and a wire that publishes both cannot contradict itself.
    //
    // This is the difference between GlobeNewswire being worth polling and not:
    // in a live 20-item sample, 15 items named a symbol in metadata and only
    // about half restated it in the text the prose parser can see.
    item.tickers = await validateTickers([
      ...extractMetadataTickerCandidates(item.symbolHints ?? []),
      ...extractTickerCandidates(searchText),
    ]);
    item.catalyst = classifyHeadline(searchText);
  },
};
