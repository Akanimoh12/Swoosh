/**
 * Analytics Aggregation Cron Job
 * Runs daily at midnight UTC to aggregate analytics data
 */

import cron from 'node-cron';
import { prisma } from '../db/prisma.js';
import { redis } from '../db/redis.js';
import { logger } from '../utils/logger.js';

const log = logger.child({ module: 'analytics-cron' });

/**
 * Aggregate user analytics for the previous day
 */
async function aggregateUserAnalytics(date: Date): Promise<void> {
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  log.info({ date: startOfDay.toISOString() }, 'Starting user analytics aggregation');

  // Get all unique users who had activity on this day
  const activeUsers = await prisma.intent.groupBy({
    by: ['userAddress'],
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  log.info({ userCount: activeUsers.length }, 'Found active users for aggregation');

  for (const { userAddress } of activeUsers) {
    try {
      // Get user's intents for this day
      const dayIntents = await prisma.intent.findMany({
        where: {
          userAddress: { equals: userAddress, mode: 'insensitive' },
          createdAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
        include: {
          routes: {
            where: { isSelected: true },
            take: 1,
          },
        },
      });

      type IntentWithRoutes = typeof dayIntents[number];

      // Calculate statistics
      const totalIntents = dayIntents.length;
      const completedIntents = dayIntents.filter((i: IntentWithRoutes) => i.status === 'COMPLETED').length;
      const failedIntents = dayIntents.filter((i: IntentWithRoutes) => i.status === 'FAILED').length;

      let totalVolumeUsd = 0;
      let totalGasSpent = 0;
      let totalGasSaved = 0;
      let totalExecutionTime = 0;
      const chainDistribution: Record<string, number> = {};
      const tokenDistribution: Record<string, number> = {};

      for (const intent of dayIntents) {
        const parsed = intent.parsedData as any;
        const route = intent.routes[0]?.routeData as any;

        // Volume
        if (parsed?.amount) {
          totalVolumeUsd += parseFloat(parsed.amount) * (parsed.priceUsd || 1);
        }

        // Gas costs
        if (route?.totalGas) {
          totalGasSpent += parseFloat(route.totalGas);
          totalGasSaved += parseFloat(route.totalGas) * 0.3;
        }

        // Execution time
        if (intent.routes[0]?.estimatedTime) {
          totalExecutionTime += intent.routes[0].estimatedTime;
        }

        // Chain distribution
        const destChain = parsed?.destChain || parsed?.destinationChain || 'unknown';
        chainDistribution[destChain] = (chainDistribution[destChain] || 0) + 1;

        // Token distribution
        const token = parsed?.sourceToken || parsed?.token || 'unknown';
        tokenDistribution[token] = (tokenDistribution[token] || 0) + 1;
      }

      const avgExecutionTime = completedIntents > 0 
        ? Math.round(totalExecutionTime / completedIntents) 
        : 0;

      // Upsert user analytics for this day
      await prisma.userAnalytics.upsert({
        where: {
          unique_user_date: {
            userAddress: userAddress.toLowerCase(),
            date: startOfDay,
          },
        },
        create: {
          userAddress: userAddress.toLowerCase(),
          date: startOfDay,
          totalIntents,
          completedIntents,
          failedIntents,
          totalVolumeUsd: totalVolumeUsd.toFixed(2),
          totalGasSpent: totalGasSpent.toFixed(6),
          totalGasSaved: totalGasSaved.toFixed(6),
          avgExecutionTime,
          chainDistribution,
          tokenDistribution,
        },
        update: {
          totalIntents,
          completedIntents,
          failedIntents,
          totalVolumeUsd: totalVolumeUsd.toFixed(2),
          totalGasSpent: totalGasSpent.toFixed(6),
          totalGasSaved: totalGasSaved.toFixed(6),
          avgExecutionTime,
          chainDistribution,
          tokenDistribution,
        },
      });

      log.debug({ userAddress, totalIntents }, 'Aggregated user analytics');
    } catch (error) {
      log.error({ error, userAddress }, 'Error aggregating user analytics');
    }
  }

  log.info({ date: startOfDay.toISOString() }, 'User analytics aggregation complete');
}

/**
 * Aggregate platform-wide analytics for the previous day
 */
async function aggregatePlatformAnalytics(date: Date): Promise<void> {
  const startOfDay = new Date(date);
  startOfDay.setUTCHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setUTCHours(23, 59, 59, 999);

  log.info({ date: startOfDay.toISOString() }, 'Starting platform analytics aggregation');

  try {
    // Get all intents for this day
    const dayIntents = await prisma.intent.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        routes: {
          where: { isSelected: true },
          take: 1,
        },
      },
    });

    type IntentWithRoutes = typeof dayIntents[number];

    // Calculate statistics
    const totalIntents = dayIntents.length;
    const completedIntents = dayIntents.filter((i: IntentWithRoutes) => i.status === 'COMPLETED').length;
    const failedIntents = dayIntents.filter((i: IntentWithRoutes) => i.status === 'FAILED').length;

    // Count unique users
    const uniqueUserSet = new Set(dayIntents.map((i: IntentWithRoutes) => i.userAddress.toLowerCase()));
    const uniqueUsers = uniqueUserSet.size;

    let totalVolumeUsd = 0;
    let totalGasSpent = 0;
    let totalGasSaved = 0;
    let totalExecutionTime = 0;
    const chainDistribution: Record<string, number> = {};
    const tokenDistribution: Record<string, number> = {};

    for (const intent of dayIntents) {
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

      const destChain = parsed?.destChain || parsed?.destinationChain || 'unknown';
      chainDistribution[destChain] = (chainDistribution[destChain] || 0) + 1;

      const token = parsed?.sourceToken || parsed?.token || 'unknown';
      tokenDistribution[token] = (tokenDistribution[token] || 0) + 1;
    }

    const avgExecutionTime = completedIntents > 0 
      ? Math.round(totalExecutionTime / completedIntents) 
      : 0;

    const avgGasSavedPerUser = uniqueUsers > 0 
      ? (totalGasSaved / uniqueUsers).toFixed(6) 
      : '0';

    // Find top destination chain
    let topDestChain: string | null = null;
    let maxCount = 0;
    for (const [chain, count] of Object.entries(chainDistribution)) {
      if (count > maxCount) {
        maxCount = count;
        topDestChain = chain;
      }
    }

    // Upsert platform analytics for this day
    await prisma.platformAnalytics.upsert({
      where: { date: startOfDay },
      create: {
        date: startOfDay,
        totalIntents,
        completedIntents,
        failedIntents,
        uniqueUsers,
        totalVolumeUsd: totalVolumeUsd.toFixed(2),
        totalGasSpent: totalGasSpent.toFixed(6),
        totalGasSaved: totalGasSaved.toFixed(6),
        avgExecutionTime,
        avgGasSavedPerUser,
        chainDistribution,
        tokenDistribution,
        topDestChain,
      },
      update: {
        totalIntents,
        completedIntents,
        failedIntents,
        uniqueUsers,
        totalVolumeUsd: totalVolumeUsd.toFixed(2),
        totalGasSpent: totalGasSpent.toFixed(6),
        totalGasSaved: totalGasSaved.toFixed(6),
        avgExecutionTime,
        avgGasSavedPerUser,
        chainDistribution,
        tokenDistribution,
        topDestChain,
      },
    });

    log.info({ 
      date: startOfDay.toISOString(), 
      totalIntents,
      uniqueUsers,
    }, 'Platform analytics aggregation complete');
  } catch (error) {
    log.error({ error }, 'Error aggregating platform analytics');
  }
}

