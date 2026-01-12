/**
 * CCIP Manager Service
 * Handles Chainlink CCIP cross-chain messaging for token transfers
 */

import { createPublicClient, createWalletClient, http, encodeFunctionData, parseUnits, formatUnits, Address, Hex, encodeAbiParameters, parseAbiParameters } from 'viem';
import { arbitrumSepolia, baseSepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { logger } from '../utils/logger.js';
import { redis, cacheKeys } from '../db/redis.js';
import { prisma } from '../db/prisma.js';

// ============================================================================
// CCIP Configuration
// ============================================================================

export const CCIP_CONFIG = {
  // Arbitrum Sepolia
  arbitrumSepolia: {
    chainId: 421614,
    chainSelector: '3478487238524512106', // CCIP chain selector
    router: '0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165' as Address,
    linkToken: '0xb1D4538B4571d411F07960EF2838Ce337FE1E80E' as Address,
    weth: '0xE591bf0A0CF924A0674d7792db046B23CEbF5f34' as Address,
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorerUrl: 'https://sepolia.arbiscan.io',
  },
  // Base Sepolia
  baseSepolia: {
    chainId: 84532,
    chainSelector: '10344971235874465080', // CCIP chain selector
    router: '0xD3b06cEbF099CE7DA4AcCf578aaebFDBd6e88a93' as Address,
    linkToken: '0xE4aB69C077896252FAFBD49EFD26B5D171A32410' as Address,
    weth: '0x4200000000000000000000000000000000000006' as Address,
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
  },
} as const;

// Supported CCIP tokens on Arbitrum Sepolia
export const CCIP_SUPPORTED_TOKENS = {
  421614: {
    USDC: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d' as Address,
    LINK: '0xb1D4538B4571d411F07960EF2838Ce337FE1E80E' as Address,
    'CCIP-BnM': '0xA8C0c11bf64AF62CDCA6f93D3769B88BdD7cb93D' as Address, // CCIP test token
  },
  84532: {
    USDC: '0x036CbD53842c5426634e7929541eC2318f3dCF7e' as Address,
    LINK: '0xE4aB69C077896252FAFBD49EFD26B5D171A32410' as Address,
    'CCIP-BnM': '0x88A2d74F47a237a62e7A51cdDa67270CE381555e' as Address, // CCIP test token
  },
};

// CCIP Message statuses
export enum CCIPMessageStatus {
  PENDING = 'PENDING',
  IN_FLIGHT = 'IN_FLIGHT',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  TIMEOUT = 'TIMEOUT',
}

// ============================================================================
// ABI Definitions
// ============================================================================

// CCIP Router ABI (minimal for our needs)
const CCIP_ROUTER_ABI = [
  {
    name: 'getFee',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'destinationChainSelector', type: 'uint64' },
      { name: 'message', type: 'tuple', components: [
        { name: 'receiver', type: 'bytes' },
        { name: 'data', type: 'bytes' },
        { name: 'tokenAmounts', type: 'tuple[]', components: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ]},
        { name: 'feeToken', type: 'address' },
        { name: 'extraArgs', type: 'bytes' },
      ]},
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'ccipSend',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'destinationChainSelector', type: 'uint64' },
      { name: 'message', type: 'tuple', components: [
        { name: 'receiver', type: 'bytes' },
        { name: 'data', type: 'bytes' },
        { name: 'tokenAmounts', type: 'tuple[]', components: [
          { name: 'token', type: 'address' },
          { name: 'amount', type: 'uint256' },
        ]},
        { name: 'feeToken', type: 'address' },
        { name: 'extraArgs', type: 'bytes' },
      ]},
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'isChainSupported',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'chainSelector', type: 'uint64' }],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

// ERC20 ABI for token approvals
const ERC20_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

// ============================================================================
// Types
// ============================================================================

export interface CCIPMessage {
  receiver: Address;
  data: Hex;
  tokenAmounts: Array<{
    token: Address;
    amount: bigint;
  }>;
  feeToken: Address;
  extraArgs: Hex;
}

export interface CCIPTransferParams {
  intentId: string;
  sourceChainId: number;
  destinationChainId: number;
  token: Address;
  amount: string;
  recipient: Address;
  data?: Hex;
}

