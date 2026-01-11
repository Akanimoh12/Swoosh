import { Badge } from '@/components/ui/Badge';
import { Card, CardContent } from '@/components/ui/Card';
import { ArrowRight, ArrowDown, ExternalLink } from 'lucide-react';

export interface RouteStep {
  id: string;
  type: 'swap' | 'bridge' | 'transfer';
  protocol: string;
  fromChain: string;
  toChain: string;
  fromToken: {
    symbol: string;
    amount: string;
    logoUrl?: string;
  };
  toToken: {
    symbol: string;
    amount: string;
    logoUrl?: string;
  };
  estimatedTime: string;
  gasCost?: string;
  protocolFee?: string;
  explorerUrl?: string;
}

export interface RouteVisualizerProps {
  steps: RouteStep[];
  totalTime?: string;
  totalCost?: string;
  className?: string;
}

const PROTOCOL_COLORS: Record<string, string> = {
  'Uniswap': 'bg-pink-500',
  'SushiSwap': 'bg-blue-500',
  'Curve': 'bg-yellow-500',
  'CCIP': 'bg-green-500',
  'Across': 'bg-purple-500',
  'Hop': 'bg-indigo-500'
};

export function RouteVisualizer({ steps, totalTime, totalCost, className }: RouteVisualizerProps) {
  return (
    <div className={className}>
      <Card>
        <CardContent className="pt-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Optimized Route</h3>
              <p className="text-sm text-muted-foreground">
                {steps.length} step{steps.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              {totalTime && (
                <div className="text-sm font-medium">~{totalTime}</div>
              )}
              {totalCost && (
                <div className="text-xs text-muted-foreground">
                  Total cost: {totalCost}
                </div>
              )}
            </div>
          </div>

          {/* Route Steps */}
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div key={step.id}>
                <RouteStepCard step={step} stepNumber={index + 1} />
                
                {/* Connector Arrow */}
                {index < steps.length - 1 && (
                  <div className="flex justify-center my-3">
                    <ArrowDown className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface RouteStepCardProps {
  step: RouteStep;
  stepNumber: number;
}

function RouteStepCard({ step, stepNumber }: RouteStepCardProps) {
  const protocolColor = PROTOCOL_COLORS[step.protocol] || 'bg-gray-500';

  return (
    <div className="relative border border-border rounded-lg p-4 bg-card hover:border-primary/50 transition-colors">
      {/* Step Number Badge */}
      <div className="absolute -top-3 left-4 bg-background px-2">
        <Badge variant="default" className="text-xs">
          Step {stepNumber}
        </Badge>
      </div>

      <div className="space-y-3">
        {/* Protocol and Type */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${protocolColor}`} />
            <span className="font-semibold">{step.protocol}</span>
            <Badge variant="outline" className="text-xs capitalize">
              {step.type}
            </Badge>
          </div>
          {step.explorerUrl && (
            <a
              href={step.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Token Flow */}
        <div className="flex items-center justify-between gap-4">
          {/* From Token */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              {step.fromToken.logoUrl && (
                <img 
                  src={step.fromToken.logoUrl} 
                  alt={step.fromToken.symbol} 
                  className="w-6 h-6 rounded-full"
                />
              )}
              <div>
                <div className="font-medium">
                  {step.fromToken.amount} {step.fromToken.symbol}
                </div>
                <div className="text-xs text-muted-foreground">
                  {step.fromChain}
                </div>
              </div>
            </div>
          </div>

          {/* Arrow */}
          <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />

          {/* To Token */}
          <div className="flex-1 text-right">
            <div className="flex items-center justify-end gap-2">
              <div>
                <div className="font-medium">
                  {step.toToken.amount} {step.toToken.symbol}
                </div>
                <div className="text-xs text-muted-foreground">
                  {step.toChain}
                </div>
              </div>
              {step.toToken.logoUrl && (
                <img 
                  src={step.toToken.logoUrl} 
                  alt={step.toToken.symbol} 
                  className="w-6 h-6 rounded-full"
                />
              )}
            </div>
          </div>
        </div>

        {/* Step Details */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
          <div className="flex items-center gap-3">
            <span>⏱️ {step.estimatedTime}</span>
            {step.gasCost && <span>⛽ {step.gasCost}</span>}
            {step.protocolFee && <span>💰 {step.protocolFee}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
