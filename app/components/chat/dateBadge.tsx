import { isToday, isYesterday, format, isSameDay } from 'date-fns';
import { useHydrated } from 'remix-utils/use-hydrated';

export function DateBadge({ date }: { date: Date }) {
  const isHydrated = useHydrated();

  const getFormattedDate = (d: Date): string => {
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMMM d, yyyy'); // A more readable format
  };

  return (
    <div className="relative text-center">
      <hr className="absolute left-0 top-1/2 w-full -translate-y-1/2 border-border" />
      <span className="relative z-10 inline-block rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
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
