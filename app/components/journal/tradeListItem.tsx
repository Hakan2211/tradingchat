// app/components/journal/TradeListItem.tsx
import { Link, useLocation } from 'react-router';
import type { TradeOutcome, TradeDirection } from '@prisma/client';
import { Badge } from '#/components/ui/badge';
import { Card } from '#/components/ui/card';
import { cn } from '#/lib/utils';
import { tradeBadgeVariants } from './tradeCard';
import { ArrowRight } from 'lucide-react';

export interface TradeListItemProps {
  tradeId: string;
  ticker: string;
  outcome: TradeOutcome;
  direction: TradeDirection;
  pnl: number | null;
}

export function TradeListItem({
  tradeId,
  ticker,
  outcome,
  direction,
  pnl,
}: TradeListItemProps) {
  const location = useLocation();

  const formattedPnl =
    pnl != null
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          signDisplay: 'always',
        }).format(pnl)
      : null;
  const outcomeText = outcome.charAt(0) + outcome.slice(1).toLowerCase();
  const directionText = direction.charAt(0) + direction.slice(1).toLowerCase();

  const isProfitable = pnl != null && pnl > 0;
  const isLoss = pnl != null && pnl < 0;

  return (
    <Link
      to={`/journal/${tradeId}`}
      state={{ previousSearch: location.search }}
      className="block group"
    >
      <Card className="relative overflow-hidden bg-card border transition-all duration-300 hover:border-[#ccb389]/50 hover:shadow-lg hover:shadow-[#ccb389]/10 group-hover:-translate-y-0.5">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="relative p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              {/* Ticker with enhanced styling */}
              <div className="flex items-center gap-3">
                <div className="font-bold text-xl font-mono tracking-wide">
                  {ticker}
                </div>

                {/* Direction indicator icon */}
                {/* <div
                  className={cn(
                    'p-1.5 rounded-full',
                    direction === 'LONG'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  )}
                >
                  {direction === 'LONG' ? (
                    <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                  )}
                </div> */}
              </div>

              {/* P&L with enhanced formatting */}
              {formattedPnl && (
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'font-bold text-lg font-mono px-3 py-1.5 rounded-lg border',
                      isProfitable &&
                        'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
                      isLoss &&
                        'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
                      pnl === 0 &&
                        'text-muted-foreground bg-muted border-border'
                    )}
                  >
                    {formattedPnl}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Enhanced badges */}
              <div className="flex items-center gap-2">
                <Badge
                  className={cn(
                    tradeBadgeVariants({ variant: outcome }),
                    'font-semibold px-3 py-1 text-xs transition-colors duration-200'
                  )}
                >
                  {outcomeText}
                </Badge>
                <Badge
                  className={cn(
                    tradeBadgeVariants({ variant: direction }),
                    'font-semibold px-3 py-1 text-xs transition-colors duration-200'
                  )}
                >
                  {directionText}
                </Badge>
              </div>

              {/* Enhanced arrow with animation */}
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted group-hover:bg-[#ccb389]/10 transition-all duration-200">
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-muted-foreground/80 transition-all duration-200 group-hover:translate-x-0.5" />
              </div>
            </div>
          </div>

          {/* Subtle bottom border that appears on hover */}
          {/* <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-primary to-primary/60 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" /> */}
        </div>
      </Card>
    </Link>
  );
}
