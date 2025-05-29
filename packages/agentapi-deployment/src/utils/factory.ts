import type { DeploymentConfig } from "../types";
import { DeploymentOrchestrator } from "../orchestrator/deployment-orchestrator";
import { WebhookHandler } from "../webhook/webhook-handler";
import { validateConfig } from "./config-validator";

/**
 * Factory function to create a complete deployment module
 */
export function createDeploymentModule(config: DeploymentConfig) {
  // Validate configuration
  const validation = validateConfig(config);
  if (!validation.valid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
  }

  // Create orchestrator
  const orchestrator = new DeploymentOrchestrator(config);

  // Create webhook handler if webhook config is provided
  let webhookHandler: WebhookHandler | undefined;
  if (config.webhooks) {
    webhookHandler = new WebhookHandler(config.webhooks, orchestrator);
  }

  return {
    orchestrator,
    webhookHandler,
    
    /**
     * Deploy a PR manually
     */
    async deployPR(prInfo: any) {
      return orchestrator.deployPR(prInfo);
    },

    /**
     * Handle webhook events
     */
    async handleWebhook(payload: any, signature?: string, eventType?: string) {
      if (!webhookHandler) {
        throw new Error("Webhook handler not configured");
      }
      return webhookHandler.handleWebhook(payload, signature, eventType);
    },

    /**
     * Get deployment status
     */
    async getDeploymentStatus(deploymentId: string) {
      return orchestrator.getDeploymentStatus(deploymentId);
    },

    /**
     * Cancel a deployment
     */
    async cancelDeployment(deploymentId: string) {
      return orchestrator.cancelDeployment(deploymentId);
    },

    /**
     * Get active deployments
     */
    getActiveDeployments() {
      return orchestrator.getActiveDeployments();
    },

    /**
     * Cleanup resources
     */
    async cleanup() {
      await orchestrator.cleanup();
    },

    /**
     * Get configuration
     */
    getConfig() {
      return config;
    },

    /**
     * Subscribe to events
     */
    on(event: string, listener: (...args: any[]) => void) {
      orchestrator.on(event, listener);
      if (webhookHandler) {
        webhookHandler.on(event, listener);
      }
    },

    /**
     * Unsubscribe from events
     */
    off(event: string, listener: (...args: any[]) => void) {
      orchestrator.off(event, listener);
      if (webhookHandler) {
        webhookHandler.off(event, listener);
      }
    },
  };
}

/**
 * Create a deployment module with default configuration
 */
export function createDefaultDeploymentModule(overrides: Partial<DeploymentConfig> = {}) {
  const defaultConfig: DeploymentConfig = {
    agentapi: {
      baseUrl: "http://localhost",
      port: 3284,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
    },
    wsl2: {
      distributionName: "Ubuntu-22.04",
      instancePrefix: "claude-test-env",
      resourceLimits: {
        memory: "4GB",
        processors: 2,
      },
      networkConfig: {
        hostPort: 3284,
        guestPort: 3284,
      },
    },
    claudeCode: {
      version: "latest",
      allowedTools: ["Bash(git*)", "Edit", "Replace"],
      model: "claude-3-sonnet-20240229",
      additionalArgs: [],
    },
    ...overrides,
  };

  return createDeploymentModule(defaultConfig);
}

/**
 * Create a deployment module for testing
 */
export function createTestDeploymentModule(overrides: Partial<DeploymentConfig> = {}) {
  const testConfig: DeploymentConfig = {
    agentapi: {
      baseUrl: "http://localhost",
      port: 3285, // Different port for testing
      timeout: 10000,
      retryAttempts: 1,
      retryDelay: 500,
    },
    wsl2: {
      distributionName: "Ubuntu-22.04",
      instancePrefix: "claude-test-env-test",
      resourceLimits: {
        memory: "2GB",
        processors: 1,
      },
    },
    claudeCode: {
      version: "latest",
      allowedTools: ["Bash(git*)", "Edit"],
      model: "claude-3-haiku-20240307", // Faster model for testing
    },
    ...overrides,
  };

  return createDeploymentModule(testConfig);
}

