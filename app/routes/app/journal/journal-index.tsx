// app/routes/app/journal/journal-index.tsx
import { type LoaderFunctionArgs } from 'react-router';
import { useLoaderData, useNavigate, useSearchParams } from 'react-router';
import { prisma } from '#/utils/db.server';
import { requireUserId } from '#/utils/auth.server';
import { GridView } from '#/components/journal/gridView';
import { TimeGroupedView } from '#/components/journal/timeGroupedView';
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  format,
  parseISO,
} from 'date-fns';
import { Button } from '#/components/ui/button';
import { Link } from 'react-router';
import { PlusCircle, TrendingUp, NotebookPen, Calendar } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs';

function groupBy<T>(
  array: T[],
  getKey: (item: T) => string
): Record<string, T[]> {
  return array.reduce((acc, item) => {
    const key = getKey(item);
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {} as Record<string, T[]>);
}

export async function loader({ request }: LoaderFunctionArgs) {
  const userId = await requireUserId(request);

  const url = new URL(request.url);
  const view = url.searchParams.get('view') || 'grid';

  const trades = await prisma.tradeEntry.findMany({
    where: { userId },
    orderBy: { tradeDate: 'desc' },
    select: {
      id: true,
      ticker: true,
      outcome: true,
      direction: true,
      pnl: true,
      tradeDate: true,
      images: {
        select: { id: true },
        orderBy: { imageOrder: 'asc' },
        take: 1,
      },
    },
  });

  const tradesWithId = trades.map((t) => ({ ...t, tradeId: t.id }));
  const byDay = groupBy(tradesWithId, (trade) =>
    format(startOfDay(new Date(trade.tradeDate)), 'yyyy-MM-dd')
  );
  const byWeek = groupBy(tradesWithId, (trade) =>
    format(startOfWeek(new Date(trade.tradeDate)), 'yyyy-MM-dd')
  );
  const byMonth = groupBy(tradesWithId, (trade) =>
    format(startOfMonth(new Date(trade.tradeDate)), 'yyyy-MM-dd')
  );

  return { allTrades: tradesWithId, byDay, byWeek, byMonth, activeView: view };
}

export default function JournalIndexPage() {
  const { allTrades, byDay, byWeek, byMonth, activeView } =
    useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const onTabChange = (view: string) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('view', view);
    navigate(`?${newSearchParams.toString()}`, { replace: true });
  };

  // Calculate summary stats for premium header
  const totalTrades = allTrades.length;
  const profitableTrades = allTrades.filter(
    (trade) => trade.pnl && trade.pnl > 0
  ).length;
  const winRate =
    totalTrades > 0
      ? ((profitableTrades / totalTrades) * 100).toFixed(1)
      : '0.0';
  const totalPnL = allTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);

  return (
    <div className="min-h-full bg-card">
      {/* Premium Header Section */}
      <div className="border-b bg-card/95 backdrop-blur-sm">
        <div className="p-6 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Title Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <NotebookPen className="h-6 w-6 text-muted-foreground/80" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">Trading Journal</h1>
                  <p className="text-sm text-muted-foreground font-medium">
                    Track, analyze, and improve your trading performance
                  </p>
                </div>
              </div>
            </div>

            {/* Stats & Action Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Quick Stats */}
              <div className="flex items-center gap-6 px-4 py-3 rounded-xl bg-transparent border">
                <div className="text-center">
                  <div className="text-lg font-bold font-mono">
                    {totalTrades}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">
                    Total Trades
                  </div>
                </div>
                <div className="w-px h-8 bg-border"></div>
                <div className="text-center">
                  <div className="text-lg font-bold font-mono">{winRate}%</div>
                  <div className="text-xs text-muted-foreground font-medium">
                    Win Rate
                  </div>
                </div>
                <div className="w-px h-8 bg-border"></div>
                <div className="text-center">
                  <div
                    className={`text-lg font-bold font-mono ${
                      totalPnL >= 0
                        ? 'text-green-700 dark:text-green-400'
                        : 'text-red-700 dark:text-red-400'
                    }`}
                  >
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                      signDisplay: 'always',
                    }).format(totalPnL)}
                  </div>
                  <div className="text-xs text-muted-foreground font-medium">
                    Total P&L
                  </div>
                </div>
              </div>

              {/* New Entry Button */}
              <Button
                asChild
                size="lg"
                className="shadow-lg hover:shadow-xl hover:bg-primary/80 transition-all duration-200"
              >
                <Link to="/journal/new" className="flex items-center gap-2">
                  <PlusCircle className="h-4 w-4" />
                  <span className="font-semibold">New Trade</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 md:p-8">
        <Tabs
          value={activeView}
          onValueChange={onTabChange}
          className="flex-grow flex flex-col"
        >
          {/* Premium Tab Navigation */}
          <div className="mb-8">
            <TabsList className="inline-flex h-11 items-center justify-center rounded-xl bg-transparent p-1.5 text-muted-foreground shadow-sm border">
              <TabsTrigger
                value="grid"
                className="data-[state=active]:bg-neutral-100/80  inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all dark:hover:bg-[#111827]/90 hover:bg-[#f3f4f6]/90"
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Grid View
              </TabsTrigger>
              <TabsTrigger
                value="daily"
                className="data-[state=active]:bg-neutral-100/80  inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all dark:hover:bg-[#111827]/90 hover:bg-[#f3f4f6]/90"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Daily
              </TabsTrigger>
              <TabsTrigger
                value="weekly"
                className="data-[state=active]:bg-neutral-100/80  inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all dark:hover:bg-[#111827]/90 hover:bg-[#f3f4f6]/90"
              >
                Weekly
              </TabsTrigger>
              <TabsTrigger
                value="monthly"
                className="data-[state=active]:bg-neutral-100/80  inline-flex items-center justify-center whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-all dark:hover:bg-[#111827]/90 hover:bg-[#f3f4f6]/90"
              >
                Monthly
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab Content with smooth transitions */}
          <div className="flex-grow">
            <TabsContent
              value="grid"
              className="flex-grow mt-0 data-[state=inactive]:opacity-0 data-[state=active]:opacity-100 transition-opacity duration-300"
            >
              <GridView trades={allTrades} />
            </TabsContent>
            <TabsContent
              value="daily"
              className="flex-grow mt-0 data-[state=inactive]:opacity-0 data-[state=active]:opacity-100 transition-opacity duration-300"
            >
              <TimeGroupedView
                groupedTrades={byDay}
                formatTitle={(dateStr) =>
                  format(parseISO(dateStr), 'EEEE, MMMM d, yyyy')
                }
              />
            </TabsContent>
            <TabsContent
              value="weekly"
              className="flex-grow mt-0 data-[state=inactive]:opacity-0 data-[state=active]:opacity-100 transition-opacity duration-300"
            >
              <TimeGroupedView
                groupedTrades={byWeek}
                formatTitle={(dateStr) =>
                  `Week of ${format(parseISO(dateStr), 'MMMM d, yyyy')}`
                }
              />
            </TabsContent>
            <TabsContent
              value="monthly"
              className="flex-grow mt-0 data-[state=inactive]:opacity-0 data-[state=active]:opacity-100 transition-opacity duration-300"
            >
              <TimeGroupedView
                groupedTrades={byMonth}
                formatTitle={(dateStr) =>
                  format(parseISO(dateStr), 'MMMM yyyy')
                }
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
