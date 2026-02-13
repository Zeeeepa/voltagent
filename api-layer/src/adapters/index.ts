import { ComponentAdapterRegistry } from './componentAdapter';
import { WorkflowDefinitionAdapterImpl } from './workflowDefinitionAdapter';
import { ExecutionEngineAdapterImpl } from './executionEngineAdapter';
import { ProgressTrackingAdapterImpl } from './progressTrackingAdapter';
import { logger } from '../common/logger';

/**
 * Initialize all component adapters
 */
export async function initializeAdapters(): Promise<void> {
  logger.info('Initializing component adapters');
  
  const registry = ComponentAdapterRegistry.getInstance();
  
  // Register all adapters
  registry.register(new WorkflowDefinitionAdapterImpl());
  registry.register(new ExecutionEngineAdapterImpl());
  registry.register(new ProgressTrackingAdapterImpl());
  
  // Initialize all adapters
  await registry.initializeAll();
  
  logger.info('Component adapters initialized successfully');
}

/**
 * Get the component adapter registry
 */
export function getAdapterRegistry(): ComponentAdapterRegistry {
  return ComponentAdapterRegistry.getInstance();
}

// Export adapter types
export * from './componentAdapter';
export * from './workflowDefinitionAdapter';
export * from './executionEngineAdapter';
export * from './progressTrackingAdapter';