export interface CCIPFeeEstimate {
  feeInLINK: string;
  feeInNative: string;
  feeToken: Address;
  destinationChainSelector: string;
}

export interface CCIPTransferResult {
  messageId: Hex;
  txHash: Hex;
  sourceChainId: number;
  destinationChainId: number;
  status: CCIPMessageStatus;
  timestamp: number;
}

// ============================================================================
// Client Setup
// ============================================================================

function getPublicClient(chainId: number) {
  const config = chainId === 421614 ? CCIP_CONFIG.arbitrumSepolia : CCIP_CONFIG.baseSepolia;
  const chain = chainId === 421614 ? arbitrumSepolia : baseSepolia;
  
  return createPublicClient({
    chain,
    transport: http(config.rpcUrl),
  });
}

function getWalletClient(chainId: number, privateKey: Hex) {
  const config = chainId === 421614 ? CCIP_CONFIG.arbitrumSepolia : CCIP_CONFIG.baseSepolia;
  const chain = chainId === 421614 ? arbitrumSepolia : baseSepolia;
  const account = privateKeyToAccount(privateKey);
  
  return createWalletClient({
    account,
    chain,
    transport: http(config.rpcUrl),
  });
}

function getChainConfig(chainId: number) {
  if (chainId === 421614) return CCIP_CONFIG.arbitrumSepolia;
  if (chainId === 84532) return CCIP_CONFIG.baseSepolia;
  throw new Error(`Unsupported chain ID: ${chainId}`);
}

function getDestinationChainSelector(chainId: number): bigint {
  const config = getChainConfig(chainId);
  return BigInt(config.chainSelector);
}

// ============================================================================
// CCIP Functions
// ============================================================================

/**
 * Build CCIP extra args with gas limit
 * Uses EVM extra args version v1 format
 */
function buildExtraArgs(gasLimit: bigint = 200_000n): Hex {
  // EVMExtraArgsV1 tag: 0x97a657c9
  // Format: tag (4 bytes) + abi.encode(gasLimit)
  const EVMExtraArgsV1Tag = '0x97a657c9';
  const encodedGasLimit = encodeAbiParameters(
    parseAbiParameters('uint256'),
    [gasLimit]
  );
  return `${EVMExtraArgsV1Tag}${encodedGasLimit.slice(2)}` as Hex;
}

/**
 * Build CCIP message structure
 */
function buildCCIPMessage(params: {
  receiver: Address;
  token: Address;
  amount: bigint;
  feeToken: Address;
  data?: Hex;
  gasLimit?: bigint;
}): CCIPMessage {
  const { receiver, token, amount, feeToken, data = '0x', gasLimit = 200_000n } = params;
  
  // Encode receiver address as bytes
  const receiverBytes = encodeAbiParameters(
    parseAbiParameters('address'),
    [receiver]
  );
  
  return {
    receiver: receiverBytes as Address,
    data,
    tokenAmounts: amount > 0n ? [{ token, amount }] : [],
    feeToken,
    extraArgs: buildExtraArgs(gasLimit),
  };
}

/**
 * Estimate CCIP transfer fee
 */
export async function estimateCCIPFee(params: {
  sourceChainId: number;
  destinationChainId: number;
  token: Address;
  amount: string;
  recipient: Address;
  useLINK?: boolean;
}): Promise<CCIPFeeEstimate> {
  const log = logger.child({ function: 'estimateCCIPFee' });
  
  const { sourceChainId, destinationChainId, token, amount, recipient, useLINK = true } = params;
  
  try {
    const sourceConfig = getChainConfig(sourceChainId);
    const destChainSelector = getDestinationChainSelector(destinationChainId);
    const publicClient = getPublicClient(sourceChainId);
    
    // Determine fee token (LINK or native ETH)
    const feeToken = useLINK ? sourceConfig.linkToken : ('0x0000000000000000000000000000000000000000' as Address);
    
    // Build message
    const amountBigInt = BigInt(amount);
    const message = buildCCIPMessage({
      receiver: recipient,
      token,
      amount: amountBigInt,
      feeToken,
    });
    
    // Call getFee on router
    const fee = await publicClient.readContract({
      address: sourceConfig.router,
      abi: CCIP_ROUTER_ABI,
      functionName: 'getFee',
      args: [destChainSelector, message],
    });
    
    log.info({ 
      fee: fee.toString(), 
      feeToken: useLINK ? 'LINK' : 'ETH',
      destinationChainId 
    }, 'CCIP fee estimated');
    
    return {
      feeInLINK: useLINK ? formatUnits(fee, 18) : '0',
      feeInNative: useLINK ? '0' : formatUnits(fee, 18),
      feeToken,
      destinationChainSelector: destChainSelector.toString(),
    };
  } catch (error) {
    log.error({ error, params }, 'Failed to estimate CCIP fee');
    throw error;
  }
}

