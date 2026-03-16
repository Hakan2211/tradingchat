// app/components/themes/themes-page.tsx
import * as React from 'react';
import { ThemeList, type ThemeItem } from './theme-list';
import { ThemeTickerList, type ThemeTickerItem } from './theme-ticker-list';
import { ThemeForm, type ThemeFormData } from './theme-form';
import { ThemeTickerForm, type ThemeTickerFormData } from './theme-ticker-form';
import { Layers } from 'lucide-react';

export type ThemeWithTickers = ThemeItem & {
  tickers: ThemeTickerItem[];
};

interface ThemesPageProps {
  themes: ThemeWithTickers[];
  canEdit: boolean;
}

export function ThemesPage({ themes, canEdit }: ThemesPageProps) {
  const [selectedThemeId, setSelectedThemeId] = React.useState<string | null>(
    () => {
      // Default to first active theme, or first theme overall
      const activeTheme = themes.find((t) => t.status === 'ACTIVE');
      return activeTheme?.id ?? themes[0]?.id ?? null;
    }
  );

  const [showFilter, setShowFilter] = React.useState<
    'all' | 'active' | 'inactive'
  >('all');

  // Theme form state
  const [themeFormOpen, setThemeFormOpen] = React.useState(false);
  const [editingTheme, setEditingTheme] = React.useState<ThemeFormData | null>(
    null
  );

  // Ticker form state
  const [tickerFormOpen, setTickerFormOpen] = React.useState(false);
  const [editingTicker, setEditingTicker] =
    React.useState<ThemeTickerFormData | null>(null);

  const selectedTheme = themes.find((t) => t.id === selectedThemeId);

  // If selected theme was deleted, select the first available
  React.useEffect(() => {
    if (selectedThemeId && !themes.find((t) => t.id === selectedThemeId)) {
      const activeTheme = themes.find((t) => t.status === 'ACTIVE');
      setSelectedThemeId(activeTheme?.id ?? themes[0]?.id ?? null);
    }
  }, [themes, selectedThemeId]);

  // Theme form handlers
  const handleCreateTheme = React.useCallback(() => {
    setEditingTheme(null);
    setThemeFormOpen(true);
  }, []);

  const handleEditTheme = React.useCallback((theme: ThemeItem) => {
    setEditingTheme({
      id: theme.id,
      name: theme.name,
      description: theme.description,
      status: theme.status,
      sortOrder: theme.sortOrder,
    });
    setThemeFormOpen(true);
  }, []);

  // Ticker form handlers
  const handleAddTicker = React.useCallback(() => {
    setEditingTicker(null);
    setTickerFormOpen(true);
  }, []);

  const handleEditTicker = React.useCallback((ticker: ThemeTickerItem) => {
    setEditingTicker({
      id: ticker.id,
      ticker: ticker.ticker,
      role: ticker.role,
      float: ticker.float,
      volume: ticker.volume,
      marketCap: ticker.marketCap,
      priceAtAdd: ticker.priceAtAdd,
      notes: ticker.notes,
      sortOrder: ticker.sortOrder,
    });
    setTickerFormOpen(true);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-card">
      {/* Header */}
      <div className="border-b bg-card/95 backdrop-blur-sm shrink-0">
        <div className="p-6 md:p-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Layers className="h-6 w-6 text-muted-foreground/80" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Themes & Sympathy Plays</h1>
              <p className="text-sm text-muted-foreground font-medium">
                Track market themes and their related tickers
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="relative flex-1 min-h-0">
        <div className="absolute inset-0 overflow-hidden p-6 md:p-8">
          <div className="flex h-full min-h-0 flex-col gap-8 overflow-hidden lg:flex-row">
            {/* Left Panel: Theme List */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:w-[300px] lg:flex-none lg:shrink-0">
              <ThemeList
                themes={themes}
                canEdit={canEdit}
                selectedThemeId={selectedThemeId}
                onSelectTheme={setSelectedThemeId}
                onCreateTheme={handleCreateTheme}
                onEditTheme={handleEditTheme}
                showFilter={showFilter}
                onShowFilterChange={setShowFilter}
              />
            </div>

            {/* Right Panel: Ticker List */}
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {selectedTheme ? (
                <ThemeTickerList
                  themeName={selectedTheme.name}
                  themeId={selectedTheme.id}
                  tickers={selectedTheme.tickers}
                  canEdit={canEdit}
                  onAddTicker={handleAddTicker}
                  onEditTicker={handleEditTicker}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="p-4 rounded-xl bg-muted/50 mb-4">
                    <Layers className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                  <p className="text-lg font-medium text-muted-foreground">
                    Select a theme to view its tickers
                  </p>
                  {canEdit && themes.length === 0 && (
                    <p className="text-sm text-muted-foreground/70 mt-2">
                      Or create a new theme to get started
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Theme Create/Edit Dialog */}
      <ThemeForm
        open={themeFormOpen}
        onOpenChange={setThemeFormOpen}
        initialData={editingTheme}
      />

      {/* Ticker Add/Edit Dialog */}
      {selectedTheme && (
        <ThemeTickerForm
          open={tickerFormOpen}
          onOpenChange={setTickerFormOpen}
          themeId={selectedTheme.id}
          themeName={selectedTheme.name}
          initialData={editingTicker}
        />
      )}
    </div>
  );
}
