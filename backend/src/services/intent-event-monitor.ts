/**
 * Intent Event Monitor Service
 * Listens to contract events and updates intent status in real-time
 * Broadcasts updates via WebSocket to connected clients
 */

import {
  createPublicClient,
  http,
  parseAbiItem,
  Log,
  Address,
  Hex,
  decodeEventLog,
  formatUnits,
} from 'viem';
import { arbitrumSepolia, baseSepolia } from 'viem/chains';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../db/prisma.js';
import { redis } from '../db/redis.js';
import {
  wsManager,
  calculateProgress,
  getStepMessage,
  estimateTimeRemaining,
  IntentStep,
} from './websocket-manager.js';

// ============================================================================
// Configuration
// ============================================================================

// Contract addresses from environment
const CONTRACTS = {
  421614: {
    // Arbitrum Sepolia
    intentValidator: (process.env.INTENT_VALIDATOR_ADDRESS || '0x6C28363C60Ff3bcc509eeA37Cce473B919947b9C') as Address,
    routeExecutor: (process.env.ROUTE_EXECUTOR_ADDRESS || '0x7c13D90950F542B297179e09f3A36EaA917A40C1') as Address,
    settlementVerifier: (process.env.SETTLEMENT_VERIFIER_ADDRESS || '0x20E8307cFe2C5CF7E434b5Cb2C92494fa4BAF01C') as Address,
  },
  84532: {
    // Base Sepolia - same contracts deployed on destination
    intentValidator: (process.env.BASE_INTENT_VALIDATOR_ADDRESS || '') as Address,
    routeExecutor: (process.env.BASE_ROUTE_EXECUTOR_ADDRESS || '') as Address,
    settlementVerifier: (process.env.BASE_SETTLEMENT_VERIFIER_ADDRESS || '') as Address,
  },
};

// RPC URLs
const RPC_URLS: Record<number, string> = {
  421614: process.env.ARBITRUM_SEPOLIA_RPC || 'https://sepolia-rollup.arbitrum.io/rpc',
  84532: process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
};

// CCIP Explorer API
const CCIP_EXPLORER_API = 'https://ccip.chain.link/api';

// Polling intervals
const BLOCK_POLLING_INTERVAL = 12000; // 12 seconds
const CCIP_POLLING_INTERVAL = 30000; // 30 seconds
const FALLBACK_POLLING_INTERVAL = 60000; // 1 minute

// ============================================================================
// Contract Event ABIs
// ============================================================================

const EVENT_ABIS = {
  // IntentValidator events
  IntentValidated: parseAbiItem(
    'event IntentValidated(address indexed user, address indexed token, uint256 amount, uint256 destinationChain, uint256 timestamp)'
  ),

  // RouteExecutor events
  SwapExecuted: parseAbiItem(
    'event SwapExecuted(uint256 indexed intentId, address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut, uint256 timestamp)'
  ),
  BridgeInitiated: parseAbiItem(
    'event BridgeInitiated(uint256 indexed intentId, address indexed user, uint256 destinationChain, bytes32 messageId, uint256 timestamp)'
  ),

  // SettlementVerifier events
  SettlementRegistered: parseAbiItem(
    'event SettlementRegistered(uint256 indexed intentId, bytes32 indexed messageId, uint256 timestamp)'
  ),
  SettlementVerified: parseAbiItem(
    'event SettlementVerified(uint256 indexed intentId, bytes32 indexed messageId, uint256 timestamp)'
  ),
  SettlementFailed: parseAbiItem(
    'event SettlementFailed(uint256 indexed intentId, string reason, uint256 timestamp)'
  ),
  RefundIssued: parseAbiItem(
    'event RefundIssued(uint256 indexed intentId, address indexed user, uint256 amount, uint256 timestamp)'
  ),
};

// ============================================================================
// Types
// ============================================================================

interface IntentEvent {
  type: 'validated' | 'swap_executed' | 'bridge_initiated' | 'settlement_registered' | 'settlement_verified' | 'settlement_failed' | 'refund_issued';
  intentId?: string;
  contractIntentId?: number;
  txHash: Hex;
  blockNumber: bigint;
  chainId: number;
  timestamp: Date;
  data: Record<string, unknown>;
}

