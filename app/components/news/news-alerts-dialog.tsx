import * as React from 'react';
import { useFetcher } from 'react-router';
import { toast } from 'sonner';
import {
  Bell,
  BellOff,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Volume2,
} from 'lucide-react';
import { Button } from '#/components/ui/button';
import { Input } from '#/components/ui/input';
import { Label } from '#/components/ui/label';
import { Switch } from '#/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog';
import { NEWS_CATALYSTS } from '#/utils/news/constants';
import { MAX_WATCH_RULES, type NewsWatchRule } from '#/utils/news/watch';
import {
  disableAlertSound,
  enableAlertSound,
  soundEnabled,
} from '#/utils/news/alert-sound';
import { cn } from '#/lib/utils';

const ACTION = '/resources/news-watch';

/**
 * Watch-rule management.
 *
 * One dialog with two modes — list and edit — rather than a second dialog per
 * rule: these are short rules that get tweaked mid-session, and a modal on top
 * of a modal is a worse place to do that from.
 */
export function NewsAlertsDialog({
  open,
  onOpenChange,
  rules,
  alertThreshold,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rules: NewsWatchRule[];
  alertThreshold: number;
}) {
  const [editing, setEditing] = React.useState<NewsWatchRule | null>(null);
  const [creating, setCreating] = React.useState(false);

  // Reopening lands on the list, never on a half-finished form.
  React.useEffect(() => {
    if (!open) {
      setEditing(null);
      setCreating(false);
    }
  }, [open]);

  const showForm = creating || editing !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card text-card-foreground sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>News alerts</DialogTitle>
          <DialogDescription>
            {showForm
              ? 'A headline fires this rule when it clears the score AND matches the tickers AND matches the catalysts. Leave a list empty to match any.'
              : 'Rules are matched in your browser against the live feed, so they fire anywhere in the app — not only on the news page.'}
          </DialogDescription>
        </DialogHeader>

        {showForm ? (
          <RuleForm
            rule={editing}
            alertThreshold={alertThreshold}
            onDone={() => {
              setEditing(null);
              setCreating(false);
            }}
          />
        ) : (
          <RuleList
            rules={rules}
            onNew={() => setCreating(true)}
            onEdit={setEditing}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function SoundToggle() {
  // Read on mount, not during render: localStorage does not exist on the
  // server, and reading it in the component body breaks hydration.
  const [on, setOn] = React.useState(false);
  React.useEffect(() => setOn(soundEnabled()), []);

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
      <div className="flex items-start gap-2">
        <Volume2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium">Alert sound</p>
          <p className="text-xs text-muted-foreground">
            Browsers only allow audio after a click, so this has to be switched
            on by hand once per browser.
          </p>
        </div>
      </div>
      <Switch
        checked={on}
        onCheckedChange={async (next) => {
          if (!next) {
            disableAlertSound();
            setOn(false);
            return;
          }
          const ok = await enableAlertSound();
          setOn(ok);
          if (!ok) toast.error('This browser will not play alert audio.');
        }}
      />
    </div>
  );
}

function RuleList({
  rules,
  onNew,
  onEdit,
}: {
  rules: NewsWatchRule[];
  onNew: () => void;
  onEdit: (rule: NewsWatchRule) => void;
}) {
  const fetcher = useFetcher();
  useActionToasts(fetcher);

  return (
    <div className="space-y-3">
      <SoundToggle />

      <div className="max-h-[320px] space-y-2 overflow-y-auto">
        {rules.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            No rules yet. A rule turns a matching headline into a toast and a
            ping.
          </p>
        ) : (
          rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-start gap-1 rounded-md border px-3 py-2"
            >
              <div className="min-w-0 flex-1 pt-1.5">
                <p
                  className={cn(
                    'truncate text-sm font-medium',
                    !rule.enabled && 'text-muted-foreground line-through'
                  )}
                >
                  {rule.label}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {describeRule(rule)}
                </p>
              </div>

              <fetcher.Form method="post" action={ACTION}>
                <input type="hidden" name="id" value={rule.id} />
                <Button
                  type="submit"
                  name="intent"
                  value="toggle"
                  variant="ghost"
                  size="icon"
                  title={rule.enabled ? 'Disable' : 'Enable'}
                >
                  {rule.enabled ? (
                    <Bell className="size-4" />
                  ) : (
                    <BellOff className="size-4 text-muted-foreground" />
                  )}
                </Button>
              </fetcher.Form>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Edit"
                onClick={() => onEdit(rule)}
              >
                <Pencil className="size-4" />
              </Button>

              <fetcher.Form method="post" action={ACTION}>
                <input type="hidden" name="id" value={rule.id} />
                <Button
                  type="submit"
                  name="intent"
                  value="delete"
                  variant="ghost"
                  size="icon"
                  title="Delete"
                >
                  <Trash2 className="size-4 text-red-600 dark:text-red-400" />
                </Button>
              </fetcher.Form>
            </div>
          ))
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          onClick={onNew}
          disabled={rules.length >= MAX_WATCH_RULES}
        >
          <Plus className="mr-1 size-4" />
          New rule
        </Button>
      </DialogFooter>
    </div>
  );
}

function RuleForm({
  rule,
  alertThreshold,
  onDone,
}: {
  rule: NewsWatchRule | null;
  alertThreshold: number;
  onDone: () => void;
}) {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state !== 'idle';
  useActionToasts(fetcher, onDone);

  const selected = new Set<string>(rule?.catalysts ?? []);

  return (
    <fetcher.Form method="post" action={ACTION} className="space-y-4">
      <input type="hidden" name="intent" value={rule ? 'update' : 'create'} />
      {rule && <input type="hidden" name="id" value={rule.id} />}

      <div className="space-y-2">
        <Label htmlFor="label">Name</Label>
        <Input
          id="label"
          name="label"
          required
          maxLength={40}
          placeholder="e.g. My positions"
          defaultValue={rule?.label ?? ''}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tickers">Tickers</Label>
        <Input
          id="tickers"
          name="tickers"
          placeholder="AAPL TSLA SNTI — comma or space separated, blank for any"
          className="font-mono uppercase"
          defaultValue={rule?.tickers?.join(' ') ?? ''}
        />
      </div>

      <div className="space-y-2">
        <Label>Catalysts</Label>
        <div className="flex flex-wrap gap-1">
          {NEWS_CATALYSTS.map((catalyst) => (
            // A real checkbox, styled: repeated `catalysts` fields post as an
            // array, with no client state to keep in sync.
            <label
              key={catalyst}
              className="cursor-pointer rounded border border-border px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground transition hover:bg-accent has-[:checked]:border-sky-500 has-[:checked]:bg-sky-500/15 has-[:checked]:text-sky-700 dark:has-[:checked]:text-sky-300"
            >
              <input
                type="checkbox"
                name="catalysts"
                value={catalyst}
                defaultChecked={selected.has(catalyst)}
                className="sr-only"
              />
              {catalyst}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          None selected = any catalyst.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="minScore">Minimum score</Label>
        <Input
          id="minScore"
          name="minScore"
          type="number"
          min={0}
          max={100}
          className="w-28"
          defaultValue={rule?.minScore ?? alertThreshold}
        />
        <p className="text-xs text-muted-foreground">
          {alertThreshold} is the threshold the feed itself highlights at.
        </p>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="sound"
            defaultChecked={rule?.sound ?? true}
          />
          Play a sound
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="enabled"
            defaultChecked={rule?.enabled ?? true}
          />
          Enabled
        </label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-1 size-4 animate-spin" />}
          {rule ? 'Save rule' : 'Create rule'}
        </Button>
      </DialogFooter>
    </fetcher.Form>
  );
}

/**
 * Surfaces an action's outcome once per response.
 *
 * The identity guard is the one theme-form uses: `fetcher.data` keeps its value
 * after the state returns to idle, so without comparing identity the effect
 * toasts again on every unrelated re-render.
 */
function useActionToasts(
  fetcher: ReturnType<typeof useFetcher>,
  onSuccess?: () => void
) {
  const handled = React.useRef<unknown>(null);

  React.useEffect(() => {
    if (!fetcher.data || fetcher.state !== 'idle') return;
    if (fetcher.data === handled.current) return;
    handled.current = fetcher.data;

    const result = fetcher.data as {
      success?: boolean;
      error?: string;
      result?: { error?: Record<string, string[] | null> };
    };

    if (result.success) {
      onSuccess?.();
      return;
    }

    const fieldError = result.result?.error
      ? Object.values(result.result.error).flat().filter(Boolean)[0]
      : null;
    toast.error(result.error ?? fieldError ?? 'Could not save that rule.');
  }, [fetcher.data, fetcher.state, onSuccess]);
}

/** One-line summary of what a rule fires on. */
function describeRule(rule: NewsWatchRule): string {
  const parts: string[] = [];

  parts.push(
    !rule.tickers?.length
      ? 'any ticker'
      : rule.tickers.length > 4
        ? `${rule.tickers.slice(0, 4).join(', ')} +${rule.tickers.length - 4}`
        : rule.tickers.join(', ')
  );
  parts.push(
    rule.catalysts?.length ? rule.catalysts.join(', ') : 'any catalyst'
  );
  if (rule.minScore > 0) parts.push(`score ≥ ${rule.minScore}`);
  if (!rule.sound) parts.push('silent');

  return parts.join(' · ');
}
