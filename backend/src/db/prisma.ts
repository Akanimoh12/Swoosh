/**
 * Prisma client singleton
 * Ensures single database connection instance
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { logger } from '../utils/logger.js';

// Re-export Prisma namespace for type usage
export { Prisma };

// Prevent multiple instances in development (hot reload)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { level: 'query', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'warn', emit: 'event' },
    ],
  });

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug({ duration: e.duration, query: e.query }, 'Database query');
  });
}

prisma.$on('error', (e) => {
  logger.error({ target: e.target, message: e.message }, 'Database error');
});

prisma.$on('warn', (e) => {
  logger.warn({ target: e.target, message: e.message }, 'Database warning');
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Test database connection
 */
export async function testConnection() {
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
    return true;
  } catch (error) {
    logger.error({ error }, '❌ Database connection failed');
    return false;
  }
}

/**
 * Gracefully disconnect from database
 */
export async function disconnect() {
  try {
    await prisma.$disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting from database');
  }
}
