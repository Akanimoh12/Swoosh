import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', type = 'button', disabled, ...props }, ref) => {
    const baseStyles = cn(
      // Base styles
      'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'disabled:pointer-events-none disabled:opacity-50',
      
      // Size variants
      size === 'sm' && 'h-9 px-3 text-sm min-w-[44px]',
      size === 'md' && 'h-11 px-4 text-base min-w-[44px]',
      size === 'lg' && 'h-12 px-6 text-lg min-w-[44px]',
      
      // Color variants
      variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80',
      variant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90 active:bg-destructive/80',
      variant === 'outline' && 'border border-border bg-background hover:bg-accent hover:text-accent-foreground active:bg-accent/80',
      variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground active:bg-accent/80',
      variant === 'link' && 'text-primary underline-offset-4 hover:underline',
      
      className
    );

    return (
      <button
        type={type}
        className={baseStyles}
        ref={ref}
        disabled={disabled}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
