// app/components/journal/TimeGroupedView.tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '#/components/ui/accordion';
import { TradeListItem, type TradeListItemProps } from './tradeListItem';
import { Calendar } from 'lucide-react';

interface TimeGroupedViewProps {
  groupedTrades: Record<string, TradeListItemProps[]>;
  formatTitle: (dateString: string) => string;
}

export function TimeGroupedView({
  groupedTrades,
  formatTitle,
}: TimeGroupedViewProps) {
  const groupKeys = Object.keys(groupedTrades).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  if (groupKeys.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-6">
        {/* Enhanced Empty State */}
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center">
            <Calendar className="h-10 w-10 text-muted-foreground/80" />
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-muted-foreground/80 animate-pulse"></div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-bold">No Trades Found</h3>
          <p className="text-muted-foreground text-sm">
            No trades found for this time period.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Accordion
        type="multiple"
        defaultValue={[groupKeys[0]]}
        className="w-full space-y-4"
      >
        {groupKeys.map((dateKey) => {
          const tradesInGroup = groupedTrades[dateKey];
          const totalTrades = tradesInGroup.length;
          const profitableTrades = tradesInGroup.filter(
            (trade) => trade.pnl && trade.pnl > 0
          ).length;
          const totalPnL = tradesInGroup.reduce(
            (sum, trade) => sum + (trade.pnl || 0),
            0
          );

          return (
            <AccordionItem
              key={dateKey}
              value={dateKey}
              className="border bg-card rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 last:border-b"
            >
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
                <div className="flex items-center justify-between w-full mr-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 rounded-xl bg-muted-foreground/10">
                      <Calendar className="h-5 w-5 text-muted-foreground/80" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-lg font-bold">
                        {formatTitle(dateKey)}
                      </h3>
                      <p className="text-sm text-muted-foreground font-medium">
                        {totalTrades} trade{totalTrades !== 1 ? 's' : ''} •{' '}
                        {profitableTrades} profitable
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Total P&L indicator */}
                    <div
                      className={`px-3 py-1.5 rounded-lg font-bold text-sm font-mono ${
                        totalPnL > 0
                          ? 'text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/20'
                          : totalPnL < 0
                          ? 'text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/20'
                          : 'text-muted-foreground bg-muted'
                      }`}
                    >
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        signDisplay: 'always',
                      }).format(totalPnL)}
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-4 pt-2">
                  {tradesInGroup.map((trade) => (
                    <TradeListItem key={trade.tradeId} {...trade} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
