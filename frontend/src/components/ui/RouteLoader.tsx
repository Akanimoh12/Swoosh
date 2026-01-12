/**
 * Route Loader Components
 * Provides loading UI for React Suspense and route transitions
 */

import { motion } from 'framer-motion';
import { Zap, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// Full-page loading spinner for Suspense
export function PageLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        {/* Animated logo */}
        <motion.div
          animate={{ 
            rotate: [0, 10, -10, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative"
        >
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <motion.div
            className="absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600"
            animate={{ opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{ filter: 'blur(20px)' }}
          />
        </motion.div>

        {/* Loading text */}
        <div className="text-center">
          <p className="text-sm font-medium text-muted-foreground">{message}</p>
          <div className="mt-2 flex items-center justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="w-2 h-2 rounded-full bg-primary"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              />
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Inline loading spinner for navigation
export function NavigationLoader({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, width: 0 }}
      animate={{ opacity: 1, width: 'auto' }}
      exit={{ opacity: 0, width: 0 }}
      className={cn("flex items-center gap-2 overflow-hidden", className)}
    >
      <Loader2 className="h-4 w-4 animate-spin text-primary" />
      <span className="text-xs text-muted-foreground whitespace-nowrap">Loading...</span>
    </motion.div>
  );
}

// Progress bar for route transitions
export function RouteProgressBar({ isLoading }: { isLoading: boolean }) {
  if (!isLoading) return null;

  return (
    <motion.div
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      exit={{ scaleX: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 z-[100] origin-left"
    >
      <motion.div
        className="h-full w-full bg-gradient-to-r from-transparent to-white/30"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  );
}

// Skeleton loaders for specific page types
export function HistoryPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse" />
      </div>

      {/* Filters skeleton */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="h-10 w-64 bg-muted rounded-lg animate-pulse" />
        <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
        <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
      </div>

      {/* Intent cards skeleton */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-5 bg-card border border-border rounded-xl"
          >
            <div className="flex justify-between items-start">
              <div className="flex-1 space-y-3">
                <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
                <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
                <div className="flex gap-2">
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                </div>
              </div>
              <div className="h-6 w-24 bg-muted rounded-full animate-pulse" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header skeleton */}
      <div className="mb-8">
        <div className="h-8 w-48 bg-muted rounded-lg animate-pulse mb-2" />
        <div className="h-4 w-64 bg-muted rounded animate-pulse" />
      </div>

      {/* Stats grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-card border border-border rounded-xl"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="h-10 w-10 bg-muted rounded-lg animate-pulse" />
              <div className="h-4 w-16 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-8 w-24 bg-muted rounded animate-pulse mb-2" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </motion.div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-card border border-border rounded-xl">
          <div className="h-6 w-40 bg-muted rounded animate-pulse mb-4" />
          <div className="h-64 bg-muted rounded-lg animate-pulse" />
        </div>
        <div className="p-6 bg-card border border-border rounded-xl">
          <div className="h-6 w-40 bg-muted rounded animate-pulse mb-4" />
          <div className="h-64 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export function IntentPageSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header skeleton */}
      <div className="text-center mb-8">
        <div className="h-10 w-64 bg-muted rounded-lg animate-pulse mx-auto mb-4" />
        <div className="h-4 w-96 bg-muted rounded animate-pulse mx-auto" />
      </div>

      {/* Intent input skeleton */}
      <div className="p-6 bg-card border border-border rounded-xl mb-6">
        <div className="h-32 bg-muted rounded-lg animate-pulse mb-4" />
        <div className="flex justify-end gap-2">
          <div className="h-10 w-24 bg-muted rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>

      {/* Preview skeleton */}
      <div className="p-6 bg-card border border-border rounded-xl">
        <div className="h-6 w-32 bg-muted rounded animate-pulse mb-4" />
        <div className="space-y-3">
          <div className="flex justify-between">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex justify-between">
            <div className="h-4 w-28 bg-muted rounded animate-pulse" />
            <div className="h-4 w-40 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default PageLoader;
