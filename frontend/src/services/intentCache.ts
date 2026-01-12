/**
 * Intent Cache Service
 * Caches recent intents in localStorage for instant display
 */

const CACHE_KEY = 'swoosh_recent_intents';
const CACHE_VERSION = 1;
const MAX_CACHED_INTENTS = 50;
const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface CachedIntent {
  id: string;
  rawText: string;
  status: string;
  sourceChain: string | null;
  destChain: string | null;
  sourceToken: string | null;
  destToken: string | null;
  amount: string | null;
  estimatedCost: string | null;
  createdAt: string;
  updatedAt: string;
}

interface IntentCache {
  version: number;
  timestamp: number;
  address: string;
  intents: CachedIntent[];
}

/**
 * Get cached intents for a specific wallet address
 */
export function getCachedIntents(address: string): CachedIntent[] {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return [];

    const data: IntentCache = JSON.parse(cached);

    // Check version and expiry
    if (data.version !== CACHE_VERSION) {
      clearIntentCache();
      return [];
    }

    if (Date.now() - data.timestamp > CACHE_EXPIRY_MS) {
      clearIntentCache();
      return [];
    }

    // Return only if address matches
    if (data.address.toLowerCase() !== address.toLowerCase()) {
      return [];
    }

    return data.intents;
  } catch {
    clearIntentCache();
    return [];
  }
}

/**
 * Cache intents for a specific wallet address
 */
export function cacheIntents(address: string, intents: CachedIntent[]): void {
  try {
    const cache: IntentCache = {
      version: CACHE_VERSION,
      timestamp: Date.now(),
      address: address.toLowerCase(),
      intents: intents.slice(0, MAX_CACHED_INTENTS),
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.warn('Failed to cache intents:', error);
  }
}

/**
 * Update a single cached intent (for real-time updates)
 */
export function updateCachedIntent(address: string, updatedIntent: Partial<CachedIntent> & { id: string }): void {
  try {
    const intents = getCachedIntents(address);
    const index = intents.findIndex(i => i.id === updatedIntent.id);

    if (index >= 0) {
      intents[index] = { ...intents[index], ...updatedIntent };
      cacheIntents(address, intents);
    }
  } catch (error) {
    console.warn('Failed to update cached intent:', error);
  }
}

/**
 * Add a new intent to cache (for optimistic updates)
 */
export function addCachedIntent(address: string, intent: CachedIntent): void {
  try {
    const intents = getCachedIntents(address);
    // Add to beginning of array
    intents.unshift(intent);
    cacheIntents(address, intents);
  } catch (error) {
    console.warn('Failed to add cached intent:', error);
  }
}

/**
 * Remove an intent from cache
 */
export function removeCachedIntent(address: string, intentId: string): void {
  try {
    const intents = getCachedIntents(address);
    const filtered = intents.filter(i => i.id !== intentId);
    cacheIntents(address, filtered);
  } catch (error) {
    console.warn('Failed to remove cached intent:', error);
  }
}

/**
 * Clear all cached intents
 */
export function clearIntentCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Check if cache is stale (older than given milliseconds)
 */
export function isCacheStale(maxAgeMs: number = 5 * 60 * 1000): boolean {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return true;

    const data: IntentCache = JSON.parse(cached);
    return Date.now() - data.timestamp > maxAgeMs;
  } catch {
    return true;
  }
}

/**
 * Get cache age in milliseconds
 */
export function getCacheAge(): number | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data: IntentCache = JSON.parse(cached);
    return Date.now() - data.timestamp;
  } catch {
    return null;
  }
}
