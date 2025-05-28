/**
 * Comprehensive Error Handling System Tests
 */

import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import {
  ErrorHandlingManager,
  ErrorClassifier,
  RetryManager,
  CircuitBreaker,
  RecoverySystem,
  EscalationSystem,
  ErrorCategory,
  ErrorSeverity,
  RetryStrategy,
  CircuitBreakerState,
} from "../index";
import type { VoltAgentError, ErrorContext, ClassifiedError } from "../types";

describe("Error Handling System", () => {
  let errorHandler: ErrorHandlingManager;
  let mockOperation: jest.Mock;
  let mockContext: ErrorContext;

  beforeEach(() => {
    errorHandler = new ErrorHandlingManager({
      enableLogging: false, // Disable logging for tests
      enableMetrics: true,
    });
    
    mockOperation = jest.fn();
    mockContext = {
      operation: "test_operation",
      agentId: "test-agent",
      provider: "test-provider",
      metadata: { test: true },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("ErrorClassifier", () => {
    let classifier: ErrorClassifier;

    beforeEach(() => {
      classifier = new ErrorClassifier();
    });

    it("should classify rate limit errors correctly", () => {
      const error: VoltAgentError = {
        message: "Rate limit exceeded",
        code: 429,
      };

      const classified = classifier.classify(error);

      expect(classified.category).toBe(ErrorCategory.RATE_LIMIT);
      expect(classified.severity).toBe(ErrorSeverity.MEDIUM);
      expect(classified.retryable).toBe(true);
      expect(classified.suggestedDelay).toBeGreaterThan(0);
    });

    it("should classify authentication errors correctly", () => {
      const error: VoltAgentError = {
        message: "Unauthorized access",
        code: 401,
      };

      const classified = classifier.classify(error);

      expect(classified.category).toBe(ErrorCategory.AUTH);
      expect(classified.severity).toBe(ErrorSeverity.HIGH);
      expect(classified.retryable).toBe(false);
    });

    it("should classify network errors correctly", () => {
      const error: VoltAgentError = {
        message: "Connection timeout",
        originalError: new Error("ETIMEDOUT"),
      };

      const classified = classifier.classify(error);

      expect(classified.category).toBe(ErrorCategory.NETWORK);
      expect(classified.retryable).toBe(true);
    });

    it("should classify tool errors correctly", () => {
      const error: VoltAgentError = {
        message: "Tool execution failed",
        toolError: {
          toolCallId: "tool-123",
          toolName: "test-tool",
          toolExecutionError: new Error("Tool failed"),
          toolArguments: { arg1: "value1" },
        },
      };

      const classified = classifier.classify(error);

      expect(classified.category).toBe(ErrorCategory.TOOL);
      expect(classified.retryable).toBe(true);
    });
  });

  describe("RetryManager", () => {
    let retryManager: RetryManager;

    beforeEach(() => {
      retryManager = new RetryManager({
        maxRetries: 3,
        strategy: RetryStrategy.FIXED,
        baseDelay: 100, // Short delay for tests
        maxDelay: 1000,
      });
    });

    it("should retry failed operations", async () => {
      let attempts = 0;
      mockOperation.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          const error: ClassifiedError = {
            message: "Temporary failure",
            category: ErrorCategory.TRANSIENT,
            severity: ErrorSeverity.MEDIUM,
            retryable: true,
            timestamp: new Date(),
            errorId: "test-error",
          };
          throw error;
        }
        return "success";
      });

      const result = await retryManager.execute(mockOperation, "test");

      expect(result).toBe("success");
      expect(attempts).toBe(3);
    });

    it("should not retry non-retryable errors", async () => {
      const error: ClassifiedError = {
        message: "Authentication failed",
        category: ErrorCategory.AUTH,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        timestamp: new Date(),
        errorId: "test-error",
      };

      mockOperation.mockRejectedValue(error);

      await expect(retryManager.execute(mockOperation, "test")).rejects.toThrow("Authentication failed");
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it("should respect max retries", async () => {
      const error: ClassifiedError = {
        message: "Always fails",
        category: ErrorCategory.TRANSIENT,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        timestamp: new Date(),
        errorId: "test-error",
      };

      mockOperation.mockRejectedValue(error);

      await expect(retryManager.execute(mockOperation, "test")).rejects.toThrow("Always fails");
      expect(mockOperation).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe("CircuitBreaker", () => {
    let circuitBreaker: CircuitBreaker;

    beforeEach(() => {
      circuitBreaker = new CircuitBreaker({
        failureThreshold: 3,
        timeout: 100, // Short timeout for tests
        timeWindow: 1000,
      });
    });

    it("should open circuit after failure threshold", async () => {
      const error: ClassifiedError = {
        message: "Service unavailable",
        category: ErrorCategory.TRANSIENT,
        severity: ErrorSeverity.HIGH,
        retryable: true,
        timestamp: new Date(),
        errorId: "test-error",
      };

      mockOperation.mockRejectedValue(error);

      // Trigger failures to open circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation, "test");
        } catch (e) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Next call should fail immediately without calling operation
      mockOperation.mockClear();
      await expect(circuitBreaker.execute(mockOperation, "test")).rejects.toThrow("Circuit breaker is OPEN");
      expect(mockOperation).not.toHaveBeenCalled();
    });

    it("should transition to half-open after timeout", async () => {
      const error: ClassifiedError = {
        message: "Service unavailable",
        category: ErrorCategory.TRANSIENT,
        severity: ErrorSeverity.HIGH,
        retryable: true,
        timestamp: new Date(),
        errorId: "test-error",
      };

      mockOperation.mockRejectedValue(error);

      // Open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockOperation, "test");
        } catch (e) {
          // Expected to fail
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Next call should transition to half-open
      mockOperation.mockResolvedValue("success");
      const result = await circuitBreaker.execute(mockOperation, "test");

      expect(result).toBe("success");
      expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe("RecoverySystem", () => {
    let recoverySystem: RecoverySystem;

    beforeEach(() => {
      recoverySystem = new RecoverySystem();
    });

    it("should attempt recovery for recoverable errors", async () => {
      const error: ClassifiedError = {
        message: "Token limit exceeded",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
        timestamp: new Date(),
        errorId: "test-error",
      };

      const originalParams = {
        maxTokens: 4000,
        temperature: 0.8,
      };

      const result = await recoverySystem.recover(error, originalParams);

      expect(result.success).toBe(true);
      expect(result.result).toBeDefined();
      expect(result.result.maxTokens).toBeLessThan(originalParams.maxTokens);
    });

    it("should try multiple recovery strategies", async () => {
      const error: ClassifiedError = {
        message: "Model error",
        category: ErrorCategory.MODEL,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        timestamp: new Date(),
        errorId: "test-error",
      };

      const originalParams = {
        model: "gpt-4",
        maxTokens: 4000,
      };

      const result = await recoverySystem.recover(error, originalParams);

      expect(result.success).toBe(true);
      // Should either adjust parameters or use fallback model
      expect(result.result).toBeDefined();
    });
  });

  describe("EscalationSystem", () => {
    let escalationSystem: EscalationSystem;
    let mockHandler: jest.Mock;

    beforeEach(() => {
      mockHandler = jest.fn();
      escalationSystem = new EscalationSystem({
        errorThreshold: 2,
        timeWindow: 1000,
        severityLevels: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
        handlers: [{
          name: "test-handler",
          handle: mockHandler,
        }],
      });
    });

    it("should escalate when error threshold is reached", async () => {
      const error: ClassifiedError = {
        message: "Critical error",
        category: ErrorCategory.MODEL,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        timestamp: new Date(),
        errorId: "test-error-1",
      };

      // First error - should not escalate
      let escalated = await escalationSystem.recordError(error, "test_op", "agent-1");
      expect(escalated).toBe(false);
      expect(mockHandler).not.toHaveBeenCalled();

      // Second error - should escalate
      const error2 = { ...error, errorId: "test-error-2" };
      escalated = await escalationSystem.recordError(error2, "test_op", "agent-1");
      expect(escalated).toBe(true);
      expect(mockHandler).toHaveBeenCalledWith(
        expect.arrayContaining([error, error2]),
        expect.objectContaining({
          operation: "test_op",
          agentId: "agent-1",
        })
      );
    });

    it("should not escalate low severity errors", async () => {
      const error: ClassifiedError = {
        message: "Low severity error",
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.LOW,
        retryable: false,
        timestamp: new Date(),
        errorId: "test-error",
      };

      // Multiple low severity errors should not escalate
      for (let i = 0; i < 5; i++) {
        const escalated = await escalationSystem.recordError(error, "test_op", "agent-1");
        expect(escalated).toBe(false);
      }

      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe("ErrorHandlingManager Integration", () => {
    it("should handle successful operations", async () => {
      mockOperation.mockResolvedValue("success");

      const result = await errorHandler.executeWithErrorHandling(mockOperation, mockContext);

      expect(result.success).toBe(true);
      expect(result.result).toBe("success");
      expect(result.retryAttempts).toBe(0);
      expect(result.escalated).toBe(false);
    });

    it("should handle failed operations with retries", async () => {
      let attempts = 0;
      mockOperation.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          const error: VoltAgentError = {
            message: "Temporary failure",
            code: 503,
          };
          throw error;
        }
        return "success";
      });

      const result = await errorHandler.executeWithErrorHandling(mockOperation, mockContext);

      expect(result.success).toBe(true);
      expect(result.result).toBe("success");
      expect(result.retryAttempts).toBeGreaterThan(0);
    });

    it("should handle permanent failures", async () => {
      const error: VoltAgentError = {
        message: "Authentication failed",
        code: 401,
      };

      mockOperation.mockRejectedValue(error);

      const result = await errorHandler.executeWithErrorHandling(mockOperation, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.category).toBe(ErrorCategory.AUTH);
      expect(result.retryAttempts).toBe(0); // Should not retry auth errors
    });

    it("should collect metrics", async () => {
      const error: VoltAgentError = {
        message: "Test error",
        code: 500,
      };

      mockOperation.mockRejectedValue(error);

      await errorHandler.executeWithErrorHandling(mockOperation, mockContext);

      const metrics = errorHandler.getMetrics();
      expect(metrics.totalErrors).toBeGreaterThan(0);
      expect(metrics.errorsByCategory.size).toBeGreaterThan(0);
    });

    it("should provide system status", () => {
      const status = errorHandler.getSystemStatus();

      expect(status).toHaveProperty("metrics");
      expect(status).toHaveProperty("circuitBreakers");
      expect(status).toHaveProperty("escalation");
      expect(status).toHaveProperty("configuration");
    });
  });
});

