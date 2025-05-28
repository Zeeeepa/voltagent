# VoltAgent Error Handling System

A comprehensive error handling system that provides intelligent error classification, retry strategies, circuit breaker patterns, recovery mechanisms, and escalation management for VoltAgent operations.

## Features

- **🎯 Intelligent Error Classification**: Automatically categorizes errors by type, severity, and retryability
- **🔄 Advanced Retry Strategies**: Multiple retry patterns with exponential backoff, jitter, and category-aware delays
- **⚡ Circuit Breaker Pattern**: Prevents cascading failures with configurable thresholds and recovery
- **🛠️ Error Recovery System**: Automatic parameter adjustment and fallback strategies
- **📈 Error Escalation**: Configurable escalation based on error frequency and severity
- **📊 Comprehensive Metrics**: Detailed monitoring and analytics for error patterns
- **🔧 Easy Integration**: Drop-in replacement for existing error handling with backward compatibility

## Quick Start

```typescript
import { defaultErrorHandler, ErrorCategory } from '@voltagent/core/error-handling';

// Execute any operation with comprehensive error handling
const result = await defaultErrorHandler.executeWithErrorHandling(
  async () => {
    // Your risky operation here
    return await llmProvider.generateText(params);
  },
  {
    operation: 'llm_generate',
    agentId: 'agent-123',
    provider: 'anthropic',
    metadata: { model: 'claude-3-sonnet' }
  }
);

if (result.success) {
  console.log('Operation succeeded:', result.result);
  console.log('Retry attempts:', result.retryAttempts);
} else {
  console.error('Operation failed:', result.error);
  console.log('Was escalated:', result.escalated);
}
```

## Core Components

### 1. Error Classification

Automatically categorizes errors into predefined categories:

```typescript
import { ErrorClassifier, ErrorCategory, ErrorSeverity } from '@voltagent/core/error-handling';

const classifier = new ErrorClassifier();
const classifiedError = classifier.classify(voltAgentError, 'anthropic');

console.log(classifiedError.category); // ErrorCategory.RATE_LIMIT
console.log(classifiedError.severity); // ErrorSeverity.MEDIUM
console.log(classifiedError.retryable); // true
console.log(classifiedError.suggestedDelay); // 60000 (1 minute)
```

**Error Categories:**
- `TRANSIENT` - Temporary issues that may resolve with retry
- `RATE_LIMIT` - Rate limiting errors requiring backoff
- `AUTH` - Authentication/authorization failures
- `VALIDATION` - Invalid input or configuration
- `RESOURCE` - Resource not found or unavailable
- `TOOL` - Tool execution failures
- `MODEL` - Model or provider-specific errors
- `NETWORK` - Network connectivity issues
- `PERMANENT` - Permanent failures that shouldn't be retried
- `UNKNOWN` - Unclassified errors

### 2. Retry Management

Advanced retry strategies with intelligent backoff:

```typescript
import { RetryManager, RetryStrategy, RetryStrategies } from '@voltagent/core/error-handling';

const retryManager = new RetryManager({
  maxRetries: 5,
  strategy: RetryStrategy.EXPONENTIAL,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: 0.1,
  shouldRetry: (error, attempt) => error.retryable && attempt <= 3,
  onRetry: async (error, attempt, delay) => {
    console.log(`Retry attempt ${attempt} after ${delay}ms`);
  }
});

const result = await retryManager.execute(async () => {
  return await riskyOperation();
}, 'my_operation');
```

**Built-in Retry Strategies:**
- `FIXED` - Fixed delay between retries
- `EXPONENTIAL` - Exponential backoff with optional jitter
- `LINEAR` - Linear increase in delay
- `CUSTOM` - User-defined strategy function

### 3. Circuit Breaker

Prevents cascading failures with configurable circuit breaker:

