/**
 * Advanced Retry Manager
 * Implements intelligent retry strategies with backoff and jitter
 */

import type {
  ClassifiedError,
  AdvancedRetryConfig,
  RetryStrategy,
  ErrorCategory,
} from "./types";

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: AdvancedRetryConfig = {
  maxRetries: 3,
  strategy: RetryStrategy.EXPONENTIAL,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: 0.1,
  shouldRetry: (error: ClassifiedError) => error.retryable,
};

/**
 * Retry manager that implements various retry strategies
 */
export class RetryManager {
  private config: AdvancedRetryConfig;

  constructor(config?: Partial<AdvancedRetryConfig>) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Executes an operation with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string = "unknown",
    customConfig?: Partial<AdvancedRetryConfig>
  ): Promise<T> {
    const config = { ...this.config, ...customConfig };
    let lastError: ClassifiedError | null = null;
    let attempt = 0;

    while (attempt <= config.maxRetries) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        attempt++;
        lastError = error as ClassifiedError;

        // Check if we should retry
        if (attempt > config.maxRetries || !this.shouldRetry(lastError, attempt, config)) {
          if (config.onMaxRetriesExceeded) {
            await config.onMaxRetriesExceeded(lastError);
          }
          throw lastError;
        }

        // Calculate delay
        const delay = this.calculateDelay(attempt, lastError, config);

        // Call retry callback
        if (config.onRetry) {
          await config.onRetry(lastError, attempt, delay);
        }

        // Wait before retry
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Determines if an error should be retried
   */
  private shouldRetry(
    error: ClassifiedError,
    attempt: number,
    config: AdvancedRetryConfig
  ): boolean {
    // Use custom shouldRetry function if provided
    if (config.shouldRetry) {
      return config.shouldRetry(error, attempt);
    }

    // Default retry logic
    if (!error.retryable) {
      return false;
    }

    // Don't retry certain error categories
    const nonRetryableCategories = [
      ErrorCategory.AUTH,
      ErrorCategory.VALIDATION,
      ErrorCategory.PERMANENT,
    ];

    if (nonRetryableCategories.includes(error.category)) {
      return false;
    }

    return true;
  }

  /**
   * Calculates delay for next retry attempt
   */
  private calculateDelay(
    attempt: number,
    error: ClassifiedError,
    config: AdvancedRetryConfig
  ): number {
    let delay: number;

    // Use suggested delay from error if available
    if (error.suggestedDelay && error.suggestedDelay > 0) {
      delay = error.suggestedDelay;
    } else {
      // Calculate delay based on strategy
      switch (config.strategy) {
        case RetryStrategy.FIXED:
          delay = config.baseDelay;
          break;

        case RetryStrategy.LINEAR:
          delay = config.baseDelay * attempt;
          break;

        case RetryStrategy.EXPONENTIAL:
          delay = config.baseDelay * Math.pow(config.backoffMultiplier || 2, attempt - 1);
          break;

        case RetryStrategy.CUSTOM:
          if (config.customRetryFn) {
            delay = config.customRetryFn(attempt, error);
          } else {
            delay = config.baseDelay;
          }
          break;

        default:
          delay = config.baseDelay;
      }
    }

    // Apply jitter if configured
    if (config.jitter && config.jitter > 0) {
      const jitterAmount = delay * config.jitter;
      const randomJitter = (Math.random() - 0.5) * 2 * jitterAmount;
      delay += randomJitter;
    }

    // Ensure delay is within bounds
    delay = Math.max(0, Math.min(delay, config.maxDelay));

    // Apply category-specific adjustments
    delay = this.applyCategoryAdjustments(delay, error.category);

    return Math.round(delay);
  }

  /**
   * Applies category-specific delay adjustments
   */
  private applyCategoryAdjustments(delay: number, category: ErrorCategory): number {
    switch (category) {
      case ErrorCategory.RATE_LIMIT:
        // Rate limit errors need longer delays
        return Math.max(delay, 30000); // Minimum 30 seconds

      case ErrorCategory.NETWORK:
        // Network errors can be retried more quickly
        return Math.min(delay, 10000); // Maximum 10 seconds

      case ErrorCategory.TRANSIENT:
        // Transient errors use standard delay
        return delay;

      case ErrorCategory.TOOL:
        // Tool errors can be retried quickly
        return Math.min(delay, 5000); // Maximum 5 seconds

      case ErrorCategory.MODEL:
        // Model errors need moderate delays
        return Math.min(delay, 15000); // Maximum 15 seconds

      default:
        return delay;
    }
  }

  /**
   * Updates retry configuration
   */
  updateConfig(config: Partial<AdvancedRetryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets current retry configuration
   */
  getConfig(): AdvancedRetryConfig {
    return { ...this.config };
  }

  /**
   * Sleep utility function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Retry strategy implementations
 */
export class RetryStrategies {
  /**
   * Fixed delay strategy
   */
  static fixed(delay: number): (attempt: number, error: ClassifiedError) => number {
    return () => delay;
  }

  /**
   * Linear backoff strategy
   */
  static linear(baseDelay: number, multiplier: number = 1): (attempt: number, error: ClassifiedError) => number {
    return (attempt: number) => baseDelay * multiplier * attempt;
  }

  /**
   * Exponential backoff strategy
   */
  static exponential(
    baseDelay: number,
    multiplier: number = 2,
    maxDelay: number = 30000
  ): (attempt: number, error: ClassifiedError) => number {
    return (attempt: number) => {
      const delay = baseDelay * Math.pow(multiplier, attempt - 1);
      return Math.min(delay, maxDelay);
    };
  }

  /**
   * Exponential backoff with jitter
   */
  static exponentialWithJitter(
    baseDelay: number,
    multiplier: number = 2,
    maxDelay: number = 30000,
    jitterFactor: number = 0.1
  ): (attempt: number, error: ClassifiedError) => number {
    return (attempt: number) => {
      const delay = baseDelay * Math.pow(multiplier, attempt - 1);
      const jitter = delay * jitterFactor * (Math.random() - 0.5) * 2;
      return Math.min(Math.max(0, delay + jitter), maxDelay);
    };
  }

  /**
   * Fibonacci backoff strategy
   */
  static fibonacci(baseDelay: number, maxDelay: number = 30000): (attempt: number, error: ClassifiedError) => number {
    return (attempt: number) => {
      const fib = this.fibonacciNumber(attempt);
      const delay = baseDelay * fib;
      return Math.min(delay, maxDelay);
    };
  }

  /**
   * Category-aware strategy that adjusts based on error type
   */
  static categoryAware(
    baseDelay: number,
    categoryMultipliers: Map<ErrorCategory, number> = new Map([
      [ErrorCategory.RATE_LIMIT, 10],
      [ErrorCategory.NETWORK, 2],
      [ErrorCategory.TRANSIENT, 3],
      [ErrorCategory.TOOL, 1],
      [ErrorCategory.MODEL, 4],
    ])
  ): (attempt: number, error: ClassifiedError) => number {
    return (attempt: number, error: ClassifiedError) => {
      const multiplier = categoryMultipliers.get(error.category) || 2;
      return baseDelay * Math.pow(multiplier, attempt - 1);
    };
  }

  /**
   * Calculates fibonacci number
   */
  private static fibonacciNumber(n: number): number {
    if (n <= 1) return 1;
    let a = 1, b = 1;
    for (let i = 2; i <= n; i++) {
      [a, b] = [b, a + b];
    }
    return b;
  }
}

/**
 * Default retry manager instance
 */
export const defaultRetryManager = new RetryManager();

