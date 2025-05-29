// Main exports for the AgentAPI & Claude Code Deployment Module
export { DeploymentOrchestrator } from "./orchestrator/deployment-orchestrator";
export { AgentAPIClient } from "./client/agentapi-client";
export { WSL2Manager } from "./environment/wsl2-manager";
export { DatabaseManager } from "./database/database-manager";
export { WebhookHandler } from "./webhook/webhook-handler";

// Export all types
export type {
  // Configuration types
  AgentAPIConfig,
  WSL2Config,
  ClaudeCodeConfig,
  DeploymentConfig,
  
  // Data types
  PRInfo,
  DeploymentResult,
  DeploymentStatus,
  ValidationResults,
  WSL2Instance,
  DeploymentEvent,
  DeploymentEventType,
  DeploymentError,
  WebhookEvent,
  DeploymentRecord,
  
  // API types
  AgentAPIMessage,
  AgentAPIStatus,
} from "./types";

// Export schemas
export { DeploymentResultSchema } from "./types";

// Utility functions
export { createDeploymentModule } from "./utils/factory";
export { validateConfig } from "./utils/config-validator";

// Version
export const VERSION = "0.1.0";

