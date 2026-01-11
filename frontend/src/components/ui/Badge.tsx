import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline';
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'min-h-[24px]', // Accessible touch target for interactive badges
          
          // Variant styles
          variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/80',
          variant === 'success' && 'bg-green-500 text-white hover:bg-green-600',
          variant === 'warning' && 'bg-yellow-500 text-white hover:bg-yellow-600',
          variant === 'error' && 'bg-red-500 text-white hover:bg-red-600',
          variant === 'info' && 'bg-blue-500 text-white hover:bg-blue-600',
          variant === 'outline' && 'border border-border text-foreground hover:bg-accent',
          
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