```typescript
import { CircuitBreaker, CircuitBreakerState } from '@voltagent/core/error-handling';

const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,    // Open after 5 failures
  successThreshold: 3,    // Close after 3 successes in half-open
  timeWindow: 60000,      // 1 minute window for failure counting
  timeout: 30000,         // 30 seconds before attempting reset
  onOpen: () => console.log('Circuit opened!'),
  onClose: () => console.log('Circuit closed!'),
});

try {
  const result = await circuitBreaker.execute(async () => {
    return await unreliableService();
  }, 'service_call');
} catch (error) {
  if (error.message.includes('Circuit breaker is OPEN')) {
    console.log('Service is currently unavailable');
  }
}
```

### 4. Recovery System

Automatic error recovery with configurable strategies:

```typescript
import { RecoverySystem } from '@voltagent/core/error-handling';

const recoverySystem = new RecoverySystem();

// Register custom recovery strategy
recoverySystem.registerStrategy({
  name: 'custom_model_fallback',
  priority: 100,
  canHandle: (error) => error.category === ErrorCategory.MODEL,
  recover: async (error, context) => {
    // Try with a different model
    const fallbackParams = {
      ...context.originalParams,
      model: 'gpt-3.5-turbo' // Fallback model
    };
    
    return {
      success: true,
      result: fallbackParams,
      continueRecovery: false
    };
  }
});

const recoveryResult = await recoverySystem.recover(
  classifiedError,
  originalParameters,
  { metadata: { operation: 'text_generation' } }
);

if (recoveryResult.success) {
  // Retry with recovered parameters
  const result = await operation(recoveryResult.result);
}
```

### 5. Error Escalation

Configurable escalation based on error patterns:

```typescript
import { EscalationSystem, ErrorSeverity } from '@voltagent/core/error-handling';

const escalationSystem = new EscalationSystem({
  errorThreshold: 5,      // Escalate after 5 errors
  timeWindow: 300000,     // Within 5 minutes
  severityLevels: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
  handlers: [
    {
      name: 'slack_alert',
      handle: async (errors, context) => {
        await sendSlackAlert({
          message: `🚨 ${errors.length} errors in ${context.operation}`,
          errors: errors.slice(0, 3), // First 3 errors
          context
        });
      }
    },
    {
      name: 'pagerduty_incident',
      handle: async (errors, context) => {
        if (errors.some(e => e.severity === ErrorSeverity.CRITICAL)) {
          await createPagerDutyIncident(context);
        }
      },
      stopPropagation: true // Stop further handlers if incident created
    }
  ]
});

// Errors are automatically escalated when thresholds are met
const escalated = await escalationSystem.recordError(
  classifiedError,
  'llm_generation',
  'agent-123'
);
```

## Integration Patterns

### Decorator Pattern

Use decorators for automatic error handling on class methods:

```typescript
import { withErrorHandling } from '@voltagent/core/error-handling';

class MyAgent {
  @withErrorHandling('text_generation', 'anthropic')
  async generateText(prompt: string) {
    return await this.llmProvider.generateText(prompt);
  }

  @withErrorHandling('tool_execution')
  async executeTool(toolName: string, args: any) {
    return await this.toolRegistry.execute(toolName, args);
  }
}
```

### Wrapper Functions

Create reusable wrappers for common operations:

```typescript
import { ErrorHandlingIntegration } from '@voltagent/core/error-handling';

// Wrap LLM provider operations
const safeGenerateText = (params: any) => 
  ErrorHandlingIntegration.wrapProviderOperation(
    () => llmProvider.generateText(params),
    'anthropic',
    'generateText',
    agentId,
    { model: params.model }
  );

// Wrap tool executions
const safeExecuteTool = (toolName: string, args: any) =>
  ErrorHandlingIntegration.wrapToolExecution(
    () => toolRegistry.execute(toolName, args),
    toolName,
    agentId,
    { args }
  );
```

### Batch Operations

Handle batch operations with individual error handling:

```typescript
import { ErrorHandlingPatterns } from '@voltagent/core/error-handling';

const results = await ErrorHandlingPatterns.executeBatch(
  prompts,
  async (prompt) => await llmProvider.generateText(prompt),
  {
    concurrency: 5,
    continueOnError: true,
    retryFailures: true
  }
);

// Process results
const successful = results.filter(r => r.success);
const failed = results.filter(r => !r.success);

console.log(`${successful.length} succeeded, ${failed.length} failed`);
```

