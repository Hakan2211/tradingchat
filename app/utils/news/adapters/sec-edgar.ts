import { NewsSourceKind, type NewsFeed } from '@prisma/client';
import { catalystForFormType } from '../classify';
import { identityDedupeKey } from '../dedupe';
import { sessionAwareInterval } from '../schedule';
import { tickersForCik } from '../tickers';
import type { NewsAdapter, RawItem } from '../types';
import { blocks, plainText, tagAttr, tagText } from '../xml';

/**
 * SEC EDGAR — the highest-signal small-cap source that exists, and public
 * domain, so there is no redistribution question at all.
 *
 * One request per form type against the "getcurrent" Atom feed. The form list
 * is stored on the `NewsFeed.url` row as a `types=` query parameter so it can
 * be widened without a deploy.
 */

/** Filings that move a low-float name. Dilution first — that is the trade. */
const DEFAULT_FORM_TYPES = ['8-K', '424B5', 'S-1', 'S-3', 'SC 13D', 'SC 13G', '6-K'];

const BASE_URL = 'https://www.sec.gov/cgi-bin/browse-edgar';

/**
 * The SEC rejects requests with no `User-Agent`, and rate-limits per IP at 10
 * requests/second across every machine on that address. Our budget is ~7 per
 * cycle — nowhere near the ceiling, but we still serialise with a small gap
 * rather than firing every form type at once, because the limit is shared with
 * anything else on the host.
 */
const REQUEST_GAP_MS = 150;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function formTypesFor(feed: NewsFeed): string[] {
  const configured = new URL(feed.url, BASE_URL).searchParams.get('types');
  if (!configured) return DEFAULT_FORM_TYPES;
  return configured
    .split(',')
    .map((type) => type.trim())
    .filter(Boolean);
}

function feedUrlFor(formType: string, count: number): string {
  const url = new URL(BASE_URL);
  url.searchParams.set('action', 'getcurrent');
  url.searchParams.set('type', formType);
  url.searchParams.set('company', '');
  url.searchParams.set('dateb', '');
  url.searchParams.set('owner', 'include');
  url.searchParams.set('count', String(count));
  url.searchParams.set('output', 'atom');
  return url.toString();
}

/**
 * Entry titles read `424B5 - CHEETAH NET SUPPLY CHAIN SERVICE INC. (0001951667) (Filer)`.
 * The trailing role matters: on a 13D the `(Filer)` is the activist and the
 * `(Subject)` is the company whose stock moves, so both are captured and the
 * subject wins when present.
 */
const TITLE_PATTERN = /^(.+?)\s+-\s+(.+?)\s+\((\d{4,10})\)\s+\((Filer|Subject|Reporting|Issuer)\)\s*$/i;

type ParsedTitle = {
  formType: string;
  companyName: string;
  cik: string;
  role: string;
};

export function parseEntryTitle(title: string): ParsedTitle | null {
  const match = title.match(TITLE_PATTERN);
  if (!match) return null;
  return {
    formType: match[1].trim(),
    companyName: match[2].trim(),
    cik: match[3],
    role: match[4].toLowerCase(),
  };
}

/** `urn:tag:sec.gov,2008:accession-number=0001104659-26-100368` → the number. */
export function accessionFrom(id: string): string {
  const match = id.match(/accession-number=([\d-]+)/);
  return match ? match[1] : id.trim();
}

export function parseEdgarAtom(xml: string, feedKey: string): RawItem[] {
  const items: RawItem[] = [];
  for (const entry of blocks(xml, 'entry')) {
    const title = tagText(entry, 'title');
    const parsed = parseEntryTitle(title);
    if (!parsed) continue;

    const url = tagAttr(entry, 'link', 'href');
    const updated = tagText(entry, 'updated');
    const publishedAt = new Date(updated);
    if (!url || Number.isNaN(publishedAt.getTime())) continue;

    // `category term` is the authoritative form type; the title prefix agrees
    // with it in practice but is free text.
    const formType = tagAttr(entry, 'category', 'term') || parsed.formType;

    const accession = accessionFrom(tagText(entry, 'id'));

    items.push({
      feedKey,
      externalId: accession,
      // The accession number, not the headline: two different 6-Ks from the
      // same company on the same day synthesize the SAME headline, and hashing
      // that would throw the second one away.
      dedupeKey: identityDedupeKey('sec', accession),
      headline: `${formType} — ${parsed.companyName}`,
      url: url.startsWith('http') ? url : `https://www.sec.gov${url}`,
      publishedAt,
      summary: plainText(tagText(entry, 'summary')) || undefined,
      catalyst: catalystForFormType(formType),
      formType,
      raw: { title, cik: parsed.cik, role: parsed.role, updated },
    });
  }
  return items;
}

