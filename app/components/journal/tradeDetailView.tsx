import * as React from 'react';
import { Link, useFetcher } from 'react-router';
import type { TradeEntry, TradeImage } from '@prisma/client';
import { Badge } from '#/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '#/components/ui/carousel';
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

import { cn } from '#/lib/utils';
import { format } from 'date-fns';
import { Trash2, Pencil, Clock } from 'lucide-react';
import { Button } from '#/components/ui/button';

interface TradeDetailViewProps {
  trade: TradeEntry & {
    images: TradeImage[];
  };
}

const MetricItem = ({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('space-y-1.5', className)}>
    <div className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider">
      {label}
    </div>
    <div className="text-sm font-medium text-foreground">
      {children || (
        <span className="text-muted-foreground/60 italic">Not provided</span>
      )}
    </div>
  </div>
);

const ContentSection = ({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('space-y-3', className)}>
    <h3 className="text-sm font-semibold text-foreground/90 tracking-wide">
      {label}
    </h3>
    <div className="text-sm leading-relaxed text-muted-foreground">
      {children || (
        <span className="italic text-muted-foreground/50">Not provided</span>
      )}
    </div>
  </div>
);

export function TradeDetailView({ trade }: TradeDetailViewProps) {
  const fetcher = useFetcher();

  const formattedPnl =
    trade.pnl != null
      ? new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          signDisplay: 'always',
        }).format(trade.pnl)
      : 'N/A';
  const outcomeText =
    trade.outcome.charAt(0) + trade.outcome.slice(1).toLowerCase();
  const directionText =
    trade.direction.charAt(0) + trade.direction.slice(1).toLowerCase();

  const isProfitable = trade.pnl != null && trade.pnl > 0;
  const isLoss = trade.pnl != null && trade.pnl < 0;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header Section */}
      <div className="space-y-6">
        {/* Trade Summary Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <div className="flex items-baseline gap-4">
              <h1 className="text-4xl font-light tracking-tight text-foreground font-mono">
                {trade.ticker}
              </h1>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs px-2 py-0.5 font-normal border-0 rounded-full',
                    trade.direction === 'LONG'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                  )}
                >
                  {directionText}
                </Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs px-2 py-0.5 font-normal border-0 rounded-full',
                    trade.outcome === 'WIN'
                      ? 'bg-green-50 text-green-700 dark:bg-green-950/50 dark:text-green-300'
                      : trade.outcome === 'LOSS'
                      ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                  )}
                >
                  {outcomeText}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {format(new Date(trade.tradeDate), 'MMM d, yyyy • h:mm a')}
                </span>
              </div>
            </div>

            {/* P&L Display */}
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground/80 uppercase tracking-wider">
                Profit & Loss
              </div>
              <div
                className={cn(
                  'text-3xl font-light font-mono tracking-tight',
                  isProfitable && 'text-emerald-600 dark:text-emerald-400',
                  isLoss && 'text-rose-600 dark:text-rose-400',
                  !isProfitable && !isLoss && 'text-muted-foreground'
                )}
              >
                {formattedPnl}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Image Section */}
        <div className="lg:col-span-2">
          <div className="relative">
            <Carousel className="w-full rounded-xl overflow-hidden bg-muted/30">
              <CarouselContent>
                {trade.images.map((image, index) => (
                  <CarouselItem key={image.id}>
                    <div className="relative aspect-video bg-muted/50">
                      <img
                        src={`/resources/journal-images/${image.id}`}
                        alt={
                          image.caption ||
                          `Trade chart ${index + 1} for ${trade.ticker}`
                        }
                        className="h-full w-full object-contain"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {trade.images.length > 1 && (
                <>
                  <CarouselPrevious className="left-3 h-8 w-8 bg-muted-foreground/10 backdrop-blur-sm border-0 shadow-sm hover:bg-muted-foreground/20" />
                  <CarouselNext className="right-3 h-8 w-8 bg-muted-foreground/10 backdrop-blur-sm border-0 shadow-sm hover:bg-muted-foreground/20" />
                </>
              )}
            </Carousel>

            {/* Image counter */}
            {trade.images.length > 1 && (
              <div className="absolute top-3 right-3 px-2 py-1 bg-muted-foreground/10 backdrop-blur-sm text-xs font-medium rounded-md text-muted-foreground">
                {trade.images.length} images
              </div>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="space-y-8">
          {/* Trade Analysis */}
          <div className="space-y-6">
            <ContentSection label="Trade Thesis">
              {trade.tradeThesis && (
                <div className="whitespace-pre-wrap leading-relaxed">
                  {trade.tradeThesis}
                </div>
              )}
            </ContentSection>

            <ContentSection label="Execution Quality">
              {trade.executionQuality && (
                <div className="whitespace-pre-wrap leading-relaxed">
                  {trade.executionQuality}
                </div>
              )}
            </ContentSection>

            <ContentSection label="Lessons Learned">
              {trade.lessonsLearned && (
                <div className="whitespace-pre-wrap leading-relaxed">
                  {trade.lessonsLearned}
                </div>
              )}
            </ContentSection>
          </div>

          {/* Actions */}
          <div className="pt-6 border-t border-border/50">
            <div className="grid grid-cols-2 gap-3">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 border-border/50 hover:border-border bg-transparent transition-colors"
              >
                <Link
                  to={`/journal/edit/${trade.id}`}
                  className="flex items-center justify-center gap-2"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  <span className="text-sm">Edit</span>
                </Link>
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 text-muted-foreground cursor-pointer hover:text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" />
                    <span className="text-sm">Delete</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      Delete Trade Entry
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      This action cannot be undone. The trade entry and all
                      associated data will be permanently deleted.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="gap-3">
                    <AlertDialogCancel className="bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700">
                      Cancel
                    </AlertDialogCancel>
                    <fetcher.Form method="post">
                      <input type="hidden" name="_intent" value="delete" />
                      <AlertDialogAction
                        type="submit"
                        className="bg-red-600 hover:bg-red-700 text-white shadow-sm"
                      >
                        Delete
                      </AlertDialogAction>
                    </fetcher.Form>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TradeDetailViewSkeleton() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="space-y-6">
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <div className="flex items-baseline gap-4">
              <div className="h-10 w-32 bg-muted rounded"></div>
              <div className="flex gap-2">
                <div className="h-5 w-12 bg-muted rounded-full"></div>
                <div className="h-5 w-12 bg-muted rounded-full"></div>
              </div>
            </div>
            <div className="h-4 w-48 bg-muted rounded"></div>
            <div className="space-y-1">
              <div className="h-3 w-24 bg-muted rounded"></div>
              <div className="h-8 w-32 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="aspect-video bg-muted rounded-xl"></div>
        </div>
        <div className="space-y-8">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="h-4 w-24 bg-muted rounded"></div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-muted rounded"></div>
                <div className="h-3 w-4/5 bg-muted rounded"></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-4 w-32 bg-muted rounded"></div>
              <div className="space-y-2">
                <div className="h-3 w-full bg-muted rounded"></div>
                <div className="h-3 w-3/4 bg-muted rounded"></div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="h-9 bg-muted rounded"></div>
            <div className="h-9 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
