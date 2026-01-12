/**
 * Route Optimizer Service
 * Determines optimal route execution paths and integrates with DEX aggregators
 */

import crypto from 'crypto';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { redis, cacheKeys } from '../db/redis.js';
import { ParsedIntent, Route, RouteStep, RouteStepType } from '../types/index.js';

/**
 * Optimize route for a given intent
 * @param intent - Parsed intent
 * @returns Optimized route with steps and cost estimates
 */
export async function optimizeRoute(intent: ParsedIntent): Promise<Route | null> {
  const log = logger.child({ function: 'optimizeRoute' });

  try {
    // Generate intent hash for caching
    const intentHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(intent))
      .digest('hex');

    // Check cache
    const cached = await redis.get<Route>(cacheKeys.route(intentHash));
    if (cached) {
      log.info('Cache hit for route');
      return cached;
    }

    const startTime = Date.now();

    // Determine route type and build steps
    const route = await buildRoute(intent);
    if (!route) {
      log.error('Failed to build route');
      return null;
    }

    const duration = Date.now() - startTime;
    log.info({ duration, steps: route.steps.length }, 'Route optimized');

    // Cache the route
    await redis.set(cacheKeys.route(intentHash), route, config.cacheTtlRoutes);

    return route;
  } catch (error) {
    log.error({ error }, 'Error in optimizeRoute');
    return null;
  }
}

/**
 * Build route based on intent type
 */
async function buildRoute(intent: ParsedIntent): Promise<Route | null> {
  const log = logger.child({ function: 'buildRoute', action: intent.action });

  try {
    // Determine route type
    const isSameChain = intent.sourceChain === intent.destinationChain;
    const isSwap = intent.action === 'swap' || !!intent.tokenOut;

    if (isSameChain && isSwap) {
      // Same-chain swap
      return buildSameChainSwapRoute(intent);
    } else if (isSameChain && !isSwap) {
      // Same-chain transfer
      return buildSameChainTransferRoute(intent);
    } else if (!isSameChain && !isSwap) {
      // Cross-chain bridge
      return buildCrossChainBridgeRoute(intent);
    } else {
      // Cross-chain swap (swap + bridge)
      return buildCrossChainSwapRoute(intent);
    }
  } catch (error) {
    log.error({ error }, 'Error building route');
    return null;
  }
}

/**
 * Build same-chain swap route
 */
async function buildSameChainSwapRoute(intent: ParsedIntent): Promise<Route> {
  const log = logger.child({ function: 'buildSameChainSwapRoute' });

  // In Phase 1, we stub the DEX integration
  // Phase 2 will integrate with 1inch API for real quotes
  const estimatedAmountOut = calculateEstimatedOutput(intent.amount, 0.003); // 0.3% fee

  const swapStep: RouteStep = {
    type: RouteStepType.SWAP,
    chainId: intent.sourceChain,
    protocol: '1inch',
    tokenIn: intent.tokenIn,
    tokenOut: intent.tokenOut || intent.tokenIn,
    amountIn: intent.amount,
    amountOut: estimatedAmountOut,
    data: '0x', // Placeholder for DEX calldata
    estimatedGas: '150000', // Estimated gas for swap
  };

  const gasCostUsd = await estimateGasCost(intent.sourceChain, 150000);
  const totalCost = (parseFloat(gasCostUsd) * 1.003).toFixed(6); // Gas + 0.3% swap fee

  log.info({ totalCost, estimatedAmountOut }, 'Same-chain swap route built');

  return {
    steps: [swapStep],
    totalCost,
    estimatedTime: 30, // 30 seconds
    confidence: 95,
  };
}

/**
 * Build same-chain transfer route
 */
async function buildSameChainTransferRoute(intent: ParsedIntent): Promise<Route> {
  const log = logger.child({ function: 'buildSameChainTransferRoute' });

  const transferStep: RouteStep = {
    type: RouteStepType.TRANSFER,
    chainId: intent.sourceChain,
    protocol: 'native',
    tokenIn: intent.tokenIn,
    tokenOut: intent.tokenIn,
    amountIn: intent.amount,
    amountOut: intent.amount,
    data: '0x', // Placeholder for transfer calldata
    estimatedGas: '21000', // Standard transfer gas
  };

  const totalCost = await estimateGasCost(intent.sourceChain, 21000);

  log.info({ totalCost }, 'Same-chain transfer route built');

  return {
    steps: [transferStep],
    totalCost,
    estimatedTime: 15, // 15 seconds
    confidence: 99,
  };
}

/**
 * Build cross-chain bridge route
 */