/**
 * Run aggregation for the previous day
 */
async function runDailyAggregation(): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  
  log.info({ date: yesterday.toISOString() }, 'Starting daily analytics aggregation');

  try {
    await aggregateUserAnalytics(yesterday);
    await aggregatePlatformAnalytics(yesterday);
    
    // Clear analytics caches to force fresh data
    await redis.delete('analytics:platform:*');
    
    log.info('Daily analytics aggregation completed successfully');
  } catch (error) {
    log.error({ error }, 'Daily analytics aggregation failed');
  }
}

/**
 * Backfill analytics for a date range
 */
export async function backfillAnalytics(startDate: Date, endDate: Date): Promise<void> {
  log.info({ startDate, endDate }, 'Starting analytics backfill');
  
  const current = new Date(startDate);
  while (current <= endDate) {
    await aggregateUserAnalytics(current);
    await aggregatePlatformAnalytics(current);
    current.setDate(current.getDate() + 1);
  }
  
  log.info('Analytics backfill completed');
}

/**
 * Start the analytics cron job
 * Runs daily at midnight UTC
 */
export function startAnalyticsCron(): void {
  // Run at midnight UTC every day
  cron.schedule('0 0 * * *', async () => {
    log.info('Cron triggered: Running daily analytics aggregation');
    await runDailyAggregation();
  }, {
    timezone: 'UTC',
  });

  log.info('Analytics cron job scheduled (daily at midnight UTC)');
}

/**
 * Manually trigger aggregation (for testing)
 */
export async function triggerAggregation(): Promise<void> {
  await runDailyAggregation();
}

export default { startAnalyticsCron, triggerAggregation, backfillAnalytics };
