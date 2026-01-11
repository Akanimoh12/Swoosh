import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface PageContainerProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'full';
}

const PageContainer = forwardRef<HTMLDivElement, PageContainerProps>(
  ({ className, size = 'lg', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'w-full mx-auto px-4 sm:px-6 lg:px-8',
          size === 'sm' && 'max-w-3xl',
          size === 'md' && 'max-w-5xl',
          size === 'lg' && 'max-w-7xl',
          size === 'full' && 'max-w-none',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

PageContainer.displayName = 'PageContainer';

export { PageContainer };
