/**
 * cache-utils.ts
 * Utility functions for caching in the task management system
 */

import { contextManager } from './context-manager';
import { Logger } from '../types';

/**
 * Options for the getCachedOrExecute function
 */
interface CacheOptions {
  /** Cache key to use */
  cacheKey: string;
  /** Function to execute if cache miss */
  actionFn: () => Promise<any>;
  /** Logger instance */
  log?: Logger;
  /** Time to live in milliseconds (optional, uses cache default if not specified) */
  ttl?: number;
  /** Whether to force execution even if cached */
  forceExecution?: boolean;
}

/**
 * Get a value from cache or execute a function to get it
 * @param options - Cache options
 * @returns Result with data and cache status
 */
export async function getCachedOrExecute(options: CacheOptions): Promise<any> {
  const { cacheKey, actionFn, log, forceExecution = false } = options;

  // Check if we should use the cache
  if (!forceExecution) {
    // Try to get from cache
    const cachedResult = contextManager.getCachedData(cacheKey);
    if (cachedResult !== undefined) {
      log?.info(`Cache hit for key: ${cacheKey}`);
      return { ...cachedResult, fromCache: true };
    }
    log?.info(`Cache miss for key: ${cacheKey}`);
  } else {
    log?.info(`Forced execution (bypassing cache) for key: ${cacheKey}`);
  }

  // Execute the action function
  try {
    log?.info(`Executing action function for key: ${cacheKey}`);
    const result = await actionFn();
    
    // Cache the result if it was successful
    if (result.success) {
      log?.info(`Caching successful result for key: ${cacheKey}`);
      contextManager.setCachedData(cacheKey, result);
    } else {
      log?.info(`Not caching failed result for key: ${cacheKey}`);
    }
    
    // Return the result with fromCache flag
    return { ...result, fromCache: false };
  } catch (error) {
    log?.error(`Error executing action for key ${cacheKey}: ${(error as Error).message}`);
    throw error;
  }
}

/**
 * Invalidate a cache entry
 * @param cacheKey - Key to invalidate
 * @param log - Logger instance
 */
export function invalidateCache(cacheKey: string, log?: Logger): void {
  log?.info(`Invalidating cache for key: ${cacheKey}`);
  contextManager.invalidateCacheKey(cacheKey);
}

/**
 * Get cache statistics
 * @returns Cache statistics
 */
export function getCacheStats(): Record<string, any> {
  return contextManager.getStats();
}

