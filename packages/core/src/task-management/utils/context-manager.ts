/**
 * context-manager.ts
 * Context and cache management for Task Management System
 */

import { LRUCache } from 'lru-cache';

/**
 * Configuration options for the ContextManager
 */
export interface ContextManagerConfig {
  /** Maximum number of items in the cache */
  maxCacheSize?: number;
  /** Time to live for cached items in milliseconds */
  ttl?: number;
  /** Maximum size of context window in tokens */
  maxContextSize?: number;
}

/**
 * Context manager for handling caching and context management
 */
export class ContextManager {
  private config: Required<ContextManagerConfig>;
  private cache: LRUCache<string, any>;
  private stats: {
    hits: number;
    misses: number;
    invalidations: number;
  };

  /**
   * Create a new ContextManager instance
   * @param config - Configuration options
   */
  constructor(config: ContextManagerConfig = {}) {
    this.config = {
      maxCacheSize: config.maxCacheSize || 1000,
      ttl: config.ttl || 1000 * 60 * 5, // 5 minutes default
      maxContextSize: config.maxContextSize || 4000
    };

    // Initialize LRU cache for context data
    this.cache = new LRUCache({
      max: this.config.maxCacheSize,
      ttl: this.config.ttl,
      updateAgeOnGet: true
    });

    // Cache statistics
    this.stats = {
      hits: 0,
      misses: 0,
      invalidations: 0
    };
  }

  /**
   * Create a new context or retrieve from cache
   * @param contextId - Unique identifier for the context
   * @param metadata - Additional metadata for the context
   * @returns Context object with metadata
   */
  async getContext(contextId: string, metadata: Record<string, any> = {}): Promise<any> {
    const cacheKey = this._getCacheKey(contextId, metadata);

    // Try to get from cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.stats.hits++;
      return cached;
    }

    this.stats.misses++;

    // Create new context if not in cache
    const context = {
      id: contextId,
      metadata: {
        ...metadata,
        created: new Date().toISOString()
      }
    };

    // Cache the new context
    this.cache.set(cacheKey, context);

    return context;
  }

  /**
   * Update an existing context
   * @param contextId - Context identifier
   * @param updates - Updates to apply to the context
   * @returns Updated context
   */
  async updateContext(contextId: string, updates: Record<string, any>): Promise<any> {
    const context = await this.getContext(contextId);

    // Apply updates to context
    Object.assign(context.metadata, updates);

    // Update cache
    const cacheKey = this._getCacheKey(contextId, context.metadata);
    this.cache.set(cacheKey, context);

    return context;
  }

  /**
   * Invalidate a context in the cache
   * @param contextId - Context identifier
   * @param metadata - Metadata used in the cache key
   */
  invalidateContext(contextId: string, metadata: Record<string, any> = {}): void {
    const cacheKey = this._getCacheKey(contextId, metadata);
    this.cache.delete(cacheKey);
    this.stats.invalidations++;
  }

  /**
   * Get cached data associated with a specific key.
   * Increments cache hit stats if found.
   * @param key - The cache key.
   * @returns The cached data or undefined if not found/expired.
   */
  getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      // Check for undefined specifically, as null/false might be valid cached values
      this.stats.hits++;
      return cached;
    }
    this.stats.misses++;
    return undefined;
  }

  /**
   * Set data in the cache with a specific key.
   * @param key - The cache key.
   * @param data - The data to cache.
   */
  setCachedData(key: string, data: any): void {
    this.cache.set(key, data);
  }

  /**
   * Invalidate a specific cache key.
   * Increments invalidation stats.
   * @param key - The cache key to invalidate.
   */
  invalidateCacheKey(key: string): void {
    this.cache.delete(key);
    this.stats.invalidations++;
  }

  /**
   * Get cache statistics
   * @returns Cache statistics
   */
  getStats(): Record<string, any> {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      invalidations: this.stats.invalidations,
      size: this.cache.size,
      maxSize: this.config.maxCacheSize,
      ttl: this.config.ttl
    };
  }

  /**
   * Generate a cache key from context ID and metadata
   * @private
   * @deprecated No longer used for direct cache key generation outside the manager.
   *             Prefer generating specific keys in calling functions.
   */
  private _getCacheKey(contextId: string, metadata: Record<string, any>): string {
    // Kept for potential backward compatibility or internal use if needed later.
    return `${contextId}:${JSON.stringify(metadata)}`;
  }
}

// Export a singleton instance with default config
export const contextManager = new ContextManager();

