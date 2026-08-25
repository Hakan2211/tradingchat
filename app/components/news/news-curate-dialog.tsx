import * as React from 'react';
import { useFetcher } from 'react-router';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { Textarea } from '#/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import type { NewsFeedItem } from '#/utils/news/types';
import { tradingDay } from '#/utils/trading-time';
import { cn } from '#/lib/utils';

/**
 * "Send to Scanner" / "Add to Theme".
 *
 * This is the integration the whole feed exists for: a bot can post a headline
 * into Discord, it cannot put that headline into your scanner and your themes.
 * It is also a loop rather than a one-way trip — a ticker on a Theme or an open
 * ScannerEntry is worth +15 in `score.ts`, so curating a row raises the score of
 * the NEXT headline on that ticker. The re-score that closes the loop is wired
 * into the scanner/theme write path itself; see news/watchlist.server.ts.
 *
 * Deliberately a prefilled form rather than a true one-click write. The fields
 * it fills are exactly the ones the headline knows (ticker, date, description);
 * everything a moderator would want to correct — which of several tickers, the
 * setup, which theme — is the part a single click would have to guess.
 *
 * Posts to the EXISTING scanner and theme resource routes, with their existing
 * intents. No parallel write path, so the permission check, the validation and
 * the re-score hook are shared with the scanner and themes pages.
 */

export type CurateMode = 'scanner' | 'theme';

export type CurateTheme = { id: string; name: string };

const SCANNER_ACTION = '/resources/scanner';
const THEMES_ACTION = '/resources/themes';

/** Native selects, not the Radix one: fewer focus traps inside a dialog. */
const selectClass =
  'h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm ' +
  'shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 ' +
  'focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

type ActionData =
  | { success?: boolean; error?: string; result?: unknown }
  | undefined;

export function NewsCurateDialog({
  mode,
  item,
  themes,
  onClose,
}: {
  /** null closes the dialog. */
  mode: CurateMode | null;
  item: NewsFeedItem | null;
  themes: CurateTheme[];
  onClose: () => void;
}) {
  const fetcher = useFetcher<ActionData>();
  const open = mode !== null && item !== null;

  // A row can carry several tickers; the first is the default but not a
  // decision. Reset whenever the dialog is pointed at a different row.
  const [ticker, setTicker] = React.useState('');
  const [themeId, setThemeId] = React.useState('');

  React.useEffect(() => {
    if (!open || !item) return;
    setTicker(item.tickers[0] ?? '');
    setThemeId((current) =>
      themes.some((theme) => theme.id === current) ? current : themes[0]?.id ?? ''
    );
  }, [open, item, themes]);

  // The resource routes answer `{ success: true }` or a 400 carrying a Conform
  // reply. Both arrive here as fetcher data; only close on the first.
  const submitted = React.useRef(false);
  React.useEffect(() => {
    if (fetcher.state === 'submitting') submitted.current = true;
    if (fetcher.state !== 'idle' || !fetcher.data || !submitted.current) return;
    submitted.current = false;

    if (fetcher.data.success) {
      toast.success(
        mode === 'scanner'
          ? `${ticker} sent to Scanner`
          : `${ticker} added to theme`
      );
      onClose();
      return;
    }

    toast.error(
      fetcher.data.error ??
        (mode === 'scanner'
          ? 'Could not create the scanner entry.'
          : 'Could not add the ticker. It may already be in that theme.')
    );
  }, [fetcher.state, fetcher.data, mode, ticker, onClose]);

  if (!open || !item) return null;

  const busy = fetcher.state !== 'idle';
  const isScanner = mode === 'scanner';
  // The trading day the news broke on, not today: an item scrolled back to
  // belongs to its own session.
  const targetDate = tradingDay(item.publishedAt);
  const noThemes = !isScanner && themes.length === 0;

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      {/* bg-card / text-card-foreground, never bg-background: see news-page. */}
      <DialogContent className="border-border bg-card text-card-foreground sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isScanner ? 'Send to Scanner' : 'Add to Theme'}
          </DialogTitle>
          <DialogDescription className="line-clamp-2">
            {item.headline}
          </DialogDescription>
        </DialogHeader>

        {noThemes ? (
          <p className="text-sm text-muted-foreground">
            There are no active themes yet. Create one on the Themes page first.
          </p>
        ) : (
          <fetcher.Form
            method="post"
            action={isScanner ? SCANNER_ACTION : THEMES_ACTION}
            className="grid gap-3"
          >
            <input
              type="hidden"
              name="intent"
              value={isScanner ? 'create' : 'addTicker'}
            />

            {!isScanner && (
              <div className="grid gap-1.5">
                <Label htmlFor="curate-theme">Theme</Label>
                <select
                  id="curate-theme"
                  name="themeId"
                  className={selectClass}
                  value={themeId}
                  onChange={(event) => setThemeId(event.target.value)}
                >
                  {themes.map((theme) => (
                    <option key={theme.id} value={theme.id}>
                      {theme.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="curate-ticker">Ticker</Label>
                {item.tickers.length > 1 ? (
                  <select
                    id="curate-ticker"
                    name="ticker"
                    className={cn(selectClass, 'font-mono')}
                    value={ticker}
                    onChange={(event) => setTicker(event.target.value)}
                  >
                    {item.tickers.map((symbol) => (
                      <option key={symbol} value={symbol}>
                        {symbol}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="curate-ticker"
                    name="ticker"
                    className="font-mono uppercase"
                    value={ticker}
                    onChange={(event) =>
                      setTicker(event.target.value.toUpperCase())
                    }
                    maxLength={10}
                    required
                  />
                )}
              </div>

              {isScanner ? (
                <div className="grid gap-1.5">
                  <Label htmlFor="curate-date">Target date</Label>
                  <Input
                    id="curate-date"
                    name="targetDate"
                    type="date"
                    defaultValue={targetDate}
                    required
                  />
                </div>
              ) : (
                <div className="grid gap-1.5">
                  <Label htmlFor="curate-role">Role</Label>
                  <select
                    id="curate-role"
                    name="role"
                    className={selectClass}
                    defaultValue="SYMPATHY"
                  >
                    <option value="SYMPATHY">Sympathy</option>
                    <option value="LEADER">Leader</option>
                  </select>
                </div>
              )}
            </div>

            {isScanner && (
              <div className="grid gap-1.5">
                <Label htmlFor="curate-setup">Setup type</Label>
                <Input
                  id="curate-setup"
                  name="setupType"
                  // The classifier already decided what kind of event this is;
                  // that is the closest thing the headline has to a setup.
                  defaultValue={item.catalyst}
                  placeholder="Optional"
                />
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="curate-notes">
                {isScanner ? 'Description' : 'Notes'}
              </Label>
              <Textarea
                id="curate-notes"
                name={isScanner ? 'description' : 'notes'}
                rows={3}
                // The headline IS the reason the entry exists, so it is the
                // default rather than an empty box to retype it into.
                defaultValue={`${item.headline} — ${item.url}`}
                required={isScanner}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={onClose}
                disabled={busy}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy || !ticker}>
                {busy && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                {isScanner ? 'Create entry' : 'Add ticker'}
              </Button>
            </DialogFooter>
          </fetcher.Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
