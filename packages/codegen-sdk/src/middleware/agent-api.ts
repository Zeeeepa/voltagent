import { 
  AgentAPIMiddlewareConfig,
  AgentAPIRequest,
  AgentAPIResponse,
  CodegenSDKError
} from '../types';

/**
 * AgentAPI Middleware for request processing, caching, and monitoring
 * Provides unified middleware layer for all SDK operations
 */
export class AgentAPIMiddleware {
  private config: AgentAPIMiddlewareConfig;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private metrics: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsByType: Record<string, number>;
  } = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    requestsByType: {}
  };
  private rateLimitTracker: Map<string, number[]> = new Map();

  constructor(config: AgentAPIMiddlewareConfig = {}) {
    this.config = {
      enableLogging: true,
      enableMetrics: true,
      enableCaching: true,
      cacheTimeout: 300000, // 5 minutes
      rateLimiting: {
        enabled: false,
        requestsPerMinute: 60
      },
      ...config
    };
  }

  /**
   * Process request through middleware pipeline
   */
  async processRequest<T>(
    request: AgentAPIRequest,
    handler: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Log request if enabled
      if (this.config.enableLogging) {
        this.logRequest(request);
      }

      // Check rate limiting
      if (this.config.rateLimiting?.enabled) {
        this.checkRateLimit(request);
      }

      // Check cache if enabled
      if (this.config.enableCaching) {
        const cachedResult = this.getCachedResult<T>(request);
        if (cachedResult) {
          this.updateMetrics(request.type, Date.now() - startTime, true);
          return cachedResult;
        }
      }

      // Execute handler
      const result = await handler();

      // Cache result if enabled
      if (this.config.enableCaching) {
        this.cacheResult(request, result);
      }

      // Update metrics
      if (this.config.enableMetrics) {
        this.updateMetrics(request.type, Date.now() - startTime, true);
      }

      // Log success if enabled
      if (this.config.enableLogging) {
        this.logSuccess(request, Date.now() - startTime);
      }

      return result;

    } catch (error) {
      // Update metrics for failure
      if (this.config.enableMetrics) {
        this.updateMetrics(request.type, Date.now() - startTime, false);
      }

      // Log error if enabled
      if (this.config.enableLogging) {
        this.logError(request, error, Date.now() - startTime);
      }

      throw error;
    }
  }

  /**
   * Create standardized API response
   */
  createResponse<T>(
    request: AgentAPIRequest,
    data?: T,
    error?: { code: string; message: string; details?: any }
  ): AgentAPIResponse<T> {
    return {
      id: request.id,
      success: !error,
      data,
      error,
      metadata: {
        processingTime: 0, // Will be set by caller
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };
  }

  /**
   * Check rate limiting
   */
  private checkRateLimit(request: AgentAPIRequest): void {
    if (!this.config.rateLimiting?.enabled) return;

    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    const clientId = this.getClientId(request);
    
    // Get existing requests for this client
    const clientRequests = this.rateLimitTracker.get(clientId) || [];
    
    // Filter to only requests within the current window
    const recentRequests = clientRequests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (recentRequests.length >= (this.config.rateLimiting?.requestsPerMinute || 60)) {
      throw new CodegenSDKError(
        'Rate limit exceeded. Please try again later.',
        'RATE_LIMIT_EXCEEDED',
        { 
          limit: this.config.rateLimiting?.requestsPerMinute,
          windowStart: new Date(windowStart).toISOString()
        }
      );
    }

    // Add current request
    recentRequests.push(now);
    this.rateLimitTracker.set(clientId, recentRequests);
  }

  /**
   * Get client ID for rate limiting
   */
  private getClientId(request: AgentAPIRequest): string {
    // In a real implementation, this would extract client ID from request metadata
    return request.metadata?.clientId || 'default';
  }

  /**
   * Get cached result if available and not expired
   */
  private getCachedResult<T>(request: AgentAPIRequest): T | null {
    const cacheKey = this.generateCacheKey(request);
    const cached = this.cache.get(cacheKey);
    
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > (this.config.cacheTimeout || 300000);
    if (isExpired) {
      this.cache.delete(cacheKey);
      return null;
    }
    
    return cached.data as T;
  }

  /**
   * Cache result
   */
  private cacheResult<T>(request: AgentAPIRequest, result: T): void {
    const cacheKey = this.generateCacheKey(request);
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(request: AgentAPIRequest): string {
    // Create a deterministic key based on request type and payload
    const payloadHash = this.hashObject(request.payload);
    return `${request.type}:${payloadHash}`;
  }

  /**
   * Simple hash function for objects
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Update metrics
   */
  private updateMetrics(
    requestType: string,
    responseTime: number,
    success: boolean
  ): void {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update average response time
    const totalResponseTime = this.metrics.averageResponseTime * (this.metrics.totalRequests - 1);
    this.metrics.averageResponseTime = (totalResponseTime + responseTime) / this.metrics.totalRequests;

    // Update requests by type
    this.metrics.requestsByType[requestType] = (this.metrics.requestsByType[requestType] || 0) + 1;
  }

  /**
   * Log request
   */
  private logRequest(request: AgentAPIRequest): void {
    console.log(`[AgentAPI] ${new Date().toISOString()} - Processing ${request.type} request ${request.id}`);
    
    if (request.metadata) {
      console.log(`[AgentAPI] Request metadata:`, request.metadata);
    }
  }

  /**
   * Log successful response
   */
  private logSuccess(request: AgentAPIRequest, responseTime: number): void {
    console.log(`[AgentAPI] ${new Date().toISOString()} - Successfully processed ${request.type} request ${request.id} in ${responseTime}ms`);
  }

  /**
   * Log error
   */
  private logError(request: AgentAPIRequest, error: any, responseTime: number): void {
    console.error(`[AgentAPI] ${new Date().toISOString()} - Failed to process ${request.type} request ${request.id} after ${responseTime}ms`);
    console.error(`[AgentAPI] Error:`, error);
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      rateLimitTrackerSize: this.rateLimitTracker.size,
      successRate: this.metrics.totalRequests > 0 
        ? (this.metrics.successfulRequests / this.metrics.totalRequests) * 100 
        : 0
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear rate limit tracker
   */
  clearRateLimitTracker(): void {
    this.rateLimitTracker.clear();
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      requestsByType: {}
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    let expiredEntries = 0;
    let validEntries = 0;

    for (const [key, cached] of this.cache.entries()) {
      const isExpired = now - cached.timestamp > (this.config.cacheTimeout || 300000);
      if (isExpired) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      cacheTimeout: this.config.cacheTimeout,
      hitRate: 0 // Would need to track cache hits vs misses for accurate calculation
    };
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredCache(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, cached] of this.cache.entries()) {
      const isExpired = now - cached.timestamp > (this.config.cacheTimeout || 300000);
      if (isExpired) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Update middleware configuration
   */
  updateConfig(newConfig: Partial<AgentAPIMiddlewareConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): AgentAPIMiddlewareConfig {
    return { ...this.config };
  }

  /**
   * Health check for middleware
   */
  healthCheck() {
    const metrics = this.getMetrics();
    const cacheStats = this.getCacheStats();
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics,
      cache: cacheStats,
      config: {
        loggingEnabled: this.config.enableLogging,
        metricsEnabled: this.config.enableMetrics,
        cachingEnabled: this.config.enableCaching,
        rateLimitingEnabled: this.config.rateLimiting?.enabled
      }
    };
  }
}

