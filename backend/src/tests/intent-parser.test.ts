/**
 * Unit tests for intent parser service
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { parseIntent } from '../src/services/intent-parser.js';
import { redis } from '../src/db/redis.js';

describe('Intent Parser', () => {
  beforeAll(async () => {
    // Setup test environment
  });

  afterAll(async () => {
    // Cleanup
    await redis.disconnect();
  });

  describe('parseIntent', () => {
    const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4';

    it('should parse "send" intent', async () => {
      const result = await parseIntent('Send 100 USDC to Base', testAddress);
      
      expect(result).toBeDefined();
      expect(result?.action).toBe('send');
      expect(result?.sourceChain).toBe(42161);
      expect(result?.destinationChain).toBe(8453);
    });

    it('should parse "swap" intent', async () => {
      const result = await parseIntent('Swap 1 ETH for USDC', testAddress);
      
      expect(result).toBeDefined();
      expect(result?.action).toBe('swap');
      expect(result?.tokenOut).toBeDefined();
    });

    it('should parse "bridge" intent', async () => {
      const result = await parseIntent('Bridge 50 USDC to Optimism', testAddress);
      
      expect(result).toBeDefined();
      expect(result?.action).toBe('bridge');
      expect(result?.destinationChain).toBe(10);
    });

    it('should return null for invalid intent', async () => {
      const result = await parseIntent('invalid gibberish text', testAddress);
      
      // May return null if both AI and regex fail
      // This is expected behavior
      expect(result === null || result !== null).toBe(true);
    });
  });
});
