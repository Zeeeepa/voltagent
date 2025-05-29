import { EventEmitter } from "events";
import type { CacheConfig } from "../orchestrator/types";

/**
 * Cache entry interface
 */
interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: Date;
  ttl: number;
  accessCount: number;
  lastAccessed: Date;
  size: number;
  namespace?: string;
  metadata?: Record<string, any>;
}

/**
 * Cache statistics interface
 */
interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  evictionCount: number;
  namespaces: Record<string, number>;
}

/**
 * Cache Manager for database query result caching, API response caching, and file system operation caching
 */
export class CacheManager extends EventEmitter {
  private cache: Map<string, CacheEntry> = new Map();
  private config: CacheConfig;
  private stats: CacheStats;
  private cleanupInterval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(config: CacheConfig) {
    super();
    this.config = config;
    this.stats = {
      totalEntries: 0,
      totalSize: 0,
      hitCount: 0,
      missCount: 0,
      hitRate: 0,
      evictionCount: 0,
      namespaces: {},
    };
  }

  /**
   * Start the cache manager
   */
  public start(): void {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.startCleanupLoop();
    this.emit("cache:started");
  }

  /**
   * Stop the cache manager
   */
  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.emit("cache:stopped");
  }

  /**
   * Set a value in the cache
   */
  public set<T>(
    key: string,
    value: T,
    options: {
      ttl?: number;
      namespace?: string;
      metadata?: Record<string, any>;
    } = {}
  ): void {
    const fullKey = this.buildKey(key, options.namespace);
    const ttl = options.ttl || this.config.ttl;
    const size = this.calculateSize(value);

    // Check if we need to evict entries
    if (this.config.maxSize && this.stats.totalSize + size > this.config.maxSize) {
      this.evictEntries(size);
    }

    const entry: CacheEntry<T> = {
      key: fullKey,
      value,
      timestamp: new Date(),
      ttl,
      accessCount: 0,
      lastAccessed: new Date(),
      size,
      namespace: options.namespace,
      metadata: options.metadata,
    };

    // Remove existing entry if present
    const existingEntry = this.cache.get(fullKey);
    if (existingEntry) {
      this.stats.totalSize -= existingEntry.size;
      this.updateNamespaceStats(existingEntry.namespace, -1);
    } else {
      this.stats.totalEntries++;
    }

    this.cache.set(fullKey, entry);
    this.stats.totalSize += size;
    this.updateNamespaceStats(options.namespace, 1);

    this.emit("cache:set", { key: fullKey, size, namespace: options.namespace });
  }

  /**
   * Get a value from the cache
   */
  public get<T>(key: string, namespace?: string): T | null {
    const fullKey = this.buildKey(key, namespace);
    const entry = this.cache.get(fullKey) as CacheEntry<T> | undefined;

    if (!entry) {
      this.stats.missCount++;
      this.updateHitRate();
      this.emit("cache:miss", { key: fullKey, namespace });
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.delete(key, namespace);
      this.stats.missCount++;
      this.updateHitRate();
      this.emit("cache:expired", { key: fullKey, namespace });
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = new Date();

    this.stats.hitCount++;
    this.updateHitRate();
    this.emit("cache:hit", { key: fullKey, namespace });

    return entry.value;
  }

  /**
   * Delete a value from the cache
   */
  public delete(key: string, namespace?: string): boolean {
    const fullKey = this.buildKey(key, namespace);
    const entry = this.cache.get(fullKey);

    if (!entry) {
      return false;
    }

    this.cache.delete(fullKey);
    this.stats.totalEntries--;
    this.stats.totalSize -= entry.size;
    this.updateNamespaceStats(entry.namespace, -1);

    this.emit("cache:delete", { key: fullKey, namespace });
    return true;
  }

  /**
   * Check if a key exists in the cache
   */
  public has(key: string, namespace?: string): boolean {
    const fullKey = this.buildKey(key, namespace);
    const entry = this.cache.get(fullKey);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key, namespace);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  public clear(namespace?: string): void {
    if (namespace) {
      // Clear specific namespace
      const namespacedKey = this.buildKey("", namespace);
      for (const [key, entry] of this.cache.entries()) {
        if (key.startsWith(namespacedKey)) {
          this.cache.delete(key);
          this.stats.totalEntries--;
          this.stats.totalSize -= entry.size;
        }
      }
      this.stats.namespaces[namespace] = 0;
    } else {
      // Clear all
      this.cache.clear();
      this.stats.totalEntries = 0;
      this.stats.totalSize = 0;
      this.stats.namespaces = {};
    }

    this.emit("cache:cleared", { namespace });
  }

  /**
   * Get cache statistics
   */
  public getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get all keys in the cache
   */
  public keys(namespace?: string): string[] {
    if (namespace) {
      const namespacedKey = this.buildKey("", namespace);
      return Array.from(this.cache.keys())
        .filter(key => key.startsWith(namespacedKey))
        .map(key => key.substring(namespacedKey.length));
    }
    
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entries by namespace
   */
  public getByNamespace<T>(namespace: string): Record<string, T> {
    const namespacedKey = this.buildKey("", namespace);
    const result: Record<string, T> = {};

    for (const [key, entry] of this.cache.entries()) {
      if (key.startsWith(namespacedKey)) {
        const originalKey = key.substring(namespacedKey.length);
        if (!this.isExpired(entry)) {
          result[originalKey] = entry.value;
        }
      }
    }

    return result;
  }

  /**
   * Get or set a value (cache-aside pattern)
   */
  public async getOrSet<T>(
    key: string,
    factory: () => Promise<T> | T,
    options: {
      ttl?: number;
      namespace?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<T> {
    const cached = this.get<T>(key, options.namespace);
    
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, options);
    return value;
  }

  /**
   * Memoize a function with caching
   */
  public memoize<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => Promise<TReturn> | TReturn,
    options: {
      keyGenerator?: (...args: TArgs) => string;
      ttl?: number;
      namespace?: string;
    } = {}
  ): (...args: TArgs) => Promise<TReturn> {
    const keyGenerator = options.keyGenerator || ((...args) => JSON.stringify(args));
    
    return async (...args: TArgs): Promise<TReturn> => {
      const key = keyGenerator(...args);
      return this.getOrSet(key, () => fn(...args), options);
    };
  }

  /**
   * Invalidate cache entries by pattern
   */
  public invalidatePattern(pattern: RegExp, namespace?: string): number {
    let invalidatedCount = 0;
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (namespace && entry.namespace !== namespace) {
        continue;
      }

      const testKey = namespace ? key.substring(this.buildKey("", namespace).length) : key;
      if (pattern.test(testKey)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        this.stats.totalEntries--;
        this.stats.totalSize -= entry.size;
        this.updateNamespaceStats(entry.namespace, -1);
        invalidatedCount++;
      }
    }

    this.emit("cache:pattern_invalidated", { pattern: pattern.source, namespace, count: invalidatedCount });
    return invalidatedCount;
  }

  /**
   * Get cache configuration
   */
  public getConfig(): CacheConfig {
    return { ...this.config };
  }

  /**
   * Update cache configuration
   */
  public updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit("cache:config_updated", this.config);
  }

  /**
   * Export cache data
   */
  public export(namespace?: string): Record<string, any> {
    const data: Record<string, any> = {};

    for (const [key, entry] of this.cache.entries()) {
      if (namespace && entry.namespace !== namespace) {
        continue;
      }

      if (!this.isExpired(entry)) {
        const exportKey = namespace ? key.substring(this.buildKey("", namespace).length) : key;
        data[exportKey] = {
          value: entry.value,
          timestamp: entry.timestamp,
          ttl: entry.ttl,
          metadata: entry.metadata,
        };
      }
    }

    return data;
  }

  /**
   * Import cache data
   */
  public import(data: Record<string, any>, namespace?: string): void {
    for (const [key, entryData] of Object.entries(data)) {
      this.set(key, entryData.value, {
        ttl: entryData.ttl,
        namespace,
        metadata: entryData.metadata,
      });
    }

    this.emit("cache:imported", { namespace, count: Object.keys(data).length });
  }

  /**
   * Build full cache key with namespace
   */
  private buildKey(key: string, namespace?: string): string {
    if (namespace) {
      return `${namespace}:${key}`;
    }
    return key;
  }

  /**
   * Check if cache entry has expired
   */
  private isExpired(entry: CacheEntry): boolean {
    const now = Date.now();
    const entryTime = entry.timestamp.getTime();
    return (now - entryTime) > entry.ttl;
  }

  /**
   * Calculate size of a value
   */
  private calculateSize(value: any): number {
    if (typeof value === "string") {
      return value.length * 2; // Approximate UTF-16 encoding
    }
    
    if (typeof value === "number") {
      return 8; // 64-bit number
    }
    
    if (typeof value === "boolean") {
      return 1;
    }
    
    if (value === null || value === undefined) {
      return 0;
    }
    
    // For objects and arrays, use JSON string length as approximation
    try {
      return JSON.stringify(value).length * 2;
    } catch {
      return 100; // Default size for non-serializable objects
    }
  }

  /**
   * Evict entries to make space
   */
  private evictEntries(requiredSpace: number): void {
    const entries = Array.from(this.cache.entries());
    let freedSpace = 0;

    // Sort entries based on eviction strategy
    switch (this.config.strategy) {
      case "lru":
        entries.sort((a, b) => a[1].lastAccessed.getTime() - b[1].lastAccessed.getTime());
        break;
      case "lfu":
        entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
        break;
      case "fifo":
        entries.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
        break;
    }

    // Evict entries until we have enough space
    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSpace) {
        break;
      }

      this.cache.delete(key);
      this.stats.totalEntries--;
      this.stats.totalSize -= entry.size;
      this.stats.evictionCount++;
      this.updateNamespaceStats(entry.namespace, -1);
      freedSpace += entry.size;

      this.emit("cache:evicted", { key, size: entry.size, strategy: this.config.strategy });
    }
  }

  /**
   * Update namespace statistics
   */
  private updateNamespaceStats(namespace: string | undefined, delta: number): void {
    if (namespace) {
      this.stats.namespaces[namespace] = (this.stats.namespaces[namespace] || 0) + delta;
      if (this.stats.namespaces[namespace] <= 0) {
        delete this.stats.namespaces[namespace];
      }
    }
  }

  /**
   * Update hit rate statistics
   */
  private updateHitRate(): void {
    const totalRequests = this.stats.hitCount + this.stats.missCount;
    this.stats.hitRate = totalRequests > 0 ? this.stats.hitCount / totalRequests : 0;
  }

  /**
   * Start cleanup loop for expired entries
   */
  private startCleanupLoop(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 60000); // Run every minute
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        this.stats.totalEntries--;
        this.stats.totalSize -= entry.size;
        this.updateNamespaceStats(entry.namespace, -1);
      }
    }

    if (expiredKeys.length > 0) {
      this.emit("cache:cleanup", { expiredCount: expiredKeys.length });
    }
  }
}

