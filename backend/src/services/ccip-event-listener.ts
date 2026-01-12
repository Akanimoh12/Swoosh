/**
 * CCIP Event Listener Service
 * Monitors blockchain events for CCIP message tracking
 */

import { createPublicClient, http, parseAbiItem, Hex, Address, Log } from 'viem';
import { arbitrumSepolia, baseSepolia } from 'viem/chains';
import { logger } from '../utils/logger.js';
import { 
  CCIP_CONFIG, 
  CCIPMessageStatus, 
  updateCCIPMessageStatus,
  getCCIPMessage,
  storeCCIPMessage,
} from './ccip-manager.js';
import { prisma } from '../db/prisma.js';

// ============================================================================
// Event ABIs
// ============================================================================

// CCIP Router CCIPSendRequested event
const CCIP_SEND_REQUESTED_EVENT = parseAbiItem(
  'event CCIPSendRequested(bytes32 indexed messageId, (uint64 sourceChainSelector, address sender, address receiver, uint64 sequenceNumber, uint256 gasLimit, bool strict, uint64 nonce, address feeToken, uint256 feeTokenAmount, bytes data, (address token, uint256 amount)[] tokenAmounts, bytes[] sourceTokenData, bytes32 messageId) message)'
);

// Simplified event for easier parsing
const MESSAGE_SENT_EVENT = parseAbiItem(
  'event MessageSent(bytes32 indexed messageId, uint64 indexed destinationChainSelector, address sender, address receiver)'
);

// OnRamp event (actual CCIP event)
const CCIP_MESSAGE_SENT_EVENT = parseAbiItem(
  'event CCIPMessageSent(bytes32 indexed messageId, uint64 sourceChainSelector, uint64 destChainSelector, uint256 sequenceNumber)'
);

// ============================================================================
// Client Setup
// ============================================================================

const clients = {
  arbitrumSepolia: createPublicClient({
    chain: arbitrumSepolia,
    transport: http(CCIP_CONFIG.arbitrumSepolia.rpcUrl),
  }),
  baseSepolia: createPublicClient({
    chain: baseSepolia,
    transport: http(CCIP_CONFIG.baseSepolia.rpcUrl),
  }),
};

// ============================================================================
// Event Watching
// ============================================================================

interface WatcherState {
  isRunning: boolean;
  unwatch: (() => void) | null;
}

const watcherState: Record<string, WatcherState> = {
  arbitrumSepolia: { isRunning: false, unwatch: null },
  baseSepolia: { isRunning: false, unwatch: null },
};

/**
 * Start watching for CCIP events on a specific chain
 */
export function startCCIPEventWatcher(chainKey: 'arbitrumSepolia' | 'baseSepolia'): void {
  const log = logger.child({ function: 'startCCIPEventWatcher', chain: chainKey });
  
  if (watcherState[chainKey].isRunning) {
    log.warn('Watcher already running');
    return;
  }
  
  const client = clients[chainKey];
  const config = CCIP_CONFIG[chainKey];
  
  log.info({ router: config.router }, 'Starting CCIP event watcher');
  
  // Watch for logs from the CCIP router
  // Note: The actual event structure may vary, this is a simplified version
  const unwatch = client.watchContractEvent({
    address: config.router,
    abi: [
      {
        type: 'event',
        name: 'CCIPSendRequested',
        inputs: [
          { name: 'messageId', type: 'bytes32', indexed: true },
        ],
      },
    ],
    eventName: 'CCIPSendRequested',
    onLogs: async (logs) => {
      for (const eventLog of logs) {
        await handleCCIPSendEvent(chainKey, eventLog);
      }
    },
    onError: (error) => {
      log.error({ error }, 'Event watcher error');
    },
  });
  
  watcherState[chainKey] = { isRunning: true, unwatch };
  log.info('CCIP event watcher started');
}

/**
 * Stop watching for CCIP events on a specific chain
 */