interface CCIPMessageStatus {
  messageId: string;
  status: 'pending' | 'inflight' | 'success' | 'failed';
  sourceChainId: number;
  destChainId: number;
  sourceTransactionHash?: string;
  destTransactionHash?: string;
  error?: string;
}

interface PendingCCIPMessage {
  intentId: string;
  messageId: string;
  sourceChainId: number;
  destChainId: number;
  registeredAt: number;
  lastChecked: number;
}

// ============================================================================
// Event Monitor Class
// ============================================================================

class IntentEventMonitor {
  private clients: Map<number, ReturnType<typeof createPublicClient>> = new Map();
  private watchIntervals: Map<string, NodeJS.Timeout> = new Map();
  private pendingCCIPMessages: Map<string, PendingCCIPMessage> = new Map();
  private lastProcessedBlock: Map<number, bigint> = new Map();
  private isRunning = false;
  private log = logger.child({ service: 'IntentEventMonitor' });

  constructor() {
    // Initialize public clients for each chain
    this.initializeClients();
  }

  private initializeClients(): void {
    // Arbitrum Sepolia
    this.clients.set(
      421614,
      createPublicClient({
        chain: arbitrumSepolia,
        transport: http(RPC_URLS[421614]),
      })
    );

    // Base Sepolia
    this.clients.set(
      84532,
      createPublicClient({
        chain: baseSepolia,
        transport: http(RPC_URLS[84532]),
      })
    );
  }

  // ==========================================================================
  // Start/Stop Monitoring
  // ==========================================================================

  async start(): Promise<void> {
    if (this.isRunning) {
      this.log.warn('Event monitor already running');
      return;
    }

    this.isRunning = true;
    this.log.info('Starting intent event monitor');

    // Start monitoring each chain
    for (const chainId of [421614, 84532]) {
      await this.startChainMonitoring(chainId);
    }

    // Start CCIP message polling
    this.startCCIPPolling();

    // Start fallback intent polling
    this.startFallbackPolling();

    this.log.info('Intent event monitor started');
  }

  stop(): void {
    this.isRunning = false;

    // Clear all intervals
    this.watchIntervals.forEach((interval, key) => {
      clearInterval(interval);
      this.log.debug({ key }, 'Stopped watcher');
    });
    this.watchIntervals.clear();

    this.log.info('Intent event monitor stopped');
  }

  // ==========================================================================
  // Chain Event Monitoring
  // ==========================================================================

  private async startChainMonitoring(chainId: number): Promise<void> {
    const client = this.clients.get(chainId);
    if (!client) {
      this.log.warn({ chainId }, 'No client for chain');
      return;
    }

    const contracts = CONTRACTS[chainId as keyof typeof CONTRACTS];
    if (!contracts || !contracts.intentValidator) {
      this.log.warn({ chainId }, 'No contracts configured for chain');
      return;
    }

    // Get current block number
    const currentBlock = await client.getBlockNumber();
    this.lastProcessedBlock.set(chainId, currentBlock);

    // Start polling for events
    const interval = setInterval(async () => {
      await this.pollChainEvents(chainId);
    }, BLOCK_POLLING_INTERVAL);

    this.watchIntervals.set(`chain-${chainId}`, interval);
    this.log.info({ chainId, startBlock: currentBlock.toString() }, 'Started chain monitoring');
  }

  private async pollChainEvents(chainId: number): Promise<void> {
    const client = this.clients.get(chainId);
    const contracts = CONTRACTS[chainId as keyof typeof CONTRACTS];
    if (!client || !contracts) return;

    try {
      const fromBlock = this.lastProcessedBlock.get(chainId) || 0n;
      const toBlock = await client.getBlockNumber();

      if (toBlock <= fromBlock) return;

      this.log.debug({ chainId, fromBlock: fromBlock.toString(), toBlock: toBlock.toString() }, 'Polling blocks');

      // Fetch logs from all contracts
      const contractAddresses = Object.values(contracts).filter((addr) => addr && addr !== '');

      if (contractAddresses.length === 0) return;

      const logs = await client.getLogs({
        address: contractAddresses as Address[],
        fromBlock: fromBlock + 1n,
        toBlock,
      });

      // Process each log
      for (const log of logs) {
        await this.processLog(chainId, log);
      }

      this.lastProcessedBlock.set(chainId, toBlock);
    } catch (error) {
      this.log.error({ error, chainId }, 'Error polling chain events');
    }
  }

