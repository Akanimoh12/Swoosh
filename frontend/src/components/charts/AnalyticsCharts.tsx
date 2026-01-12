/**
 * Analytics Charts
 * Recharts components for analytics dashboard
 */

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import { cn } from '@/lib/utils';

// ============================================================================
// Color Palette (color-blind friendly)
// ============================================================================

const CHART_COLORS = [
  '#2563eb', // Blue
  '#16a34a', // Green
  '#ea580c', // Orange
  '#9333ea', // Purple
  '#0891b2', // Cyan
  '#dc2626', // Red
  '#ca8a04', // Yellow
  '#6366f1', // Indigo
];

const CHART_COLORS_DARK = [
  '#60a5fa', // Blue
  '#4ade80', // Green
  '#fb923c', // Orange
  '#c084fc', // Purple
  '#22d3ee', // Cyan
  '#f87171', // Red
  '#fcd34d', // Yellow
  '#a5b4fc', // Indigo
];

// ============================================================================
// Types
// ============================================================================

interface TimeSeriesPoint {
  date: string;
  count: number;
  volume: string;
}

interface ChainDistribution {
  name: string;
  value: number;
  percentage: number;
}

interface TokenDistribution {
  name: string;
  count: number;
  volume: string;
}

// ============================================================================
// Custom Tooltip Components
// ============================================================================

interface TooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

function LineChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm text-muted-foreground mb-1">
        {new Date(label || '').toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}
      </p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm font-medium">
          <span style={{ color: entry.color }}>{entry.name}: </span>
          {entry.value}
        </p>
      ))}
    </div>
  );
}

function PieChartTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0];
  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium">{data.name}</p>
      <p className="text-sm text-muted-foreground">
        {data.value} intents ({data.payload.percentage}%)
      </p>
    </div>
  );
}

function BarChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
      <p className="text-sm font-medium mb-1">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-sm text-muted-foreground">
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

// ============================================================================
// Transaction Line Chart
// ============================================================================

interface TransactionLineChartProps {
  data: TimeSeriesPoint[];
  className?: string;
  showVolume?: boolean;
}

export function TransactionLineChart({
  data,
  className,
  showVolume = false,
}: TransactionLineChartProps) {
  const isDark = document.documentElement.classList.contains('dark');
  const colors = isDark ? CHART_COLORS_DARK : CHART_COLORS;

  const formattedData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      displayDate: new Date(point.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
      volumeNum: parseFloat(point.volume),
    }));
  }, [data]);

  return (
    <div className={cn('w-full h-[300px]', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={isDark ? '#374151' : '#e5e7eb'} 
          />
          <XAxis
            dataKey="displayDate"
            tick={{ fontSize: 12, fill: isDark ? '#9ca3af' : '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: isDark ? '#374151' : '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: isDark ? '#9ca3af' : '#6b7280' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<LineChartTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => (
              <span className="text-sm text-muted-foreground">{value}</span>
            )}
          />
          <Line
            type="monotone"
            dataKey="count"
            name="Transactions"
            stroke={colors[0]}
            strokeWidth={2}
            dot={{ r: 4, fill: colors[0] }}
            activeDot={{ r: 6 }}
          />
          {showVolume && (
            <Line
              type="monotone"
              dataKey="volumeNum"
              name="Volume ($)"
              stroke={colors[1]}
              strokeWidth={2}
              dot={{ r: 4, fill: colors[1] }}
              activeDot={{ r: 6 }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// Chain Distribution Pie Chart
// ============================================================================

interface ChainPieChartProps {
  data: ChainDistribution[];
  className?: string;
}

export function ChainPieChart({ data, className }: ChainPieChartProps) {
  const isDark = document.documentElement.classList.contains('dark');
  const colors = isDark ? CHART_COLORS_DARK : CHART_COLORS;

  const renderCustomLabel = (props: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
  }) => {
    const { cx = 0, cy = 0, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0 } = props;
    if (percent < 0.05) return null; // Don't show labels for small slices
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight={500}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Convert to format Recharts expects
  const chartData = data.map((item) => ({
    name: item.name,
    value: item.value,
    percentage: item.percentage,
  }));

  return (
    <div className={cn('w-full h-[300px]', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomLabel}
            outerRadius={100}
            innerRadius={40}
            fill="#8884d8"
            dataKey="value"
            animationBegin={0}
            animationDuration={500}
          >
            {chartData.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<PieChartTooltip />} />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            formatter={(value) => (
              <span className="text-sm text-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// Token Usage Bar Chart
// ============================================================================

interface TokenBarChartProps {
  data: TokenDistribution[];
  className?: string;
}

export function TokenBarChart({ data, className }: TokenBarChartProps) {
  const isDark = document.documentElement.classList.contains('dark');
  const colors = isDark ? CHART_COLORS_DARK : CHART_COLORS;

  return (
    <div className={cn('w-full h-[300px]', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 30, left: 60, bottom: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={isDark ? '#374151' : '#e5e7eb'}
            horizontal={true}
            vertical={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: isDark ? '#9ca3af' : '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: isDark ? '#374151' : '#e5e7eb' }}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: isDark ? '#9ca3af' : '#6b7280' }}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip content={<BarChartTooltip />} />
          <Bar
            dataKey="count"
            name="Usage Count"
            fill={colors[0]}
            radius={[0, 4, 4, 0]}
            maxBarSize={30}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// Mini Sparkline Chart (for stat cards)
// ============================================================================

interface SparklineProps {
  data: number[];
  color?: string;
  className?: string;
}

export function Sparkline({ data, color = '#2563eb', className }: SparklineProps) {
  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <div className={cn('w-full h-[40px]', className)}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ============================================================================
// Export all
// ============================================================================

export default {
  TransactionLineChart,
  ChainPieChart,
  TokenBarChart,
  Sparkline,
};
