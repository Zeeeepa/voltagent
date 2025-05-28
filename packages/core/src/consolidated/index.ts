/**
 * Consolidated VoltAgent Core
 * 
 * This module provides a unified interface to all the consolidated functionality
 * from the various overlapping PRs. It serves as the main entry point for the
 * consolidated workflow orchestration system.
 */

// Configuration System
export * from '../config/unified-config.js';

// Consolidated Workflow Engine
export * from './workflow-engine.js';

// Re-export core types and utilities
export type {
  TaskId,
  WorkflowId,
  WorkstreamId,
  TaskDefinition,
  WorkflowDefinition,
  TaskExecutionContext,
  TaskResult,
  WorkflowExecutionResult,
  Milestone,
  ProgressMetric,
  SyncPoint,
  ConflictInfo,
  ResourceRequirements,
  RetryPolicy,
} from './workflow-engine.js';

export {
  TaskStatus,
  TaskPriority,
  DependencyType,
  ConsolidatedWorkflowEngine,
} from './workflow-engine.js';

// Factory Functions
import { ConsolidatedWorkflowEngine } from './workflow-engine.js';
import { VoltAgentConfig, ConfigManager } from '../config/unified-config.js';

/**
 * Create a new workflow engine with optional configuration
 */
export function createWorkflowEngine(config?: Partial<VoltAgentConfig>): ConsolidatedWorkflowEngine {
  return new ConsolidatedWorkflowEngine(config);
}

/**
 * Create a task definition with builder pattern
 */
export class TaskBuilder {
  private task: Partial<TaskDefinition> = {};

  constructor(id: string, name: string) {
    this.task.id = id;
    this.task.name = name;
  }

  description(description: string): TaskBuilder {
    this.task.description = description;
    return this;
  }

  execute(fn: (input: any, context?: any) => Promise<any>): TaskBuilder {
    this.task.execute = fn;
    return this;
  }

  dependencies(deps: string[]): TaskBuilder {
    this.task.dependencies = deps;
    return this;
  }

  priority(priority: TaskPriority): TaskBuilder {
    this.task.priority = priority;
    return this;
  }

  timeout(timeout: number): TaskBuilder {
    this.task.timeout = timeout;
    return this;
  }

  retryPolicy(policy: RetryPolicy): TaskBuilder {
    this.task.retryPolicy = policy;
    return this;
  }

  resources(resources: ResourceRequirements): TaskBuilder {
    this.task.resources = resources;
    return this;
  }

  metadata(metadata: Record<string, any>): TaskBuilder {
    this.task.metadata = metadata;
    return this;
  }

  build(): TaskDefinition {
    if (!this.task.id || !this.task.name || !this.task.execute) {
      throw new Error('Task must have id, name, and execute function');
    }
    return this.task as TaskDefinition;
  }
}

/**
 * Create a workflow definition with builder pattern
 */
export class WorkflowBuilder {
  private workflow: Partial<WorkflowDefinition> = {
    tasks: [],
  };

  constructor(id: string, name: string) {
    this.workflow.id = id;
    this.workflow.name = name;
  }

  description(description: string): WorkflowBuilder {
    this.workflow.description = description;
    return this;
  }

  addTask(task: TaskDefinition): WorkflowBuilder {
    this.workflow.tasks!.push(task);
    return this;
  }

  addTasks(tasks: TaskDefinition[]): WorkflowBuilder {
    this.workflow.tasks!.push(...tasks);
    return this;
  }

  concurrencyLimit(limit: number): WorkflowBuilder {
    this.workflow.concurrencyLimit = limit;
    return this;
  }

  timeout(timeout: number): WorkflowBuilder {
    this.workflow.timeout = timeout;
    return this;
  }

  failFast(failFast: boolean = true): WorkflowBuilder {
    this.workflow.failFast = failFast;
    return this;
  }

