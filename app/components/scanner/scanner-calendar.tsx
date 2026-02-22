// app/components/scanner/scanner-calendar.tsx
import * as React from 'react';
import { DayButton } from 'react-day-picker';
import { Calendar, CalendarDayButton } from '#/components/ui/calendar';
import { Button } from '#/components/ui/button';
import { PlusCircle } from 'lucide-react';

interface ScannerCalendarProps {
  datesWithEntries: string[];
  canEdit: boolean;
  onAddEntry: (date: Date) => void;
  selectedDate: Date | undefined;
  onSelectDate: (date: Date | undefined) => void;
}

export function ScannerCalendar({
  datesWithEntries,
  canEdit,
  onAddEntry,
  selectedDate,
  onSelectDate,
}: ScannerCalendarProps) {
  // Convert date strings to a Set for O(1) lookups
  const entryDatesSet = React.useMemo(
    () => new Set(datesWithEntries),
    [datesWithEntries]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Calendar
        </h3>
        {canEdit && selectedDate && (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs cursor-pointer bg-card text-card-foreground border-border"
            onClick={() => onAddEntry(selectedDate)}
          >
            <PlusCircle className="h-3 w-3 mr-1" />
            Add to{' '}
            {selectedDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </Button>
        )}
      </div>

      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={onSelectDate}
        className="rounded-xl border shadow-sm w-full bg-card text-card-foreground"
        components={{
          DayButton: (props: React.ComponentProps<typeof DayButton>) => {
            const dateStr = `${props.day.date.getFullYear()}-${String(props.day.date.getMonth() + 1).padStart(2, '0')}-${String(props.day.date.getDate()).padStart(2, '0')}`;
            const hasEntries = entryDatesSet.has(dateStr);

            return (
              <div className="relative w-full h-full">
                <CalendarDayButton {...props} />
                {hasEntries && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5 pointer-events-none">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                )}
              </div>
            );
          },
        }}
      />

      {canEdit && (
        <Button
          variant="secondary"
          className="w-full cursor-pointer"
          onClick={() => onAddEntry(selectedDate || new Date())}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Add New Entry
        </Button>
      )}
    </div>
  );
}
