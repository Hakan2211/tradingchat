// app/components/scanner/scanner-entry-form.tsx
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
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type ScannerStatus = 'WATCHING' | 'PLAYED_OUT' | 'DIDNT_PLAY_OUT';

export type ScannerEntryData = {
  id: string;
  ticker: string;
  targetDate: string;
  volume: string | null;
  description: string;
  setupType: string | null;
  status: ScannerStatus;
  outcomeNotes: string | null;
  executionGapNotes: string | null;
  priceLevels: string | null;
};

interface ScannerEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: ScannerEntryData | null;
  defaultDate?: Date;
}

const SETUP_TYPES = [
  'Breakout',
  'Gap Up',
  'Gap Down',
  'Earnings',
  'Catalyst',
  'Reversal',
  'Continuation',
  'Squeeze',
  'Momentum',
  'Liquidity Play',
  'Inside Bar',
  'Multi-Day Runner',
  'Other',
] as const;

export function ScannerEntryForm({
  open,
  onOpenChange,
  initialData,
  defaultDate,
}: ScannerEntryFormProps) {
  const fetcher = useFetcher();
  const isEditing = !!initialData;
  const isSubmitting = fetcher.state !== 'idle';

  const [status, setStatus] = React.useState<ScannerStatus>(
    initialData?.status ?? 'WATCHING'
  );

  // Reset form state when dialog opens with new data
  React.useEffect(() => {
    if (open) {
      setStatus(initialData?.status ?? 'WATCHING');
    }
  }, [open, initialData?.status]);

  // Close dialog on successful submission (ref guard prevents infinite loop)
  const lastHandledData = React.useRef<unknown>(null);

  React.useEffect(() => {
    if (
      fetcher.data &&
      fetcher.state === 'idle' &&
      fetcher.data !== lastHandledData.current
    ) {
      const data = fetcher.data as { success?: boolean };
      if (data.success) {
        lastHandledData.current = fetcher.data;
        toast.success(
          isEditing
            ? 'Scanner entry updated successfully'
            : 'Scanner entry created successfully'
        );
        onOpenChange(false);
      }
    }
  }, [fetcher.data, fetcher.state, isEditing, onOpenChange]);

  const showOutcomeFields = status !== 'WATCHING';

  const dateValue = initialData
    ? format(new Date(initialData.targetDate), 'yyyy-MM-dd')
    : defaultDate
      ? format(defaultDate, 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-card text-card-foreground border-border">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Scanner Entry' : 'Add Scanner Entry'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the ticker details and outcome notes.'
              : 'Add a new ticker to the scanner watchlist.'}
          </DialogDescription>
        </DialogHeader>

        <fetcher.Form method="post" action="/resources/scanner">
          <input
            type="hidden"
            name="intent"
            value={isEditing ? 'update' : 'create'}
          />
          {isEditing && (
            <input type="hidden" name="id" value={initialData.id} />
          )}

          <div className="space-y-5 py-4">
            {/* Ticker & Date Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ticker" className="text-sm font-medium">
                  Ticker Symbol *
                </Label>
                <Input
                  id="ticker"
                  name="ticker"
                  placeholder="e.g., AAPL"
                  required
                  className="h-10 uppercase"
                  defaultValue={initialData?.ticker ?? ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetDate" className="text-sm font-medium">
                  Target Date *
                </Label>
                <Input
                  id="targetDate"
                  name="targetDate"
                  type="date"
                  required
                  className="h-10"
                  defaultValue={dateValue}
                />
              </div>
            </div>

            {/* Volume & Setup Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="volume" className="text-sm font-medium">
                  Volume
                </Label>
                <Input
                  id="volume"
                  name="volume"
                  placeholder="e.g., 2.5M"
                  className="h-10"
                  defaultValue={initialData?.volume ?? ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="setupType" className="text-sm font-medium">
                  Setup Type
                </Label>
                <Select
                  name="setupType"
                  defaultValue={initialData?.setupType ?? ''}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Select setup..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SETUP_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">
                Description / Thesis *
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Why is this ticker on the scanner? What are you looking for?"
                required
                rows={3}
                className="resize-none"
                defaultValue={initialData?.description ?? ''}
              />
            </div>

            {/* Price Levels */}
            <div className="space-y-2">
              <Label htmlFor="priceLevels" className="text-sm font-medium">
                Key Price Levels
              </Label>
              <Textarea
                id="priceLevels"
                name="priceLevels"
                placeholder="Support/resistance levels, entry/exit targets..."
                rows={2}
                className="resize-none"
                defaultValue={initialData?.priceLevels ?? ''}
              />
            </div>

            {/* Status (only shown when editing) */}
            {isEditing && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-sm font-medium">
                    Status
                  </Label>
                  <Select
                    name="status"
                    value={status}
                    onValueChange={(v) => setStatus(v as ScannerStatus)}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WATCHING">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                          Watching
                        </div>
                      </SelectItem>
                      <SelectItem value="PLAYED_OUT">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500" />
                          Played Out
                        </div>
                      </SelectItem>
                      <SelectItem value="DIDNT_PLAY_OUT">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500" />
                          Didn't Play Out
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Outcome fields - shown when status is not WATCHING */}
                {showOutcomeFields && (
                  <div className="space-y-4 rounded-lg border border-dashed p-4 bg-muted/30">
                    <p className="text-sm font-medium text-muted-foreground">
                      Post-Outcome Review
                    </p>
                    <div className="space-y-2">
                      <Label
                        htmlFor="outcomeNotes"
                        className="text-sm font-medium"
                      >
                        Outcome Notes
                      </Label>
                      <Textarea
                        id="outcomeNotes"
                        name="outcomeNotes"
                        placeholder="How did this play out? What happened?"
                        rows={3}
                        className="resize-none"
                        defaultValue={initialData?.outcomeNotes ?? ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="executionGapNotes"
                        className="text-sm font-medium"
                      >
                        Execution Gap
                      </Label>
                      <Textarea
                        id="executionGapNotes"
                        name="executionGapNotes"
                        placeholder="What was the gap between the plan and actual execution?"
                        rows={3}
                        className="resize-none"
                        defaultValue={initialData?.executionGapNotes ?? ''}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
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
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer bg-secondary text-secondary-foreground hover:bg-secondary/80">
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isSubmitting
                ? 'Saving...'
                : isEditing
                  ? 'Update Entry'
                  : 'Add Entry'}
            </Button>
          </DialogFooter>
        </fetcher.Form>
      </DialogContent>
    </Dialog>
  );
}
