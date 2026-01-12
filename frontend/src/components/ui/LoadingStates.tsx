import { motion } from 'framer-motion';
import type { FC, HTMLAttributes, ReactNode } from 'react';

/**
 * Skeleton Loading Components
 * Provides shimmer effect loading placeholders for various UI elements
 */

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

// Base skeleton with shimmer effect
export const Skeleton: FC<SkeletonProps> = ({ 
  className = '', 
  rounded = 'md',
  ...props 
}) => {
  const roundedClass = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    full: 'rounded-full',
  }[rounded];

  return (
    <div 
      className={`skeleton bg-muted ${roundedClass} ${className}`}
      aria-hidden="true"
      {...props}
    />
  );
};

// Text skeleton - single line
export const SkeletonText: FC<{ width?: string; className?: string }> = ({ 
  width = '100%', 
  className = '' 
}) => (
  <Skeleton 
    className={`h-4 ${className}`} 
    style={{ width }} 
    rounded="sm"
  />
);

// Heading skeleton
export const SkeletonHeading: FC<{ width?: string; className?: string }> = ({ 
  width = '60%', 
  className = '' 
}) => (
  <Skeleton 
    className={`h-8 ${className}`} 
    style={{ width }} 
    rounded="md"
  />
);

// Avatar skeleton
export const SkeletonAvatar: FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }[size];

  return <Skeleton className={sizeClass} rounded="full" />;
};

// Button skeleton
export const SkeletonButton: FC<{ width?: string }> = ({ width = '100px' }) => (
  <Skeleton 
    className="h-10" 
    style={{ width }} 
    rounded="lg"
  />
);

// Card skeleton - for transaction/intent cards
export const SkeletonCard: FC<{ className?: string }> = ({ className = '' }) => (
  <div 
    className={`p-6 rounded-xl border border-border bg-card ${className}`}
    aria-hidden="true"
  >
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-3">
        <SkeletonAvatar size="md" />
        <div className="space-y-2">
          <SkeletonText width="120px" />
          <SkeletonText width="80px" className="h-3" />
        </div>
      </div>
      <SkeletonButton width="80px" />
    </div>
    <div className="space-y-3">
      <SkeletonText width="100%" />
      <SkeletonText width="75%" />
    </div>
  </div>
);

// Stats card skeleton
export const SkeletonStatsCard: FC = () => (
  <div 
    className="p-6 rounded-xl border border-border bg-card"
    aria-hidden="true"
  >
    <div className="flex items-center justify-between mb-4">
      <SkeletonText width="100px" className="h-3" />
      <Skeleton className="w-8 h-8" rounded="lg" />
    </div>
    <SkeletonHeading width="50%" />
    <div className="mt-2 flex items-center gap-2">
      <Skeleton className="w-12 h-4" rounded="full" />
      <SkeletonText width="60px" className="h-3" />
    </div>
  </div>
);

// Table row skeleton
export const SkeletonTableRow: FC<{ columns?: number }> = ({ columns = 5 }) => (
  <tr aria-hidden="true">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="p-4">
        <SkeletonText width={i === 0 ? '60%' : '80%'} />
      </td>
    ))}
  </tr>
);

// Chart skeleton
export const SkeletonChart: FC<{ height?: string }> = ({ height = '300px' }) => (
  <div 
    className="w-full rounded-xl border border-border bg-card p-4"
    style={{ height }}
    aria-hidden="true"
  >
    <div className="flex items-center justify-between mb-4">
      <SkeletonText width="120px" />
      <div className="flex gap-2">
        <SkeletonButton width="60px" />
        <SkeletonButton width="60px" />
      </div>
    </div>
    <div className="flex items-end justify-around h-[calc(100%-60px)] gap-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton 
          key={i} 
          className="flex-1" 
          style={{ height: `${30 + Math.random() * 60}%` }}
          rounded="sm"
        />
      ))}
    </div>
  </div>
);

// Full page loading skeleton
export const PageSkeleton: FC<{ title?: boolean }> = ({ title = true }) => (
  <div className="animate-fade-in space-y-6 p-6" aria-hidden="true">
    {title && (
      <div className="mb-8">
        <SkeletonHeading width="200px" />
        <SkeletonText width="300px" className="mt-2" />
      </div>
    )}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonStatsCard key={i} />
      ))}
    </div>
    <SkeletonChart height="350px" />
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  </div>
);

/**
 * Loading Button Component
 * Button with spinner state
 */