/**
 * Check if a chain is supported by CCIP
 */
export async function isChainSupported(sourceChainId: number, destinationChainId: number): Promise<boolean> {
  const log = logger.child({ function: 'isChainSupported' });
  
  try {
    const sourceConfig = getChainConfig(sourceChainId);
    const destChainSelector = getDestinationChainSelector(destinationChainId);
    const publicClient = getPublicClient(sourceChainId);
    
    const isSupported = await publicClient.readContract({
      address: sourceConfig.router,
      abi: CCIP_ROUTER_ABI,
      functionName: 'isChainSupported',
      args: [destChainSelector],
    });
    
    log.info({ sourceChainId, destinationChainId, isSupported }, 'Chain support checked');
    return isSupported;
  } catch (error) {
    log.error({ error }, 'Failed to check chain support');
    return false;
  }
}

/**
 * Initiate CCIP transfer
 * This builds and returns the transaction data for the user to sign
 */
export async function buildCCIPTransferTx(params: CCIPTransferParams): Promise<{
  to: Address;
  data: Hex;
  value: bigint;
  feeEstimate: CCIPFeeEstimate;
}> {
  const log = logger.child({ function: 'buildCCIPTransferTx' });
  
  const { sourceChainId, destinationChainId, token, amount, recipient, data } = params;
  
  try {
    const sourceConfig = getChainConfig(sourceChainId);
    const destChainSelector = getDestinationChainSelector(destinationChainId);
    
    // Estimate fee (using native ETH for simplicity)
    const feeEstimate = await estimateCCIPFee({
      sourceChainId,
      destinationChainId,
      token,
      amount,
      recipient,
      useLINK: false, // Use native ETH to pay fees
    });
    
    // Build message
    const amountBigInt = BigInt(amount);
    const message = buildCCIPMessage({
      receiver: recipient,
      token,
      amount: amountBigInt,
      feeToken: '0x0000000000000000000000000000000000000000' as Address, // Native ETH
      data: data || '0x',
    });
    
    // Encode ccipSend call
    const txData = encodeFunctionData({
      abi: CCIP_ROUTER_ABI,
      functionName: 'ccipSend',
      args: [destChainSelector, message],
    });
    
    // Add 10% buffer to fee
    const feeWithBuffer = parseUnits(feeEstimate.feeInNative, 18) * 110n / 100n;
    
    log.info({ 
      intentId: params.intentId,
      sourceChainId,
      destinationChainId,
      amount,
      recipient,
      fee: feeEstimate.feeInNative,
    }, 'CCIP transfer tx built');
    
    return {
      to: sourceConfig.router,
      data: txData,
      value: feeWithBuffer,
      feeEstimate,
    };
  } catch (error) {
    log.error({ error, params }, 'Failed to build CCIP transfer tx');
    throw error;
  }
}

/**
 * Build token approval transaction for CCIP router
 */
export async function buildTokenApprovalTx(params: {
  chainId: number;
  token: Address;
  amount: string;
}): Promise<{
  to: Address;
  data: Hex;
}> {
  const { chainId, token, amount } = params;
  const config = getChainConfig(chainId);
  
  const txData = encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [config.router, BigInt(amount)],
  });
  
  return {
    to: token,
    data: txData,
  };
}

/**
 * Check token allowance for CCIP router
 */
