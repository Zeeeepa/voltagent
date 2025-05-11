/**
 * Tests for TaskFSM
 */

import { describe, it, expect } from 'vitest';
import { TaskFSM } from './TaskFSM';
import { TaskStatus, StatusTransition } from '../types/status';
import { Task } from '../types/task';

describe('TaskFSM', () => {
  it('should allow valid transitions', () => {
    const fsm = new TaskFSM();
    
    // BACKLOG -> READY is allowed
    expect(fsm.canTransition(TaskStatus.BACKLOG, TaskStatus.READY)).toBe(true);
    
    // READY -> IN_PROGRESS is allowed
    expect(fsm.canTransition(TaskStatus.READY, TaskStatus.IN_PROGRESS)).toBe(true);
    
    // IN_PROGRESS -> REVIEW is allowed
    expect(fsm.canTransition(TaskStatus.IN_PROGRESS, TaskStatus.REVIEW)).toBe(true);
    
    // REVIEW -> COMPLETED is allowed
    expect(fsm.canTransition(TaskStatus.REVIEW, TaskStatus.COMPLETED)).toBe(true);
  });
  
  it('should disallow invalid transitions', () => {
    const fsm = new TaskFSM();
    
    // BACKLOG -> COMPLETED is not allowed
    expect(fsm.canTransition(TaskStatus.BACKLOG, TaskStatus.COMPLETED)).toBe(false);
    
    // BACKLOG -> IN_PROGRESS is not allowed
    expect(fsm.canTransition(TaskStatus.BACKLOG, TaskStatus.IN_PROGRESS)).toBe(false);
    
    // READY -> COMPLETED is not allowed
    expect(fsm.canTransition(TaskStatus.READY, TaskStatus.COMPLETED)).toBe(false);
  });
  
  it('should transition a task to a new status', () => {
    const fsm = new TaskFSM();
    
    const task: Task = {
      id: '1',
      title: 'Test Task',
      description: 'This is a test task',
      status: TaskStatus.BACKLOG,
      priority: 3,
      complexity: 3,
      dependencies: [],
      subtasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Transition from BACKLOG to READY
    const updatedTask = fsm.transition(task, TaskStatus.READY);
    expect(updatedTask.status).toBe(TaskStatus.READY);
    
    // Transition from READY to IN_PROGRESS
    const updatedTask2 = fsm.transition(updatedTask, TaskStatus.IN_PROGRESS);
    expect(updatedTask2.status).toBe(TaskStatus.IN_PROGRESS);
  });
  
  it('should not transition a task if the transition is not allowed', () => {
    const fsm = new TaskFSM();
    
    const task: Task = {
      id: '1',
      title: 'Test Task',
      description: 'This is a test task',
      status: TaskStatus.BACKLOG,
      priority: 3,
      complexity: 3,
      dependencies: [],
      subtasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // Attempt to transition from BACKLOG to COMPLETED (not allowed)
    const updatedTask = fsm.transition(task, TaskStatus.COMPLETED);
    expect(updatedTask.status).toBe(TaskStatus.BACKLOG); // Status should not change
  });
  
  it('should get next possible statuses for a task', () => {
    const fsm = new TaskFSM();
    
    const task: Task = {
      id: '1',
      title: 'Test Task',
      description: 'This is a test task',
      status: TaskStatus.BACKLOG,
      priority: 3,
      complexity: 3,
      dependencies: [],
      subtasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const nextStatuses = fsm.getNextPossibleStatuses(task);
    expect(nextStatuses).toContain(TaskStatus.READY);
    expect(nextStatuses).toContain(TaskStatus.CANCELLED);
    expect(nextStatuses).not.toContain(TaskStatus.IN_PROGRESS);
    expect(nextStatuses).not.toContain(TaskStatus.COMPLETED);
  });
  
  it('should add a custom transition', () => {
    const fsm = new TaskFSM();
    
    // Add a custom transition from BACKLOG to IN_PROGRESS
    const customTransition: StatusTransition = {
      from: TaskStatus.BACKLOG,
      to: TaskStatus.IN_PROGRESS,
      allowed: true,
    };
    
    fsm.addTransition(customTransition);
    
    // Now BACKLOG -> IN_PROGRESS should be allowed
    expect(fsm.canTransition(TaskStatus.BACKLOG, TaskStatus.IN_PROGRESS)).toBe(true);
  });
  
  it('should handle transitions with conditions', () => {
    // Create a custom FSM with a conditional transition
    const customTransitions: StatusTransition[] = [
      {
        from: TaskStatus.BACKLOG,
        to: TaskStatus.IN_PROGRESS,
        allowed: true,
        conditions: [
          (task: Task) => task.priority === 1, // Only high priority tasks can go directly to IN_PROGRESS
        ],
      },
    ];
    
    const fsm = new TaskFSM({ transitions: customTransitions });
    
    const highPriorityTask: Task = {
      id: '1',
      title: 'High Priority Task',
      description: 'This is a high priority task',
      status: TaskStatus.BACKLOG,
      priority: 1,
      complexity: 3,
      dependencies: [],
      subtasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const lowPriorityTask: Task = {
      id: '2',
      title: 'Low Priority Task',
      description: 'This is a low priority task',
      status: TaskStatus.BACKLOG,
      priority: 3,
      complexity: 3,
      dependencies: [],
      subtasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    // High priority task should be allowed to transition
    expect(fsm.canTransition(TaskStatus.BACKLOG, TaskStatus.IN_PROGRESS, highPriorityTask)).toBe(true);
    
    // Low priority task should not be allowed to transition
    expect(fsm.canTransition(TaskStatus.BACKLOG, TaskStatus.IN_PROGRESS, lowPriorityTask)).toBe(false);
  });
});

