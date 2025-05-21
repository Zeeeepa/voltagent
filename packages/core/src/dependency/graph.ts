import {
  CreateDependencyOptions,
  CreateTaskOptions,
  CriticalPathResult,
  Dependency,
  DependencyType,
  ImpactAnalysisResult,
  Task,
  TaskStatus,
  ValidationError,
  ValidationErrorType,
  ValidationResult,
} from "./types";
import { v4 as uuidv4 } from "uuid";

/**
 * DependencyGraph - Core class for managing task dependencies
 */
export class DependencyGraph {
  /**
   * Map of tasks in the graph, keyed by task ID
   */
  private tasks: Map<string, Task> = new Map();

  /**
   * Map of dependencies, keyed by dependent task ID
   * Each entry is a map of predecessor task IDs to dependency objects
   */
  private dependencies: Map<string, Map<string, Dependency>> = new Map();

  /**
   * Map of reverse dependencies, keyed by predecessor task ID
   * Each entry is a set of dependent task IDs
   */
  private reverseDependencies: Map<string, Set<string>> = new Map();

  /**
   * Creates a new DependencyGraph instance
   */
  constructor() {
    this.tasks = new Map();
    this.dependencies = new Map();
    this.reverseDependencies = new Map();
  }

  /**
   * Add a new task to the dependency graph
   * @param options - Task creation options
   * @returns The created task
   */
  public addTask(options: CreateTaskOptions): Task {
    const id = uuidv4();
    const task: Task = {
      id,
      name: options.name,
      description: options.description,
      status: TaskStatus.PENDING,
      estimatedDuration: options.estimatedDuration,
      agentId: options.agentId,
      metadata: options.metadata,
    };

    this.tasks.set(id, task);
    return task;
  }

  /**
   * Get a task by ID
   * @param id - Task ID
   * @returns The task, or undefined if not found
   */
  public getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /**
   * Get all tasks in the dependency graph
   * @returns Array of all tasks
   */
  public getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Update a task in the dependency graph
   * @param id - Task ID
   * @param updates - Partial task updates
   * @returns The updated task, or undefined if not found
   */
  public updateTask(id: string, updates: Partial<Task>): Task | undefined {
    const task = this.tasks.get(id);
    if (!task) {
      return undefined;
    }

    // Apply updates
    const updatedTask = { ...task, ...updates };
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }

  /**
   * Remove a task from the dependency graph
   * @param id - Task ID
   * @returns True if the task was removed, false if not found
   */
  public removeTask(id: string): boolean {
    if (!this.tasks.has(id)) {
      return false;
    }

    // Remove all dependencies involving this task
    this.dependencies.delete(id);
    this.reverseDependencies.delete(id);

    // Remove this task from other tasks' dependencies
    for (const [dependentId, predecessors] of this.dependencies.entries()) {
      predecessors.delete(id);
      if (predecessors.size === 0) {
        this.dependencies.delete(dependentId);
      }
    }

    // Remove this task from other tasks' reverse dependencies
    for (const [predecessorId, dependents] of this.reverseDependencies.entries()) {
      dependents.delete(id);
      if (dependents.size === 0) {
        this.reverseDependencies.delete(predecessorId);
      }
    }

    // Remove the task itself
    this.tasks.delete(id);
    return true;
  }

  /**
   * Add a dependency between two tasks
   * @param options - Dependency creation options
   * @returns The created dependency, or undefined if the tasks don't exist
   */
  public addDependency(options: CreateDependencyOptions): Dependency | undefined {
    const { predecessorId, dependentId, type = DependencyType.FINISH_TO_START, lag = 0, metadata } = options;

    // Validate that both tasks exist
    if (!this.tasks.has(predecessorId) || !this.tasks.has(dependentId)) {
      return undefined;
    }

    // Validate that the dependency doesn't create a self-dependency
    if (predecessorId === dependentId) {
      return undefined;
    }

    // Create the dependency
    const dependency: Dependency = {
      predecessorId,
      dependentId,
      type,
      lag,
      metadata,
    };

    // Add to dependencies map
    if (!this.dependencies.has(dependentId)) {
      this.dependencies.set(dependentId, new Map());
    }
    this.dependencies.get(dependentId)!.set(predecessorId, dependency);

    // Add to reverse dependencies map
    if (!this.reverseDependencies.has(predecessorId)) {
      this.reverseDependencies.set(predecessorId, new Set());
    }
    this.reverseDependencies.get(predecessorId)!.add(dependentId);

    return dependency;
  }

