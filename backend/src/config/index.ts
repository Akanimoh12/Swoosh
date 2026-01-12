/**
 * Configuration module
 * Validates and exports all environment variables with proper typing
 */

import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenvConfig();

// Define configuration schema with Zod for validation
const configSchema = z.object({
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  port: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('3000'),
  host: z.string().default('0.0.0.0'),
  
  // Database
  databaseUrl: z.string().url(),
  
  // Redis
  redisUrl: z.string().url(),
  redisPassword: z.string().optional(),
  
  // OpenAI
  openaiApiKey: z.string().min(1),
  openaiModel: z.string().default('gpt-4-turbo-preview'),
  openaiMaxTokens: z.string().transform(Number).pipe(z.number().positive()).default('500'),
  openaiTemperature: z.string().transform(Number).pipe(z.number().min(0).max(2)).default('0.1'),
  openaiTimeout: z.string().transform(Number).pipe(z.number().positive()).default('5000'),
  
  // Rate Limiting
  rateLimitMax: z.string().transform(Number).pipe(z.number().positive()).default('100'),
  rateLimitWindow: z.string().transform(Number).pipe(z.number().positive()).default('60000'),
  
  // Cache TTLs (in seconds)
  cacheTtlRoutes: z.string().transform(Number).pipe(z.number().positive()).default('300'),
  cacheTtlTokenPrices: z.string().transform(Number).pipe(z.number().positive()).default('60'),
  cacheTtlGasPrices: z.string().transform(Number).pipe(z.number().positive()).default('30'),
  cacheTtlSimilarIntents: z.string().transform(Number).pipe(z.number().positive()).default('300'),
  
  // API Keys
  oneinchApiKey: z.string().optional(),
  ccipRouterAddress: z.string().optional(),
  
  // CORS
  corsOrigin: z.string().default('http://localhost:5173'),
  
  // Logging
  logLevel: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  logPretty: z.string().transform(val => val === 'true').default('true'),
  
  // Supported chains and tokens
  supportedChains: z.string().transform(str => str.split(',').map(Number)),
  supportedTokens: z.string().transform(str => str.split(',').filter(Boolean)),
});

// Parse and validate environment variables
function loadConfig() {
  try {
    const rawConfig = {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      host: process.env.HOST,
      databaseUrl: process.env.DATABASE_URL,
      redisUrl: process.env.REDIS_URL,
      redisPassword: process.env.REDIS_PASSWORD,
      openaiApiKey: process.env.OPENAI_API_KEY,
      openaiModel: process.env.OPENAI_MODEL,
      openaiMaxTokens: process.env.OPENAI_MAX_TOKENS,
      openaiTemperature: process.env.OPENAI_TEMPERATURE,
      openaiTimeout: process.env.OPENAI_TIMEOUT,
      rateLimitMax: process.env.RATE_LIMIT_MAX,
      rateLimitWindow: process.env.RATE_LIMIT_WINDOW,
      cacheTtlRoutes: process.env.CACHE_TTL_ROUTES,
      cacheTtlTokenPrices: process.env.CACHE_TTL_TOKEN_PRICES,
      cacheTtlGasPrices: process.env.CACHE_TTL_GAS_PRICES,
      cacheTtlSimilarIntents: process.env.CACHE_TTL_SIMILAR_INTENTS,
      oneinchApiKey: process.env.ONEINCH_API_KEY,
      ccipRouterAddress: process.env.CCIP_ROUTER_ADDRESS,
      corsOrigin: process.env.CORS_ORIGIN,
      logLevel: process.env.LOG_LEVEL,
      logPretty: process.env.LOG_PRETTY,
      supportedChains: process.env.SUPPORTED_CHAINS || '42161,8453,10',
      supportedTokens: process.env.SUPPORTED_TOKENS || '',
    };

    return configSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Configuration validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

export const config = loadConfig();

// Export type for config object
export type Config = z.infer<typeof configSchema>;
