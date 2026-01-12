/**
 * DEX Aggregator API Routes
 * REST endpoints for token swaps using 1inch, 0x, and Uniswap
 */

import { FastifyInstance } from 'fastify';
import { Address } from 'viem';
import {
  getSwapQuote,
  getSwapTransaction,
  simulateSwap,
  compareQuotes,
  getApprovalAmount,
  buildApprovalTx,
  validateSlippage,
  TOKENS,
  SwapQuoteParams,
  SwapTxParams,
} from '../services/dex-aggregator.js';
import { logger } from '../utils/logger.js';

// Schema definitions for validation
const swapQuoteSchema = {
  type: 'object',
  required: ['chainId', 'srcToken', 'dstToken', 'amount'],
  properties: {
    chainId: { type: 'number', description: 'Chain ID (421614 for Arbitrum Sepolia)' },
    srcToken: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$', description: 'Source token address' },
    dstToken: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$', description: 'Destination token address' },
    amount: { type: 'string', description: 'Amount in smallest unit (wei/base units)' },
    slippage: { type: 'number', minimum: 0.1, maximum: 5, default: 1, description: 'Slippage tolerance (%)' },
  },
};

const swapTxSchema = {
  type: 'object',
  required: ['chainId', 'srcToken', 'dstToken', 'amount', 'userAddress'],
  properties: {
    chainId: { type: 'number' },
    srcToken: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
    dstToken: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
    amount: { type: 'string' },
    slippage: { type: 'number', minimum: 0.1, maximum: 5, default: 1 },
    userAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
    recipient: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
  },
};

const approvalSchema = {
  type: 'object',
  required: ['chainId', 'token', 'owner', 'spender'],
  properties: {
    chainId: { type: 'number' },
    token: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
    owner: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
    spender: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
  },
};

