import { DependencyResolver } from "./dependency-resolver";
import { ResourceManager } from "./resource-manager";
import {
  TaskDefinition,
  TaskId,
  TaskPriority,
  TaskState,
  WorkflowDefinition,
  WorkflowInstance,
} from "./types";

/**
 * TaskScheduler is responsible for determining which tasks are ready to execute
 * and in what order, based on dependencies, priorities, and resource availability.
 */
export class TaskScheduler {
  private dependencyResolver: DependencyResolver;
  private resourceManager: ResourceManager;
  
  /**
   * Creates a new TaskScheduler
   * @param dependencyResolver Dependency resolver
   * @param resourceManager Resource manager
   */
  constructor(
    dependencyResolver: DependencyResolver,
    resourceManager: ResourceManager,
  ) {
    this.dependencyResolver = dependencyResolver;
    this.resourceManager = resourceManager;
  }
  
  /**
   * Gets tasks that are ready to execute
   * @param workflow Workflow instance
   * @returns Array of task IDs that are ready to execute, sorted by priority
   */
  public getReadyTasks(workflow: WorkflowInstance): TaskId[] {
    const { definition, tasks } = workflow;
    
    // Get completed task IDs
    const completedTaskIds = new Set<TaskId>();
    for (const [taskId, task] of tasks.entries()) {
      if (task.state === TaskState.COMPLETED) {
        completedTaskIds.add(taskId);
      }
    }
    
    // Get tasks with satisfied dependencies
    const readyTaskIds = this.dependencyResolver.getReadyTasks(definition, completedTaskIds);
    
    // Filter out tasks that are already running, failed, or cancelled
    const availableTaskIds = readyTaskIds.filter(taskId => {
      const task = tasks.get(taskId);
      return task && (task.state === TaskState.PENDING || task.state === TaskState.FAILED && task.retryCount > 0);
    });
    
    // Sort by priority (higher priority first)
    return this.sortByPriority(availableTaskIds, definition);
  }
  
  /**
   * Sorts tasks by priority
   * @param taskIds Task IDs to sort
   * @param workflow Workflow definition
   * @returns Sorted task IDs
   */
  private sortByPriority(taskIds: TaskId[], workflow: WorkflowDefinition): TaskId[] {
    const taskMap = new Map<TaskId, TaskDefinition>();
    
    // Build task map for quick lookup
    for (const task of workflow.tasks) {
      taskMap.set(task.id, task);
    }
    
    // Get critical path for priority boost
    const criticalPath = new Set(this.dependencyResolver.getCriticalPath(workflow));
    
    // Sort by priority
    return [...taskIds].sort((a, b) => {
      const taskA = taskMap.get(a)!;
      const taskB = taskMap.get(b)!;
      
      // Get base priorities
      const priorityA = taskA.priority || TaskPriority.NORMAL;
      const priorityB = taskB.priority || TaskPriority.NORMAL;
      
      // Boost priority for tasks on critical path
      const criticalA = criticalPath.has(a) ? 1000 : 0;
      const criticalB = criticalPath.has(b) ? 1000 : 0;
      
      // Compare total priorities
      return (priorityB + criticalB) - (priorityA + criticalA);
    });
  }
  
  /**
   * Schedules tasks for execution based on available resources
   * @param workflow Workflow instance
   * @param maxConcurrent Maximum number of concurrent tasks (default: Infinity)
   * @returns Array of task IDs that can be executed immediately
   */
  public scheduleTasks(workflow: WorkflowInstance, maxConcurrent: number = Infinity): TaskId[] {
    // Get ready tasks sorted by priority
    const readyTasks = this.getReadyTasks(workflow);
    
    // Count currently running tasks
    let runningCount = 0;
    for (const task of workflow.tasks.values()) {
      if (task.state === TaskState.RUNNING) {
        runningCount++;
      }
    }
    
    // Calculate how many more tasks we can run
    const availableSlots = Math.max(0, maxConcurrent - runningCount);
    
    if (availableSlots === 0) {
      return [];
    }
    
    // Schedule tasks based on resource availability
    const scheduledTasks: TaskId[] = [];
    
    for (const taskId of readyTasks) {
      if (scheduledTasks.length >= availableSlots) {
        break;
      }
      
      const task = workflow.tasks.get(taskId)!;
      const resources = task.definition.resources || {};
      
      // Check if resources are available
      if (this.resourceManager.canAllocate(taskId, resources)) {
        scheduledTasks.push(taskId);
        
        // Allocate resources
        this.resourceManager.allocate(taskId, resources);
      }
    }
    
    return scheduledTasks;
  }
  
  /**
   * Releases resources allocated for a task
   * @param workflow Workflow instance
   * @param taskId Task ID
   */
  public releaseTaskResources(workflow: WorkflowInstance, taskId: TaskId): void {
    this.resourceManager.release(taskId);
  }
}

