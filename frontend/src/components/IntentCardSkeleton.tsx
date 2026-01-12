/**
 * Intent Card Skeleton
 * Loading placeholder for intent cards in history page
 */

import { cn } from '@/lib/utils';

export function IntentCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'p-4 sm:p-5 bg-card border border-border rounded-xl animate-pulse',
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        {/* Left side - intent text and details */}
        <div className="flex-1 space-y-3">
          {/* Intent text - 2 lines */}
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded-md w-full" />
            <div className="h-4 bg-muted rounded-md w-3/4" />
          </div>

          {/* Chain and token info */}
          <div className="flex items-center gap-2">
            <div className="h-3 w-16 bg-muted rounded" />
            <div className="h-3 w-8 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-3 w-3 bg-muted rounded" />
            <div className="h-3 w-16 bg-muted rounded" />
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 bg-muted rounded" />
            <div className="h-3 w-32 bg-muted rounded" />
          </div>
        </div>

        {/* Right side - status and cost */}
        <div className="flex sm:flex-col items-center sm:items-end gap-2">
          <div className="h-6 w-20 bg-muted rounded-full" />
          <div className="h-3 w-12 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

export function IntentListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <IntentCardSkeleton key={i} />
      ))}
    </div>
  );
}

export default IntentCardSkeleton;
