/**
 * Error Classification System
 * Intelligently categorizes errors for appropriate handling
 */

import { v4 as uuidv4 } from "uuid";
import type { VoltAgentError } from "../agent/types";
import type {
  ClassifiedError,
  ErrorCategory,
  ErrorSeverity,
  ErrorClassification,
  ErrorClassificationRules,
} from "./types";

/**
 * Default error classification rules
 */
const DEFAULT_CLASSIFICATION_RULES: ErrorClassificationRules = {
  messagePatterns: new Map([
    // Rate limiting patterns
    [/rate.?limit|too.?many.?requests|quota.?exceeded/i, {
      category: ErrorCategory.RATE_LIMIT,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      suggestedDelay: 60000, // 1 minute
      confidence: 0.9
    }],
    // Authentication patterns
    [/unauthorized|authentication|invalid.?token|expired.?token/i, {
      category: ErrorCategory.AUTH,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      confidence: 0.9
    }],
    // Network patterns
    [/network|connection|timeout|dns|socket/i, {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      suggestedDelay: 5000, // 5 seconds
      confidence: 0.8
    }],
    // Validation patterns
    [/validation|invalid.?input|bad.?request|malformed/i, {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      retryable: false,
      confidence: 0.9
    }],
    // Resource patterns
    [/not.?found|resource.?not.?available|service.?unavailable/i, {
      category: ErrorCategory.RESOURCE,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      suggestedDelay: 10000, // 10 seconds
      confidence: 0.8
    }],
    // Model patterns
    [/model.?error|inference.?error|generation.?failed/i, {
      category: ErrorCategory.MODEL,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      suggestedDelay: 5000,
      confidence: 0.8
    }],
    // Tool patterns
    [/tool.?execution|tool.?error|function.?call.?failed/i, {
      category: ErrorCategory.TOOL,
      severity: ErrorSeverity.MEDIUM,
      retryable: true,
      suggestedDelay: 2000,
      confidence: 0.9
    }]
  ]),
  
  errorCodes: new Map([
    // HTTP status codes
    [400, { category: ErrorCategory.VALIDATION, severity: ErrorSeverity.LOW, retryable: false, confidence: 0.9 }],
    [401, { category: ErrorCategory.AUTH, severity: ErrorSeverity.HIGH, retryable: false, confidence: 0.9 }],
    [403, { category: ErrorCategory.AUTH, severity: ErrorSeverity.HIGH, retryable: false, confidence: 0.9 }],
    [404, { category: ErrorCategory.RESOURCE, severity: ErrorSeverity.MEDIUM, retryable: false, confidence: 0.9 }],
    [408, { category: ErrorCategory.NETWORK, severity: ErrorSeverity.MEDIUM, retryable: true, suggestedDelay: 5000, confidence: 0.9 }],
    [429, { category: ErrorCategory.RATE_LIMIT, severity: ErrorSeverity.MEDIUM, retryable: true, suggestedDelay: 60000, confidence: 0.9 }],
    [500, { category: ErrorCategory.TRANSIENT, severity: ErrorSeverity.HIGH, retryable: true, suggestedDelay: 10000, confidence: 0.8 }],
    [502, { category: ErrorCategory.TRANSIENT, severity: ErrorSeverity.MEDIUM, retryable: true, suggestedDelay: 5000, confidence: 0.8 }],
    [503, { category: ErrorCategory.TRANSIENT, severity: ErrorSeverity.MEDIUM, retryable: true, suggestedDelay: 10000, confidence: 0.8 }],
    [504, { category: ErrorCategory.NETWORK, severity: ErrorSeverity.MEDIUM, retryable: true, suggestedDelay: 10000, confidence: 0.9 }],
    
    // Common error codes
    ["ECONNRESET", { category: ErrorCategory.NETWORK, severity: ErrorSeverity.MEDIUM, retryable: true, suggestedDelay: 5000, confidence: 0.9 }],
    ["ENOTFOUND", { category: ErrorCategory.NETWORK, severity: ErrorSeverity.MEDIUM, retryable: true, suggestedDelay: 5000, confidence: 0.9 }],
    ["ETIMEDOUT", { category: ErrorCategory.NETWORK, severity: ErrorSeverity.MEDIUM, retryable: true, suggestedDelay: 10000, confidence: 0.9 }],
  ]),
  
  providerRules: new Map([
    // Provider-specific rules can be added here
    ["anthropic", {
      messagePatterns: new Map([
        [/overloaded|capacity/i, {
          category: ErrorCategory.RATE_LIMIT,
          severity: ErrorSeverity.MEDIUM,
          retryable: true,
          suggestedDelay: 30000,
          confidence: 0.9
        }]
      ]),
      errorCodes: new Map(),
      providerRules: new Map(),
      defaultClassification: {
        category: ErrorCategory.MODEL,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        confidence: 0.5
      }
    }],
    ["openai", {
      messagePatterns: new Map([
        [/context.?length|token.?limit/i, {
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.MEDIUM,
          retryable: false,
          confidence: 0.9
        }]
      ]),
      errorCodes: new Map(),
      providerRules: new Map(),
      defaultClassification: {
        category: ErrorCategory.MODEL,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        confidence: 0.5
      }
    }]
  ]),
  
  defaultClassification: {
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    retryable: true,
    confidence: 0.3
  }
};

/**
 * Error classifier that categorizes errors for intelligent handling
 */
