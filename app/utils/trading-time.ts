/**
 * New York time is the app's clock: the chat is built around the NYSE/NASDAQ
 * session, so "a day" of messages means a trading day in ET, not a day in the
 * viewer's timezone or the server's.
 *
 * Everything that has to agree on where a day starts and ends goes through
 * here — the loader's SQL range, the date picker, the day separators between
 * messages, and the guard that decides whether a live message belongs to the
 * day on screen. Previously the loader sliced days in UTC while the UI labelled
 * them in local time, so the two disagreed for any viewer away from UTC.
 *
 * Implemented on `Intl` rather than a timezone library so the same code runs on
 * the server and in the browser with no extra dependency. DST is handled by the
 * platform's tz database, so the spring-forward day is 23h and the fall-back
 * day is 25h without any special casing here.
 */

export const TRADING_TIME_ZONE = 'America/New_York';

/** Wall-clock reading of an instant in New York. */
type WallClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const wallClockFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TRADING_TIME_ZONE,
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

function wallClock(date: Date): WallClock {
  const values: Record<string, number> = {};
  for (const part of wallClockFormatter.formatToParts(date)) {
    if (part.type !== 'literal') values[part.type] = Number(part.value);
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    // Some ICU versions report midnight as hour 24 when hour12 is false.
    hour: values.hour % 24,
    minute: values.minute,
    second: values.second,
  };
}

const pad = (value: number) => String(value).padStart(2, '0');

/** How far ahead of UTC New York is at a given instant, in milliseconds. */
function offsetAt(date: Date): number {
  const wc = wallClock(date);
  const asIfUtc = Date.UTC(
    wc.year,
    wc.month - 1,
    wc.day,
    wc.hour,
    wc.minute,
    wc.second
  );
  // wallClock() has no milliseconds, so compare against a whole-second instant.
  return asIfUtc - (date.getTime() - date.getMilliseconds());
}

/** `true` for a well-formed 'yyyy-MM-dd' day key. */
export function isTradingDayKey(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/** The trading day ('yyyy-MM-dd') an instant falls on. */
export function tradingDay(date: Date | string | number): string {
  const wc = wallClock(new Date(date));
  return `${wc.year}-${pad(wc.month)}-${pad(wc.day)}`;
}

/** The trading day happening right now. */
export function currentTradingDay(): string {
  return tradingDay(new Date());
}

/** Walk a day key forwards or backwards by whole calendar days. */
export function shiftTradingDay(day: string, deltaDays: number): string {
  const [year, month, dayOfMonth] = day.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, dayOfMonth + deltaDays));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(
    shifted.getUTCDate()
  )}`;
}

/**
 * The inverse of `toTradingWallClock`: a New York wall-clock reading turned
 * back into the real instant it names.
 *
 * Sources that publish ET wall clock rather than an offset need this — the
 * Nasdaq halt feed states `08/24/2026` + `19:50:00.000` with no zone, and
 * reading that as UTC would misplace every halt by four or five hours.
 */
export function fromTradingWallClock(parts: {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
  millisecond?: number;
}): Date {
  const asIfUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour ?? 0,
    parts.minute ?? 0,
    parts.second ?? 0,
    parts.millisecond ?? 0
  );
  // Guess using the offset around that date, then re-resolve at the guessed
  // instant: on a DST switch the first guess can land on the wrong side of it.
  const guess = asIfUtc - offsetAt(new Date(asIfUtc));
  return new Date(asIfUtc - offsetAt(new Date(guess)));
}

/** The instant a trading day begins (its 00:00:00.000 in New York). */
function startOfTradingDay(day: string): Date {
  const [year, month, dayOfMonth] = day.split('-').map(Number);
  return fromTradingWallClock({ year, month, day: dayOfMonth });
}

/**
 * The UTC instants bounding a trading day, for querying `createdAt`.
 * `end` is inclusive (the last millisecond of the day).
 */
export function tradingDayRange(day: string): { start: Date; end: Date } {
  return {
    start: startOfTradingDay(day),
    end: new Date(startOfTradingDay(shiftTradingDay(day, 1)).getTime() - 1),
  };
}

/**
 * A Date whose *local* fields read as the New York wall clock, so date-fns
 * `format` renders ET without needing a timezone-aware formatter. Use only for
 * display — the returned Date does not point at the original instant.
 */
export function toTradingWallClock(date: Date | string | number): Date {
  const source = new Date(date);
  const wc = wallClock(source);
  return new Date(
    wc.year,
    wc.month - 1,
    wc.day,
    wc.hour,
    wc.minute,
    wc.second,
    source.getMilliseconds()
  );
}