export async function checkTokenAllowance(params: {
  chainId: number;
  token: Address;
  owner: Address;
}): Promise<bigint> {
  const { chainId, token, owner } = params;
  const config = getChainConfig(chainId);
  const publicClient = getPublicClient(chainId);
  
  const allowance = await publicClient.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [owner, config.router],
  });
  
  return allowance;
}

/**
 * Check token balance
 */
export async function checkTokenBalance(params: {
  chainId: number;
  token: Address;
  account: Address;
}): Promise<bigint> {
  const { chainId, token, account } = params;
  const publicClient = getPublicClient(chainId);
  
  const balance = await publicClient.readContract({
    address: token,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [account],
  });
  
  return balance;
}

// ============================================================================
// CCIP Message Tracking
// ============================================================================

/**
 * Store CCIP message in database for tracking
 */
export async function storeCCIPMessage(params: {
  messageId: Hex;
  intentId: string;
  txHash: Hex;
  sourceChainId: number;
  destinationChainId: number;
  token: Address;
  amount: string;
  sender: Address;
  recipient: Address;
}): Promise<void> {
  const log = logger.child({ function: 'storeCCIPMessage' });
  
  try {
    // Store in Redis for quick access (TTL: 1 hour)
    const cacheKey = `ccip:message:${params.messageId}`;
    await redis.set(cacheKey, {
      ...params,
      status: CCIPMessageStatus.PENDING,
      createdAt: Date.now(),
    }, 3600);
    
    // Also store intent-to-message mapping
    const intentKey = `ccip:intent:${params.intentId}`;
    await redis.set(intentKey, params.messageId, 3600);
    
    log.info({ messageId: params.messageId, intentId: params.intentId }, 'CCIP message stored');
  } catch (error) {
    log.error({ error, params }, 'Failed to store CCIP message');
    throw error;
  }
}

/**
 * Get CCIP message by ID
 */
export async function getCCIPMessage(messageId: Hex): Promise<{
  messageId: Hex;
  intentId: string;
  txHash: Hex;
  sourceChainId: number;
  destinationChainId: number;
  status: CCIPMessageStatus;
  createdAt: number;
} | null> {
  const cacheKey = `ccip:message:${messageId}`;
  return redis.get(cacheKey);
}

/**
 * Get CCIP message by intent ID
 */
export async function getCCIPMessageByIntent(intentId: string): Promise<Hex | null> {
  const intentKey = `ccip:intent:${intentId}`;
  return redis.get<Hex>(intentKey);
}

/**
 * Update CCIP message status
 */
export async function updateCCIPMessageStatus(messageId: Hex, status: CCIPMessageStatus): Promise<void> {
  const log = logger.child({ function: 'updateCCIPMessageStatus' });
  
  try {
    const cacheKey = `ccip:message:${messageId}`;
    const message = await redis.get<Record<string, unknown>>(cacheKey);
    
    if (message) {
      message.status = status;
      message.updatedAt = Date.now();
      await redis.set(cacheKey, message, 3600);
      
      log.info({ messageId, status }, 'CCIP message status updated');
    }
  } catch (error) {
    log.error({ error, messageId, status }, 'Failed to update CCIP message status');
  }
}

// ============================================================================
// CCIP Explorer Integration
// ============================================================================

const CCIP_EXPLORER_API = 'https://ccip.chain.link/api/v1';

interface CCIPExplorerMessage {
  messageId: string;
  state: string;
  sourceChainSelector: string;
  destChainSelector: string;
  sourceTransactionHash: string;
  destTransactionHash?: string;
  timestamp: number;
}

/**
 * Get message status from CCIP Explorer
 * @param messageId - The CCIP message ID
 */
export async function getMessageStatusFromExplorer(messageId: Hex): Promise<CCIPExplorerMessage | null> {
  const log = logger.child({ function: 'getMessageStatusFromExplorer' });
  
  try {
    // CCIP Explorer API endpoint for message lookup
    const url = `${CCIP_EXPLORER_API}/messages/${messageId}`;
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        log.debug({ messageId }, 'Message not found in explorer (may still be processing)');
        return null;
      }
      throw new Error(`Explorer API error: ${response.status}`);
    }
    
    const data = await response.json() as CCIPExplorerMessage;
    log.info({ messageId, state: data.state }, 'Message status retrieved from explorer');
    
    return data;
  } catch (error) {
    log.error({ error, messageId }, 'Failed to get message status from explorer');
    return null;
  }
}

