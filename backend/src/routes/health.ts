/**
 * Health check routes
 */

import { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import { redis } from '../db/redis.js';
import { logger } from '../utils/logger.js';

export async function healthRoutes(fastify: FastifyInstance) {
  // GET /health - Basic health check
  fastify.get('/health', async (request, reply) => {
    return reply.code(200).send({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  });

  // GET /health/detailed - Detailed health check with dependencies
  fastify.get('/health/detailed', async (request, reply) => {
    const log = logger.child({ route: '/health/detailed' });

    const checks = {
      database: false,
      redis: false,
      timestamp: new Date().toISOString(),
    };

    // Check database
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = true;
    } catch (error) {
      log.error({ error }, 'Database health check failed');
    }

    // Check Redis
    try {
      checks.redis = await redis.testConnection();
    } catch (error) {
      log.error({ error }, 'Redis health check failed');
    }

    const allHealthy = checks.database && checks.redis;
    const statusCode = allHealthy ? 200 : 503;

    return reply.code(statusCode).send({
      status: allHealthy ? 'healthy' : 'unhealthy',
      checks,
    });
  });
}