  private async processLog(chainId: number, log: Log): Promise<void> {
    try {
      const event = this.decodeLog(chainId, log);
      if (!event) return;

      this.log.info({ event: event.type, txHash: event.txHash, chainId }, 'Event detected');

      // Update database
      await this.updateIntentFromEvent(event);

      // Broadcast via WebSocket
      await this.broadcastEventUpdate(event);
    } catch (error) {
      this.log.error({ error, logAddress: log.address, txHash: log.transactionHash }, 'Error processing log');
    }
  }

  private decodeLog(chainId: number, log: Log): IntentEvent | null {
    const contracts = CONTRACTS[chainId as keyof typeof CONTRACTS];
    const topics = log.topics;

    if (!topics || topics.length === 0) return null;

    // Try to decode each event type
    try {
      // IntentValidated
      if (log.address.toLowerCase() === contracts.intentValidator?.toLowerCase()) {
        const decoded = decodeEventLog({
          abi: [EVENT_ABIS.IntentValidated],
          data: log.data,
          topics: log.topics,
        });

        return {
          type: 'validated',
          txHash: log.transactionHash!,
          blockNumber: log.blockNumber!,
          chainId,
          timestamp: new Date(),
          data: {
            user: decoded.args.user,
            token: decoded.args.token,
            amount: decoded.args.amount?.toString(),
            destinationChain: decoded.args.destinationChain?.toString(),
          },
        };
      }

      // RouteExecutor events
      if (log.address.toLowerCase() === contracts.routeExecutor?.toLowerCase()) {
        // Try SwapExecuted
        try {
          const decoded = decodeEventLog({
            abi: [EVENT_ABIS.SwapExecuted],
            data: log.data,
            topics: log.topics,
          });

          return {
            type: 'swap_executed',
            contractIntentId: Number(decoded.args.intentId),
            txHash: log.transactionHash!,
            blockNumber: log.blockNumber!,
            chainId,
            timestamp: new Date(),
            data: {
              user: decoded.args.user,
              tokenIn: decoded.args.tokenIn,
              tokenOut: decoded.args.tokenOut,
              amountIn: decoded.args.amountIn?.toString(),
              amountOut: decoded.args.amountOut?.toString(),
            },
          };
        } catch {}

        // Try BridgeInitiated
        try {
          const decoded = decodeEventLog({
            abi: [EVENT_ABIS.BridgeInitiated],
            data: log.data,
            topics: log.topics,
          });

          return {
            type: 'bridge_initiated',
            contractIntentId: Number(decoded.args.intentId),
            txHash: log.transactionHash!,
            blockNumber: log.blockNumber!,
            chainId,
            timestamp: new Date(),
            data: {
              user: decoded.args.user,
              destinationChain: decoded.args.destinationChain?.toString(),
              messageId: decoded.args.messageId,
            },
          };
        } catch {}
      }

      // SettlementVerifier events
      if (log.address.toLowerCase() === contracts.settlementVerifier?.toLowerCase()) {
        // Try SettlementVerified
        try {
          const decoded = decodeEventLog({
            abi: [EVENT_ABIS.SettlementVerified],
            data: log.data,
            topics: log.topics,
          });

          return {
            type: 'settlement_verified',
            contractIntentId: Number(decoded.args.intentId),
            txHash: log.transactionHash!,
            blockNumber: log.blockNumber!,
            chainId,
            timestamp: new Date(),
            data: {
              messageId: decoded.args.messageId,
            },
          };
        } catch {}

        // Try SettlementFailed
        try {
          const decoded = decodeEventLog({
            abi: [EVENT_ABIS.SettlementFailed],
            data: log.data,
            topics: log.topics,
          });

          return {
            type: 'settlement_failed',
            contractIntentId: Number(decoded.args.intentId),
            txHash: log.transactionHash!,
            blockNumber: log.blockNumber!,
            chainId,
            timestamp: new Date(),
            data: {
              reason: decoded.args.reason,
            },
          };
        } catch {}
      }
    } catch (error) {
      // Not a recognized event
    }

    return null;
  }

