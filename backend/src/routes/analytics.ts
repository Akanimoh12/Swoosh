/**
 * Analytics API Routes
 * User and platform-wide analytics endpoints
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { redis } from '../db/redis.js';
import { logger } from '../utils/logger.js';

// ============================================================================
// Types
// ============================================================================

interface UserStats {
  totalIntents: number;
  completedIntents: number;
  failedIntents: number;
  pendingIntents: number;
  successRate: number;
  totalVolumeUsd: string;
  totalGasSpent: string;
  totalGasSaved: string;
  avgExecutionTime: number;
  comparisonToAverage: number; // Percentage better/worse than average
}

interface PlatformStats {
  totalIntents: number;
  completedIntents: number;
  uniqueUsers: number;
  totalVolumeUsd: string;
  totalGasSpent: string;
  totalGasSaved: string;
  avgExecutionTime: number;
  avgGasSavedPerUser: string;
  topDestChain: string | null;
}

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

interface UserAnalyticsResponse {
  stats: UserStats;
  timeSeries: TimeSeriesPoint[];
  chainDistribution: ChainDistribution[];
  tokenDistribution: TokenDistribution[];
}

interface PlatformAnalyticsResponse {
  stats: PlatformStats;
  timeSeries: TimeSeriesPoint[];
  chainDistribution: ChainDistribution[];
}

// ============================================================================
// Validation Schemas
// ============================================================================

const UserAddressSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
});

const TimeRangeSchema = z.object({
  days: z.coerce.number().min(1).max(365).default(30),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate statistics from raw intent data
 */
async function calculateUserStats(userAddress: string): Promise<UserStats> {
  const lowercaseAddress = userAddress.toLowerCase();
  
  // Get aggregated counts by status
  const statusCounts = await prisma.intent.groupBy({
    by: ['status'],
    where: { userAddress: { equals: lowercaseAddress, mode: 'insensitive' } },
    _count: true,
  });

  type StatusCount = { status: string; _count: number };
  const total = (statusCounts as StatusCount[]).reduce((sum: number, s: StatusCount) => sum + s._count, 0);
  const completed = (statusCounts as StatusCount[]).find((s: StatusCount) => s.status === 'COMPLETED')?._count || 0;
  const failed = (statusCounts as StatusCount[]).find((s: StatusCount) => s.status === 'FAILED')?._count || 0;
  const pending = (statusCounts as StatusCount[]).find((s: StatusCount) => s.status === 'PENDING')?._count || 0;
  const processing = (statusCounts as StatusCount[]).find((s: StatusCount) => s.status === 'PROCESSING')?._count || 0;

  // Get intents with routes for volume/gas calculations
  const intentsWithRoutes = await prisma.intent.findMany({
    where: { 
      userAddress: { equals: lowercaseAddress, mode: 'insensitive' },
      status: 'COMPLETED',
    },
    include: {
      routes: {
        where: { isSelected: true },
        take: 1,
      },
    },
  });

  let totalVolumeUsd = 0;
  let totalGasSpent = 0;
  let totalGasSaved = 0;
  let totalExecutionTime = 0;

  for (const intent of intentsWithRoutes) {
    const parsed = intent.parsedData as any;
    const route = intent.routes[0]?.routeData as any;
    
    // Sum up volumes (from parsed amount * price estimate)
    if (parsed?.amount) {
      totalVolumeUsd += parseFloat(parsed.amount) * (parsed.priceUsd || 1);
    }
    
    // Sum up gas costs
    if (route?.totalGas) {
      totalGasSpent += parseFloat(route.totalGas);
    } else if (intent.routes[0]?.costEstimate) {
      totalGasSpent += parseFloat(intent.routes[0].costEstimate);
    }
    
    // Estimate gas saved (compared to doing swap + bridge separately)
    // Assume 30% savings on average for bundled intents
    if (route?.totalGas) {
      const traditional = parseFloat(route.totalGas) * 1.3;
      totalGasSaved += traditional - parseFloat(route.totalGas);
    }
    
    // Execution time
    if (intent.routes[0]?.estimatedTime) {
      totalExecutionTime += intent.routes[0].estimatedTime;
    }
  }

  // Get platform average for comparison
  const platformAvgGasSaved = await getPlatformAverageGasSaved();
  const userAvgGasSaved = total > 0 ? totalGasSaved / total : 0;
  const comparisonToAverage = platformAvgGasSaved > 0 
    ? ((userAvgGasSaved - platformAvgGasSaved) / platformAvgGasSaved) * 100 
    : 0;

  return {
    totalIntents: total,
    completedIntents: completed,
    failedIntents: failed,
    pendingIntents: pending + processing,
    successRate: total > 0 ? (completed / total) * 100 : 0,
    totalVolumeUsd: totalVolumeUsd.toFixed(2),
    totalGasSpent: totalGasSpent.toFixed(6),
    totalGasSaved: totalGasSaved.toFixed(6),
    avgExecutionTime: completed > 0 ? Math.round(totalExecutionTime / completed) : 0,
    comparisonToAverage: Math.round(comparisonToAverage * 10) / 10,
  };
}

