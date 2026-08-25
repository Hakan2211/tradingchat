import { rescoreRecent, type NewsBroadcast } from './ingest.server';

/**
 * Re-score the recent feed after a Scanner or Theme write.
 *
 * `score.ts` awards +15 when a ticker sits on a Theme or an open ScannerEntry.
 * That input is not owned by the news pipeline — it changes when a moderator
 * edits the scanner or a theme, and until now nothing re-scored on it. The
 * rolling sweep in `ingest.server.ts` is insert-driven and only runs for halts
 * and filings, so a watchlist edit moved nothing at all.
 *
 * That was invisible while watchlist edits were rare. M5 puts "Send to Scanner"
 * and "Add to Theme" on every news row, which makes them constant — and turns
 * the gap into "why didn't my new ticker light up".
 *
 * Called from the Scanner/Theme write path itself rather than from the /news
 * buttons, deliberately: a moderator adding a ticker from the scanner page has
 * exactly the same effect on scoring as one adding it from a headline. Hooking
 * only the news-originated route would leave the original gap open.
 */

/**
 * Turn a route's `context` into a fan-out function.
 *
 * The poller gets its broadcaster from `server/server.ts`, which owns `io`. A
 * resource route only sees it through `context`, and the shape is not typed
 * there — hence the defensive check rather than a cast. No `io` (a unit test, a
 * loader running outside the server) simply means no fan-out: the scores are
 * still written, the clients just see them on their next load.
 */
function broadcastFrom(context: unknown): NewsBroadcast | undefined {
  const io = (context as { io?: unknown } | null | undefined)?.io as
    | { to?: (room: string) => { emit: (event: string, payload: unknown) => void } }
    | undefined;
  if (!io || typeof io.to !== 'function') return undefined;

  // Same event and room as the poller's fan-out, so the feed page and the
  // alert hook need no special case: a re-scored row arrives as `news.item`
  // under its existing id and replaces the row already on screen.
  return (items) => {
    for (const item of items) io.to!('news').emit('news.item', item);
  };
}

/**
 * Re-score anything in the recent window carrying one of `tickers`.
 *
 * Awaited by the caller so the click that created the ScannerEntry and the
 * re-scored row land together — but never fatal. The write is already
 * committed by the time this runs; a failed sweep must not turn a successful
 * "Send to Scanner" into an error toast.
 *
 * Pass BOTH sides of a change: renaming an entry's ticker removes the bonus
 * from the old symbol as well as granting it to the new one.
 */
export async function rescoreForWatchlistChange(
  tickers: Array<string | null | undefined>,
  context?: unknown
): Promise<void> {
  const unique = [
    ...new Set(
      tickers
        .filter((ticker): ticker is string => Boolean(ticker))
        .map((ticker) => ticker.toUpperCase().trim())
        .filter((ticker) => ticker.length > 0)
    ),
  ];
  if (unique.length === 0) return;

  try {
    await rescoreRecent({ tickers: unique, broadcast: broadcastFrom(context) });
  } catch (error) {
    console.warn(
      '[news] watchlist re-score failed (the scanner/theme write is committed):',
      error
    );
  }
}
