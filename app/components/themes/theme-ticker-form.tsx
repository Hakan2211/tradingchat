// app/components/themes/theme-ticker-form.tsx
import * as React from 'react';
import { useFetcher } from 'react-router';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { Textarea } from '#/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import { Loader2, Crown, Users } from 'lucide-react';
import { toast } from 'sonner';

type TickerRole = 'LEADER' | 'SYMPATHY';

export type ThemeTickerFormData = {
  id: string;
  ticker: string;
  role: TickerRole;
  float: string | null;
  volume: string | null;
  marketCap: string | null;
  priceAtAdd: string | null;
  notes: string | null;
  sortOrder: number;
};

interface ThemeTickerFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  themeId: string;
  themeName: string;
  initialData?: ThemeTickerFormData | null;
}

export function ThemeTickerForm({
  open,
  onOpenChange,
  themeId,
  themeName,
  initialData,
}: ThemeTickerFormProps) {
  const fetcher = useFetcher();
  const isEditing = !!initialData;
  const isSubmitting = fetcher.state !== 'idle';

  const lastHandledData = React.useRef<unknown>(null);

  React.useEffect(() => {
    if (
      fetcher.data &&
      fetcher.state === 'idle' &&
      fetcher.data !== lastHandledData.current
    ) {
      const fetcherData = fetcher.data as { success?: boolean; result?: { error?: Record<string, string[]> } };
      if (fetcherData.success) {
        lastHandledData.current = fetcher.data;
        toast.success(
          isEditing
            ? 'Ticker updated successfully'
            : 'Ticker added successfully'
        );
        onOpenChange(false);
      } else if (fetcherData.result?.error) {
        lastHandledData.current = fetcher.data;
      }
    }
  }, [fetcher.data, fetcher.state, isEditing, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Ticker' : 'Add Ticker'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? `Update ticker details in the "${themeName}" theme.`
              : `Add a new ticker to the "${themeName}" theme.`}
          </DialogDescription>
        </DialogHeader>

        <fetcher.Form method="post" action="/resources/themes">
          <input
            type="hidden"
            name="intent"
            value={isEditing ? 'updateTicker' : 'addTicker'}
          />
          {isEditing ? (
            <input type="hidden" name="id" value={initialData.id} />
          ) : (
            <input type="hidden" name="themeId" value={themeId} />
          )}

          <div className="space-y-5 py-4">
            {/* Ticker & Role Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ticker" className="text-sm font-medium">
                  Ticker Symbol *
                </Label>
                <Input
                  id="ticker"
                  name="ticker"
                  placeholder="e.g., XOM"
                  required
                  className="h-10 uppercase"
                  defaultValue={initialData?.ticker ?? ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium">
                  Role *
                </Label>
                <Select
                  name="role"
                  defaultValue={initialData?.role ?? 'SYMPATHY'}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEADER">
                      <div className="flex items-center gap-2">
                        <Crown className="h-3.5 w-3.5 text-amber-500" />
                        Leader
                      </div>
                    </SelectItem>
                    <SelectItem value="SYMPATHY">
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-blue-500" />
                        Sympathy
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Float & Volume */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="float" className="text-sm font-medium">
                  Float
                </Label>
                <Input
                  id="float"
                  name="float"
                  placeholder="e.g., 2.5M"
                  className="h-10"
                  defaultValue={initialData?.float ?? ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="volume" className="text-sm font-medium">
                  Volume
                </Label>
                <Input
                  id="volume"
                  name="volume"
                  placeholder="e.g., 10M"
                  className="h-10"
                  defaultValue={initialData?.volume ?? ''}
                />
              </div>
            </div>

            {/* Market Cap & Price at Add */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="marketCap" className="text-sm font-medium">
                  Market Cap
                </Label>
                <Input
                  id="marketCap"
                  name="marketCap"
                  placeholder="e.g., 450B"
                  className="h-10"
                  defaultValue={initialData?.marketCap ?? ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priceAtAdd" className="text-sm font-medium">
                  Price at Add
                </Label>
                <Input
                  id="priceAtAdd"
                  name="priceAtAdd"
                  placeholder="e.g., $105.50"
                  className="h-10"
                  defaultValue={initialData?.priceAtAdd ?? ''}
                />
              </div>
            </div>

            {/* Sort Order */}
            <div className="w-1/2">
              <div className="space-y-2">
                <Label htmlFor="sortOrder" className="text-sm font-medium">
                  Sort Order
                </Label>
                <Input
                  id="sortOrder"
                  name="sortOrder"
                  type="number"
                  placeholder="0"
                  className="h-10"
                  defaultValue={initialData?.sortOrder ?? ''}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-sm font-medium">
                Notes
              </Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Why is this ticker in this theme? Key levels, catalysts..."
                rows={3}
                className="resize-none"
                defaultValue={initialData?.notes ?? ''}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting
                ? 'Saving...'
                : isEditing
                  ? 'Update Ticker'
                  : 'Add Ticker'}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
