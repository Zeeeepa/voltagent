import { TaskDefinition, TaskId, WorkflowDefinition } from "./types";

/**
 * Error thrown when a circular dependency is detected
 */
export class CircularDependencyError extends Error {
  constructor(public readonly cycle: TaskId[]) {
    super(`Circular dependency detected: ${cycle.join(" -> ")} -> ${cycle[0]}`);
    this.name = "CircularDependencyError";
  }
}

/**
 * Error thrown when a dependency is missing
 */
export class MissingDependencyError extends Error {
  constructor(public readonly taskId: TaskId, public readonly dependencyId: TaskId) {
    super(`Task "${taskId}" depends on missing task "${dependencyId}"`);
    this.name = "MissingDependencyError";
  }
}

/**
 * DependencyResolver is responsible for analyzing task dependencies
 * and determining the execution order of tasks in a workflow.
 */
export class DependencyResolver {
  /**
   * Validates the dependencies in a workflow definition
   * @param workflow The workflow definition to validate
   * @throws {CircularDependencyError} If a circular dependency is detected
   * @throws {MissingDependencyError} If a dependency is missing
   */
  public validateDependencies(workflow: WorkflowDefinition): void {
    const taskMap = new Map<TaskId, TaskDefinition>();
    
    // Build a map of task IDs to task definitions
    for (const task of workflow.tasks) {
      taskMap.set(task.id, task);
    }
    
    // Check for missing dependencies
    for (const task of workflow.tasks) {
      if (task.dependencies) {
        for (const dependencyId of task.dependencies) {
          if (!taskMap.has(dependencyId)) {
            throw new MissingDependencyError(task.id, dependencyId);
          }
        }
      }
    }
    
    // Check for circular dependencies
    this.detectCircularDependencies(workflow);
  }
  
  /**
   * Detects circular dependencies in a workflow
   * @param workflow The workflow definition to check
   * @throws {CircularDependencyError} If a circular dependency is detected
   */
  private detectCircularDependencies(workflow: WorkflowDefinition): void {
    // Build adjacency list
    const adjacencyList = new Map<TaskId, TaskId[]>();
    
    for (const task of workflow.tasks) {
      adjacencyList.set(task.id, task.dependencies || []);
    }
    
    // Track visited nodes and recursion stack
    const visited = new Set<TaskId>();
    const recursionStack = new Set<TaskId>();
    const recursionPath: TaskId[] = [];
    
    // DFS to detect cycles
    const dfs = (taskId: TaskId): boolean => {
      // If already in recursion stack, we found a cycle
      if (recursionStack.has(taskId)) {
        // Find the start of the cycle in the recursion path
        const cycleStartIndex = recursionPath.lastIndexOf(taskId);
        const cycle = recursionPath.slice(cycleStartIndex).concat(taskId);
        throw new CircularDependencyError(cycle);
      }
      
      // If already visited and not in recursion stack, no cycle through this node
      if (visited.has(taskId)) {
        return false;
      }
      
      // Mark as visited and add to recursion stack
      visited.add(taskId);
      recursionStack.add(taskId);
      recursionPath.push(taskId);
      
      // Visit all dependencies
      const dependencies = adjacencyList.get(taskId) || [];
      for (const dependencyId of dependencies) {
        if (dfs(dependencyId)) {
          return true;
        }
      }
      
      // Remove from recursion stack
      recursionStack.delete(taskId);
      recursionPath.pop();
      
      return false;
    };
    
    // Start DFS from each unvisited node
    for (const task of workflow.tasks) {
      if (!visited.has(task.id)) {
        dfs(task.id);
      }
    }
  }
  
