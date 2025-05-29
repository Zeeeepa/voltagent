import { createHmac } from "crypto";
import { EventEmitter } from "events";
import type {
  WebhookEvent,
  PRInfo,
  DeploymentConfig,
} from "../types";
import { DeploymentOrchestrator } from "../orchestrator/deployment-orchestrator";

export interface WebhookConfig {
  secret?: string;
  endpoints?: string[];
  autoTriggerEvents?: string[];
}

export class WebhookHandler extends EventEmitter {
  private config: WebhookConfig;
  private orchestrator: DeploymentOrchestrator;
  private processedEvents: Set<string> = new Set();

  constructor(config: WebhookConfig, orchestrator: DeploymentOrchestrator) {
    super();
    this.config = {
      autoTriggerEvents: ["opened", "synchronize", "reopened"],
      ...config,
    };
    this.orchestrator = orchestrator;
  }

  /**
   * Handle incoming webhook payload
   */
  async handleWebhook(
    payload: any,
    signature?: string,
    eventType?: string
  ): Promise<{ success: boolean; message: string; deploymentId?: string }> {
    try {
      // Verify webhook signature if secret is configured
      if (this.config.secret && signature) {
        if (!this.verifySignature(payload, signature)) {
          return {
            success: false,
            message: "Invalid webhook signature",
          };
        }
      }

      // Parse the webhook event
      const webhookEvent = this.parseWebhookEvent(payload, eventType);
      if (!webhookEvent) {
        return {
          success: false,
          message: "Unsupported webhook event",
        };
      }

      // Check for duplicate events
      const eventId = this.generateEventId(webhookEvent);
      if (this.processedEvents.has(eventId)) {
        return {
          success: true,
          message: "Event already processed",
        };
      }

      // Process the webhook event
      const result = await this.processWebhookEvent(webhookEvent);
      
      // Mark event as processed
      this.processedEvents.add(eventId);
      
      // Clean up old processed events (keep last 1000)
      if (this.processedEvents.size > 1000) {
        const eventsArray = Array.from(this.processedEvents);
        this.processedEvents = new Set(eventsArray.slice(-1000));
      }

      return result;

    } catch (error) {
      console.error("Webhook handling error:", error);
      return {
        success: false,
        message: `Webhook processing failed: ${error.message}`,
      };
    }
  }

  /**
   * Process a webhook event
   */
  private async processWebhookEvent(
    webhookEvent: WebhookEvent
  ): Promise<{ success: boolean; message: string; deploymentId?: string }> {
    // Check if this is a pull request event
    if (!webhookEvent.pull_request) {
      return {
        success: false,
        message: "Not a pull request event",
      };
    }

    // Check if we should auto-trigger deployment for this action
    if (!this.config.autoTriggerEvents?.includes(webhookEvent.action)) {
      return {
        success: true,
        message: `Action '${webhookEvent.action}' not configured for auto-deployment`,
      };
    }

    // Extract PR information
    const prInfo: PRInfo = {
      number: webhookEvent.pull_request.number,
      branch: webhookEvent.pull_request.head.ref,
      repository: webhookEvent.repository.name,
      owner: webhookEvent.repository.owner.login,
      headSha: webhookEvent.pull_request.head.sha,
      baseBranch: webhookEvent.pull_request.base.ref,
      title: webhookEvent.pull_request.title,
      description: webhookEvent.pull_request.body,
    };

    try {
      // Emit event for external listeners
      this.emit("pr_event", {
        action: webhookEvent.action,
        prInfo,
        webhookEvent,
      });

      // Trigger deployment
      console.log(`Triggering deployment for PR ${prInfo.number} (${webhookEvent.action})`);
      
      const deploymentResult = await this.orchestrator.deployPR(prInfo);
      
      // Emit deployment started event
      this.emit("deployment_triggered", {
        prInfo,
        deploymentResult,
      });

      return {
        success: true,
        message: `Deployment triggered for PR ${prInfo.number}`,
        deploymentId: deploymentResult.deployment.wsl2_instance,
      };

    } catch (error) {
      console.error(`Failed to trigger deployment for PR ${prInfo.number}:`, error);
      
      // Emit deployment failed event
      this.emit("deployment_failed", {
        prInfo,
        error: error.message,
      });

      return {
        success: false,
        message: `Failed to trigger deployment: ${error.message}`,
      };
    }
  }