  // ==========================================================================
  // Database Updates
  // ==========================================================================

  private async updateIntentFromEvent(event: IntentEvent): Promise<void> {
    try {
      // Find intent by contract ID or tx hash
      let intent;

      if (event.contractIntentId) {
        // Find by contract intent ID stored in metadata
        intent = await prisma.intent.findFirst({
          where: {
            OR: [
              { id: event.intentId },
              {
                parsedData: {
                  path: ['contractIntentId'],
                  equals: event.contractIntentId,
                },
              },
            ],
          },
        });
      }

      // Map event type to status
      const statusMap: Record<string, { status: string; step: IntentStep }> = {
        validated: { status: 'VALIDATED', step: 'validated' },
        swap_executed: { status: 'EXECUTING', step: 'swapped' },
        bridge_initiated: { status: 'BRIDGING', step: 'bridging' },
        settlement_verified: { status: 'COMPLETED', step: 'completed' },
        settlement_failed: { status: 'FAILED', step: 'failed' },
      };

      const statusInfo = statusMap[event.type];
      if (!statusInfo) return;

      if (intent) {
        // Update existing intent
        await prisma.intent.update({
          where: { id: intent.id },
          data: {
            status: statusInfo.status,
            updatedAt: new Date(),
          },
        });

        // Store event in cache for quick access
        await redis.set(
          `intent:${intent.id}:lastEvent`,
          {
            type: event.type,
            txHash: event.txHash,
            chainId: event.chainId,
            timestamp: event.timestamp.toISOString(),
            data: event.data,
          },
          3600 // 1 hour
        );

        this.log.info({ intentId: intent.id, status: statusInfo.status }, 'Intent updated from event');

        // Track CCIP message if bridge initiated
        if (event.type === 'bridge_initiated' && event.data.messageId) {
          this.trackCCIPMessage(intent.id, event.data.messageId as string, event.chainId);
        }
      } else {
        // Log event even if no matching intent found
        this.log.debug({ event }, 'Event received but no matching intent found');
      }
    } catch (error) {
      this.log.error({ error, event }, 'Error updating intent from event');
    }
  }

  // ==========================================================================
  // WebSocket Broadcasting
  // ==========================================================================

  private async broadcastEventUpdate(event: IntentEvent): Promise<void> {
    // Find intent ID
    let intentId = event.intentId;

    if (!intentId && event.contractIntentId) {
      const intent = await prisma.intent.findFirst({
        where: {
          parsedData: {
            path: ['contractIntentId'],
            equals: event.contractIntentId,
          },
        },
        select: { id: true },
      });
      intentId = intent?.id;
    }

    if (!intentId) return;

    // Map event type to step
    const stepMap: Record<string, IntentStep> = {
      validated: 'validated',
      swap_executed: 'swapped',
      bridge_initiated: 'bridging',
      settlement_verified: 'completed',
      settlement_failed: 'failed',
    };

    const step = stepMap[event.type] || 'pending';
    const progress = calculateProgress(step);

    // Broadcast status update
    wsManager.broadcastIntentStatus({
      intentId,
      status: event.type.toUpperCase(),
      step,
      progress,
      message: getStepMessage(step),
      txHash: event.txHash,
      chainId: event.chainId,
      blockNumber: Number(event.blockNumber),
      estimatedTimeRemaining: estimateTimeRemaining(step),
      metadata: event.data,
    });

    // Also broadcast specific event
    const eventTypeMap: Record<string, string> = {
      validated: 'intent:validated',
      swap_executed: 'intent:swap_completed',
      bridge_initiated: 'intent:bridge_initiated',
      settlement_verified: 'intent:settlement_completed',
      settlement_failed: 'intent:failed',
    };

    const wsEventType = eventTypeMap[event.type];
    if (wsEventType) {
      wsManager.broadcastIntentEvent(intentId, wsEventType as any, {
        txHash: event.txHash,
        chainId: event.chainId,
        blockNumber: Number(event.blockNumber),
        ...event.data,
      });
    }
  }

