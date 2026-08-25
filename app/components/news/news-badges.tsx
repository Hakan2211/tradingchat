import { cn } from '#/lib/utils';

/**
 * Badges for the news feed. Colour carries meaning here, so the mapping is
 * deliberate rather than decorative:
 *
 *   - Dilution (OFFERING / SHELF / REVERSE_SPLIT) is amber-to-red. On a
 *     low-float name it is the trade, and it is bad news for holders.
 *   - Halts are red, resumptions green — matching how a trader reads them.
 *   - Everything unclassified is muted, so it recedes.
 *
 * Same shape as scanner-status-badge so the two pages read as one app.
 */

const CATALYST_STYLES: Record<string, string> = {
  OFFERING: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  SHELF: 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30',
  REVERSE_SPLIT: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  HALT: 'bg-red-600/20 text-red-700 dark:text-red-300 border-red-600/40',
  RESUMPTION: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  FDA: 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30',
  MERGER: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  CONTRACT: 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30',
  EARNINGS: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  INSIDER: 'bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30',
  UPLISTING: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  OTHER: 'bg-muted text-muted-foreground border-border',
};

const CATALYST_LABELS: Record<string, string> = {
  REVERSE_SPLIT: 'R/S',
  RESUMPTION: 'RESUMED',
};

export function CatalystBadge({ catalyst }: { catalyst: string }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide',
        CATALYST_STYLES[catalyst] ?? CATALYST_STYLES.OTHER
      )}
    >
      {CATALYST_LABELS[catalyst] ?? catalyst}
    </span>
  );
}

/**
 * The ticker is the most scannable thing on a row, so it gets an explicit
 * colour pair rather than `text-primary` — `--primary` is a dark navy in this
 * app's dark theme, which rendered the chips invisible against the dark card.
 */
export function TickerChip({ ticker }: { ticker: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded bg-sky-500/15 px-1.5 py-0.5 font-mono text-[11px] font-bold text-sky-700 dark:text-sky-300">
      {ticker}
    </span>
  );
}

/**
 * The source badge exists mainly to mark PROMOTIONAL wires. A paid-placement
 * release presented with the same weight as an 8-K teaches people to get run
 * over, so the tier is always visible on those.
 */
export function SourceBadge({
  feedName,
  tier,
}: {
  feedName: string;
  tier: string | null;
}) {
  const promotional = tier === 'PROMOTIONAL';
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px]',
        promotional
          ? 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-500 font-medium'
          : 'text-muted-foreground'
      )}
      title={promotional ? 'Paid-placement wire — treat with caution' : feedName}
    >
      {promotional ? '⚠ ' : ''}
      {feedName}
    </span>
  );
}

/** Score pill. Only draws attention at or above the alert threshold. */
export function ScorePill({ score, threshold }: { score: number; threshold: number }) {
  const hot = score >= threshold;
  return (
    <span
      className={cn(
        'inline-flex w-8 shrink-0 justify-center rounded px-1 py-0.5 font-mono text-[11px] tabular-nums',
        hot
          ? 'bg-primary text-primary-foreground font-bold'
          : 'text-muted-foreground/60'
      )}
      title={`Priority score ${score}`}
    >
      {score}
    </span>
  );
}
