/**
 * VoltAgent Unified Workflow Orchestration Engine
 * 
 * This module provides a comprehensive workflow orchestration system that consolidates
 * workflow and task management into a single unified engine. It builds upon the existing
 * SubAgentManager while providing advanced orchestration capabilities including:
 * 
 * - Multiple execution modes (sequential, parallel, conditional, pipeline, graph)
 * - Advanced task scheduling and queuing
 * - Workflow state management and persistence
 * - Comprehensive validation and error handling
 * - Event-driven monitoring and observability
 * - Retry policies and fault tolerance
 * 
 * @example Basic Usage
 * ```typescript
 * import { WorkflowOrchestrationEngine, WorkflowDefinition } from '@voltagent/core/orchestration';
 * 
 * // Create orchestration engine with agents
 * const engine = new WorkflowOrchestrationEngine([agent1, agent2]);
 * await engine.start();
 * 
 * // Define a workflow
 * const workflow: WorkflowDefinition = {
 *   id: 'data-processing',
 *   name: 'Data Processing Pipeline',
 *   version: '1.0.0',
 *   mode: 'pipeline',
 *   tasks: [
 *     {
 *       id: 'extract',
 *       name: 'Extract Data',
 *       agentName: 'DataExtractor',
 *       input: 'Extract data from source'
 *     },
 *     {
 *       id: 'transform',
 *       name: 'Transform Data',
 *       agentName: 'DataTransformer',
 *       input: 'Transform the extracted data',
 *       dependencies: ['extract']
 *     }
 *   ]
 * };
 * 
 * // Register and execute workflow
 * await engine.registerWorkflow(workflow);
 * const result = await engine.executeWorkflow('data-processing', { source: 'database' });
 * ```
 * 
 * @example Advanced Workflow with Conditions
 * ```typescript
 * const conditionalWorkflow: WorkflowDefinition = {
 *   id: 'conditional-processing',
 *   name: 'Conditional Processing',
 *   version: '1.0.0',
 *   mode: 'conditional',
 *   tasks: [
 *     {
 *       id: 'check-data',
 *       name: 'Check Data Quality',
 *       agentName: 'QualityChecker',
 *       input: 'Check data quality'
 *     },
 *     {
 *       id: 'process-good-data',
 *       name: 'Process Good Data',
 *       agentName: 'DataProcessor',
 *       input: 'Process high quality data',
 *       conditions: [{
 *         type: 'result',
 *         taskId: 'check-data',
 *         operator: 'contains',
 *         value: 'high_quality'
 *       }]
 *     },
 *     {
 *       id: 'clean-bad-data',
 *       name: 'Clean Bad Data',
 *       agentName: 'DataCleaner',
 *       input: 'Clean low quality data',
 *       conditions: [{
 *         type: 'result',
 *         taskId: 'check-data',
 *         operator: 'contains',
 *         value: 'low_quality'
 *       }]
 *     }
 *   ]
 * };
 * ```
 */

// Core orchestration engine
export { WorkflowOrchestrationEngine } from './engine';

// Task scheduling
export { TaskScheduler } from './scheduler';

// State management
export { WorkflowStateManager } from './state-manager';

// Validation
export { WorkflowValidator } from './validator';
export type { ValidationResult } from './validator';

// Type definitions
export type {
  // Core workflow types
  WorkflowDefinition,
  WorkflowTask,
  WorkflowExecutionContext,
  WorkflowExecutionResult,
  WorkflowExecutionOptions,
  
  // Task types
  TaskExecutionResult,
  TaskCondition,
  QueuedTask,
  
  // Status types
  WorkflowStatus,
  TaskStatus,
  ExecutionMode,
  
  // Configuration types
  RetryPolicy,
  ErrorHandlingStrategy,
  SchedulerConfig,
  
  // Event types
  WorkflowEvent,
  WorkflowError,
  
  // Interface types
  IWorkflowOrchestrator,
  ITaskScheduler,
  IWorkflowStateManager,
} from './types';

/**
 * Utility function to create a simple sequential workflow
 */
export function createSequentialWorkflow(
  id: string,
  name: string,
  tasks: Array<{
    id: string;
    name: string;
    agentName: string;
    input: string | Record<string, unknown>;
    timeout?: number;
    retries?: number;
  }>
): WorkflowDefinition {
  return {
    id,
    name,
    version: '1.0.0',
    mode: 'sequential',
    tasks: tasks.map(task => ({
      ...task,
      description: task.name,
    })),
  };
}

/**
 * Utility function to create a parallel workflow
 */
export function createParallelWorkflow(
  id: string,
  name: string,
  tasks: Array<{
    id: string;
    name: string;
    agentName: string;
    input: string | Record<string, unknown>;
    timeout?: number;
    retries?: number;
  }>
): WorkflowDefinition {
  return {
    id,
    name,
    version: '1.0.0',
    mode: 'parallel',
    tasks: tasks.map(task => ({
      ...task,
      description: task.name,
    })),
  };
}

/**
 * Utility function to create a pipeline workflow
 */
export function createPipelineWorkflow(
  id: string,
  name: string,
  tasks: Array<{
    id: string;
    name: string;
    agentName: string;
    input: string | Record<string, unknown>;
    timeout?: number;
    retries?: number;
  }>
): WorkflowDefinition {
  return {
    id,
    name,
    version: '1.0.0',
    mode: 'pipeline',
    tasks: tasks.map(task => ({
      ...task,
      description: task.name,
    })),
  };
}

/**
 * Utility function to create a graph workflow with dependencies
 */
export function createGraphWorkflow(
  id: string,
  name: string,
  tasks: Array<{
    id: string;
    name: string;
    agentName: string;
    input: string | Record<string, unknown>;
    dependencies?: string[];
    timeout?: number;
    retries?: number;
  }>
): WorkflowDefinition {
  return {
    id,
    name,
    version: '1.0.0',
    mode: 'graph',
    tasks: tasks.map(task => ({
      ...task,
      description: task.name,
    })),
  };
}

/**
 * Default retry policy for workflows
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  backoffStrategy: 'exponential',
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
};

/**
 * Default error handling strategy
 */
export const DEFAULT_ERROR_HANDLING: ErrorHandlingStrategy = {
  onTaskFailure: 'stop',
  onWorkflowFailure: 'stop',
  errorNotification: true,
};

/**
 * Default scheduler configuration
 */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  maxConcurrentWorkflows: 10,
  maxConcurrentTasks: 50,
  taskQueueSize: 1000,
  heartbeatInterval: 5000, // 5 seconds
  cleanupInterval: 60000, // 1 minute
  persistenceEnabled: false,
};

