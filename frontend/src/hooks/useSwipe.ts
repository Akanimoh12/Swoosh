/**
 * Swipeable Intent Card Hook
 * Provides swipe gesture functionality for intent cards
 */

import { useState, useRef, useCallback } from 'react';

interface UseSwipeOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  disabled?: boolean;
}

interface SwipeState {
  isSwiping: boolean;
  offsetX: number;
  direction: 'left' | 'right' | null;
}

export function useSwipe({
  onSwipeLeft,
  onSwipeRight,
  threshold = 100,
  disabled = false,
}: UseSwipeOptions = {}) {
  const [state, setState] = useState<SwipeState>({
    isSwiping: false,
    offsetX: 0,
    direction: null,
  });

  const startX = useRef(0);
  const startY = useRef(0);
  const isHorizontal = useRef<boolean | null>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    isHorizontal.current = null;
    setState(prev => ({ ...prev, isSwiping: true }));
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!state.isSwiping || disabled) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startX.current;
    const diffY = currentY - startY.current;

    // Determine scroll direction on first significant move
    if (isHorizontal.current === null && (Math.abs(diffX) > 10 || Math.abs(diffY) > 10)) {
      isHorizontal.current = Math.abs(diffX) > Math.abs(diffY);
    }

    // Only handle horizontal swipes
    if (isHorizontal.current) {
      e.preventDefault();
      const direction = diffX > 0 ? 'right' : 'left';
      setState({
        isSwiping: true,
        offsetX: diffX * 0.5, // Add resistance
        direction,
      });
    }
  }, [state.isSwiping, disabled]);

  const handleTouchEnd = useCallback(() => {
    if (!state.isSwiping || disabled) return;

    const { offsetX, direction } = state;

    if (Math.abs(offsetX) >= threshold) {
      if (direction === 'left' && onSwipeLeft) {
        onSwipeLeft();
      } else if (direction === 'right' && onSwipeRight) {
        onSwipeRight();
      }
    }

    setState({ isSwiping: false, offsetX: 0, direction: null });
  }, [state, disabled, threshold, onSwipeLeft, onSwipeRight]);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    ...state,
  };
}

/**
 * Haptic Feedback utility
 * Triggers vibration on supported devices
 */
export function triggerHapticFeedback(
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
) {
  if (!navigator.vibrate) return;

  const patterns: Record<string, number | number[]> = {
    light: 10,
    medium: 25,
    heavy: 50,
    success: [10, 50, 20],
    warning: [25, 25, 25],
    error: [50, 50, 50],
  };

  try {
    navigator.vibrate(patterns[type] || 10);
  } catch {
    // Vibration API not supported or permission denied
  }
}

/**
 * Check if haptic feedback is supported
 */
export function isHapticFeedbackSupported(): boolean {
  return 'vibrate' in navigator;
}

export default useSwipe;
