/**
 * Intent Parser Service
 * Uses OpenAI GPT-4 to parse natural language into structured intents
 * with fallback regex-based parsing
 */

import OpenAI from 'openai';
import crypto from 'crypto';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { redis, cacheKeys } from '../db/redis.js';
import { ParsedIntent, ParsedIntentSchema } from '../types/index.js';

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
  timeout: config.openaiTimeout,
});

/**
 * System prompt for intent parsing
 */
const SYSTEM_PROMPT = `You are an expert blockchain intent parser for a cross-chain DeFi protocol on Arbitrum.

Your task is to parse natural language requests into structured JSON intents.

Supported chains (by ID):
- 42161: Arbitrum One
- 8453: Base
- 10: Optimism

Common tokens:
- ETH: 0x0000000000000000000000000000000000000000
- USDC on Arbitrum: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
- USDC on Base: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

Parse requests like:
- "Send 100 USDC to Base"
- "Swap 1 ETH for USDC"
- "Bridge 50 USDC to Optimism"

Always respond with valid JSON matching this schema:
{
  "action": "swap" | "bridge" | "send",
  "sourceChain": number,
  "destinationChain": number,
  "tokenIn": "0x...",
  "tokenOut": "0x..." (optional for bridge/send),
  "amount": "string in wei",
  "recipient": "0x...",
  "slippageTolerance": 0.5
}

If the request is unclear or impossible, respond with an error object:
{ "error": "explanation of why parsing failed" }`;

/**
 * Parse natural language intent using OpenAI
 * @param text - Natural language input
 * @param userAddress - User's wallet address
 * @returns Parsed intent or null on failure
 */
export async function parseIntent(
  text: string,
  userAddress: string
): Promise<ParsedIntent | null> {
  const log = logger.child({ function: 'parseIntent', userAddress });

  try {
    // Generate hash for caching similar intents
    const inputHash = crypto
      .createHash('sha256')
      .update(text.toLowerCase().trim())
      .digest('hex');

    // Check cache for similar intent
    const cached = await redis.get<ParsedIntent>(
      cacheKeys.similarIntent(inputHash)
    );
    if (cached) {
      log.info('Cache hit for similar intent');
      return cached;
    }

    // Try AI parsing first
    const aiResult = await parseWithAI(text, userAddress);
    if (aiResult) {
      // Cache successful parse
      await redis.set(
        cacheKeys.similarIntent(inputHash),
        aiResult,
        config.cacheTtlSimilarIntents
      );
      return aiResult;
    }

    // Fallback to regex parsing
    log.warn('AI parsing failed, trying regex fallback');
    const regexResult = await parseWithRegex(text, userAddress);
    if (regexResult) {
      await redis.set(
        cacheKeys.similarIntent(inputHash),
        regexResult,
        config.cacheTtlSimilarIntents
      );
      return regexResult;
    }

    log.error('Both AI and regex parsing failed');
    return null;
  } catch (error) {
    log.error({ error }, 'Error in parseIntent');
    return null;
  }
}

/**
 * Parse intent using OpenAI GPT-4
 */
