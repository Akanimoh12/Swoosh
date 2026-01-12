/**
 * Analytics Types
 * Types for user and platform analytics
 */

// ============================================================================
// User Statistics
// ============================================================================

export interface UserStats {
  totalIntents: number;
  completedIntents: number;
  failedIntents: number;
  pendingIntents: number;
  successRate: number;
  totalVolumeUsd: string;
  totalGasSaved: string;
  avgExecutionTime: number;
  comparisonToAverage: number; // percentage difference from platform average
}

// ============================================================================
// Platform Statistics
// ============================================================================

export interface PlatformStats {
  totalIntents: number;
  totalVolumeUsd: string;
  uniqueUsers: number;
  avgExecutionTime: number;
  successRate: number;
  topSourceChain: string;
  topDestChain: string;
  topToken: string;
}

// ============================================================================
// Time Series Data
// ============================================================================

export interface TimeSeriesPoint {
  date: string;
  count: number;
  volume?: number;
}

// ============================================================================
// Distribution Data
// ============================================================================

export interface ChainDistribution {
  chainId: number;
  chainName: string;
  count: number;
  percentage: number;
  volume?: string;
}

export interface TokenDistribution {
  symbol: string;
  name: string;
  count: number;
  percentage: number;
  volume?: string;
}

// ============================================================================
// Analytics Responses
// ============================================================================

export interface UserAnalyticsResponse {
  stats: UserStats;
  timeSeries: TimeSeriesPoint[];
  chainDistribution: ChainDistribution[];
  tokenDistribution: TokenDistribution[];
}

export interface PlatformAnalyticsResponse {
  stats: PlatformStats;
  timeSeries: TimeSeriesPoint[];
  chainDistribution: ChainDistribution[];
  tokenDistribution: TokenDistribution[];
}

// ============================================================================
// Leaderboard
// ============================================================================

export interface LeaderboardEntry {
  rank: number;
  address: string;
  ensName?: string;
  totalIntents: number;
  totalVolume: string;
  gasSaved: string;
}

export interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  userRank?: number;
  totalUsers: number;
}