async function buildCrossChainBridgeRoute(intent: ParsedIntent): Promise<Route> {
  const log = logger.child({ function: 'buildCrossChainBridgeRoute' });

  // Phase 1: Stub CCIP fee estimation
  // Phase 2: Integrate with actual CCIP router for real fees
  const ccipFee = estimateCCIPFee(intent.sourceChain, intent.destinationChain);

  const bridgeStep: RouteStep = {
    type: RouteStepType.BRIDGE,
    chainId: intent.sourceChain,
    protocol: 'CCIP',
    tokenIn: intent.tokenIn,
    tokenOut: intent.tokenIn, // Same token on destination
    amountIn: intent.amount,
    amountOut: intent.amount, // No slippage for bridge
    data: '0x', // Placeholder for CCIP calldata
    estimatedGas: '300000', // Estimated gas for CCIP
  };

  const gasCost = await estimateGasCost(intent.sourceChain, 300000);
  const totalCost = (parseFloat(gasCost) + parseFloat(ccipFee)).toFixed(6);

  log.info({ totalCost, ccipFee }, 'Cross-chain bridge route built');

  return {
    steps: [bridgeStep],
    totalCost,
    estimatedTime: 300, // 5 minutes for cross-chain
    confidence: 90,
  };
}

/**
 * Build cross-chain swap route (swap on source + bridge)
 */
async function buildCrossChainSwapRoute(intent: ParsedIntent): Promise<Route> {
  const log = logger.child({ function: 'buildCrossChainSwapRoute' });

  const estimatedAmountOut = calculateEstimatedOutput(intent.amount, 0.003);

  // Step 1: Swap on source chain
  const swapStep: RouteStep = {
    type: RouteStepType.SWAP,
    chainId: intent.sourceChain,
    protocol: '1inch',
    tokenIn: intent.tokenIn,
    tokenOut: intent.tokenOut || intent.tokenIn,
    amountIn: intent.amount,
    amountOut: estimatedAmountOut,
    data: '0x',
    estimatedGas: '150000',
  };

  // Step 2: Bridge to destination chain
  const ccipFee = estimateCCIPFee(intent.sourceChain, intent.destinationChain);
  const bridgeStep: RouteStep = {
    type: RouteStepType.BRIDGE,
    chainId: intent.sourceChain,
    protocol: 'CCIP',
    tokenIn: intent.tokenOut || intent.tokenIn,
    tokenOut: intent.tokenOut || intent.tokenIn,
    amountIn: estimatedAmountOut,
    amountOut: estimatedAmountOut,
    data: '0x',
    estimatedGas: '300000',
  };

  const swapGasCost = await estimateGasCost(intent.sourceChain, 150000);
  const bridgeGasCost = await estimateGasCost(intent.sourceChain, 300000);
  const totalCost = (
    parseFloat(swapGasCost) +
    parseFloat(bridgeGasCost) +
    parseFloat(ccipFee) +
    parseFloat(intent.amount) * 0.003 // Swap fee
  ).toFixed(6);

  log.info({ totalCost, steps: 2 }, 'Cross-chain swap route built');

  return {
    steps: [swapStep, bridgeStep],
    totalCost,
    estimatedTime: 330, // 5.5 minutes
    confidence: 85,
  };
}

/**
 * Calculate estimated output after fees
 */
function calculateEstimatedOutput(amountIn: string, feePercent: number): string {
  const amount = BigInt(amountIn);
  const fee = (amount * BigInt(Math.floor(feePercent * 10000))) / BigInt(10000);
  return (amount - fee).toString();
}

/**
 * Estimate gas cost in USD
 */
async function estimateGasCost(chainId: number, gasUnits: number): Promise<string> {
  // Check cache for gas price
  const cached = await redis.get<string>(cacheKeys.gasPrice(chainId));
  const gasPriceGwei = cached || '0.1'; // Default 0.1 Gwei for Arbitrum

  // Calculate cost: gasUnits * gasPriceGwei * ETH price
  const ethPriceUsd = 3000; // Placeholder - Phase 2 will fetch from oracle
  const gasCostEth = (gasUnits * parseFloat(gasPriceGwei)) / 1e9;
  const gasCostUsd = gasCostEth * ethPriceUsd;

  return gasCostUsd.toFixed(6);
}

/**
 * Estimate CCIP fee for cross-chain transfer
 */
function estimateCCIPFee(sourceChain: number, destChain: number): string {
  // Simplified fee estimation - Phase 2 will query CCIP router
  const baseFee = 0.5; // $0.50 base fee
  const perChainFee = 0.1; // $0.10 per chain hop

  return (baseFee + perChainFee).toFixed(6);
}

/**
 * Exponential backoff for API rate limiting
 */
export async function exponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T | null> {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      if (attempt >= maxRetries) {
        logger.error({ error, attempt }, 'Max retries reached');
        return null;
      }

      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
      logger.warn({ attempt, delay }, 'Retrying with backoff');
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  return null;
}
