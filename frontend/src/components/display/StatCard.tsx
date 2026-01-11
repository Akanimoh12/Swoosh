import { Card, CardContent } from '@/components/ui/Card';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subLabel?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  iconColor?: string;
  className?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  subLabel,
  trend,
  iconColor = 'text-primary',
  className
}: StatCardProps) {
  const getTrendColor = () => {
    if (!trend) return '';
    return trend.direction === 'up' 
      ? 'text-green-600 dark:text-green-400' 
      : 'text-red-600 dark:text-red-400';
  };

  const TrendIcon = trend?.direction === 'up' ? TrendingUp : TrendingDown;

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          {/* Icon */}
          <div className={`p-3 rounded-lg bg-primary/10 ${iconColor}`}>
            <Icon className="w-6 h-6" />
          </div>

          {/* Trend Indicator */}
          {trend && (
            <div className={`flex items-center gap-1 text-sm font-medium ${getTrendColor()}`}>
              <TrendIcon className="w-4 h-4" />
              <span>{Math.abs(trend.value)}%</span>
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mt-4">
          <div className="text-3xl font-bold tracking-tight">{value}</div>
          <div className="text-sm text-muted-foreground mt-1">{label}</div>
          {subLabel && (
            <div className="text-xs text-muted-foreground mt-1">{subLabel}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