  /**
   * Sorts tasks in topological order (dependency-first)
   * @param workflow The workflow definition to sort
   * @returns Array of task IDs in topological order
   */
  public getTopologicalOrder(workflow: WorkflowDefinition): TaskId[] {
    // Validate dependencies first
    this.validateDependencies(workflow);
    
    // Build adjacency list and in-degree count
    const adjacencyList = new Map<TaskId, TaskId[]>();
    const inDegree = new Map<TaskId, number>();
    
    // Initialize
    for (const task of workflow.tasks) {
      adjacencyList.set(task.id, []);
      inDegree.set(task.id, 0);
    }
    
    // Build the graph
    for (const task of workflow.tasks) {
      if (task.dependencies) {
        for (const dependencyId of task.dependencies) {
          // Add edge from dependency to task
          adjacencyList.get(dependencyId)!.push(task.id);
          // Increment in-degree of task
          inDegree.set(task.id, (inDegree.get(task.id) || 0) + 1);
        }
      }
    }
    
    // Queue of nodes with no incoming edges (no dependencies)
    const queue: TaskId[] = [];
    for (const [taskId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(taskId);
      }
    }
    
    // Result array
    const result: TaskId[] = [];
    
    // Process queue
    while (queue.length > 0) {
      const taskId = queue.shift()!;
      result.push(taskId);
      
      // Reduce in-degree of adjacent nodes
      for (const adjacentId of adjacencyList.get(taskId)!) {
        inDegree.set(adjacentId, inDegree.get(adjacentId)! - 1);
        
        // If in-degree becomes 0, add to queue
        if (inDegree.get(adjacentId) === 0) {
          queue.push(adjacentId);
        }
      }
    }
    
    return result;
  }
  
  /**
   * Gets tasks that are ready to execute (all dependencies satisfied)
   * @param workflow The workflow definition
   * @param completedTaskIds Set of completed task IDs
   * @returns Array of task IDs that are ready to execute
   */
  public getReadyTasks(workflow: WorkflowDefinition, completedTaskIds: Set<TaskId>): TaskId[] {
    const readyTasks: TaskId[] = [];
    
    for (const task of workflow.tasks) {
      // Skip tasks that are already completed
      if (completedTaskIds.has(task.id)) {
        continue;
      }
      
      // Check if all dependencies are satisfied
      const dependencies = task.dependencies || [];
      const allDependenciesSatisfied = dependencies.every(depId => completedTaskIds.has(depId));
      
      if (allDependenciesSatisfied) {
        readyTasks.push(task.id);
      }
    }
    
    return readyTasks;
  }
  
  /**
   * Gets the critical path of tasks in a workflow
   * @param workflow The workflow definition
   * @returns Array of task IDs in the critical path
   */
  public getCriticalPath(workflow: WorkflowDefinition): TaskId[] {
    // Build a directed acyclic graph (DAG)
    const graph = new Map<TaskId, { task: TaskDefinition; edges: TaskId[] }>();
    
    // Initialize graph
    for (const task of workflow.tasks) {
      graph.set(task.id, { task, edges: [] });
    }
    
    // Add edges
    for (const task of workflow.tasks) {
      if (task.dependencies) {
        for (const depId of task.dependencies) {
          graph.get(depId)!.edges.push(task.id);
        }
      }
    }
    
    // Calculate longest path using dynamic programming
    const longestPath = new Map<TaskId, number>();
    const nextInPath = new Map<TaskId, TaskId | null>();
    
    // Topological sort
    const order = this.getTopologicalOrder(workflow);
    
    // Initialize longest paths
    for (const taskId of order) {
      longestPath.set(taskId, 0);
      nextInPath.set(taskId, null);
    }
    
    // Calculate longest path for each node
    for (const taskId of order) {
      const node = graph.get(taskId)!;
      
      for (const nextId of node.edges) {
        const currentLength = longestPath.get(taskId)! + 1;
        
        if (currentLength > longestPath.get(nextId)!) {
          longestPath.set(nextId, currentLength);
          nextInPath.set(nextId, taskId);
        }
      }
    }
    
    // Find the end of the critical path (node with maximum longest path)
    let maxLength = -1;
    let endNode: TaskId | null = null;
    
    for (const [taskId, length] of longestPath.entries()) {
      if (length > maxLength) {
        maxLength = length;
        endNode = taskId;
      }
    }
    
    // Reconstruct the critical path
    const criticalPath: TaskId[] = [];
    let current = endNode;
    
    while (current !== null) {
      criticalPath.unshift(current);
      current = nextInPath.get(current)!;
    }
    
    return criticalPath;
  }
}

