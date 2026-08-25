import * as React from 'react';
import { toast } from 'sonner';
import type { Socket } from 'socket.io-client';
import type { NewsFeedItem } from '#/utils/news/types';
import { matchWatchRules, type NewsWatchRule } from '#/utils/news/watch';
import { playAlertPing } from '#/utils/news/alert-sound';

/**
 * Fires watch-rule alerts for `news.item` pushes.
 *
 * Mounted in the app layout, NOT on the /news page. The roadmap put matching in
 * the feed's loader, but an alert you only receive while staring at the feed is
 * not an alert — the member is in a chat room when the 8-K drops. The layout
 * already owns the socket and every other global listener (DM toasts, live
 * sessions), so this sits beside them and reaches every authed page.
 *
 * The server emits to everyone in the `news` room and lets each client filter;
 * a member without feed access is never joined to that room, so an empty rule
 * list here simply never matches.
 */

/** Toasts allowed per rolling window before the rest collapse into one. */
const BURST_LIMIT = 10;
const BURST_WINDOW_MS = 60_000;

export function useNewsAlerts(
  socket: Socket | null,
  rules: NewsWatchRule[]
): void {
  // Rules live in a ref so that editing one does not tear down and re-add the
  // socket listener — the same reasoning as the revalidator ref above it.
  const rulesRef = React.useRef(rules);
  rulesRef.current = rules;

  // Item ids already alerted on. A halt that later gains its resumption time
  // is re-emitted under the SAME id to update its row; without this it would
  // ping twice for one event.
  const alertedRef = React.useRef<Set<string>>(new Set());
  const recentRef = React.useRef<number[]>([]);
  const suppressedRef = React.useRef(0);

  React.useEffect(() => {
    if (!socket) return;

    const onItem = (item: NewsFeedItem) => {
      if (!rulesRef.current.length) return;
      if (alertedRef.current.has(item.id)) return;

      const rule = matchWatchRules(item, rulesRef.current);
      if (!rule) return;

      alertedRef.current.add(item.id);
      // The set is per-session and only grows on matches, but a member who
      // leaves the tab open all week with a loose rule should not accumulate
      // forever.
      if (alertedRef.current.size > 5000) alertedRef.current.clear();

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

      if (rule.sound) playAlertPing();

      const tickers = item.tickers.slice(0, 3).join(' ');
      toast(tickers ? `${tickers} — ${item.headline}` : item.headline, {
        id: `news-alert-${item.id}`,
        description: `${rule.label} · ${item.catalyst} · ${item.feedName} · score ${item.score}`,
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

    socket.on('news.item', onItem);
    return () => {
      socket.off('news.item', onItem);
    };
  }, [socket]);
}