  /**
   * Parse webhook event from payload
   */
  private parseWebhookEvent(payload: any, eventType?: string): WebhookEvent | null {
    try {
      // Handle GitHub webhook format
      if (payload.action && payload.pull_request && payload.repository) {
        return {
          action: payload.action,
          pull_request: {
            number: payload.pull_request.number,
            head: {
              ref: payload.pull_request.head.ref,
              sha: payload.pull_request.head.sha,
            },
            base: {
              ref: payload.pull_request.base.ref,
            },
            title: payload.pull_request.title,
            body: payload.pull_request.body,
          },
          repository: {
            name: payload.repository.name,
            owner: {
              login: payload.repository.owner.login,
            },
          },
        };
      }

      // Handle other webhook formats (GitLab, Bitbucket, etc.)
      // This would be extended based on requirements

      return null;

    } catch (error) {
      console.error("Failed to parse webhook event:", error);
      return null;
    }
  }

  /**
   * Verify webhook signature
   */
  private verifySignature(payload: any, signature: string): boolean {
    try {
      const payloadString = typeof payload === "string" ? payload : JSON.stringify(payload);
      const expectedSignature = createHmac("sha256", this.config.secret!)
        .update(payloadString)
        .digest("hex");

      // GitHub format: sha256=<hash>
      const receivedSignature = signature.startsWith("sha256=") 
        ? signature.slice(7) 
        : signature;

      return expectedSignature === receivedSignature;

    } catch (error) {
      console.error("Signature verification error:", error);
      return false;
    }
  }

  /**
   * Generate a unique event ID for deduplication
   */
  private generateEventId(webhookEvent: WebhookEvent): string {
    const pr = webhookEvent.pull_request;
    if (pr) {
      return `${webhookEvent.repository.owner.login}-${webhookEvent.repository.name}-${pr.number}-${webhookEvent.action}-${pr.head.sha}`;
    }
    
    // Fallback for non-PR events
    return `${webhookEvent.repository.owner.login}-${webhookEvent.repository.name}-${webhookEvent.action}-${Date.now()}`;
  }

  /**
   * Manually trigger deployment for a PR
   */
  async triggerDeployment(prInfo: PRInfo): Promise<{ success: boolean; message: string; deploymentId?: string }> {
    try {
      console.log(`Manually triggering deployment for PR ${prInfo.number}`);
      
      const deploymentResult = await this.orchestrator.deployPR(prInfo);
      
      this.emit("deployment_triggered", {
        prInfo,
        deploymentResult,
        manual: true,
      });

      return {
        success: true,
        message: `Deployment triggered for PR ${prInfo.number}`,
        deploymentId: deploymentResult.deployment.wsl2_instance,
      };

    } catch (error) {
      console.error(`Failed to manually trigger deployment for PR ${prInfo.number}:`, error);
      
      this.emit("deployment_failed", {
        prInfo,
        error: error.message,
        manual: true,
      });

      return {
        success: false,
        message: `Failed to trigger deployment: ${error.message}`,
      };
    }
  }

  /**
   * Get webhook configuration
   */
  getConfig(): WebhookConfig {
    return { ...this.config };
  }

  /**
   * Update webhook configuration
   */
  updateConfig(newConfig: Partial<WebhookConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get processed events count
   */
  getProcessedEventsCount(): number {
    return this.processedEvents.size;
  }

  /**
   * Clear processed events cache
   */
  clearProcessedEvents(): void {
    this.processedEvents.clear();
  }

  /**
   * Check if an event has been processed
   */
  isEventProcessed(webhookEvent: WebhookEvent): boolean {
    const eventId = this.generateEventId(webhookEvent);
    return this.processedEvents.has(eventId);
  }

  /**
   * Get supported webhook events
   */
  getSupportedEvents(): string[] {
    return [
      "opened",      // PR opened
      "synchronize", // PR updated (new commits)
      "reopened",    // PR reopened
      "closed",      // PR closed (could trigger cleanup)
      "ready_for_review", // PR marked ready for review
    ];
  }

  /**
   * Validate webhook payload structure
   */
  validateWebhookPayload(payload: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!payload) {
      errors.push("Payload is empty");
      return { valid: false, errors };
    }

    if (!payload.action) {
      errors.push("Missing 'action' field");
    }

    if (!payload.repository) {
      errors.push("Missing 'repository' field");
    } else {
      if (!payload.repository.name) {
        errors.push("Missing 'repository.name' field");
      }
      if (!payload.repository.owner?.login) {
        errors.push("Missing 'repository.owner.login' field");
      }
    }

    if (payload.pull_request) {
      if (typeof payload.pull_request.number !== "number") {
        errors.push("Invalid 'pull_request.number' field");
      }
      if (!payload.pull_request.head?.ref) {
        errors.push("Missing 'pull_request.head.ref' field");
      }
      if (!payload.pull_request.head?.sha) {
        errors.push("Missing 'pull_request.head.sha' field");
      }
      if (!payload.pull_request.base?.ref) {
        errors.push("Missing 'pull_request.base.ref' field");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

