/**
 * Intent API Routes
 * Handles intent parsing, route optimization, history, and status queries
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
import { redis } from '../db/redis.js';
import { logger } from '../utils/logger.js';
import { parseIntent } from '../services/intent-parser.js';
import { optimizeRoute } from '../services/route-optimizer.js';
import {
  ApiResponse,
  ParseIntentRequest,
  ParseIntentRequestSchema,
  OptimizeRouteRequest,
  OptimizeRouteRequestSchema,
  IntentStatusResponse,
} from '../types/index.js';

// ============================================================================
// Types for History API
// ============================================================================

interface IntentListItem {
  id: string;
  rawText: string;
  status: string;
  sourceChain: string | null;
  destChain: string | null;
  sourceToken: string | null;
  destToken: string | null;
  amount: string | null;
  estimatedCost: string | null;
  actualCost: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

interface IntentDetail extends IntentListItem {
  parsedData: Record<string, unknown> | null;
  route: Record<string, unknown> | null;
  transactions: TransactionRecord[];
  gasCosts: GasCostBreakdown | null;
  executionTimeline: TimelineEvent[];
  errorMessage: string | null;
}

interface TransactionRecord {
  id: string;
  type: string;
  txHash: string;
  chainId: number;
  status: string;
  gasUsed: string | null;
  gasPrice: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

interface GasCostBreakdown {
  validation: string;
  swap: string;
  bridge: string;
  settlement: string;
  total: string;
  savedVsTraditional: string;
}

interface TimelineEvent {
  step: string;
  status: 'completed' | 'current' | 'pending' | 'failed';
  timestamp: string | null;
  txHash: string | null;
  details: string | null;
}

interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

// ============================================================================
// Validation Schemas
// ============================================================================

const ListIntentsQuerySchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['PENDING', 'VALIDATING', 'VALIDATED', 'ROUTING', 'EXECUTING', 'BRIDGING', 'SETTLING', 'COMPLETED', 'FAILED']).optional(),
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  sortBy: z.enum(['newest', 'oldest', 'highestCost', 'lowestCost']).default('newest'),
  search: z.string().max(200).optional(),
});

type ListIntentsQuery = z.infer<typeof ListIntentsQuerySchema>;

// ============================================================================
// Types for Prisma Queries
// ============================================================================

interface IntentWhereInput {
  userAddress?: { equals: string; mode: 'insensitive' } | string;
  status?: string;
  createdAt?: {
    gte?: Date;
    lte?: Date;
  };
  OR?: Array<{ rawInput: { contains: string; mode: 'insensitive' } }>;
}

interface IntentOrderByInput {
  createdAt?: 'asc' | 'desc';
}

// ============================================================================
// Helper Functions
// ============================================================================

function getCacheKey(query: ListIntentsQuery): string {
  return `intents:list:${query.address}:${query.page}:${query.limit}:${query.status || 'all'}:${query.sortBy}:${query.search || ''}:${query.fromDate || ''}:${query.toDate || ''}`;
}

function buildWhereClause(query: ListIntentsQuery): IntentWhereInput {
  const where: IntentWhereInput = {
    userAddress: { equals: query.address.toLowerCase(), mode: 'insensitive' },
  };

  if (query.status) {
    where.status = query.status;
  }

  if (query.fromDate || query.toDate) {
    where.createdAt = {};
    if (query.fromDate) {
      where.createdAt.gte = new Date(query.fromDate);
    }
    if (query.toDate) {
      where.createdAt.lte = new Date(query.toDate);
    }
  }

  if (query.search) {
    where.OR = [
      { rawInput: { contains: query.search, mode: 'insensitive' } },
    ];
  }

  return where;
}

function buildOrderByClause(sortBy: string): IntentOrderByInput {
  switch (sortBy) {
    case 'oldest':
      return { createdAt: 'asc' };
    case 'highestCost':
      return { createdAt: 'desc' }; // TODO: Add cost field
    case 'lowestCost':
      return { createdAt: 'asc' }; // TODO: Add cost field
    case 'newest':
    default:
      return { createdAt: 'desc' };
  }
}

function formatIntentListItem(intent: any): IntentListItem {
  const parsed = intent.parsedData as any;
  return {
    id: intent.id,
    rawText: intent.rawInput,
    status: intent.status,
    sourceChain: parsed?.sourceChain || null,
    destChain: parsed?.destChain || null,
    sourceToken: parsed?.sourceToken || null,
    destToken: parsed?.destToken || null,
    amount: parsed?.amount || null,
    estimatedCost: intent.routes?.[0]?.costEstimate || null,
    actualCost: null, // TODO: Calculate from transactions
    createdAt: intent.createdAt.toISOString(),
    updatedAt: intent.updatedAt.toISOString(),
    completedAt: intent.status === 'COMPLETED' ? intent.updatedAt.toISOString() : null,
  };
}

function buildExecutionTimeline(intent: any): TimelineEvent[] {
  const steps = ['validation', 'swap', 'bridge', 'settlement'];
  const statusMap: Record<string, number> = {
    PENDING: -1,
    VALIDATING: 0,
    VALIDATED: 0,
    ROUTING: 1,
    EXECUTING: 1,
    BRIDGING: 2,
    SETTLING: 3,
    COMPLETED: 4,
    FAILED: -2,
  };

  const currentIndex = statusMap[intent.status] ?? -1;
  const isFailed = intent.status === 'FAILED';
  const parsed = intent.parsedData as any;

  return steps.map((step, index) => {
    let status: TimelineEvent['status'] = 'pending';
    
    if (isFailed && index === currentIndex) {
      status = 'failed';
    } else if (index < currentIndex || (intent.status === 'COMPLETED' && index <= 3)) {
      status = 'completed';
    } else if (index === currentIndex) {
      status = 'current';
    }

    return {
      step,
      status,
      timestamp: status === 'completed' ? intent.updatedAt.toISOString() : null,
      txHash: null, // TODO: Get from transactions
      details: getStepDetails(step, status, parsed),
    };
  });
}

function getStepDetails(step: string, status: TimelineEvent['status'], parsed: any): string | null {
  const statusText = status === 'completed' ? 'Complete' : status === 'current' ? 'In progress...' : 'Pending';
  switch (step) {
    case 'validation':
      return status === 'completed' ? 'Intent validated' : 'Validating parameters...';
    case 'swap':
      return status === 'completed' ? `Swapped ${parsed?.amount || ''} ${parsed?.sourceToken || ''}` : 'Executing swap...';
    case 'bridge':
      return status === 'completed' ? `Bridged to ${parsed?.destChain || ''}` : 'CCIP transfer in progress (~2-5 min)...';
    case 'settlement':
      return status === 'completed' ? `Received ${parsed?.destToken || ''}` : 'Settling transaction...';
    default:
      return statusText;
  }
}

/**
 * Register intent routes
 */
