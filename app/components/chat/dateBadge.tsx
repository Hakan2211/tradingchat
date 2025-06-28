import { isToday, isYesterday, format, isSameDay } from 'date-fns';

export function DateBadge({ date }: { date: Date }) {
  const getFormattedDate = (d: Date): string => {
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MM/dd/yyyy');
  };

  return (
    <div className="relative text-center">
      <hr className="absolute left-0 top-1/2 w-full -translate-y-1/2 border-border" />
      <span className="relative z-10 inline-block rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
        {getFormattedDate(date)}
      </span>
    </div>
  );
}

export function shouldShowDateBadge(
  currentMessageDate: Date,
  previousMessageDate: Date | null
): boolean {
  return (
    !previousMessageDate || !isSameDay(currentMessageDate, previousMessageDate)
  );
}
