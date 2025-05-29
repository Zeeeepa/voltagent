// Main exports
export { WorkflowOrchestrator } from "./workflow/orchestrator";
export { DatabaseManager } from "./database/manager";
export { TaskQueue } from "./workflow/task-queue";
export { WorkflowEngine } from "./workflow/engine";

// Database exports
export * from "./database";

// Workflow exports
export * from "./workflow";

// Types exports
export * from "./types";

// Utils exports
export * from "./utils";

// Default configuration helper
export { ConfigValidator } from "./utils/config-validator";

/**
 * Create and initialize a WorkflowOrchestrator with default configuration
 */
export async function createOrchestrator(config?: Partial<import("./types").InfrastructureConfig>): Promise<WorkflowOrchestrator> {
  const { ConfigValidator } = await import("./utils/config-validator");
  
  // Create config from environment variables if not provided
  const fullConfig = config ? 
    { ...ConfigValidator.createConfigFromEnv(), ...config } :
    ConfigValidator.createConfigFromEnv();

  // Validate configuration
  const validation = ConfigValidator.validateConfig(fullConfig);
  if (!validation.valid) {
    throw new Error(`Invalid configuration: ${validation.errors.join(", ")}`);
  }

  // Log warnings if any
  if (validation.warnings.length > 0) {
    console.warn("Configuration warnings:", validation.warnings);
  }

  // Create and initialize orchestrator
  const orchestrator = new WorkflowOrchestrator(fullConfig);
  await orchestrator.initialize();

  return orchestrator;
}

/**
 * Health check for the infrastructure
 */
export async function healthCheck(orchestrator: WorkflowOrchestrator): Promise<{
  healthy: boolean;
  details: Record<string, any>;
}> {
  try {
    const health = await orchestrator.getHealthStatus();
    const healthy = health.database && health.taskQueue;

    return {
      healthy,
      details: health,
    };
  } catch (error) {
    return {
      healthy: false,
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    };
  }
}

