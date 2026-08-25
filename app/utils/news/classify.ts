import { NewsCatalyst } from '@prisma/client';

/**
 * Deterministic catalyst classification. No LLM: it has to be instant and
 * unit-testable, and a filing's form type already says what it is.
 *
 * M1 covers the unambiguous half — EDGAR form types and halts. The keyword
 * rules for wire headlines, and the 0-100 score, land in M2 alongside the
 * fixture file of real headlines captured by running M1 for a trading day.
 */

/**
 * Form type → catalyst. Matched longest-prefix-first, because EDGAR emits
 * variants the bare form name does not cover: `424B5`, but also `8-K/A` for an
 * amendment and `SC 13D/A`.
 */
const FORM_CATALYSTS: Array<[string, NewsCatalyst]> = [
  ['424B5', NewsCatalyst.OFFERING],
  ['424B3', NewsCatalyst.OFFERING],
  ['424B4', NewsCatalyst.OFFERING],
  ['S-1', NewsCatalyst.SHELF],
  ['S-3', NewsCatalyst.SHELF],
  ['F-1', NewsCatalyst.SHELF],
  ['F-3', NewsCatalyst.SHELF],
  ['SC 13D', NewsCatalyst.INSIDER],
  ['SC 13G', NewsCatalyst.INSIDER],
  ['4', NewsCatalyst.INSIDER],
];

/**
 * `8-K` and `6-K` are deliberately absent: they are envelopes, not events. An
 * 8-K can be a CEO resignation, a merger or a bankruptcy, so it falls through
 * to OTHER until the M2 keyword pass reads its item title.
 */
export function catalystForFormType(formType: string): NewsCatalyst {
  const normalized = formType.trim().toUpperCase().replace(/\/A$/, '');
  for (const [prefix, catalyst] of FORM_CATALYSTS) {
    if (normalized === prefix || normalized.startsWith(`${prefix} `)) return catalyst;
  }
  return NewsCatalyst.OTHER;
}

/**
 * Keyword rules for wire headlines, highest-priority match first.
 *
 * Order is the whole design: a release titled "Pricing of Public Offering to
 * Fund Phase 3 Trial" is an OFFERING, not an FDA story — the dilution is what
 * moves the stock. So OFFERING and REVERSE_SPLIT sit above everything else.
 *
 * Deliberately deterministic and cheap. It runs on every item of every cycle
 * and has to be testable against a fixture file of real headlines.
 */
const KEYWORD_RULES: Array<[NewsCatalyst, RegExp]> = [
  [
    NewsCatalyst.OFFERING,
    /\b(pricing of|public offering|registered direct|at[- ]the[- ]market|private placement|warrant inducement|underwritten offering|securities purchase agreement)\b/i,
  ],
  [NewsCatalyst.REVERSE_SPLIT, /\b(reverse (stock )?split|share consolidation)\b/i],
  [NewsCatalyst.UPLISTING, /\b(uplisting|uplist|approved for listing on|commence trading on)\b/i],
  [
    NewsCatalyst.FDA,
    /\b(phase [123]|phase i{1,3}\b|topline|top-line|FDA (clearance|approval|acceptance)|510\(k\)|orphan drug|fast track|breakthrough therapy|\bIND\b|NDA submission|BLA\b|PDUFA)/i,
  ],
  [
    NewsCatalyst.MERGER,
    /\b(definitive (merger )?agreement|to be acquired|acquisition of|merger with|business combination|letter of intent to acquire)\b/i,
  ],
  [
    NewsCatalyst.CONTRACT,
    /\b(awarded|contract award|purchase order|letter of intent|strategic partnership|joint venture|distribution agreement)\b/i,
  ],
  [
    NewsCatalyst.EARNINGS,
    /\b(quarterly results|fourth quarter|third quarter|second quarter|first quarter|fiscal year \d{4} results|reports (record )?(revenue|results)|earnings)\b/i,
  ],
  [NewsCatalyst.INSIDER, /\b(13D|13G|insider (buy|purchase)|beneficial ownership)\b/i],
];

/**
 * Catalyst for a wire headline (plus its snippet). Unmatched is OTHER, which
 * is fine: the feed shows those, the alerts do not.
 */
export function classifyHeadline(text: string): NewsCatalyst {
  for (const [catalyst, pattern] of KEYWORD_RULES) {
    if (pattern.test(text)) return catalyst;
  }
  return NewsCatalyst.OTHER;
}

/** Halt reason codes worth surfacing loudly, for the M3 badge and M2 score. */
export const LOUD_HALT_REASONS = new Set([
  'T1', // news pending — the one that precedes a gap
  'T12', // delisting / regulatory
  'LUDP', // limit up-limit down volatility pause — the momentum halt
  'H11', // regulatory concern
]);
