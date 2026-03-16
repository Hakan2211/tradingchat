// app/components/themes/theme-list.tsx
import * as React from 'react';
import { useFetcher } from 'react-router';
import { Button } from '#/components/ui/button';
import { ThemeStatusBadge } from './theme-status-badge';
import {
  Plus,
  Pencil,
  Trash2,
  Layers,
} from 'lucide-react';
import { cn } from '#/lib/utils';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '#/components/ui/alert-dialog';

export type ThemeItem = {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  sortOrder: number;
  _count: { tickers: number };
};

interface ThemeListProps {
  themes: ThemeItem[];
  canEdit: boolean;
  selectedThemeId: string | null;
  onSelectTheme: (themeId: string) => void;
  onCreateTheme: () => void;
  onEditTheme: (theme: ThemeItem) => void;
  showFilter: 'all' | 'active' | 'inactive';
  onShowFilterChange: (filter: 'all' | 'active' | 'inactive') => void;
}

export function ThemeList({
  themes,
  canEdit,
  selectedThemeId,
  onSelectTheme,
  onCreateTheme,
  onEditTheme,
  showFilter,
  onShowFilterChange,
}: ThemeListProps) {
  const deleteFetcher = useFetcher();
  const [deleteThemeId, setDeleteThemeId] = React.useState<string | null>(null);

  // Handle delete success
  const lastDeleteData = React.useRef<unknown>(null);
  React.useEffect(() => {
    if (
      deleteFetcher.data &&
      deleteFetcher.state === 'idle' &&
      deleteFetcher.data !== lastDeleteData.current
    ) {
      const fetcherData = deleteFetcher.data as { success?: boolean };
      if (fetcherData.success) {
        lastDeleteData.current = deleteFetcher.data;
        toast.success('Theme deleted successfully');
      }
    }
  }, [deleteFetcher.data, deleteFetcher.state]);

  const filteredThemes = themes.filter((theme) => {
    if (showFilter === 'active') return theme.status === 'ACTIVE';
    if (showFilter === 'inactive') return theme.status === 'INACTIVE';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Themes
        </h2>
        {canEdit && (
          <Button
            size="sm"
            variant="outline"
            onClick={onCreateTheme}
            className="h-8 gap-1.5 cursor-pointer text-xs bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            New
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/50">
        {(['all', 'active', 'inactive'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => onShowFilterChange(filter)}
            className={cn(
              'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer',
              showFilter === filter
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </button>
        ))}
      </div>

      {/* Theme List */}
      <div className="space-y-1.5">
        {filteredThemes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {showFilter === 'all'
              ? 'No themes yet'
              : `No ${showFilter} themes`}
          </div>
        ) : (
          filteredThemes.map((theme) => (
            <div
              key={theme.id}
              className={cn(
                'group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                selectedThemeId === theme.id
                  ? 'bg-accent/60 text-accent-foreground'
                  : 'hover:bg-accent/30'
              )}
              onClick={() => onSelectTheme(theme.id)}
            >
              <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                <Layers className="h-4 w-4 text-muted-foreground/80" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate">
                    {theme.name}
                  </span>
                  <ThemeStatusBadge status={theme.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {theme._count.tickers}{' '}
                  {theme._count.tickers === 1 ? 'ticker' : 'tickers'}
                </p>
              </div>

              {/* Edit / Delete Actions */}
              {canEdit && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 cursor-pointer hover:bg-accent"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditTheme(theme);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteThemeId(theme.id);
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteThemeId}
        onOpenChange={(open) => {
          if (!open) setDeleteThemeId(null);
        }}
      >
        <AlertDialogContent className="bg-card text-card-foreground border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Theme</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this theme? This will also remove
              all tickers within it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (deleteThemeId) {
                  deleteFetcher.submit(
                    { intent: 'deleteTheme', id: deleteThemeId },
                    { method: 'post', action: '/resources/themes' }
                  );
                  setDeleteThemeId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
