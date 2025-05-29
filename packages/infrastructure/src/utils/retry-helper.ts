export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
}

export class RetryHelper {
  private static defaultOptions: RetryOptions = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
  };

  /**
   * Retry a function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: Error;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === opts.maxAttempts) {
          throw lastError;
        }

        const delay = this.calculateDelay(attempt, opts);
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
        
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Retry with custom condition
   */
  static async retryWithCondition<T>(
    fn: () => Promise<T>,
    shouldRetry: (error: Error, attempt: number) => boolean,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const opts = { ...this.defaultOptions, ...options };
    let lastError: Error;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === opts.maxAttempts || !shouldRetry(lastError, attempt)) {
          throw lastError;
        }

        const delay = this.calculateDelay(attempt, opts);
        console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, lastError.message);
        
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private static calculateDelay(attempt: number, options: RetryOptions): number {
    let delay = options.baseDelay * Math.pow(options.backoffMultiplier, attempt - 1);
    
    // Apply maximum delay limit
    delay = Math.min(delay, options.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (options.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Common retry conditions
   */
  static retryConditions = {
    /**
     * Retry on network errors
     */
    networkErrors: (error: Error): boolean => {
      const networkErrorCodes = [
        "ECONNRESET",
        "ECONNREFUSED", 
        "ETIMEDOUT",
        "ENOTFOUND",
        "EAI_AGAIN",
      ];
      
      return networkErrorCodes.some(code => error.message.includes(code));
    },

    /**
     * Retry on database connection errors
     */
    databaseErrors: (error: Error): boolean => {
      const dbErrorMessages = [
        "connection terminated",
        "connection refused",
        "connection timeout",
        "too many connections",
        "server closed the connection",
      ];
      
      return dbErrorMessages.some(msg => 
        error.message.toLowerCase().includes(msg)
      );
    },

    /**
     * Retry on Redis errors
     */
    redisErrors: (error: Error): boolean => {
      const redisErrorMessages = [
        "connection lost",
        "connection refused",
        "redis connection",
        "connection timeout",
      ];
      
      return redisErrorMessages.some(msg => 
        error.message.toLowerCase().includes(msg)
      );
    },

    /**
     * Retry on temporary errors (5xx status codes)
     */
    temporaryErrors: (error: Error): boolean => {
      // Check for HTTP 5xx errors
      if (error.message.includes("status code 5")) {
        return true;
      }
      
      // Check for rate limiting
      if (error.message.includes("rate limit") || error.message.includes("429")) {
        return true;
      }
      
      return false;
    },
  };

  /**
   * Retry database operations
   */
  static async retryDatabaseOperation<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    return this.retryWithCondition(
      fn,
      this.retryConditions.databaseErrors,
      options
    );
  }

  /**
   * Retry Redis operations
   */
  static async retryRedisOperation<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    return this.retryWithCondition(
      fn,
      this.retryConditions.redisErrors,
      options
    );
  }

  /**
   * Retry network operations
   */
  static async retryNetworkOperation<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    return this.retryWithCondition(
      fn,
      (error) => 
        this.retryConditions.networkErrors(error) || 
        this.retryConditions.temporaryErrors(error),
      options
    );
  }
}

