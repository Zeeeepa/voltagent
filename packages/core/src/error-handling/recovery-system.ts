/**
 * Error Recovery System
 * Implements intelligent recovery strategies for different error types
 */

import type {
  ClassifiedError,
  RecoveryConfig,
  RecoveryStrategy,
  RecoveryContext,
  RecoveryResult,
  RecoveryAttempt,
  ErrorCategory,
} from "./types";

/**
 * Default recovery configuration
 */
const DEFAULT_RECOVERY_CONFIG: RecoveryConfig = {
  strategies: new Map(),
  maxRecoveryAttempts: 3,
};

/**
 * Recovery system that implements various recovery strategies
 */
export class RecoverySystem {
  private config: RecoveryConfig;
  private strategies: Map<string, RecoveryStrategy> = new Map();

  constructor(config?: Partial<RecoveryConfig>) {
    this.config = { ...DEFAULT_RECOVERY_CONFIG, ...config };
    this.initializeDefaultStrategies();
  }

  /**
   * Attempts to recover from an error
   */
  async recover<T>(
    error: ClassifiedError,
    originalParams: any,
    context: Partial<RecoveryContext> = {}
  ): Promise<RecoveryResult> {
    const recoveryContext: RecoveryContext = {
      originalParams,
      attempt: 1,
      previousAttempts: [],
      metadata: {},
      ...context,
    };

    const applicableStrategies = this.getApplicableStrategies(error);
    
    for (let attempt = 1; attempt <= this.config.maxRecoveryAttempts; attempt++) {
      recoveryContext.attempt = attempt;

      for (const strategy of applicableStrategies) {
        try {
          const result = await strategy.recover(error, recoveryContext);
          
          // Record the attempt
          const attemptRecord: RecoveryAttempt = {
            strategy: strategy.name,
            timestamp: new Date(),
            success: result.success,
            error: result.error,
            result: result.result,
          };
          recoveryContext.previousAttempts.push(attemptRecord);

          if (result.success) {
            return result;
          }

          if (!result.continueRecovery) {
            break;
          }
        } catch (recoveryError) {
          // Record failed recovery attempt
          const attemptRecord: RecoveryAttempt = {
            strategy: strategy.name,
            timestamp: new Date(),
            success: false,
            error: recoveryError as ClassifiedError,
          };
          recoveryContext.previousAttempts.push(attemptRecord);
        }
      }
    }

    // All recovery attempts failed
    return {
      success: false,
      error: error,
      continueRecovery: false,
    };
  }

  /**
   * Registers a recovery strategy
   */
  registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.set(strategy.name, strategy);
    
