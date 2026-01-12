/**
 * Pull to Refresh Hook
 * Provides pull-to-refresh functionality for mobile devices
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface UsePullToRefreshOptions {
  onRefresh: () => Promise<void>;
  threshold?: number;
  resistance?: number;
  disabled?: boolean;
}

interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  pullProgress: number;
}

export function usePullToRefresh({
  onRefresh,
  threshold = 80,
  resistance = 2.5,
  disabled = false,
}: UsePullToRefreshOptions) {
  const [state, setState] = useState<PullToRefreshState>({
    isPulling: false,
    isRefreshing: false,
    pullDistance: 0,
    pullProgress: 0,
  });

  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || state.isRefreshing) return;

    const container = containerRef.current;
    if (!container) return;

    // Only start pull if at top of scroll
    if (container.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setState(prev => ({ ...prev, isPulling: true }));
    }
  }, [disabled, state.isRefreshing]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!state.isPulling || disabled || state.isRefreshing) return;

    const container = containerRef.current;
    if (!container || container.scrollTop > 0) {
      setState(prev => ({ ...prev, isPulling: false, pullDistance: 0, pullProgress: 0 }));
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY.current;

    if (diff > 0) {
      e.preventDefault();
      const pullDistance = Math.min(diff / resistance, threshold * 1.5);
      const pullProgress = Math.min(pullDistance / threshold, 1);

      setState(prev => ({ ...prev, pullDistance, pullProgress }));
    }
  }, [state.isPulling, disabled, state.isRefreshing, resistance, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (!state.isPulling || disabled) return;

    if (state.pullDistance >= threshold && !state.isRefreshing) {
      setState(prev => ({ 
        ...prev, 
        isRefreshing: true, 
        pullDistance: threshold * 0.6,
        pullProgress: 1,
      }));

      try {
        await onRefresh();
      } finally {
        setState({
          isPulling: false,
          isRefreshing: false,
          pullDistance: 0,
          pullProgress: 0,
        });
      }
    } else {
      setState({
        isPulling: false,
        isRefreshing: false,
        pullDistance: 0,
        pullProgress: 0,
      });
    }
  }, [state.isPulling, state.pullDistance, state.isRefreshing, disabled, threshold, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return {
    containerRef,
    ...state,
  };
}

/**
 * Pull to Refresh Indicator Component
 */
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, ArrowDown } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  pullProgress: number;
  isRefreshing: boolean;
  pullDistance: number;
}

export function PullToRefreshIndicator({
  pullProgress,
  isRefreshing,
  pullDistance,
}: PullToRefreshIndicatorProps) {
  if (pullDistance === 0 && !isRefreshing) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute top-0 left-0 right-0 flex justify-center z-10 pointer-events-none"
        style={{ transform: `translateY(${Math.min(pullDistance - 40, 40)}px)` }}
      >
        <motion.div
          className="flex items-center justify-center w-10 h-10 rounded-full bg-background border border-border shadow-lg"
          animate={{ 
            rotate: isRefreshing ? 360 : pullProgress * 180,
          }}
          transition={{
            rotate: isRefreshing 
              ? { duration: 1, repeat: Infinity, ease: 'linear' }
              : { duration: 0 }
          }}
        >
          {isRefreshing ? (
            <RefreshCw className="w-5 h-5 text-primary" />
          ) : (
            <ArrowDown 
              className="w-5 h-5 text-muted-foreground transition-transform"
              style={{ 
                opacity: pullProgress,
                transform: pullProgress >= 1 ? 'rotate(180deg)' : 'none'
              }}
            />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default usePullToRefresh;
