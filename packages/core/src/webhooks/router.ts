/**
 * Webhook Event Router and Distribution System
 * Handles routing webhook events to appropriate handlers and automation
 */

import type { 
  WebhookPayload, 
  WebhookRoutingRule, 
  WebhookAutomationAction,
  WebhookProcessingResult,
  WebhookEventType,
  WebhookSource
} from "./types";
import { AgentRegistry } from "../server/registry";
import { AgentEventEmitter } from "../events";
import { createNodeId, NodeType } from "../utils/node-utils";

/**
 * Webhook routing error
 */
export class WebhookRoutingError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "WebhookRoutingError";
  }
}

/**
 * Webhook event router
 */
export class WebhookRouter {
  private routingRules: Map<string, WebhookRoutingRule> = new Map();
  private eventEmitter: AgentEventEmitter;

  constructor() {
    this.eventEmitter = AgentEventEmitter.getInstance();
  }

  /**
   * Add a routing rule
   */
  addRule(rule: WebhookRoutingRule): void {
    this.routingRules.set(rule.id, rule);
  }

  /**
   * Remove a routing rule
   */
  removeRule(ruleId: string): boolean {
    return this.routingRules.delete(ruleId);
  }

  /**
   * Get all routing rules
   */
  getRules(): WebhookRoutingRule[] {
    return Array.from(this.routingRules.values());
  }

  /**
   * Get enabled routing rules
   */
  getEnabledRules(): WebhookRoutingRule[] {
    return this.getRules().filter(rule => rule.enabled !== false);
  }

  /**
   * Find matching routing rules for a webhook payload
   */
  findMatchingRules(payload: WebhookPayload): WebhookRoutingRule[] {
    const enabledRules = this.getEnabledRules();
    const matchingRules: WebhookRoutingRule[] = [];

    for (const rule of enabledRules) {
      if (this.ruleMatches(rule, payload)) {
        matchingRules.push(rule);
      }
    }

    // Sort by priority (higher priority first)
    return matchingRules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  }

  /**
   * Check if a routing rule matches a webhook payload
   */
  private ruleMatches(rule: WebhookRoutingRule, payload: WebhookPayload): boolean {
    // Check source filter
    if (rule.source && rule.source !== payload.source) {
      return false;
    }

    // Check event type filter
    if (rule.eventType && rule.eventType !== payload.eventType) {
      return false;
    }

    // Check custom condition
    if (rule.condition && !rule.condition(payload)) {
      return false;
    }

    return true;
  }

