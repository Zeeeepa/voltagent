/**
 * Consolidated Workflow Engine
 * 
 * This module consolidates the best features from multiple PRs:
 * - PR #27: Parallel Execution Engine (core foundation)
 * - PR #26: Dependency Management (visualization features)
 * - PR #29: Progress Tracking (monitoring capabilities)
 * - PR #30: Synchronization Management (conflict resolution)
 */

import { EventEmitter } from 'events';
import { VoltAgentConfig, ConfigManager } from '../config/unified-config.js';

// Core Types (consolidated from multiple PRs)
export type TaskId = string;
export type WorkflowId = string;
export type WorkstreamId = string;

export enum TaskStatus {
  PENDING = 'pending',
  READY = 'ready',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  BLOCKED = 'blocked',
  CANCELLED = 'cancelled'
}

export enum TaskPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

export enum DependencyType {
  FINISH_TO_START = 'finish_to_start',
  START_TO_START = 'start_to_start',
  FINISH_TO_FINISH = 'finish_to_finish',
  START_TO_FINISH = 'start_to_finish'
}

export interface ResourceRequirements {
  cpu?: number;
  memory?: number;
  disk?: number;
  network?: number;
  [key: string]: number | undefined;
}

export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;
  backoffFactor: number;
  retryableErrors?: string[];
}

export interface TaskDefinition {
  id: TaskId;
  name: string;
  description?: string;
  execute: (input: any, context?: TaskExecutionContext) => Promise<any>;
  dependencies?: TaskId[];
  dependencyType?: DependencyType;
  priority?: TaskPriority;
  timeout?: number;
  retryPolicy?: RetryPolicy;
  resources?: ResourceRequirements;
  metadata?: Record<string, any>;
}

export interface TaskExecutionContext {
  taskId: TaskId;
  workflowId: WorkflowId;
  attempt: number;
  startTime: number;
  resources?: ResourceRequirements;
  signal?: AbortSignal;
}

export interface TaskResult {
  taskId: TaskId;
  status: TaskStatus;
  result?: any;
  error?: Error;
  startTime: number;
  endTime?: number;
  duration?: number;
  attempts: number;
  resources?: ResourceRequirements;
}

export interface WorkflowDefinition {
  id: WorkflowId;
  name: string;
  description?: string;
  tasks: TaskDefinition[];
  concurrencyLimit?: number;
  timeout?: number;
  failFast?: boolean;
  metadata?: Record<string, any>;
}

export interface WorkflowExecutionResult {
  workflowId: WorkflowId;
  status: 'completed' | 'failed' | 'cancelled';
  results: Record<TaskId, any>;
  errors: Record<TaskId, Error>;
  startTime: number;
  endTime: number;
  duration: number;
  tasksExecuted: number;
  tasksSucceeded: number;
  tasksFailed: number;
}

// Progress Tracking Types (from PR #29)
export interface Milestone {
  id: string;
  name: string;
  description?: string;
  workflowId: WorkflowId;
  taskIds?: TaskId[];
  weight?: number;
  expectedCompletionTime?: number;
  dependencies?: string[];
  status?: 'not_started' | 'in_progress' | 'completed' | 'blocked';
  completedAt?: number;
}

export interface ProgressMetric {
  id: string;
  name: string;
  description: string;
  type: string;
  value: number;
  timestamp: number;
  workflowId: WorkflowId;
}

// Synchronization Types (from PR #30)
export interface SyncPoint {
  id: string;
  name: string;
  workstreamIds: WorkstreamId[];
  requiredWorkstreams?: WorkstreamId[];
  minimumParticipants?: number;
  timeout?: number;
  status: 'waiting' | 'completed' | 'failed' | 'timeout';
}

export interface ConflictInfo {
  id: string;
  syncPointId: string;
  workstreams: WorkstreamId[];
  reason: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  status: 'detected' | 'resolving' | 'resolved' | 'unresolvable';
  resolutionStrategy?: string;
}

/**
 * Consolidated Workflow Engine
 * 
 * Integrates parallel execution, dependency management, progress tracking,
 * and synchronization management into a unified system.
 */
export class ConsolidatedWorkflowEngine extends EventEmitter {
  private config: VoltAgentConfig;
  private workflows: Map<WorkflowId, WorkflowDefinition> = new Map();
  private executions: Map<WorkflowId, WorkflowExecutionResult> = new Map();
  private taskResults: Map<TaskId, TaskResult> = new Map();
  private milestones: Map<string, Milestone> = new Map();
  private syncPoints: Map<string, SyncPoint> = new Map();
  private conflicts: Map<string, ConflictInfo> = new Map();
  private resourcePool: ResourceRequirements;
  private allocatedResources: Map<TaskId, ResourceRequirements> = new Map();

