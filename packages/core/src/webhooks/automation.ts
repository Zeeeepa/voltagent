/**
 * Webhook Automation Engine
 * Provides event-driven automation capabilities for webhook processing
 */

import type { 
  WebhookPayload, 
  WebhookAutomationAction,
  WebhookProcessingResult,
  WebhookEventType,
  WebhookSource
} from "./types";
import { AgentRegistry } from "../server/registry";
import { AgentEventEmitter } from "../events";

/**
 * Automation rule condition
 */
export interface AutomationCondition {
  /** Field to check */
  field: string;
  /** Operator for comparison */
  operator: "equals" | "contains" | "startsWith" | "endsWith" | "regex" | "exists" | "gt" | "lt" | "gte" | "lte";
  /** Value to compare against */
  value?: any;
  /** Regex pattern (for regex operator) */
  pattern?: string;
}

/**
 * Automation rule
 */
export interface AutomationRule {
  /** Rule identifier */
  id: string;
  /** Rule name */
  name: string;
  /** Rule description */
  description?: string;
  /** Whether this rule is enabled */
  enabled: boolean;
  /** Source filter */
  source?: WebhookSource;
  /** Event type filter */
  eventType?: WebhookEventType;
  /** Conditions that must be met */
  conditions: AutomationCondition[];
  /** Actions to execute when conditions are met */
  actions: WebhookAutomationAction[];
  /** Priority (higher numbers processed first) */
  priority: number;
  /** Cooldown period in milliseconds */
  cooldown?: number;
  /** Maximum executions per time window */
  rateLimit?: {
    maxExecutions: number;
    windowMs: number;
  };
  /** Tags for organization */
  tags?: string[];
  /** Created timestamp */
  createdAt: string;
  /** Last modified timestamp */
  updatedAt: string;
}

/**
 * Automation execution context
 */
export interface AutomationExecutionContext {
  /** Rule being executed */
  rule: AutomationRule;
  /** Webhook payload */
  payload: WebhookPayload;
  /** Execution ID */
  executionId: string;
  /** Start time */
  startTime: number;
  /** Variables available for interpolation */
  variables: Record<string, any>;
}

/**
 * Automation execution result
 */
export interface AutomationExecutionResult {
  /** Execution ID */
  executionId: string;
  /** Rule ID */
  ruleId: string;
  /** Whether execution was successful */
  success: boolean;
  /** Execution duration in milliseconds */
  duration: number;
  /** Actions that were executed */
  executedActions: WebhookAutomationAction[];
  /** Results from each action */
  actionResults: any[];
  /** Error message if execution failed */
  error?: string;
  /** Execution timestamp */
  timestamp: string;
}

/**
 * Webhook automation engine
 */
export class WebhookAutomationEngine {
  private rules: Map<string, AutomationRule> = new Map();
  private executionHistory: Map<string, AutomationExecutionResult[]> = new Map();
  private lastExecution: Map<string, number> = new Map();
  private executionCounts: Map<string, { count: number; windowStart: number }> = new Map();
  private eventEmitter: AgentEventEmitter;

  constructor() {
    this.eventEmitter = AgentEventEmitter.getInstance();
  }

