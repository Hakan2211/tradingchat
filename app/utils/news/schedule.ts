import { toTradingWallClock } from '../trading-time';

/**
 * Small caps move in the pre- and post-market, so "market hours" here is the
 * whole 04:00–20:00 ET extended session, not 09:30–16:00. Outside it, and at
 * weekends, nothing is being filed or halted and polling every 10s just burns
 * the SEC's rate limit — so the loop drops to a five-minute idle.
 */
export function isActiveSession(now: Date): boolean {
  // Display-only Date whose local getters read the New York wall clock.
  const et = toTradingWallClock(now);
  const weekday = et.getDay();
  if (weekday === 0 || weekday === 6) return false;
  const hour = et.getHours();
  return hour >= 4 && hour < 20;
}

export const IDLE_POLL_MS = 5 * 60_000;

/**
 * Wires get a much tighter overnight floor than the shared idle.
 *
 * The 5-minute idle exists to protect the SEC's per-IP rate limit, where one
 * cycle costs seven requests. A wire cycle costs one request to a CDN-backed
 * RSS endpoint, and wires genuinely publish overnight — Asia-Pacific small caps
 * and European filers do not wait for New York. Being five minutes late to an
 * 03:00 ET release is a real cost; one request a minute is not.
 */
export const WIRE_IDLE_POLL_MS = 60_000;

/** A feed's configured interval during the session, the idle floor outside it. */
export function sessionAwareInterval(pollIntervalSec: number, now: Date): number {
  return isActiveSession(now) ? pollIntervalSec * 1000 : IDLE_POLL_MS;
}
