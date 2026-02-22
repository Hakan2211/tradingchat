// app/components/scanner/scanner-page.tsx
import * as React from 'react';
import { ScannerCalendar } from './scanner-calendar';
import { ScannerEntryList } from './scanner-entry-list';
import {
  ScannerEntryForm,
  type ScannerEntryData,
} from './scanner-entry-form';
import type { ScannerEntry } from './scanner-entry-card';
import { Radar } from 'lucide-react';

interface ScannerPageProps {
  entries: ScannerEntry[];
  datesWithEntries: string[];
  canEdit: boolean;
}

export function ScannerPage({
  entries,
  datesWithEntries,
  canEdit,
}: ScannerPageProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(
    new Date()
  );
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingEntry, setEditingEntry] = React.useState<ScannerEntryData | null>(null);
  const [defaultDate, setDefaultDate] = React.useState<Date | undefined>();

  // Handle adding a new entry from the calendar
  const handleAddEntry = React.useCallback((date: Date) => {
    setEditingEntry(null);
    setDefaultDate(date);
    setFormOpen(true);
  }, []);

  // Handle editing an existing entry
  const handleEditEntry = React.useCallback((entry: ScannerEntry) => {
    setEditingEntry({
      id: entry.id,
      ticker: entry.ticker,
      targetDate: entry.targetDate,
      volume: entry.volume,
      description: entry.description,
      setupType: entry.setupType,
      status: entry.status,
      outcomeNotes: entry.outcomeNotes,
      executionGapNotes: entry.executionGapNotes,
      priceLevels: entry.priceLevels,
    });
    setDefaultDate(undefined);
    setFormOpen(true);
  }, []);

  const handleFormOpenChange = React.useCallback((open: boolean) => {
    setFormOpen(open);
  }, []);

  return (
    <div className="min-h-full bg-card">
      {/* Header */}
      <div className="border-b bg-card/95 backdrop-blur-sm">
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Radar className="h-6 w-6 text-muted-foreground/80" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Scanner</h1>
              <p className="text-sm text-muted-foreground font-medium">
                Track and review ticker setups across trading days
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="p-6 md:p-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Panel: Calendar */}
          <div className="lg:w-[320px] shrink-0">
            <div className="lg:sticky lg:top-6">
              <ScannerCalendar
                datesWithEntries={datesWithEntries}
                canEdit={canEdit}
                onAddEntry={handleAddEntry}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
              />
            </div>
          </div>

          {/* Right Panel: Entry List */}
          <div className="flex-1 min-w-0">
            <ScannerEntryList
              entries={entries}
              canEdit={canEdit}
              onEdit={handleEditEntry}
            />
          </div>
        </div>
      </div>

      {/* Add/Edit Form Dialog */}
      <ScannerEntryForm
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        initialData={editingEntry}
        defaultDate={defaultDate}
      />
    </div>
  );
}
