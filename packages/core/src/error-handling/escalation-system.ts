/**
 * Error Escalation System
 * Manages error escalation based on severity and frequency
 */

import type {
  ClassifiedError,
  EscalationConfig,
  EscalationHandler,
  EscalationContext,
  ErrorSeverity,
} from "./types";

/**
 * Default escalation configuration
 */
const DEFAULT_ESCALATION_CONFIG: EscalationConfig = {
  errorThreshold: 5,
  timeWindow: 300000, // 5 minutes
  severityLevels: [ErrorSeverity.HIGH, ErrorSeverity.CRITICAL],
  handlers: [],
};

/**
 * Error record for escalation tracking
 */
interface ErrorRecord {
  error: ClassifiedError;
  timestamp: Date;
  operation: string;
  agentId?: string;
}

/**
 * Escalation system that manages error escalation
 */
export class EscalationSystem {
  private config: EscalationConfig;
  private errorHistory: ErrorRecord[] = [];
  private handlers: Map<string, EscalationHandler> = new Map();

  constructor(config?: Partial<EscalationConfig>) {
    this.config = { ...DEFAULT_ESCALATION_CONFIG, ...config };
    this.initializeDefaultHandlers();
  }

  /**
   * Records an error and checks for escalation
   */
  async recordError(
    error: ClassifiedError,
    operation: string,
    agentId?: string,
    metadata: Record<string, any> = {}
  ): Promise<boolean> {
    const errorRecord: ErrorRecord = {
      error,
      timestamp: new Date(),
      operation,
      agentId,
    };

    this.errorHistory.push(errorRecord);
    this.cleanOldRecords();

    // Check if escalation is needed
    const shouldEscalate = this.shouldEscalate(error, operation, agentId);
    
    if (shouldEscalate) {
      await this.escalate(error, operation, agentId, metadata);
      return true;
    }

    return false;
  }

  /**
   * Registers an escalation handler
   */
  registerHandler(handler: EscalationHandler): void {
    this.handlers.set(handler.name, handler);
    
    // Add to config handlers if not already present
    if (!this.config.handlers.find(h => h.name === handler.name)) {
      this.config.handlers.push(handler);
    }
  }

  /**
   * Unregisters an escalation handler
   */
  unregisterHandler(name: string): boolean {
    const removed = this.handlers.delete(name);
    
    if (removed) {
      this.config.handlers = this.config.handlers.filter(h => h.name !== name);
    }
    
    return removed;
  }

  /**
   * Gets escalation metrics
   */
  getMetrics() {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.timeWindow);
    const recentErrors = this.errorHistory.filter(e => e.timestamp >= windowStart);

    const errorsByOperation = new Map<string, number>();
    const errorsByAgent = new Map<string, number>();
    const errorsBySeverity = new Map<ErrorSeverity, number>();

    for (const record of recentErrors) {
      // Count by operation
      const opCount = errorsByOperation.get(record.operation) || 0;
      errorsByOperation.set(record.operation, opCount + 1);

      // Count by agent
      if (record.agentId) {
        const agentCount = errorsByAgent.get(record.agentId) || 0;
        errorsByAgent.set(record.agentId, agentCount + 1);
      }

      // Count by severity
      const severityCount = errorsBySeverity.get(record.error.severity) || 0;
      errorsBySeverity.set(record.error.severity, severityCount + 1);
    }

