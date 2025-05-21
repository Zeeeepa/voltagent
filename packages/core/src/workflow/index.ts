// Export types
export * from "./types";

// Export core classes
export * from "./dependency-resolver";
export * from "./resource-manager";
export * from "./task-executor";
export * from "./task-scheduler";
export * from "./workflow-engine";
export * from "./workflow-builder";

// Export factory functions
import { TaskBuilder, WorkflowBuilder } from "./workflow-builder";
import { WorkflowEngine } from "./workflow-engine";
import { TaskId, TaskPriority } from "./types";

/**
 * Creates a new workflow builder
 * @param id Workflow ID
 * @param name Workflow name
 * @returns Workflow builder
 */
export function createWorkflow(id: string, name: string): WorkflowBuilder {
  return new WorkflowBuilder(id, name);
}

/**
 * Creates a new task builder
 * @param id Task ID
 * @param name Task name
 * @param execute Function to execute the task
 * @returns Task builder
 */
export function createTask<TInput = any, TOutput = any>(
  id: TaskId,
  name: string,
  execute: (input: TInput, options?: any) => Promise<TOutput>,
): TaskBuilder<TInput, TOutput> {
  return new TaskBuilder<TInput, TOutput>(id, name, execute);
}

/**
 * Creates a new workflow engine
 * @returns Workflow engine
 */
export function createWorkflowEngine(): WorkflowEngine {
  return new WorkflowEngine();
}

// Export constants
export const Priority = TaskPriority;

