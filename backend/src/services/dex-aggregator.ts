/**
 * DEX Aggregator Service
 * Integrates with 1inch, 0x, and provides Uniswap fallback for token swaps
 */

import { Address, Hex, encodeFunctionData, parseUnits, formatUnits, createPublicClient, http } from 'viem';
import { arbitrumSepolia } from 'viem/chains';
import { logger } from '../utils/logger.js';
import { redis, cacheKeys } from '../db/redis.js';

// ============================================================================
// Configuration
// ============================================================================

// 1inch API Configuration
const ONEINCH_API_BASE = 'https://api.1inch.dev/swap/v6.0';
const ONEINCH_API_KEY = process.env.ONEINCH_API_KEY || '';

// 0x API Configuration  
const ZEROX_API_BASE = 'https://api.0x.org/swap/v1';
const ZEROX_API_KEY = process.env.ZEROX_API_KEY || '';

// Supported chains
const CHAIN_IDS = {
  arbitrumSepolia: 421614,
  arbitrum: 42161,
  baseSepolia: 84532,
  base: 8453,
};

// Token addresses on Arbitrum Sepolia
export const TOKENS = {
  421614: {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address, // Native ETH placeholder
    WETH: '0xE591bf0A0CF924A0674d7792db046B23CEbF5f34' as Address,
    USDC: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as Address,
    LINK: '0xb1D4538B4571d411F07960EF2838Ce337FE1E80E' as Address,
  },
  84532: {
    ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' as Address,
    WETH: '0x4200000000000000000000000000000000000006' as Address,
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
    LINK: '0xE4aB69C077896252FAFBD49EFD26B5D171A32410' as Address,
  },
};

// RPC URLs
const RPC_URLS: Record<number, string> = {
  421614: 'https://sepolia-rollup.arbitrum.io/rpc',
  84532: 'https://sepolia.base.org',
};

// Uniswap V3 Router (for fallback)
const UNISWAP_ROUTER = {
  421614: '0xE592427A0AEce92De3Edee1F18E0157C05861564' as Address, // Uniswap V3 Router
  84532: '0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4' as Address,
};

// Cache TTLs
const CACHE_TTL_QUOTE = 30; // 30 seconds for quotes
const CACHE_TTL_TOKENS = 3600; // 1 hour for token lists

// ============================================================================
// Types
// ============================================================================

export interface SwapQuoteParams {
  chainId: number;
  srcToken: Address;
  dstToken: Address;
  amount: string; // Amount in smallest unit
  slippage?: number; // Percentage (0.5 = 0.5%)
  userAddress?: Address;
}

export interface SwapQuote {
  srcToken: Address;
  dstToken: Address;
  srcAmount: string;
  dstAmount: string;
  dstAmountMin: string; // After slippage
  protocols: string[];
  gasEstimate: string;
  priceImpact: string;
  aggregator: 'oneinch' | 'zerox' | 'uniswap' | 'mock';
  expiresAt: number;
}

export interface SwapTxParams extends SwapQuoteParams {
  recipient?: Address;
  referrer?: Address;
}

export interface SwapTx {
  to: Address;
  data: Hex;
  value: string;
  gasLimit: string;
  quote: SwapQuote;
}

