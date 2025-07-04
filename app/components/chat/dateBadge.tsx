import { cn } from '#/lib/utils';
import { isToday, isYesterday, format, isSameDay } from 'date-fns';
import { useHydrated } from 'remix-utils/use-hydrated';

export function DateBadge({
  date,
  className,
}: {
  date: Date;
  className?: string;
}) {
  const isHydrated = useHydrated();

  const getFormattedDate = (d: Date): string => {
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMMM d, yyyy'); // A more readable format
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
  // This logic is safe as it runs on both server and client with the same data
  return (
    !previousMessageDate ||
    !isSameDay(new Date(currentMessageDate), new Date(previousMessageDate))
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
      {format(new Date(date), formatStr)}
      {suffix}
    </>
  ) : (
    fallback
  );

  return <span className={className}>{content}</span>;
}
