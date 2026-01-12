/**
 * Analytics Page
 * Displays user statistics and platform-wide analytics
 * Features auto-refresh and animated stat updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  CheckCircle2,
  DollarSign,
  Zap,
  Users,
  Globe,
  ArrowRight,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Clock,
  Pause,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TransactionLineChart,
  ChainPieChart,
  TokenBarChart,
  Sparkline,
} from '@/components/charts/AnalyticsCharts';
import { 
  getUserAnalytics, 
  getPlatformAnalytics, 
  type UserAnalyticsResponse, 
  type PlatformAnalyticsResponse,
  ApiError,
} from '@/services';

// ============================================================================
// Constants
// ============================================================================

const AUTO_REFRESH_INTERVALS = [
  { value: 0, label: 'Off' },
  { value: 30, label: '30s' },
  { value: 60, label: '1m' },
  { value: 300, label: '5m' },
];

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  sparklineData?: number[];
  className?: string;
  previousValue?: string | number;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  sparklineData,
  className,
  previousValue,
}: StatCardProps) {
  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;
  const trendColor = trend && trend > 0 ? 'text-green-500' : trend && trend < 0 ? 'text-red-500' : 'text-muted-foreground';
  
  // Determine if value changed
  const hasChanged = previousValue !== undefined && previousValue !== value;
  const valueIncreased = hasChanged && (
    typeof value === 'number' && typeof previousValue === 'number' 
      ? value > previousValue 
      : String(value) > String(previousValue)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-card border border-border rounded-xl p-6 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-2 bg-primary/10 rounded-lg text-primary">
          {icon}
        </div>
        {trend !== undefined && (
          <div className={cn('flex items-center gap-1 text-sm', trendColor)}>
            <TrendIcon className="w-4 h-4" />
            <span>{Math.abs(trend).toFixed(1)}%</span>
          </div>
        )}
      </div>
      
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{title}</p>
        <AnimatePresence mode="wait">
          <motion.p 
            key={String(value)}
            initial={hasChanged ? { opacity: 0, y: -10 } : false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={cn(
              'text-2xl font-bold transition-colors duration-300',
              hasChanged && valueIncreased && 'text-green-500',
              hasChanged && !valueIncreased && 'text-red-500'
            )}
          >
            {value}
          </motion.p>
        </AnimatePresence>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
        {trendLabel && (
          <p className="text-xs text-muted-foreground">{trendLabel}</p>
        )}
      </div>

      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-4">
          <Sparkline data={sparklineData} />
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Chart Card Component
// ============================================================================

interface ChartCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

function ChartCard({ title, icon, children, className }: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-card border border-border rounded-xl p-6 shadow-sm',
        className
      )}
    >
      <div className="flex items-center gap-2 mb-6">
        <div className="text-primary">{icon}</div>
        <h3 className="font-semibold">{title}</h3>
      </div>
      {children}
    </motion.div>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyAnalytics() {
  const navigate = useNavigate();

  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        <BarChart3 className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">No analytics data yet</h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Submit your first intent to start tracking your transaction analytics
      </p>
      <button
        onClick={() => navigate('/intent')}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        Create Intent
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function AnalyticsSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-muted rounded-lg" />
              <div className="w-12 h-5 bg-muted rounded" />
            </div>
            <div className="space-y-2">
              <div className="w-24 h-4 bg-muted rounded" />
              <div className="w-32 h-8 bg-muted rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="w-48 h-6 bg-muted rounded mb-6" />
          <div className="w-full h-[300px] bg-muted rounded" />
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="w-48 h-6 bg-muted rounded mb-6" />
          <div className="w-full h-[300px] bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Last Updated Indicator
// ============================================================================

function LastUpdatedIndicator({ 
  timestamp, 
  isRefreshing 
}: { 
  timestamp: Date | null; 
  isRefreshing: boolean;
}) {
  const [relativeTime, setRelativeTime] = useState('');

  useEffect(() => {
    if (!timestamp) return;

    const updateRelativeTime = () => {
      const now = Date.now();
      const diff = now - timestamp.getTime();
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        setRelativeTime(`${hours}h ago`);
      } else if (minutes > 0) {
        setRelativeTime(`${minutes}m ago`);
      } else if (seconds > 5) {
        setRelativeTime(`${seconds}s ago`);
      } else {
        setRelativeTime('just now');
      }
    };

    updateRelativeTime();
    const interval = setInterval(updateRelativeTime, 10000);
    return () => clearInterval(interval);
  }, [timestamp]);

  if (!timestamp) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center gap-1.5 text-xs text-muted-foreground"
    >
      <Clock className={cn('w-3.5 h-3.5', isRefreshing && 'animate-pulse')} />
      <span>Updated {relativeTime}</span>
    </motion.div>
  );
}

// ============================================================================
// Main Analytics Page
// ============================================================================

export function AnalyticsPage() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();

  // State
  const [userAnalytics, setUserAnalytics] = useState<UserAnalyticsResponse | null>(null);
  const [platformAnalytics, setPlatformAnalytics] = useState<PlatformAnalyticsResponse | null>(null);
  const [previousUserAnalytics, setPreviousUserAnalytics] = useState<UserAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState(30);
  const [error, setError] = useState<string | null>(null);
  
  // Auto-refresh state
  const [autoRefreshInterval, setAutoRefreshInterval] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Redirect if not connected
  useEffect(() => {
    if (!isConnected) {
      navigate('/', { replace: true });
    }
  }, [isConnected, navigate]);

  // Fetch analytics data
  const loadAnalytics = useCallback(async (isAutoRefresh = false) => {
    if (!address) return;

    if (isAutoRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const [userData, platformData] = await Promise.all([
        getUserAnalytics(address, timeRange),
        getPlatformAnalytics(timeRange),
      ]);

      // Store previous values for animation comparison
      if (userAnalytics) {
        setPreviousUserAnalytics(userAnalytics);
      }

      setUserAnalytics(userData);
      setPlatformAnalytics(platformData);
      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Failed to load analytics data';
      setError(message);
      console.error(err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [address, timeRange, userAnalytics]);

  // Initial fetch
  useEffect(() => {
    loadAnalytics(false);
  }, [address, timeRange]); // Note: intentionally not including loadAnalytics to avoid infinite loop

  // Auto-refresh effect
  useEffect(() => {
    // Clear any existing interval
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }

    // Set up new interval if enabled
    if (autoRefreshInterval > 0) {
      autoRefreshRef.current = setInterval(() => {
        loadAnalytics(true);
      }, autoRefreshInterval * 1000);
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [autoRefreshInterval, loadAnalytics]);

  // Format helpers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatCurrency = (value: string): string => {
    const num = parseFloat(value);
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const formatGas = (value: string): string => {
    const num = parseFloat(value);
    if (num >= 1) return `${num.toFixed(4)} ETH`;
    return `${(num * 1000).toFixed(2)} gwei`;
  };

  // Extract sparkline data from time series
  const getSparklineData = (): number[] => {
    if (!userAnalytics?.timeSeries) return [];
    return userAnalytics.timeSeries.slice(-14).map((p) => p.count);
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Analytics</h1>
            <LastUpdatedIndicator timestamp={lastUpdated} isRefreshing={isRefreshing} />
          </div>
          <p className="text-muted-foreground">
            Track your transaction history and performance
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Auto-refresh Selector */}
          <div className="flex items-center gap-1.5">
            {autoRefreshInterval > 0 ? (
              <Pause className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Play className="w-3.5 h-3.5 text-muted-foreground" />
            )}
            <select
              value={autoRefreshInterval}
              onChange={(e) => setAutoRefreshInterval(Number(e.target.value))}
              className="px-2 py-1.5 bg-background border border-border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              title="Auto-refresh interval"
            >
              {AUTO_REFRESH_INTERVALS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {value === 0 ? 'Auto: Off' : `Auto: ${label}`}
                </option>
              ))}
            </select>
          </div>

          {/* Time Range Selector */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={365}>Last year</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => loadAnalytics(false)}
            disabled={isLoading || isRefreshing}
            className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
            title="Refresh now"
          >
            <RefreshCw className={cn('w-5 h-5', (isLoading || isRefreshing) && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && <AnalyticsSkeleton />}

      {/* Error State */}
      {error && (
        <div className="text-center py-8">
          <p className="text-destructive">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && userAnalytics?.stats.totalIntents === 0 && (
        <EmptyAnalytics />
      )}

      {/* Analytics Content */}
      {!isLoading && !error && userAnalytics && userAnalytics.stats.totalIntents > 0 && (
        <div className="space-y-8">
          {/* User Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Total Transactions"
              value={formatNumber(userAnalytics.stats.totalIntents)}
              previousValue={previousUserAnalytics ? formatNumber(previousUserAnalytics.stats.totalIntents) : undefined}
              subtitle={`${userAnalytics.stats.completedIntents} completed`}
              icon={<Activity className="w-5 h-5" />}
              sparklineData={getSparklineData()}
            />
            <StatCard
              title="Success Rate"
              value={`${userAnalytics.stats.successRate.toFixed(1)}%`}
              previousValue={previousUserAnalytics ? `${previousUserAnalytics.stats.successRate.toFixed(1)}%` : undefined}
              subtitle={`${userAnalytics.stats.failedIntents} failed`}
              icon={<CheckCircle2 className="w-5 h-5" />}
              trend={userAnalytics.stats.successRate > 90 ? 5 : userAnalytics.stats.successRate > 70 ? 0 : -5}
            />
            <StatCard
              title="Total Volume"
              value={formatCurrency(userAnalytics.stats.totalVolumeUsd)}
              previousValue={previousUserAnalytics ? formatCurrency(previousUserAnalytics.stats.totalVolumeUsd) : undefined}
              icon={<DollarSign className="w-5 h-5" />}
            />
            <StatCard
              title="Gas Saved"
              value={formatGas(userAnalytics.stats.totalGasSaved)}
              previousValue={previousUserAnalytics ? formatGas(previousUserAnalytics.stats.totalGasSaved) : undefined}
              icon={<Zap className="w-5 h-5" />}
              trend={userAnalytics.stats.comparisonToAverage}
              trendLabel={
                userAnalytics.stats.comparisonToAverage > 0
                  ? `${userAnalytics.stats.comparisonToAverage.toFixed(0)}% more than average`
                  : userAnalytics.stats.comparisonToAverage < 0
                  ? `${Math.abs(userAnalytics.stats.comparisonToAverage).toFixed(0)}% less than average`
                  : 'Average savings'
              }
            />
          </div>

          {/* Gas Savings Comparison Banner */}
          {userAnalytics.stats.comparisonToAverage > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-4"
            >
              <div className="p-3 bg-green-500/20 rounded-full">
                <Zap className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="font-semibold text-green-600 dark:text-green-400">
                  You've saved {userAnalytics.stats.comparisonToAverage.toFixed(0)}% more gas than the average user!
                </p>
                <p className="text-sm text-muted-foreground">
                  Keep using Swoosh to optimize your cross-chain transactions
                </p>
              </div>
            </motion.div>
          )}

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Transactions Over Time"
              icon={<LineChartIcon className="w-5 h-5" />}
            >
              <TransactionLineChart
                data={userAnalytics.timeSeries}
                showVolume={false}
              />
            </ChartCard>

            <ChartCard
              title="Chain Distribution"
              icon={<PieChartIcon className="w-5 h-5" />}
            >
              {userAnalytics.chainDistribution.length > 0 ? (
                <ChainPieChart data={userAnalytics.chainDistribution} />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No chain data available
                </div>
              )}
            </ChartCard>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title="Token Usage"
              icon={<BarChart3 className="w-5 h-5" />}
            >
              {userAnalytics.tokenDistribution.length > 0 ? (
                <TokenBarChart data={userAnalytics.tokenDistribution} />
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No token data available
                </div>
              )}
            </ChartCard>

            {/* Platform Stats */}
            {platformAnalytics && (
              <ChartCard
                title="Platform Statistics"
                icon={<Globe className="w-5 h-5" />}
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Intents</p>
                    <p className="text-xl font-bold">
                      {formatNumber(platformAnalytics.stats.totalIntents)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Active Users</p>
                    <p className="text-xl font-bold">
                      {formatNumber(platformAnalytics.stats.uniqueUsers)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Volume</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(platformAnalytics.stats.totalVolumeUsd)}
                    </p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Avg Execution</p>
                    <p className="text-xl font-bold">
                      {platformAnalytics.stats.avgExecutionTime}s
                    </p>
                  </div>
                  <div className="col-span-2 p-4 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">Most Popular Destination</p>
                    <p className="text-xl font-bold">
                      {platformAnalytics.stats.topDestChain || 'N/A'}
                    </p>
                  </div>
                </div>
              </ChartCard>
            )}
          </div>

          {/* Platform Chain Distribution */}
          {platformAnalytics && platformAnalytics.chainDistribution.length > 0 && (
            <ChartCard
              title="Platform-wide Chain Usage"
              icon={<Users className="w-5 h-5" />}
              className="max-w-2xl"
            >
              <ChainPieChart data={platformAnalytics.chainDistribution} />
            </ChartCard>
          )}
        </div>
      )}
    </div>
  );
}

export default AnalyticsPage;
