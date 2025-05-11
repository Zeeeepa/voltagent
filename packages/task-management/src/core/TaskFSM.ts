/**
 * Task Finite State Machine (FSM) implementation
 *
 * This module provides a state machine for managing task status transitions.
 */

import { TaskStatus, StatusTransition, DEFAULT_STATUS_TRANSITIONS } from "../types/status.js";
import { Task } from "../types/task.js";

/**
 * Options for creating a TaskFSM
 */
export interface TaskFSMOptions {
  /**
   * Custom status transitions (optional)
   */
  transitions?: StatusTransition[];
}

/**
 * Task Finite State Machine for managing task status transitions
 */
export class TaskFSM {
  /**
   * Status transitions for the FSM
   */
  private transitions: StatusTransition[];

  /**
   * Create a new TaskFSM
   */
  constructor(options?: TaskFSMOptions) {
    this.transitions = options?.transitions || DEFAULT_STATUS_TRANSITIONS;
  }

  /**
   * Check if a status transition is allowed
   *
   * @param fromStatus - Current status
   * @param toStatus - Target status
   * @param task - Task object (for condition evaluation)
   * @returns Whether the transition is allowed
   */
  public canTransition(fromStatus: TaskStatus, toStatus: TaskStatus, task?: Task): boolean {
    // Find the transition
    const transition = this.transitions.find((t) => t.from === fromStatus && t.to === toStatus);

    // If transition not found or not allowed, return false
    if (!transition || !transition.allowed) {
      return false;
    }

    // If there are conditions and a task is provided, check all conditions
    if (transition.conditions && task) {
      return transition.conditions.every((condition) => condition(task));
    }

    // Transition is allowed with no conditions
    return true;
  }

  /**
   * Perform a status transition
   *
   * @param task - Task to transition
   * @param newStatus - Target status
   * @returns Updated task with new status (or original task if transition not allowed)
   */
  public transition(task: Task, newStatus: TaskStatus): Task {
    if (this.canTransition(task.status, newStatus, task)) {
      return {
        ...task,
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
    }

    // Return original task if transition not allowed
    return task;
  }

  /**
   * Get all possible next statuses for a task
   *
   * @param task - Task to check
   * @returns Array of allowed next statuses
   */
  public getNextPossibleStatuses(task: Task): TaskStatus[] {
    return this.transitions
      .filter((t) => t.from === task.status && t.allowed)
      .filter((t) => !t.conditions || t.conditions.every((condition) => condition(task)))
      .map((t) => t.to);
  }

  /**
   * Add a custom transition
   *
   * @param transition - Transition to add
   */
  public addTransition(transition: StatusTransition): void {
    // Remove any existing transition with the same from/to
    this.transitions = this.transitions.filter(
      (t) => !(t.from === transition.from && t.to === transition.to),
    );

    // Add the new transition
    this.transitions.push(transition);
  }

  /**
   * Get all transitions
   *
   * @returns Array of all transitions
   */
  public getTransitions(): StatusTransition[] {
    return [...this.transitions];
  }
}
