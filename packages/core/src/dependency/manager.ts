import { DependencyGraph } from "./graph";
import { DependencyVisualizer } from "./visualization";
import {
  CreateDependencyOptions,
  CreateTaskOptions,
  CriticalPathResult,
  Dependency,
  DependencyHealthMetrics,
  DependencyType,
  ImpactAnalysisResult,
  Task,
  TaskStatus,
  ValidationResult,
  VisualizationOptions,
} from "./types";
import { EventEmitter } from "events";

/**
 * Events emitted by the DependencyManager
 */
export enum DependencyManagerEvent {
  /**
   * Emitted when a task is created
   */
  TASK_CREATED = "task_created",

  /**
   * Emitted when a task is updated
   */
  TASK_UPDATED = "task_updated",

  /**
   * Emitted when a task is removed
   */
  TASK_REMOVED = "task_removed",

  /**
   * Emitted when a dependency is created
   */
  DEPENDENCY_CREATED = "dependency_created",

  /**
   * Emitted when a dependency is removed
   */
  DEPENDENCY_REMOVED = "dependency_removed",

  /**
   * Emitted when a task status changes
   */
  TASK_STATUS_CHANGED = "task_status_changed",

  /**
   * Emitted when a task becomes ready
   */
  TASK_READY = "task_ready",

  /**
   * Emitted when a task is completed
   */
  TASK_COMPLETED = "task_completed",

  /**
   * Emitted when a task fails
   */
  TASK_FAILED = "task_failed",

  /**
   * Emitted when a task is blocked
   */
  TASK_BLOCKED = "task_blocked",

  /**
   * Emitted when the critical path changes
   */
  CRITICAL_PATH_CHANGED = "critical_path_changed",

  /**
   * Emitted when a validation error occurs
   */
  VALIDATION_ERROR = "validation_error",
}

/**
 * DependencyManager - Main interface for the dependency management system
 */
export class DependencyManager extends EventEmitter {
  /**
   * The dependency graph
   */
  private graph: DependencyGraph;

  /**
   * The current critical path
   */
  private currentCriticalPath: string[] = [];

  /**
   * Creates a new DependencyManager instance
   */
  constructor() {
    super();
    this.graph = new DependencyGraph();
  }

  /**
   * Create a new task
   * @param options - Task creation options
   * @returns The created task
   */
  public createTask(options: CreateTaskOptions): Task {
    const task = this.graph.addTask(options);
    this.emit(DependencyManagerEvent.TASK_CREATED, task);
    return task;
  }

  /**
   * Get a task by ID
   * @param id - Task ID
   * @returns The task, or undefined if not found
   */
  public getTask(id: string): Task | undefined {
    return this.graph.getTask(id);
  }

  /**
   * Get all tasks
   * @returns Array of all tasks
   */
  public getAllTasks(): Task[] {
    return this.graph.getAllTasks();
  }

  /**
   * Update a task
   * @param id - Task ID
   * @param updates - Partial task updates
   * @returns The updated task, or undefined if not found
   */
  public updateTask(id: string, updates: Partial<Task>): Task | undefined {
    const oldTask = this.graph.getTask(id);
    const updatedTask = this.graph.updateTask(id, updates);
    
    if (updatedTask) {
      this.emit(DependencyManagerEvent.TASK_UPDATED, oldTask, updatedTask);
      
      // Check if the critical path needs to be recalculated
      if (
        updates.estimatedDuration !== undefined ||
        updates.status === TaskStatus.COMPLETED ||
        updates.status === TaskStatus.FAILED
      ) {
        this.recalculateCriticalPath();
      }
    }
    
    return updatedTask;
  }

  /**
   * Remove a task
   * @param id - Task ID
   * @returns True if the task was removed, false if not found
   */
  public removeTask(id: string): boolean {
    const task = this.graph.getTask(id);
    if (!task) {
      return false;
    }
    
    const result = this.graph.removeTask(id);
    if (result) {
      this.emit(DependencyManagerEvent.TASK_REMOVED, task);
      
      // Recalculate critical path if the removed task was on it
      if (this.currentCriticalPath.includes(id)) {
        this.recalculateCriticalPath();
      }
    }
    
    return result;
  }