export class ErrorClassifier {
  private rules: ErrorClassificationRules;

  constructor(customRules?: Partial<ErrorClassificationRules>) {
    this.rules = this.mergeRules(DEFAULT_CLASSIFICATION_RULES, customRules);
  }

  /**
   * Classifies an error and returns enhanced error information
   */
  classify(error: VoltAgentError, provider?: string): ClassifiedError {
    const classification = this.classifyError(error, provider);
    
    return {
      ...error,
      category: classification.category,
      severity: classification.severity,
      retryable: classification.retryable,
      suggestedDelay: classification.suggestedDelay,
      confidence: classification.confidence,
      timestamp: new Date(),
      errorId: uuidv4()
    };
  }

  /**
   * Updates classification rules
   */
  updateRules(rules: Partial<ErrorClassificationRules>): void {
    this.rules = this.mergeRules(this.rules, rules);
  }

  /**
   * Gets current classification rules
   */
  getRules(): ErrorClassificationRules {
    return { ...this.rules };
  }

  /**
   * Classifies error based on rules
   */
  private classifyError(error: VoltAgentError, provider?: string): ErrorClassification {
    // Try provider-specific rules first
    if (provider && this.rules.providerRules.has(provider)) {
      const providerRules = this.rules.providerRules.get(provider)!;
      const providerClassification = this.applyRules(error, providerRules);
      if (providerClassification.confidence && providerClassification.confidence > 0.7) {
        return providerClassification;
      }
    }

    // Apply general rules
    const generalClassification = this.applyRules(error, this.rules);
    
    // If confidence is low, try to improve classification
    if (!generalClassification.confidence || generalClassification.confidence < 0.7) {
      const improvedClassification = this.improveClassification(error, generalClassification);
      return improvedClassification;
    }

    return generalClassification;
  }

  /**
   * Applies classification rules to an error
   */
  private applyRules(error: VoltAgentError, rules: ErrorClassificationRules): ErrorClassification {
    // Check error code first (highest confidence)
    if (error.code && rules.errorCodes.has(error.code)) {
      return rules.errorCodes.get(error.code)!;
    }

    // Check message patterns
    for (const [pattern, classification] of rules.messagePatterns) {
      if (pattern.test(error.message)) {
        return classification;
      }
    }

    // Check tool errors
    if (error.toolError) {
      return {
        category: ErrorCategory.TOOL,
        severity: ErrorSeverity.MEDIUM,
        retryable: true,
        suggestedDelay: 2000,
        confidence: 0.8
      };
    }

    // Return default classification
    return rules.defaultClassification;
  }

  /**
   * Attempts to improve classification using additional heuristics
   */
  private improveClassification(error: VoltAgentError, baseClassification: ErrorClassification): ErrorClassification {
    let improved = { ...baseClassification };

    // Analyze original error for additional context
    if (error.originalError) {
      const originalErrorString = String(error.originalError);
      
      // Check for specific error types
      if (originalErrorString.includes("AbortError")) {
        improved = {
          category: ErrorCategory.TRANSIENT,
          severity: ErrorSeverity.LOW,
          retryable: true,
          suggestedDelay: 1000,
          confidence: 0.8
        };
      } else if (originalErrorString.includes("TypeError")) {
        improved = {
          category: ErrorCategory.VALIDATION,
          severity: ErrorSeverity.MEDIUM,
          retryable: false,
          confidence: 0.8
        };
      }
    }

    // Analyze metadata for additional context
    if (error.metadata) {
      // Check for retry-related metadata
      if (error.metadata.retryAfter) {
        improved.category = ErrorCategory.RATE_LIMIT;
        improved.suggestedDelay = Number(error.metadata.retryAfter) * 1000;
        improved.confidence = 0.9;
      }

      // Check for request ID (indicates server error)
      if (error.metadata.request_id || error.metadata.requestId) {
        if (improved.category === ErrorCategory.UNKNOWN) {
          improved.category = ErrorCategory.TRANSIENT;
          improved.retryable = true;
          improved.confidence = 0.7;
        }
      }
    }

    // Analyze stage for context
    if (error.stage) {
      switch (error.stage) {
        case "llm_request":
        case "llm_generate":
          if (improved.category === ErrorCategory.UNKNOWN) {
            improved.category = ErrorCategory.MODEL;
            improved.confidence = 0.7;
          }
          break;
        case "tool_execution":
          improved.category = ErrorCategory.TOOL;
          improved.confidence = 0.8;
          break;
        case "response_parsing":
          improved.category = ErrorCategory.MODEL;
          improved.severity = ErrorSeverity.MEDIUM;
          improved.confidence = 0.8;
          break;
      }
    }

    return improved;
  }

  /**
   * Merges classification rules
   */
  private mergeRules(
    base: ErrorClassificationRules,
    custom?: Partial<ErrorClassificationRules>
  ): ErrorClassificationRules {
    if (!custom) return base;

    return {
      messagePatterns: new Map([...base.messagePatterns, ...(custom.messagePatterns || [])]),
      errorCodes: new Map([...base.errorCodes, ...(custom.errorCodes || [])]),
      providerRules: new Map([...base.providerRules, ...(custom.providerRules || [])]),
      defaultClassification: custom.defaultClassification || base.defaultClassification
    };
  }
}

/**
 * Default error classifier instance
 */
export const defaultErrorClassifier = new ErrorClassifier();

