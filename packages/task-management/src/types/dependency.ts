/**
 * Dependency types for the task management system
 */

/**
 * Represents a dependency type
 */
export enum DependencyType {
  /**
   * Task must be completed before the dependent task can start
   */
  BLOCKS = 'blocks',

  /**
   * Task is related to the dependent task but doesn't block it
   */
  RELATES_TO = 'relates_to',

  /**
   * Task is a duplicate of the dependent task
   */
  DUPLICATES = 'duplicates',

  /**
   * Task is a prerequisite for the dependent task
   */
  REQUIRES = 'requires'
}

/**
 * Represents a task dependency
 */
export interface TaskDependency {
  /**
   * ID of the task that this task depends on
   */
  taskId: string;

  /**
   * Type of dependency
   */
  type: DependencyType;

  /**
   * Optional description of the dependency
   */
  description?: string;
}