  constructor(config?: Partial<VoltAgentConfig>) {
    super();
    this.config = ConfigManager.getInstance(config).getConfig();
    this.resourcePool = this.config.workflow.resourceLimits || { cpu: 100, memory: 100 };
  }

  /**
   * Register a workflow definition
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    // Validate workflow
    this.validateWorkflow(workflow);
    
    // Store workflow
    this.workflows.set(workflow.id, workflow);
    
    this.emit('workflow:registered', { workflowId: workflow.id, workflow });
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId: WorkflowId, input?: any): Promise<WorkflowExecutionResult> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const startTime = Date.now();
    const execution: WorkflowExecutionResult = {
      workflowId,
      status: 'completed',
      results: {},
      errors: {},
      startTime,
      endTime: 0,
      duration: 0,
      tasksExecuted: 0,
      tasksSucceeded: 0,
      tasksFailed: 0,
    };

    this.executions.set(workflowId, execution);
    this.emit('workflow:started', { workflowId, execution });

    try {
      // Build dependency graph
      const dependencyGraph = this.buildDependencyGraph(workflow.tasks);
      
      // Validate dependencies
      this.validateDependencies(dependencyGraph);
      
      // Execute tasks in dependency order
      const results = await this.executeTasks(workflow, dependencyGraph, input);
      
      // Update execution result
      execution.results = results.results;
      execution.errors = results.errors;
      execution.tasksExecuted = results.tasksExecuted;
      execution.tasksSucceeded = results.tasksSucceeded;
      execution.tasksFailed = results.tasksFailed;
      execution.status = results.tasksFailed > 0 ? 'failed' : 'completed';
      
    } catch (error) {
      execution.status = 'failed';
      execution.errors['workflow'] = error as Error;
      this.emit('workflow:error', { workflowId, error });
    } finally {
      execution.endTime = Date.now();
      execution.duration = execution.endTime - execution.startTime;
      this.emit('workflow:completed', { workflowId, execution });
    }

    return execution;
  }

  /**
   * Get workflow execution status
   */
  getExecutionStatus(workflowId: WorkflowId): WorkflowExecutionResult | undefined {
    return this.executions.get(workflowId);
  }

  /**
   * Cancel workflow execution
   */
  async cancelWorkflow(workflowId: WorkflowId): Promise<void> {
    const execution = this.executions.get(workflowId);
    if (!execution) {
      throw new Error(`Workflow execution ${workflowId} not found`);
    }

    execution.status = 'cancelled';
    this.emit('workflow:cancelled', { workflowId });
  }

  /**
   * Register a milestone
   */
  async registerMilestone(milestone: Milestone): Promise<void> {
    this.milestones.set(milestone.id, milestone);
    this.emit('milestone:registered', { milestone });
  }

  /**
   * Update milestone status
   */
  async updateMilestoneStatus(milestoneId: string, status: Milestone['status']): Promise<void> {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) {
      throw new Error(`Milestone ${milestoneId} not found`);
    }

    milestone.status = status;
    if (status === 'completed') {
      milestone.completedAt = Date.now();
    }

