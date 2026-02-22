// app/components/scanner/scanner-entry-card.tsx
import * as React from 'react';
import { useFetcher } from 'react-router';
import { Card, CardContent, CardHeader } from '#/components/ui/card';
import { Button } from '#/components/ui/button';
import { Badge } from '#/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '#/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '#/components/ui/collapsible';
import { ScannerStatusBadge } from './scanner-status-badge';
import {
  Pencil,
  Trash2,
  ChevronDown,
  BarChart3,
  Target,
  Calendar,
  User,
  ArrowRightLeft,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '#/lib/utils';
import { toast } from 'sonner';

type ScannerStatus = 'WATCHING' | 'PLAYED_OUT' | 'DIDNT_PLAY_OUT';

export type ScannerEntry = {
  id: string;
  ticker: string;
  targetDate: string;
  volume: string | null;
  description: string;
  setupType: string | null;
  status: ScannerStatus;
  outcomeNotes: string | null;
  executionGapNotes: string | null;
  priceLevels: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string | null;
    username: string | null;
    image: { id: string } | null;
  };
};

interface ScannerEntryCardProps {
  entry: ScannerEntry;
  canEdit: boolean;
  onEdit: (entry: ScannerEntry) => void;
}

export function ScannerEntryCard({
  entry,
  canEdit,
  onEdit,
}: ScannerEntryCardProps) {
  const statusFetcher = useFetcher();
  const deleteFetcher = useFetcher();
  const [isExpanded, setIsExpanded] = React.useState(false);

  const hasOutcomeDetails = entry.outcomeNotes || entry.executionGapNotes;

  // Handle status change
  const handleStatusChange = (newStatus: string) => {
    statusFetcher.submit(
      { intent: 'updateStatus', id: entry.id, status: newStatus },
      { method: 'post', action: '/resources/scanner' }
    );
    toast.success('Status updated');
  };

  // Handle delete
  const handleDelete = () => {
    deleteFetcher.submit(
      { intent: 'delete', id: entry.id },
      { method: 'post', action: '/resources/scanner' }
    );
    toast.success('Entry deleted');
  };

  const displayName =
    entry.createdBy.username || entry.createdBy.name || 'Unknown';

  return (
    <Card className="group transition-all duration-200 hover:shadow-md border-border/60 gap-0 py-0">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-start justify-between gap-2">
          {/* Left: Ticker + Badges */}
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <span className="text-lg font-bold font-mono tracking-wide">
              {entry.ticker}
            </span>
            <ScannerStatusBadge status={entry.status} />
            {entry.setupType && (
              <Badge variant="secondary" className="text-xs font-medium">
                {entry.setupType}
              </Badge>
            )}
          </div>

          {/* Right: Actions */}
          {canEdit && (
            <div className="flex items-center gap-1 shrink-0">
              {/* Quick status change */}
              <Select
                value={entry.status}
                onValueChange={handleStatusChange}
              >
                <SelectTrigger className="h-8 w-[130px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
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

              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                onClick={() => onEdit(entry)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card text-card-foreground border-border">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete scanner entry?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the{' '}
                      <span className="font-semibold">{entry.ticker}</span>{' '}
                      scanner entry. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="cursor-pointer bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4 pt-0 space-y-3">
        {/* Meta info row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {format(new Date(entry.targetDate), 'MMM d, yyyy')}
          </span>
          {entry.volume && (
            <span className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              Vol: {entry.volume}
            </span>
          )}
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {displayName}
          </span>
        </div>

        {/* Description */}
        <div className="space-y-1">
          <p className="text-sm leading-relaxed">{entry.description}</p>
        </div>

        {/* Price Levels */}
        {entry.priceLevels && (
          <div className="flex items-start gap-2 text-sm rounded-md bg-muted/50 p-2.5">
            <Target className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground whitespace-pre-wrap">
              {entry.priceLevels}
            </span>
          </div>
        )}

        {/* Expandable outcome details */}
        {hasOutcomeDetails && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between h-8 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Outcome Details
                </span>
                <ChevronDown
                  className={cn(
                    'h-3 w-3 transition-transform duration-200',
                    isExpanded && 'rotate-180'
                  )}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-2">
              {entry.outcomeNotes && (
                <div className="space-y-1 rounded-md border border-dashed p-3">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Outcome Notes
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {entry.outcomeNotes}
                  </p>
                </div>
              )}
              {entry.executionGapNotes && (
                <div className="space-y-1 rounded-md border border-dashed p-3">
                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    <ArrowRightLeft className="h-3 w-3" />
                    Execution Gap
                  </p>
                  <p className="text-sm whitespace-pre-wrap">
                    {entry.executionGapNotes}
                  </p>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
