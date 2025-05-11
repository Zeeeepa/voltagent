/**
 * Utility functions for working with tasks
 */

import { Task } from '../types/task';
import { TaskStatus } from '../types/status';
import { DependencyType } from '../types/dependency';

/**
 * Check if a task is blocked by its dependencies
 * 
 * @param task - Task to check
 * @param allTasks - All tasks in the system
 * @returns Whether the task is blocked
 */
export function isTaskBlockedByDependencies(task: Task, allTasks: Task[]): boolean {
  // If the task has no dependencies, it's not blocked
  if (task.dependencies.length === 0) {
    return false;
  }

  // Check each dependency
  for (const dependency of task.dependencies) {
    // Only check BLOCKS and REQUIRES dependencies
    if (
      dependency.type !== DependencyType.BLOCKS &&
      dependency.type !== DependencyType.REQUIRES
    ) {
      continue;
    }

    // Find the dependency task
    const dependencyTask = allTasks.find((t) => t.id === dependency.taskId);
    if (!dependencyTask) {
      // If the dependency task doesn't exist, consider it not blocking
      continue;
    }

    // If the dependency task is not completed, the task is blocked
    if (dependencyTask.status !== TaskStatus.COMPLETED) {
      return true;
    }
  }

  // No blocking dependencies found
  return false;
}

/**
 * Get all tasks that depend on a given task
 * 
 * @param taskId - ID of the task
 * @param allTasks - All tasks in the system
 * @returns Array of tasks that depend on the given task
 */
export function getDependentTasks(taskId: string, allTasks: Task[]): Task[] {
  return allTasks.filter((task) =>
    task.dependencies.some((dep) => dep.taskId === taskId)
  );
}

/**
 * Get all tasks that a given task depends on
 * 
 * @param task - Task to check
 * @param allTasks - All tasks in the system
 * @returns Array of tasks that the given task depends on
 */
export function getDependencyTasks(task: Task, allTasks: Task[]): Task[] {
  return task.dependencies
    .map((dep) => allTasks.find((t) => t.id === dep.taskId))
    .filter((t): t is Task => t !== undefined);
}

/**
 * Calculate the completion percentage of a task
 * 
 * @param task - Task to calculate completion for
 * @returns Completion percentage (0-100)
 */
export function calculateTaskCompletion(task: Task): number {
  // If the task is completed, it's 100% complete
  if (task.status === TaskStatus.COMPLETED) {
    return 100;
  }

  // If the task has no subtasks, use status-based completion
  if (task.subtasks.length === 0) {
    switch (task.status) {
      case TaskStatus.BACKLOG:
        return 0;
      case TaskStatus.READY:
        return 10;
      case TaskStatus.IN_PROGRESS:
        return 50;
      case TaskStatus.BLOCKED:
        return 30;
      case TaskStatus.REVIEW:
        return 80;
      case TaskStatus.CANCELLED:
        return 0;
      default:
        return 0;
    }
  }

  // If the task has subtasks, calculate based on subtask completion
  const completedSubtasks = task.subtasks.filter(
    (subtask) => subtask.status === TaskStatus.COMPLETED
  ).length;

  return Math.round((completedSubtasks / task.subtasks.length) * 100);
}

/**
 * Sort tasks by priority
 * 
 * @param tasks - Tasks to sort
 * @returns Sorted tasks (highest priority first)
 */
export function sortTasksByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => a.priority - b.priority);
}

/**
 * Sort tasks by status
 * 
 * @param tasks - Tasks to sort
 * @returns Sorted tasks
 */
export function sortTasksByStatus(tasks: Task[]): Task[] {
  const statusOrder: Record<TaskStatus, number> = {
    [TaskStatus.IN_PROGRESS]: 1,
    [TaskStatus.REVIEW]: 2,
    [TaskStatus.READY]: 3,
    [TaskStatus.BLOCKED]: 4,
    [TaskStatus.BACKLOG]: 5,
    [TaskStatus.COMPLETED]: 6,
    [TaskStatus.CANCELLED]: 7,
  };

  return [...tasks].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
}

/**
 * Find the critical path of tasks
 * 
 * @param tasks - All tasks in the system
 * @returns Array of tasks in the critical path
 */
export function findCriticalPath(tasks: Task[]): Task[] {
  // Create a dependency graph
  const graph: Record<string, string[]> = {};
  
  // Initialize the graph
  tasks.forEach((task) => {
    graph[task.id] = [];
  });
  
  // Add dependencies to the graph
  tasks.forEach((task) => {
    task.dependencies.forEach((dep) => {
      if (dep.type === DependencyType.BLOCKS || dep.type === DependencyType.REQUIRES) {
        graph[dep.taskId].push(task.id);
      }
    });
  });
  
  // Find tasks with no dependencies (entry points)
  const entryPoints = tasks.filter((task) => task.dependencies.length === 0);
  
  // Find tasks with no dependents (exit points)
  const exitPoints = tasks.filter((task) => {
    return !Object.values(graph).some((deps) => deps.includes(task.id));
  });
  
  // Find the longest path from each entry point to each exit point
  let longestPath: string[] = [];
  
  entryPoints.forEach((entry) => {
    exitPoints.forEach((exit) => {
      const path = findLongestPath(graph, entry.id, exit.id);
      if (path.length > longestPath.length) {
        longestPath = path;
      }
    });
  });
  
  // Convert the path of IDs back to tasks
  return longestPath.map((id) => tasks.find((task) => task.id === id)!)
    .filter((task): task is Task => task !== undefined);
}

/**
 * Find the longest path between two nodes in a graph
 * 
 * @param graph - Dependency graph
 * @param start - Start node ID
 * @param end - End node ID
 * @returns Array of node IDs in the longest path
 */
function findLongestPath(
  graph: Record<string, string[]>,
  start: string,
  end: string
): string[] {
  // If start and end are the same, return a path with just that node
  if (start === end) {
    return [start];
  }
  
  // Initialize distances and paths
  const distances: Record<string, number> = {};
  const paths: Record<string, string[]> = {};
  const visited: Record<string, boolean> = {};
  
  // Initialize all distances to -Infinity
  Object.keys(graph).forEach((node) => {
    distances[node] = -Infinity;
    paths[node] = [];
    visited[node] = false;
  });
  
  // Distance to start is 0
  distances[start] = 0;
  paths[start] = [start];
  
  // Topological sort
  const sorted: string[] = [];
  const visit = (node: string) => {
    if (visited[node]) {
      return;
    }
    visited[node] = true;
    graph[node].forEach((neighbor) => {
      visit(neighbor);
    });
    sorted.unshift(node);
  };
  
  // Visit all nodes
  Object.keys(graph).forEach((node) => {
    if (!visited[node]) {
      visit(node);
    }
  });
  
  // Process nodes in topological order
  sorted.forEach((node) => {
    graph[node].forEach((neighbor) => {
      if (distances[node] !== -Infinity && distances[node] + 1 > distances[neighbor]) {
        distances[neighbor] = distances[node] + 1;
        paths[neighbor] = [...paths[node], neighbor];
      }
    });
  });
  
  // Return the path to the end node
  return paths[end];
}