    this.emit('milestone:updated', { milestone });
  }

  /**
   * Calculate progress metrics
   */
  async calculateProgressMetric(workflowId: WorkflowId, metricType: string): Promise<ProgressMetric> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    let value = 0;
    const timestamp = Date.now();

    switch (metricType) {
      case 'overall_progress':
        value = this.calculateOverallProgress(workflowId);
        break;
      case 'completed_tasks':
        value = this.getCompletedTaskCount(workflowId);
        break;
      case 'failed_tasks':
        value = this.getFailedTaskCount(workflowId);
        break;
      default:
        throw new Error(`Unknown metric type: ${metricType}`);
    }

    const metric: ProgressMetric = {
      id: `${workflowId}_${metricType}_${timestamp}`,
      name: metricType,
      description: `${metricType} for workflow ${workflowId}`,
      type: metricType,
      value,
      timestamp,
      workflowId,
    };

    this.emit('metric:calculated', { metric });
    return metric;
  }

  /**
   * Create synchronization point
   */
  createSyncPoint(syncPoint: Omit<SyncPoint, 'status'>): SyncPoint {
    const fullSyncPoint: SyncPoint = {
      ...syncPoint,
      status: 'waiting',
    };

    this.syncPoints.set(syncPoint.id, fullSyncPoint);
    this.emit('sync:created', { syncPoint: fullSyncPoint });
    
    return fullSyncPoint;
  }

  /**
   * Wait at synchronization point
   */
  async waitAtSyncPoint(syncPointId: string, workstreamId: WorkstreamId): Promise<void> {
    const syncPoint = this.syncPoints.get(syncPointId);
    if (!syncPoint) {
      throw new Error(`Sync point ${syncPointId} not found`);
    }

    // Check if this workstream is expected
    if (!syncPoint.workstreamIds.includes(workstreamId)) {
      throw new Error(`Workstream ${workstreamId} not expected at sync point ${syncPointId}`);
    }

    this.emit('sync:workstream_arrived', { syncPointId, workstreamId });

    // Implementation would include actual synchronization logic
    // For now, we'll simulate immediate completion
    syncPoint.status = 'completed';
    this.emit('sync:completed', { syncPoint });
  }

  /**
   * Detect conflict
   */
  detectConflict(
    syncPointId: string,
    workstreams: WorkstreamId[],
    reason: string,
    type: string,
    severity: ConflictInfo['severity'] = 'medium'
  ): ConflictInfo {
    const conflictId = `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const conflict: ConflictInfo = {
      id: conflictId,
      syncPointId,
      workstreams,
      reason,
      timestamp: Date.now(),
      severity,
      type,
      status: 'detected',
    };

    this.conflicts.set(conflictId, conflict);
    this.emit('conflict:detected', { conflict });

    return conflict;
  }

  /**
   * Resolve conflict
   */
  async resolveConflict(conflictId: string, strategy?: string): Promise<ConflictInfo> {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    conflict.status = 'resolving';
    conflict.resolutionStrategy = strategy || this.config.synchronization.defaultConflictResolution;

    // Simulate conflict resolution
    await new Promise(resolve => setTimeout(resolve, 100));

    conflict.status = 'resolved';
    this.emit('conflict:resolved', { conflict });

    return conflict;
  }

  /**
   * Generate dependency visualization
   */
  generateDependencyVisualization(workflowId: WorkflowId, format: 'mermaid' | 'dot' | 'html' = 'mermaid'): string {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    switch (format) {
      case 'mermaid':
        return this.generateMermaidDiagram(workflow);
      case 'dot':
        return this.generateDotDiagram(workflow);
      case 'html':
        return this.generateHtmlVisualization(workflow);
      default:
        throw new Error(`Unsupported visualization format: ${format}`);
    }
  }

  // Private methods

  private validateWorkflow(workflow: WorkflowDefinition): void {
    if (!workflow.id || !workflow.name || !workflow.tasks || workflow.tasks.length === 0) {
      throw new Error('Invalid workflow definition');
    }

    // Validate task IDs are unique
    const taskIds = new Set();
    for (const task of workflow.tasks) {
      if (taskIds.has(task.id)) {
        throw new Error(`Duplicate task ID: ${task.id}`);
      }
      taskIds.add(task.id);
    }
  }

  private buildDependencyGraph(tasks: TaskDefinition[]): Map<TaskId, TaskId[]> {
    const graph = new Map<TaskId, TaskId[]>();
    
    for (const task of tasks) {
      graph.set(task.id, task.dependencies || []);
    }
    
    return graph;
  }

  private validateDependencies(graph: Map<TaskId, TaskId[]>): void {
    // Check for circular dependencies using DFS
    const visited = new Set<TaskId>();
    const recursionStack = new Set<TaskId>();

    const hasCycle = (taskId: TaskId): boolean => {
      if (recursionStack.has(taskId)) {
        return true;
      }
      if (visited.has(taskId)) {
        return false;
      }

      visited.add(taskId);
      recursionStack.add(taskId);

      const dependencies = graph.get(taskId) || [];
      for (const depId of dependencies) {
        if (hasCycle(depId)) {
          return true;
        }
      }

      recursionStack.delete(taskId);
      return false;
    };

    for (const taskId of graph.keys()) {
      if (hasCycle(taskId)) {
        throw new Error(`Circular dependency detected involving task: ${taskId}`);
      }
    }
  }

  private async executeTasks(
    workflow: WorkflowDefinition,
    dependencyGraph: Map<TaskId, TaskId[]>,
    input?: any
  ): Promise<{
    results: Record<TaskId, any>;
    errors: Record<TaskId, Error>;
    tasksExecuted: number;
    tasksSucceeded: number;
    tasksFailed: number;
  }> {
    const results: Record<TaskId, any> = {};
    const errors: Record<TaskId, Error> = {};
    const completed = new Set<TaskId>();
    const running = new Set<TaskId>();
    let tasksExecuted = 0;
    let tasksSucceeded = 0;
    let tasksFailed = 0;

    const concurrencyLimit = workflow.concurrencyLimit || this.config.workflow.concurrencyLimit || 10;
    const semaphore = new Array(concurrencyLimit).fill(null);

    const canExecute = (taskId: TaskId): boolean => {
      const dependencies = dependencyGraph.get(taskId) || [];
      return dependencies.every(depId => completed.has(depId));
    };

    const executeTask = async (task: TaskDefinition): Promise<void> => {
      if (running.has(task.id) || completed.has(task.id)) {
        return;
      }

      running.add(task.id);
      tasksExecuted++;

      const context: TaskExecutionContext = {
        taskId: task.id,
        workflowId: workflow.id,
        attempt: 1,
        startTime: Date.now(),
      };

      this.emit('task:started', { taskId: task.id, context });

      try {
        const result = await task.execute(input, context);
        results[task.id] = result;
        tasksSucceeded++;
        this.emit('task:completed', { taskId: task.id, result });
      } catch (error) {
        errors[task.id] = error as Error;
        tasksFailed++;
        this.emit('task:failed', { taskId: task.id, error });
        
        if (workflow.failFast) {
          throw error;
        }
      } finally {
        running.delete(task.id);
        completed.add(task.id);
      }
    };

    // Execute tasks in dependency order
    while (completed.size < workflow.tasks.length) {
      const readyTasks = workflow.tasks.filter(task => 
        !completed.has(task.id) && 
        !running.has(task.id) && 
        canExecute(task.id)
      );

      if (readyTasks.length === 0 && running.size === 0) {
        // No tasks can be executed and none are running - deadlock
        const remainingTasks = workflow.tasks.filter(task => !completed.has(task.id));
        throw new Error(`Deadlock detected. Remaining tasks: ${remainingTasks.map(t => t.id).join(', ')}`);
      }

      // Execute ready tasks up to concurrency limit
      const tasksToExecute = readyTasks.slice(0, concurrencyLimit - running.size);
      await Promise.all(tasksToExecute.map(executeTask));

      // Small delay to prevent busy waiting
      if (readyTasks.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return { results, errors, tasksExecuted, tasksSucceeded, tasksFailed };
  }

  private calculateOverallProgress(workflowId: WorkflowId): number {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return 0;
    }

    const totalTasks = workflow.tasks.length;
    const completedTasks = this.getCompletedTaskCount(workflowId);
    
    return totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  }

  private getCompletedTaskCount(workflowId: WorkflowId): number {
    let count = 0;
    for (const [taskId, result] of this.taskResults.entries()) {
      if (result.status === TaskStatus.COMPLETED) {
        count++;
      }
    }
    return count;
  }

  private getFailedTaskCount(workflowId: WorkflowId): number {
    let count = 0;
    for (const [taskId, result] of this.taskResults.entries()) {
      if (result.status === TaskStatus.FAILED) {
        count++;
      }
    }
    return count;
  }

  private generateMermaidDiagram(workflow: WorkflowDefinition): string {
    let mermaid = 'graph TD\n';
    
    for (const task of workflow.tasks) {
      mermaid += `  ${task.id}["${task.name}"]\n`;
      
      if (task.dependencies) {
        for (const depId of task.dependencies) {
          mermaid += `  ${depId} --> ${task.id}\n`;
        }
      }
    }
    
    return mermaid;
  }

  private generateDotDiagram(workflow: WorkflowDefinition): string {
    let dot = 'digraph workflow {\n';
    dot += '  rankdir=TB;\n';
    
    for (const task of workflow.tasks) {
      dot += `  "${task.id}" [label="${task.name}"];\n`;
      
      if (task.dependencies) {
        for (const depId of task.dependencies) {
          dot += `  "${depId}" -> "${task.id}";\n`;
        }
      }
    }
    
    dot += '}\n';
    return dot;
  }

  private generateHtmlVisualization(workflow: WorkflowDefinition): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Workflow: ${workflow.name}</title>
  <style>
    .task { border: 1px solid #ccc; padding: 10px; margin: 5px; border-radius: 5px; }
    .completed { background-color: #d4edda; }
    .failed { background-color: #f8d7da; }
    .running { background-color: #fff3cd; }
  </style>
</head>
<body>
  <h1>Workflow: ${workflow.name}</h1>
  <div id="tasks">
    ${workflow.tasks.map(task => `
      <div class="task" id="${task.id}">
        <h3>${task.name}</h3>
        <p>${task.description || ''}</p>
        <p>Dependencies: ${task.dependencies?.join(', ') || 'None'}</p>
      </div>
    `).join('')}
  </div>
</body>
</html>
    `;
  }
}

