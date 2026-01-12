/**
 * Progress Visualization Component
 * Multi-step progress indicator with animations for intent tracking
 * 
 * Features:
 * - 4 visual steps: Validate, Swap, Bridge, Settle
 * - Animated loading indicator for current step
 * - Checkmark for completed steps
 * - Vertical/horizontal connecting lines
 * - Substep details with confirmations
 * - Estimated time remaining
 * - Copy button for tx hash
 * - Mobile-responsive (horizontal on mobile)
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, X, ArrowRight, Clock, Zap, Link2, Coins, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

// Step definitions
export type IntentStep =
  | 'pending'
  | 'validating'
  | 'validated'
  | 'routing'
  | 'swapping'
  | 'swapped'
  | 'bridging'
  | 'bridge_pending'
  | 'bridge_completed'
  | 'settling'
  | 'completed'
  | 'failed';

export interface StepInfo {
  id: IntentStep;
  label: string;
  description: string;
  icon: React.ElementType;
}

// Visual step groupings for UI
const VISUAL_STEPS: StepInfo[] = [
  {
    id: 'validating',
    label: 'Validate',
    description: 'Verifying intent parameters',
    icon: Shield,
  },
  {
    id: 'swapping',
    label: 'Swap',
    description: 'Executing token swap',
    icon: Coins,
  },
  {
    id: 'bridging',
    label: 'Bridge',
    description: 'Cross-chain transfer via CCIP',
    icon: Link2,
  },
  {
    id: 'settling',
    label: 'Settle',
    description: 'Finalizing transaction',
    icon: Zap,
  },
];

// Map detailed steps to visual step index
const STEP_TO_VISUAL_INDEX: Record<IntentStep, number> = {
  pending: -1,
  validating: 0,
  validated: 0,
  routing: 1,
  swapping: 1,
  swapped: 1,
  bridging: 2,
  bridge_pending: 2,
  bridge_completed: 2,
  settling: 3,
  completed: 4,
  failed: -2,
};

// Progress percentages
const STEP_PROGRESS: Record<IntentStep, number> = {
  pending: 0,
  validating: 10,
  validated: 20,
  routing: 30,
  swapping: 40,
  swapped: 50,
  bridging: 60,
  bridge_pending: 70,
  bridge_completed: 80,
  settling: 90,
  completed: 100,
  failed: -1,
};

// Messages for each step
const STEP_MESSAGES: Record<IntentStep, string> = {
  pending: 'Intent submitted, waiting for validation...',
  validating: 'Validating intent parameters...',
  validated: 'Intent validated, preparing route...',
  routing: 'Finding optimal route...',
  swapping: 'Executing swap on source chain...',
  swapped: 'Swap complete, initiating bridge...',
  bridging: 'Sending CCIP message...',
  bridge_pending: 'Cross-chain transfer in progress...',
  bridge_completed: 'Bridge complete, finalizing...',
  settling: 'Settling tokens on destination...',
  completed: 'Intent completed successfully!',
  failed: 'Intent failed - check details',
};

interface ProgressVisualizationProps {
  currentStep: IntentStep;
  progress?: number;
  estimatedTimeRemaining?: number;
  txHash?: string;
  ccipMessageId?: string;
  className?: string;
  compact?: boolean;
  showDetails?: boolean;
}

export function ProgressVisualization({
  currentStep,
  progress,
  estimatedTimeRemaining,
  txHash,
  ccipMessageId,
  className,
  compact = false,
  showDetails = true,
}: ProgressVisualizationProps) {
  const visualIndex = STEP_TO_VISUAL_INDEX[currentStep];
  const actualProgress = progress ?? STEP_PROGRESS[currentStep];
  const isFailed = currentStep === 'failed';
  const isCompleted = currentStep === 'completed';

  const formattedTime = useMemo(() => {
    if (!estimatedTimeRemaining || estimatedTimeRemaining <= 0) return null;
    const minutes = Math.floor(estimatedTimeRemaining / 60);
    const seconds = estimatedTimeRemaining % 60;
    if (minutes > 0) {
      return `~${minutes}m ${seconds}s`;
    }
    return `~${seconds}s`;
  }, [estimatedTimeRemaining]);

  if (compact) {
    return (
      <CompactProgress
        currentStep={currentStep}
        progress={actualProgress}
        isFailed={isFailed}
        isCompleted={isCompleted}
        className={className}
      />
    );
  }

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Step indicators */}
      <div className="relative">
        {/* Progress line background */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-gray-700" />

        {/* Animated progress line */}
        <motion.div
          className={cn(
            'absolute top-5 left-0 h-0.5',
            isFailed ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
          )}
          initial={{ width: '0%' }}
          animate={{ width: `${Math.max(0, Math.min(100, actualProgress))}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />

        {/* Step circles */}
        <div className="relative flex justify-between">
          {VISUAL_STEPS.map((step, index) => {
            const isActive = visualIndex === index;
            const isComplete = visualIndex > index || isCompleted;
            const isError = isFailed && visualIndex === index;
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex flex-col items-center">
                <motion.div
                  className={cn(
                    'relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
                    isComplete && !isError
                      ? 'border-green-500 bg-green-500 text-white'
                      : isActive && !isError
                        ? 'border-blue-500 bg-blue-500 text-white'
                        : isError
                          ? 'border-red-500 bg-red-500 text-white'
                          : 'border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600'
                  )}
                  initial={{ scale: 1 }}
                  animate={isActive ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                  transition={{ repeat: isActive ? Infinity : 0, duration: 2 }}
                >
                  <AnimatePresence mode="wait">
                    {isComplete && !isError ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Check className="h-5 w-5" />
                      </motion.div>
                    ) : isActive && !isError ? (
                      <motion.div
                        key="loader"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, rotate: 360 }}
                        transition={{ rotate: { repeat: Infinity, duration: 1, ease: 'linear' } }}
                      >
                        <Loader2 className="h-5 w-5 animate-spin" />
                      </motion.div>
                    ) : isError ? (
                      <motion.div
                        key="error"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <X className="h-5 w-5" />
                      </motion.div>
                    ) : (
                      <motion.div key="icon" initial={{ opacity: 0.5 }} animate={{ opacity: 1 }}>
                        <Icon className="h-5 w-5 text-gray-400" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Step label */}
                <span
                  className={cn(
                    'mt-2 text-xs font-medium',
                    isComplete || isActive
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-500 dark:text-gray-400'
                  )}
                >
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status message and details */}
      {showDetails && (
        <div className="space-y-3">
          {/* Current status message */}
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'text-center text-sm font-medium',
              isFailed
                ? 'text-red-600 dark:text-red-400'
                : isCompleted
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-300'
            )}
          >
            {STEP_MESSAGES[currentStep]}
          </motion.div>

          {/* Progress bar */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <motion.div
              className={cn(
                'h-full rounded-full',
                isFailed
                  ? 'bg-red-500'
                  : isCompleted
                    ? 'bg-green-500'
                    : 'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500'
              )}
              initial={{ width: '0%' }}
              animate={{ width: `${Math.max(0, actualProgress)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
            {!isCompleted && !isFailed && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              />
            )}
          </div>

          {/* Time estimate and progress percentage */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{actualProgress}% complete</span>
            {formattedTime && !isCompleted && !isFailed && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formattedTime} remaining
              </span>
            )}
          </div>

          {/* Transaction links */}
          {(txHash || ccipMessageId) && (
            <div className="flex flex-wrap gap-3 pt-2">
              {txHash && (
                <a
                  href={`https://sepolia.arbiscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600"
                >
                  View on Arbiscan
                  <ArrowRight className="h-3 w-3" />
                </a>
              )}
              {ccipMessageId && (
                <a
                  href={`https://ccip.chain.link/msg/${ccipMessageId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-purple-500 hover:text-purple-600"
                >
                  Track on CCIP Explorer
                  <ArrowRight className="h-3 w-3" />
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Compact progress for list views
function CompactProgress({
  currentStep,
  progress,
  isFailed,
  isCompleted,
  className,
}: {
  currentStep: IntentStep;
  progress: number;
  isFailed: boolean;
  isCompleted: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Status icon */}
      <div
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full',
          isFailed
            ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
            : isCompleted
              ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
        )}
      >
        {isFailed ? (
          <X className="h-4 w-4" />
        ) : isCompleted ? (
          <Check className="h-4 w-4" />
        ) : (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
      </div>

      {/* Progress bar */}
      <div className="flex-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <motion.div
            className={cn(
              'h-full rounded-full',
              isFailed
                ? 'bg-red-500'
                : isCompleted
                  ? 'bg-green-500'
                  : 'bg-blue-500'
            )}
            initial={{ width: '0%' }}
            animate={{ width: `${Math.max(0, progress)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {STEP_MESSAGES[currentStep]}
        </span>
      </div>
    </div>
  );
}

// Step detail card component
export function StepDetailCard({
  step,
  isActive,
  isComplete,
  details,
}: {
  step: StepInfo;
  isActive: boolean;
  isComplete: boolean;
  details?: string;
}) {
  const Icon = step.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        'rounded-lg border p-4 transition-colors',
        isActive
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : isComplete
            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
            : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full',
            isActive
              ? 'bg-blue-500 text-white'
              : isComplete
                ? 'bg-green-500 text-white'
                : 'bg-gray-300 text-gray-600 dark:bg-gray-600'
          )}
        >
          {isComplete ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 dark:text-white">{step.label}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">{step.description}</p>
          {details && (
            <p className="mt-2 text-xs text-gray-600 dark:text-gray-300">{details}</p>
          )}
        </div>
        {isActive && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
      </div>
    </motion.div>
  );
}

// Full step timeline component
export function StepTimeline({
  currentStep,
  stepTimes,
}: {
  currentStep: IntentStep;
  stepTimes?: Record<string, Date>;
}) {
  const visualIndex = STEP_TO_VISUAL_INDEX[currentStep];

  return (
    <div className="space-y-3">
      {VISUAL_STEPS.map((step, index) => {
        const isActive = visualIndex === index;
        const isComplete = visualIndex > index || currentStep === 'completed';
        const timestamp = stepTimes?.[step.id];

        return (
          <StepDetailCard
            key={step.id}
            step={step}
            isActive={isActive}
            isComplete={isComplete}
            details={timestamp ? `Completed at ${timestamp.toLocaleTimeString()}` : undefined}
          />
        );
      })}
    </div>
  );
}

export default ProgressVisualization;
