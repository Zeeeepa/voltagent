/**
 * Unified Error Handling Manager
 * Coordinates all error handling components for comprehensive error management
 */

import type { VoltAgentError } from "../agent/types";
import type {
  ErrorHandlingConfig,
  ErrorHandlingResult,
  ClassifiedError,
  ErrorContext,
  ErrorMetrics,
  ErrorHandler,
} from "./types";

import { ErrorClassifier, defaultErrorClassifier } from "./classifier";
import { RetryManager, defaultRetryManager } from "./retry-manager";
import { CircuitBreaker, defaultCircuitBreakerRegistry } from "./circuit-breaker";
import { RecoverySystem, defaultRecoverySystem } from "./recovery-system";
import { EscalationSystem, defaultEscalationSystem } from "./escalation-system";

/**
 * Default error handling configuration
 */
const DEFAULT_ERROR_HANDLING_CONFIG: ErrorHandlingConfig = {
  enableLogging: true,
  enableMetrics: true,
  globalHandlers: [],
};

/**
 * Unified error handling manager that coordinates all error handling components
 */
export class ErrorHandlingManager {
  private config: ErrorHandlingConfig;
  private classifier: ErrorClassifier;
  private retryManager: RetryManager;
  private circuitBreakerRegistry: typeof defaultCircuitBreakerRegistry;
  private recoverySystem: RecoverySystem;
  private escalationSystem: EscalationSystem;
  private globalHandlers: Map<string, ErrorHandler> = new Map();
  private metrics: ErrorMetrics = {
    totalErrors: 0,
    errorsByCategory: new Map(),
    errorsBySeverity: new Map(),
    retrySuccessRate: 0,
    recoverySuccessRate: 0,
    circuitBreakerTrips: 0,
    escalationsTriggered: 0,
  };

  constructor(config?: Partial<ErrorHandlingConfig>) {
    this.config = { ...DEFAULT_ERROR_HANDLING_CONFIG, ...config };
    
    // Initialize components
    this.classifier = new ErrorClassifier(this.config.classification);
    this.retryManager = new RetryManager(this.config.retry);
    this.circuitBreakerRegistry = defaultCircuitBreakerRegistry;
    this.recoverySystem = new RecoverySystem(this.config.recovery);
    this.escalationSystem = new EscalationSystem(this.config.escalation);

    // Register global handlers
    if (this.config.globalHandlers) {
      for (const handler of this.config.globalHandlers) {
        this.registerGlobalHandler(handler);
      }
    }
  }

  /**
   * Executes an operation with comprehensive error handling
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext
  ): Promise<ErrorHandlingResult<T>> {
    const startTime = Date.now();
    const result: ErrorHandlingResult<T> = {
      success: false,
      retryAttempts: 0,
      recoveryAttempts: [],
      circuitBreakerTriggered: false,
      escalated: false,
      executionTime: 0,
    };

    try {
      // Get circuit breaker for this operation
      const circuitBreaker = this.getCircuitBreaker(context);

      // Execute with circuit breaker protection
      const operationResult = await circuitBreaker.execute(async () => {
        // Execute with retry logic
        return await this.retryManager.execute(
          operation,
          context.operation,
          {
            ...this.config.retry,
            onRetry: async (error, attempt, delay) => {
              result.retryAttempts = attempt;
              await this.handleError(error, context);
              
              if (this.config.retry?.onRetry) {
                await this.config.retry.onRetry(error, attempt, delay);
              }
            },
            onMaxRetriesExceeded: async (error) => {
              // Try recovery before giving up
              const recoveryResult = await this.recoverySystem.recover(
                error,
                context.metadata,
                { metadata: context.metadata }
              );
              
              result.recoveryAttempts = recoveryResult.success ? [] : []; // TODO: Get actual attempts
              
              if (recoveryResult.success && recoveryResult.result) {
                // Recovery successful, try operation again with recovered parameters
                return await operation();
              }
              
              if (this.config.retry?.onMaxRetriesExceeded) {
                await this.config.retry.onMaxRetriesExceeded(error);
              }
              
              throw error;
            },
          }
        );
      }, context.operation);

      result.success = true;
      result.result = operationResult;
      
    } catch (error) {
      const classifiedError = this.classifier.classify(error as VoltAgentError, context.provider);
      result.error = classifiedError;

      // Handle the error through all systems
      await this.handleError(classifiedError, context);

      // Check if circuit breaker was triggered
      const circuitBreaker = this.getCircuitBreaker(context);
      result.circuitBreakerTriggered = circuitBreaker.getState() !== "closed";

      // Record escalation
      const escalated = await this.escalationSystem.recordError(
        classifiedError,
        context.operation,
        context.agentId,
        context.metadata
      );
      result.escalated = escalated;

      // Update metrics
      this.updateMetrics(classifiedError, result);
    }

    result.executionTime = Date.now() - startTime;
    return result;
  }

  /**
   * Handles an error through all registered systems
   */
  async handleError(error: ClassifiedError, context: ErrorContext): Promise<void> {
    // Log error if enabled
    if (this.config.enableLogging) {
      this.logError(error, context);
    }

    // Execute global error handlers
    for (const handler of this.globalHandlers.values()) {
      if (this.shouldHandlerProcess(handler, error)) {
        try {
          await handler.handle(error, context);
        } catch (handlerError) {
          console.error(`Global error handler ${handler.name} failed:`, handlerError);
        }
      }
    }

    // Update metrics
    if (this.config.enableMetrics) {
      this.updateErrorMetrics(error);
    }
  }

  /**
   * Registers a global error handler
   */
  registerGlobalHandler(handler: ErrorHandler): void {
    this.globalHandlers.set(handler.name, handler);
  }

