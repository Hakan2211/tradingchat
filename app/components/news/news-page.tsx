import * as React from 'react';
import { useFetcher, useSearchParams } from 'react-router';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Bell, ExternalLink, Layers, Newspaper, Radar, Radio } from 'lucide-react';
import { useSocketContext } from '#/routes/layouts/app-layout';
import type { NewsFeedItem } from '#/utils/news/types';
import { TRADING_TIME_ZONE } from '#/utils/trading-time';
import { NEWS_CATALYSTS } from '#/utils/news/constants';
import type { NewsWatchRule } from '#/utils/news/watch';
import { NewsAlertsDialog } from './news-alerts-dialog';
import {
  NewsCurateDialog,
  type CurateMode,
  type CurateTheme,
} from './news-curate-dialog';
import { cn } from '#/lib/utils';
import {
  CatalystBadge,
  ScorePill,
  SourceBadge,
  TickerChip,
} from './news-badges';

type Source = { key: string; name: string; tier: string | null; kind: string };


/** ET, because the whole app runs on the trading clock. */
const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TRADING_TIME_ZONE,
  hour12: false,
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export function NewsPage({
  initialItems,
  initialCursor,
  sources,
  alertThreshold,
  watches,
  canCurate,
  themes,
}: {
  initialItems: NewsFeedItem[];
  initialCursor: string | null;
  sources: Source[];
  alertThreshold: number;
  watches: NewsWatchRule[];
  /**
   * Whether to offer Send-to-Scanner / Add-to-Theme. Staff only, because the
   * scanner and the themes are one shared, curated set for the whole community
   * -- not a per-user watchlist. The resource routes enforce this themselves;
   * this only decides whether to show a button that would 403.
   */
  canCurate: boolean;
  themes: CurateTheme[];
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { socket } = useSocketContext();

  const [items, setItems] = React.useState(initialItems);
  const [cursor, setCursor] = React.useState(initialCursor);
  const [liveCount, setLiveCount] = React.useState(0);
  const [alertsOpen, setAlertsOpen] = React.useState(false);
  const [curating, setCurating] = React.useState<{
    mode: CurateMode;
    item: NewsFeedItem;
  } | null>(null);
  const loadMore = useFetcher<{ items: NewsFeedItem[]; nextCursor: string | null }>();

  // A filter change re-runs the loader, which hands back a fresh first page.
  React.useEffect(() => {
    setItems(initialItems);
    setCursor(initialCursor);
    setLiveCount(0);
  }, [initialItems, initialCursor]);

  // Live push. Keyed by id so a halt that gains its resumption time REPLACES
  // its row instead of appearing twice.
  React.useEffect(() => {
    if (!socket) return;
    const onItem = (incoming: NewsFeedItem) => {
      setItems((current) => {
        const index = current.findIndex((item) => item.id === incoming.id);
        if (index >= 0) {
          const next = [...current];
          next[index] = incoming;
          return next;
        }
        setLiveCount((count) => count + 1);
        return [incoming, ...current];
      });
    };
    socket.on('news.item', onItem);
    return () => {
      socket.off('news.item', onItem);
    };
  }, [socket]);

  React.useEffect(() => {
    if (!loadMore.data) return;
    setItems((current) => {
      const seen = new Set(current.map((item) => item.id));
      return [...current, ...loadMore.data!.items.filter((i) => !seen.has(i.id))];
    });
    setCursor(loadMore.data.nextCursor);
  }, [loadMore.data]);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 68,
    overscan: 12,
  });

  // Infinite scroll: fetch the next page as the last rows come into view.
  const virtualItems = virtualizer.getVirtualItems();
  React.useEffect(() => {
    const last = virtualItems[virtualItems.length - 1];
    if (!last || !cursor || loadMore.state !== 'idle') return;
    if (last.index >= items.length - 10) {
      const params = new URLSearchParams(searchParams);
      params.set('cursor', cursor);
      loadMore.load(`/news?index&${params.toString()}`);
    }
  }, [virtualItems, cursor, items.length, loadMore, searchParams]);

  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams);
    if (value === null || value === '') params.delete(key);
    else params.set(key, value);
    params.delete('cursor');
    setSearchParams(params, { preventScrollReset: true });
  };

  const activeWatchCount = watches.filter((watch) => watch.enabled).length;
  const activeCatalysts = new Set(searchParams.getAll('catalyst'));
  const activeSources = new Set(searchParams.getAll('source'));
  // Default ON — see NewsFilters.withTickerOnly for why this and not a score cut.
  const withTickerOnly = searchParams.get('anyTicker') !== '1';

  const toggleMulti = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    const current = params.getAll(key);
    params.delete(key);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    for (const v of next) params.append(key, v);
    params.delete('cursor');
    setSearchParams(params, { preventScrollReset: true });
  };

  return (
    // `bg-card`/`text-card-foreground`, NOT `bg-background`/`text-foreground`.
    // In this app's dark theme those two tokens are both near-white
    // (app.css defines --background as a light cream under .dark), so the
    // obvious pairing renders white text on a white panel. The card pair is
    // correct in both themes and is what scanner and themes already use.
    <div className="flex h-full flex-col bg-card text-card-foreground">
      <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <Newspaper className="size-5 shrink-0" />
        <h1 className="mr-2 text-lg font-semibold">News</h1>
        {liveCount > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-600 dark:text-emerald-400">
            <Radio className="size-3 animate-pulse" />
            {liveCount} live
          </span>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAlertsOpen(true)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded border px-2 text-xs transition hover:bg-accent',
              activeWatchCount > 0
                ? 'border-sky-500 text-sky-700 dark:text-sky-300'
                : 'border-border text-muted-foreground'
            )}
          >
            <Bell className="size-3.5" />
            Alerts
            {activeWatchCount > 0 && (
              <span className="tabular-nums">({activeWatchCount})</span>
            )}
          </button>
          <input
            type="search"
            placeholder="Ticker…"
            defaultValue={searchParams.get('ticker') ?? ''}
            onChange={(event) => setParam('ticker', event.target.value.trim())}
            className="h-8 w-28 rounded border bg-transparent px-2 font-mono text-sm uppercase"
          />
          <input
            type="number"
            min={0}
            max={100}
            placeholder="Min score"
            defaultValue={searchParams.get('minScore') ?? ''}
            onChange={(event) => setParam('minScore', event.target.value)}
            className="h-8 w-24 rounded border bg-transparent px-2 text-sm"
          />
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={!withTickerOnly}
              onChange={(event) =>
                setParam('anyTicker', event.target.checked ? '1' : null)
              }
            />
            Show items with no ticker
          </label>
        </div>
      </header>

      <div className="flex flex-wrap gap-1 border-b px-4 py-2">
        {NEWS_CATALYSTS.map((catalyst) => (
          <button
            key={catalyst}
            type="button"
            onClick={() => toggleMulti('catalyst', catalyst)}
            className={cn(
              'rounded border px-1.5 py-0.5 text-[10px] font-semibold transition',
              activeCatalysts.has(catalyst)
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:bg-accent'
            )}
          >
            {catalyst}
          </button>
        ))}
        <span className="mx-2 w-px bg-border" />
        {sources.map((source) => (
          <button
            key={source.key}
            type="button"
            onClick={() => toggleMulti('source', source.key)}
            className={cn(
              'rounded border px-1.5 py-0.5 text-[10px] transition',
              activeSources.has(source.key)
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:bg-accent'
            )}
          >
            {source.name}
          </button>
        ))}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nothing matches these filters yet.
          </p>
        ) : (
          <div
            style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
          >
            {virtualItems.map((virtualRow) => {
              const item = items[virtualRow.index];
              return (
                <div
                  key={item.id}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <NewsRow
                    item={item}
                    alertThreshold={alertThreshold}
                    canCurate={canCurate}
                    onCurate={(mode) => setCurating({ mode, item })}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <NewsAlertsDialog
        open={alertsOpen}
        onOpenChange={setAlertsOpen}
        rules={watches}
        alertThreshold={alertThreshold}
      />

      <NewsCurateDialog
        mode={curating?.mode ?? null}
        item={curating?.item ?? null}
        themes={themes}
        onClose={() => setCurating(null)}
      />
    </div>
  );
}

/**
 * One feed row.
 *
 * The row used to be a single `<a>`. It is now a div wrapping the link, because
 * the curate buttons cannot live inside an anchor -- nested interactive content
 * is invalid HTML and every click would have followed the wire link instead.
 * The anchor still covers the whole reading area, so the click target for
 * "open the story" is unchanged.
 */
function NewsRow({
  item,
  alertThreshold,
  canCurate,
  onCurate,
}: {
  item: NewsFeedItem;
  alertThreshold: number;
  canCurate: boolean;
  onCurate: (mode: CurateMode) => void;
}) {
  // Nothing to curate without a resolvable symbol -- the scanner and every
  // theme are keyed by ticker.
  const curatable = canCurate && item.tickers.length > 0;

  return (
    <div
      className={cn(
        'group flex items-start gap-2 border-b px-4 py-2 text-sm',
        'text-card-foreground hover:bg-accent/40',
        item.score >= alertThreshold && 'bg-primary/[0.04]'
      )}
    >
      <a
        href={item.url}
        target="_blank"
        // noreferrer alongside noopener: these are third-party wire links.
        rel="noopener noreferrer"
        className="flex min-w-0 flex-1 items-start gap-2 text-card-foreground no-underline"
      >
        <span className="w-24 shrink-0 pt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
          {timeFormatter.format(new Date(item.publishedAt))}
        </span>
        <ScorePill score={item.score} threshold={alertThreshold} />
        <CatalystBadge catalyst={item.catalyst} />
        <span className="flex shrink-0 gap-1">
          {item.tickers.slice(0, 4).map((ticker) => (
            <TickerChip key={ticker} ticker={ticker} />
          ))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block leading-snug">{item.headline}</span>
          <span className="mt-0.5 flex items-center gap-2">
            <SourceBadge feedName={item.feedName} tier={item.tier} />
            {item.formType && (
              <span className="font-mono text-[10px] text-muted-foreground">
                {item.formType}
              </span>
            )}
            {item.haltReason && (
              <span className="font-mono text-[10px] text-red-600 dark:text-red-400">
                {item.haltReason}
              </span>
            )}
          </span>
        </span>
        <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
      </a>

      {curatable && (
        // Revealed on hover like the external-link chevron, but kept focusable
        // so the row is still reachable from the keyboard.
        <span className="flex shrink-0 items-center gap-1 opacity-0 transition focus-within:opacity-100 group-hover:opacity-100">
          <CurateButton
            label={`Send ${item.tickers[0]} to Scanner`}
            onClick={() => onCurate('scanner')}
          >
            <Radar className="size-3.5" />
          </CurateButton>
          <CurateButton
            label={`Add ${item.tickers[0]} to a Theme`}
            onClick={() => onCurate('theme')}
          >
            <Layers className="size-3.5" />
          </CurateButton>
        </span>
      )}
    </div>
  );
}

function CurateButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="rounded border border-border p-1 text-muted-foreground transition hover:bg-accent hover:text-card-foreground"
    >
      {children}
    </button>
  );
}
