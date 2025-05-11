/**
 * Task status types for the task management system
 */

/**
 * Represents the possible statuses of a task
 */
export enum TaskStatus {
  /**
   * Task is in the backlog, not yet ready to be worked on
   */
  BACKLOG = 'backlog',

  /**
   * Task is ready to be worked on
   */
  READY = 'ready',

  /**
   * Task is currently in progress
   */
  IN_PROGRESS = 'in_progress',

  /**
   * Task is blocked by another task or external factor
   */
  BLOCKED = 'blocked',

  /**
   * Task is under review
   */
  REVIEW = 'review',

  /**
   * Task is completed
   */
  COMPLETED = 'completed',

  /**
   * Task is cancelled
   */
  CANCELLED = 'cancelled'
}

/**
 * Represents a task status transition
 */
export interface StatusTransition {
  /**
   * Current status
   */
  from: TaskStatus;

  /**
   * New status
   */
  to: TaskStatus;

  /**
   * Whether the transition is allowed
   */
  allowed: boolean;

  /**
   * Conditions that must be met for the transition to be allowed
   */
  conditions?: Array<(task: any) => boolean>;
}

/**
 * Default status transitions for tasks
 */
export const DEFAULT_STATUS_TRANSITIONS: StatusTransition[] = [
  // From BACKLOG
  { from: TaskStatus.BACKLOG, to: TaskStatus.READY, allowed: true },
  { from: TaskStatus.BACKLOG, to: TaskStatus.CANCELLED, allowed: true },

  // From READY
  { from: TaskStatus.READY, to: TaskStatus.IN_PROGRESS, allowed: true },
  { from: TaskStatus.READY, to: TaskStatus.BACKLOG, allowed: true },
  { from: TaskStatus.READY, to: TaskStatus.CANCELLED, allowed: true },

  // From IN_PROGRESS
  { from: TaskStatus.IN_PROGRESS, to: TaskStatus.BLOCKED, allowed: true },
  { from: TaskStatus.IN_PROGRESS, to: TaskStatus.REVIEW, allowed: true },
  { from: TaskStatus.IN_PROGRESS, to: TaskStatus.READY, allowed: true },
  { from: TaskStatus.IN_PROGRESS, to: TaskStatus.CANCELLED, allowed: true },

  // From BLOCKED
  { from: TaskStatus.BLOCKED, to: TaskStatus.IN_PROGRESS, allowed: true },
  { from: TaskStatus.BLOCKED, to: TaskStatus.READY, allowed: true },
  { from: TaskStatus.BLOCKED, to: TaskStatus.CANCELLED, allowed: true },

  // From REVIEW
  { from: TaskStatus.REVIEW, to: TaskStatus.COMPLETED, allowed: true },
  { from: TaskStatus.REVIEW, to: TaskStatus.IN_PROGRESS, allowed: true },
  { from: TaskStatus.REVIEW, to: TaskStatus.CANCELLED, allowed: true },

  // From COMPLETED
  { from: TaskStatus.COMPLETED, to: TaskStatus.REVIEW, allowed: true },
  { from: TaskStatus.COMPLETED, to: TaskStatus.IN_PROGRESS, allowed: true },

  // From CANCELLED
  { from: TaskStatus.CANCELLED, to: TaskStatus.BACKLOG, allowed: true },
  { from: TaskStatus.CANCELLED, to: TaskStatus.READY, allowed: true },
];