    return {
      totalErrors: recentErrors.length,
      errorsByOperation,
      errorsByAgent,
      errorsBySeverity,
      escalationThreshold: this.config.errorThreshold,
      timeWindow: this.config.timeWindow,
    };
  }

  /**
   * Forces escalation for testing or manual triggers
   */
  async forceEscalation(
    error: ClassifiedError,
    operation: string,
    agentId?: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    await this.escalate(error, operation, agentId, metadata);
  }

  /**
   * Checks if error should be escalated
   */
  private shouldEscalate(error: ClassifiedError, operation: string, agentId?: string): boolean {
    // Check if severity level triggers escalation
    if (!this.config.severityLevels.includes(error.severity)) {
      return false;
    }

    // Check error frequency within time window
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.timeWindow);
    
    const recentErrors = this.errorHistory.filter(record => {
      return record.timestamp >= windowStart &&
             record.operation === operation &&
             (agentId ? record.agentId === agentId : true);
    });

    return recentErrors.length >= this.config.errorThreshold;
  }

  /**
   * Performs error escalation
   */
  private async escalate(
    error: ClassifiedError,
    operation: string,
    agentId?: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    const context: EscalationContext = {
      operation,
      agentId,
      metadata,
    };

    // Get relevant errors for context
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.timeWindow);
    const relevantErrors = this.errorHistory
      .filter(record => {
        return record.timestamp >= windowStart &&
               record.operation === operation &&
               (agentId ? record.agentId === agentId : true);
      })
      .map(record => record.error);

    // Execute escalation handlers
    for (const handler of this.config.handlers) {
      try {
        await handler.handle(relevantErrors, context);
        
        if (handler.stopPropagation) {
          break;
        }
      } catch (handlerError) {
        console.error(`Escalation handler ${handler.name} failed:`, handlerError);
      }
    }
  }

  /**
   * Cleans old error records outside time window
   */
  private cleanOldRecords(): void {
    const now = new Date();
    const windowStart = new Date(now.getTime() - this.config.timeWindow);
    
    this.errorHistory = this.errorHistory.filter(record => record.timestamp >= windowStart);
  }

  /**
   * Initializes default escalation handlers
   */
  private initializeDefaultHandlers(): void {
    // Console logging handler
    const consoleHandler: EscalationHandler = {
      name: "console_logger",
      handle: async (errors, context) => {
        console.error(`🚨 ERROR ESCALATION TRIGGERED 🚨`);
        console.error(`Operation: ${context.operation}`);
        console.error(`Agent ID: ${context.agentId || "unknown"}`);
        console.error(`Error count: ${errors.length}`);
        console.error(`Recent errors:`, errors.map(e => ({
          id: e.errorId,
          category: e.category,
          severity: e.severity,
          message: e.message,
          timestamp: e.timestamp,
        })));
      },
    };

    // Metrics handler
    const metricsHandler: EscalationHandler = {
      name: "metrics_collector",
      handle: async (errors, context) => {
        // This would integrate with your metrics system
        // For now, just log metrics
        const metrics = {
          escalation_triggered: 1,
          operation: context.operation,
          agent_id: context.agentId,
          error_count: errors.length,
          severity_breakdown: this.getSeverityBreakdown(errors),
          category_breakdown: this.getCategoryBreakdown(errors),
        };
        
        console.log("Escalation metrics:", metrics);
      },
    };

    // Alert handler (placeholder for integration with alerting systems)
    const alertHandler: EscalationHandler = {
      name: "alert_system",
      handle: async (errors, context) => {
        // This would integrate with your alerting system (PagerDuty, Slack, etc.)
        const alert = {
          title: `VoltAgent Error Escalation: ${context.operation}`,
          description: `${errors.length} errors detected in ${context.operation}`,
          severity: this.getHighestSeverity(errors),
          context,
          errors: errors.slice(0, 5), // Include first 5 errors
        };
        
        console.log("Alert would be sent:", alert);
      },
    };

    this.registerHandler(consoleHandler);
    this.registerHandler(metricsHandler);
    this.registerHandler(alertHandler);
  }

  /**
   * Gets severity breakdown of errors
   */
  private getSeverityBreakdown(errors: ClassifiedError[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    for (const error of errors) {
      breakdown[error.severity] = (breakdown[error.severity] || 0) + 1;
    }
    
    return breakdown;
  }

  /**
   * Gets category breakdown of errors
   */
  private getCategoryBreakdown(errors: ClassifiedError[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    
    for (const error of errors) {
      breakdown[error.category] = (breakdown[error.category] || 0) + 1;
    }
    
    return breakdown;
  }

  /**
   * Gets highest severity from error list
   */
  private getHighestSeverity(errors: ClassifiedError[]): ErrorSeverity {
    const severityOrder = [
      ErrorSeverity.LOW,
      ErrorSeverity.MEDIUM,
      ErrorSeverity.HIGH,
      ErrorSeverity.CRITICAL,
    ];
    
    let highest = ErrorSeverity.LOW;
    
    for (const error of errors) {
      const currentIndex = severityOrder.indexOf(error.severity);
      const highestIndex = severityOrder.indexOf(highest);
      
      if (currentIndex > highestIndex) {
        highest = error.severity;
      }
    }
    
    return highest;
  }

  /**
   * Updates escalation configuration
   */
  updateConfig(config: Partial<EscalationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Gets current escalation configuration
   */
  getConfig(): EscalationConfig {
    return { ...this.config };
  }

  /**
   * Clears error history
   */
  clearHistory(): void {
    this.errorHistory = [];
  }
}

/**
 * Default escalation system instance
 */
export const defaultEscalationSystem = new EscalationSystem();

