/**
 * Redis client singleton
 * Handles caching for routes, token prices, and gas prices
 */

import Redis from 'ioredis';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

class RedisClient {
  private client: Redis;
  private isConnected = false;

  constructor() {
    this.client = new Redis(config.redisUrl, {
      password: config.redisPassword || undefined,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('✅ Redis connected successfully');
    });

    this.client.on('error', (error) => {
      logger.error({ error }, '❌ Redis connection error');
    });

    this.client.on('close', () => {
      this.isConnected = false;
      logger.warn('Redis connection closed');
    });
  }

  /**
   * Get value from cache
   * @param key - Cache key
   * @returns Parsed value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error({ error, key }, 'Error getting value from Redis');
      return null;
    }
  }

  /**
   * Set value in cache with TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlSeconds - Time to live in seconds
   */
  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setex(key, ttlSeconds, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (error) {
      logger.error({ error, key }, 'Error setting value in Redis');
    }
  }

  /**
   * Delete key from cache
   * @param key - Cache key
   */
  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      logger.error({ error, key }, 'Error deleting key from Redis');
    }
  }

  /**
   * Delete multiple keys matching pattern
   * @param pattern - Key pattern (e.g., 'route:*')
   */
  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      logger.error({ error, pattern }, 'Error deleting keys by pattern');
    }
  }

  /**
   * Check if cache is available
   */
  isAvailable(): boolean {
    return this.isConnected;
  }

  /**
   * Test Redis connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      logger.error({ error }, 'Redis connection test failed');
      return false;
    }
  }

  /**
   * Gracefully disconnect from Redis
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.quit();
      logger.info('Redis disconnected');
    } catch (error) {
      logger.error({ error }, 'Error disconnecting from Redis');
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    try {
      const info = await this.client.info('stats');
      return info;
    } catch (error) {
      logger.error({ error }, 'Error getting Redis stats');
      return null;
    }
  }
}

// Export singleton instance
export const redis = new RedisClient();

// Cache key generators
export const cacheKeys = {
  route: (intentHash: string) => `route:${intentHash}`,
  tokenPrice: (tokenAddress: string, chainId: number) => `token:${chainId}:${tokenAddress}`,
  gasPrice: (chainId: number) => `gas:${chainId}`,
  similarIntent: (inputHash: string) => `intent:${inputHash}`,
};
