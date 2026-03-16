// app/components/themes/theme-ticker-list.tsx
import * as React from 'react';
import { useFetcher } from 'react-router';
import { Button } from '#/components/ui/button';
import { TickerRoleBadge } from './ticker-role-badge';
import type { ThemeTickerFormData } from './theme-ticker-form';
import {
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  Layers,
  BarChart3,
  DollarSign,
  Scale,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog';

export type ThemeTickerItem = {
  id: string;
  ticker: string;
  role: 'LEADER' | 'SYMPATHY';
  float: string | null;
  volume: string | null;
  marketCap: string | null;
  priceAtAdd: string | null;
  notes: string | null;
  sortOrder: number;
  addedBy: {
    id: string;
    name: string | null;
    username: string | null;
  };
};

interface ThemeTickerListProps {
  themeName: string;
  themeId: string;
  tickers: ThemeTickerItem[];
  canEdit: boolean;
  onAddTicker: () => void;
  onEditTicker: (ticker: ThemeTickerItem) => void;
}

export function ThemeTickerList({
  themeName,
  themeId,
  tickers,
  canEdit,
  onAddTicker,
  onEditTicker,
}: ThemeTickerListProps) {
  const deleteFetcher = useFetcher();
  const [deleteTickerId, setDeleteTickerId] = React.useState<string | null>(
    null
  );

  // Handle delete success
  const lastDeleteData = React.useRef<unknown>(null);
  React.useEffect(() => {
    if (
      deleteFetcher.data &&
      deleteFetcher.state === 'idle' &&
      deleteFetcher.data !== lastDeleteData.current
    ) {
      const fetcherData = deleteFetcher.data as { success?: boolean };
      if (fetcherData.success) {
        lastDeleteData.current = deleteFetcher.data;
        toast.success('Ticker removed successfully');
      }
    }
  }, [deleteFetcher.data, deleteFetcher.state]);

  // Sort tickers: leaders first, then by sortOrder
  const sortedTickers = [...tickers].sort((a, b) => {
    if (a.role === 'LEADER' && b.role !== 'LEADER') return -1;
    if (a.role !== 'LEADER' && b.role === 'LEADER') return 1;
    return a.sortOrder - b.sortOrder;
  });

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{themeName}</h2>
          <p className="text-sm text-muted-foreground">
            {tickers.length} {tickers.length === 1 ? 'ticker' : 'tickers'}
          </p>
        </div>
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            onClick={onAddTicker}
            className="gap-1.5 cursor-pointer bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground"
          >
            <Plus className="h-4 w-4" />
            Add Ticker
          </Button>
        )}
      </div>

      {/* Ticker Cards */}
      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {sortedTickers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 rounded-xl bg-muted/50 p-3">
              <Layers className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="font-medium text-muted-foreground">
              No tickers in this theme yet
            </p>
            {canEdit && (
              <p className="mt-1 text-sm text-muted-foreground/70">
                Click "Add Ticker" to get started
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {sortedTickers.map((ticker) => (
              <div
                key={ticker.id}
                className="group rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/20"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Ticker info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Ticker name + role */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-lg font-bold tracking-wide">
                        {ticker.ticker}
                      </span>
                      <TickerRoleBadge role={ticker.role} />
                    </div>

                    {/* Data grid */}
                    <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                      {ticker.float && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Scale className="h-3.5 w-3.5" />
                          <span className="text-xs text-muted-foreground/70">Float:</span>
                          <span className="font-medium text-foreground">
                            {ticker.float}
                          </span>
                        </div>
                      )}
                      {ticker.volume && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <BarChart3 className="h-3.5 w-3.5" />
                          <span className="text-xs text-muted-foreground/70">Vol:</span>
                          <span className="font-medium text-foreground">
                            {ticker.volume}
                          </span>
                        </div>
                      )}
                      {ticker.marketCap && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span className="text-xs text-muted-foreground/70">MCap:</span>
                          <span className="font-medium text-foreground">
                            {ticker.marketCap}
                          </span>
                        </div>
                      )}
                      {ticker.priceAtAdd && (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <TrendingUp className="h-3.5 w-3.5" />
                          <span className="text-xs text-muted-foreground/70">Price:</span>
                          <span className="font-medium text-foreground">
                            {ticker.priceAtAdd}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {ticker.notes && (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {ticker.notes}
                      </p>
                    )}
                  </div>

                  {/* Right: Actions */}
                  {canEdit && (
                    <div className="shrink-0 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 cursor-pointer hover:bg-accent"
                        onClick={() => onEditTicker(ticker)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 cursor-pointer text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeleteTickerId(ticker.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTickerId}
        onOpenChange={(open) => {
          if (!open) setDeleteTickerId(null);
        }}
      >
        <AlertDialogContent className="bg-card text-card-foreground border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Ticker</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this ticker from the theme? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (deleteTickerId) {
                  deleteFetcher.submit(
                    { intent: 'removeTicker', id: deleteTickerId },
                    { method: 'post', action: '/resources/themes' }
                  );
                  setDeleteTickerId(null);
                }
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