  /**
   * Create a dependency between two tasks
   * @param options - Dependency creation options
   * @returns The created dependency, or undefined if the tasks don't exist
   */
  public createDependency(options: CreateDependencyOptions): Dependency | undefined {
    const dependency = this.graph.addDependency(options);
    
    if (dependency) {
      this.emit(DependencyManagerEvent.DEPENDENCY_CREATED, dependency);
      
      // Validate the graph after adding a dependency
      const validation = this.validate();
      if (!validation.valid) {
        this.emit(DependencyManagerEvent.VALIDATION_ERROR, validation.errors);
      }
      
      // Recalculate critical path
      this.recalculateCriticalPath();
    }
    
    return dependency;
  }

  /**
   * Remove a dependency between two tasks
   * @param predecessorId - Predecessor task ID
   * @param dependentId - Dependent task ID
   * @returns True if the dependency was removed, false if not found
   */
  public removeDependency(predecessorId: string, dependentId: string): boolean {
    const dependency = this.graph.getDependenciesForTask(dependentId)
      .find(d => d.predecessorId === predecessorId);
    
    if (!dependency) {
      return false;
    }
    
    const result = this.graph.removeDependency(predecessorId, dependentId);
    if (result) {
      this.emit(DependencyManagerEvent.DEPENDENCY_REMOVED, dependency);
      
      // Recalculate critical path
      this.recalculateCriticalPath();
    }
    
    return result;
  }

  /**
   * Update task status
   * @param id - Task ID
   * @param status - New task status
   * @param timestamp - Timestamp for the status update (defaults to now)
   * @returns The updated task, or undefined if not found
   */
  public updateTaskStatus(id: string, status: TaskStatus, timestamp: Date = new Date()): Task | undefined {
    const oldTask = this.graph.getTask(id);
    if (!oldTask) {
      return undefined;
    }
    
    const updatedTask = this.graph.updateTaskStatus(id, status, timestamp);
    if (updatedTask) {
      this.emit(DependencyManagerEvent.TASK_STATUS_CHANGED, oldTask, updatedTask);
      
      // Emit specific events based on the new status
      switch (status) {
        case TaskStatus.READY:
          this.emit(DependencyManagerEvent.TASK_READY, updatedTask);
          break;
        case TaskStatus.COMPLETED:
          this.emit(DependencyManagerEvent.TASK_COMPLETED, updatedTask);
          break;
        case TaskStatus.FAILED:
          this.emit(DependencyManagerEvent.TASK_FAILED, updatedTask);
          break;
        case TaskStatus.BLOCKED:
          this.emit(DependencyManagerEvent.TASK_BLOCKED, updatedTask);
          break;
      }
      
      // Recalculate critical path if needed
      if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED) {
        this.recalculateCriticalPath();
      }
    }
    
