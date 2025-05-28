/**
 * Database Middleware Manager
 * 
 * Middleware layer for query transformation, caching,
 * and cross-cutting concerns
 */

type QueryTransformer = (query: string, params?: any[]) => Promise<{ query: string; params?: any[] }>;
type QueryInterceptor = (query: string, params?: any[]) => Promise<boolean>;

interface MiddlewareContext {
  startTime: number;
  metadata: Map<string, any>;
}

/**
 * Database middleware manager
 */
export class DatabaseMiddleware {
  private transformers: QueryTransformer[] = [];
  private interceptors: QueryInterceptor[] = [];
  private cache: Map<string, { result: any; timestamp: number; ttl: number }> = new Map();

  /**
   * Add a query transformer
   */
  addTransformer(transformer: QueryTransformer): void {
    this.transformers.push(transformer);
  }

  /**
   * Add a query interceptor
   */
  addInterceptor(interceptor: QueryInterceptor): void {
    this.interceptors.push(interceptor);
  }

  /**
   * Transform a query through all registered transformers
   */
  async transformQuery(query: string, params?: any[]): Promise<{ query: string; params?: any[] }> {
    let currentQuery = query;
    let currentParams = params;

    // Apply all transformers in sequence
    for (const transformer of this.transformers) {
      const result = await transformer(currentQuery, currentParams);
      currentQuery = result.query;
      currentParams = result.params;
    }

    return { query: currentQuery, params: currentParams };
  }

  /**
   * Check if query should be intercepted
   */
  async shouldIntercept(query: string, params?: any[]): Promise<boolean> {
    for (const interceptor of this.interceptors) {
      const shouldIntercept = await interceptor(query, params);
      if (shouldIntercept) {
        return true;
      }
    }
    return false;
  }

  /**
   * Cache query result
   */
  cacheResult(key: string, result: any, ttlMs = 300000): void { // 5 minutes default
    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  /**
   * Get cached result
   */
  getCachedResult(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.result;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    // This would need to track hits/misses for accurate hit rate
    return {
      size: this.cache.size,
      hitRate: 0, // Would need to implement hit/miss tracking
    };
  }
}

// Built-in transformers

/**
 * Query logging transformer
 */
export function createLoggingTransformer(enabled = true): QueryTransformer {
  return async (query: string, params?: any[]) => {
    if (enabled) {
      console.log('[DB Query]', query, params);
    }
    return { query, params };
  };
}

/**
 * Query sanitization transformer
 */
export function createSanitizationTransformer(): QueryTransformer {
  return async (query: string, params?: any[]) => {
    // Basic SQL injection prevention
    const sanitizedQuery = query
      .replace(/;\s*--/g, '') // Remove comment injections
      .replace(/;\s*\/\*/g, '') // Remove block comment injections
      .trim();

    return { query: sanitizedQuery, params };
  };
}

/**
 * Query timeout transformer
 */
export function createTimeoutTransformer(timeoutMs = 30000): QueryTransformer {
  return async (query: string, params?: any[]) => {
    // Add timeout hint to query (implementation depends on database)
    const timeoutQuery = `/* timeout: ${timeoutMs}ms */ ${query}`;
    return { query: timeoutQuery, params };
  };
}

// Built-in interceptors

/**
 * Dangerous query interceptor
 */
export function createDangerousQueryInterceptor(): QueryInterceptor {
  const dangerousPatterns = [
    /DROP\s+TABLE/i,
    /DELETE\s+FROM\s+\w+\s*$/i, // DELETE without WHERE
    /UPDATE\s+\w+\s+SET\s+.*\s*$/i, // UPDATE without WHERE
    /TRUNCATE/i,
  ];

  return async (query: string) => {
    return dangerousPatterns.some(pattern => pattern.test(query));
  };
}

/**
 * Rate limiting interceptor
 */
export function createRateLimitInterceptor(maxQueriesPerMinute = 1000): QueryInterceptor {
  const queryTimes: number[] = [];

  return async (query: string) => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove old entries
    while (queryTimes.length > 0 && queryTimes[0] < oneMinuteAgo) {
      queryTimes.shift();
    }

    // Check if rate limit exceeded
    if (queryTimes.length >= maxQueriesPerMinute) {
      return true; // Intercept (block) the query
    }

    // Add current query time
    queryTimes.push(now);
    return false;
  };
}

