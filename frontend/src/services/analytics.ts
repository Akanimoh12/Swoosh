/**
 * Analytics Service
 * API functions for user and platform analytics
 */

import { api } from './api';

// Time series data point
export interface TimeSeriesPoint {
  date: string;
  count: number;
  volume: string;
}

// Chain distribution
export interface ChainDistribution {
  name: string;
  value: number;
  percentage: number;
}

// Token distribution
export interface TokenDistribution {
  name: string;
  count: number;
  volume: string;
}

// User statistics
export interface UserStats {
  totalIntents: number;
  completedIntents: number;
  failedIntents: number;
  pendingIntents: number;
  successRate: number;
  totalVolumeUsd: string;
  totalGasSpent: string;
  totalGasSaved: string;
  avgExecutionTime: number;
  comparisonToAverage: number;
}

// Platform statistics
export interface PlatformStats {
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

// User analytics response
export interface UserAnalyticsResponse {
  stats: UserStats;
  timeSeries: TimeSeriesPoint[];
  chainDistribution: ChainDistribution[];
  tokenDistribution: TokenDistribution[];
}

// Platform analytics response
export interface PlatformAnalyticsResponse {
  stats: PlatformStats;
  timeSeries: TimeSeriesPoint[];
  chainDistribution: ChainDistribution[];
}

// Analytics params
export interface AnalyticsParams {
  days?: number;
}

/**
 * Get analytics for a specific user
 */
export async function getUserAnalytics(
  address: string,
  days: number = 30
): Promise<UserAnalyticsResponse> {
  return api.get<UserAnalyticsResponse>(
    `/api/analytics/user/${address}?days=${days}`
  );
}

/**
 * Get platform-wide analytics
 */
export async function getPlatformAnalytics(
  days: number = 30
): Promise<PlatformAnalyticsResponse> {
  return api.get<PlatformAnalyticsResponse>(
    `/api/analytics/platform?days=${days}`
  );
}

/**
 * Get user's recent activity summary
 */
export async function getUserActivitySummary(
  address: string
): Promise<{
  lastIntent: string | null;
  intentsTodday: number;
  intentsThisWeek: number;
  mostUsedChain: string | null;
}> {
  return api.get(`/api/analytics/user/${address}/summary`);
}

/**
 * Get leaderboard data
 */
export async function getLeaderboard(
  metric: 'volume' | 'intents' | 'gasSaved' = 'volume',
  limit: number = 10
): Promise<{
  leaderboard: Array<{
    rank: number;
    address: string;
    value: string;
    intents: number;
  }>;
}> {
  return api.get(`/api/analytics/leaderboard?metric=${metric}&limit=${limit}`);
}

export default {
  getUserAnalytics,
  getPlatformAnalytics,
  getUserActivitySummary,
  getLeaderboard,
};