  metadata(metadata: Record<string, any>): WorkflowBuilder {
    this.workflow.metadata = metadata;
    return this;
  }

  build(): WorkflowDefinition {
    if (!this.workflow.id || !this.workflow.name || !this.workflow.tasks?.length) {
      throw new Error('Workflow must have id, name, and at least one task');
    }
    return this.workflow as WorkflowDefinition;
  }
}

/**
 * Factory function to create a task builder
 */
export function createTask(id: string, name: string): TaskBuilder {
  return new TaskBuilder(id, name);
}

/**
 * Factory function to create a workflow builder
 */
export function createWorkflow(id: string, name: string): WorkflowBuilder {
  return new WorkflowBuilder(id, name);
}

/**
 * Utility function to create a simple task
 */
export function simpleTask(
  id: string,
  name: string,
  execute: (input: any) => Promise<any>,
  dependencies?: string[]
): TaskDefinition {
  return createTask(id, name)
    .execute(execute)
    .dependencies(dependencies || [])
    .build();
}

/**
 * Utility function to create a simple workflow
 */
export function simpleWorkflow(
  id: string,
  name: string,
  tasks: TaskDefinition[]
): WorkflowDefinition {
  return createWorkflow(id, name)
    .addTasks(tasks)
    .build();
}

/**
 * Main VoltAgent class that provides the consolidated interface
 */
export class VoltAgent {
  private engine: ConsolidatedWorkflowEngine;
  private config: VoltAgentConfig;

  constructor(config?: Partial<VoltAgentConfig>) {
    this.config = ConfigManager.getInstance(config).getConfig();
    this.engine = new ConsolidatedWorkflowEngine(config);
  }

  /**
   * Get the workflow engine
   */
  getEngine(): ConsolidatedWorkflowEngine {
    return this.engine;
  }

  /**
   * Get the current configuration
   */
  getConfig(): VoltAgentConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<VoltAgentConfig>): void {
    ConfigManager.getInstance().updateConfig(updates);
    this.config = ConfigManager.getInstance().getConfig();
  }

  /**
   * Register and execute a workflow
   */
  async runWorkflow(workflow: WorkflowDefinition, input?: any): Promise<WorkflowExecutionResult> {
    this.engine.registerWorkflow(workflow);
    return await this.engine.executeWorkflow(workflow.id, input);
  }

  /**
   * Create a task builder
   */
  createTask(id: string, name: string): TaskBuilder {
    return createTask(id, name);
  }

  /**
   * Create a workflow builder
   */
  createWorkflow(id: string, name: string): WorkflowBuilder {
    return createWorkflow(id, name);
  }

  /**
   * Generate dependency visualization
   */
  visualizeDependencies(workflowId: string, format: 'mermaid' | 'dot' | 'html' = 'mermaid'): string {
    return this.engine.generateDependencyVisualization(workflowId, format);
  }

  /**
   * Calculate progress metrics
   */
  async getProgress(workflowId: string): Promise<ProgressMetric> {
    return await this.engine.calculateProgressMetric(workflowId, 'overall_progress');
  }

  /**
   * Create synchronization point
   */
  createSyncPoint(id: string, name: string, workstreamIds: string[]): SyncPoint {
    return this.engine.createSyncPoint({ id, name, workstreamIds });
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, boolean>;
    timestamp: string;
  }> {
    return {
      status: 'healthy',
      components: {
        workflow: true,
        dependency: this.config.dependency.enableValidation || false,
        synchronization: this.config.synchronization.enableConflictDetection || false,
        progress: this.config.progress.realTimeUpdates || false,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Default export - main VoltAgent class
 */
export default VoltAgent;

/**
 * Convenience function to create a VoltAgent instance
 */
export function createVoltAgent(config?: Partial<VoltAgentConfig>): VoltAgent {
  return new VoltAgent(config);
}

// Constants
export const Priority = TaskPriority;
export const Status = TaskStatus;
export const DependencyTypes = DependencyType;