  /**
   * Get all dependencies for a task
   * @param taskId - Task ID
   * @returns Array of dependencies where the task is the dependent
   */
  public getDependenciesForTask(taskId: string): Dependency[] {
    const dependencies = this.dependencies.get(taskId);
    if (!dependencies) {
      return [];
    }
    return Array.from(dependencies.values());
  }

  /**
   * Get all dependent tasks for a task
   * @param taskId - Task ID
   * @returns Array of dependencies where the task is the predecessor
   */
  public getDependentsForTask(taskId: string): Dependency[] {
    const dependents = this.reverseDependencies.get(taskId);
    if (!dependents) {
      return [];
    }

    const result: Dependency[] = [];
    for (const dependentId of dependents) {
      const dependency = this.dependencies.get(dependentId)?.get(taskId);
      if (dependency) {
        result.push(dependency);
      }
    }
    return result;
  }

  /**
   * Remove a dependency between two tasks
   * @param predecessorId - Predecessor task ID
   * @param dependentId - Dependent task ID
   * @returns True if the dependency was removed, false if not found
   */
  public removeDependency(predecessorId: string, dependentId: string): boolean {
    // Check if the dependency exists
    const dependencies = this.dependencies.get(dependentId);
    if (!dependencies || !dependencies.has(predecessorId)) {
      return false;
    }

    // Remove from dependencies map
    dependencies.delete(predecessorId);
    if (dependencies.size === 0) {
      this.dependencies.delete(dependentId);
    }

    // Remove from reverse dependencies map
    const reverseDependencies = this.reverseDependencies.get(predecessorId);
    if (reverseDependencies) {
      reverseDependencies.delete(dependentId);
      if (reverseDependencies.size === 0) {
        this.reverseDependencies.delete(predecessorId);
      }
    }

    return true;
  }

  /**
   * Get all tasks that are ready to be executed
   * @returns Array of ready tasks
   */
  public getReadyTasks(): Task[] {
    const readyTasks: Task[] = [];

    for (const task of this.tasks.values()) {
      // Skip tasks that are not pending
      if (task.status !== TaskStatus.PENDING) {
        continue;
      }

      // Check if all dependencies are satisfied
      const dependencies = this.dependencies.get(task.id);
      if (!dependencies || dependencies.size === 0) {
        // No dependencies, task is ready
        readyTasks.push(task);
        continue;
      }

      let allDependenciesSatisfied = true;
      for (const dependency of dependencies.values()) {
        const predecessorTask = this.tasks.get(dependency.predecessorId);
        if (!predecessorTask) {
          continue;
        }

        // Check if the dependency is satisfied based on its type
        switch (dependency.type) {
          case DependencyType.FINISH_TO_START:
            if (predecessorTask.status !== TaskStatus.COMPLETED) {
              allDependenciesSatisfied = false;
            }
            break;
          case DependencyType.START_TO_START:
            if (
              predecessorTask.status !== TaskStatus.IN_PROGRESS &&
              predecessorTask.status !== TaskStatus.COMPLETED
            ) {
              allDependenciesSatisfied = false;
            }
            break;
          case DependencyType.FINISH_TO_FINISH:
            // This doesn't affect whether a task can start
            break;
          case DependencyType.START_TO_FINISH:
            // This doesn't affect whether a task can start
            break;
        }

        if (!allDependenciesSatisfied) {
          break;
        }
      }

      if (allDependenciesSatisfied) {
        readyTasks.push(task);
      }
    }

    return readyTasks;
  }

