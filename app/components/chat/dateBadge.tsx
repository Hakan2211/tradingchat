import { cn } from '#/lib/utils';
import { format } from 'date-fns';
import { useHydrated } from 'remix-utils/use-hydrated';
import {
  currentTradingDay,
  shiftTradingDay,
  toTradingWallClock,
  tradingDay,
} from '#/utils/trading-time';

export function DateBadge({
  date,
  className,
}: {
  date: Date;
  className?: string;
}) {
  const isHydrated = useHydrated();

  // Days are New York trading days, so the separator labels the same day the
  // loader queried — the viewer's own midnight is irrelevant here.
  const getFormattedDate = (d: Date): string => {
    const day = tradingDay(d);
    const today = currentTradingDay();
    if (day === today) return 'Today';
    if (day === shiftTradingDay(today, -1)) return 'Yesterday';
    return format(toTradingWallClock(d), 'MMMM d, yyyy'); // A more readable format
  };

  return (
    <div className={cn('relative text-center my-4', className)}>
      <hr className="absolute left-0 top-1/2 w-full -translate-y-1/2 border-border/50" />
      <span className="relative z-10 inline-block rounded-full bg-card px-3 border border-border/50 py-1 text-xs font-medium text-muted-foreground/80">
        {isHydrated ? getFormattedDate(new Date(date)) : '...'}
      </span>
    </div>
  );
}

export function shouldShowDateBadge(
  currentMessageDate: Date,
  previousMessageDate: Date | null
): boolean {
  // Safe to run on both server and client: the trading day of an instant does
  // not depend on where the code runs, so SSR and hydration always agree.
  return (
    !previousMessageDate ||
    tradingDay(currentMessageDate) !== tradingDay(previousMessageDate)
  );
}

type HydratedDateProps = {
  date: Date;
  formatStr: string;
  fallback?: React.ReactNode;
  className?: string;
  prefix?: string;
  suffix?: string;
};

export function HydratedDate({
  date,
  formatStr,
  fallback = '...', // A sensible default fallback
  className,
  prefix,
  suffix,
}: HydratedDateProps) {
  const isHydrated = useHydrated();

  const content = isHydrated ? (
    <>
      {prefix}
      {/* Rendered in New York time — a message stamped 09:31 is 09:31 at the
          opening bell, whatever timezone the reader is sitting in. */}
      {format(toTradingWallClock(date), formatStr)}
      {suffix}
    </>
  ) : (
    fallback
  );

  return <span className={className}>{content}</span>;
}