  /**
   * Unregisters a global error handler
   */
  unregisterGlobalHandler(name: string): boolean {
    return this.globalHandlers.delete(name);
  }

  /**
   * Gets circuit breaker for operation context
   */
  private getCircuitBreaker(context: ErrorContext): CircuitBreaker {
    const key = `${context.operation}:${context.provider || "default"}`;
    return this.circuitBreakerRegistry.getBreaker(key, this.config.circuitBreaker);
  }

  /**
   * Checks if handler should process this error
   */
  private shouldHandlerProcess(handler: ErrorHandler, error: ClassifiedError): boolean {
    // Check categories
    if (handler.categories && handler.categories.length > 0) {
      if (!handler.categories.includes(error.category)) {
        return false;
      }
    }

    // Check severities
    if (handler.severities && handler.severities.length > 0) {
      if (!handler.severities.includes(error.severity)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Logs error information
   */
  private logError(error: ClassifiedError, context: ErrorContext): void {
    const logLevel = this.getLogLevel(error.severity);
    const logMessage = {
      errorId: error.errorId,
      category: error.category,
      severity: error.severity,
      message: error.message,
      operation: context.operation,
      agentId: context.agentId,
      provider: context.provider,
      timestamp: error.timestamp,
      retryable: error.retryable,
      stage: error.stage,
      code: error.code,
    };

    switch (logLevel) {
      case "error":
        console.error("VoltAgent Error:", logMessage);
        break;
      case "warn":
        console.warn("VoltAgent Warning:", logMessage);
        break;
      case "info":
        console.info("VoltAgent Info:", logMessage);
        break;
      default:
        console.log("VoltAgent Log:", logMessage);
    }
  }

  /**
   * Gets appropriate log level for error severity
   */
  private getLogLevel(severity: string): string {
    switch (severity) {
      case "critical":
      case "high":
        return "error";
      case "medium":
        return "warn";
      case "low":
        return "info";
      default:
        return "log";
    }
  }

  /**
   * Updates error metrics
   */
  private updateErrorMetrics(error: ClassifiedError): void {
    this.metrics.totalErrors++;

    // Update category metrics
    const categoryCount = this.metrics.errorsByCategory.get(error.category) || 0;
    this.metrics.errorsByCategory.set(error.category, categoryCount + 1);

    // Update severity metrics
    const severityCount = this.metrics.errorsBySeverity.get(error.severity) || 0;
    this.metrics.errorsBySeverity.set(error.severity, severityCount + 1);
  }

  /**
   * Updates comprehensive metrics
   */
  private updateMetrics(error: ClassifiedError, result: ErrorHandlingResult): void {
    // Update retry success rate
    if (result.retryAttempts > 0) {
      const totalRetries = this.metrics.totalErrors;
      const successfulRetries = result.success ? 1 : 0;
      this.metrics.retrySuccessRate = 
        (this.metrics.retrySuccessRate * (totalRetries - 1) + successfulRetries) / totalRetries;
    }

    // Update recovery success rate
    if (result.recoveryAttempts.length > 0) {
      const successfulRecoveries = result.recoveryAttempts.filter(a => a.success).length;
      const totalRecoveries = result.recoveryAttempts.length;
      this.metrics.recoverySuccessRate = successfulRecoveries / totalRecoveries;
    }

    // Update circuit breaker trips
    if (result.circuitBreakerTriggered) {
      this.metrics.circuitBreakerTrips++;
    }

    // Update escalations
    if (result.escalated) {
      this.metrics.escalationsTriggered++;
    }
  }

  /**
   * Gets current error handling metrics
   */
  getMetrics(): ErrorMetrics {
    return { ...this.metrics };
  }

  /**
   * Gets comprehensive system status
   */
  getSystemStatus() {
    return {
      metrics: this.getMetrics(),
      circuitBreakers: this.circuitBreakerRegistry.getAllMetrics(),
      escalation: this.escalationSystem.getMetrics(),
      configuration: {
        retry: this.retryManager.getConfig(),
        recovery: this.recoverySystem.getConfig(),
        escalation: this.escalationSystem.getConfig(),
      },
    };
  }

  /**
   * Resets all metrics and state
   */
  reset(): void {
    this.metrics = {
      totalErrors: 0,
      errorsByCategory: new Map(),
      errorsBySeverity: new Map(),
      retrySuccessRate: 0,
      recoverySuccessRate: 0,
      circuitBreakerTrips: 0,
      escalationsTriggered: 0,
    };

    this.circuitBreakerRegistry.resetAll();
    this.escalationSystem.clearHistory();
  }

  /**
   * Updates configuration
   */
  updateConfig(config: Partial<ErrorHandlingConfig>): void {
    this.config = { ...this.config, ...config };

    // Update component configurations
    if (config.retry) {
      this.retryManager.updateConfig(config.retry);
    }
    if (config.recovery) {
      this.recoverySystem.updateConfig(config.recovery);
    }
    if (config.escalation) {
      this.escalationSystem.updateConfig(config.escalation);
    }
    if (config.classification) {
      this.classifier.updateRules(config.classification);
    }
  }

  /**
   * Gets current configuration
   */
  getConfig(): ErrorHandlingConfig {
    return { ...this.config };
  }
}

/**
 * Default error handling manager instance
 */
export const defaultErrorHandler = new ErrorHandlingManager();

/**
 * Convenience function for executing operations with error handling
 */
export async function executeWithErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  config?: Partial<ErrorHandlingConfig>
): Promise<ErrorHandlingResult<T>> {
  if (config) {
    const handler = new ErrorHandlingManager(config);
    return handler.executeWithErrorHandling(operation, context);
  }
  
  return defaultErrorHandler.executeWithErrorHandling(operation, context);
}

