/**
 * Error Handling Integration Utilities
 * Provides integration helpers for existing VoltAgent components
 */

import type { VoltAgentError } from "../agent/types";
import type { ErrorContext } from "./types";
import { defaultErrorHandler, ErrorCategory, ErrorSeverity } from "./index";

/**
 * Wraps existing VoltAgent operations with comprehensive error handling
 */
export class ErrorHandlingIntegration {
  /**
   * Wraps an LLM provider operation with error handling
   */
  static wrapProviderOperation<T>(
    operation: () => Promise<T>,
    provider: string,
    operationType: string,
    agentId?: string,
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const context: ErrorContext = {
      operation: `${provider}_${operationType}`,
      agentId,
      provider,
      metadata: {
        ...metadata,
        operationType,
        provider,
      },
    };

    return defaultErrorHandler.executeWithErrorHandling(operation, context)
      .then(result => {
        if (result.success) {
          return result.result!;
        }
        throw result.error;
      });
  }

  /**
   * Wraps tool execution with error handling
   */
  static wrapToolExecution<T>(
    operation: () => Promise<T>,
    toolName: string,
    agentId?: string,
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const context: ErrorContext = {
      operation: `tool_${toolName}`,
      agentId,
      metadata: {
        ...metadata,
        toolName,
        operationType: "tool_execution",
      },
    };

    return defaultErrorHandler.executeWithErrorHandling(operation, context)
      .then(result => {
        if (result.success) {
          return result.result!;
        }
        throw result.error;
      });
  }

  /**
   * Wraps memory operations with error handling
   */
  static wrapMemoryOperation<T>(
    operation: () => Promise<T>,
    operationType: string,
    agentId?: string,
    metadata: Record<string, any> = {}
  ): Promise<T> {
    const context: ErrorContext = {
      operation: `memory_${operationType}`,
      agentId,
      metadata: {
        ...metadata,
        operationType,
        component: "memory",
      },
    };

    return defaultErrorHandler.executeWithErrorHandling(operation, context)
      .then(result => {
        if (result.success) {
          return result.result!;
        }
        throw result.error;
      });
  }

  /**
   * Converts a standard Error to VoltAgentError format
   */
  static convertToVoltAgentError(
    error: unknown,
    stage: string,
    metadata: Record<string, any> = {}
  ): VoltAgentError {
    if (this.isVoltAgentError(error)) {
      return error;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return {
      message: errorMessage,
      originalError: error,
      stage,
      metadata,
    };
  }

  /**
   * Type guard to check if error is already a VoltAgentError
   */
  static isVoltAgentError(error: unknown): error is VoltAgentError {
    return (
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as any).message === "string"
    );
  }

  /**
   * Creates error context from agent operation parameters
   */
  static createErrorContext(
    operation: string,
    agentId?: string,
    provider?: string,
    metadata: Record<string, any> = {}
  ): ErrorContext {
    return {
      operation,
      agentId,
      provider,
      metadata,
    };
  }

  /**
   * Wraps async generator functions with error handling
   */
  static async* wrapAsyncGenerator<T>(
    generator: AsyncGenerator<T>,
    context: ErrorContext
  ): AsyncGenerator<T> {
    try {
      for await (const item of generator) {
        yield item;
      }
    } catch (error) {
      const voltError = this.convertToVoltAgentError(error, context.operation, context.metadata);
      await defaultErrorHandler.handleError(
        defaultErrorHandler["classifier"].classify(voltError, context.provider),
        context
      );
      throw error;
    }
  }

  /**
   * Creates a retry wrapper for specific operations
   */
  static createRetryWrapper<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    context: Partial<ErrorContext> = {}
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const fullContext: ErrorContext = {
        operation: fn.name || "unknown",
        metadata: {},
        ...context,
      };

      const result = await defaultErrorHandler.executeWithErrorHandling(
        () => fn(...args),
        fullContext
      );

      if (result.success) {
        return result.result!;
      }
      
      throw result.error;
    };
  }

  /**
   * Creates a circuit breaker wrapper for operations
   */
  static createCircuitBreakerWrapper<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    operationKey: string
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      const circuitBreaker = defaultErrorHandler["circuitBreakerRegistry"].getBreaker(operationKey);
      return circuitBreaker.execute(() => fn(...args), operationKey);
    };
  }
}

/**
 * Decorator for automatic error handling on class methods
 */
export function withErrorHandling(
  operation: string,
  provider?: string
) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const context: ErrorContext = {
        operation: `${target.constructor.name}_${operation}`,
        agentId: this.id || this.agentId,
        provider,
        metadata: {
          className: target.constructor.name,
          methodName: propertyKey,
          operation,
        },
      };

      const result = await defaultErrorHandler.executeWithErrorHandling(
        () => originalMethod.apply(this, args),
        context
      );

      if (result.success) {
        return result.result;
      }
      
      throw result.error;
    };

    return descriptor;
  };
}

/**
 * Utility functions for common error handling patterns
 */
export const ErrorHandlingPatterns = {
  /**
   * Retry with exponential backoff
   */
  retryWithBackoff: async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> => {
    const context: ErrorContext = {
      operation: "retry_operation",
      metadata: { maxRetries, baseDelay },
    };

    const result = await defaultErrorHandler.executeWithErrorHandling(operation, context);
    
    if (result.success) {
      return result.result!;
    }
    
    throw result.error;
  },

  /**
   * Execute with timeout and retry
   */
  executeWithTimeout: async <T>(
    operation: () => Promise<T>,
    timeoutMs: number,
    retries: number = 2
  ): Promise<T> => {
    const timeoutOperation = () => {
      return Promise.race([
        operation(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
        ),
      ]);
    };

    return ErrorHandlingPatterns.retryWithBackoff(timeoutOperation, retries);
  },

  /**
   * Batch operation with individual error handling
   */
  executeBatch: async <T, R>(
    items: T[],
    operation: (item: T) => Promise<R>,
    options: {
      concurrency?: number;
      continueOnError?: boolean;
      retryFailures?: boolean;
    } = {}
  ): Promise<Array<{ success: boolean; result?: R; error?: Error; item: T }>> => {
    const { concurrency = 5, continueOnError = true, retryFailures = true } = options;
    const results: Array<{ success: boolean; result?: R; error?: Error; item: T }> = [];

    // Process items in batches
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (item) => {
        try {
          const wrappedOperation = retryFailures 
            ? () => ErrorHandlingPatterns.retryWithBackoff(() => operation(item))
            : () => operation(item);
            
          const result = await wrappedOperation();
          return { success: true, result, item };
        } catch (error) {
          if (!continueOnError) {
            throw error;
          }
          return { success: false, error: error as Error, item };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  },
};

