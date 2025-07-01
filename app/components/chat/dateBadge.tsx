import { isToday, isYesterday, format, isSameDay } from 'date-fns';
import * as React from 'react';

export function DateBadge({ date }: { date: Date }) {
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
  }, []);

  const getFormattedDate = (d: Date): string => {
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMMM d, yyyy'); // A more readable format
  };

  return (
    <div className="relative text-center">
      <hr className="absolute left-0 top-1/2 w-full -translate-y-1/2 border-border" />
      <span className="relative z-10 inline-block rounded-full bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
        {/*
          This is the key change:
          - On the server, this will render an empty span content.
          - On the initial client render, it will also be empty, matching the server.
          - After mounting, `isClient` becomes true, and the correctly formatted date is rendered.
        */}
        {isClient ? getFormattedDate(new Date(date)) : '...'}
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
