import * as React from 'react';
import { toast } from 'sonner';
import type { Socket } from 'socket.io-client';
import type { FiredAlert } from '#/utils/news/types';
import { playAlertPing } from '#/utils/news/alert-sound';

/**
 * Renders watch-rule alerts pushed by the server.
 *
 * Mounted in the app layout, NOT on the /news page: an alert you only receive
 * while staring at the feed is not an alert — the member is in a chat room when
 * the 8-K drops. The layout already owns the socket and every other global
 * listener (DM toasts, live sessions), so this sits beside them.
 *
 * MATCHING NO LONGER HAPPENS HERE. It used to: this hook received every
 * `news.item` and ran the rules itself, which meant a member with no tab open
 * at 07:15 simply never got the alert, and a member with two tabs got it twice.
 * The server now decides, persists the fire, and emits `news.alert` to that
 * member's own room — so this hook only renders. `alerts.server.ts` has the
 * reasoning; `watch.ts` still holds the shared predicate, which the rule editor
 * uses to preview a rule.
 *
 * What this hook still owns is presentation: burst collapsing, and making sure
 * two tabs do not both play the ping.
 */

/** Toasts allowed per rolling window before the rest collapse into one. */
const BURST_LIMIT = 10;
const BURST_WINDOW_MS = 60_000;

/** How long a sound claim stays in localStorage before it is pruned. */
const CLAIM_TTL_MS = 10 * 60_000;
const CLAIM_PREFIX = 'news-alert-sound:';

/**
 * Claim the right to play the ping for this alert, once per browser.
 *
 * The server now fires an alert once per USER, but every tab that user has open
 * receives it — so without this, two tabs mean two pings for one event. Each
 * tab renders its own toast, which is inherent to having two tabs and is not
 * worth suppressing; two overlapping sounds are the part that actually grates.
 *
 * The read-then-write is not atomic across tabs, so two tabs handling the event
 * in the very same instant could both claim it. In practice socket delivery is
 * milliseconds apart and this window is microseconds; the cost of losing the
 * race is the old behaviour for one alert, so a lock protocol is not worth it.
 *
 * Storage can throw outright (Safari private mode, blocked site data). Falling
 * back to "play it" is the right failure: a duplicate ping beats silence.
 */
function claimSoundFor(alertId: string): boolean {
  try {
    const key = `${CLAIM_PREFIX}${alertId}`;
    if (window.localStorage.getItem(key)) return false;
    window.localStorage.setItem(key, String(Date.now()));
    pruneClaims();
    return true;
  } catch {
    return true;
  }
}

/** Claims are per-alert, so they would accumulate forever without this. */
function pruneClaims(): void {
  try {
    const now = Date.now();
    const stale: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (!key?.startsWith(CLAIM_PREFIX)) continue;
      const at = Number(window.localStorage.getItem(key));
      if (!Number.isFinite(at) || now - at > CLAIM_TTL_MS) stale.push(key);
    }
    for (const key of stale) window.localStorage.removeItem(key);
  } catch {
    // Pruning is housekeeping; never let it break an alert.
  }
}

export function useNewsAlerts(socket: Socket | null): void {
  const recentRef = React.useRef<number[]>([]);
  const suppressedRef = React.useRef(0);

  React.useEffect(() => {
    if (!socket) return;

    const onAlert = (alert: FiredAlert) => {
      const { item } = alert;

      const now = Date.now();
      recentRef.current = recentRef.current.filter(
        (at) => now - at < BURST_WINDOW_MS
      );

      // 09:30 can deliver dozens of matching items in a minute. Past the cap,
      // collapse into one self-updating toast rather than burying the screen.
      if (recentRef.current.length >= BURST_LIMIT) {
        suppressedRef.current += 1;
        toast.message(`${suppressedRef.current} more news alerts`, {
          id: 'news-alert-overflow',
          description: 'Open the news feed to see them all.',
        });
        return;
      }

      recentRef.current.push(now);
      if (recentRef.current.length === 1) suppressedRef.current = 0;

      if (alert.sound && claimSoundFor(alert.id)) playAlertPing();

      const tickers = item.tickers.slice(0, 3).join(' ');
      toast(tickers ? `${tickers} — ${item.headline}` : item.headline, {
        // Keyed by alert, not item: the server guarantees one alert per item
        // per user, so this cannot collide with itself.
        id: `news-alert-${alert.id}`,
        description: `${alert.watchLabel} · ${item.catalyst} · ${item.feedName} · score ${alert.score}`,
        duration: 12_000,
        action: {
          label: 'Open',
          onClick: () => {
            // Third-party wire link: noopener, same as the feed rows.
            window.open(item.url, '_blank', 'noopener,noreferrer');
          },
        },
      });
    };

    socket.on('news.alert', onAlert);
    return () => {
      socket.off('news.alert', onAlert);
    };
  }, [socket]);
}