  // ==========================================================================
  // CCIP Message Monitoring
  // ==========================================================================

  private trackCCIPMessage(intentId: string, messageId: string, sourceChainId: number): void {
    const destChainId = sourceChainId === 421614 ? 84532 : 421614;

    this.pendingCCIPMessages.set(messageId, {
      intentId,
      messageId,
      sourceChainId,
      destChainId,
      registeredAt: Date.now(),
      lastChecked: 0,
    });

    this.log.info({ intentId, messageId }, 'Tracking CCIP message');
  }

  private startCCIPPolling(): void {
    const interval = setInterval(async () => {
      await this.pollCCIPMessages();
    }, CCIP_POLLING_INTERVAL);

    this.watchIntervals.set('ccip-polling', interval);
    this.log.info('Started CCIP message polling');
  }

  private async pollCCIPMessages(): Promise<void> {
    for (const [messageId, pending] of this.pendingCCIPMessages) {
      try {
        const status = await this.checkCCIPMessageStatus(messageId, pending.sourceChainId);

        pending.lastChecked = Date.now();

        if (status.status === 'success') {
          this.log.info({ messageId, status: status.status }, 'CCIP message delivered');

          // Update intent status
          const intent = await prisma.intent.findUnique({
            where: { id: pending.intentId },
          });

          if (intent) {
            await prisma.intent.update({
              where: { id: pending.intentId },
              data: { status: 'SETTLING' },
            });

            // Broadcast update
            wsManager.broadcastIntentStatus({
              intentId: pending.intentId,
              status: 'SETTLING',
              step: 'bridge_completed',
              progress: calculateProgress('bridge_completed'),
              message: 'Bridge transfer confirmed, settling on destination chain',
              txHash: status.destTransactionHash as Hex,
              chainId: pending.destChainId,
              estimatedTimeRemaining: estimateTimeRemaining('bridge_completed'),
            });
          }

          this.pendingCCIPMessages.delete(messageId);
        } else if (status.status === 'failed') {
          this.log.error({ messageId, error: status.error }, 'CCIP message failed');

          // Update intent as failed
          await prisma.intent.update({
            where: { id: pending.intentId },
            data: { status: 'FAILED' },
          });

          wsManager.broadcastIntentStatus({
            intentId: pending.intentId,
            status: 'FAILED',
            step: 'failed',
            progress: -1,
            message: `Bridge failed: ${status.error || 'Unknown error'}`,
            estimatedTimeRemaining: 0,
          });

          this.pendingCCIPMessages.delete(messageId);
        } else {
          // Still pending/inflight
          wsManager.broadcastIntentStatus({
            intentId: pending.intentId,
            status: 'BRIDGING',
            step: 'bridge_pending',
            progress: calculateProgress('bridge_pending'),
            message: `Bridge in progress (${status.status})`,
            estimatedTimeRemaining: estimateTimeRemaining('bridge_pending'),
          });
        }

        // Remove messages that are too old (> 1 hour)
        if (Date.now() - pending.registeredAt > 3600000) {
          this.log.warn({ messageId }, 'CCIP message timed out');
          this.pendingCCIPMessages.delete(messageId);
        }
      } catch (error) {
        this.log.error({ error, messageId }, 'Error checking CCIP message');
      }
    }
  }

