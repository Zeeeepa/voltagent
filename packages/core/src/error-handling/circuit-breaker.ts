/**
 * Circuit Breaker Implementation
 * Provides resilience by preventing cascading failures
 */

import type {
  CircuitBreakerConfig,
  CircuitBreakerState,
  ClassifiedError,
} from "./types";

/**
 * Default circuit breaker configuration
 */
const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  successThreshold: 3,
  timeWindow: 60000, // 1 minute
  timeout: 30000, // 30 seconds
};

/**
 * Circuit breaker failure record
 */
interface FailureRecord {
  timestamp: Date;
  error: ClassifiedError;
}

/**
 * Circuit breaker success record
 */
interface SuccessRecord {
  timestamp: Date;
}

/**
 * Circuit breaker that prevents cascading failures
 */
export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: FailureRecord[] = [];
  private successes: SuccessRecord[] = [];
  private lastFailureTime: Date | null = null;
  private halfOpenAttempts = 0;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
  }

  /**
   * Executes an operation through the circuit breaker
   */
  async execute<T>(
    operation: () => Promise<T>,
    operationName: string = "unknown"
  ): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        throw new Error(`Circuit breaker is OPEN for operation: ${operationName}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as ClassifiedError);
      throw error;
    }
  }

  /**
   * Gets current circuit breaker state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Gets circuit breaker metrics
   */
  getMetrics() {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.timeWindow);

    const recentFailures = this.failures.filter(f => f.timestamp >= windowStart);
    const recentSuccesses = this.successes.filter(s => s.timestamp >= windowStart);

    return {
      state: this.state,
      failureCount: recentFailures.length,
      successCount: recentSuccesses.length,
      failureRate: recentFailures.length / (recentFailures.length + recentSuccesses.length) || 0,
      lastFailureTime: this.lastFailureTime,
      halfOpenAttempts: this.halfOpenAttempts,
    };
  }

  /**
   * Resets the circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failures = [];
    this.successes = [];
    this.lastFailureTime = null;
    this.halfOpenAttempts = 0;
  }

  /**
   * Forces the circuit breaker to open state
   */
  forceOpen(): void {
    this.transitionToOpen();
  }

  /**
   * Updates circuit breaker configuration
   */
  updateConfig(config: Partial<CircuitBreakerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Handles successful operation
   */
  private onSuccess(): void {
    const now = new Date();
    this.successes.push({ timestamp: now });

    // Clean old records
    this.cleanOldRecords();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.halfOpenAttempts++;
      
      // Check if we have enough successes to close the circuit
      const recentSuccesses = this.getRecentSuccesses();
      if (recentSuccesses.length >= this.config.successThreshold) {
        this.transitionToClosed();
      }
    }
  }

  /**
   * Handles failed operation
   */
  private onFailure(error: ClassifiedError): void {
    const now = new Date();
    this.failures.push({ timestamp: now, error });
    this.lastFailureTime = now;

    // Clean old records
    this.cleanOldRecords();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // Any failure in half-open state opens the circuit
      this.transitionToOpen();
    } else if (this.state === CircuitBreakerState.CLOSED) {
      // Check if we should open the circuit
      const recentFailures = this.getRecentFailures();
      if (recentFailures.length >= this.config.failureThreshold) {
        this.transitionToOpen();
      }
    }
  }

  /**
   * Checks if circuit should attempt reset from open to half-open
   */
  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    
    const now = new Date();
    const timeSinceLastFailure = now.getTime() - this.lastFailureTime.getTime();
    
    return timeSinceLastFailure >= this.config.timeout;
  }

  /**
   * Transitions circuit to closed state
   */
  private transitionToClosed(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.halfOpenAttempts = 0;
    
    if (this.config.onClose) {
      this.config.onClose();
    }
  }

  /**
   * Transitions circuit to open state
   */
  private transitionToOpen(): void {
    this.state = CircuitBreakerState.OPEN;
    this.halfOpenAttempts = 0;
    
    if (this.config.onOpen) {
      this.config.onOpen();
    }
  }

  /**
   * Transitions circuit to half-open state
   */
  private transitionToHalfOpen(): void {
    this.state = CircuitBreakerState.HALF_OPEN;
    this.halfOpenAttempts = 0;
    
    if (this.config.onHalfOpen) {
      this.config.onHalfOpen();
    }
  }

  /**
   * Gets recent failures within time window
   */
  private getRecentFailures(): FailureRecord[] {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.timeWindow);
    return this.failures.filter(f => f.timestamp >= windowStart);
  }

  /**
   * Gets recent successes within time window
   */
  private getRecentSuccesses(): SuccessRecord[] {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.timeWindow);
    return this.successes.filter(s => s.timestamp >= windowStart);
  }

  /**
   * Cleans old records outside time window
   */
  private cleanOldRecords(): void {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.timeWindow);

    this.failures = this.failures.filter(f => f.timestamp >= windowStart);
    this.successes = this.successes.filter(s => s.timestamp >= windowStart);
  }
}

/**
 * Circuit breaker registry for managing multiple circuit breakers
 */
export class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  /**
   * Gets or creates a circuit breaker for the given key
   */
  getBreaker(key: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(key)) {
      this.breakers.set(key, new CircuitBreaker(config));
    }
    return this.breakers.get(key)!;
  }

  /**
   * Removes a circuit breaker
   */
  removeBreaker(key: string): boolean {
    return this.breakers.delete(key);
  }

  /**
   * Gets all circuit breaker keys
   */
  getKeys(): string[] {
    return Array.from(this.breakers.keys());
  }

  /**
   * Gets metrics for all circuit breakers
   */
  getAllMetrics(): Map<string, any> {
    const metrics = new Map();
    for (const [key, breaker] of this.breakers) {
      metrics.set(key, breaker.getMetrics());
    }
    return metrics;
  }

  /**
   * Resets all circuit breakers
   */
  resetAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
  }

  /**
   * Forces all circuit breakers to open
   */
  forceOpenAll(): void {
    for (const breaker of this.breakers.values()) {
      breaker.forceOpen();
    }
  }
}

/**
 * Default circuit breaker registry
 */
export const defaultCircuitBreakerRegistry = new CircuitBreakerRegistry();