async function parseWithAI(
  text: string,
  userAddress: string
): Promise<ParsedIntent | null> {
  const log = logger.child({ function: 'parseWithAI' });

  try {
    const startTime = Date.now();

    const completion = await openai.chat.completions.create({
      model: config.openaiModel,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Parse this request from user ${userAddress}: "${text}"`,
        },
      ],
      max_tokens: config.openaiMaxTokens,
      temperature: config.openaiTemperature,
      response_format: { type: 'json_object' },
    });

    const duration = Date.now() - startTime;
    log.info({ duration }, 'OpenAI API call completed');

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      log.error('Empty response from OpenAI');
      return null;
    }

    const parsed = JSON.parse(response);

    // Check for error response
    if ('error' in parsed) {
      log.warn({ error: parsed.error }, 'OpenAI returned error');
      return null;
    }

    // Validate against schema
    const validated = ParsedIntentSchema.safeParse(parsed);
    if (!validated.success) {
      log.error({ errors: validated.error.errors }, 'Schema validation failed');
      return null;
    }

    log.info({ intent: validated.data }, 'Successfully parsed intent with AI');
    return validated.data;
  } catch (error) {
    if (error instanceof Error) {
      log.error({ error: error.message }, 'OpenAI API error');
    }
    return null;
  }
}

/**
 * Fallback regex-based parsing for common patterns
 */
async function parseWithRegex(
  text: string,
  userAddress: string
): Promise<ParsedIntent | null> {
  const log = logger.child({ function: 'parseWithRegex' });
  const normalized = text.toLowerCase().trim();

  try {
    // Pattern: "send X TOKEN to CHAIN"
    const sendPattern = /send\s+(\d+\.?\d*)\s+(\w+)\s+to\s+(\w+)/i;
    const sendMatch = normalized.match(sendPattern);
    if (sendMatch) {
      const [, amount, token, chain] = sendMatch;
      return buildSendIntent(amount, token, chain, userAddress);
    }

    // Pattern: "swap X TOKEN for Y"
    const swapPattern = /swap\s+(\d+\.?\d*)\s+(\w+)\s+for\s+(\w+)/i;
    const swapMatch = normalized.match(swapPattern);
    if (swapMatch) {
      const [, amount, tokenIn, tokenOut] = swapMatch;
      return buildSwapIntent(amount, tokenIn, tokenOut, userAddress);
    }

    // Pattern: "bridge X TOKEN to CHAIN"
    const bridgePattern = /bridge\s+(\d+\.?\d*)\s+(\w+)\s+to\s+(\w+)/i;
    const bridgeMatch = normalized.match(bridgePattern);
    if (bridgeMatch) {
      const [, amount, token, chain] = bridgeMatch;
      return buildBridgeIntent(amount, token, chain, userAddress);
    }

    log.warn('No regex pattern matched');
    return null;
  } catch (error) {
    log.error({ error }, 'Error in regex parsing');
    return null;
  }
}

/**
 * Helper: Build send intent
 */
function buildSendIntent(
  amount: string,
  token: string,
  chain: string,
  userAddress: string
): ParsedIntent {
  const tokenAddress = getTokenAddress(token, 42161);
  const destChainId = getChainId(chain);
  const amountWei = parseAmount(amount, token);

  return {
    action: 'send',
    sourceChain: 42161, // Arbitrum
    destinationChain: destChainId,
    tokenIn: tokenAddress,
    amount: amountWei,
    recipient: userAddress,
    slippageTolerance: 0.5,
  };
}

/**
 * Helper: Build swap intent
 */
function buildSwapIntent(
  amount: string,
  tokenIn: string,
  tokenOut: string,
  userAddress: string
): ParsedIntent {
  const tokenInAddress = getTokenAddress(tokenIn, 42161);
  const tokenOutAddress = getTokenAddress(tokenOut, 42161);
  const amountWei = parseAmount(amount, tokenIn);

  return {
    action: 'swap',
    sourceChain: 42161,
    destinationChain: 42161,
    tokenIn: tokenInAddress,
    tokenOut: tokenOutAddress,
    amount: amountWei,
    recipient: userAddress,
    slippageTolerance: 0.5,
  };
}

/**
 * Helper: Build bridge intent
 */
function buildBridgeIntent(
  amount: string,
  token: string,
  chain: string,
  userAddress: string
): ParsedIntent {
  const tokenAddress = getTokenAddress(token, 42161);
  const destChainId = getChainId(chain);
  const amountWei = parseAmount(amount, token);

  return {
    action: 'bridge',
    sourceChain: 42161,
    destinationChain: destChainId,
    tokenIn: tokenAddress,
    amount: amountWei,
    recipient: userAddress,
    slippageTolerance: 0.5,
  };
}

/**
 * Get token address by symbol
 */
function getTokenAddress(symbol: string, chainId: number): string {
  const tokenMap: Record<string, Record<number, string>> = {
    eth: {
      42161: '0x0000000000000000000000000000000000000000',
      8453: '0x0000000000000000000000000000000000000000',
      10: '0x0000000000000000000000000000000000000000',
    },
    usdc: {
      42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    },
  };

  return tokenMap[symbol.toLowerCase()]?.[chainId] || '0x0000000000000000000000000000000000000000';
}

/**
 * Get chain ID by name
 */
function getChainId(name: string): number {
  const chainMap: Record<string, number> = {
    arbitrum: 42161,
    base: 8453,
    optimism: 10,
    op: 10,
  };

  return chainMap[name.toLowerCase()] || 42161;
}

/**
 * Parse amount to wei (simplified - assumes 18 decimals)
 */
function parseAmount(amount: string, token: string): string {
  const num = parseFloat(amount);
  // USDC has 6 decimals, ETH has 18
  const decimals = token.toLowerCase() === 'usdc' ? 6 : 18;
  const wei = BigInt(Math.floor(num * 10 ** decimals));
  return wei.toString();
}
