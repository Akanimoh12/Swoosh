/**
 * Intent Detail Modal
 * Shows full intent details including route, transactions, gas costs, timeline
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Copy,
  ExternalLink,
  Check,
  Loader2,
  ArrowRight,
  RefreshCw,
  Zap,
  Coins,
  Link2,
  Shield,
} from 'lucide-react';
import { getIntent, ApiError } from '@/services';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface IntentDetail {
  id: string;
  rawText: string;
  status: string;
  sourceChain: string | null;
  destChain: string | null;
  sourceToken: string | null;
  destToken: string | null;
  amount: string | null;
  estimatedCost: string | null;
  actualCost: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  parsedData: Record<string, unknown> | null;
  route: Record<string, unknown> | null;
  transactions: TransactionRecord[];
  gasCosts: GasCostBreakdown | null;
  executionTimeline: TimelineEvent[];
  errorMessage: string | null;
}

interface TransactionRecord {
  id: string;
  type: string;
  txHash: string;
  chainId: number;
  status: string;
  gasUsed: string | null;
  gasPrice: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

interface GasCostBreakdown {
  validation: string;
  swap: string;
  bridge: string;
  settlement: string;
  total: string;
  savedVsTraditional: string;
}

interface TimelineEvent {
  step: string;
  status: 'completed' | 'current' | 'pending' | 'failed';
  timestamp: string | null;
  txHash: string | null;
  details: string | null;
}

interface IntentDetailModalProps {
  intentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onRetry?: (rawText: string) => void;
}

// ============================================================================
// Constants
// ============================================================================

const STEP_ICONS: Record<string, React.ElementType> = {
  validation: Shield,
  swap: Coins,
  bridge: Link2,
  settlement: Zap,
};

const CHAIN_EXPLORERS: Record<number, string> = {
  421614: 'https://sepolia.arbiscan.io',
  84532: 'https://sepolia.basescan.org',
};

// ============================================================================
// Components
// ============================================================================

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <button
      onClick={copy}
      className="p-1.5 hover:bg-muted rounded-md transition-colors"
      title={`Copy ${label || 'to clipboard'}`}
    >
      {copied ? (
        <Check className="h-4 w-4 text-green-500" />
      ) : (
        <Copy className="h-4 w-4 text-muted-foreground" />
      )}
    </button>
  );
}

function TimelineStep({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const Icon = STEP_ICONS[event.step] || Zap;
  
  const statusColors = {
    completed: 'border-green-500 bg-green-500 text-white',
    current: 'border-blue-500 bg-blue-500 text-white',
    pending: 'border-gray-300 bg-white dark:bg-gray-800 dark:border-gray-600 text-gray-400',
    failed: 'border-red-500 bg-red-500 text-white',
  };

  const lineColors = {
    completed: 'bg-green-500',
    current: 'bg-gradient-to-b from-green-500 to-blue-500',
    pending: 'bg-gray-200 dark:bg-gray-700',
    failed: 'bg-red-500',
  };

  return (
    <div className="relative flex gap-4">
      {/* Connector line */}
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-0.5 -mb-4">
          <div className={cn('h-full', lineColors[event.status])} />
        </div>
      )}

      {/* Step icon */}
      <div
        className={cn(
          'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2',
          statusColors[event.status]
        )}
      >
        {event.status === 'current' ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : event.status === 'completed' ? (
          <Check className="h-5 w-5" />
        ) : event.status === 'failed' ? (
          <X className="h-5 w-5" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </div>

      {/* Step content */}
      <div className="flex-1 pb-8">
        <div className="flex items-center justify-between">
          <h4 className={cn(
            'font-medium capitalize',
            event.status === 'pending' ? 'text-gray-400' : 'text-foreground'
          )}>
            {event.step}
          </h4>
          {event.timestamp && (
            <span className="text-xs text-muted-foreground">
              {new Date(event.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>

        {event.details && (
          <p className="mt-1 text-sm text-muted-foreground">{event.details}</p>
        )}

        {event.txHash && (
          <div className="mt-2 flex items-center gap-2">
            <code className="text-xs font-mono text-muted-foreground">
              {event.txHash.slice(0, 10)}...{event.txHash.slice(-8)}
            </code>
            <CopyButton text={event.txHash} label="transaction hash" />
            <a
              href={`https://sepolia.arbiscan.io/tx/${event.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 hover:bg-muted rounded-md transition-colors"
              title="View on explorer"
            >
              <ExternalLink className="h-4 w-4 text-blue-500" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function GasCostCard({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  const formatted = parseFloat(value) > 0 
    ? `${(parseFloat(value) / 1e18).toFixed(6)} ETH`
    : '—';

  return (
    <div className={cn(
      'p-3 rounded-lg',
      highlight ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'
    )}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn(
        'font-medium',
        highlight && 'text-green-600 dark:text-green-400'
      )}>
        {formatted}
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function IntentDetailModal({ intentId, isOpen, onClose, onRetry }: IntentDetailModalProps) {
  const [intent, setIntent] = useState<IntentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch intent details
  useEffect(() => {
    if (!intentId || !isOpen) {
      setIntent(null);
      return;
    }

    const fetchDetails = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getIntent(intentId);
        setIntent(data as unknown as IntentDetail);
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 
                        err instanceof Error ? err.message : 'Something went wrong';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [intentId, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-background rounded-xl shadow-2xl mx-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Intent Details</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-130px)] p-4 space-y-6">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {intent && (
              <>
                {/* Intent Overview */}
                <div className="space-y-3">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-medium text-foreground">{intent.rawText}</p>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <StatusBadge status={intent.status} />
                    <span className="text-muted-foreground">•</span>
                    <span className="text-muted-foreground">
                      {new Date(intent.createdAt).toLocaleString()}
                    </span>
                  </div>

                  {/* Route summary */}
                  {intent.sourceChain && intent.destChain && (
                    <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm">
                      <span className="font-medium">{intent.amount} {intent.sourceToken}</span>
                      <span className="text-muted-foreground">on {intent.sourceChain}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{intent.destToken}</span>
                      <span className="text-muted-foreground">on {intent.destChain}</span>
                    </div>
                  )}

                  {/* Intent ID */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">ID:</span>
                    <code className="font-mono text-muted-foreground">{intent.id}</code>
                    <CopyButton text={intent.id} label="intent ID" />
                  </div>
                </div>

                {/* Execution Timeline */}
                <div className="space-y-3">
                  <h3 className="font-medium text-foreground">Execution Timeline</h3>
                  <div className="pl-1">
                    {intent.executionTimeline.map((event, index) => (
                      <TimelineStep
                        key={event.step}
                        event={event}
                        isLast={index === intent.executionTimeline.length - 1}
                      />
                    ))}
                  </div>
                </div>

                {/* Gas Costs */}
                {intent.gasCosts && (
                  <div className="space-y-3">
                    <h3 className="font-medium text-foreground">Gas Costs</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <GasCostCard label="Validation" value={intent.gasCosts.validation} />
                      <GasCostCard label="Swap" value={intent.gasCosts.swap} />
                      <GasCostCard label="Bridge" value={intent.gasCosts.bridge} />
                      <GasCostCard label="Settlement" value={intent.gasCosts.settlement} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <GasCostCard label="Total Cost" value={intent.gasCosts.total} />
                      <GasCostCard 
                        label="Gas Saved" 
                        value={intent.gasCosts.savedVsTraditional} 
                        highlight={parseFloat(intent.gasCosts.savedVsTraditional) > 0}
                      />
                    </div>
                  </div>
                )}

                {/* Transactions */}
                {intent.transactions.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="font-medium text-foreground">Transactions</h3>
                    <div className="space-y-2">
                      {intent.transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div>
                            <p className="text-sm font-medium capitalize">{tx.type.toLowerCase()}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <code className="text-xs font-mono text-muted-foreground">
                                {tx.txHash.slice(0, 10)}...{tx.txHash.slice(-8)}
                              </code>
                              <CopyButton text={tx.txHash} />
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <TxStatusBadge status={tx.status} />
                            <a
                              href={`${CHAIN_EXPLORERS[tx.chainId] || 'https://sepolia.arbiscan.io'}/tx/${tx.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 hover:bg-background rounded-md transition-colors"
                            >
                              <ExternalLink className="h-4 w-4 text-blue-500" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error message */}
                {intent.errorMessage && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-600 dark:text-red-400">{intent.errorMessage}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {intent && (
            <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
              {intent.status === 'FAILED' && onRetry && (
                <button
                  onClick={() => {
                    onRetry(intent.rawText);
                    onClose();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  Retry Intent
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm font-medium transition-colors"
              >
                Close
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bgColor: string }> = {
    COMPLETED: { color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
    FAILED: { color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
    PENDING: { color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  };

  const { color, bgColor } = config[status] || { color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' };

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', bgColor, color)}>
      {status}
    </span>
  );
}

function TxStatusBadge({ status }: { status: string }) {
  const isConfirmed = status === 'CONFIRMED';
  return (
    <span className={cn(
      'px-2 py-0.5 rounded-full text-xs font-medium',
      isConfirmed 
        ? 'bg-green-100 text-green-600 dark:bg-green-900/30'
        : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30'
    )}>
      {status}
    </span>
  );
}

export default IntentDetailModal;
