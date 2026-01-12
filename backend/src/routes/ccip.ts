/**
 * CCIP API Routes
 * Handles CCIP cross-chain transfer operations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { Address, Hex } from 'viem';
import { logger } from '../utils/logger.js';
import { ApiResponse } from '../types/index.js';
import {
  estimateCCIPFee,
  isChainSupported,
  buildCCIPTransferTx,
  buildTokenApprovalTx,
  checkTokenAllowance,
  checkTokenBalance,
  validateCCIPTransfer,
  getCCIPExplorerUrl,
  pollMessageStatus,
  storeCCIPMessage,
  getCCIPMessage,
  getCCIPMessageByIntent,
  CCIPMessageStatus,
  CCIP_CONFIG,
  CCIP_SUPPORTED_TOKENS,
} from '../services/ccip-manager.js';
import {
  saveCCIPMessageToDb,
  updateCCIPMessageInDb,
  getCCIPMessagesByIntent,
  waitForCCIPTxAndGetMessageId,
} from '../services/ccip-event-listener.js';

// ============================================================================
// Request Schemas
// ============================================================================

const EstimateFeeSchema = z.object({
  sourceChainId: z.number().int().positive(),
  destinationChainId: z.number().int().positive(),
  token: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string().min(1),
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  useLINK: z.boolean().optional().default(false),
});

const BuildTransferTxSchema = z.object({
  intentId: z.string().min(1),
  sourceChainId: z.number().int().positive(),
  destinationChainId: z.number().int().positive(),
  token: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string().min(1),
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  data: z.string().optional(),
});

const CheckAllowanceSchema = z.object({
  chainId: z.number().int().positive(),
  token: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  owner: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const BuildApprovalSchema = z.object({
  chainId: z.number().int().positive(),
  token: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string().min(1),
});

const RecordTransferSchema = z.object({
  messageId: z.string().min(1),
  intentId: z.string().min(1),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  sourceChainId: z.number().int().positive(),
  destinationChainId: z.number().int().positive(),
  token: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string().min(1),
  sender: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  recipient: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  feeAmount: z.string().optional(),
  feeToken: z.string().optional(),
});

const WebhookSchema = z.object({
  messageId: z.string().min(1),
  status: z.enum(['SUCCESS', 'FAILED']),
  destTxHash: z.string().optional(),
  errorMessage: z.string().optional(),
});

// ============================================================================
// Routes
// ============================================================================

export async function ccipRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/ccip/config
   * Get CCIP configuration (router addresses, supported chains, tokens)
   */
  fastify.get('/config', async (request: FastifyRequest, reply: FastifyReply) => {
    const log = logger.child({ route: '/api/ccip/config', requestId: request.id });
    
    try {
      log.info('Fetching CCIP configuration');
      
      return reply.send({
        success: true,
        data: {
          chains: {
            arbitrumSepolia: {
              chainId: CCIP_CONFIG.arbitrumSepolia.chainId,
              chainSelector: CCIP_CONFIG.arbitrumSepolia.chainSelector,
              router: CCIP_CONFIG.arbitrumSepolia.router,
              linkToken: CCIP_CONFIG.arbitrumSepolia.linkToken,
              explorerUrl: CCIP_CONFIG.arbitrumSepolia.explorerUrl,
            },
            baseSepolia: {
              chainId: CCIP_CONFIG.baseSepolia.chainId,
              chainSelector: CCIP_CONFIG.baseSepolia.chainSelector,
              router: CCIP_CONFIG.baseSepolia.router,
              linkToken: CCIP_CONFIG.baseSepolia.linkToken,
              explorerUrl: CCIP_CONFIG.baseSepolia.explorerUrl,
            },
          },
          supportedTokens: CCIP_SUPPORTED_TOKENS,
          ccipExplorerUrl: 'https://ccip.chain.link',
        },
        requestId: request.id,
      } as ApiResponse);
    } catch (error) {
      log.error({ error }, 'Failed to fetch CCIP config');
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch CCIP configuration',
        requestId: request.id,
      } as ApiResponse);
    }
  });

  /**
   * GET /api/ccip/supported
   * Check if a chain-to-chain route is supported
   */
  fastify.get<{
    Querystring: { sourceChainId: string; destinationChainId: string };
  }>('/supported', async (request, reply) => {
    const log = logger.child({ route: '/api/ccip/supported', requestId: request.id });
    
    try {
      const sourceChainId = parseInt(request.query.sourceChainId);
      const destinationChainId = parseInt(request.query.destinationChainId);
      
      if (isNaN(sourceChainId) || isNaN(destinationChainId)) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid chain IDs',
          requestId: request.id,
        } as ApiResponse);
      }
      
      log.info({ sourceChainId, destinationChainId }, 'Checking chain support');
      
      const supported = await isChainSupported(sourceChainId, destinationChainId);
      
      return reply.send({
        success: true,
        data: { 
          supported,
          sourceChainId,
          destinationChainId,
        },
        requestId: request.id,
      } as ApiResponse);
    } catch (error) {
      log.error({ error }, 'Failed to check chain support');
      return reply.code(500).send({
        success: false,
        error: 'Failed to check chain support',
        requestId: request.id,
      } as ApiResponse);
    }
  });

  /**
   * POST /api/ccip/estimate-fee
   * Estimate CCIP transfer fee
   */
  fastify.post<{ Body: z.infer<typeof EstimateFeeSchema> }>(
    '/estimate-fee',
    async (request, reply) => {
      const log = logger.child({ route: '/api/ccip/estimate-fee', requestId: request.id });
      
      try {
        const validated = EstimateFeeSchema.safeParse(request.body);
        if (!validated.success) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid request: ' + validated.error.errors[0]?.message,
            requestId: request.id,
          } as ApiResponse);
        }
        
        const { sourceChainId, destinationChainId, token, amount, recipient, useLINK } = validated.data;
        
        log.info({ sourceChainId, destinationChainId, token, amount }, 'Estimating CCIP fee');
        
        const feeEstimate = await estimateCCIPFee({
          sourceChainId,
          destinationChainId,
          token: token as Address,
          amount,
          recipient: recipient as Address,
          useLINK,
        });
        
        return reply.send({
          success: true,
          data: feeEstimate,
          requestId: request.id,
        } as ApiResponse);
      } catch (error) {
        log.error({ error }, 'Failed to estimate CCIP fee');
        return reply.code(500).send({
          success: false,
          error: 'Failed to estimate fee. The token may not be supported for CCIP transfers.',
          requestId: request.id,
        } as ApiResponse);
      }
    }
  );

  /**
   * POST /api/ccip/build-transfer
   * Build CCIP transfer transaction data
   */
  fastify.post<{ Body: z.infer<typeof BuildTransferTxSchema> }>(
    '/build-transfer',
    async (request, reply) => {
      const log = logger.child({ route: '/api/ccip/build-transfer', requestId: request.id });
      
      try {
        const validated = BuildTransferTxSchema.safeParse(request.body);
        if (!validated.success) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid request: ' + validated.error.errors[0]?.message,
            requestId: request.id,
          } as ApiResponse);
        }
        
        const params = validated.data;
        
        // Validate transfer params
        const validation = validateCCIPTransfer({
          intentId: params.intentId,
          sourceChainId: params.sourceChainId,
          destinationChainId: params.destinationChainId,
          token: params.token as Address,
          amount: params.amount,
          recipient: params.recipient as Address,
        });
        
        if (!validation.valid) {
          return reply.code(400).send({
            success: false,
            error: validation.error,
            requestId: request.id,
          } as ApiResponse);
        }
        
        log.info({ intentId: params.intentId }, 'Building CCIP transfer transaction');
        
        const txData = await buildCCIPTransferTx({
          intentId: params.intentId,
          sourceChainId: params.sourceChainId,
          destinationChainId: params.destinationChainId,
          token: params.token as Address,
          amount: params.amount,
          recipient: params.recipient as Address,
          data: params.data as Hex | undefined,
        });
        
        return reply.send({
          success: true,
          data: {
            ...txData,
            value: txData.value.toString(), // Convert bigint to string for JSON
          },
          requestId: request.id,
        } as ApiResponse);
      } catch (error) {
        log.error({ error }, 'Failed to build CCIP transfer');
        return reply.code(500).send({
          success: false,
          error: 'Failed to build transfer transaction',
          requestId: request.id,
        } as ApiResponse);
      }
    }
  );

  /**
   * POST /api/ccip/build-approval
   * Build token approval transaction for CCIP router
   */
  fastify.post<{ Body: z.infer<typeof BuildApprovalSchema> }>(
    '/build-approval',
    async (request, reply) => {
      const log = logger.child({ route: '/api/ccip/build-approval', requestId: request.id });
      
      try {
        const validated = BuildApprovalSchema.safeParse(request.body);
        if (!validated.success) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid request: ' + validated.error.errors[0]?.message,
            requestId: request.id,
          } as ApiResponse);
        }
        
        const { chainId, token, amount } = validated.data;
        
        log.info({ chainId, token }, 'Building approval transaction');
        
        const txData = await buildTokenApprovalTx({
          chainId,
          token: token as Address,
          amount,
        });
        
        return reply.send({
          success: true,
          data: txData,
          requestId: request.id,
        } as ApiResponse);
      } catch (error) {
        log.error({ error }, 'Failed to build approval transaction');
        return reply.code(500).send({
          success: false,
          error: 'Failed to build approval transaction',
          requestId: request.id,
        } as ApiResponse);
      }
    }
  );

  /**
   * POST /api/ccip/check-allowance
   * Check token allowance for CCIP router
   */
  fastify.post<{ Body: z.infer<typeof CheckAllowanceSchema> }>(
    '/check-allowance',
    async (request, reply) => {
      const log = logger.child({ route: '/api/ccip/check-allowance', requestId: request.id });
      
      try {
        const validated = CheckAllowanceSchema.safeParse(request.body);
        if (!validated.success) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid request: ' + validated.error.errors[0]?.message,
            requestId: request.id,
          } as ApiResponse);
        }
        
        const { chainId, token, owner } = validated.data;
        
        log.info({ chainId, token, owner }, 'Checking allowance');
        
        const [allowance, balance] = await Promise.all([
          checkTokenAllowance({
            chainId,
            token: token as Address,
            owner: owner as Address,
          }),
          checkTokenBalance({
            chainId,
            token: token as Address,
            account: owner as Address,
          }),
        ]);
        
        return reply.send({
          success: true,
          data: {
            allowance: allowance.toString(),
            balance: balance.toString(),
          },
          requestId: request.id,
        } as ApiResponse);
      } catch (error) {
        log.error({ error }, 'Failed to check allowance');
        return reply.code(500).send({
          success: false,
          error: 'Failed to check allowance',
          requestId: request.id,
        } as ApiResponse);
      }
    }
  );

  /**
   * POST /api/ccip/record-transfer
   * Record a CCIP transfer after user sends transaction
   */
  fastify.post<{ Body: z.infer<typeof RecordTransferSchema> }>(
    '/record-transfer',
    async (request, reply) => {
      const log = logger.child({ route: '/api/ccip/record-transfer', requestId: request.id });
      
      try {
        const validated = RecordTransferSchema.safeParse(request.body);
        if (!validated.success) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid request: ' + validated.error.errors[0]?.message,
            requestId: request.id,
          } as ApiResponse);
        }
        
        const params = validated.data;
        
        log.info({ messageId: params.messageId, intentId: params.intentId }, 'Recording CCIP transfer');
        
        // Store in Redis for quick access
        await storeCCIPMessage({
          messageId: params.messageId as Hex,
          intentId: params.intentId,
          txHash: params.txHash as Hex,
          sourceChainId: params.sourceChainId,
          destinationChainId: params.destinationChainId,
          token: params.token as Address,
          amount: params.amount,
          sender: params.sender as Address,
          recipient: params.recipient as Address,
        });
        
        // Store in database for persistence
        await saveCCIPMessageToDb({
          messageId: params.messageId,
          intentId: params.intentId,
          txHash: params.txHash,
          sourceChainId: params.sourceChainId,
          destChainId: params.destinationChainId,
          token: params.token,
          amount: params.amount,
          sender: params.sender,
          recipient: params.recipient,
          feeAmount: params.feeAmount,
          feeToken: params.feeToken,
        });
        
        // Return explorer URL
        const explorerUrl = getCCIPExplorerUrl(params.messageId as Hex);
        
        return reply.send({
          success: true,
          data: {
            messageId: params.messageId,
            explorerUrl,
            status: CCIPMessageStatus.PENDING,
          },
          requestId: request.id,
        } as ApiResponse);
      } catch (error) {
        log.error({ error }, 'Failed to record CCIP transfer');
        return reply.code(500).send({
          success: false,
          error: 'Failed to record transfer',
          requestId: request.id,
        } as ApiResponse);
      }
    }
  );

  /**
   * GET /api/ccip/status/:messageId
   * Get CCIP message status
   */
  fastify.get<{ Params: { messageId: string } }>(
    '/status/:messageId',
    async (request, reply) => {
      const log = logger.child({ route: '/api/ccip/status/:messageId', requestId: request.id });
      
      try {
        const { messageId } = request.params;
        
        log.info({ messageId }, 'Fetching CCIP message status');
        
        // Try to get from cache first
        const cachedMessage = await getCCIPMessage(messageId as Hex);
        
        if (cachedMessage) {
          return reply.send({
            success: true,
            data: {
              ...cachedMessage,
              explorerUrl: getCCIPExplorerUrl(messageId as Hex),
            },
            requestId: request.id,
          } as ApiResponse);
        }
        
        // Not in cache, return not found
        return reply.code(404).send({
          success: false,
          error: 'Message not found',
          requestId: request.id,
        } as ApiResponse);
      } catch (error) {
        log.error({ error }, 'Failed to get message status');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get message status',
          requestId: request.id,
        } as ApiResponse);
      }
    }
  );

  /**
   * GET /api/ccip/messages/:intentId
   * Get all CCIP messages for an intent
   */
  fastify.get<{ Params: { intentId: string } }>(
    '/messages/:intentId',
    async (request, reply) => {
      const log = logger.child({ route: '/api/ccip/messages/:intentId', requestId: request.id });
      
      try {
        const { intentId } = request.params;
        
        log.info({ intentId }, 'Fetching CCIP messages for intent');
        
        const messages = await getCCIPMessagesByIntent(intentId);
        
        return reply.send({
          success: true,
          data: messages.map(msg => ({
            ...msg,
            explorerUrl: getCCIPExplorerUrl(msg.messageId as Hex),
          })),
          requestId: request.id,
        } as ApiResponse);
      } catch (error) {
        log.error({ error }, 'Failed to get messages for intent');
        return reply.code(500).send({
          success: false,
          error: 'Failed to get messages',
          requestId: request.id,
        } as ApiResponse);
      }
    }
  );

  /**
   * POST /api/ccip/webhook
   * Webhook endpoint for CCIP delivery confirmations
   * This can be called by external services or monitoring systems
   */
  fastify.post<{ Body: z.infer<typeof WebhookSchema> }>(
    '/webhook',
    async (request, reply) => {
      const log = logger.child({ route: '/api/ccip/webhook', requestId: request.id });
      
      try {
        const validated = WebhookSchema.safeParse(request.body);
        if (!validated.success) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid webhook payload',
            requestId: request.id,
          } as ApiResponse);
        }
        
        const { messageId, status, destTxHash, errorMessage } = validated.data;
        
        log.info({ messageId, status }, 'Received CCIP webhook');
        
        // Update in database
        await updateCCIPMessageInDb(messageId, {
          status: status as 'SUCCESS' | 'FAILED',
          destTxHash,
          errorMessage,
          completedAt: new Date(),
        });
        
        return reply.send({
          success: true,
          data: { messageId, status },
          requestId: request.id,
        } as ApiResponse);
      } catch (error) {
        log.error({ error }, 'Failed to process webhook');
        return reply.code(500).send({
          success: false,
          error: 'Failed to process webhook',
          requestId: request.id,
        } as ApiResponse);
      }
    }
  );

  /**
   * POST /api/ccip/poll-status
   * Manually trigger status polling for a message
   * Useful for testing and manual status checks
   */
  fastify.post<{ Body: { messageId: string; intentId: string } }>(
    '/poll-status',
    async (request, reply) => {
      const log = logger.child({ route: '/api/ccip/poll-status', requestId: request.id });
      
      try {
        const { messageId, intentId } = request.body;
        
        if (!messageId || !intentId) {
          return reply.code(400).send({
            success: false,
            error: 'messageId and intentId are required',
            requestId: request.id,
          } as ApiResponse);
        }
        
        log.info({ messageId, intentId }, 'Starting status poll');
        
        // Start polling in background (don't await)
        pollMessageStatus({
          messageId: messageId as Hex,
          intentId,
          maxAttempts: 20, // ~5 minutes with 15s intervals
          intervalMs: 15000,
        }).then(async (status) => {
          // Update database when polling completes
          if (status === CCIPMessageStatus.SUCCESS || status === CCIPMessageStatus.FAILED) {
            await updateCCIPMessageInDb(messageId, {
              status,
              completedAt: new Date(),
            });
          }
        }).catch((error) => {
          log.error({ error, messageId }, 'Polling failed');
        });
        
        return reply.send({
          success: true,
          data: {
            messageId,
            message: 'Status polling started',
            explorerUrl: getCCIPExplorerUrl(messageId as Hex),
          },
          requestId: request.id,
        } as ApiResponse);
      } catch (error) {
        log.error({ error }, 'Failed to start polling');
        return reply.code(500).send({
          success: false,
          error: 'Failed to start polling',
          requestId: request.id,
        } as ApiResponse);
      }
    }
  );
}

export default ccipRoutes;
