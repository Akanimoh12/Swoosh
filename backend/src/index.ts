/**
 * Main server entry point
 * Configures Fastify, registers routes, and starts the server
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { testConnection as testDatabaseConnection, disconnect as disconnectDatabase } from './db/prisma.js';
import { redis } from './db/redis.js';
import { healthRoutes } from './routes/health.js';
import { intentRoutes } from './routes/intents.js';
import { websocketRoutes } from './routes/websocket.js';

/**
 * Create and configure Fastify server
 */
async function createServer() {
  const fastify = Fastify({
    logger: false, // We use our custom logger
    genReqId: () => crypto.randomUUID(),
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
  });

  // Register CORS
  await fastify.register(cors, {
    origin: config.corsOrigin,
    credentials: true,
  });

  // Register WebSocket support
  await fastify.register(websocket, {
    options: {
      maxPayload: 1048576, // 1MB
    },
  });

  // Request logging
  fastify.addHook('onRequest', async (request, reply) => {
    logger.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        ip: request.ip,
      },
      'Incoming request'
    );
  });

  // Response logging
  fastify.addHook('onResponse', async (request, reply) => {
    logger.info(
      {
        requestId: request.id,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime: reply.elapsedTime,
      },
      'Request completed'
    );
  });

  // Rate limiting (simple in-memory implementation)
  const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

  fastify.addHook('preHandler', async (request, reply) => {
    const ip = request.ip;
    const now = Date.now();
    const limit = config.rateLimitMax;
    const window = config.rateLimitWindow;

    let record = rateLimitMap.get(ip);

    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + window };
      rateLimitMap.set(ip, record);
    }

    record.count++;

    if (record.count > limit) {
      return reply.code(429).send({
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
      });
    }
  });

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(intentRoutes, { prefix: '/api/intents' });
  await fastify.register(websocketRoutes);

  // Global error handler
  fastify.setErrorHandler((error, request, reply) => {
    logger.error(
      {
        requestId: request.id,
        error: error.message,
        stack: error.stack,
      },
      'Unhandled error'
    );

    return reply.code(500).send({
      success: false,
      error: 'Internal server error',
      requestId: request.id,
    });
  });

  return fastify;
}

/**
 * Start the server
 */
async function start() {
  try {
    logger.info('🚀 Starting Swoosh backend...');

    // Test database connection
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      logger.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Test Redis connection
    const redisConnected = await redis.testConnection();
    if (!redisConnected) {
      logger.warn('Redis connection failed. Caching will be disabled.');
    }

    // Create and start server
    const fastify = await createServer();

    await fastify.listen({
      port: config.port,
      host: config.host,
    });

    logger.info(
      {
        port: config.port,
        host: config.host,
        nodeEnv: config.nodeEnv,
      },
      '✅ Server started successfully'
    );

    logger.info(`📡 API available at http://${config.host}:${config.port}`);
    logger.info(`🔌 WebSocket available at ws://${config.host}:${config.port}/ws/intents/:id`);
  } catch (error) {
    logger.error({ error }, '❌ Failed to start server');
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutdown signal received');

  try {
    // Disconnect from database
    await disconnectDatabase();

    // Disconnect from Redis
    await redis.disconnect();

    logger.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, '❌ Error during shutdown');
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled promise rejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  process.exit(1);
});

// Start the server
start();
