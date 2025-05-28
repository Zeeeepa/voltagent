/**
 * Webhook Handler System
 * Main webhook processing and management system
 */

import { v4 as uuidv4 } from "uuid";
import type { 
  WebhookPayload, 
  WebhookHandlerConfig,
  WebhookSystemConfig,
  WebhookProcessingResult,
  WebhookSystemStats,
  WebhookSource,
  WebhookEventType,
  WebhookValidationConfig
} from "./types";
import { WebhookValidator, GitHubWebhookValidator, ComprehensiveWebhookValidator } from "./validation";
import { getWebhookRouter } from "./router";
import { getWebhookAutomationEngine } from "./automation";
import { AgentEventEmitter } from "../events";

/**
 * Webhook processing error
 */
export class WebhookProcessingError extends Error {
  constructor(message: string, public readonly code: string, public readonly statusCode: number = 500) {
    super(message);
    this.name = "WebhookProcessingError";
  }
}

/**
 * Main webhook handler system
 */
export class WebhookHandler {
  private config: WebhookSystemConfig;
  private handlers: Map<string, WebhookHandlerConfig> = new Map();
  private stats: WebhookSystemStats;
  private eventEmitter: AgentEventEmitter;

  constructor(config?: Partial<WebhookSystemConfig>) {
    this.config = {
      enabled: true,
      basePath: "/webhooks",
      maxPayloadSize: 10 * 1024 * 1024, // 10MB
      timeout: 30000, // 30 seconds
      defaultValidation: {
        method: "none"
      },
      handlers: [],
      routingRules: [],
      ...config
    };

    this.stats = this.initializeStats();
    this.eventEmitter = AgentEventEmitter.getInstance();
    this.setupDefaultHandlers();
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): WebhookSystemStats {
    return {
      totalReceived: 0,
      totalProcessed: 0,
      totalFailed: 0,
      averageProcessingTime: 0,
      bySource: {
        github: { received: 0, processed: 0, failed: 0 },
        generic: { received: 0, processed: 0, failed: 0 },
        custom: { received: 0, processed: 0, failed: 0 }
      },
      byEventType: {
        push: { received: 0, processed: 0, failed: 0 },
        pull_request: { received: 0, processed: 0, failed: 0 },
        issues: { received: 0, processed: 0, failed: 0 },
        release: { received: 0, processed: 0, failed: 0 },
        workflow_run: { received: 0, processed: 0, failed: 0 },
        deployment: { received: 0, processed: 0, failed: 0 },
        repository: { received: 0, processed: 0, failed: 0 },
        data_update: { received: 0, processed: 0, failed: 0 },
        notification: { received: 0, processed: 0, failed: 0 },
        trigger: { received: 0, processed: 0, failed: 0 },
        status_change: { received: 0, processed: 0, failed: 0 },
        custom: { received: 0, processed: 0, failed: 0 }
      },
      lastReset: new Date().toISOString()
    };
  }

  /**
   * Setup default webhook handlers
   */
  private setupDefaultHandlers(): void {
    // GitHub webhook handler
    this.addHandler({
      id: "github-default",
      name: "GitHub Webhook Handler",
      source: "github",
      eventTypes: ["push", "pull_request", "issues", "release", "workflow_run", "deployment", "repository"],
      validation: {
        method: "hmac-sha256",
        signatureHeader: "x-hub-signature-256"
      },
      enabled: true
    });

    // Generic webhook handler
    this.addHandler({
      id: "generic-default",
      name: "Generic Webhook Handler",
      source: "generic",
      eventTypes: ["data_update", "notification", "trigger", "status_change"],
      validation: {
        method: "none"
      },
      enabled: true
    });

    // Custom webhook handler
    this.addHandler({
      id: "custom-default",
      name: "Custom Webhook Handler",
      source: "custom",
      eventTypes: ["custom"],
      validation: {
        method: "secret",
        signatureHeader: "x-webhook-secret"
      },
      enabled: true
    });
  }

  /**
   * Add a webhook handler
   */
  addHandler(handler: WebhookHandlerConfig): void {
    this.handlers.set(handler.id, handler);
  }

  /**
   * Remove a webhook handler
   */
  removeHandler(handlerId: string): boolean {
    return this.handlers.delete(handlerId);
  }

  /**
   * Get webhook handler by ID
   */
  getHandler(handlerId: string): WebhookHandlerConfig | undefined {
    return this.handlers.get(handlerId);
  }

  /**
   * Get all webhook handlers
   */
  getHandlers(): WebhookHandlerConfig[] {
    return Array.from(this.handlers.values());
  }

