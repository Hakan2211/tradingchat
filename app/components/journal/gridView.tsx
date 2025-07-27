import { Link } from 'react-router';
import { TradeCard, type TradeCardProps } from './tradeCard';
import type { TradeDirection, TradeOutcome } from '@prisma/client';
import { Button } from '#/components/ui/button';
import { PlusCircle, TrendingUp } from 'lucide-react';

type TradeForGrid = {
  id: string;
  ticker: string;
  direction: TradeDirection;
  outcome: TradeOutcome;
  tradeDate: Date;
  pnl: number | null;
  images: { id: string }[];
};

interface GridViewProps {
  trades: TradeForGrid[];
}

export function GridView({ trades }: GridViewProps) {
  const mappedTrades: TradeCardProps[] = trades.map((trade) => ({
    tradeId: trade.id,
    ticker: trade.ticker,
    outcome: trade.outcome,
    direction: trade.direction,
    pnl: trade.pnl,
    date: trade.tradeDate,
    imageUrl: `/resources/journal-images/${trade.images[0]?.id}`,
  }));

  return (
    <div className="h-full">
      {mappedTrades.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 auto-rows-max">
          {mappedTrades.map((trade) => (
            <TradeCard key={trade.tradeId} {...trade} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-8">
          {/* Enhanced Empty State */}
          <div className="relative">
            <div className="w-32 h-32 rounded-2xl bg-muted flex items-center justify-center">
              <div className="w-16 h-16 rounded-xl bg-muted-foreground/80 flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </div>
            {/* Floating dots for visual interest */}
            <div className="absolute -top-2 -right-2 w-3 h-3 rounded-full bg-neutral-200 animate-pulse"></div>
            <div className="absolute -bottom-1 -left-1 w-3 h-3 rounded-full bg-green-300 animate-pulse delay-300"></div>
          </div>

          <div className="space-y-4 max-w-md">
            <h3 className="text-2xl font-bold">Start Your Trading Journey</h3>
            <p className="text-muted-foreground leading-relaxed">
              Your trading journal is empty. Create your first entry to begin
              tracking your trades, analyzing performance, and improving your
              strategy.
            </p>
          </div>

          <div className="space-y-4">
            <Button
              asChild
              size="lg"
              className="shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Link to="/journal/new" className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5" />
                <span className="font-semibold">Create Your First Entry</span>
              </Link>
            </Button>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Track Performance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-neutral-300"></div>
                <span>Analyze Patterns</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span>Improve Strategy</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