export async function dexRoutes(fastify: FastifyInstance) {
  const log = logger.child({ module: 'dex-routes' });

  // ============================================================================
  // GET /api/dex/config - Get DEX configuration
  // ============================================================================
  fastify.get('/config', {
    schema: {
      description: 'Get DEX aggregator configuration',
      tags: ['DEX'],
      response: {
        200: {
          type: 'object',
          properties: {
            supportedChains: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  chainId: { type: 'number' },
                  name: { type: 'string' },
                },
              },
            },
            aggregators: {
              type: 'array',
              items: { type: 'string' },
            },
            defaultSlippage: { type: 'number' },
            maxSlippage: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    return {
      supportedChains: [
        { chainId: 421614, name: 'Arbitrum Sepolia' },
        { chainId: 84532, name: 'Base Sepolia' },
        { chainId: 42161, name: 'Arbitrum One' },
        { chainId: 8453, name: 'Base' },
      ],
      aggregators: ['1inch', '0x', 'Uniswap V3'],
      defaultSlippage: 1,
      maxSlippage: 5,
    };
  });

  // ============================================================================
  // GET /api/dex/tokens/:chainId - Get supported tokens on a chain
  // ============================================================================
  fastify.get('/tokens/:chainId', {
    schema: {
      description: 'Get supported tokens for a chain',
      tags: ['DEX'],
      params: {
        type: 'object',
        required: ['chainId'],
        properties: {
          chainId: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            chainId: { type: 'number' },
            tokens: {
              type: 'object',
              additionalProperties: { type: 'string' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { chainId } = request.params as { chainId: string };
    const chainIdNum = parseInt(chainId);
    
    const tokens = TOKENS[chainIdNum as keyof typeof TOKENS];
    if (!tokens) {
      return reply.status(400).send({ 
        error: 'Unsupported chain',
        supportedChains: Object.keys(TOKENS).map(Number),
      });
    }
    
    return { chainId: chainIdNum, tokens };
  });

  // ============================================================================
  // POST /api/dex/quote - Get swap quote
  // ============================================================================
  fastify.post('/quote', {
    schema: {
      description: 'Get the best swap quote from available aggregators',
      tags: ['DEX'],
      body: swapQuoteSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            srcToken: { type: 'string' },
            dstToken: { type: 'string' },
            srcAmount: { type: 'string' },
            dstAmount: { type: 'string' },
            dstAmountMin: { type: 'string' },
            protocols: { type: 'array', items: { type: 'string' } },
            gasEstimate: { type: 'string' },
            priceImpact: { type: 'string' },
            aggregator: { type: 'string' },
            expiresAt: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const params = request.body as SwapQuoteParams;
    
    // Validate slippage
    const slippageCheck = validateSlippage(params.slippage || 1);
    if (!slippageCheck.valid) {
      return reply.status(400).send({ error: slippageCheck.error });
    }
    
    log.info({ params }, 'Getting swap quote');
    
    try {
      const quote = await getSwapQuote(params);
      return quote;
    } catch (error: any) {
      log.error({ error, params }, 'Failed to get swap quote');
      return reply.status(500).send({ 
        error: 'Failed to get quote', 
        details: error.message,
      });
    }
  });

  // ============================================================================
  // POST /api/dex/compare - Compare quotes from all aggregators
  // ============================================================================
  fastify.post('/compare', {
    schema: {
      description: 'Compare swap quotes from all available aggregators',
      tags: ['DEX'],
      body: swapQuoteSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            quotes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  aggregator: { type: 'string' },
                  dstAmount: { type: 'string' },
                  protocols: { type: 'array', items: { type: 'string' } },
                },
              },
            },
            best: {
              type: 'object',
              properties: {
                aggregator: { type: 'string' },
                dstAmount: { type: 'string' },
              },
            },
            comparison: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  aggregator: { type: 'string' },
                  dstAmount: { type: 'string' },
                  difference: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const params = request.body as SwapQuoteParams;
    
    log.info({ params }, 'Comparing quotes');
    
    try {
      const result = await compareQuotes(params);
      return result;
    } catch (error: any) {
      log.error({ error, params }, 'Failed to compare quotes');
      return reply.status(500).send({ 
        error: 'Failed to compare quotes', 
        details: error.message,
      });
    }
  });

  // ============================================================================
  // POST /api/dex/swap - Get swap transaction data
  // ============================================================================
  fastify.post('/swap', {
    schema: {
      description: 'Get swap transaction calldata ready to sign',
      tags: ['DEX'],
      body: swapTxSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            to: { type: 'string' },
            data: { type: 'string' },
            value: { type: 'string' },
            gasLimit: { type: 'string' },
            quote: {
              type: 'object',
              properties: {
                srcToken: { type: 'string' },
                dstToken: { type: 'string' },
                srcAmount: { type: 'string' },
                dstAmount: { type: 'string' },
                aggregator: { type: 'string' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const params = request.body as SwapTxParams;
    
    // Validate slippage
    const slippageCheck = validateSlippage(params.slippage || 1);
    if (!slippageCheck.valid) {
      return reply.status(400).send({ error: slippageCheck.error });
    }
    
    log.info({ params }, 'Building swap transaction');
    
    try {
      const swapTx = await getSwapTransaction(params);
      return swapTx;
    } catch (error: any) {
      log.error({ error, params }, 'Failed to build swap transaction');
      return reply.status(500).send({ 
        error: 'Failed to build swap transaction', 
        details: error.message,
      });
    }
  });

  // ============================================================================
  // POST /api/dex/simulate - Simulate swap without executing
  // ============================================================================
  fastify.post('/simulate', {
    schema: {
      description: 'Simulate a swap to check if it would succeed',
      tags: ['DEX'],
      body: swapTxSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            gasUsed: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const params = request.body as SwapTxParams;
    
    log.info({ params }, 'Simulating swap');
    
    try {
      const result = await simulateSwap(params);
      return result;
    } catch (error: any) {
      log.error({ error, params }, 'Simulation error');
      return reply.status(500).send({ 
        success: false,
        error: error.message,
      });
    }
  });

  // ============================================================================
  // POST /api/dex/approval - Check token approval status
  // ============================================================================
  fastify.post('/approval', {
    schema: {
      description: 'Check if token approval is needed for swap',
      tags: ['DEX'],
      body: approvalSchema,
      response: {
        200: {
          type: 'object',
          properties: {
            currentAllowance: { type: 'string' },
            needsApproval: { type: 'boolean' },
            recommendedApproval: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const params = request.body as {
      chainId: number;
      token: Address;
      owner: Address;
      spender: Address;
    };
    
    log.info({ params }, 'Checking approval');
    
    try {
      const result = await getApprovalAmount(params);
      return result;
    } catch (error: any) {
      log.error({ error, params }, 'Failed to check approval');
      return reply.status(500).send({ 
        error: 'Failed to check approval', 
        details: error.message,
      });
    }
  });

  // ============================================================================
  // POST /api/dex/approval/tx - Build approval transaction
  // ============================================================================
  fastify.post('/approval/tx', {
    schema: {
      description: 'Build token approval transaction',
      tags: ['DEX'],
      body: {
        type: 'object',
        required: ['token', 'spender', 'amount'],
        properties: {
          token: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
          spender: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
          amount: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            to: { type: 'string' },
            data: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { token, spender, amount } = request.body as {
      token: Address;
      spender: Address;
      amount: string;
    };
    
    log.info({ token, spender, amount }, 'Building approval transaction');
    
    try {
      const tx = buildApprovalTx({ token, spender, amount });
      return tx;
    } catch (error: any) {
      log.error({ error }, 'Failed to build approval transaction');
      return reply.status(500).send({ 
        error: 'Failed to build approval transaction', 
        details: error.message,
      });
    }
  });

  // ============================================================================
  // GET /api/dex/validate-slippage/:slippage - Validate slippage value
  // ============================================================================
  fastify.get('/validate-slippage/:slippage', {
    schema: {
      description: 'Validate a slippage tolerance value',
      tags: ['DEX'],
      params: {
        type: 'object',
        required: ['slippage'],
        properties: {
          slippage: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            error: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const { slippage } = request.params as { slippage: string };
    const slippageNum = parseFloat(slippage);
    
    if (isNaN(slippageNum)) {
      return { valid: false, error: 'Invalid slippage value' };
    }
    
    return validateSlippage(slippageNum);
  });

  log.info('DEX routes registered');
}

export default dexRoutes;
