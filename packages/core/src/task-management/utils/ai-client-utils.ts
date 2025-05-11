/**
 * ai-client-utils.ts
 * Utility functions for initializing AI clients in task management context
 */

import { Anthropic } from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Default model configuration
export const DEFAULT_MODEL_CONFIG = {
  model: 'claude-3-7-sonnet-20250219',
  maxTokens: 64000,
  temperature: 0.2
};

/**
 * Session interface for AI client utilities
 */
export interface Session {
  env?: Record<string, string>;
}

/**
 * Logger interface for AI client utilities
 */
export interface Logger {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
}

/**
 * Get an Anthropic client instance initialized with session environment variables
 * @param session - Session object containing environment variables
 * @param log - Logger object to use (defaults to console)
 * @returns Anthropic client instance
 * @throws Error If API key is missing
 */
export function getAnthropicClientForTaskManager(
  session?: Session, 
  log: Logger = console
): Anthropic {
  try {
    // Extract API key from session.env or fall back to environment variables
    const apiKey =
      session?.env?.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY not found in session environment or process.env'
      );
    }

    // Initialize and return a new Anthropic client
    return new Anthropic({
      apiKey,
      defaultHeaders: {
        'anthropic-beta': 'output-128k-2025-02-19' // Include header for increased token limit
      }
    });
  } catch (error: any) {
    log.error(`Failed to initialize Anthropic client: ${error.message}`);
    throw error;
  }
}

/**
 * Get a Perplexity client instance initialized with session environment variables
 * @param session - Session object containing environment variables
 * @param log - Logger object to use (defaults to console)
 * @returns OpenAI client configured for Perplexity API
 * @throws Error If API key is missing or OpenAI package can't be imported
 */
export async function getPerplexityClientForTaskManager(
  session?: Session, 
  log: Logger = console
): Promise<any> {
  try {
    // Extract API key from session.env or fall back to environment variables
    const apiKey =
      session?.env?.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY;

    if (!apiKey) {
      throw new Error(
        'PERPLEXITY_API_KEY not found in session environment or process.env'
      );
    }

    // Dynamically import OpenAI (it may not be used in all contexts)
    const { default: OpenAI } = await import('openai');

    // Initialize and return a new OpenAI client configured for Perplexity
    return new OpenAI({
      apiKey,
      baseURL: 'https://api.perplexity.ai'
    });
  } catch (error: any) {
    log.error(`Failed to initialize Perplexity client: ${error.message}`);
    throw error;
  }
}

/**
 * Get model configuration from session environment or fall back to defaults
 * @param session - Session object containing environment variables
 * @param defaults - Default model configuration to use if not in session
 * @returns Model configuration with model, maxTokens, and temperature
 */
export function getModelConfig(
  session?: Session, 
  defaults = DEFAULT_MODEL_CONFIG
): { model: string; maxTokens: number; temperature: number } {
  // Get values from session or fall back to defaults
  return {
    model: session?.env?.MODEL || defaults.model,
    maxTokens: parseInt(session?.env?.MAX_TOKENS || String(defaults.maxTokens)),
    temperature: parseFloat(session?.env?.TEMPERATURE || String(defaults.temperature))
  };
}

/**
 * Options for selecting the best available AI model
 */
export interface ModelSelectionOptions {
  /** Whether the operation requires research capabilities */
  requiresResearch?: boolean;
  /** Whether Claude is currently overloaded */
  claudeOverloaded?: boolean;
}

/**
 * Returns the best available AI model based on specified options
 * @param session - Session object containing environment variables
 * @param options - Options for model selection
 * @param log - Logger object to use (defaults to console)
 * @returns Selected model info with type and client
 * @throws Error If no AI models are available
 */
export async function getBestAvailableAIModel(
  session?: Session,
  options: ModelSelectionOptions = {},
  log: Logger = console
): Promise<{ type: string; client: any }> {
  const { requiresResearch = false, claudeOverloaded = false } = options;

  // Test case: When research is needed but no Perplexity, use Claude
  if (
    requiresResearch &&
    !(session?.env?.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY) &&
    (session?.env?.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY)
  ) {
    try {
      log.warn('Perplexity not available for research, using Claude');
      const client = getAnthropicClientForTaskManager(session, log);
      return { type: 'claude', client };
    } catch (error) {
      log.error(`Claude not available: ${(error as Error).message}`);
      throw new Error('No AI models available for research');
    }
  }

  // Regular path: Perplexity for research when available
  if (
    requiresResearch &&
    (session?.env?.PERPLEXITY_API_KEY || process.env.PERPLEXITY_API_KEY)
  ) {
    try {
      const client = await getPerplexityClientForTaskManager(session, log);
      return { type: 'perplexity', client };
    } catch (error) {
      log.warn(`Perplexity not available: ${(error as Error).message}`);
      // Fall through to Claude as backup
    }
  }

  // Test case: Claude for overloaded scenario
  if (
    claudeOverloaded &&
    (session?.env?.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY)
  ) {
    try {
      log.warn(
        'Claude is overloaded but no alternatives are available. Proceeding with Claude anyway.'
      );
      const client = getAnthropicClientForTaskManager(session, log);
      return { type: 'claude', client };
    } catch (error) {
      log.error(
        `Claude not available despite being overloaded: ${(error as Error).message}`
      );
      throw new Error('No AI models available');
    }
  }

  // Default case: Use Claude when available and not overloaded
  if (
    !claudeOverloaded &&
    (session?.env?.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY)
  ) {
    try {
      const client = getAnthropicClientForTaskManager(session, log);
      return { type: 'claude', client };
    } catch (error) {
      log.warn(`Claude not available: ${(error as Error).message}`);
      // Fall through to error if no other options
    }
  }

  // If we got here, no models were successfully initialized
  throw new Error('No AI models available. Please check your API keys.');
}

/**
 * Handle Claude API errors with user-friendly messages
 * @param error - The error from Claude API
 * @returns User-friendly error message
 */
export function handleClaudeError(error: any): string {
  // Check if it's a structured error response
  if (error.type === 'error' && error.error) {
    switch (error.error.type) {
      case 'overloaded_error':
        return 'Claude is currently experiencing high demand and is overloaded. Please wait a few minutes and try again.';
      case 'rate_limit_error':
        return 'You have exceeded the rate limit. Please wait a few minutes before making more requests.';
      case 'invalid_request_error':
        return 'There was an issue with the request format. If this persists, please report it as a bug.';
      default:
        return `Claude API error: ${error.error.message}`;
    }
  }

  // Check for network/timeout errors
  if (error.message?.toLowerCase().includes('timeout')) {
    return 'The request to Claude timed out. Please try again.';
  }
  if (error.message?.toLowerCase().includes('network')) {
    return 'There was a network error connecting to Claude. Please check your internet connection and try again.';
  }

  // Default error message
  return `Error communicating with Claude: ${error.message}`;
}