export interface TokenInfo {
  address: Address;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

// ============================================================================
// Public Client
// ============================================================================

function getPublicClient(chainId: number) {
  const rpcUrl = RPC_URLS[chainId];
  if (!rpcUrl) throw new Error(`Unsupported chain ID: ${chainId}`);
  
  return createPublicClient({
    transport: http(rpcUrl),
  });
}

// ============================================================================
// 1inch Integration
// ============================================================================

/**
 * Get swap quote from 1inch API
 */
async function get1inchQuote(params: SwapQuoteParams): Promise<SwapQuote | null> {
  const log = logger.child({ function: 'get1inchQuote' });
  
  if (!ONEINCH_API_KEY) {
    log.debug('1inch API key not configured, skipping');
    return null;
  }
  
  try {
    const { chainId, srcToken, dstToken, amount, slippage = 1 } = params;
    
    // Build URL with query params
    const url = new URL(`${ONEINCH_API_BASE}/${chainId}/quote`);
    url.searchParams.set('src', srcToken);
    url.searchParams.set('dst', dstToken);
    url.searchParams.set('amount', amount);
    url.searchParams.set('includeProtocols', 'true');
    url.searchParams.set('includeGas', 'true');
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${ONEINCH_API_KEY}`,
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      log.warn({ status: response.status, error }, '1inch API error');
      return null;
    }
    
    const data = await response.json();
    
    // Calculate min amount after slippage
    const dstAmountBigInt = BigInt(data.dstAmount);
    const slippageFactor = 1 - slippage / 100;
    const dstAmountMin = (dstAmountBigInt * BigInt(Math.floor(slippageFactor * 10000))) / 10000n;
    
    // Extract protocol names
    const protocols = data.protocols?.[0]?.map((p: any) => p[0]?.name).filter(Boolean) || ['1inch'];
    
    return {
      srcToken,
      dstToken,
      srcAmount: amount,
      dstAmount: data.dstAmount,
      dstAmountMin: dstAmountMin.toString(),
      protocols,
      gasEstimate: data.gas?.toString() || '200000',
      priceImpact: data.estimatedPriceImpact || '0',
      aggregator: 'oneinch',
      expiresAt: Date.now() + CACHE_TTL_QUOTE * 1000,
    };
  } catch (error) {
    log.error({ error }, 'Failed to get 1inch quote');
    return null;
  }
}

/**
 * Get swap transaction data from 1inch API
 */
async function get1inchSwapTx(params: SwapTxParams): Promise<SwapTx | null> {
  const log = logger.child({ function: 'get1inchSwapTx' });
  
  if (!ONEINCH_API_KEY) {
    log.debug('1inch API key not configured, skipping');
    return null;
  }
  
  try {
    const { chainId, srcToken, dstToken, amount, slippage = 1, userAddress, recipient } = params;
    
    if (!userAddress) {
      log.error('userAddress is required for swap tx');
      return null;
    }
    
    // Build URL
    const url = new URL(`${ONEINCH_API_BASE}/${chainId}/swap`);
    url.searchParams.set('src', srcToken);
    url.searchParams.set('dst', dstToken);
    url.searchParams.set('amount', amount);
    url.searchParams.set('from', userAddress);
    url.searchParams.set('slippage', slippage.toString());
    url.searchParams.set('includeProtocols', 'true');
    
    if (recipient && recipient !== userAddress) {
      url.searchParams.set('receiver', recipient);
    }
    
    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${ONEINCH_API_KEY}`,
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      log.warn({ status: response.status, error }, '1inch swap API error');
      return null;
    }
    
    const data = await response.json();
    
    // Build quote from response
    const dstAmountBigInt = BigInt(data.dstAmount);
    const slippageFactor = 1 - slippage / 100;
    const dstAmountMin = (dstAmountBigInt * BigInt(Math.floor(slippageFactor * 10000))) / 10000n;
    
    const quote: SwapQuote = {
      srcToken,
      dstToken,
      srcAmount: amount,
      dstAmount: data.dstAmount,
      dstAmountMin: dstAmountMin.toString(),
      protocols: data.protocols?.[0]?.map((p: any) => p[0]?.name).filter(Boolean) || ['1inch'],
      gasEstimate: data.tx?.gas?.toString() || '200000',
      priceImpact: '0',
      aggregator: 'oneinch',
      expiresAt: Date.now() + CACHE_TTL_QUOTE * 1000,
    };
    
    return {
      to: data.tx.to as Address,
      data: data.tx.data as Hex,
      value: data.tx.value || '0',
      gasLimit: data.tx.gas?.toString() || '500000',
      quote,
    };
  } catch (error) {
    log.error({ error }, 'Failed to get 1inch swap tx');
    return null;
  }
}

// ============================================================================
// 0x Integration (Fallback)
// ============================================================================

/**
 * Get swap quote from 0x API
 */