export function stopCCIPEventWatcher(chainKey: 'arbitrumSepolia' | 'baseSepolia'): void {
  const log = logger.child({ function: 'stopCCIPEventWatcher', chain: chainKey });
  
  const state = watcherState[chainKey];
  if (state.unwatch) {
    state.unwatch();
    watcherState[chainKey] = { isRunning: false, unwatch: null };
    log.info('CCIP event watcher stopped');
  }
}

/**
 * Handle CCIP Send event
 */
async function handleCCIPSendEvent(chainKey: string, eventLog: Log): Promise<void> {
  const log = logger.child({ function: 'handleCCIPSendEvent' });
  
  try {
    // Extract messageId from topics
    const messageId = eventLog.topics[1] as Hex;
    const txHash = eventLog.transactionHash;
    
    log.info({ messageId, txHash, chain: chainKey }, 'CCIP Send event detected');
    
    // Check if we're tracking this message
    const message = await getCCIPMessage(messageId);
    if (message) {
      // Update status to IN_FLIGHT
      await updateCCIPMessageStatus(messageId, CCIPMessageStatus.IN_FLIGHT);
      log.info({ messageId }, 'Message status updated to IN_FLIGHT');
    }
  } catch (error) {
    log.error({ error, eventLog }, 'Error handling CCIP send event');
  }
}

// ============================================================================
// Transaction Receipt Parsing
// ============================================================================

/**
 * Get CCIP message ID from transaction receipt
 * Parses the CCIPSendRequested event from logs
 */
export async function getMessageIdFromTxReceipt(
  chainId: number,
  txHash: Hex
): Promise<Hex | null> {
  const log = logger.child({ function: 'getMessageIdFromTxReceipt' });
  
  try {
    const chainKey = chainId === 421614 ? 'arbitrumSepolia' : 'baseSepolia';
    const client = clients[chainKey];
    
    const receipt = await client.getTransactionReceipt({ hash: txHash });
    
    if (!receipt || receipt.status !== 'success') {
      log.warn({ txHash, status: receipt?.status }, 'Transaction failed or not found');
      return null;
    }
    
    // Look for CCIP event in logs
    // The messageId is typically in the first indexed topic after the event signature
    for (const eventLog of receipt.logs) {
      // Check if this is a CCIP-related event (by known topic signatures)
      // CCIPSendRequested topic0: varies by contract version
      if (eventLog.topics.length >= 2) {
        // The messageId is typically bytes32 in topics[1]
        const possibleMessageId = eventLog.topics[1];
        if (possibleMessageId && possibleMessageId.length === 66) {
          log.info({ messageId: possibleMessageId, txHash }, 'Found potential message ID');
          return possibleMessageId as Hex;
        }
      }
    }
    
    log.warn({ txHash }, 'No CCIP message ID found in transaction logs');
    return null;
  } catch (error) {
    log.error({ error, txHash }, 'Error getting message ID from receipt');
    return null;
  }
}

/**
 * Wait for transaction confirmation and extract message ID
 */
export async function waitForCCIPTxAndGetMessageId(
  chainId: number,
  txHash: Hex,
  confirmations: number = 1
): Promise<{ messageId: Hex | null; receipt: unknown }> {
  const log = logger.child({ function: 'waitForCCIPTxAndGetMessageId' });
  
  try {
    const chainKey = chainId === 421614 ? 'arbitrumSepolia' : 'baseSepolia';
    const client = clients[chainKey];
    
    log.info({ txHash, chainId, confirmations }, 'Waiting for transaction confirmation');
    
    // Wait for transaction receipt
    const receipt = await client.waitForTransactionReceipt({ 
      hash: txHash,
      confirmations,
    });
    
    if (receipt.status !== 'success') {
      log.error({ txHash, status: receipt.status }, 'Transaction failed');
      return { messageId: null, receipt };
    }
    
    // Extract message ID from logs
    const messageId = await getMessageIdFromTxReceipt(chainId, txHash);
    
    return { messageId, receipt };
  } catch (error) {
    log.error({ error, txHash }, 'Error waiting for CCIP transaction');
    throw error;
  }
}

// ============================================================================
// Database Persistence
// ============================================================================