## Configuration

### Complete Configuration Example

```typescript
import { 
  ErrorHandlingManager, 
  ErrorHandlingUtils,
  ErrorCategory,
  ErrorSeverity,
  RetryStrategy 
} from '@voltagent/core/error-handling';

const errorHandler = new ErrorHandlingManager({
  // Retry configuration
  retry: {
    maxRetries: 5,
    strategy: RetryStrategy.EXPONENTIAL,
    baseDelay: 1000,
    maxDelay: 60000,
    backoffMultiplier: 2,
    jitter: 0.1,
    shouldRetry: (error, attempt) => {
      // Custom retry logic
      if (error.category === ErrorCategory.AUTH) return false;
      if (error.category === ErrorCategory.RATE_LIMIT) return attempt <= 2;
      return error.retryable && attempt <= 5;
    },
    onRetry: async (error, attempt, delay) => {
      console.log(`Retrying ${error.errorId} (attempt ${attempt}) after ${delay}ms`);
    }
  },

  // Circuit breaker configuration
  circuitBreaker: {
    failureThreshold: 10,
    successThreshold: 5,
    timeWindow: 120000, // 2 minutes
    timeout: 60000,     // 1 minute
    onOpen: () => console.log('🔴 Circuit breaker opened'),
    onClose: () => console.log('🟢 Circuit breaker closed'),
    onHalfOpen: () => console.log('🟡 Circuit breaker half-open')
  },

  // Escalation configuration
  escalation: {
    errorThreshold: 10,
    timeWindow: 600000, // 10 minutes
    severityLevels: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
    handlers: [
      {
        name: 'metrics_collector',
        handle: async (errors, context) => {
          await metricsService.recordEscalation({
            operation: context.operation,
            errorCount: errors.length,
            severity: Math.max(...errors.map(e => getSeverityLevel(e.severity)))
          });
        }
      }
    ]
  },

  // Recovery configuration
  recovery: {
    maxRecoveryAttempts: 3,
    strategies: new Map([
      [ErrorCategory.MODEL, [/* custom model recovery strategies */]],
      [ErrorCategory.RATE_LIMIT, [/* rate limit recovery strategies */]]
    ])
  },

  // Error classification rules
  classification: {
    messagePatterns: new Map([
      [/custom.*pattern/i, {
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        retryable: false,
        confidence: 0.9
      }]
    ]),
    errorCodes: new Map([
      ['CUSTOM_ERROR', {
        category: ErrorCategory.PERMANENT,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        confidence: 1.0
      }]
    ]),
    providerRules: new Map([
      ['my-provider', {
        /* provider-specific rules */
      }]
    ]),
    defaultClassification: {
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      confidence: 0.3
    }
  },

  // Global error handlers
  globalHandlers: [
    {
      name: 'logger',
      handle: async (error, context) => {
        logger.error('VoltAgent Error', {
          errorId: error.errorId,
          category: error.category,
          operation: context.operation,
          agentId: context.agentId
        });
      },
      categories: [ErrorCategory.CRITICAL] // Only handle critical errors
    }
  ],

  enableLogging: true,
  enableMetrics: true
});
```

### Quick Configuration Helpers

```typescript
import { ErrorHandlingUtils } from '@voltagent/core/error-handling';

// Create basic configurations quickly
const basicConfig = ErrorHandlingUtils.createErrorHandlingConfig({
  maxRetries: 3,
  baseDelay: 1000,
  circuitBreakerThreshold: 5,
  escalationThreshold: 10,
  enableLogging: true,
  enableMetrics: true
});

const errorHandler = new ErrorHandlingManager(basicConfig);
```

## Monitoring and Metrics

### System Status

```typescript
const status = errorHandler.getSystemStatus();

console.log('Error Metrics:', status.metrics);
console.log('Circuit Breaker Status:', status.circuitBreakers);
console.log('Escalation Metrics:', status.escalation);
console.log('Current Configuration:', status.configuration);
```

### Custom Metrics Integration

