import { NewsCatalyst, NewsSourceKind, type NewsFeed } from '@prisma/client';
import { fromTradingWallClock } from '../../trading-time';
import { identityDedupeKey } from '../dedupe';
import { sessionAwareInterval } from '../schedule';
import { normalizeTicker } from '../tickers';
import type { NewsAdapter, RawItem } from '../types';
import { blocks, tagText } from '../xml';

/**
 * Nasdaq trade halts — public XML, no key, and often the first sign a low-float
 * name is moving. A T1 (news pending) or LUDP (volatility pause) is frequently
 * ahead of the press release that caused it.
 *
 * Two things about this feed drive the design:
 *
 *  1. It publishes ET wall clock with no timezone (`08/24/2026`, `19:50:00.000`),
 *     while `<pubDate>` is only the halt *date* at midnight ET. So the real
 *     instant is composed from the halt fields, not read from pubDate.
 *  2. Resumption fields are empty on first publication and filled on a later
 *     poll. So halts are UPSERTED, not insert-only: the same externalId flips
 *     HALT → RESUMPTION when the resumption time appears. The feed also keeps
 *     showing halts for days, so most of every cycle is already-seen rows.
 */

const NS = 'ndaq';

/** `08/24/2026` → parts. Returns null for the empty self-closing tag. */
function parseHaltDate(value: string): { year: number; month: number; day: number } | null {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  return { year: Number(match[3]), month: Number(match[1]), day: Number(match[2]) };
}

/** `19:50:00.000` → parts. Also accepts `19:50` from the resumption fields. */
function parseHaltTime(
  value: string
): { hour: number; minute: number; second: number; millisecond: number } | null {
  const match = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\.(\d{1,3}))?$/);
  if (!match) return null;
  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
    second: Number(match[3] ?? 0),
    millisecond: Number((match[4] ?? '0').padEnd(3, '0')),
  };
}

export function parseHaltInstant(dateValue: string, timeValue: string): Date | null {
  const date = parseHaltDate(dateValue);
  const time = parseHaltTime(timeValue);
  if (!date || !time) return null;
  return fromTradingWallClock({ ...date, ...time });
}

export function parseHaltsRss(xml: string, feedKey: string): RawItem[] {
  const items: RawItem[] = [];

  for (const item of blocks(xml, 'item')) {
    const symbol = tagText(item, `${NS}:IssueSymbol`);
    const haltDate = tagText(item, `${NS}:HaltDate`);
    const haltTime = tagText(item, `${NS}:HaltTime`);
    const haltedAt = parseHaltInstant(haltDate, haltTime);
    if (!symbol || !haltedAt) continue;

    const issueName = tagText(item, `${NS}:IssueName`);
    const market = tagText(item, `${NS}:Market`);
    const reasonCode = tagText(item, `${NS}:ReasonCode`);
    const resumptionDate = tagText(item, `${NS}:ResumptionDate`);
    // Quote time comes back first; trade time is the one that matters, so
    // prefer it and fall back while only the quote is published.
    const resumptionTradeTime = tagText(item, `${NS}:ResumptionTradeTime`);
    const resumptionQuoteTime = tagText(item, `${NS}:ResumptionQuoteTime`);
    const resumedAt = parseHaltInstant(
      resumptionDate,
      resumptionTradeTime || resumptionQuoteTime
    );

    const ticker = normalizeTicker(symbol);
    const resumed = Boolean(resumedAt);
    // Stable across the halt's whole life, so the resumption update lands on
    // the same row rather than creating a second one.
    const externalId = `${ticker}:${haltDate}:${haltTime}`;

    items.push({
      feedKey,
      externalId,
      // Keyed on the halt event, not the headline. A name that halts twice in
      // one session produces two identical headlines — and an LUDP halt
      // repeating on a runner is exactly the event this feed exists to catch,
      // so hashing the headline would discard the one that matters most.
      dedupeKey: identityDedupeKey('halt', externalId),
      headline: resumed
        ? `${ticker} resumed trading${issueName ? ` — ${issueName}` : ''}`
        : `${ticker} halted${reasonCode ? ` (${reasonCode})` : ''}${
            issueName ? ` — ${issueName}` : ''
          }`,
      // The feed has no per-halt permalink; this is the page it publishes.
      url: 'https://www.nasdaqtrader.com/trader.aspx?id=TradeHalts',
      // Deliberately the halt instant even for a resumption: the item's place
      // in the feed should not jump hours forward when it resumes.
      publishedAt: haltedAt,
      tickers: [ticker],
      catalyst: resumed ? NewsCatalyst.RESUMPTION : NewsCatalyst.HALT,
      haltReason: reasonCode || undefined,
      raw: {
        symbol: ticker,
        issueName,
        market,
        reasonCode,
        haltDate,
        haltTime,
        resumptionDate,
        resumptionQuoteTime,
        resumptionTradeTime,
        resumedAt: resumedAt?.toISOString() ?? null,
      },
    });
  }

  return items;
}

export const nasdaqHaltsAdapter: NewsAdapter = {
  kind: NewsSourceKind.EXCHANGE_HALT,

  pollIntervalMs(feed, now) {
    return sessionAwareInterval(feed.pollIntervalSec, now);
  },

  async fetch(feed) {
    const response = await fetch(feed.url, {
      headers: {
        // nasdaqtrader.com resets the connection on a bare node-fetch UA.
        'User-Agent': feed.userAgent ?? 'Mozilla/5.0 (compatible; tradingchat/1.0)',
        Accept: 'application/rss+xml, application/xml',
      },
      redirect: 'follow',
    });
    if (!response.ok) {
      throw new Error(`Nasdaq halts returned ${response.status}`);
    }
    return parseHaltsRss(await response.text(), feed.key);
  },
};