  /**
   * Route a webhook payload to appropriate handlers
   */
  async route(payload: WebhookPayload): Promise<WebhookProcessingResult> {
    const startTime = Date.now();
    const triggeredActions: WebhookAutomationAction[] = [];
    const createdEvents: string[] = [];
    const errors: string[] = [];

    try {
      // Find matching rules
      const matchingRules = this.findMatchingRules(payload);

      if (matchingRules.length === 0) {
        // No matching rules - create a generic webhook event
        const eventId = await this.createWebhookEvent(payload, null);
        createdEvents.push(eventId);

        return {
          success: true,
          data: { message: "No matching routing rules found", eventId },
          duration: Date.now() - startTime,
          triggeredActions,
          createdEvents
        };
      }

      // Process each matching rule
      for (const rule of matchingRules) {
        try {
          // Create webhook event for this rule
          const eventId = await this.createWebhookEvent(payload, rule);
          createdEvents.push(eventId);

          // Execute automation action if defined
          if (rule.action) {
            const actionResult = await this.executeAction(rule.action, payload);
            triggeredActions.push(rule.action);

            // Update the event with action result
            await this.updateWebhookEvent(eventId, {
              actionResult,
              status: "completed"
            });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          errors.push(`Rule ${rule.id}: ${errorMessage}`);
          
          // Update event with error
          if (createdEvents.length > 0) {
            await this.updateWebhookEvent(createdEvents[createdEvents.length - 1], {
              status: "error",
              error: errorMessage
            });
          }
        }
      }

      const success = errors.length === 0;
      return {
        success,
        data: success ? { processedRules: matchingRules.length } : { errors },
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
   * Execute an automation action
   */
  private async executeAction(
    action: WebhookAutomationAction, 
    payload: WebhookPayload
  ): Promise<any> {
    switch (action.type) {
      case "agent_trigger":
        return this.executeAgentTrigger(action, payload);
      case "tool_call":
        return this.executeToolCall(action, payload);
      case "notification":
        return this.executeNotification(action, payload);
      case "custom":
        return this.executeCustomAction(action, payload);
      default:
        throw new WebhookRoutingError(
          `Unsupported action type: ${(action as any).type}`,
          "UNSUPPORTED_ACTION"
        );
    }
  }

  /**
   * Execute agent trigger action
   */
  private async executeAgentTrigger(
    action: WebhookAutomationAction,
    payload: WebhookPayload
  ): Promise<any> {
    if (!action.agentId) {
      throw new WebhookRoutingError(
        "Agent ID is required for agent_trigger action",
        "MISSING_AGENT_ID"
      );
    }

    const registry = AgentRegistry.getInstance();
    const agent = registry.getAgent(action.agentId);

    if (!agent) {
      throw new WebhookRoutingError(
        `Agent not found: ${action.agentId}`,
        "AGENT_NOT_FOUND"
      );
    }

    // Create a message for the agent based on the webhook payload
    const message = this.createAgentMessage(payload);
    
    // Trigger the agent with the webhook data
    const response = await agent.generateText(message, {
      metadata: {
        webhookPayload: payload,
        triggeredBy: "webhook"
      }
    });

    return {
      agentId: action.agentId,
      response: response.text,
      usage: response.usage
    };
  }

  /**
   * Execute tool call action
   */
  private async executeToolCall(
    action: WebhookAutomationAction,
    payload: WebhookPayload
  ): Promise<any> {
    if (!action.toolName) {
      throw new WebhookRoutingError(
        "Tool name is required for tool_call action",
        "MISSING_TOOL_NAME"
      );
    }

    if (!action.agentId) {
      throw new WebhookRoutingError(
        "Agent ID is required for tool_call action",
        "MISSING_AGENT_ID"
      );
    }

    const registry = AgentRegistry.getInstance();
    const agent = registry.getAgent(action.agentId);

    if (!agent) {
      throw new WebhookRoutingError(
        `Agent not found: ${action.agentId}`,
        "AGENT_NOT_FOUND"
      );
    }

    // Get agent tools
    const tools = agent.getToolsForApi();
    const tool = tools.find(t => t.name === action.toolName);

    if (!tool) {
      throw new WebhookRoutingError(
        `Tool not found: ${action.toolName}`,
        "TOOL_NOT_FOUND"
      );
    }

    // Prepare tool parameters, merging action params with webhook data
    const toolParams = {
      ...action.toolParams,
      webhookPayload: payload
    };

    // Execute the tool (this would need to be implemented based on the tool system)
    // For now, we'll return a placeholder result
    return {
      toolName: action.toolName,
      parameters: toolParams,
      result: "Tool execution completed",
      executedAt: new Date().toISOString()
    };
  }

  /**
   * Execute notification action
   */
  private async executeNotification(
    action: WebhookAutomationAction,
    payload: WebhookPayload
  ): Promise<any> {
    if (!action.notification) {
      throw new WebhookRoutingError(
        "Notification configuration is required for notification action",
        "MISSING_NOTIFICATION_CONFIG"
      );
    }

    // Create notification message
    const message = this.interpolateMessage(action.notification.message, payload);
    
    // For now, we'll just log the notification
    // In a real implementation, this would send to configured channels
    console.log(`[Webhook Notification] ${message}`);

    return {
      message,
      channels: action.notification.channels || ["console"],
      sentAt: new Date().toISOString()
    };
  }

  /**
   * Execute custom action
   */
  private async executeCustomAction(
    action: WebhookAutomationAction,
    payload: WebhookPayload
  ): Promise<any> {
    if (!action.handler) {
      throw new WebhookRoutingError(
        "Handler function is required for custom action",
        "MISSING_HANDLER"
      );
    }

    return action.handler(payload);
  }

  /**
   * Create an agent message from webhook payload
   */
  private createAgentMessage(payload: WebhookPayload): string {
    const { source, eventType, data } = payload;
    
    let message = `Webhook received from ${source} with event type: ${eventType}\n\n`;
    
    // Add specific information based on source
    if (source === "github") {
      message += this.createGitHubMessage(eventType, data);
    } else {
      message += `Payload data: ${JSON.stringify(data, null, 2)}`;
    }

    return message;
  }

  /**
   * Create GitHub-specific message
   */
  private createGitHubMessage(eventType: WebhookEventType, data: any): string {
    switch (eventType) {
      case "push":
        return `Push event: ${data.commits?.length || 0} commits pushed to ${data.ref || "unknown branch"}`;
      case "pull_request":
        return `Pull request ${data.action || "event"}: #${data.number || "unknown"} - ${data.pull_request?.title || "No title"}`;
      case "issues":
        return `Issue ${data.action || "event"}: #${data.issue?.number || "unknown"} - ${data.issue?.title || "No title"}`;
      case "release":
        return `Release ${data.action || "event"}: ${data.release?.tag_name || "unknown tag"}`;
      case "workflow_run":
        return `Workflow run ${data.action || "event"}: ${data.workflow_run?.name || "unknown workflow"} - ${data.workflow_run?.conclusion || "unknown status"}`;
      default:
        return `GitHub ${eventType} event: ${JSON.stringify(data, null, 2)}`;
    }
  }

  /**
   * Interpolate message with webhook payload data
   */
  private interpolateMessage(template: string, payload: WebhookPayload): string {
    return template
      .replace(/\{source\}/g, payload.source)
      .replace(/\{eventType\}/g, payload.eventType)
      .replace(/\{timestamp\}/g, payload.timestamp)
      .replace(/\{id\}/g, payload.id);
  }

  /**
   * Create a webhook event in the event system
   */
  private async createWebhookEvent(
    payload: WebhookPayload,
    rule: WebhookRoutingRule | null
  ): Promise<string> {
    // Use a default agent ID for webhook events if no specific agent is targeted
    const agentId = rule?.targetAgentId || "webhook-system";
    
    // Create a history entry ID for the webhook event
    const historyId = `webhook-${payload.id}`;

    // Create the webhook event
    const historyEntry = await this.eventEmitter.addHistoryEvent({
      agentId,
      historyId,
      eventName: `webhook:${payload.source}:${payload.eventType}`,
      status: "working",
      additionalData: {
        affectedNodeId: createNodeId(NodeType.WEBHOOK, payload.id),
        timestamp: payload.timestamp,
        status: "working",
        input: {
          source: payload.source,
          eventType: payload.eventType,
          headers: payload.headers
        },
        output: null,
        metadata: {
          payload,
          routingRule: rule,
          webhookId: payload.id
        }
      },
      type: "agent"
    });

    return historyEntry?.id || historyId;
  }

  /**
   * Update a webhook event
   */
  private async updateWebhookEvent(
    eventId: string,
    updates: {
      status?: "completed" | "error";
      actionResult?: any;
      error?: string;
    }
  ): Promise<void> {
    // This would update the event in the event system
    // Implementation depends on the event system's update mechanism
    console.log(`Updating webhook event ${eventId}:`, updates);
  }
}

/**
 * Default webhook routing rules
 */
export const createDefaultRoutingRules = (): WebhookRoutingRule[] => [
  {
    id: "github-push-default",
    name: "GitHub Push Events",
    source: "github",
    eventType: "push",
    action: {
      type: "notification",
      notification: {
        message: "Code pushed to repository: {source} - {eventType}"
      }
    },
    priority: 100,
    enabled: true
  },
  {
    id: "github-pr-default",
    name: "GitHub Pull Request Events",
    source: "github",
    eventType: "pull_request",
    action: {
      type: "notification",
      notification: {
        message: "Pull request activity: {source} - {eventType}"
      }
    },
    priority: 100,
    enabled: true
  },
  {
    id: "generic-webhook-default",
    name: "Generic Webhook Handler",
    source: "generic",
    action: {
      type: "notification",
      notification: {
        message: "Generic webhook received: {source} - {eventType}"
      }
    },
    priority: 50,
    enabled: true
  }
];

/**
 * Webhook router singleton
 */
let webhookRouterInstance: WebhookRouter | null = null;

export const getWebhookRouter = (): WebhookRouter => {
  if (!webhookRouterInstance) {
    webhookRouterInstance = new WebhookRouter();
    
    // Add default routing rules
    const defaultRules = createDefaultRoutingRules();
    defaultRules.forEach(rule => webhookRouterInstance!.addRule(rule));
  }
  
  return webhookRouterInstance;
};