  private async checkCCIPMessageStatus(
    messageId: string,
    sourceChainId: number
  ): Promise<CCIPMessageStatus> {
    try {
      // Try CCIP Explorer API
      const response = await fetch(
        `${CCIP_EXPLORER_API}/message/${messageId}`,
        {
          headers: { Accept: 'application/json' },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return {
          messageId,
          status: data.status || 'pending',
          sourceChainId,
          destChainId: data.destChainSelector ? Number(data.destChainSelector) : 0,
          sourceTransactionHash: data.sourceTxHash,
          destTransactionHash: data.destTxHash,
          error: data.error,
        };
      }

      // Fallback: Poll destination chain for message receipt
      return await this.pollDestinationChainForMessage(messageId, sourceChainId);
    } catch (error) {
      this.log.debug({ error, messageId }, 'CCIP Explorer API unavailable, using fallback');
      return await this.pollDestinationChainForMessage(messageId, sourceChainId);
    }
  }

  private async pollDestinationChainForMessage(
    messageId: string,
    sourceChainId: number
  ): Promise<CCIPMessageStatus> {
    const destChainId = sourceChainId === 421614 ? 84532 : 421614;

    // For now, return pending status
    // In production, query CCIP router contract on destination chain
    return {
      messageId,
      status: 'inflight',
      sourceChainId,
      destChainId,
    };
  }

  // ==========================================================================
  // Fallback Polling
  // ==========================================================================

  private startFallbackPolling(): void {
    const interval = setInterval(async () => {
      await this.pollPendingIntents();
    }, FALLBACK_POLLING_INTERVAL);

    this.watchIntervals.set('fallback-polling', interval);
    this.log.info('Started fallback polling');
  }

  private async pollPendingIntents(): Promise<void> {
    try {
      // Find intents that are stuck in pending/executing status
      const stuckIntents = await prisma.intent.findMany({
        where: {
          status: {
            in: ['PENDING', 'VALIDATING', 'VALIDATED', 'EXECUTING', 'BRIDGING', 'SETTLING'],
          },
          updatedAt: {
            lt: new Date(Date.now() - 5 * 60 * 1000), // Not updated in 5 minutes
          },
        },
        take: 10,
      });

      for (const intent of stuckIntents) {
        // Check if there are any WebSocket clients for this intent
        if (wsManager.hasActiveClients(intent.id)) {
          // Send a status ping to keep clients informed
          const step = this.statusToStep(intent.status);
          wsManager.broadcastIntentStatus({
            intentId: intent.id,
            status: intent.status,
            step,
            progress: calculateProgress(step),
            message: `${getStepMessage(step)} (checking status...)`,
            estimatedTimeRemaining: estimateTimeRemaining(step),
          });
        }
      }
    } catch (error) {
      this.log.error({ error }, 'Error in fallback polling');
    }
  }

  private statusToStep(status: string): IntentStep {
    const map: Record<string, IntentStep> = {
      PENDING: 'pending',
      VALIDATING: 'validating',
      VALIDATED: 'validated',
      ROUTING: 'routing',
      EXECUTING: 'swapping',
      BRIDGING: 'bridging',
      SETTLING: 'settling',
      COMPLETED: 'completed',
      FAILED: 'failed',
      CANCELLED: 'failed',
    };
    return map[status] || 'pending';
  }

  // ==========================================================================
  // Public Methods
  // ==========================================================================

  /**
   * Manually trigger event check for an intent
   */
  async checkIntentEvents(intentId: string): Promise<void> {
    const intent = await prisma.intent.findUnique({
      where: { id: intentId },
    });

    if (!intent) {
      this.log.warn({ intentId }, 'Intent not found');
      return;
    }

    // Broadcast current status
    const step = this.statusToStep(intent.status);
    wsManager.broadcastIntentStatus({
      intentId,
      status: intent.status,
      step,
      progress: calculateProgress(step),
      message: getStepMessage(step),
      estimatedTimeRemaining: estimateTimeRemaining(step),
    });
  }

  /**
   * Get monitoring statistics
   */
  getStats(): {
    isRunning: boolean;
    chainWatchers: number;
    pendingCCIPMessages: number;
    lastProcessedBlocks: Record<number, string>;
  } {
    const lastProcessedBlocks: Record<number, string> = {};
    this.lastProcessedBlock.forEach((block, chainId) => {
      lastProcessedBlocks[chainId] = block.toString();
    });

    return {
      isRunning: this.isRunning,
      chainWatchers: this.watchIntervals.size,
      pendingCCIPMessages: this.pendingCCIPMessages.size,
      lastProcessedBlocks,
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const intentEventMonitor = new IntentEventMonitor();

export default intentEventMonitor;
