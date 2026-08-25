import { NewsCatalyst, WireTier } from '@prisma/client';

/**
 * Priority score, 0-100. This is what separates a usable feed from a firehose.
 *
 * Pure and synchronous on purpose: everything it needs is passed in, so it can
 * be tested against a fixture file of real headlines without a database. The
 * ingest loop assembles the context; this file only decides.
 *
 * Stored as an int on `NewsItem` so the feed can sort and filter on it and a
 * watch rule can say "only >= 60".
 */

// Re-exported for server-side callers. Defined in constants.ts because this
// module imports Prisma enums as runtime values and so can never be bundled
// into the browser — see the note there.
export { DEFAULT_ALERT_THRESHOLD } from './constants';
import { DEFAULT_ALERT_THRESHOLD } from './constants';

/**
 * Base by catalyst. Dilution outranks everything because on a low-float name
 * it IS the trade — a 424B5 at 3am is why this feed exists.
 */
const CATALYST_BASE: Record<NewsCatalyst, number> = {
  [NewsCatalyst.OFFERING]: 70,
  [NewsCatalyst.REVERSE_SPLIT]: 70,
  [NewsCatalyst.FDA]: 65,
  [NewsCatalyst.HALT]: 60,
  [NewsCatalyst.SHELF]: 60,
  [NewsCatalyst.MERGER]: 55,
  [NewsCatalyst.UPLISTING]: 55,
  [NewsCatalyst.INSIDER]: 50,
  [NewsCatalyst.RESUMPTION]: 45,
  [NewsCatalyst.CONTRACT]: 40,
  [NewsCatalyst.EARNINGS]: 30,
  [NewsCatalyst.OTHER]: 10,
};

/**
 * Patterns that mean "nothing happened".
 *
 * The last group is the one measurement forced in: law-firm solicitations
 * ("X Investors Have Opportunity to Lead Securities Fraud Lawsuit") are
 * high-volume, carry a VALID ticker so extraction cannot stop them, and are
 * never tradeable. On the first live pre-market run they were three of the top
 * twelve PR Newswire items.
 */
const FLUFF_PATTERNS: RegExp[] = [
  /\bannounces participation in\b/i,
  /\bto present at\b/i,
  /\b(investor|analyst) (conference|day)\b/i,
  // Both voices: "Acme Appoints Jane Smith to Board" and "Jane Smith Appointed
  // to Acme Board of Directors". Only matching the active one let a board
  // appointment through, and it then collected the +25 corroboration boost
  // from an unrelated 8-K filed by the same company minutes earlier.
  /\bappoints?\b.{0,40}\b(board|director|officer)\b/i,
  /\bappointed\b.{0,40}\b(board|director|officer|chair)\b/i,
  /\b(names|named)\b.{0,30}\b(chief|president|ceo|cfo|coo|cto)\b/i,
  /\bwebinar\b/i,
  /\bawarded .{0,20}\b(badge|recognition)\b/i,
  /\branks? no\.? ?[\d,]+\b/i,
  // Securities-litigation solicitation boilerplate.
  /\b(securities fraud|class action) lawsuit\b/i,
  /\binvestors? (who|have) .{0,40}(lead plaintiff|opportunity to lead)\b/i,
  /\bdeadline:.{0,40}\binvestors\b/i,
  /\breminds investors\b/i,
];

/** Consumer-affiliate spam: no ticker, no company, pure content farm. */
const SPAM_PATTERNS: RegExp[] = [
  /\breviews? \d{4}\b/i,
  /\b(is this|could this|does this) .{0,60}\?/i,
  /\b\d+% off\b/i,
];

export type ScoreContext = {
  catalyst: NewsCatalyst;
  /** null for filings and halts, which are not wires. */
  tier: WireTier | null;
  headline: string;
  summary?: string;
  tickers: string[];
  /** Exchanges of the resolved tickers, from `SymbolUniverse`. */
  exchanges: string[];
  /** Ticker sits on a `ThemeTicker` row or an open `ScannerEntry`. */
  onWatchlist: boolean;
  /** A halt or filing touched the same ticker within +/- 30 minutes. */
  corroborated: boolean;
};

export type ScoredItem = {
  score: number;
  /** Why it scored what it did — shown in the M6 admin view and the dry run. */
  reasons: string[];
};

export function scoreItem(context: ScoreContext): ScoredItem {
  const reasons: string[] = [];
  let score = CATALYST_BASE[context.catalyst] ?? 10;
  reasons.push(`${context.catalyst} base ${score}`);

  const text = `${context.headline} ${context.summary ?? ''}`;

  // The app already knows what the community is watching. Use it — this is the
  // signal a generic news bot structurally cannot have.
  if (context.onWatchlist) {
    score += 15;
    reasons.push('+15 on a theme or open scanner entry');
  }

  // NASDAQ is the small-cap venue. NOTE: the SEC ticker file does not label
  // NYSE American separately, so the roadmap's "NASDAQ/AMEX" rule can only be
  // applied to NASDAQ here. See roadmap section 7a, finding 3.
  if (context.exchanges.some((exchange) => exchange === 'NASDAQ')) {
    score += 10;
    reasons.push('+10 NASDAQ-listed');
  }

  if (FLUFF_PATTERNS.some((pattern) => pattern.test(text))) {
    score -= 20;
    reasons.push('-20 fluff / solicitation boilerplate');
  }

  if (SPAM_PATTERNS.some((pattern) => pattern.test(text))) {
    score -= 25;
    reasons.push('-25 consumer-affiliate spam');
  }

  // An item nobody can trade cannot be urgent, whatever it says.
  if (context.tickers.length === 0) {
    score -= 15;
    reasons.push('-15 no resolvable ticker');
  }

  let cap = 100;

  switch (context.tier) {
    case WireTier.MAJOR:
      score += 10;
      reasons.push('+10 major wire');
      break;
    case WireTier.PROMOTIONAL:
      // Ingested deliberately — this is where the tradeable low-float pumps
      // break — but a paid-placement release cannot page anyone on its own.
      score -= 25;
      cap = DEFAULT_ALERT_THRESHOLD - 1;
      reasons.push(`-25 promotional wire, capped at ${cap}`);
      break;
    case WireTier.SYNDICATOR:
      score -= 10;
      reasons.push('-10 syndicator (usually a duplicate)');
      break;
    default:
      break;
  }

  // The highest-value rule in the classifier, and it falls straight out of
  // ingesting the cheap wires instead of filtering them: a pump wire alone is
  // noise, but a pump wire PLUS a T1 halt on the same ticker is the trade.
  if (context.corroborated) {
    score += 25;
    cap = 100;
    reasons.push('+25 corroborated by a halt or filing within 30min (cap lifted)');
  }

  const final = Math.max(0, Math.min(cap, score));
  if (final !== score) reasons.push(`clamped to ${final}`);

  return { score: final, reasons };
}