interface LoadingButtonProps extends HTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const LoadingButton: FC<LoadingButtonProps> = ({
  isLoading = false,
  loadingText,
  children,
  variant = 'primary',
  size = 'md',
  disabled,
  className = '',
  type = 'button',
  ...props
}) => {
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  }[variant];

  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4',
    lg: 'h-12 px-6 text-lg',
  }[size];

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`
        inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-all duration-200 ease-out
        disabled:opacity-50 disabled:cursor-not-allowed
        btn-hover focus-ring
        ${variantClasses}
        ${sizeClasses}
        ${className}
      `}
      aria-busy={isLoading}
      {...props}
    >
      {isLoading && (
        <svg 
          className="animate-spin h-4 w-4" 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      <span>{isLoading && loadingText ? loadingText : children}</span>
    </button>
  );
};

/**
 * Progress Bar Component
 */
interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  variant?: 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export const ProgressBar: FC<ProgressBarProps> = ({
  progress,
  label,
  showPercentage = false,
  variant = 'primary',
  size = 'md',
  animated = true,
}) => {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const variantClasses = {
    primary: 'bg-primary',
    success: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
  }[variant];

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }[size];

  return (
    <div className="w-full">
      {(label || showPercentage) && (
        <div className="flex justify-between mb-1 text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercentage && (
            <span className="text-muted-foreground">{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      <div 
        className={`w-full bg-muted rounded-full overflow-hidden ${sizeClasses}`}
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <motion.div
          className={`h-full rounded-full ${variantClasses}`}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: animated ? 0.5 : 0, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

/**
 * Spinner Component
 */
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

export const Spinner: FC<SpinnerProps> = ({ size = 'md', className = '', label }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
    xl: 'w-12 h-12 border-4',
  }[size];

  return (
    <div className={`flex items-center gap-3 ${className}`} role="status">
      <div
        className={`
          rounded-full border-primary/30 border-t-primary animate-spin
          ${sizeClasses}
        `}
        aria-hidden="true"
      />
      {label && <span className="text-muted-foreground">{label}</span>}
      <span className="sr-only">{label || 'Loading...'}</span>
    </div>
  );
};

/**
 * Dots Loader Component
 */
export const DotsLoader: FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center gap-1 ${className}`} role="status">
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="w-2 h-2 bg-primary rounded-full"
        animate={{ y: [0, -6, 0] }}
        transition={{
          duration: 0.6,
          repeat: Infinity,
          delay: i * 0.1,
          ease: 'easeInOut',
        }}
      />
    ))}
    <span className="sr-only">Loading...</span>
  </div>
);

/**
 * Full Screen Loading Overlay
 */
interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  progress?: number;
}

export const LoadingOverlay: FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Loading...',
  progress,
}) => {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={message}
    >
      <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-card border border-border shadow-xl">
        <Spinner size="xl" />
        <p className="text-lg font-medium">{message}</p>
        {typeof progress === 'number' && (
          <div className="w-48">
            <ProgressBar progress={progress} showPercentage size="md" />
          </div>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Inline Loading Component
 * For inline content loading states
 */
export const InlineLoader: FC<{ text?: string }> = ({ text = 'Loading' }) => (
  <span className="inline-flex items-center gap-2 text-muted-foreground">
    <Spinner size="sm" />
    <span>{text}</span>
  </span>
);

/**
 * Pulsing Logo Loader
 * Branded loading animation using Swoosh logo
 */
export const BrandedLoader: FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }[size];

  return (
    <div className="flex items-center justify-center" role="status">
      <motion.div
        className={`${sizeClasses} text-primary`}
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.7, 1, 0.7],
        }}
        transition={{ 
          duration: 1.5, 
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M21.5 9.5c-1.5 0-2.5 1-2.5 2.5s1 2.5 2.5 2.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5z"/>
          <path d="M18.5 5C15.46 5 13 7.46 13 10.5c0 2.06 1.13 3.85 2.8 4.8l-3.3 3.3c-.2.2-.2.51 0 .71.1.1.23.15.35.15s.26-.05.35-.15l3.3-3.3c.95.67 2.1 1.06 3.35 1.06.28 0 .5-.22.5-.5s-.22-.5-.5-.5c-2.49 0-4.5-2.01-4.5-4.5S15.36 7 17.85 7c.28 0 .5-.22.5-.5s-.22-.5-.5-.5c-1.25 0-2.4.39-3.35 1.06l-3.3-3.3c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l3.3 3.3C12.13 8.72 11 10.51 11 12.57c0 3.04 2.46 5.5 5.5 5.5.28 0 .5-.22.5-.5s-.22-.5-.5-.5c-2.49 0-4.5-2.01-4.5-4.5 0-1.51.75-2.85 1.9-3.67l.1.1c.2.2.51.2.71 0 .2-.2.2-.51 0-.71l-.1-.1c.82-1.15 2.16-1.9 3.67-1.9.28 0 .5-.22.5-.5s-.22-.5-.5-.5z"/>
        </svg>
      </motion.div>
      <span className="sr-only">Loading Swoosh...</span>
    </div>
  );
};