  /**
   * Check if a task can be completed based on its dependencies
   * @param taskId - Task ID
   * @returns True if the task can be completed, false otherwise
   */
  public canCompleteTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== TaskStatus.IN_PROGRESS) {
      return false;
    }

    // Check if all finish-to-finish and start-to-finish dependencies are satisfied
    const dependencies = this.dependencies.get(taskId);
    if (!dependencies) {
      return true;
    }

    for (const dependency of dependencies.values()) {
      const predecessorTask = this.tasks.get(dependency.predecessorId);
      if (!predecessorTask) {
        continue;
      }

      // Check if the dependency is satisfied based on its type
      switch (dependency.type) {
        case DependencyType.FINISH_TO_FINISH:
          if (predecessorTask.status !== TaskStatus.COMPLETED) {
            return false;
          }
          break;
        case DependencyType.START_TO_FINISH:
          if (
            predecessorTask.status !== TaskStatus.IN_PROGRESS &&
            predecessorTask.status !== TaskStatus.COMPLETED
          ) {
            return false;
          }
          break;
        // Other dependency types don't affect completion
      }
    }

    return true;
  }

  /**
   * Update task status and handle cascading effects
   * @param taskId - Task ID
   * @param status - New task status
   * @param timestamp - Timestamp for the status update (defaults to now)
   * @returns The updated task, or undefined if not found
   */
  public updateTaskStatus(taskId: string, status: TaskStatus, timestamp: Date = new Date()): Task | undefined {
    const task = this.tasks.get(taskId);
    if (!task) {
      return undefined;
    }

    const updates: Partial<Task> = { status };

    // Update start/end times based on status
    if (status === TaskStatus.IN_PROGRESS && !task.startTime) {
      updates.startTime = timestamp;
    } else if (
      (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED) &&
      task.startTime &&
      !task.endTime
    ) {
      updates.endTime = timestamp;
      updates.actualDuration = timestamp.getTime() - task.startTime.getTime();
    }

    // Update the task
    const updatedTask = this.updateTask(taskId, updates);
    if (!updatedTask) {
      return undefined;
    }

    // Handle cascading effects
    if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED) {
      this.handleTaskCompletion(taskId, status);
    }

    return updatedTask;
  }

  /**
   * Handle cascading effects of task completion or failure
   * @param taskId - Task ID
   * @param status - Task status (COMPLETED or FAILED)
   */
  private handleTaskCompletion(taskId: string, status: TaskStatus): void {
    // If the task failed, mark dependent tasks as blocked
    if (status === TaskStatus.FAILED) {
      const dependents = this.reverseDependencies.get(taskId);
      if (dependents) {
        for (const dependentId of dependents) {
          const dependency = this.dependencies.get(dependentId)?.get(taskId);
          if (dependency && dependency.type === DependencyType.FINISH_TO_START) {
            this.updateTask(dependentId, { status: TaskStatus.BLOCKED });
          }
        }
      }
    }

    // Check if any dependent tasks are now ready
    const readyTasks = this.getReadyTasks();
    for (const readyTask of readyTasks) {
      if (readyTask.status === TaskStatus.PENDING) {
        this.updateTask(readyTask.id, { status: TaskStatus.READY });
      }
    }
  }

  /**
   * Validate the dependency graph
   * @returns Validation result
   */
  public validate(): ValidationResult {
    const errors: ValidationError[] = [];

    // Check for missing tasks
    for (const [dependentId, predecessors] of this.dependencies.entries()) {
      if (!this.tasks.has(dependentId)) {
        errors.push({
          type: ValidationErrorType.MISSING_TASK,
          message: `Dependent task ${dependentId} not found in the graph`,
          taskIds: [dependentId],
        });
      }

      for (const [predecessorId] of predecessors.entries()) {
        if (!this.tasks.has(predecessorId)) {
          errors.push({
            type: ValidationErrorType.MISSING_TASK,
            message: `Predecessor task ${predecessorId} not found in the graph`,
            taskIds: [predecessorId],
          });
        }
      }
    }

    // Check for cycles
    const cycleResult = this.detectCycles();
    if (cycleResult.length > 0) {
      for (const cycle of cycleResult) {
        errors.push({
          type: ValidationErrorType.CYCLE_DETECTED,
          message: `Cycle detected: ${cycle.join(" -> ")}`,
          taskIds: cycle,
        });
      }
    }

    // Check for self-dependencies
    for (const [dependentId, predecessors] of this.dependencies.entries()) {
      for (const [predecessorId] of predecessors.entries()) {
        if (predecessorId === dependentId) {
          errors.push({
            type: ValidationErrorType.SELF_DEPENDENCY,
            message: `Self-dependency detected for task ${dependentId}`,
            taskIds: [dependentId],
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Detect cycles in the dependency graph
   * @returns Array of cycles, where each cycle is an array of task IDs
   */
  public detectCycles(): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];

    // Helper function for DFS cycle detection
    const dfs = (taskId: string) => {
      if (recursionStack.has(taskId)) {
        // Found a cycle
        const cycleStart = path.indexOf(taskId);
        cycles.push(path.slice(cycleStart).concat(taskId));
        return;
      }

      if (visited.has(taskId)) {
        return;
      }

      visited.add(taskId);
      recursionStack.add(taskId);
      path.push(taskId);

      const dependents = this.reverseDependencies.get(taskId);
      if (dependents) {
        for (const dependentId of dependents) {
          dfs(dependentId);
        }
      }

      path.pop();
      recursionStack.delete(taskId);
    };

    // Run DFS from each task
    for (const taskId of this.tasks.keys()) {
      if (!visited.has(taskId)) {
        dfs(taskId);
      }
    }

    return cycles;
  }

  /**
   * Perform critical path analysis
   * @returns Critical path analysis result
   */
  public analyzeCriticalPath(): CriticalPathResult {
    // Initialize data structures
    const earliestStart: Record<string, number> = {};
    const earliestFinish: Record<string, number> = {};
    const latestStart: Record<string, number> = {};
    const latestFinish: Record<string, number> = {};
    const slack: Record<string, number> = {};

    // Get topological sort of tasks
    const sortedTasks = this.topologicalSort();
    if (!sortedTasks) {
      throw new Error("Cannot perform critical path analysis on a graph with cycles");
    }

    // Forward pass - calculate earliest start and finish times
    for (const taskId of sortedTasks) {
      const task = this.tasks.get(taskId)!;
      const duration = task.estimatedDuration || 0;

      // Initialize earliest start to 0
      earliestStart[taskId] = 0;

      // Check predecessors to find the latest earliest finish time
      const dependencies = this.dependencies.get(taskId);
      if (dependencies && dependencies.size > 0) {
        let maxEarliestFinish = 0;
        for (const [predecessorId, dependency] of dependencies.entries()) {
          const predecessorFinish = earliestFinish[predecessorId] || 0;
          const lagTime = dependency.lag || 0;
          const finishTime = predecessorFinish + lagTime;
          maxEarliestFinish = Math.max(maxEarliestFinish, finishTime);
        }
        earliestStart[taskId] = maxEarliestFinish;
      }

      // Calculate earliest finish time
      earliestFinish[taskId] = earliestStart[taskId] + duration;
    }

    // Find the project completion time (maximum earliest finish)
    const projectCompletionTime = Math.max(...Object.values(earliestFinish));

    // Initialize latest finish times to project completion time
    for (const taskId of sortedTasks) {
      latestFinish[taskId] = projectCompletionTime;
    }

    // Backward pass - calculate latest start and finish times
    for (const taskId of sortedTasks.slice().reverse()) {
      const task = this.tasks.get(taskId)!;
      const duration = task.estimatedDuration || 0;

      // Check dependents to find the earliest latest start time
      const dependents = this.reverseDependencies.get(taskId);
      if (dependents && dependents.size > 0) {
        let minLatestStart = Infinity;
        for (const dependentId of dependents) {
          const dependency = this.dependencies.get(dependentId)?.get(taskId);
          if (dependency) {
            const dependentStart = latestStart[dependentId] || projectCompletionTime;
            const lagTime = dependency.lag || 0;
            const startTime = dependentStart - lagTime;
            minLatestStart = Math.min(minLatestStart, startTime);
          }
        }
        latestFinish[taskId] = minLatestStart;
      }

      // Calculate latest start time
      latestStart[taskId] = latestFinish[taskId] - duration;

      // Calculate slack time
      slack[taskId] = latestStart[taskId] - earliestStart[taskId];
    }

    // Identify critical path (tasks with zero slack)
    const criticalPath: string[] = [];
    for (const taskId of sortedTasks) {
      if (slack[taskId] === 0) {
        criticalPath.push(taskId);
      }
    }

    return {
      path: criticalPath,
      duration: projectCompletionTime,
      earliestStart,
      earliestFinish,
      latestStart,
      latestFinish,
      slack,
    };
  }

  /**
   * Perform topological sort of tasks
   * @returns Array of task IDs in topological order, or null if a cycle is detected
   */
  public topologicalSort(): string[] | null {
    const result: string[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();

    // Helper function for DFS topological sort
    const visit = (taskId: string): boolean => {
      if (temp.has(taskId)) {
        // Cycle detected
        return false;
      }
      if (visited.has(taskId)) {
        return true;
      }

      temp.add(taskId);

      const dependencies = this.dependencies.get(taskId);
      if (dependencies) {
        for (const [predecessorId] of dependencies.entries()) {
          if (!visit(predecessorId)) {
            return false;
          }
        }
      }

      temp.delete(taskId);
      visited.add(taskId);
      result.unshift(taskId);
      return true;
    };

    // Visit each task
    for (const taskId of this.tasks.keys()) {
      if (!visited.has(taskId) && !visit(taskId)) {
        return null; // Cycle detected
      }
    }

    return result;
  }

  /**
   * Analyze the impact of a change to a task
   * @param taskId - Task ID
   * @param updates - Proposed updates to the task
   * @returns Impact analysis result
   */
  public analyzeImpact(taskId: string, updates: Partial<Task>): ImpactAnalysisResult {
    // Get the current critical path
    const currentCriticalPath = this.analyzeCriticalPath();

    // Create a copy of the graph to simulate the change
    const simulatedGraph = this.clone();
    simulatedGraph.updateTask(taskId, updates);

    // Get the new critical path
    const newCriticalPath = simulatedGraph.analyzeCriticalPath();

    // Determine directly affected tasks
    const directlyAffectedTasks = [taskId];

    // Determine indirectly affected tasks
    const indirectlyAffectedTasks: string[] = [];
    const dependents = this.getAllDependents(taskId);
    for (const dependentId of dependents) {
      if (!directlyAffectedTasks.includes(dependentId)) {
        indirectlyAffectedTasks.push(dependentId);
      }
    }

    // Determine if the critical path is affected
    const criticalPathAffected =
      currentCriticalPath.path.join(",") !== newCriticalPath.path.join(",") ||
      currentCriticalPath.duration !== newCriticalPath.duration;

    // Calculate duration impact
    const durationImpact = newCriticalPath.duration - currentCriticalPath.duration;

    return {
      directlyAffectedTasks,
      indirectlyAffectedTasks,
      durationImpact,
      criticalPathAffected,
      newCriticalPath: criticalPathAffected ? newCriticalPath.path : undefined,
    };
  }

  /**
   * Get all dependent tasks (direct and indirect) for a task
   * @param taskId - Task ID
   * @returns Set of dependent task IDs
   */
  private getAllDependents(taskId: string): Set<string> {
    const result = new Set<string>();
    const queue: string[] = [taskId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const dependents = this.reverseDependencies.get(currentId);
      if (dependents) {
        for (const dependentId of dependents) {
          if (!result.has(dependentId)) {
            result.add(dependentId);
            queue.push(dependentId);
          }
        }
      }
    }

    return result;
  }

  /**
   * Create a deep clone of the dependency graph
   * @returns A new DependencyGraph instance with the same tasks and dependencies
   */
  public clone(): DependencyGraph {
    const clone = new DependencyGraph();

    // Clone tasks
    for (const [taskId, task] of this.tasks.entries()) {
      clone.tasks.set(taskId, { ...task });
    }

    // Clone dependencies
    for (const [dependentId, predecessors] of this.dependencies.entries()) {
      const clonedPredecessors = new Map<string, Dependency>();
      for (const [predecessorId, dependency] of predecessors.entries()) {
        clonedPredecessors.set(predecessorId, { ...dependency });
      }
      clone.dependencies.set(dependentId, clonedPredecessors);
    }

    // Clone reverse dependencies
    for (const [predecessorId, dependents] of this.reverseDependencies.entries()) {
      clone.reverseDependencies.set(predecessorId, new Set(dependents));
    }

    return clone;
  }
}

