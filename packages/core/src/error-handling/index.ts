/**
 * Comprehensive Error Handling System
 * 
 * This module provides a unified error handling system that consolidates:
 * - Error classification and categorization
 * - Intelligent retry strategies with backoff
 * - Circuit breaker pattern for resilience
 * - Error recovery mechanisms
 * - Error escalation and alerting
 * - Comprehensive metrics and monitoring
 * 
 * @example
 * ```typescript
 * import { defaultErrorHandler, ErrorCategory } from '@voltagent/core/error-handling';
 * 
 * // Execute operation with comprehensive error handling
 * const result = await defaultErrorHandler.executeWithErrorHandling(
 *   async () => {
 *     // Your operation here
 *     return await someRiskyOperation();
 *   },
 *   {
 *     operation: 'llm_generate',
 *     agentId: 'agent-123',
 *     provider: 'anthropic',
 *     metadata: { model: 'claude-3-sonnet' }
 *   }
 * );
 * 
 * if (result.success) {
 *   console.log('Operation succeeded:', result.result);
 * } else {
 *   console.error('Operation failed after retries:', result.error);
 * }
 * ```
 */

// Core types
export type {
  ErrorCategory,
  ErrorSeverity,
  RetryStrategy,
  CircuitBreakerState,
  ClassifiedError,
  AdvancedRetryConfig,
  CircuitBreakerConfig,
  EscalationConfig,
  EscalationHandler,
  EscalationContext,
  RecoveryConfig,
  RecoveryStrategy,
  RecoveryContext,
  RecoveryResult,
  RecoveryAttempt,
  ErrorHandlingConfig,
  ErrorClassificationRules,
  ErrorClassification,
  ErrorHandler,
  ErrorContext,
  ErrorMetrics,
  ErrorHandlingResult,
} from "./types";

// Core enums
export {
  ErrorCategory,
  ErrorSeverity,
  RetryStrategy,
  CircuitBreakerState,
} from "./types";

// Error classification
export {
  ErrorClassifier,
  defaultErrorClassifier,
} from "./classifier";

// Retry management
export {
  RetryManager,
  RetryStrategies,
  defaultRetryManager,
} from "./retry-manager";

// Circuit breaker
export {
  CircuitBreaker,
  CircuitBreakerRegistry,
  defaultCircuitBreakerRegistry,
} from "./circuit-breaker";

// Recovery system
export {
  RecoverySystem,
  defaultRecoverySystem,
} from "./recovery-system";

// Escalation system
export {
  EscalationSystem,
  defaultEscalationSystem,
} from "./escalation-system";

// Main error handler
export {
  ErrorHandlingManager,
  defaultErrorHandler,
  executeWithErrorHandling,
} from "./error-handler";

// Utility functions for common error handling patterns
export const ErrorHandlingUtils = {
  /**
   * Creates a basic retry configuration
   */
  createRetryConfig: (maxRetries: number = 3, baseDelay: number = 1000): AdvancedRetryConfig => ({
    maxRetries,
    strategy: RetryStrategy.EXPONENTIAL,
    baseDelay,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: 0.1,
  }),

  /**
   * Creates a basic circuit breaker configuration
   */
  createCircuitBreakerConfig: (
    failureThreshold: number = 5,
    timeout: number = 30000
  ): CircuitBreakerConfig => ({
    failureThreshold,
    successThreshold: 3,
    timeWindow: 60000,
    timeout,
  }),

  /**
   * Creates a basic escalation configuration
   */
  createEscalationConfig: (
    errorThreshold: number = 5,
    timeWindow: number = 300000
  ): EscalationConfig => ({
    errorThreshold,
    timeWindow,
    severityLevels: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
    handlers: [],
  }),

  /**
   * Creates a comprehensive error handling configuration
   */
  createErrorHandlingConfig: (options: {
    maxRetries?: number;
    baseDelay?: number;
    circuitBreakerThreshold?: number;
    escalationThreshold?: number;
    enableLogging?: boolean;
    enableMetrics?: boolean;
  } = {}): ErrorHandlingConfig => ({
    retry: ErrorHandlingUtils.createRetryConfig(options.maxRetries, options.baseDelay),
    circuitBreaker: ErrorHandlingUtils.createCircuitBreakerConfig(options.circuitBreakerThreshold),
    escalation: ErrorHandlingUtils.createEscalationConfig(options.escalationThreshold),
    enableLogging: options.enableLogging ?? true,
    enableMetrics: options.enableMetrics ?? true,
    globalHandlers: [],
  }),
};

// Re-export types from main types file for convenience
import type { AdvancedRetryConfig, CircuitBreakerConfig, EscalationConfig, ErrorHandlingConfig } from "./types";