/**
 * Collapse the one-entry-per-filer that EDGAR emits for a co-filed document.
 *
 * A single 8-K filed by Charter Communications and its two CCO Holdings
 * subsidiaries arrives as three entries sharing one accession number. They are
 * one filing, so they become one item — but naively keeping the first would
 * keep a ticker-less subsidiary and throw away the entry carrying CHTR. So the
 * tickers are unioned, and the entry that actually identifies a tradeable
 * company wins the headline.
 *
 * `(Subject)` outranks `(Filer)`: on a 13D the filer is the activist, and the
 * subject is the company whose stock moves.
 */
export function mergeCoFilers(items: RawItem[]): RawItem[] {
  const byAccession = new Map<string, RawItem>();

  const rank = (item: RawItem) => {
    const role = (item.raw as { role?: string } | undefined)?.role;
    if (role === 'subject') return 2;
    return item.tickers?.length ? 1 : 0;
  };

  for (const item of items) {
    const existing = byAccession.get(item.externalId);
    if (!existing) {
      byAccession.set(item.externalId, { ...item, tickers: [...(item.tickers ?? [])] });
      continue;
    }

    const tickers = new Set([...(existing.tickers ?? []), ...(item.tickers ?? [])]);

    if (rank(item) > rank(existing)) {
      byAccession.set(item.externalId, { ...item, tickers: [...tickers] });
    } else {
      existing.tickers = [...tickers];
    }
  }

  return [...byAccession.values()];
}

async function fetchFormType(
  feed: NewsFeed,
  formType: string,
  count: number
): Promise<RawItem[]> {
  const response = await fetch(feedUrlFor(formType, count), {
    headers: {
      // Mandatory, and it must identify us with a contact address.
      'User-Agent': feed.userAgent ?? 'tradingchat hbilgic1992@gmail.com',
      Accept: 'application/atom+xml',
    },
  });
  if (!response.ok) {
    throw new Error(`EDGAR ${formType} returned ${response.status}`);
  }
  const xml = await response.text();
  // A quiet pre-market hour legitimately returns "No recent filings" with zero
  // entries. That is not an error — it is an empty cycle.
  return parseEdgarAtom(xml, feed.key);
}

export const secEdgarAdapter: NewsAdapter = {
  kind: NewsSourceKind.SEC_EDGAR,

  pollIntervalMs(feed, now) {
    return sessionAwareInterval(feed.pollIntervalSec, now);
  },

  async fetch(feed) {
    const formTypes = formTypesFor(feed);
    const items: RawItem[] = [];
    const errors: string[] = [];

    for (const [index, formType] of formTypes.entries()) {
      if (index > 0) await sleep(REQUEST_GAP_MS);
      try {
        items.push(...(await fetchFormType(feed, formType, 100)));
      } catch (error) {
        // One form type failing must not lose the other six.
        errors.push(error instanceof Error ? error.message : String(error));
      }
    }

    if (errors.length === formTypes.length) {
      throw new Error(`every EDGAR form type failed: ${errors.join('; ')}`);
    }

    // Resolve CIK → ticker against the universe. A filer with no listed symbol
    // (a private acquirer, a fund) still yields a storable, ticker-less item.
    for (const item of items) {
      const cik = (item.raw as { cik?: string } | undefined)?.cik;
      if (cik) item.tickers = await tickersForCik(cik);
    }

    // After ticker resolution, so the merge can prefer the entry that resolved.
    return mergeCoFilers(items);
  },
};
