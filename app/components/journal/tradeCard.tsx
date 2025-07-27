// app/components/journal/TradeCard.tsx
import * as React from 'react';
import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '#/lib/utils';
import { Card } from '#/components/ui/card';
import { Badge } from '#/components/ui/badge';
import { AspectRatio } from '#/components/ui/aspect-ratio';
import { Link, useLocation } from 'react-router';
import type { TradeDirection, TradeOutcome } from '@prisma/client';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

const tradeBadgeVariants = cva(
  'font-semibold border-0 transition-colors duration-200',
  {
    variants: {
      variant: {
        WIN: 'bg-green-700/80 dark:bg-green-700/80 text-white hover:bg-green-700 dark:hover:bg-green-600',
        LOSS: 'bg-red-700/80 dark:bg-red-700/80 text-white hover:bg-red-700 dark:hover:bg-red-600',
        BREAKEVEN: 'bg-neutral-400/90 text-white hover:bg-muted-foreground',
        LONG: 'bg-slate-800 text-white hover:bg-muted-foreground',
        SHORT:
          'bg-amber-700/90 dark:bg-amber-700/80 text-white hover:bg-amber-700 dark:hover:bg-amber-600',
      },
    },
  }
);

const cardGlowVariants = cva('', {
  variants: {
    outcome: {
      WIN: 'hover:ring-2 hover:ring-green-300 dark:hover:ring-green-800 hover:shadow-green-200/50 dark:hover:shadow-green-900/30',
      LOSS: 'hover:ring-2 hover:ring-red-300 dark:hover:ring-red-800 hover:shadow-red-200/50 dark:hover:shadow-red-900/30',
      BREAKEVEN:
        'hover:ring-2 hover:ring-neutral-300 hover:shadow-neutral-300/20',
    },
  },
});

export interface TradeCardProps {
  tradeId: string;
  ticker: string;
  outcome: TradeOutcome;
  direction: TradeDirection;
  pnl?: number | null;
  date: Date;
  imageUrl: string;
  className?: string;
}

const TradeCard = React.forwardRef<HTMLDivElement, TradeCardProps>(
  (
    { tradeId, ticker, outcome, direction, pnl, date, imageUrl, className },
    ref
  ) => {
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
    const directionText =
      direction.charAt(0) + direction.slice(1).toLowerCase();
    const isProfitable = pnl != null && pnl > 0;
    const isLoss = pnl != null && pnl < 0;

    return (
      <Link
        to={`/journal/${tradeId}`}
        state={{ previousSearch: location.search }}
        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl block group"
      >
        <Card
          ref={ref}
          className={cn(
            'group/card relative overflow-hidden rounded-xl transition-all duration-300 ease-out hover:shadow-2xl hover:-translate-y-1 bg-card border',
            cardGlowVariants({ outcome }),
            className
          )}
        >
          {/* Enhanced Image Section */}
          <AspectRatio ratio={16 / 9} className="relative">
            <img
              src={imageUrl}
              alt={`Trade chart for ${ticker}`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover/card:scale-105"
            />

            {/* Enhanced gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

            {/* Direction indicator */}
            {/* <div className="absolute top-3 right-3">
              <div
                className={cn(
                  'p-2 rounded-lg backdrop-blur-sm border',
                  direction === 'LONG'
                    ? 'bg-green-700/80 border-green-700/50'
                    : 'bg-red-700/80 border-red-700/50'
                )}
              >
                {direction === 'LONG' ? (
                  <TrendingUp className="h-3 w-3 text-white" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-white" />
                )}
              </div>
            </div> */}

            {/* Date indicator */}
            <div className="absolute top-3 left-3">
              <div className="px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm border border-white/20">
                <div className="flex items-center gap-1 text-white text-xs font-medium">
                  <Calendar className="h-3 w-3" />
                  <span>{format(new Date(date), 'MMM d')}</span>
                </div>
              </div>
            </div>
          </AspectRatio>

          {/* Enhanced Content Section */}
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <div className="space-y-4">
              {/* Header with ticker and P&L */}
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold font-mono text-[#ccb389] border border-[#ccb389] rounded-lg px-2 py-1 drop-shadow-lg tracking-wide">
                  {ticker}
                </h3>
              </div>

              {/* Enhanced badges */}
              <div className="flex gap-1.5">
                <Badge
                  className={cn(
                    tradeBadgeVariants({ variant: outcome }),
                    'px-2 py-0.5 text-xs'
                  )}
                >
                  {outcomeText}
                </Badge>
                <Badge
                  className={cn(
                    tradeBadgeVariants({ variant: direction }),
                    'px-2 py-0.5 text-xs'
                  )}
                >
                  {directionText}
                </Badge>
                {pnl != null && (
                  <div
                    className={cn(
                      'px-2 py-1 rounded-md font-semibold text-xs font-mono backdrop-blur-sm border',
                      isProfitable &&
                        'text-green-100 bg-green-700/80 border-green-700/50',
                      isLoss && 'text-red-100 bg-red-700/80 border-red-700/50',
                      pnl === 0 &&
                        'text-white bg-muted-foreground/80 border-white/20'
                    )}
                  >
                    {formattedPnl}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hover effect overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300" />
        </Card>
      </Link>
    );
  }
);

TradeCard.displayName = 'TradeCard';

export { TradeCard, tradeBadgeVariants };