export async function intentRoutes(fastify: FastifyInstance) {
  // POST /api/intents/parse - Parse natural language intent
  fastify.post<{ Body: ParseIntentRequest }>(
    '/parse',
    {
      schema: {
        body: {
          type: 'object',
          required: ['text', 'userAddress'],
          properties: {
            text: { type: 'string', minLength: 1, maxLength: 500 },
            userAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: ParseIntentRequest }>, reply: FastifyReply) => {
      const log = logger.child({ route: '/api/intents/parse', requestId: request.id });

      try {
        // Validate request body
        const validated = ParseIntentRequestSchema.safeParse(request.body);
        if (!validated.success) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid request: ' + validated.error.errors[0]?.message,
            requestId: request.id,
          } as ApiResponse);
        }

        const { text, userAddress } = validated.data;
        log.info({ text, userAddress }, 'Parsing intent');

        // Parse intent
        const parsedIntent = await parseIntent(text, userAddress);
        if (!parsedIntent) {
          return reply.code(400).send({
            success: false,
            error: 'Unable to parse intent. Please rephrase your request.',
            requestId: request.id,
          } as ApiResponse);
        }

        // Save intent to database
        const intent = await prisma.intent.create({
          data: {
            userAddress,
            rawInput: text,
            parsedData: parsedIntent as any,
            status: 'PENDING',
          },
        });

        log.info({ intentId: intent.id }, 'Intent saved');

        return reply.code(200).send({
          success: true,
          data: {
            id: intent.id,
            parsed: parsedIntent,
          },
          requestId: request.id,
        } as ApiResponse);
      } catch (error) {
        log.error({ error }, 'Error parsing intent');
        return reply.code(500).send({
          success: false,
          error: 'Internal server error',
          requestId: request.id,
        } as ApiResponse);
      }
    }
  );

  // POST /api/intents/route - Optimize route for intent
  fastify.post<{ Body: OptimizeRouteRequest }>(
    '/route',
    {
      schema: {
        body: {
          type: 'object',
          required: ['intent', 'userAddress'],
          properties: {
            intent: { type: 'object' },
            userAddress: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: OptimizeRouteRequest }>, reply: FastifyReply) => {
      const log = logger.child({ route: '/api/intents/route', requestId: request.id });

      try {
        // Validate request body
        const validated = OptimizeRouteRequestSchema.safeParse(request.body);
        if (!validated.success) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid request: ' + validated.error.errors[0]?.message,
            requestId: request.id,
          } as ApiResponse);
        }

        const { intent, userAddress } = validated.data;
        log.info({ intent, userAddress }, 'Optimizing route');

        // Optimize route
        const route = await optimizeRoute(intent);
        if (!route) {
          return reply.code(500).send({
            success: false,
            error: 'Unable to optimize route. Please try again.',
            requestId: request.id,
          } as ApiResponse);
        }

        // Find or create intent in database
        const dbIntent = await prisma.intent.findFirst({
          where: {
            userAddress,
            parsedData: intent as any,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (dbIntent) {
          // Save route to database
          const intentHash = require('crypto')
            .createHash('sha256')
            .update(JSON.stringify(intent))
            .digest('hex');

          await prisma.route.create({
            data: {
              intentId: dbIntent.id,
              intentHash,
              routeData: route as any,
              costEstimate: route.totalCost,
              estimatedTime: route.estimatedTime,
              expiration: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
            },
          });

          log.info({ intentId: dbIntent.id }, 'Route saved');
        }

        return reply.code(200).send({
          success: true,
          data: route,
          requestId: request.id,
        } as ApiResponse);
      } catch (error) {
        log.error({ error }, 'Error optimizing route');
        return reply.code(500).send({
          success: false,
          error: 'Internal server error',
          requestId: request.id,
        } as ApiResponse);
      }
    }
  );

  // GET /api/intents/:id/status - Get intent status
  fastify.get<{ Params: { id: string } }>(
    '/:id/status',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const log = logger.child({ route: '/api/intents/:id/status', requestId: request.id });
      const { id } = request.params;

      try {
        // Fetch intent with routes
        const intent = await prisma.intent.findUnique({
          where: { id },
          include: {
            routes: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        });

        if (!intent) {
          return reply.code(404).send({
            success: false,
            error: 'Intent not found',
            requestId: request.id,
          } as ApiResponse);
        }

        const response: IntentStatusResponse = {
          id: intent.id,
          status: intent.status,
          rawInput: intent.rawInput,
          parsedData: intent.parsedData as any,
          routes: intent.routes.map((r: { routeData: unknown }) => r.routeData) as any,
          createdAt: intent.createdAt.toISOString(),
          updatedAt: intent.updatedAt.toISOString(),
        };

        return reply.code(200).send({
          success: true,
          data: response,
          requestId: request.id,
        } as ApiResponse);
      } catch (error) {
        log.error({ error }, 'Error fetching intent status');
        return reply.code(500).send({
          success: false,
          error: 'Internal server error',
          requestId: request.id,
        } as ApiResponse);
      }
    }
  );

  // ============================================================================
  // History API Endpoints
  // ============================================================================

  /**
   * GET /api/intents - List user's intents with pagination, filtering, sorting
   */
  fastify.get(
    '/',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['address'],
          properties: {
            address: { type: 'string', pattern: '^0x[a-fA-F0-9]{40}$' },
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            status: { type: 'string' },
            fromDate: { type: 'string' },
            toDate: { type: 'string' },
            sortBy: { type: 'string', default: 'newest' },
            search: { type: 'string' },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Querystring: Record<string, unknown> }>, reply: FastifyReply) => {
      const log = logger.child({ route: '/api/intents', requestId: request.id });

      try {
        // Validate query
        const queryResult = ListIntentsQuerySchema.safeParse(request.query);
        if (!queryResult.success) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid query parameters',
            details: queryResult.error.errors,
            requestId: request.id,
          });
        }
        const query = queryResult.data;

        // Check Redis cache
        const cacheKey = getCacheKey(query);
        try {
          const cached = await redis.get<PaginatedResponse<IntentListItem>>(cacheKey);
          if (cached) {
            log.debug({ cacheKey }, 'Cache hit for intents list');
            return cached;
          }
        } catch (cacheError) {
          log.warn({ cacheError }, 'Redis cache error, continuing without cache');
        }

        // Build query
        const where = buildWhereClause(query);
        const orderBy = buildOrderByClause(query.sortBy);
        const skip = (query.page - 1) * query.limit;

        // Execute queries
        const [intents, totalCount] = await Promise.all([
          prisma.intent.findMany({
            where,
            orderBy,
            skip,
            take: query.limit,
            include: {
              routes: {
                take: 1,
                orderBy: { createdAt: 'desc' },
              },
            },
          }),
          prisma.intent.count({ where }),
        ]);

        const totalPages = Math.ceil(totalCount / query.limit);
        const hasMore = query.page < totalPages;

        const response: PaginatedResponse<IntentListItem> = {
          items: intents.map(formatIntentListItem),
          totalCount,
          page: query.page,
          limit: query.limit,
          hasMore,
          totalPages,
        };

        // Cache for 30 seconds
        try {
          await redis.set(cacheKey, response, 30);
        } catch (cacheError) {
          log.warn({ cacheError }, 'Failed to cache intents list');
        }

        return response;
      } catch (error) {
        log.error({ error }, 'Error listing intents');
        return reply.code(500).send({
          success: false,
          error: 'Internal server error',
          requestId: request.id,
        });
      }
    }
  );

  /**
   * GET /api/intents/:id - Get detailed intent by ID
   */
  fastify.get<{ Params: { id: string }; Querystring: { address?: string } }>(
    '/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
        querystring: {
          type: 'object',
          properties: {
            address: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const log = logger.child({ route: '/api/intents/:id', requestId: request.id });
      const { id } = request.params;
      const { address } = request.query;

      // Don't match the /status route
      if (id === 'status') {
        return reply.code(404).send({ error: 'Not found' });
      }

      try {
        // Check cache
        const cacheKey = `intent:detail:${id}`;
        try {
          const cachedIntent = await redis.get<IntentDetail>(cacheKey);
          if (cachedIntent) {
            if (address && (cachedIntent as any).userAddress?.toLowerCase() !== address.toLowerCase()) {
              return reply.code(403).send({
                success: false,
                error: 'You do not have permission to view this intent',
              });
            }
            return { success: true, data: cachedIntent };
          }
        } catch (cacheError) {
          log.warn({ cacheError }, 'Redis cache error');
        }

        // Fetch from database
        const intent = await prisma.intent.findUnique({
          where: { id },
          include: {
            routes: {
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        if (!intent) {
          return reply.code(404).send({
            success: false,
            error: 'Intent not found',
          });
        }

        // Check ownership
        if (address && intent.userAddress.toLowerCase() !== address.toLowerCase()) {
          return reply.code(403).send({
            success: false,
            error: 'You do not have permission to view this intent',
          });
        }

        const parsed = intent.parsedData as any;
        const route = intent.routes[0]?.routeData as any;

        const response: IntentDetail = {
          ...formatIntentListItem(intent),
          parsedData: intent.parsedData as Record<string, unknown>,
          route: route || null,
          transactions: [], // TODO: Add transactions table
          gasCosts: route ? {
            validation: '0',
            swap: route.swapGas || '0',
            bridge: route.bridgeGas || '0',
            settlement: '0',
            total: route.totalGas || intent.routes[0]?.costEstimate || '0',
            savedVsTraditional: '0',
          } : null,
          executionTimeline: buildExecutionTimeline(intent),
          errorMessage: null, // TODO: Add error tracking
        };

        // Cache for 1 minute
        try {
          await redis.set(cacheKey, response, 60);
        } catch (cacheError) {
          log.warn({ cacheError }, 'Failed to cache intent detail');
        }

        return { success: true, data: response };
      } catch (error) {
        log.error({ error }, 'Error fetching intent details');
        return reply.code(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );

  /**
   * GET /api/intents/:id/retry - Get data to retry a failed intent
   */
  fastify.get<{ Params: { id: string } }>(
    '/:id/retry',
    async (request, reply) => {
      const { id } = request.params;

      try {
        const intent = await prisma.intent.findUnique({
          where: { id },
          select: {
            id: true,
            rawInput: true,
            status: true,
            userAddress: true,
          },
        });

        if (!intent) {
          return reply.code(404).send({
            success: false,
            error: 'Intent not found',
          });
        }

        if (intent.status !== 'FAILED') {
          return reply.code(400).send({
            success: false,
            error: 'Only failed intents can be retried',
          });
        }

        return {
          success: true,
          data: {
            originalIntentId: intent.id,
            rawText: intent.rawInput,
            userAddress: intent.userAddress,
          },
        };
      } catch (error) {
        return reply.code(500).send({
          success: false,
          error: 'Internal server error',
        });
      }
    }
  );
}
