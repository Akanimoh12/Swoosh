/**
 * Services Index
 * Export all API services from a single entry point
 */

// Base API utilities
export { 
  api, 
  apiFetch, 
  ApiError,
  API_URL,
  WS_URL,
  type ApiResponse,
  type PaginatedResponse,
} from './api';

// Intent services
export {
  createIntent,
  getIntent,
  getIntents,
  cancelIntent,
  retryIntent,
  getIntentStatus,
  type Intent,
  type IntentStatus,
  type TokenInfo,
  type RouteStep,
  type CreateIntentRequest,
  type CreateIntentResponse,
  type GetIntentsParams,
} from './intents';

// Analytics services
export {
  getUserAnalytics,
  getPlatformAnalytics,
  getUserActivitySummary,
  getLeaderboard,
  type UserStats,
  type PlatformStats,
  type UserAnalyticsResponse,
  type PlatformAnalyticsResponse,
  type TimeSeriesPoint,
  type ChainDistribution,
  type TokenDistribution,
  type AnalyticsParams,
} from './analytics';

// Intent cache for offline/instant display
export {
  getCachedIntents,
  cacheIntents,
  updateCachedIntent,
  addCachedIntent,
  removeCachedIntent,
  clearIntentCache,
  isCacheStale,
  getCacheAge,
  type CachedIntent,
} from './intentCache';

// Default export with all services grouped
import intentsService from './intents';
import analyticsService from './analytics';

export default {
  intents: intentsService,
  analytics: analyticsService,
};
