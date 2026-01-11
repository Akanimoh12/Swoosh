import { Card, CardContent, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Clock } from 'lucide-react';

export type IntentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Intent {
  id: string;
  description: string;
  status: IntentStatus;
  fromChain: string;
  toChain: string;
  fromToken: {
    symbol: string;
    amount: string;
  };
  toToken: {
    symbol: string;
    amount: string;
  };
  timestamp: string;
  estimatedValue?: string;
}

export interface IntentCardProps {
  intent: Intent;
  onViewDetails?: (intentId: string) => void;
  className?: string;
}

export function IntentCard({ intent, onViewDetails, className }: IntentCardProps) {
  const getStatusVariant = (): 'success' | 'warning' | 'error' | 'default' => {
    switch (intent.status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'failed':
        return 'error';
      case 'pending':
      default:
        return 'default';
    }
  };

  const getStatusColor = () => {
    switch (intent.status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'processing':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      case 'pending':
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Card className={`hover:border-primary/50 transition-all cursor-pointer ${className}`}>
      <CardContent className="pt-6">
        {/* Status Badge and Timestamp */}
        <div className="flex items-center justify-between mb-3">
          <Badge variant={getStatusVariant()} className="capitalize">
            {intent.status}
          </Badge>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {formatTimestamp(intent.timestamp)}
          </div>
        </div>

        {/* Intent Description */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {intent.description}
        </p>

        {/* Route Summary */}
        <div className="flex items-center justify-between gap-4 p-3 bg-accent/30 rounded-lg">
          {/* From */}
          <div className="flex-1">
            <div className="text-xs text-muted-foreground mb-1">{intent.fromChain}</div>
            <div className="font-semibold">
              {intent.fromToken.amount} {intent.fromToken.symbol}
            </div>
          </div>

          {/* Arrow */}
          <ArrowRight className={`w-5 h-5 flex-shrink-0 ${getStatusColor()}`} />

          {/* To */}
          <div className="flex-1 text-right">
            <div className="text-xs text-muted-foreground mb-1">{intent.toChain}</div>
            <div className="font-semibold">
              {intent.toToken.amount} {intent.toToken.symbol}
            </div>
          </div>
        </div>

        {/* Estimated Value */}
        {intent.estimatedValue && (
          <div className="text-xs text-muted-foreground mt-2 text-center">
            Est. Value: {intent.estimatedValue}
          </div>
        )}
      </CardContent>

      {/* Footer with View Details Button */}
      <CardFooter className="pt-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails?.(intent.id)}
          className="w-full"
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
