import type { NewsCatalyst, NewsFeed, NewsSourceKind } from '@prisma/client';

/**
 * The adapter contract: one interface, one poll loop, N sources.
 *
 * Adding a wire later is a `NewsFeed` row, not new plumbing — see
 * docs/news-feed-roadmap.md §3.
 */

/** What an adapter returns. Normalisation into a `NewsItem` happens in ingest. */
export type RawItem = {
  feedKey: string;
  /** Stable per source: wire guid, EDGAR accession number, SYMBOL:date:time. */
  externalId: string;
  /**
   * Overrides the headline-hash dedupe key. Set it whenever the source has its
   * own authoritative unique id (see `identityDedupeKey`) — headline collapsing
   * is only correct for wire prose, and silently drops distinct filings and
   * repeat halts that happen to share a synthesized headline.
   */
  dedupeKey?: string;
  headline: string;
  url: string;
  publishedAt: Date;
  /** Short snippet only. Never the full article body — that is copyrighted. */
  summary?: string;
  /** Only when the source states the symbols outright (halts, EDGAR CIK). */
  tickers?: string[];
  /** Set when the source is unambiguous about it; otherwise the classifier decides. */
  catalyst?: NewsCatalyst;
  formType?: string;
  haltReason?: string;
  /** Source payload, kept for debugging and for re-classifying old rows. */
  raw?: unknown;
};

export interface NewsAdapter {
  kind: NewsSourceKind;
  /**
   * How long to wait before polling this feed again. NY-session aware: fast
   * during the 04:00–20:00 ET window, slow overnight and at weekends.
   */
  pollIntervalMs(feed: NewsFeed, now: Date): number;
  fetch(feed: NewsFeed): Promise<RawItem[]>;
  /**
   * Optional per-item work that is too expensive to do on everything a feed
   * returns. The ingest loop calls this ONLY for items that survive the cursor
   * filter.
   *
   * This matters: WebWire republishes its whole 369-item window on every poll,
   * of which the cursor keeps two or three. Enriching inside `fetch` meant
   * running ticker extraction and classification ~370 times every 30 seconds to
   * throw almost all of it away.
   */
  enrich?(item: RawItem): Promise<void>;
}

/**
 * The serialisable shape of a news row, shared by the loader and the socket
 * fan-out so the client renders a live item and a loaded one identically.
 * Dates are ISO strings because this crosses the wire.
 */
export type NewsFeedItem = {
  id: string;
  feedKey: string;
  feedName: string;
  /** WireTier as a string, or null for filings and halts. */
  tier: string | null;
  headline: string;
  summary: string | null;
  url: string;
  publishedAt: string;
  catalyst: NewsCatalyst;
  score: number;
  formType: string | null;
  haltReason: string | null;
  tickers: string[];
};