    // Update category mappings if needed
    for (const [category, strategies] of this.config.strategies) {
      if (strategy.canHandle({ category } as ClassifiedError)) {
        strategies.push(strategy);
        strategies.sort((a, b) => b.priority - a.priority);
      }
    }
  }

  /**
   * Unregisters a recovery strategy
   */
  unregisterStrategy(name: string): boolean {
    const removed = this.strategies.delete(name);
    
    if (removed) {
      // Remove from category mappings
      for (const strategies of this.config.strategies.values()) {
        const index = strategies.findIndex(s => s.name === name);
        if (index !== -1) {
          strategies.splice(index, 1);
        }
      }
    }
    
    return removed;
  }

  /**
   * Gets applicable recovery strategies for an error
   */
  private getApplicableStrategies(error: ClassifiedError): RecoveryStrategy[] {
    const categoryStrategies = this.config.strategies.get(error.category) || [];
    const defaultStrategies = this.config.defaultStrategy ? [this.config.defaultStrategy] : [];
    
    const allStrategies = [...categoryStrategies, ...defaultStrategies];
    
    // Filter strategies that can handle this specific error
    const applicableStrategies = allStrategies.filter(strategy => 
      strategy.canHandle(error)
    );
    
    // Sort by priority (highest first)
    return applicableStrategies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Initializes default recovery strategies
   */
  private initializeDefaultStrategies(): void {
    // Parameter adjustment strategy
    const parameterAdjustmentStrategy: RecoveryStrategy = {
      name: "parameter_adjustment",
      priority: 80,
      canHandle: (error) => [
        ErrorCategory.VALIDATION,
        ErrorCategory.MODEL,
      ].includes(error.category),
      recover: async (error, context) => {
        // Try to adjust parameters that might be causing issues
        const adjustedParams = this.adjustParameters(context.originalParams, error);
        
        if (adjustedParams !== context.originalParams) {
          return {
            success: true,
            result: adjustedParams,
            continueRecovery: false,
          };
        }
        
        return {
          success: false,
          continueRecovery: true,
        };
      },
    };

    // Fallback model strategy
    const fallbackModelStrategy: RecoveryStrategy = {
      name: "fallback_model",
      priority: 70,
      canHandle: (error) => error.category === ErrorCategory.MODEL,
      recover: async (error, context) => {
        // Try to use a fallback model
        const fallbackModel = this.getFallbackModel(context.originalParams.model);
        
        if (fallbackModel) {
          const adjustedParams = {
            ...context.originalParams,
            model: fallbackModel,
          };
          
          return {
            success: true,
            result: adjustedParams,
            continueRecovery: false,
          };
        }
        
        return {
          success: false,
          continueRecovery: true,
        };
      },
    };

    // Simplified request strategy
    const simplifiedRequestStrategy: RecoveryStrategy = {
      name: "simplified_request",
      priority: 60,
      canHandle: (error) => [
        ErrorCategory.MODEL,
        ErrorCategory.VALIDATION,
      ].includes(error.category),
      recover: async (error, context) => {
        // Try to simplify the request
        const simplifiedParams = this.simplifyRequest(context.originalParams, error);
        
        if (simplifiedParams !== context.originalParams) {
          return {
            success: true,
            result: simplifiedParams,
            continueRecovery: false,
          };
        }
        
        return {
          success: false,
          continueRecovery: true,
        };
      },
    };

    // Tool retry strategy
    const toolRetryStrategy: RecoveryStrategy = {
      name: "tool_retry",
      priority: 90,
      canHandle: (error) => error.category === ErrorCategory.TOOL,
      recover: async (error, context) => {
        // For tool errors, try with modified tool parameters
        if (error.toolError) {
          const modifiedParams = this.modifyToolParameters(
            context.originalParams,
            error.toolError
          );
          
          return {
            success: true,
            result: modifiedParams,
            continueRecovery: false,
          };
        }
        
        return {
          success: false,
          continueRecovery: true,
        };
      },
    };

    // Register default strategies
    this.registerStrategy(parameterAdjustmentStrategy);
    this.registerStrategy(fallbackModelStrategy);
    this.registerStrategy(simplifiedRequestStrategy);
    this.registerStrategy(toolRetryStrategy);

    // Initialize category mappings
    this.config.strategies.set(ErrorCategory.VALIDATION, []);
    this.config.strategies.set(ErrorCategory.MODEL, []);
    this.config.strategies.set(ErrorCategory.TOOL, []);
    this.config.strategies.set(ErrorCategory.RATE_LIMIT, []);
    this.config.strategies.set(ErrorCategory.NETWORK, []);
    this.config.strategies.set(ErrorCategory.TRANSIENT, []);
  }

  /**
   * Adjusts parameters based on error information
   */
  private adjustParameters(originalParams: any, error: ClassifiedError): any {
    const adjustedParams = { ...originalParams };
    
    // Adjust based on error message patterns
    if (error.message.includes("token") || error.message.includes("length")) {
      // Reduce max tokens or context length
      if (adjustedParams.maxTokens) {
        adjustedParams.maxTokens = Math.floor(adjustedParams.maxTokens * 0.8);
      }
      if (adjustedParams.contextLimit) {
        adjustedParams.contextLimit = Math.floor(adjustedParams.contextLimit * 0.8);
      }
    }
    
    if (error.message.includes("temperature")) {
      // Adjust temperature
      if (adjustedParams.temperature) {
        adjustedParams.temperature = Math.min(1.0, adjustedParams.temperature * 0.8);
      }
    }
    
    if (error.message.includes("frequency") || error.message.includes("repetition")) {
      // Adjust frequency penalty
      if (adjustedParams.frequencyPenalty !== undefined) {
        adjustedParams.frequencyPenalty = Math.min(2.0, adjustedParams.frequencyPenalty + 0.2);
      }
    }
    
    return adjustedParams;
  }

  /**
   * Gets fallback model for the given model
   */
  private getFallbackModel(currentModel: string): string | null {
    const fallbackMappings: Record<string, string> = {
      "gpt-4": "gpt-3.5-turbo",
      "gpt-4-turbo": "gpt-4",
      "claude-3-opus": "claude-3-sonnet",
      "claude-3-sonnet": "claude-3-haiku",
    };
    
    return fallbackMappings[currentModel] || null;
  }

  /**
   * Simplifies request parameters
   */
  private simplifyRequest(originalParams: any, error: ClassifiedError): any {
    const simplifiedParams = { ...originalParams };
    
    // Remove complex features that might be causing issues
    if (simplifiedParams.tools && simplifiedParams.tools.length > 0) {
      // Reduce number of tools
      simplifiedParams.tools = simplifiedParams.tools.slice(0, Math.ceil(simplifiedParams.tools.length / 2));
    }
    
    // Simplify system message
    if (simplifiedParams.messages) {
      simplifiedParams.messages = simplifiedParams.messages.map((msg: any) => {
        if (msg.role === "system" && msg.content.length > 500) {
          return {
            ...msg,
            content: msg.content.substring(0, 500) + "...",
          };
        }
        return msg;
      });
    }
    
    // Reduce complexity parameters
    if (simplifiedParams.topP) {
      simplifiedParams.topP = Math.max(0.1, simplifiedParams.topP * 0.8);
    }
    
    return simplifiedParams;
  }

  /**
   * Modifies tool parameters based on tool error
   */
  private modifyToolParameters(originalParams: any, toolError: any): any {
    const modifiedParams = { ...originalParams };
    
    // If specific tool failed, try removing it temporarily
    if (modifiedParams.tools && toolError.toolName) {
      modifiedParams.tools = modifiedParams.tools.filter(
        (tool: any) => tool.name !== toolError.toolName
      );
    }
    
    return modifiedParams;
  }

  /**
   * Updates recovery configuration
   */
  updateConfig(config: Partial<RecoveryConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets current recovery configuration
   */
  getConfig(): RecoveryConfig {
    return { ...this.config };
  }

  /**
   * Gets all registered strategies
   */
  getStrategies(): Map<string, RecoveryStrategy> {
    return new Map(this.strategies);
  }
}

/**
 * Default recovery system instance
 */
export const defaultRecoverySystem = new RecoverySystem();

