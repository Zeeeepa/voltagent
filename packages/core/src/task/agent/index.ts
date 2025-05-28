/**
 * Task management integration with the agent system
 */

import { EventEmitter } from 'events';
import { TaskManager } from '../manager';
import { Task, TaskStatus } from '../types';
import { CHECKPOINT_READY_EVENT } from '../../events';

// Task agent events
export const TASK_ASSIGNED_EVENT = 'task:assigned';
export const TASK_STARTED_EVENT = 'task:started';
export const TASK_COMPLETED_EVENT = 'task:completed';
export const TASK_FAILED_EVENT = 'task:failed';

export interface TaskAgentIntegrationOptions {
  taskManager: TaskManager;
  events: EventEmitter;
}

/**
 * TaskAgentIntegration class for integrating tasks with agents
 */
export class TaskAgentIntegration {
  private taskManager: TaskManager;
  private events: EventEmitter;

  constructor(options: TaskAgentIntegrationOptions) {
    this.taskManager = options.taskManager;
    this.events = options.events;

    // Listen for checkpoint events to associate with tasks
    this.events.on(CHECKPOINT_READY_EVENT, this.handleCheckpointReady.bind(this));
  }

  /**
   * Handle checkpoint ready event
   */
  private async handleCheckpointReady(data: { checkpointId: string; agentId: string }) {
    try {
      // Find tasks assigned to this agent
      const tasksResult = await this.taskManager.getTasks();
      
      if (!tasksResult.success || !tasksResult.data) {
        console.error('Failed to get tasks for checkpoint association');
        return;
      }
      
      const tasks = tasksResult.data;
      const agentTasks = tasks.filter(task => task.agentId === data.agentId);
      
      // Associate the checkpoint with the agent's active tasks
      for (const task of agentTasks) {
        if (task.status === 'in-progress') {
          await this.taskManager.associateTaskWithCheckpoint(task.id, data.checkpointId);
        }
      }
    } catch (error) {
      console.error('Error handling checkpoint ready event:', error);
    }
  }

  /**
   * Assign a task to an agent
   */
  async assignTaskToAgent(taskId: number, agentId: string): Promise<void> {
    const result = await this.taskManager.assignTaskToAgent(taskId, agentId);
    
    if (result.success) {
      // Emit task assigned event
      this.events.emit(TASK_ASSIGNED_EVENT, { 
        taskId, 
        agentId,
        task: result.data 
      });
    } else {
      throw new Error(`Failed to assign task ${taskId} to agent ${agentId}: ${result.error?.message}`);
    }
  }

  /**
   * Start a task
   */
  async startTask(taskId: number, agentId: string): Promise<void> {
    const result = await this.taskManager.setTaskStatus(taskId, 'in-progress');
    
    if (result.success) {
      // Emit task started event
      this.events.emit(TASK_STARTED_EVENT, { 
        taskId, 
        agentId,
        task: result.data 
      });
    } else {
      throw new Error(`Failed to start task ${taskId}: ${result.error?.message}`);
    }
  }

  /**
   * Complete a task
   */
  async completeTask(taskId: number, agentId: string): Promise<void> {
    const result = await this.taskManager.setTaskStatus(taskId, 'done');
    
    if (result.success) {
      // Emit task completed event
      this.events.emit(TASK_COMPLETED_EVENT, { 
        taskId, 
        agentId,
        task: result.data 
      });
    } else {
      throw new Error(`Failed to complete task ${taskId}: ${result.error?.message}`);
    }
  }

  /**
   * Fail a task
   */
  async failTask(taskId: number, agentId: string, reason: string): Promise<void> {
    // We don't have a 'failed' status, so we'll use 'deferred' and add the reason to the details
    const taskResult = await this.taskManager.getTask(taskId);
    
    if (!taskResult.success || !taskResult.data) {
      throw new Error(`Failed to get task ${taskId}: ${taskResult.error?.message}`);
    }
    
    const task = taskResult.data;
    const details = `${task.details || ''}\n\nFailed: ${reason}`;
    
    const result = await this.taskManager.updateTask(taskId, {
      status: 'deferred',
      details
    });
    
    if (result.success) {
      // Emit task failed event
      this.events.emit(TASK_FAILED_EVENT, { 
        taskId, 
        agentId,
        reason,
        task: result.data 
      });
    } else {
      throw new Error(`Failed to mark task ${taskId} as failed: ${result.error?.message}`);
    }
  }

  /**
   * Find the next task for an agent
   */
  async findNextTaskForAgent(agentId: string): Promise<Task | null> {
    const result = await this.taskManager.findNextTask();
    
    if (result.success && result.data) {
      // Assign the task to the agent
      await this.assignTaskToAgent(result.data.id, agentId);
      return result.data;
    }
    
    return null;
  }

  /**
   * Get tasks assigned to an agent
   */
  async getTasksForAgent(agentId: string): Promise<Task[]> {
    const result = await this.taskManager.getTasks();
    
    if (result.success && result.data) {
      return result.data.filter(task => task.agentId === agentId);
    }
    
    return [];
  }

  /**
   * Get active task for an agent
   */
  async getActiveTaskForAgent(agentId: string): Promise<Task | null> {
    const tasks = await this.getTasksForAgent(agentId);
    const activeTask = tasks.find(task => task.status === 'in-progress');
    
    return activeTask || null;
  }
}