  /**
   * Get enabled webhook handlers
   */
  getEnabledHandlers(): WebhookHandlerConfig[] {
    return this.getHandlers().filter(handler => handler.enabled);
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(
    rawPayload: string,
    headers: Record<string, string>,
    source?: WebhookSource,
    eventType?: WebhookEventType
  ): Promise<WebhookProcessingResult> {
    const startTime = Date.now();

    try {
      // Check if webhook system is enabled
      if (!this.config.enabled) {
        throw new WebhookProcessingError(
          "Webhook system is disabled",
          "SYSTEM_DISABLED",
          503
        );
      }

      // Check payload size
      if (rawPayload.length > this.config.maxPayloadSize) {
        throw new WebhookProcessingError(
          `Payload too large: ${rawPayload.length} bytes (max: ${this.config.maxPayloadSize})`,
          "PAYLOAD_TOO_LARGE",
          413
        );
      }

      // Determine source and event type if not provided
      const detectedSource = source || this.detectSource(headers);
      const detectedEventType = eventType || this.detectEventType(headers, detectedSource);

      // Create webhook payload
      const payload: WebhookPayload = {
        id: uuidv4(),
        source: detectedSource,
        eventType: detectedEventType,
        data: this.parsePayload(rawPayload),
        headers,
        timestamp: new Date().toISOString(),
        validated: false,
        status: "pending"
      };

      // Update statistics
      this.updateStats("received", payload.source, payload.eventType);

      // Find appropriate handler
      const handler = this.findHandler(payload.source, payload.eventType);
      if (!handler) {
        throw new WebhookProcessingError(
          `No handler found for source: ${payload.source}, eventType: ${payload.eventType}`,
          "NO_HANDLER_FOUND",
          404
        );
      }

      // Validate webhook
      const validationResult = await this.validateWebhook(rawPayload, headers, handler.validation);
      payload.validated = validationResult.valid;

      if (!validationResult.valid) {
        payload.status = "failed";
        payload.error = validationResult.error;
        this.updateStats("failed", payload.source, payload.eventType);
        
        throw new WebhookProcessingError(
          `Webhook validation failed: ${validationResult.error}`,
          "VALIDATION_FAILED",
          401
        );
      }

      // Update payload status
      payload.status = "processing";

      // Process through router
      const router = getWebhookRouter();
      const routingResult = await router.route(payload);

      // Process through automation engine
      const automationEngine = getWebhookAutomationEngine();
      const automationResult = await automationEngine.processWebhook(payload);

      // Update payload status
      payload.status = routingResult.success && automationResult.success ? "completed" : "failed";

      // Combine results
      const combinedResult: WebhookProcessingResult = {
        success: routingResult.success && automationResult.success,
        data: {
          routing: routingResult.data,
          automation: automationResult.data,
          payload: {
            id: payload.id,
            source: payload.source,
            eventType: payload.eventType,
            validated: payload.validated,
            status: payload.status
          }
        },
        error: routingResult.error || automationResult.error,
        duration: Date.now() - startTime,
        triggeredActions: [
          ...routingResult.triggeredActions,
          ...automationResult.triggeredActions
        ],
        createdEvents: [
          ...routingResult.createdEvents,
          ...automationResult.createdEvents
        ]
      };

      // Update statistics
      if (combinedResult.success) {
        this.updateStats("processed", payload.source, payload.eventType);
      } else {
        this.updateStats("failed", payload.source, payload.eventType);
      }

      // Update average processing time
      this.updateAverageProcessingTime(combinedResult.duration);

      return combinedResult;

    } catch (error) {
      const duration = Date.now() - startTime;
      
      if (error instanceof WebhookProcessingError) {
        return {
          success: false,
          error: error.message,
          duration,
          triggeredActions: [],
          createdEvents: []
        };
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Webhook processing failed: ${errorMessage}`,
        duration,
        triggeredActions: [],
        createdEvents: []
      };
    }
  }

  /**
   * Detect webhook source from headers
   */
  private detectSource(headers: Record<string, string>): WebhookSource {
    // Check for GitHub
    if (GitHubWebhookValidator.isGitHubWebhook(headers)) {
      return "github";
    }

    // Check for other known sources
    const userAgent = headers["user-agent"] || headers["User-Agent"] || "";
    
    // Add more source detection logic here
    if (userAgent.includes("Custom-Webhook")) {
      return "custom";
    }

    // Default to generic
    return "generic";
  }

  /**
   * Detect event type from headers and source
   */
  private detectEventType(headers: Record<string, string>, source: WebhookSource): WebhookEventType {
    switch (source) {
      case "github":
        const githubEvent = GitHubWebhookValidator.getEventType(headers);
        return (githubEvent as WebhookEventType) || "custom";
      
      case "generic":
        const eventType = headers["x-event-type"] || headers["X-Event-Type"];
        return (eventType as WebhookEventType) || "notification";
      
      case "custom":
        const customEvent = headers["x-custom-event"] || headers["X-Custom-Event"];
        return (customEvent as WebhookEventType) || "custom";
      
      default:
        return "custom";
    }
  }

  /**
   * Parse webhook payload
   */
  private parsePayload(rawPayload: string): any {
    try {
      return JSON.parse(rawPayload);
    } catch (error) {
      // If JSON parsing fails, return the raw payload
      return { raw: rawPayload };
    }
  }

  /**
   * Find appropriate handler for source and event type
   */
  private findHandler(source: WebhookSource, eventType: WebhookEventType): WebhookHandlerConfig | undefined {
    const enabledHandlers = this.getEnabledHandlers();
    
    return enabledHandlers.find(handler => 
      handler.source === source && 
      handler.eventTypes.includes(eventType)
    );
  }

  /**
   * Validate webhook using handler configuration
   */
  private async validateWebhook(
    payload: string,
    headers: Record<string, string>,
    config: WebhookValidationConfig
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      const result = await ComprehensiveWebhookValidator.validateWithResult(
        payload,
        headers,
        config
      );

      return {
        valid: result.valid,
        error: result.error
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Update statistics
   */
  private updateStats(
    type: "received" | "processed" | "failed",
    source: WebhookSource,
    eventType: WebhookEventType
  ): void {
    // Update total stats
    switch (type) {
      case "received":
        this.stats.totalReceived++;
        break;
      case "processed":
        this.stats.totalProcessed++;
        break;
      case "failed":
        this.stats.totalFailed++;
        break;
    }

    // Update by source
    if (this.stats.bySource[source]) {
      this.stats.bySource[source][type]++;
    }

    // Update by event type
    if (this.stats.byEventType[eventType]) {
      this.stats.byEventType[eventType][type]++;
    }
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(duration: number): void {
    const totalProcessed = this.stats.totalProcessed + this.stats.totalFailed;
    if (totalProcessed === 1) {
      this.stats.averageProcessingTime = duration;
    } else {
      this.stats.averageProcessingTime = 
        (this.stats.averageProcessingTime * (totalProcessed - 1) + duration) / totalProcessed;
    }
  }

  /**
   * Get webhook system statistics
   */
  getStats(): WebhookSystemStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = this.initializeStats();
  }

  /**
   * Get system configuration
   */
  getConfig(): WebhookSystemConfig {
    return { ...this.config };
  }

  /**
   * Update system configuration
   */
  updateConfig(updates: Partial<WebhookSystemConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Health check for webhook system
   */
  healthCheck(): {
    status: "healthy" | "degraded" | "unhealthy";
    details: Record<string, any>;
  } {
    const stats = this.getStats();
    const totalRequests = stats.totalReceived;
    const successRate = totalRequests > 0 ? (stats.totalProcessed / totalRequests) * 100 : 100;
    const enabledHandlers = this.getEnabledHandlers().length;

    let status: "healthy" | "degraded" | "unhealthy" = "healthy";

    if (!this.config.enabled) {
      status = "unhealthy";
    } else if (successRate < 90 || enabledHandlers === 0) {
      status = "degraded";
    }

    return {
      status,
      details: {
        enabled: this.config.enabled,
        totalHandlers: this.getHandlers().length,
        enabledHandlers,
        totalRequests,
        successRate: Math.round(successRate * 100) / 100,
        averageProcessingTime: Math.round(stats.averageProcessingTime * 100) / 100,
        lastReset: stats.lastReset
      }
    };
  }
}

/**
 * Webhook handler singleton
 */
let webhookHandlerInstance: WebhookHandler | null = null;

export const getWebhookHandler = (config?: Partial<WebhookSystemConfig>): WebhookHandler => {
  if (!webhookHandlerInstance) {
    webhookHandlerInstance = new WebhookHandler(config);
  }
  return webhookHandlerInstance;
};

/**
 * Initialize webhook system with configuration
 */
export const initializeWebhookSystem = (config?: Partial<WebhookSystemConfig>): WebhookHandler => {
  webhookHandlerInstance = new WebhookHandler(config);
  return webhookHandlerInstance;
};

