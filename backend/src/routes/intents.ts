/**
 * Intent API Routes
 * Handles intent parsing, route optimization, and status queries
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/prisma.js';
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
          routes: intent.routes.map((r) => r.routeData) as any,
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
}
