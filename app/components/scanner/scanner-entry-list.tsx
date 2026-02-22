// app/components/scanner/scanner-entry-list.tsx
import * as React from 'react';
import { Input } from '#/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select';
import { ScannerEntryCard, type ScannerEntry } from './scanner-entry-card';
import { Search, SlidersHorizontal, Radar } from 'lucide-react';

interface ScannerEntryListProps {
  entries: ScannerEntry[];
  canEdit: boolean;
  onEdit: (entry: ScannerEntry) => void;
}

export function ScannerEntryList({
  entries,
  canEdit,
  onEdit,
}: ScannerEntryListProps) {
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  const filteredEntries = React.useMemo(() => {
    return entries.filter((entry) => {
      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch =
        !search ||
        entry.ticker.toLowerCase().includes(searchLower) ||
        entry.description.toLowerCase().includes(searchLower) ||
        (entry.setupType?.toLowerCase().includes(searchLower) ?? false);

      // Status filter
      const matchesStatus =
        statusFilter === 'all' || entry.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [entries, search, statusFilter]);

  // Count by status
  const watchingCount = entries.filter(
    (e) => e.status === 'WATCHING'
  ).length;
  const playedOutCount = entries.filter(
    (e) => e.status === 'PLAYED_OUT'
  ).length;
  const didntPlayCount = entries.filter(
    (e) => e.status === 'DIDNT_PLAY_OUT'
  ).length;

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Scanner List
        </h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            {watchingCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            {playedOutCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            {didntPlayCount}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tickers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-8 text-sm"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[140px] text-xs">
            <SlidersHorizontal className="h-3 w-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
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
                Didn't Play
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Entry list */}
      <div className="space-y-3">
        {filteredEntries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-3 rounded-full bg-muted/50 mb-3">
              <Radar className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {entries.length === 0
                ? 'No scanner entries yet'
                : 'No entries match your filters'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {entries.length === 0
                ? 'Add tickers to start tracking'
                : 'Try adjusting your search or filter'}
            </p>
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <ScannerEntryCard
              key={entry.id}
              entry={entry}
              canEdit={canEdit}
              onEdit={onEdit}
            />
          ))
        )}
      </div>
    </div>
  );
}
