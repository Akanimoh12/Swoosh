/**
 * Swipeable Intent Card
 * Mobile-optimized intent card with swipe gestures
 */

import { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ArrowRight, 
  ExternalLink,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { triggerHapticFeedback, isHapticFeedbackSupported } from '@/hooks/useSwipe';

// Types
interface IntentCardData {
  id: string;
  rawText: string;
  status: string;
  sourceChain: string | null;
  destChain: string | null;
  sourceToken: string | null;
  destToken: string | null;
  amount: string | null;
  estimatedCost: string | null;
  createdAt: string;
}

interface SwipeableIntentCardProps {
  intent: IntentCardData;
  onClick: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  index?: number;
  className?: string;
}

// Status configuration
const STATUS_CONFIG: Record<string, { 
  label: string; 
  color: string; 
  bgColor: string; 
  icon: typeof Clock 
}> = {
  PENDING: { label: 'Pending', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30', icon: Clock },
  VALIDATING: { label: 'Validating', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: Loader2 },
  VALIDATED: { label: 'Validated', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: CheckCircle2 },
  ROUTING: { label: 'Routing', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: Loader2 },
  EXECUTING: { label: 'Executing', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: Loader2 },
  BRIDGING: { label: 'Bridging', color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30', icon: Loader2 },
  SETTLING: { label: 'Settling', color: 'text-cyan-600', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30', icon: Loader2 },
  COMPLETED: { label: 'Completed', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', icon: CheckCircle2 },
  FAILED: { label: 'Failed', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: XCircle },
};

const SWIPE_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 500;

function StatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  const Icon = config.icon;
  const isAnimated = ['VALIDATING', 'ROUTING', 'EXECUTING', 'BRIDGING', 'SETTLING'].includes(status);

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
      config.bgColor,
      config.color
    )}>
      <Icon className={cn('h-3 w-3', isAnimated && 'animate-spin')} />
      {config.label}
    </span>
  );
}

export const SwipeableIntentCard = memo(function SwipeableIntentCard({
  intent,
  onClick,
  onSwipeLeft,
  onSwipeRight,
  index = 0,
  className,
}: SwipeableIntentCardProps) {
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const formattedDate = new Date(intent.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    setDragX(info.offset.x);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    setIsDragging(false);
    const { offset, velocity } = info;

    // Check if swipe was fast enough or far enough
    const swipedLeft = offset.x < -SWIPE_THRESHOLD || velocity.x < -SWIPE_VELOCITY_THRESHOLD;
    const swipedRight = offset.x > SWIPE_THRESHOLD || velocity.x > SWIPE_VELOCITY_THRESHOLD;

    if (swipedLeft && onSwipeLeft) {
      if (isHapticFeedbackSupported()) {
        triggerHapticFeedback('medium');
      }
      onSwipeLeft();
    } else if (swipedRight && onSwipeRight) {
      if (isHapticFeedbackSupported()) {
        triggerHapticFeedback('medium');
      }
      onSwipeRight();
    }

    setDragX(0);
  };

  // Calculate action reveal based on drag
  const showLeftAction = dragX > 50;
  const showRightAction = dragX < -50;

  return (
    <div className={cn("relative overflow-hidden rounded-xl", className)}>
      {/* Background action indicators */}
      <AnimatePresence>
        {showLeftAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-y-0 left-0 w-24 bg-green-500 flex items-center justify-center rounded-l-xl"
          >
            <Eye className="w-6 h-6 text-white" />
          </motion.div>
        )}
        {showRightAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-y-0 right-0 w-24 bg-blue-500 flex items-center justify-center rounded-r-xl"
          >
            <ExternalLink className="w-6 h-6 text-white" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0, x: isDragging ? dragX : 0 }}
        transition={{ 
          delay: index * 0.05, 
          duration: 0.3,
          x: { type: "spring", stiffness: 300, damping: 30 }
        }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onClick={() => {
          // Prevent click when dragging
          if (!isDragging) {
            onClick();
          }
        }}
        className={cn(
          "group cursor-pointer p-4 sm:p-5 bg-card border border-border rounded-xl",
          "hover:border-primary/50 hover:shadow-lg transition-all duration-200",
          "touch-pan-y select-none",
          // Ensure minimum touch target size
          "min-h-[88px]"
        )}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          {/* Intent text and details */}
          <div className="flex-1 min-w-0">
            <p className="text-sm sm:text-base font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
              {intent.rawText}
            </p>
            
            {/* Chain and token info */}
            {(intent.sourceChain || intent.destChain) && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span className="font-medium">{intent.amount} {intent.sourceToken}</span>
                <span className="text-muted-foreground/50">on</span>
                <span>{intent.sourceChain}</span>
                <ArrowRight className="h-3 w-3 flex-shrink-0" />
                <span>{intent.destToken}</span>
                <span className="text-muted-foreground/50">on</span>
                <span>{intent.destChain}</span>
              </div>
            )}

            {/* Timestamp */}
            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formattedDate}
            </p>
          </div>

          {/* Status and cost */}
          <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1">
            <StatusBadge status={intent.status} />
            {intent.estimatedCost && (
              <span className="text-xs text-muted-foreground">
                ~${parseFloat(intent.estimatedCost).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
});

export default SwipeableIntentCard;
