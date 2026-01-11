import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'error';
}

const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value = 0,
      max = 100,
      showLabel = false,
      size = 'md',
      variant = 'default',
      ...props
    },
    ref
  ) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    const isComplete = percentage === 100;

    return (
      <div ref={ref} className={cn('w-full space-y-2', className)} {...props}>
        {showLabel && (
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Progress</span>
            <span className="font-semibold tabular-nums">
              {Math.round(percentage)}%
            </span>
          </div>
        )}

        <div
          className={cn(
            'relative w-full overflow-hidden rounded-full bg-secondary',
            size === 'sm' && 'h-1',
            size === 'md' && 'h-2',
            size === 'lg' && 'h-3'
          )}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={`Progress: ${Math.round(percentage)}%`}
        >
          <div
            className={cn(
              'h-full transition-all duration-300 ease-in-out',
              'rounded-full',
              
              // Variant colors
              variant === 'default' && 'bg-primary',
              variant === 'success' && 'bg-green-500',
              variant === 'warning' && 'bg-yellow-500',
              variant === 'error' && 'bg-red-500',
              
              // Completion state
              isComplete && 'animate-pulse'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';

export { Progress };
