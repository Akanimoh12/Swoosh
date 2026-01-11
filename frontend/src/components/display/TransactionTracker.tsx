import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle2, Loader2, Circle, XCircle, ExternalLink } from 'lucide-react';

export type TransactionStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface TransactionStep {
  id: string;
  title: string;
  description: string;
  status: TransactionStatus;
  timestamp?: string;
  txHash?: string;
  explorerUrl?: string;
  estimatedTime?: string;
  errorMessage?: string;
}

export interface TransactionTrackerProps {
  steps: TransactionStep[];
  currentStepIndex?: number;
  className?: string;
}

export function TransactionTracker({ steps, currentStepIndex = 0, className }: TransactionTrackerProps) {
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="space-y-1">
          {steps.map((step, index) => (
            <TransactionStepItem
              key={step.id}
              step={step}
              isLast={index === steps.length - 1}
              isCurrent={index === currentStepIndex}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface TransactionStepItemProps {
  step: TransactionStep;
  isLast: boolean;
  isCurrent: boolean;
}

function TransactionStepItem({ step, isLast, isCurrent }: TransactionStepItemProps) {
  const getStatusIcon = () => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="w-6 h-6 text-green-500" />;
      case 'processing':
        return <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'pending':
      default:
        return <Circle className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    const variants: Record<TransactionStatus, 'success' | 'warning' | 'error' | 'default'> = {
      completed: 'success',
      processing: 'warning',
      failed: 'error',
      pending: 'default'
    };

    return (
      <Badge variant={variants[step.status]} className="text-xs capitalize">
        {step.status}
      </Badge>
    );
  };

  return (
    <div className="relative flex gap-4 pb-8">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-3 top-6 bottom-0 w-0.5 bg-border" />
      )}

      {/* Status Icon */}
      <div className="relative flex-shrink-0 z-10 bg-background">
        {getStatusIcon()}
      </div>

      {/* Content */}
      <div className={`flex-1 -mt-1 ${isCurrent ? 'bg-accent/30 -ml-2 -mr-4 pl-2 pr-4 py-2 rounded-lg' : ''}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold">{step.title}</h4>
              {getStatusBadge()}
            </div>
            <p className="text-sm text-muted-foreground">{step.description}</p>

            {/* Timestamp */}
            {step.timestamp && (
              <div className="text-xs text-muted-foreground mt-1">
                {step.timestamp}
              </div>
            )}

            {/* Estimated Time (for pending/processing) */}
            {(step.status === 'pending' || step.status === 'processing') && step.estimatedTime && (
              <div className="text-xs text-muted-foreground mt-1">
                ⏱️ Est. {step.estimatedTime}
              </div>
            )}

            {/* Error Message */}
            {step.status === 'failed' && step.errorMessage && (
              <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-600 dark:text-red-400">
                {step.errorMessage}
              </div>
            )}

            {/* Transaction Hash Link */}
            {step.txHash && step.explorerUrl && (
              <a
                href={step.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs text-primary hover:text-primary/80 transition-colors"
              >
                <span className="font-mono">{step.txHash.slice(0, 10)}...{step.txHash.slice(-8)}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* Processing Animation Bar */}
        {step.status === 'processing' && (
          <div className="mt-3 w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        )}
      </div>
    </div>
  );
}
