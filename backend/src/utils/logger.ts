/**
 * Logger utility
 * Structured logging with Pino
 */

import pino from 'pino';
import { config } from '../config/index.js';

export const logger = pino({
  level: config.logLevel,
  transport: config.logPretty && config.nodeEnv === 'development'
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

/**
 * Create a child logger with additional context
 * @param context - Additional context to include in all log entries
 */
export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}