/**
 * Get time series data for user
 */
async function getUserTimeSeries(userAddress: string, days: number): Promise<TimeSeriesPoint[]> {
  const lowercaseAddress = userAddress.toLowerCase();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Get daily intent counts
  const intents = await prisma.intent.findMany({
    where: {
      userAddress: { equals: lowercaseAddress, mode: 'insensitive' },
      createdAt: { gte: startDate },
    },
    select: {
      createdAt: true,
      parsedData: true,
      status: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // Group by date
  const dateMap = new Map<string, { count: number; volume: number }>();
  
  // Initialize all dates
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dateMap.set(dateStr, { count: 0, volume: 0 });
  }

  // Fill in actual data
  for (const intent of intents) {
    const dateStr = intent.createdAt.toISOString().split('T')[0];
    const existing = dateMap.get(dateStr) || { count: 0, volume: 0 };
    const parsed = intent.parsedData as any;
    existing.count += 1;
    existing.volume += parsed?.amount ? parseFloat(parsed.amount) : 0;
    dateMap.set(dateStr, existing);
  }

  return Array.from(dateMap.entries()).map(([date, data]) => ({
    date,
    count: data.count,
    volume: data.volume.toFixed(2),
  }));
}

/**
 * Get chain distribution for user
 */
async function getUserChainDistribution(userAddress: string): Promise<ChainDistribution[]> {
  const lowercaseAddress = userAddress.toLowerCase();
  
  const intents = await prisma.intent.findMany({
    where: { userAddress: { equals: lowercaseAddress, mode: 'insensitive' } },
    select: { parsedData: true },
  });

  const chainCounts = new Map<string, number>();
  
  for (const intent of intents) {
    const parsed = intent.parsedData as any;
    const destChain = parsed?.destChain || parsed?.destinationChain || 'unknown';
    chainCounts.set(destChain, (chainCounts.get(destChain) || 0) + 1);
  }

  const total = intents.length;
  return Array.from(chainCounts.entries())
    .map(([name, value]) => ({
      name: formatChainName(name),
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6); // Top 6 chains
}

/**
 * Get token distribution for user
 */
async function getUserTokenDistribution(userAddress: string): Promise<TokenDistribution[]> {
  const lowercaseAddress = userAddress.toLowerCase();
  
  const intents = await prisma.intent.findMany({
    where: { userAddress: { equals: lowercaseAddress, mode: 'insensitive' } },
    select: { parsedData: true },
  });

  const tokenCounts = new Map<string, { count: number; volume: number }>();
  
  for (const intent of intents) {
    const parsed = intent.parsedData as any;
    const token = parsed?.sourceToken || parsed?.token || 'unknown';
    const amount = parsed?.amount ? parseFloat(parsed.amount) : 0;
    const existing = tokenCounts.get(token) || { count: 0, volume: 0 };
    existing.count += 1;
    existing.volume += amount;
    tokenCounts.set(token, existing);
  }

  return Array.from(tokenCounts.entries())
    .map(([name, data]) => ({
      name: name.toUpperCase(),
      count: data.count,
      volume: data.volume.toFixed(2),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8); // Top 8 tokens
}

/**
 * Calculate platform-wide statistics
 */
async function calculatePlatformStats(): Promise<PlatformStats> {
  // Get aggregated counts by status
  const statusCounts = await prisma.intent.groupBy({
    by: ['status'],
    _count: true,
  });

  type StatusCount = { status: string; _count: number };
  const total = (statusCounts as StatusCount[]).reduce((sum: number, s: StatusCount) => sum + s._count, 0);
  const completed = (statusCounts as StatusCount[]).find((s: StatusCount) => s.status === 'COMPLETED')?._count || 0;

  // Count unique users
  const uniqueUsersResult = await prisma.intent.groupBy({
    by: ['userAddress'],
    _count: true,
  });
  const uniqueUsers = uniqueUsersResult.length;

  // Get completed intents for volume calculation
  const completedIntents = await prisma.intent.findMany({
    where: { status: 'COMPLETED' },
    include: {
      routes: {
        where: { isSelected: true },
        take: 1,
      },
    },
  });

  let totalVolumeUsd = 0;
  let totalGasSpent = 0;
  let totalGasSaved = 0;
  let totalExecutionTime = 0;
  const chainCounts = new Map<string, number>();

  for (const intent of completedIntents) {
    const parsed = intent.parsedData as any;
    const route = intent.routes[0]?.routeData as any;
    
    if (parsed?.amount) {
      totalVolumeUsd += parseFloat(parsed.amount) * (parsed.priceUsd || 1);
    }
    
    if (route?.totalGas) {
      totalGasSpent += parseFloat(route.totalGas);
      totalGasSaved += parseFloat(route.totalGas) * 0.3;
    }
    
    if (intent.routes[0]?.estimatedTime) {
      totalExecutionTime += intent.routes[0].estimatedTime;
    }

    const destChain = parsed?.destChain || parsed?.destinationChain;
    if (destChain) {
      chainCounts.set(destChain, (chainCounts.get(destChain) || 0) + 1);
    }
  }

  // Find top destination chain
  let topDestChain: string | null = null;
  let maxCount = 0;
  for (const [chain, count] of chainCounts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      topDestChain = formatChainName(chain);
    }
  }

  const avgGasSavedPerUser = uniqueUsers > 0 ? totalGasSaved / uniqueUsers : 0;

  return {
    totalIntents: total,
    completedIntents: completed,
    uniqueUsers,
    totalVolumeUsd: totalVolumeUsd.toFixed(2),
    totalGasSpent: totalGasSpent.toFixed(6),
    totalGasSaved: totalGasSaved.toFixed(6),
    avgExecutionTime: completed > 0 ? Math.round(totalExecutionTime / completed) : 0,
    avgGasSavedPerUser: avgGasSavedPerUser.toFixed(6),
    topDestChain,
  };
}

/**
 * Get platform average gas saved per intent
 */
async function getPlatformAverageGasSaved(): Promise<number> {
  // Check cache first
  const cached = await redis.get<number>('analytics:platform:avgGasSaved');
  if (cached !== null) {
    return cached;
  }

  const completedIntents = await prisma.intent.count({
    where: { status: 'COMPLETED' },
  });

  if (completedIntents === 0) return 0;

  const intentsWithRoutes = await prisma.intent.findMany({
    where: { status: 'COMPLETED' },
    include: {
      routes: {
        where: { isSelected: true },
        take: 1,
      },
    },
    take: 1000, // Limit for performance
  });

  let totalGasSaved = 0;
  for (const intent of intentsWithRoutes) {
    const route = intent.routes[0]?.routeData as any;
    if (route?.totalGas) {
      totalGasSaved += parseFloat(route.totalGas) * 0.3;
    }
  }

  const avg = totalGasSaved / intentsWithRoutes.length;
  
  // Cache for 1 hour
  await redis.set('analytics:platform:avgGasSaved', avg, 3600);
  
  return avg;
}

/**
 * Get platform time series
 */
async function getPlatformTimeSeries(days: number): Promise<TimeSeriesPoint[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  const intents = await prisma.intent.findMany({
    where: { createdAt: { gte: startDate } },
    select: {
      createdAt: true,
      parsedData: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const dateMap = new Map<string, { count: number; volume: number }>();
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dateMap.set(dateStr, { count: 0, volume: 0 });
  }

  for (const intent of intents) {
    const dateStr = intent.createdAt.toISOString().split('T')[0];
    const existing = dateMap.get(dateStr) || { count: 0, volume: 0 };
    const parsed = intent.parsedData as any;
    existing.count += 1;
    existing.volume += parsed?.amount ? parseFloat(parsed.amount) : 0;
    dateMap.set(dateStr, existing);
  }

  return Array.from(dateMap.entries()).map(([date, data]) => ({
    date,
    count: data.count,
    volume: data.volume.toFixed(2),
  }));
}

/**
 * Get platform chain distribution
 */
async function getPlatformChainDistribution(): Promise<ChainDistribution[]> {
  const intents = await prisma.intent.findMany({
    select: { parsedData: true },
  });

  const chainCounts = new Map<string, number>();
  
  for (const intent of intents) {
    const parsed = intent.parsedData as any;
    const destChain = parsed?.destChain || parsed?.destinationChain || 'unknown';
    chainCounts.set(destChain, (chainCounts.get(destChain) || 0) + 1);
  }

  const total = intents.length;
  return Array.from(chainCounts.entries())
    .map(([name, value]) => ({
      name: formatChainName(name),
      value,
      percentage: total > 0 ? Math.round((value / total) * 100) : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);
}

/**
 * Format chain name for display
 */
function formatChainName(chain: string): string {
  const chainNames: Record<string, string> = {
    'ethereum': 'Ethereum',
    'eth': 'Ethereum',
    '1': 'Ethereum',
    'arbitrum': 'Arbitrum',
    'arb': 'Arbitrum',
    '42161': 'Arbitrum',
    'polygon': 'Polygon',
    'matic': 'Polygon',
    '137': 'Polygon',
    'optimism': 'Optimism',
    'op': 'Optimism',
    '10': 'Optimism',
    'base': 'Base',
    '8453': 'Base',
    'avalanche': 'Avalanche',
    'avax': 'Avalanche',
    '43114': 'Avalanche',
    'bsc': 'BNB Chain',
    'binance': 'BNB Chain',
    '56': 'BNB Chain',
  };
  
  return chainNames[chain.toLowerCase()] || chain;
}

// ============================================================================
// Route Registration
// ============================================================================

export async function analyticsRoutes(fastify: FastifyInstance) {
  const log = logger.child({ module: 'analytics-routes' });

  /**
   * GET /api/analytics/user/:address - Get user analytics
   */
  fastify.get<{ Params: { address: string }; Querystring: { days?: string } }>(
    '/user/:address',
    {
      schema: {
        params: {
          type: 'object',
          required: ['address'],
          properties: {
            address: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            days: { type: 'string', default: '30' },
          },
        },
      },
    },
    async (request, reply) => {
      const reqLog = log.child({ route: '/api/analytics/user/:address', requestId: request.id });
      
      try {
        // Validate address
        const addressResult = UserAddressSchema.safeParse(request.params);
        if (!addressResult.success) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid address format',
          });
        }
        const { address } = addressResult.data;

        // Validate days parameter
        const daysResult = TimeRangeSchema.safeParse(request.query);
        const days = daysResult.success ? daysResult.data.days : 30;

        // Check cache
        const cacheKey = `analytics:user:${address.toLowerCase()}:${days}`;
        try {
          const cached = await redis.get<UserAnalyticsResponse>(cacheKey);
          if (cached) {
            reqLog.debug({ cacheKey }, 'Cache hit for user analytics');
            return { success: true, data: cached };
          }
        } catch (cacheError) {
          reqLog.warn({ cacheError }, 'Redis cache error');
        }

        // Calculate analytics
        const [stats, timeSeries, chainDistribution, tokenDistribution] = await Promise.all([
          calculateUserStats(address),
          getUserTimeSeries(address, days),
          getUserChainDistribution(address),
          getUserTokenDistribution(address),
        ]);

        const response: UserAnalyticsResponse = {
          stats,
          timeSeries,
          chainDistribution,
          tokenDistribution,
        };

        // Cache for 5 minutes
        try {
          await redis.set(cacheKey, response, 300);
        } catch (cacheError) {
          reqLog.warn({ cacheError }, 'Failed to cache user analytics');
        }

        return { success: true, data: response };
      } catch (error) {
        reqLog.error({ error }, 'Error fetching user analytics');
        return reply.code(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * GET /api/analytics/platform - Get platform-wide analytics
   */
  fastify.get<{ Querystring: { days?: string } }>(
    '/platform',
    {
      schema: {
        querystring: {
          type: 'object',
          properties: {
            days: { type: 'string', default: '30' },
          },
        },
      },
    },
    async (request, reply) => {
      const reqLog = log.child({ route: '/api/analytics/platform', requestId: request.id });
      
      try {
        const daysResult = TimeRangeSchema.safeParse(request.query);
        const days = daysResult.success ? daysResult.data.days : 30;

        // Check cache
        const cacheKey = `analytics:platform:${days}`;
        try {
          const cached = await redis.get<PlatformAnalyticsResponse>(cacheKey);
          if (cached) {
            reqLog.debug({ cacheKey }, 'Cache hit for platform analytics');
            return { success: true, data: cached };
          }
        } catch (cacheError) {
          reqLog.warn({ cacheError }, 'Redis cache error');
        }

        // Calculate analytics
        const [stats, timeSeries, chainDistribution] = await Promise.all([
          calculatePlatformStats(),
          getPlatformTimeSeries(days),
          getPlatformChainDistribution(),
        ]);

        const response: PlatformAnalyticsResponse = {
          stats,
          timeSeries,
          chainDistribution,
        };

        // Cache for 10 minutes
        try {
          await redis.set(cacheKey, response, 600);
        } catch (cacheError) {
          reqLog.warn({ cacheError }, 'Failed to cache platform analytics');
        }

        return { success: true, data: response };
      } catch (error) {
        reqLog.error({ error }, 'Error fetching platform analytics');
        return reply.code(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  log.info('Analytics routes registered');
}

export default analyticsRoutes;