async function get0xQuote(params: SwapQuoteParams): Promise<SwapQuote | null> {
  const log = logger.child({ function: 'get0xQuote' });
  
  if (!ZEROX_API_KEY) {
    log.debug('0x API key not configured, skipping');
    return null;
  }
  
  try {
    const { chainId, srcToken, dstToken, amount, slippage = 1 } = params;
    
    // 0x uses different chain endpoints
    const chainEndpoint = chainId === 42161 ? 'arbitrum' : chainId === 421614 ? 'arbitrum-sepolia' : '';
    if (!chainEndpoint) {
      log.debug({ chainId }, '0x does not support this chain');
      return null;
    }
    
    const url = new URL(`https://${chainEndpoint}.api.0x.org/swap/v1/quote`);
    url.searchParams.set('sellToken', srcToken);
    url.searchParams.set('buyToken', dstToken);
    url.searchParams.set('sellAmount', amount);
    url.searchParams.set('slippagePercentage', (slippage / 100).toString());
    
    const response = await fetch(url.toString(), {
      headers: {
        '0x-api-key': ZEROX_API_KEY,
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const error = await response.text();
      log.warn({ status: response.status, error }, '0x API error');
      return null;
    }
    
    const data = await response.json();
    
    return {
      srcToken,
      dstToken,
      srcAmount: amount,
      dstAmount: data.buyAmount,
      dstAmountMin: data.guaranteedPrice 
        ? (BigInt(data.buyAmount) * BigInt(Math.floor((1 - slippage / 100) * 10000)) / 10000n).toString()
        : data.buyAmount,
      protocols: data.sources?.filter((s: any) => parseFloat(s.proportion) > 0).map((s: any) => s.name) || ['0x'],
      gasEstimate: data.estimatedGas || '200000',
      priceImpact: data.estimatedPriceImpact || '0',
      aggregator: 'zerox',
      expiresAt: Date.now() + CACHE_TTL_QUOTE * 1000,
    };
  } catch (error) {
    log.error({ error }, 'Failed to get 0x quote');
    return null;
  }
}

// ============================================================================
// Uniswap V3 Fallback
// ============================================================================

// Uniswap V3 SwapRouter ABI (minimal)
const UNISWAP_ROUTER_ABI = [
  {
    name: 'exactInputSingle',
    type: 'function',
    stateMutability: 'payable',
    inputs: [{
      name: 'params',
      type: 'tuple',
      components: [
        { name: 'tokenIn', type: 'address' },
        { name: 'tokenOut', type: 'address' },
        { name: 'fee', type: 'uint24' },
        { name: 'recipient', type: 'address' },
        { name: 'deadline', type: 'uint256' },
        { name: 'amountIn', type: 'uint256' },
        { name: 'amountOutMinimum', type: 'uint256' },
        { name: 'sqrtPriceLimitX96', type: 'uint160' },
      ],
    }],
    outputs: [{ name: 'amountOut', type: 'uint256' }],
  },
] as const;

/**
 * Build Uniswap V3 swap transaction (fallback when aggregators fail)
 */
async function getUniswapSwapTx(params: SwapTxParams): Promise<SwapTx | null> {
  const log = logger.child({ function: 'getUniswapSwapTx' });
  
  try {
    const { chainId, srcToken, dstToken, amount, slippage = 1, userAddress, recipient } = params;
    
    const router = UNISWAP_ROUTER[chainId as keyof typeof UNISWAP_ROUTER];
    if (!router) {
      log.debug({ chainId }, 'Uniswap not available on this chain');
      return null;
    }
    
    if (!userAddress) {
      log.error('userAddress required for Uniswap swap');
      return null;
    }
    
    // For testnet, we'll create a mock quote since Uniswap may not have liquidity
    // In production, you'd query the Uniswap Quoter contract
    const mockOutputAmount = BigInt(amount) * 95n / 100n; // Assume 5% price difference
    const minOutput = mockOutputAmount * BigInt(Math.floor((1 - slippage / 100) * 10000)) / 10000n;
    
    // Build swap calldata
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800); // 30 minutes
    
    const swapParams = {
      tokenIn: srcToken === TOKENS[421614].ETH ? TOKENS[421614].WETH : srcToken,
      tokenOut: dstToken === TOKENS[421614].ETH ? TOKENS[421614].WETH : dstToken,
      fee: 3000, // 0.3% pool fee
      recipient: recipient || userAddress,
      deadline,
      amountIn: BigInt(amount),
      amountOutMinimum: minOutput,
      sqrtPriceLimitX96: 0n,
    };
    
    const data = encodeFunctionData({
      abi: UNISWAP_ROUTER_ABI,
      functionName: 'exactInputSingle',
      args: [swapParams],
    });
    
    const quote: SwapQuote = {
      srcToken,
      dstToken,
      srcAmount: amount,
      dstAmount: mockOutputAmount.toString(),
      dstAmountMin: minOutput.toString(),
      protocols: ['Uniswap V3'],
      gasEstimate: '200000',
      priceImpact: '5', // Mock
      aggregator: 'uniswap',
      expiresAt: Date.now() + CACHE_TTL_QUOTE * 1000,
    };
    
    const isNativeIn = srcToken.toLowerCase() === TOKENS[421614].ETH.toLowerCase();
    
    return {
      to: router,
      data,
      value: isNativeIn ? amount : '0',
      gasLimit: '300000',
      quote,
    };
  } catch (error) {
    log.error({ error }, 'Failed to build Uniswap swap tx');
    return null;
  }
}

// ============================================================================
// Mock Provider (for testnet without liquidity)
// ============================================================================

/**
 * Generate mock swap quote for testing
 * Used when aggregators don't support testnet
 */
function getMockQuote(params: SwapQuoteParams): SwapQuote {
  const { srcToken, dstToken, amount, slippage = 1 } = params;
  
  // Mock exchange rate (1 ETH = 2000 USDC approximately)
  let mockRate = 1n;
  
  // Determine mock rate based on token pair
  const srcIsETH = srcToken.toLowerCase() === TOKENS[421614].ETH.toLowerCase() ||
                   srcToken.toLowerCase() === TOKENS[421614].WETH.toLowerCase();
  const dstIsUSDC = dstToken.toLowerCase() === TOKENS[421614].USDC.toLowerCase();
  const srcIsUSDC = srcToken.toLowerCase() === TOKENS[421614].USDC.toLowerCase();
  const dstIsETH = dstToken.toLowerCase() === TOKENS[421614].ETH.toLowerCase() ||
                   dstToken.toLowerCase() === TOKENS[421614].WETH.toLowerCase();
  
  let dstAmount: bigint;
  
  if (srcIsETH && dstIsUSDC) {
    // ETH -> USDC: multiply by ~2000, adjust for decimals (18 -> 6)
    dstAmount = BigInt(amount) * 2000n / 10n ** 12n;
  } else if (srcIsUSDC && dstIsETH) {
    // USDC -> ETH: divide by ~2000, adjust for decimals (6 -> 18)
    dstAmount = BigInt(amount) * 10n ** 12n / 2000n;
  } else {
    // Same decimal tokens or unknown pair - 1:1 with 0.3% fee
    dstAmount = BigInt(amount) * 997n / 1000n;
  }
  
  const dstAmountMin = dstAmount * BigInt(Math.floor((1 - slippage / 100) * 10000)) / 10000n;
  
  return {
    srcToken,
    dstToken,
    srcAmount: amount,
    dstAmount: dstAmount.toString(),
    dstAmountMin: dstAmountMin.toString(),
    protocols: ['Mock (Testnet)'],
    gasEstimate: '150000',
    priceImpact: '0.3',
    aggregator: 'mock',
    expiresAt: Date.now() + CACHE_TTL_QUOTE * 1000,
  };
}

// ============================================================================
// Public API Functions
// ============================================================================

/**
 * Get the best swap quote from available aggregators
 * Tries 1inch first, then 0x, then Uniswap
 */
export async function getSwapQuote(params: SwapQuoteParams): Promise<SwapQuote> {
  const log = logger.child({ function: 'getSwapQuote' });
  const { chainId, srcToken, dstToken, amount, slippage = 1 } = params;
  
  // Check cache first
  const cacheKey = `swap:quote:${chainId}:${srcToken}:${dstToken}:${amount}:${slippage}`;
  const cached = await redis.get<SwapQuote>(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    log.debug('Cache hit for swap quote');
    return cached;
  }
  
  log.info({ chainId, srcToken, dstToken, amount }, 'Fetching swap quote');
  
  // Try aggregators in order of preference
  const quotes: SwapQuote[] = [];
  
  // 1inch (best for mainnet)
  const oneinchQuote = await get1inchQuote(params);
  if (oneinchQuote) quotes.push(oneinchQuote);
  
  // 0x (good alternative)
  const zeroxQuote = await get0xQuote(params);
  if (zeroxQuote) quotes.push(zeroxQuote);
  
  // If no aggregator quotes, use mock for testnet
  if (quotes.length === 0) {
    log.info('No aggregator quotes available, using mock quote for testnet');
    const mockQuote = getMockQuote(params);
    quotes.push(mockQuote);
  }
  
  // Find best quote (highest output amount)
  const bestQuote = quotes.reduce((best, current) => {
    return BigInt(current.dstAmount) > BigInt(best.dstAmount) ? current : best;
  }, quotes[0]);
  
  // Cache the best quote
  await redis.set(cacheKey, bestQuote, CACHE_TTL_QUOTE);
  
  log.info({
    aggregator: bestQuote.aggregator,
    dstAmount: bestQuote.dstAmount,
    protocols: bestQuote.protocols,
  }, 'Best quote found');
  
  return bestQuote;
}

/**
 * Get swap transaction data with calldata
 * Returns transaction ready to be signed and sent
 */
export async function getSwapTransaction(params: SwapTxParams): Promise<SwapTx> {
  const log = logger.child({ function: 'getSwapTransaction' });
  const { chainId, srcToken, dstToken, amount, userAddress } = params;
  
  if (!userAddress) {
    throw new Error('userAddress is required for swap transaction');
  }
  
  log.info({ chainId, srcToken, dstToken, amount, userAddress }, 'Building swap transaction');
  
  // Try 1inch first
  const oneinchTx = await get1inchSwapTx(params);
  if (oneinchTx) {
    log.info('Using 1inch swap');
    return oneinchTx;
  }
  
  // Try Uniswap fallback
  const uniswapTx = await getUniswapSwapTx(params);
  if (uniswapTx) {
    log.info('Using Uniswap fallback');
    return uniswapTx;
  }
  
  // Mock transaction for testnet
  log.info('Using mock swap transaction for testnet');
  const mockQuote = getMockQuote(params);
  
  // Build mock transaction (would need real DEX in production)
  return {
    to: UNISWAP_ROUTER[chainId as keyof typeof UNISWAP_ROUTER] || '0x0000000000000000000000000000000000000000' as Address,
    data: '0x' as Hex,
    value: srcToken.toLowerCase() === TOKENS[421614].ETH.toLowerCase() ? amount : '0',
    gasLimit: '200000',
    quote: mockQuote,
  };
}

/**
 * Simulate a swap to check if it would succeed
 */
export async function simulateSwap(params: SwapTxParams): Promise<{
  success: boolean;
  error?: string;
  gasUsed?: string;
}> {
  const log = logger.child({ function: 'simulateSwap' });
  
  try {
    const { chainId, userAddress } = params;
    
    if (!userAddress) {
      return { success: false, error: 'userAddress is required' };
    }
    
    const swapTx = await getSwapTransaction(params);
    
    // If it's a mock transaction, skip simulation
    if (swapTx.quote.aggregator === 'mock') {
      log.info('Mock transaction - skipping simulation');
      return { success: true, gasUsed: swapTx.gasLimit };
    }
    
    // Simulate using eth_call
    const client = getPublicClient(chainId);
    
    await client.call({
      account: userAddress,
      to: swapTx.to,
      data: swapTx.data,
      value: BigInt(swapTx.value),
    });
    
    log.info('Swap simulation successful');
    return { success: true, gasUsed: swapTx.gasLimit };
  } catch (error: any) {
    log.error({ error }, 'Swap simulation failed');
    return { 
      success: false, 
      error: error.shortMessage || error.message || 'Simulation failed',
    };
  }
}

/**
 * Compare quotes from multiple aggregators
 */
export async function compareQuotes(params: SwapQuoteParams): Promise<{
  quotes: SwapQuote[];
  best: SwapQuote;
  comparison: {
    aggregator: string;
    dstAmount: string;
    difference: string; // Percentage difference from best
  }[];
}> {
  const log = logger.child({ function: 'compareQuotes' });
  
  log.info('Comparing quotes from all aggregators');
  
  const quotes: SwapQuote[] = [];
  
  // Fetch from all sources in parallel
  const [oneinchQuote, zeroxQuote] = await Promise.all([
    get1inchQuote(params),
    get0xQuote(params),
  ]);
  
  if (oneinchQuote) quotes.push(oneinchQuote);
  if (zeroxQuote) quotes.push(zeroxQuote);
  
  // Add mock if no real quotes
  if (quotes.length === 0) {
    quotes.push(getMockQuote(params));
  }
  
  // Find best
  const best = quotes.reduce((b, c) => 
    BigInt(c.dstAmount) > BigInt(b.dstAmount) ? c : b, 
    quotes[0]
  );
  
  // Calculate comparison
  const comparison = quotes.map(q => {
    const diff = BigInt(best.dstAmount) > 0n
      ? ((BigInt(q.dstAmount) - BigInt(best.dstAmount)) * 10000n / BigInt(best.dstAmount))
      : 0n;
    
    return {
      aggregator: q.aggregator,
      dstAmount: q.dstAmount,
      difference: `${Number(diff) / 100}%`,
    };
  });
  
  return { quotes, best, comparison };
}

/**
 * Get token approval amount needed for swap
 */
export async function getApprovalAmount(params: {
  chainId: number;
  token: Address;
  owner: Address;
  spender: Address;
}): Promise<{
  currentAllowance: string;
  needsApproval: boolean;
  recommendedApproval: string;
}> {
  const { chainId, token, owner, spender } = params;
  
  // Skip for native ETH
  if (token.toLowerCase() === TOKENS[421614].ETH.toLowerCase()) {
    return {
      currentAllowance: '0',
      needsApproval: false,
      recommendedApproval: '0',
    };
  }
  
  const client = getPublicClient(chainId);
  
  const allowance = await client.readContract({
    address: token,
    abi: [{
      name: 'allowance',
      type: 'function',
      stateMutability: 'view',
      inputs: [
        { name: 'owner', type: 'address' },
        { name: 'spender', type: 'address' },
      ],
      outputs: [{ name: '', type: 'uint256' }],
    }],
    functionName: 'allowance',
    args: [owner, spender],
  });
  
  // Recommend max approval for convenience
  const maxApproval = '115792089237316195423570985008687907853269984665640564039457584007913129639935'; // type(uint256).max
  
  return {
    currentAllowance: allowance.toString(),
    needsApproval: allowance === 0n,
    recommendedApproval: maxApproval,
  };
}

/**
 * Build token approval transaction
 */
export function buildApprovalTx(params: {
  token: Address;
  spender: Address;
  amount: string;
}): { to: Address; data: Hex } {
  const { token, spender, amount } = params;
  
  const data = encodeFunctionData({
    abi: [{
      name: 'approve',
      type: 'function',
      stateMutability: 'nonpayable',
      inputs: [
        { name: 'spender', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      outputs: [{ name: '', type: 'bool' }],
    }],
    functionName: 'approve',
    args: [spender, BigInt(amount)],
  });
  
  return { to: token, data };
}

/**
 * Validate slippage tolerance
 */
export function validateSlippage(slippage: number): { valid: boolean; error?: string } {
  if (slippage < 0.1) {
    return { valid: false, error: 'Slippage too low, transaction may fail' };
  }
  if (slippage > 5) {
    return { valid: false, error: 'Slippage too high, maximum is 5%' };
  }
  return { valid: true };
}

export default {
  TOKENS,
  getSwapQuote,
  getSwapTransaction,
  simulateSwap,
  compareQuotes,
  getApprovalAmount,
  buildApprovalTx,
  validateSlippage,
};