/**
 * Save CCIP message to database
 */
export async function saveCCIPMessageToDb(params: {
  messageId: string;
  intentId: string;
  txHash: string;
  sourceChainId: number;
  destChainId: number;
  token: string;
  amount: string;
  sender: string;
  recipient: string;
  feeAmount?: string;
  feeToken?: string;
}): Promise<void> {
  const log = logger.child({ function: 'saveCCIPMessageToDb' });
  
  try {
    const sourceConfig = CCIP_CONFIG[params.sourceChainId === 421614 ? 'arbitrumSepolia' : 'baseSepolia'];
    const destConfig = CCIP_CONFIG[params.destChainId === 421614 ? 'arbitrumSepolia' : 'baseSepolia'];
    
    await prisma.cCIPMessage.create({
      data: {
        messageId: params.messageId,
        intentId: params.intentId,
        txHash: params.txHash,
        sourceChainId: params.sourceChainId,
        sourceChainSelector: sourceConfig.chainSelector,
        destChainId: params.destChainId,
        destChainSelector: destConfig.chainSelector,
        token: params.token,
        amount: params.amount,
        sender: params.sender,
        recipient: params.recipient,
        feeAmount: params.feeAmount,
        feeToken: params.feeToken,
        status: 'PENDING',
      },
    });
    
    log.info({ messageId: params.messageId, intentId: params.intentId }, 'CCIP message saved to database');
  } catch (error) {
    log.error({ error, params }, 'Failed to save CCIP message to database');
    throw error;
  }
}

/**
 * Update CCIP message status in database
 */
export async function updateCCIPMessageInDb(
  messageId: string,
  updates: {
    status?: 'PENDING' | 'IN_FLIGHT' | 'SUCCESS' | 'FAILED' | 'TIMEOUT';
    destTxHash?: string;
    errorMessage?: string;
    completedAt?: Date;
  }
): Promise<void> {
  const log = logger.child({ function: 'updateCCIPMessageInDb' });
  
  try {
    await prisma.cCIPMessage.update({
      where: { messageId },
      data: updates,
    });
    
    log.info({ messageId, updates }, 'CCIP message updated in database');
  } catch (error) {
    log.error({ error, messageId }, 'Failed to update CCIP message in database');
    throw error;
  }
}

/**
 * Get CCIP messages by intent ID
 */
export async function getCCIPMessagesByIntent(intentId: string) {
  return prisma.cCIPMessage.findMany({
    where: { intentId },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get pending CCIP messages older than specified minutes
 * For timeout handling
 */
export async function getPendingCCIPMessages(olderThanMinutes: number = 15) {
  const cutoffTime = new Date(Date.now() - olderThanMinutes * 60 * 1000);
  
  return prisma.cCIPMessage.findMany({
    where: {
      status: { in: ['PENDING', 'IN_FLIGHT'] },
      createdAt: { lt: cutoffTime },
    },
  });
}

// ============================================================================
// Lifecycle Management
// ============================================================================

/**
 * Start all CCIP event watchers
 */
export function startAllWatchers(): void {
  const log = logger.child({ function: 'startAllWatchers' });
  log.info('Starting all CCIP event watchers');
  
  startCCIPEventWatcher('arbitrumSepolia');
  startCCIPEventWatcher('baseSepolia');
}

/**
 * Stop all CCIP event watchers
 */
export function stopAllWatchers(): void {
  const log = logger.child({ function: 'stopAllWatchers' });
  log.info('Stopping all CCIP event watchers');
  
  stopCCIPEventWatcher('arbitrumSepolia');
  stopCCIPEventWatcher('baseSepolia');
}

export default {
  startCCIPEventWatcher,
  stopCCIPEventWatcher,
  startAllWatchers,
  stopAllWatchers,
  getMessageIdFromTxReceipt,
  waitForCCIPTxAndGetMessageId,
  saveCCIPMessageToDb,
  updateCCIPMessageInDb,
  getCCIPMessagesByIntent,
  getPendingCCIPMessages,
};
