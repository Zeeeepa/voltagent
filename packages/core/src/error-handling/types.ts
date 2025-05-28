/**
 * Comprehensive Error Handling System Types
 * Consolidates all error handling, recovery, and retry logic
 */

import type { VoltAgentError, ToolErrorInfo } from "../agent/types";

/**
 * Error classification categories for intelligent handling
 */
export enum ErrorCategory {
  /** Temporary network or service issues that may resolve with retry */
  TRANSIENT = "transient",
  /** Rate limiting errors that require backoff */
  RATE_LIMIT = "rate_limit",
  /** Authentication or authorization failures */
  AUTH = "auth",
  /** Invalid input or configuration errors */
  VALIDATION = "validation",
  /** Resource not found or unavailable */
  RESOURCE = "resource",
  /** Tool execution failures */
  TOOL = "tool",
  /** Model or provider-specific errors */
  MODEL = "model",
  /** Network connectivity issues */
  NETWORK = "network",
  /** Permanent failures that should not be retried */
  PERMANENT = "permanent",
  /** Unknown or unclassified errors */
  UNKNOWN = "unknown"
}

/**
 * Error severity levels for escalation
 */
export enum ErrorSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical"
}

/**
 * Retry strategy types
 */
export enum RetryStrategy {
  /** Fixed delay between retries */
  FIXED = "fixed",
  /** Exponential backoff with jitter */
  EXPONENTIAL = "exponential",
  /** Linear increase in delay */
  LINEAR = "linear",
  /** Custom strategy defined by user */
  CUSTOM = "custom"
}

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = "closed",
  OPEN = "open",
  HALF_OPEN = "half_open"
}

/**
 * Enhanced error information with classification
 */
export interface ClassifiedError extends VoltAgentError {
  /** Error category for intelligent handling */
  category: ErrorCategory;
  /** Error severity level */
  severity: ErrorSeverity;
  /** Whether this error is retryable */
  retryable: boolean;
  /** Suggested retry delay in milliseconds */
  suggestedDelay?: number;
  /** Error classification confidence (0-1) */
  confidence?: number;
  /** Timestamp when error occurred */
  timestamp: Date;
  /** Unique error ID for tracking */
  errorId: string;
}

/**
 * Advanced retry configuration
 */
export interface AdvancedRetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Retry strategy to use */
  strategy: RetryStrategy;
  /** Base delay in milliseconds */
  baseDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Backoff multiplier for exponential strategy */
  backoffMultiplier?: number;
  /** Jitter factor (0-1) to add randomness */
  jitter?: number;
  /** Custom retry function for CUSTOM strategy */
  customRetryFn?: (attempt: number, error: ClassifiedError) => number;
  /** Function to determine if error should be retried */
  shouldRetry?: (error: ClassifiedError, attempt: number) => boolean;
  /** Callback for retry attempts */
  onRetry?: (error: ClassifiedError, attempt: number, delay: number) => Promise<void> | void;
  /** Callback when max retries exceeded */
  onMaxRetriesExceeded?: (error: ClassifiedError) => Promise<void> | void;
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  /** Failure threshold to open circuit */
  failureThreshold: number;
  /** Success threshold to close circuit from half-open */
  successThreshold: number;
  /** Time window for failure counting (ms) */
  timeWindow: number;
  /** Timeout before attempting to close circuit (ms) */
  timeout: number;
  /** Callback when circuit opens */
  onOpen?: () => Promise<void> | void;
  /** Callback when circuit closes */
  onClose?: () => Promise<void> | void;
  /** Callback when circuit goes half-open */
  onHalfOpen?: () => Promise<void> | void;
}

/**
 * Error escalation configuration
 */
export interface EscalationConfig {
  /** Error count threshold for escalation */
  errorThreshold: number;
  /** Time window for error counting (ms) */
  timeWindow: number;
  /** Severity levels that trigger escalation */
  severityLevels: ErrorSeverity[];
  /** Escalation handlers */
  handlers: EscalationHandler[];
}

/**
 * Error escalation handler
 */
export interface EscalationHandler {
  /** Handler name */
  name: string;
  /** Handler function */
  handle: (errors: ClassifiedError[], context: EscalationContext) => Promise<void> | void;
  /** Whether this handler should stop further escalation */
  stopPropagation?: boolean;
}

/**
 * Escalation context
 */
export interface EscalationContext {
  /** Operation that triggered escalation */
  operation: string;
  /** Agent ID */
  agentId?: string;
  /** Additional context data */
  metadata: Record<string, any>;
}

/**
 * Recovery strategy configuration
 */
