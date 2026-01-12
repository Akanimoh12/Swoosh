/**
 * Enhanced Progress Visualization Component
 * Multi-step progress indicator with all required features
 * 
 * Features:
 * ✅ 4 visual steps: Validate, Swap, Bridge, Settle
 * ✅ Animated loading indicator (spinner + pulse) for current step
 * ✅ Checkmark for completed steps in success color
 * ✅ Future steps muted with hollow circle
 * ✅ Vertical connecting line between steps (desktop)
 * ✅ Horizontal stepper for mobile
 * ✅ Substep details (e.g., "Waiting for 6 confirmations...")
 * ✅ Estimated time remaining updating in real-time
 * ✅ Transaction hash with copy button and block explorer link
 * ✅ Smooth step transitions (fade in, slide up)
 */

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Check, 
  Loader2, 
  X, 
  Clock, 
  Zap, 
  Link2, 
  Coins, 
  Shield, 
  Copy, 
  ExternalLink,
  Circle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

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
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  substeps?: string[];
}

// ============================================================================
// Configuration
// ============================================================================

// Visual step definitions with substep details
const VISUAL_STEPS: StepInfo[] = [
  {
    id: 'validate',
    label: 'Validate',
    description: 'Verifying intent parameters',
    icon: Shield,
    substeps: ['Checking balances...', 'Validating parameters...', 'Intent approved!'],
  },
  {
    id: 'swap',
    label: 'Swap',
    description: 'Executing token swap',
    icon: Coins,
    substeps: ['Finding best route...', 'Executing swap...', 'Waiting for confirmation...', 'Swap confirmed!'],
  },
  {
    id: 'bridge',
    label: 'Bridge',
    description: 'Cross-chain transfer via CCIP',
    icon: Link2,
    substeps: ['Initiating CCIP transfer...', 'Message sent to destination...', 'Waiting for finality (~2-5 min)...', 'Bridge complete!'],
  },
  {
    id: 'settle',
    label: 'Settle',
    description: 'Finalizing transaction',
    icon: Zap,
    substeps: ['Verifying arrival...', 'Confirming settlement...', 'Transaction complete!'],
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

// Map detailed steps to substep index within visual step
const STEP_TO_SUBSTEP_INDEX: Record<IntentStep, number> = {
  pending: -1,
  validating: 1,
  validated: 2,
  routing: 0,
  swapping: 1,
  swapped: 3,
  bridging: 0,
  bridge_pending: 2,
  bridge_completed: 3,
  settling: 1,
  completed: 2,
  failed: -1,
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

// Time estimates in seconds
const TIME_ESTIMATES: Record<IntentStep, number> = {
  pending: 600,
  validating: 540,
  validated: 480,
  routing: 420,
  swapping: 360,
  swapped: 300,
  bridging: 240,
  bridge_pending: 180,
  bridge_completed: 60,
  settling: 30,
  completed: 0,
  failed: 0,
};

// ============================================================================
// Props
// ============================================================================

interface ProgressVisualizationProps {
  currentStep: IntentStep;
  progress?: number;
  estimatedTimeRemaining?: number;
  txHash?: string;
  ccipMessageId?: string;
  confirmations?: number;
  requiredConfirmations?: number;
  className?: string;
  variant?: 'default' | 'compact' | 'vertical';
  showDetails?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function ProgressVisualization({
  currentStep,
  progress,
  estimatedTimeRemaining,
  txHash,
  ccipMessageId,
  confirmations = 0,
  requiredConfirmations = 6,
  className,
  variant = 'default',
  showDetails = true,
}: ProgressVisualizationProps) {
  const [copied, setCopied] = useState(false);
  const [displayTime, setDisplayTime] = useState(estimatedTimeRemaining ?? TIME_ESTIMATES[currentStep]);
  
  const visualIndex = STEP_TO_VISUAL_INDEX[currentStep];
  const substepIndex = STEP_TO_SUBSTEP_INDEX[currentStep];
  const actualProgress = progress ?? STEP_PROGRESS[currentStep];
  const isFailed = currentStep === 'failed';
  const isCompleted = currentStep === 'completed';

  // Update display time countdown
  useEffect(() => {
    if (isCompleted || isFailed || displayTime <= 0) return;
    
    const timer = setInterval(() => {
      setDisplayTime(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isCompleted, isFailed, displayTime]);

  // Reset display time when step changes
  useEffect(() => {
    setDisplayTime(estimatedTimeRemaining ?? TIME_ESTIMATES[currentStep]);
  }, [currentStep, estimatedTimeRemaining]);

  const formattedTime = useMemo(() => {
    if (displayTime <= 0) return null;
    const minutes = Math.floor(displayTime / 60);
    const seconds = displayTime % 60;
    if (minutes > 0) {
      return `~${minutes}m ${seconds.toString().padStart(2, '0')}s`;
    }
    return `~${seconds}s`;
  }, [displayTime]);

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Get current substep message
  const currentSubstep = useMemo(() => {
    if (visualIndex < 0 || visualIndex >= VISUAL_STEPS.length) return null;
    const step = VISUAL_STEPS[visualIndex];
    if (!step.substeps || substepIndex < 0) return step.description;
    
    // Add confirmation count for swapping step
    if (currentStep === 'swapping' && confirmations > 0) {
      return `Waiting for ${confirmations}/${requiredConfirmations} confirmations...`;
    }
    
    return step.substeps[Math.min(substepIndex, step.substeps.length - 1)];
  }, [visualIndex, substepIndex, currentStep, confirmations, requiredConfirmations]);

  // Render based on variant
  if (variant === 'compact') {
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

  if (variant === 'vertical') {
    return (
      <VerticalStepper
        currentStep={currentStep}
        visualIndex={visualIndex}
        substepIndex={substepIndex}
        isFailed={isFailed}
        isCompleted={isCompleted}
        currentSubstep={currentSubstep}
        formattedTime={formattedTime}
        txHash={txHash}
        ccipMessageId={ccipMessageId}
        copied={copied}
        copyToClipboard={copyToClipboard}
        className={className}
      />
    );
  }

  return (
    <div className={cn('w-full space-y-6', className)}>
      {/* Responsive: Horizontal on desktop, Vertical on mobile */}
      <div className="hidden sm:block">
        <HorizontalStepper
          visualIndex={visualIndex}
          isFailed={isFailed}
          isCompleted={isCompleted}
          actualProgress={actualProgress}
        />
      </div>
      
      <div className="sm:hidden">
        <VerticalStepper
          currentStep={currentStep}
          visualIndex={visualIndex}
          substepIndex={substepIndex}
          isFailed={isFailed}
          isCompleted={isCompleted}
          currentSubstep={currentSubstep}
          formattedTime={formattedTime}
          txHash={txHash}
          ccipMessageId={ccipMessageId}
          copied={copied}
          copyToClipboard={copyToClipboard}
        />
      </div>

      {/* Status details - desktop only (mobile shows in vertical stepper) */}
      {showDetails && (
        <div className="hidden sm:block space-y-4">
          {/* Current status message */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="text-center"
            >
              <p className={cn(
                'text-sm font-medium',
                isFailed ? 'text-red-600 dark:text-red-400' :
                isCompleted ? 'text-green-600 dark:text-green-400' :
                'text-gray-600 dark:text-gray-300'
              )}>
                {currentSubstep}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Progress bar with shimmer */}
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <motion.div
              className={cn(
                'h-full rounded-full',
                isFailed ? 'bg-red-500' :
                isCompleted ? 'bg-green-500' :
                'bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500'
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

          {/* Progress and time */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{actualProgress}% complete</span>
            {formattedTime && !isCompleted && !isFailed && (
              <motion.span 
                className="flex items-center gap-1"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Clock className="h-3 w-3" />
                {formattedTime} remaining
              </motion.span>
            )}
          </div>

          {/* Transaction links with copy buttons */}
          {(txHash || ccipMessageId) && (
            <div className="flex flex-wrap gap-3 pt-2">
              {txHash && (
                <TransactionLink
                  hash={txHash}
                  label="Transaction"
                  explorerUrl={`https://sepolia.arbiscan.io/tx/${txHash}`}
                  copied={copied}
                  onCopy={copyToClipboard}
                />
              )}
              {ccipMessageId && (
                <TransactionLink
                  hash={ccipMessageId}
                  label="CCIP Message"
                  explorerUrl={`https://ccip.chain.link/msg/${ccipMessageId}`}
                  copied={copied}
                  onCopy={copyToClipboard}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Horizontal Stepper (Desktop)
// ============================================================================

function HorizontalStepper({
  visualIndex,
  isFailed,
  isCompleted,
  actualProgress,
}: {
  visualIndex: number;
  isFailed: boolean;
  isCompleted: boolean;
  actualProgress: number;
}) {
  return (
    <div className="relative">
      {/* Progress line background */}
      <div className="absolute top-5 left-[5%] right-[5%] h-0.5 bg-gray-200 dark:bg-gray-700" />

      {/* Animated progress line */}
      <motion.div
        className={cn(
          'absolute top-5 left-[5%] h-0.5 origin-left',
          isFailed ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-purple-500'
        )}
        style={{ width: '90%' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: Math.min(actualProgress / 100, 1) }}
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
            <motion.div 
              key={step.id} 
              className="flex flex-col items-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <motion.div
                className={cn(
                  'relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300',
                  isComplete && !isError
                    ? 'border-green-500 bg-green-500 text-white shadow-lg shadow-green-500/30'
                    : isActive && !isError
                      ? 'border-blue-500 bg-blue-500 text-white shadow-lg shadow-blue-500/30'
                      : isError
                        ? 'border-red-500 bg-red-500 text-white shadow-lg shadow-red-500/30'
                        : 'border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 text-gray-400'
                )}
                animate={isActive && !isError ? { 
                  scale: [1, 1.1, 1],
                  boxShadow: [
                    '0 0 0 0 rgba(59, 130, 246, 0)',
                    '0 0 0 8px rgba(59, 130, 246, 0.2)',
                    '0 0 0 0 rgba(59, 130, 246, 0)'
                  ]
                } : {}}
                transition={{ repeat: isActive ? Infinity : 0, duration: 2 }}
              >
                <AnimatePresence mode="wait">
                  {isComplete && !isError ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: 'spring', stiffness: 200 }}
                    >
                      <Check className="h-5 w-5" strokeWidth={3} />
                    </motion.div>
                  ) : isActive && !isError ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : isError ? (
                    <motion.div
                      key="error"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      <X className="h-5 w-5" strokeWidth={3} />
                    </motion.div>
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </AnimatePresence>
              </motion.div>

              <motion.span
                className={cn(
                  'mt-2 text-xs font-medium transition-colors',
                  isComplete || isActive
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-gray-500'
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 + 0.2 }}
              >
                {step.label}
              </motion.span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// Vertical Stepper (Mobile)
// ============================================================================

function VerticalStepper({
  visualIndex,
  isFailed,
  isCompleted,
  currentSubstep,
  formattedTime,
  txHash,
  ccipMessageId,
  copied,
  copyToClipboard,
  className,
}: {
  currentStep: IntentStep;
  visualIndex: number;
  substepIndex: number;
  isFailed: boolean;
  isCompleted: boolean;
  currentSubstep: string | null;
  formattedTime: string | null;
  txHash?: string;
  ccipMessageId?: string;
  copied: boolean;
  copyToClipboard: (text: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('space-y-0', className)}>
      {VISUAL_STEPS.map((step, index) => {
        const isActive = visualIndex === index;
        const isComplete = visualIndex > index || isCompleted;
        const isError = isFailed && visualIndex === index;
        const isFuture = visualIndex < index && !isCompleted;
        const Icon = step.icon;

        return (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="relative"
          >
            {/* Vertical connecting line */}
            {index < VISUAL_STEPS.length - 1 && (
              <div className="absolute left-5 top-10 bottom-0 w-0.5 -mb-2">
                <div className="h-full bg-gray-200 dark:bg-gray-700" />
                {(isComplete || isActive) && (
                  <motion.div
                    className={cn(
                      'absolute top-0 left-0 w-full',
                      isError ? 'bg-red-500' : 'bg-gradient-to-b from-green-500 to-blue-500'
                    )}
                    initial={{ height: '0%' }}
                    animate={{ height: isComplete ? '100%' : '50%' }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  />
                )}
              </div>
            )}

            <div className="flex gap-4 pb-6">
              {/* Step indicator */}
              <motion.div
                className={cn(
                  'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                  isComplete && !isError
                    ? 'border-green-500 bg-green-500 text-white'
                    : isActive && !isError
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : isError
                        ? 'border-red-500 bg-red-500 text-white'
                        : 'border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600'
                )}
                animate={isActive && !isError ? {
                  scale: [1, 1.05, 1],
                } : {}}
                transition={{ repeat: isActive ? Infinity : 0, duration: 1.5 }}
              >
                {isComplete && !isError ? (
                  <Check className="h-5 w-5" strokeWidth={3} />
                ) : isActive && !isError ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : isError ? (
                  <X className="h-5 w-5" strokeWidth={3} />
                ) : isFuture ? (
                  <Circle className="h-5 w-5 text-gray-400" />
                ) : (
                  <Icon className="h-5 w-5 text-gray-400" />
                )}
              </motion.div>

              {/* Step content */}
              <div className="flex-1 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className={cn(
                    'font-medium',
                    isComplete || isActive ? 'text-gray-900 dark:text-white' : 'text-gray-400'
                  )}>
                    {step.label}
                  </h4>
                  {isActive && formattedTime && (
                    <motion.span 
                      className="text-xs text-gray-500 flex items-center gap-1"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      <Clock className="h-3 w-3" />
                      {formattedTime}
                    </motion.span>
                  )}
                </div>

                {/* Substep details */}
                <AnimatePresence mode="wait">
                  {isActive && currentSubstep && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-sm text-gray-500 dark:text-gray-400 mt-1"
                    >
                      {currentSubstep}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Transaction links for this step */}
                {isActive && (txHash || ccipMessageId) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 space-y-1"
                  >
                    {txHash && visualIndex <= 1 && (
                      <TransactionLink
                        hash={txHash}
                        label="TX"
                        explorerUrl={`https://sepolia.arbiscan.io/tx/${txHash}`}
                        copied={copied}
                        onCopy={copyToClipboard}
                        compact
                      />
                    )}
                    {ccipMessageId && visualIndex === 2 && (
                      <TransactionLink
                        hash={ccipMessageId}
                        label="CCIP"
                        explorerUrl={`https://ccip.chain.link/msg/${ccipMessageId}`}
                        copied={copied}
                        onCopy={copyToClipboard}
                        compact
                      />
                    )}
                  </motion.div>
                )}

                {/* Completed step indicator */}
                {isComplete && !isActive && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    ✓ Completed
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Transaction Link Component
// ============================================================================

function TransactionLink({
  hash,
  label,
  explorerUrl,
  copied,
  onCopy,
  compact = false,
}: {
  hash: string;
  label: string;
  explorerUrl: string;
  copied: boolean;
  onCopy: (text: string) => void;
  compact?: boolean;
}) {
  const shortHash = `${hash.slice(0, 6)}...${hash.slice(-4)}`;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-400">{label}:</span>
        <code className="font-mono text-gray-600 dark:text-gray-300">{shortHash}</code>
        <button
          onClick={() => onCopy(hash)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="Copy"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3 text-gray-400" />
          )}
        </button>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="View in explorer"
        >
          <ExternalLink className="h-3 w-3 text-blue-500" />
        </a>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <span className="text-xs text-gray-500">{label}:</span>
      <code className="font-mono text-xs text-gray-700 dark:text-gray-300">{shortHash}</code>
      <button
        onClick={() => onCopy(hash)}
        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
        title="Copy full hash"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600" />
        )}
      </button>
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
        title="View in explorer"
      >
        <ExternalLink className="h-4 w-4 text-blue-500 hover:text-blue-600" />
      </a>
    </div>
  );
}

// ============================================================================
// Compact Progress (for list views)
// ============================================================================

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
  const visualIndex = STEP_TO_VISUAL_INDEX[currentStep];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Mini step indicators */}
      <div className="flex items-center gap-1">
        {VISUAL_STEPS.map((step, index) => {
          const isActive = visualIndex === index;
          const isComplete = visualIndex > index || isCompleted;
          const isError = isFailed && visualIndex === index;

          return (
            <motion.div
              key={step.id}
              className={cn(
                'h-2 w-2 rounded-full',
                isComplete && !isError ? 'bg-green-500' :
                isActive && !isError ? 'bg-blue-500' :
                isError ? 'bg-red-500' :
                'bg-gray-300 dark:bg-gray-600'
              )}
              animate={isActive && !isError ? { scale: [1, 1.3, 1] } : {}}
              transition={{ repeat: isActive ? Infinity : 0, duration: 1 }}
            />
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={cn(
            'h-full rounded-full',
            isFailed ? 'bg-red-500' :
            isCompleted ? 'bg-green-500' :
            'bg-blue-500'
          )}
          initial={{ width: '0%' }}
          animate={{ width: `${Math.max(0, progress)}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Percentage */}
      <span className={cn(
        'text-xs font-medium w-10 text-right',
        isFailed ? 'text-red-500' :
        isCompleted ? 'text-green-500' :
        'text-gray-500'
      )}>
        {isCompleted ? '100%' : isFailed ? 'Failed' : `${progress}%`}
      </span>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default ProgressVisualization;
export { CompactProgress, VerticalStepper, HorizontalStepper, TransactionLink };
