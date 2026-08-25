import { createHash } from 'node:crypto';

/**
 * Cross-source dedupe key.
 *
 * The same press release arrives on GlobeNewswire, then on a syndicator, then
 * in a vendor API, minutes apart and with cosmetically different headlines.
 * The `@@unique([feedKey, externalId])` constraint only catches same-source
 * repeats, so this collapses the cross-source ones.
 *
 * Normalisation: lowercase, drop corporate suffixes (a wire writes "Acme Corp"
 * where another writes "Acme Corporation"), strip punctuation, keep the first
 * 12 words. Truncating matters — wires append "…, Announces Conference Call
 * Details" to an otherwise identical revision of a release.
 *
 * Deliberately NOT a similarity score: it must be an indexable equality check,
 * because the ingest loop looks it up on every item.
 *
 * ONLY FOR WIRE PROSE. A source with its own authoritative unique id must set
 * `RawItem.dedupeKey` from that id instead — see `identityDedupeKey`. Headline
 * collapsing is actively wrong for them: EDGAR headlines are synthesized as
 * "FORM — COMPANY", so GSK filing two different 6-Ks in one day produces two
 * identical headlines, and a symbol halted twice in a session produces two
 * identical halt headlines. Both are distinct events; both were being dropped
 * as duplicates before this distinction existed.
 */

const CORPORATE_SUFFIXES = new Set([
  'inc',
  'corp',
  'corporation',
  'ltd',
  'limited',
  'llc',
  'plc',
  'holdings',
  'holding',
  'group',
  'co',
  'company',
  'sa',
  'nv',
  'ag',
  'ab',
  'as',
  'oyj',
  'spa',
  'plc',
]);

const KEPT_WORDS = 12;

export function normalizeHeadline(headline: string): string {
  const words = headline
    .toLowerCase()
    // Unicode punctuation the wires use liberally: curly quotes, en/em dashes.
    .replace(/[‘’“”]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((word) => word && !CORPORATE_SUFFIXES.has(word));
  return words.slice(0, KEPT_WORDS).join(' ');
}

export function dedupeKeyFor(headline: string): string {
  return createHash('sha1').update(normalizeHeadline(headline)).digest('hex');
}

/**
 * Dedupe key for a source that already has an authoritative unique id — an
 * EDGAR accession number, a halt's symbol+date+time.
 *
 * Namespaced so it can never collide with a wire's headline hash. A filing is
 * never "the same story" as another filing, so these items opt out of
 * cross-source collapsing entirely and only dedupe against themselves.
 */
export function identityDedupeKey(namespace: string, id: string): string {
  return `${namespace}:${id}`;
}

/**
 * How far back a duplicate is still a duplicate.
 *
 * Six hours, not longer: companies legitimately re-announce the same milestone
 * ("Phase 2 enrolment complete") months apart, and a wider window would
 * silently swallow the second one.
 */
export const DEDUPE_WINDOW_MS = 6 * 60 * 60 * 1000;