```typescript
// Register custom metrics handler
errorHandler.registerGlobalHandler({
  name: 'custom_metrics',
  handle: async (error, context) => {
    await customMetricsService.recordError({
      category: error.category,
      severity: error.severity,
      operation: context.operation,
      provider: context.provider,
      timestamp: error.timestamp
    });
  }
});
```

## Best Practices

### 1. Error Context

Always provide rich context for better error handling:

```typescript
const context = {
  operation: 'llm_generate_with_tools',
  agentId: agent.id,
  provider: 'anthropic',
  metadata: {
    model: 'claude-3-sonnet',
    toolCount: tools.length,
    conversationId: conversation.id,
    userId: user.id,
    requestId: generateRequestId()
  }
};
```

### 2. Category-Specific Handling

Configure different strategies for different error categories:

```typescript
const config = {
  retry: {
    shouldRetry: (error, attempt) => {
      switch (error.category) {
        case ErrorCategory.RATE_LIMIT:
          return attempt <= 2; // Limited retries for rate limits
        case ErrorCategory.NETWORK:
          return attempt <= 5; // More retries for network issues
        case ErrorCategory.AUTH:
          return false; // Never retry auth errors
        default:
          return error.retryable && attempt <= 3;
      }
    }
  }
};
```

### 3. Graceful Degradation

Use recovery strategies for graceful degradation:

```typescript
recoverySystem.registerStrategy({
  name: 'graceful_degradation',
  priority: 50,
  canHandle: (error) => error.category === ErrorCategory.MODEL,
  recover: async (error, context) => {
    // Fallback to simpler model or cached response
    if (context.originalParams.model === 'gpt-4') {
      return {
        success: true,
        result: { ...context.originalParams, model: 'gpt-3.5-turbo' }
      };
    }
    
    // Try cached response
    const cached = await getCachedResponse(context.originalParams);
    if (cached) {
      return { success: true, result: cached };
    }
    
    return { success: false, continueRecovery: true };
  }
});
```

### 4. Testing Error Scenarios

Test your error handling with controlled failures:

```typescript
// Force circuit breaker open for testing
circuitBreaker.forceOpen();

// Force escalation for testing
await escalationSystem.forceEscalation(testError, 'test_operation');

// Test recovery strategies
const recoveryResult = await recoverySystem.recover(testError, testParams);
```

## Migration Guide

### From Basic Error Handling

Replace basic try-catch blocks:

```typescript
// Before
try {
  const result = await llmProvider.generateText(params);
  return result;
} catch (error) {
  console.error('LLM error:', error);
  throw error;
}

// After
const result = await defaultErrorHandler.executeWithErrorHandling(
  () => llmProvider.generateText(params),
  {
    operation: 'llm_generate',
    provider: 'anthropic',
    metadata: { model: params.model }
  }
);

if (result.success) {
  return result.result;
} else {
  throw result.error;
}
```

### From Existing Retry Logic

Replace manual retry loops:

```typescript
// Before
let retries = 0;
while (retries < 3) {
  try {
    return await operation();
  } catch (error) {
    retries++;
    if (retries >= 3) throw error;
    await sleep(1000 * retries);
  }
}

// After
return await retryManager.execute(operation, 'my_operation');
```

## API Reference

See the TypeScript definitions for complete API documentation. Key exports:

- `ErrorHandlingManager` - Main coordinator class
- `ErrorClassifier` - Error classification system
- `RetryManager` - Retry strategy implementation
- `CircuitBreaker` - Circuit breaker pattern
- `RecoverySystem` - Error recovery strategies
- `EscalationSystem` - Error escalation management
- `ErrorHandlingIntegration` - Integration utilities
- `ErrorHandlingPatterns` - Common patterns and helpers
- `ErrorHandlingUtils` - Configuration utilities

## Contributing

When adding new error patterns or recovery strategies:

1. Add appropriate error classification rules
2. Implement recovery strategies for new error types
3. Add comprehensive tests
4. Update documentation with examples
5. Consider backward compatibility

## License

Part of the VoltAgent framework. See main project license.