    return updatedTask;
  }

  /**
   * Get all tasks that are ready to be executed
   * @returns Array of ready tasks
   */
  public getReadyTasks(): Task[] {
    return this.graph.getReadyTasks();
  }

  /**
   * Check if a task can be completed based on its dependencies
   * @param id - Task ID
   * @returns True if the task can be completed, false otherwise
   */
  public canCompleteTask(id: string): boolean {
    return this.graph.canCompleteTask(id);
  }

  /**
   * Validate the dependency graph
   * @returns Validation result
   */
  public validate(): ValidationResult {
    return this.graph.validate();
  }

  /**
   * Detect cycles in the dependency graph
   * @returns Array of cycles, where each cycle is an array of task IDs
   */
  public detectCycles(): string[][] {
    return this.graph.detectCycles();
  }

  /**
   * Analyze the critical path
   * @returns Critical path analysis result
   */
  public analyzeCriticalPath(): CriticalPathResult {
    return this.graph.analyzeCriticalPath();
  }

  /**
   * Recalculate the critical path and emit an event if it changed
   */
  private recalculateCriticalPath(): void {
    try {
      const criticalPathResult = this.graph.analyzeCriticalPath();
      const newCriticalPath = criticalPathResult.path;
      
      // Check if the critical path has changed
      if (
        this.currentCriticalPath.length !== newCriticalPath.length ||
        !this.currentCriticalPath.every((id, index) => id === newCriticalPath[index])
      ) {
        const oldCriticalPath = [...this.currentCriticalPath];
        this.currentCriticalPath = newCriticalPath;
        this.emit(DependencyManagerEvent.CRITICAL_PATH_CHANGED, oldCriticalPath, newCriticalPath, criticalPathResult);
      }
    } catch (error) {
      // If critical path analysis fails (e.g., due to cycles), clear the current critical path
      if (this.currentCriticalPath.length > 0) {
        const oldCriticalPath = [...this.currentCriticalPath];
        this.currentCriticalPath = [];
        this.emit(DependencyManagerEvent.CRITICAL_PATH_CHANGED, oldCriticalPath, [], null);
      }
    }
  }

  /**
   * Analyze the impact of a change to a task
   * @param id - Task ID
   * @param updates - Proposed updates to the task
   * @returns Impact analysis result
   */
  public analyzeImpact(id: string, updates: Partial<Task>): ImpactAnalysisResult {
    return this.graph.analyzeImpact(id, updates);
  }

  /**
   * Generate a visualization of the dependency graph
   * @param options - Visualization options
   * @returns Visualization string in the specified format
   */
  public visualize(options: VisualizationOptions): string {
    return DependencyVisualizer.visualize(this.graph, options);
  }

  /**
   * Calculate dependency health metrics
   * @returns Dependency health metrics
   */
  public calculateHealthMetrics(): DependencyHealthMetrics {
    const tasks = this.graph.getAllTasks();
    const taskCount = tasks.length;
    
    // Count dependencies
    let dependencyCount = 0;
    let maxDependenciesForTask = 0;
    let maxDependenciesTaskId = "";
    
    const dependenciesPerTask = new Map<string, number>();
    
    for (const task of tasks) {
      const dependencies = this.graph.getDependenciesForTask(task.id);
      const dependentCount = dependencies.length;
      dependenciesPerTask.set(task.id, dependentCount);
      dependencyCount += dependentCount;
      
      if (dependentCount > maxDependenciesForTask) {
        maxDependenciesForTask = dependentCount;
        maxDependenciesTaskId = task.id;
      }
    }
    
    // Calculate average dependencies per task
    const averageDependenciesPerTask = taskCount > 0 ? dependencyCount / taskCount : 0;
    
    // Calculate complexity score
    // This is a simple metric based on the number of tasks, dependencies, and the maximum dependencies for a single task
    const complexityScore = taskCount > 0 
      ? (dependencyCount / taskCount) * Math.log(taskCount + 1) * (maxDependenciesForTask / taskCount)
      : 0;
    
    // Calculate health score
    // This is a score from 0-100 where higher is healthier
    // Factors: presence of cycles, complexity, critical path length
    let healthScore = 100;
    
    // Deduct points for cycles
    const cycles = this.graph.detectCycles();
    if (cycles.length > 0) {
      healthScore -= 30; // Major deduction for cycles
    }
    
    // Deduct points for high complexity
    if (complexityScore > 5) {
      healthScore -= 20;
    } else if (complexityScore > 3) {
      healthScore -= 10;
    } else if (complexityScore > 1) {
      healthScore -= 5;
    }
    
    // Deduct points for long critical path relative to total tasks
    try {
      const criticalPath = this.graph.analyzeCriticalPath().path;
      const criticalPathRatio = taskCount > 0 ? criticalPath.length / taskCount : 0;
      
      if (criticalPathRatio > 0.8) {
        healthScore -= 20; // Most tasks are on critical path
      } else if (criticalPathRatio > 0.6) {
        healthScore -= 10;
      } else if (criticalPathRatio > 0.4) {
        healthScore -= 5;
      }
    } catch (error) {
      // If critical path analysis fails, assume worst case
      healthScore -= 20;
    }
    
    // Ensure health score is between 0 and 100
    healthScore = Math.max(0, Math.min(100, healthScore));
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (cycles.length > 0) {
      recommendations.push("Remove circular dependencies to improve workflow efficiency.");
    }
    
    if (maxDependenciesForTask > 5) {
      const task = this.graph.getTask(maxDependenciesTaskId);
      recommendations.push(
        `Task "${task?.name}" has ${maxDependenciesForTask} dependencies. Consider breaking it into smaller tasks.`
      );
    }
    
    if (averageDependenciesPerTask > 3) {
      recommendations.push(
        "The workflow has a high average number of dependencies per task. Consider simplifying the dependency structure."
      );
    }
    
    try {
      const criticalPath = this.graph.analyzeCriticalPath().path;
      if (criticalPath.length > 10) {
        recommendations.push(
          "The critical path is very long. Look for opportunities to parallelize tasks or reduce dependencies."
        );
      }
    } catch (error) {
      recommendations.push(
        "Unable to analyze critical path due to cycles. Remove circular dependencies to enable critical path analysis."
      );
    }
    
    if (taskCount > 20 && dependencyCount > 50) {
      recommendations.push(
        "The workflow is very complex. Consider breaking it into multiple smaller workflows."
      );
    }
    
    return {
      taskCount,
      dependencyCount,
      averageDependenciesPerTask,
      maxDependenciesForTask,
      maxDependenciesTaskId,
      complexityScore,
      healthScore,
      recommendations,
    };
  }

  /**
   * Get dependency minimization recommendations
   * @returns Array of recommendation strings
   */
  public getMinimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    const tasks = this.graph.getAllTasks();
    
    // Check for redundant dependencies
    for (const task of tasks) {
      const dependencies = this.graph.getDependenciesForTask(task.id);
      
      // If a task has more than one dependency, check for redundancy
      if (dependencies.length > 1) {
        const predecessorIds = dependencies.map(d => d.predecessorId);
        
        // For each predecessor, check if it's also a predecessor of another predecessor
        for (const predecessorId of predecessorIds) {
          for (const otherPredecessorId of predecessorIds) {
            if (predecessorId !== otherPredecessorId) {
              const otherPredecessorDependencies = this.graph.getDependenciesForTask(otherPredecessorId);
              const isIndirectDependency = otherPredecessorDependencies.some(d => d.predecessorId === predecessorId);
              
              if (isIndirectDependency) {
                const predecessor = this.graph.getTask(predecessorId);
                const otherPredecessor = this.graph.getTask(otherPredecessorId);
                const currentTask = this.graph.getTask(task.id);
                
                if (predecessor && otherPredecessor && currentTask) {
                  recommendations.push(
                    `Redundant dependency: Task "${currentTask.name}" depends on both "${predecessor.name}" and "${otherPredecessor.name}", but "${otherPredecessor.name}" already depends on "${predecessor.name}". Consider removing the direct dependency on "${predecessor.name}".`
                  );
                }
              }
            }
          }
        }
      }
    }
    
    // Check for tasks with too many dependencies
    for (const task of tasks) {
      const dependencies = this.graph.getDependenciesForTask(task.id);
      if (dependencies.length > 5) {
        recommendations.push(
          `Task "${task.name}" has ${dependencies.length} dependencies. Consider breaking it into smaller tasks with fewer dependencies.`
        );
      }
    }
    
    // Check for tasks with too many dependents
    for (const task of tasks) {
      const dependents = this.graph.getDependentsForTask(task.id);
      if (dependents.length > 5) {
        recommendations.push(
          `Task "${task.name}" has ${dependents.length} dependent tasks. Consider creating intermediate grouping tasks to reduce direct dependencies.`
        );
      }
    }
    
    // Check for critical path optimization opportunities
    try {
      const criticalPathResult = this.graph.analyzeCriticalPath();
      const criticalPath = criticalPathResult.path;
      
      if (criticalPath.length > 5) {
        // Look for tasks on the critical path with low slack
        const tasksWithLowSlack = criticalPath.filter(id => criticalPathResult.slack[id] < 100);
        
        if (tasksWithLowSlack.length > 0) {
          const taskNames = tasksWithLowSlack
            .map(id => this.graph.getTask(id)?.name || id)
            .join(", ");
          
          recommendations.push(
            `Critical path optimization: Tasks with low slack (${taskNames}) are on the critical path. Consider allocating more resources to these tasks or breaking them into smaller parallel tasks.`
          );
        }
      }
    } catch (error) {
      // Critical path analysis failed, likely due to cycles
    }
    
    return recommendations;
  }
}