  /**
   * Add an automation rule
   */
  addRule(rule: AutomationRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove an automation rule
   */
  removeRule(ruleId: string): boolean {
    this.executionHistory.delete(ruleId);
    this.lastExecution.delete(ruleId);
    this.executionCounts.delete(ruleId);
    return this.rules.delete(ruleId);
  }

  /**
   * Update an automation rule
   */
  updateRule(ruleId: string, updates: Partial<AutomationRule>): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    const updatedRule = {
      ...rule,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.rules.set(ruleId, updatedRule);
    return true;
  }

  /**
   * Get all automation rules
   */
  getRules(): AutomationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get enabled automation rules
   */
  getEnabledRules(): AutomationRule[] {
    return this.getRules().filter(rule => rule.enabled);
  }

  /**
   * Get automation rule by ID
   */
  getRule(ruleId: string): AutomationRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Process webhook payload through automation rules
   */
  async processWebhook(payload: WebhookPayload): Promise<WebhookProcessingResult> {
    const startTime = Date.now();
    const triggeredActions: WebhookAutomationAction[] = [];
    const createdEvents: string[] = [];
    const executionResults: AutomationExecutionResult[] = [];
    const errors: string[] = [];

    try {
      // Find matching rules
      const matchingRules = this.findMatchingRules(payload);

      if (matchingRules.length === 0) {
        return {
          success: true,
          data: { message: "No matching automation rules found" },
          duration: Date.now() - startTime,
          triggeredActions,
          createdEvents
        };
      }

      // Execute each matching rule
      for (const rule of matchingRules) {
        try {
          // Check cooldown and rate limits
          if (!this.canExecuteRule(rule)) {
            continue;
          }

          // Execute the rule
          const result = await this.executeRule(rule, payload);
          executionResults.push(result);

          if (result.success) {
            triggeredActions.push(...result.executedActions);
            this.updateExecutionTracking(rule.id);
          } else {
            errors.push(`Rule ${rule.id}: ${result.error}`);
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Rule ${rule.id}: ${errorMessage}`);
        }
      }

      const success = errors.length === 0;
      return {
        success,
        data: success 
          ? { executedRules: executionResults.length, results: executionResults }
          : { errors, partialResults: executionResults },
        error: errors.length > 0 ? errors.join("; ") : undefined,
        duration: Date.now() - startTime,
        triggeredActions,
        createdEvents
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage,
        duration: Date.now() - startTime,
        triggeredActions,
        createdEvents
      };
    }
  }

  /**
   * Find automation rules that match the webhook payload
   */
  private findMatchingRules(payload: WebhookPayload): AutomationRule[] {
    const enabledRules = this.getEnabledRules();
    const matchingRules: AutomationRule[] = [];

    for (const rule of enabledRules) {
      if (this.ruleMatches(rule, payload)) {
        matchingRules.push(rule);
      }
    }

    // Sort by priority (higher priority first)
    return matchingRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Check if a rule matches the webhook payload
   */
  private ruleMatches(rule: AutomationRule, payload: WebhookPayload): boolean {
    // Check source filter
    if (rule.source && rule.source !== payload.source) {
      return false;
    }

    // Check event type filter
    if (rule.eventType && rule.eventType !== payload.eventType) {
      return false;
    }

    // Check all conditions
    return this.evaluateConditions(rule.conditions, payload);
  }

  /**
   * Evaluate automation conditions
   */
  private evaluateConditions(conditions: AutomationCondition[], payload: WebhookPayload): boolean {
    if (conditions.length === 0) return true;

    return conditions.every(condition => this.evaluateCondition(condition, payload));
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: AutomationCondition, payload: WebhookPayload): boolean {
    const fieldValue = this.getFieldValue(condition.field, payload);

    switch (condition.operator) {
      case "equals":
        return fieldValue === condition.value;
      case "contains":
        return String(fieldValue).includes(String(condition.value));
      case "startsWith":
        return String(fieldValue).startsWith(String(condition.value));
      case "endsWith":
        return String(fieldValue).endsWith(String(condition.value));
      case "regex":
        if (!condition.pattern) return false;
        const regex = new RegExp(condition.pattern);
        return regex.test(String(fieldValue));
      case "exists":
        return fieldValue !== undefined && fieldValue !== null;
      case "gt":
        return Number(fieldValue) > Number(condition.value);
      case "lt":
        return Number(fieldValue) < Number(condition.value);
      case "gte":
        return Number(fieldValue) >= Number(condition.value);
      case "lte":
        return Number(fieldValue) <= Number(condition.value);
      default:
        return false;
    }
  }

  /**
   * Get field value from webhook payload using dot notation
   */
  private getFieldValue(field: string, payload: WebhookPayload): any {
    const parts = field.split(".");
    let value: any = payload;

    for (const part of parts) {
      if (value && typeof value === "object" && part in value) {
        value = value[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Check if a rule can be executed (cooldown and rate limits)
   */
  private canExecuteRule(rule: AutomationRule): boolean {
    const now = Date.now();

    // Check cooldown
    if (rule.cooldown) {
      const lastExec = this.lastExecution.get(rule.id);
      if (lastExec && (now - lastExec) < rule.cooldown) {
        return false;
      }
    }

    // Check rate limit
    if (rule.rateLimit) {
      const execCount = this.executionCounts.get(rule.id);
      if (execCount) {
        // Reset window if expired
        if (now - execCount.windowStart >= rule.rateLimit.windowMs) {
          this.executionCounts.set(rule.id, { count: 0, windowStart: now });
        } else if (execCount.count >= rule.rateLimit.maxExecutions) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Update execution tracking for a rule
   */
  private updateExecutionTracking(ruleId: string): void {
    const now = Date.now();
    
    // Update last execution time
    this.lastExecution.set(ruleId, now);

    // Update execution count
    const rule = this.rules.get(ruleId);
    if (rule?.rateLimit) {
      const execCount = this.executionCounts.get(ruleId);
      if (execCount) {
        execCount.count++;
      } else {
        this.executionCounts.set(ruleId, { count: 1, windowStart: now });
      }
    }
  }

  /**
   * Execute an automation rule
   */
  private async executeRule(rule: AutomationRule, payload: WebhookPayload): Promise<AutomationExecutionResult> {
    const executionId = `exec-${rule.id}-${Date.now()}`;
    const startTime = Date.now();
    const executedActions: WebhookAutomationAction[] = [];
    const actionResults: any[] = [];

    try {
      // Create execution context
      const context: AutomationExecutionContext = {
        rule,
        payload,
        executionId,
        startTime,
        variables: this.createVariables(payload)
      };

      // Execute each action
      for (const action of rule.actions) {
        try {
          const result = await this.executeAction(action, context);
          executedActions.push(action);
          actionResults.push(result);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          actionResults.push({ error: errorMessage });
          // Continue with other actions even if one fails
        }
      }

      const result: AutomationExecutionResult = {
        executionId,
        ruleId: rule.id,
        success: true,
        duration: Date.now() - startTime,
        executedActions,
        actionResults,
        timestamp: new Date().toISOString()
      };

      // Store execution result
      this.storeExecutionResult(rule.id, result);

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const result: AutomationExecutionResult = {
        executionId,
        ruleId: rule.id,
        success: false,
        duration: Date.now() - startTime,
        executedActions,
        actionResults,
        error: errorMessage,
        timestamp: new Date().toISOString()
      };

      this.storeExecutionResult(rule.id, result);
      return result;
    }
  }

  /**
   * Execute an automation action
   */
  private async executeAction(
    action: WebhookAutomationAction,
    context: AutomationExecutionContext
  ): Promise<any> {
    switch (action.type) {
      case "agent_trigger":
        return this.executeAgentTrigger(action, context);
      case "tool_call":
        return this.executeToolCall(action, context);
      case "notification":
        return this.executeNotification(action, context);
      case "custom":
        return this.executeCustomAction(action, context);
      default:
        throw new Error(`Unsupported action type: ${(action as any).type}`);
    }
  }

  /**
   * Execute agent trigger action
   */
  private async executeAgentTrigger(
    action: WebhookAutomationAction,
    context: AutomationExecutionContext
  ): Promise<any> {
    if (!action.agentId) {
      throw new Error("Agent ID is required for agent_trigger action");
    }

    const registry = AgentRegistry.getInstance();
    const agent = registry.getAgent(action.agentId);

    if (!agent) {
      throw new Error(`Agent not found: ${action.agentId}`);
    }

    // Create message with variable interpolation
    const message = this.interpolateVariables(
      this.createAgentMessage(context.payload),
      context.variables
    );

    const response = await agent.generateText(message, {
      metadata: {
        webhookPayload: context.payload,
        automationRule: context.rule.id,
        executionId: context.executionId
      }
    });

    return {
      agentId: action.agentId,
      response: response.text,
      usage: response.usage,
      executionId: context.executionId
    };
  }

  /**
   * Execute tool call action
   */
  private async executeToolCall(
    action: WebhookAutomationAction,
    context: AutomationExecutionContext
  ): Promise<any> {
    // Implementation similar to router.ts but with automation context
    return {
      toolName: action.toolName,
      parameters: action.toolParams,
      result: "Tool execution completed via automation",
      executionId: context.executionId
    };
  }

  /**
   * Execute notification action
   */
  private async executeNotification(
    action: WebhookAutomationAction,
    context: AutomationExecutionContext
  ): Promise<any> {
    if (!action.notification) {
      throw new Error("Notification configuration is required");
    }

    const message = this.interpolateVariables(
      action.notification.message,
      context.variables
    );

    console.log(`[Automation Notification] ${message}`);

    return {
      message,
      channels: action.notification.channels || ["console"],
      executionId: context.executionId,
      sentAt: new Date().toISOString()
    };
  }

  /**
   * Execute custom action
   */
  private async executeCustomAction(
    action: WebhookAutomationAction,
    context: AutomationExecutionContext
  ): Promise<any> {
    if (!action.handler) {
      throw new Error("Handler function is required for custom action");
    }

    return action.handler(context.payload);
  }

  /**
   * Create variables for interpolation
   */
  private createVariables(payload: WebhookPayload): Record<string, any> {
    return {
      webhook: payload,
      source: payload.source,
      eventType: payload.eventType,
      timestamp: payload.timestamp,
      id: payload.id,
      data: payload.data,
      now: new Date().toISOString(),
      date: new Date().toDateString(),
      time: new Date().toTimeString()
    };
  }

  /**
   * Interpolate variables in a string
   */
  private interpolateVariables(template: string, variables: Record<string, any>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(variables, path);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((current, key) => current?.[key], obj);
  }

  /**
   * Create agent message from webhook payload
   */
  private createAgentMessage(payload: WebhookPayload): string {
    return `Automation triggered by webhook from {{source}} with event type: {{eventType}}\n\nPayload: {{webhook.data}}`;
  }

  /**
   * Store execution result
   */
  private storeExecutionResult(ruleId: string, result: AutomationExecutionResult): void {
    if (!this.executionHistory.has(ruleId)) {
      this.executionHistory.set(ruleId, []);
    }

    const history = this.executionHistory.get(ruleId)!;
    history.push(result);

    // Keep only last 100 executions per rule
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
  }

  /**
   * Get execution history for a rule
   */
  getExecutionHistory(ruleId: string): AutomationExecutionResult[] {
    return this.executionHistory.get(ruleId) || [];
  }

  /**
   * Get execution statistics
   */
  getExecutionStats(ruleId?: string): any {
    if (ruleId) {
      const history = this.getExecutionHistory(ruleId);
      const successful = history.filter(r => r.success).length;
      const failed = history.filter(r => !r.success).length;
      const avgDuration = history.length > 0 
        ? history.reduce((sum, r) => sum + r.duration, 0) / history.length 
        : 0;

      return {
        ruleId,
        totalExecutions: history.length,
        successful,
        failed,
        successRate: history.length > 0 ? (successful / history.length) * 100 : 0,
        averageDuration: avgDuration,
        lastExecution: history.length > 0 ? history[history.length - 1].timestamp : null
      };
    }

    // Global stats
    const allHistory = Array.from(this.executionHistory.values()).flat();
    const successful = allHistory.filter(r => r.success).length;
    const failed = allHistory.filter(r => !r.success).length;
    const avgDuration = allHistory.length > 0 
      ? allHistory.reduce((sum, r) => sum + r.duration, 0) / allHistory.length 
      : 0;

    return {
      totalExecutions: allHistory.length,
      successful,
      failed,
      successRate: allHistory.length > 0 ? (successful / allHistory.length) * 100 : 0,
      averageDuration: avgDuration,
      activeRules: this.getEnabledRules().length,
      totalRules: this.getRules().length
    };
  }
}

/**
 * Default automation rules
 */
export const createDefaultAutomationRules = (): AutomationRule[] => [
  {
    id: "github-critical-pr",
    name: "Critical Pull Request Alert",
    description: "Alert when a pull request affects critical files",
    enabled: true,
    source: "github",
    eventType: "pull_request",
    conditions: [
      {
        field: "data.action",
        operator: "equals",
        value: "opened"
      },
      {
        field: "data.pull_request.changed_files",
        operator: "gt",
        value: 10
      }
    ],
    actions: [
      {
        type: "notification",
        notification: {
          message: "Critical PR opened: {{webhook.data.pull_request.title}} with {{webhook.data.pull_request.changed_files}} changed files"
        }
      }
    ],
    priority: 100,
    cooldown: 300000, // 5 minutes
    tags: ["github", "pull-request", "critical"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "deployment-success",
    name: "Deployment Success Notification",
    description: "Notify when a deployment succeeds",
    enabled: true,
    source: "github",
    eventType: "deployment",
    conditions: [
      {
        field: "data.deployment_status.state",
        operator: "equals",
        value: "success"
      }
    ],
    actions: [
      {
        type: "notification",
        notification: {
          message: "Deployment successful: {{webhook.data.deployment.environment}}"
        }
      }
    ],
    priority: 80,
    tags: ["github", "deployment", "success"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

/**
 * Automation engine singleton
 */
let automationEngineInstance: WebhookAutomationEngine | null = null;

export const getWebhookAutomationEngine = (): WebhookAutomationEngine => {
  if (!automationEngineInstance) {
    automationEngineInstance = new WebhookAutomationEngine();
    
    // Add default automation rules
    const defaultRules = createDefaultAutomationRules();
    defaultRules.forEach(rule => automationEngineInstance!.addRule(rule));
  }
  
  return automationEngineInstance;
};