/**
 * Poll message status until completion or timeout
 */
export async function pollMessageStatus(params: {
  messageId: Hex;
  intentId: string;
  maxAttempts?: number;
  intervalMs?: number;
}): Promise<CCIPMessageStatus> {
  const log = logger.child({ function: 'pollMessageStatus' });
  const { messageId, intentId, maxAttempts = 60, intervalMs = 15000 } = params;
  
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    attempts++;
    
    try {
      const status = await getMessageStatusFromExplorer(messageId);
      
      if (status) {
        let internalStatus: CCIPMessageStatus;
        
        switch (status.state.toUpperCase()) {
          case 'SUCCESS':
            internalStatus = CCIPMessageStatus.SUCCESS;
            break;
          case 'FAILED':
            internalStatus = CCIPMessageStatus.FAILED;
            break;
          case 'IN_FLIGHT':
          case 'PENDING':
            internalStatus = CCIPMessageStatus.IN_FLIGHT;
            break;
          default:
            internalStatus = CCIPMessageStatus.PENDING;
        }
        
        // Update stored status
        await updateCCIPMessageStatus(messageId, internalStatus);
        
        // If final status, return
        if (internalStatus === CCIPMessageStatus.SUCCESS || internalStatus === CCIPMessageStatus.FAILED) {
          log.info({ messageId, intentId, status: internalStatus, attempts }, 'Message reached final status');
          return internalStatus;
        }
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, intervalMs));
    } catch (error) {
      log.error({ error, messageId, attempts }, 'Error polling message status');
    }
  }
  
  // Timeout reached
  log.warn({ messageId, intentId, maxAttempts }, 'Message polling timed out');
  await updateCCIPMessageStatus(messageId, CCIPMessageStatus.TIMEOUT);
  return CCIPMessageStatus.TIMEOUT;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get CCIP transfer URL for explorer
 */
export function getCCIPExplorerUrl(messageId: Hex): string {
  return `https://ccip.chain.link/msg/${messageId}`;
}

/**
 * Validate CCIP transfer parameters
 */
export function validateCCIPTransfer(params: CCIPTransferParams): { valid: boolean; error?: string } {
  const { sourceChainId, destinationChainId, token, amount, recipient } = params;
  
  // Check chain support
  const supportedChains = [421614, 84532];
  if (!supportedChains.includes(sourceChainId)) {
    return { valid: false, error: `Source chain ${sourceChainId} not supported` };
  }
  if (!supportedChains.includes(destinationChainId)) {
    return { valid: false, error: `Destination chain ${destinationChainId} not supported` };
  }
  if (sourceChainId === destinationChainId) {
    return { valid: false, error: 'Source and destination chains must be different' };
  }
  
  // Check token format
  if (!/^0x[a-fA-F0-9]{40}$/.test(token)) {
    return { valid: false, error: 'Invalid token address format' };
  }
  
  // Check recipient format
  if (!/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
    return { valid: false, error: 'Invalid recipient address format' };
  }
  
  // Check amount
  try {
    const amountBigInt = BigInt(amount);
    if (amountBigInt <= 0n) {
      return { valid: false, error: 'Amount must be greater than 0' };
    }
  } catch {
    return { valid: false, error: 'Invalid amount format' };
  }
  
  return { valid: true };
}

export default {
  CCIP_CONFIG,
  CCIP_SUPPORTED_TOKENS,
  CCIPMessageStatus,
  estimateCCIPFee,
  isChainSupported,
  buildCCIPTransferTx,
  buildTokenApprovalTx,
  checkTokenAllowance,
  checkTokenBalance,
  storeCCIPMessage,
  getCCIPMessage,
  getCCIPMessageByIntent,
  updateCCIPMessageStatus,
  getMessageStatusFromExplorer,
  pollMessageStatus,
  getCCIPExplorerUrl,
  validateCCIPTransfer,
};
