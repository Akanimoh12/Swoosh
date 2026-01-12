/**
 * Unit tests for route optimizer service
 */

import { describe, it, expect } from 'vitest';
import { optimizeRoute } from '../src/services/route-optimizer.js';
import { ParsedIntent } from '../src/types/index.js';

describe('Route Optimizer', () => {
  describe('optimizeRoute', () => {
    it('should optimize same-chain swap', async () => {
      const intent: ParsedIntent = {
        action: 'swap',
        sourceChain: 42161,
        destinationChain: 42161,
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        amount: '1000000000000000000', // 1 ETH
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4',
        slippageTolerance: 0.5,
      };

      const route = await optimizeRoute(intent);

      expect(route).toBeDefined();
      expect(route?.steps).toHaveLength(1);
      expect(route?.steps[0]?.type).toBe('SWAP');
      expect(route?.totalCost).toBeDefined();
    });

    it('should optimize cross-chain bridge', async () => {
      const intent: ParsedIntent = {
        action: 'bridge',
        sourceChain: 42161,
        destinationChain: 8453,
        tokenIn: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        amount: '100000000', // 100 USDC
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4',
        slippageTolerance: 0.5,
      };

      const route = await optimizeRoute(intent);

      expect(route).toBeDefined();
      expect(route?.steps).toHaveLength(1);
      expect(route?.steps[0]?.type).toBe('BRIDGE');
      expect(route?.estimatedTime).toBeGreaterThan(100);
    });

    it('should optimize cross-chain swap', async () => {
      const intent: ParsedIntent = {
        action: 'swap',
        sourceChain: 42161,
        destinationChain: 8453,
        tokenIn: '0x0000000000000000000000000000000000000000',
        tokenOut: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
        amount: '1000000000000000000',
        recipient: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4',
        slippageTolerance: 0.5,
      };

      const route = await optimizeRoute(intent);

      expect(route).toBeDefined();
      expect(route?.steps).toHaveLength(2); // Swap + Bridge
      expect(route?.steps[0]?.type).toBe('SWAP');
      expect(route?.steps[1]?.type).toBe('BRIDGE');
    });
  });
});