export interface RecoveryConfig {
  /** Recovery strategies by error category */
  strategies: Map<ErrorCategory, RecoveryStrategy[]>;
  /** Default recovery strategy */
  defaultStrategy?: RecoveryStrategy;
  /** Maximum recovery attempts */
  maxRecoveryAttempts: number;
}

/**
 * Recovery strategy
 */
export interface RecoveryStrategy {
  /** Strategy name */
  name: string;
  /** Recovery function */
  recover: (error: ClassifiedError, context: RecoveryContext) => Promise<RecoveryResult>;
  /** Whether this strategy can handle the error */
  canHandle: (error: ClassifiedError) => boolean;
  /** Priority (higher = tried first) */
  priority: number;
}

/**
 * Recovery context
 */
export interface RecoveryContext {
  /** Original operation parameters */
  originalParams: any;
  /** Attempt number */
  attempt: number;
  /** Previous recovery attempts */
  previousAttempts: RecoveryAttempt[];
  /** Additional context */
  metadata: Record<string, any>;
}

/**
 * Recovery attempt record
 */
export interface RecoveryAttempt {
  /** Strategy used */
  strategy: string;
  /** Timestamp */
  timestamp: Date;
  /** Success status */
  success: boolean;
  /** Error if failed */
  error?: ClassifiedError;
  /** Result if successful */
  result?: any;
}

/**
 * Recovery result
 */
export interface RecoveryResult {
  /** Whether recovery was successful */
  success: boolean;
  /** Recovered result if successful */
  result?: any;
  /** Error if recovery failed */
  error?: ClassifiedError;
  /** Whether to continue with other strategies */
  continueRecovery?: boolean;
}

/**
 * Error handling middleware configuration
 */
export interface ErrorHandlingConfig {
  /** Retry configuration */
  retry?: AdvancedRetryConfig;
  /** Circuit breaker configuration */
  circuitBreaker?: CircuitBreakerConfig;
  /** Escalation configuration */
  escalation?: EscalationConfig;
  /** Recovery configuration */
  recovery?: RecoveryConfig;
  /** Error classification rules */
  classification?: ErrorClassificationRules;
  /** Global error handlers */
  globalHandlers?: ErrorHandler[];
  /** Enable detailed logging */
  enableLogging?: boolean;
  /** Enable metrics collection */
  enableMetrics?: boolean;
}

/**
 * Error classification rules
 */
export interface ErrorClassificationRules {
  /** Rules by error message patterns */
  messagePatterns: Map<RegExp, ErrorClassification>;
  /** Rules by error codes */
  errorCodes: Map<string | number, ErrorClassification>;
  /** Rules by provider type */
  providerRules: Map<string, ErrorClassificationRules>;
  /** Default classification */
  defaultClassification: ErrorClassification;
}

/**
 * Error classification result
 */
export interface ErrorClassification {
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  suggestedDelay?: number;
  confidence?: number;
}

/**
 * Global error handler
 */
export interface ErrorHandler {
  /** Handler name */
  name: string;
  /** Handler function */
  handle: (error: ClassifiedError, context: ErrorContext) => Promise<void> | void;
  /** Error categories this handler processes */
  categories?: ErrorCategory[];
  /** Severity levels this handler processes */
  severities?: ErrorSeverity[];
}

/**
 * Error context for handlers
 */
export interface ErrorContext {
  /** Operation that failed */
  operation: string;
  /** Agent ID */
  agentId?: string;
  /** Provider type */
  provider?: string;
  /** Additional context */
  metadata: Record<string, any>;
}

/**
 * Error metrics
 */
export interface ErrorMetrics {
  /** Total error count */
  totalErrors: number;
  /** Errors by category */
  errorsByCategory: Map<ErrorCategory, number>;
  /** Errors by severity */
  errorsBySeverity: Map<ErrorSeverity, number>;
  /** Retry success rate */
  retrySuccessRate: number;
  /** Recovery success rate */
  recoverySuccessRate: number;
  /** Circuit breaker trips */
  circuitBreakerTrips: number;
  /** Escalations triggered */
  escalationsTriggered: number;
}

/**
 * Error handling operation result
 */
export interface ErrorHandlingResult<T = any> {
  /** Whether operation succeeded */
  success: boolean;
  /** Result if successful */
  result?: T;
  /** Final error if failed */
  error?: ClassifiedError;
  /** Number of retry attempts made */
  retryAttempts: number;
  /** Recovery attempts made */
  recoveryAttempts: RecoveryAttempt[];
  /** Whether circuit breaker was triggered */
  circuitBreakerTriggered: boolean;
  /** Whether error was escalated */
  escalated: boolean;
  /** Total execution time */
  executionTime: number;
}

