/**
 * Task manager tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { TaskManager, TaskStorageProvider } from './index';
import { TasksData, TaskComplexityReport } from '../types';

// Mock task storage provider
class MockTaskStorage implements TaskStorageProvider {
  private tasksData: TasksData = {
    project: {
      name: 'Test Project',
      version: '1.0.0'
    },
    tasks: [],
    lastUpdated: new Date().toISOString()
  };

  private complexityReport: TaskComplexityReport | null = null;

  async getTasks(): Promise<TasksData> {
    return this.tasksData;
  }

  async saveTasks(tasks: TasksData): Promise<void> {
    this.tasksData = tasks;
  }

  async getComplexityReport(): Promise<TaskComplexityReport | null> {
    return this.complexityReport;
  }

  async saveComplexityReport(report: TaskComplexityReport): Promise<void> {
    this.complexityReport = report;
  }
}

describe('TaskManager', () => {
  let taskManager: TaskManager;
  let mockStorage: MockTaskStorage;
  let events: EventEmitter;

  beforeEach(() => {
    mockStorage = new MockTaskStorage();
    events = new EventEmitter();
    taskManager = new TaskManager({
      storage: mockStorage,
      events
    });
  });

  it('should create a task', async () => {
    const eventSpy = vi.spyOn(events, 'emit');
    
    const result = await taskManager.createTask({
      title: 'Test Task',
      description: 'Test Description',
      priority: 'medium',
      status: 'pending',
      dependencies: []
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.id).toBe(1);
    expect(result.data?.title).toBe('Test Task');
    expect(result.data?.description).toBe('Test Description');
    expect(result.data?.priority).toBe('medium');
    expect(result.data?.status).toBe('pending');
    
    // Check if event was emitted
    expect(eventSpy).toHaveBeenCalledWith('task:created', expect.any(Object));
  });

  it('should get all tasks', async () => {
    // Create a task first
    await taskManager.createTask({
      title: 'Test Task',
      description: 'Test Description',
      priority: 'medium',
      status: 'pending',
      dependencies: []
    });
    
    const result = await taskManager.getTasks();
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.length).toBe(1);
    expect(result.data?.[0].title).toBe('Test Task');
  });

  it('should get a task by ID', async () => {
    // Create a task first
    await taskManager.createTask({
      title: 'Test Task',
      description: 'Test Description',
      priority: 'medium',
      status: 'pending',
      dependencies: []
    });
    
    const result = await taskManager.getTask(1);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.id).toBe(1);
    expect(result.data?.title).toBe('Test Task');
  });

  it('should update a task', async () => {
    const eventSpy = vi.spyOn(events, 'emit');
    
    // Create a task first
    await taskManager.createTask({
      title: 'Test Task',
      description: 'Test Description',
      priority: 'medium',
      status: 'pending',
      dependencies: []
    });
    
    const result = await taskManager.updateTask(1, {
      title: 'Updated Task',
      priority: 'high'
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.id).toBe(1);
    expect(result.data?.title).toBe('Updated Task');
    expect(result.data?.priority).toBe('high');
    expect(result.data?.description).toBe('Test Description'); // Unchanged
    
    // Check if event was emitted
    expect(eventSpy).toHaveBeenCalledWith('task:updated', expect.any(Object));
  });

  it('should delete a task', async () => {
    const eventSpy = vi.spyOn(events, 'emit');
    
    // Create a task first
    await taskManager.createTask({
      title: 'Test Task',
      description: 'Test Description',
      priority: 'medium',
      status: 'pending',
      dependencies: []
    });
    
    const result = await taskManager.deleteTask(1);
    
    expect(result.success).toBe(true);
    
    // Check if task was deleted
    const tasksResult = await taskManager.getTasks();
    expect(tasksResult.data?.length).toBe(0);
    
    // Check if event was emitted
    expect(eventSpy).toHaveBeenCalledWith('task:deleted', expect.any(Object));
  });

  it('should add a subtask', async () => {
    const eventSpy = vi.spyOn(events, 'emit');
    
    // Create a task first
    await taskManager.createTask({
      title: 'Test Task',
      description: 'Test Description',
      priority: 'medium',
      status: 'pending',
      dependencies: []
    });
    
    const result = await taskManager.addSubtask(1, {
      title: 'Test Subtask',
      description: 'Test Subtask Description',
      status: 'pending',
      dependencies: []
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.id).toBe(1);
    expect(result.data?.title).toBe('Test Subtask');
    
    // Check if subtask was added to the task
    const taskResult = await taskManager.getTask(1);
    expect(taskResult.data?.subtasks?.length).toBe(1);
    expect(taskResult.data?.subtasks?.[0].title).toBe('Test Subtask');
    
    // Check if event was emitted
    expect(eventSpy).toHaveBeenCalledWith('subtask:created', expect.any(Object));
  });

  it('should update a subtask', async () => {
    const eventSpy = vi.spyOn(events, 'emit');
    
    // Create a task first
    await taskManager.createTask({
      title: 'Test Task',
      description: 'Test Description',
      priority: 'medium',
      status: 'pending',
      dependencies: []
    });
    
    // Add a subtask
    await taskManager.addSubtask(1, {
      title: 'Test Subtask',
      description: 'Test Subtask Description',
      status: 'pending',
      dependencies: []
    });
    
    const result = await taskManager.updateSubtask(1, 1, {
      title: 'Updated Subtask',
      status: 'in-progress'
    });
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.id).toBe(1);
    expect(result.data?.title).toBe('Updated Subtask');
    expect(result.data?.status).toBe('in-progress');
    
    // Check if subtask was updated
    const taskResult = await taskManager.getTask(1);
    expect(taskResult.data?.subtasks?.[0].title).toBe('Updated Subtask');
    expect(taskResult.data?.subtasks?.[0].status).toBe('in-progress');
    
    // Check if event was emitted
    expect(eventSpy).toHaveBeenCalledWith('subtask:updated', expect.any(Object));
  });

  it('should delete a subtask', async () => {
    const eventSpy = vi.spyOn(events, 'emit');
    
    // Create a task first
    await taskManager.createTask({
      title: 'Test Task',
      description: 'Test Description',
      priority: 'medium',
      status: 'pending',
      dependencies: []
    });
    
    // Add a subtask
    await taskManager.addSubtask(1, {
      title: 'Test Subtask',
      description: 'Test Subtask Description',
      status: 'pending',
      dependencies: []
    });
    
    const result = await taskManager.deleteSubtask(1, 1);
    
    expect(result.success).toBe(true);
    
    // Check if subtask was deleted
    const taskResult = await taskManager.getTask(1);
    expect(taskResult.data?.subtasks?.length).toBe(0);
    
    // Check if event was emitted
    expect(eventSpy).toHaveBeenCalledWith('subtask:deleted', expect.any(Object));
  });

  it('should set task status', async () => {
    // Create a task first
    await taskManager.createTask({
      title: 'Test Task',
      description: 'Test Description',
      priority: 'medium',
      status: 'pending',
      dependencies: []
    });
    
    const result = await taskManager.setTaskStatus(1, 'in-progress');
    
    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('in-progress');
    
    // Check if status was updated
    const taskResult = await taskManager.getTask(1);
    expect(taskResult.data?.status).toBe('in-progress');
  });

  it('should set subtask status', async () => {
    // Create a task first
    await taskManager.createTask({
      title: 'Test Task',
      description: 'Test Description',
      priority: 'medium',
      status: 'pending',
      dependencies: []
    });
    
    // Add a subtask
    await taskManager.addSubtask(1, {
      title: 'Test Subtask',
      description: 'Test Subtask Description',
      status: 'pending',
      dependencies: []
    });
    
    const result = await taskManager.setSubtaskStatus(1, 1, 'in-progress');
    
    expect(result.success).toBe(true);
    expect(result.data?.status).toBe('in-progress');
    
    // Check if status was updated
    const taskResult = await taskManager.getTask(1);
    expect(taskResult.data?.subtasks?.[0].status).toBe('in-progress');
  });

  it('should add a dependency between tasks', async () => {
    // Create two tasks
    await taskManager.createTask({
      title: 'Task 1',
      description: 'Task 1 Description',
      priority: 'medium',
      status: 'pending',
      dependencies: []
    });
    
    await taskManager.createTask({
      title: 'Task 2',
      description: 'Task 2 Description',
      priority: 'medium',
      status: 'pending',
      dependencies: []
    });
    
    const result = await taskManager.addDependency(2, 1);
    
    expect(result.success).toBe(true);
    expect(result.data?.dependencies).toContain(1);
    
    // Check if dependency was added
    const taskResult = await taskManager.getTask(2);
    expect(taskResult.data?.dependencies).toContain(1);
  });

  it('should remove a dependency between tasks', async () => {
    // Create two tasks
    await taskManager.createTask({
      title: 'Task 1',
      description: 'Task 1 Description',
      priority: 'medium',
      status: 'pending',
      dependencies: []
    });
    
    await taskManager.createTask({
      title: 'Task 2',
      description: 'Task 2 Description',
      priority: 'medium',
      status: 'pending',
      dependencies: [1]
    });
    
    const result = await taskManager.removeDependency(2, 1);
    
    expect(result.success).toBe(true);
    expect(result.data?.dependencies).not.toContain(1);
    
    // Check if dependency was removed
    const taskResult = await taskManager.getTask(2);
    expect(taskResult.data?.dependencies).not.toContain(1);
  });

  it('should find the next task to work on', async () => {
    // Create two tasks
    await taskManager.createTask({
      title: 'Task 1',
      description: 'Task 1 Description',
      priority: 'medium',
      status: 'done',
      dependencies: []
    });
    
    await taskManager.createTask({
      title: 'Task 2',
      description: 'Task 2 Description',
      priority: 'high',
      status: 'pending',
      dependencies: [1]
    });
    
    await taskManager.createTask({
      title: 'Task 3',
      description: 'Task 3 Description',
      priority: 'medium',
      status: 'pending',
      dependencies: [1]
    });
    
    const result = await taskManager.findNextTask();
    
    expect(result.success).toBe(true);
    expect(result.data?.id).toBe(2); // Task 2 has higher priority
  });

  it('should validate dependencies', async () => {
    // Create two tasks
    await taskManager.createTask({
      title: 'Task 1',
      description: 'Task 1 Description',
      priority: 'medium',
      status: 'pending',
      dependencies: []
    });
    
    await taskManager.createTask({
      title: 'Task 2',
      description: 'Task 2 Description',
      priority: 'medium',
      status: 'pending',
      dependencies: [1, 999] // 999 doesn't exist
    });
    
    const result = await taskManager.validateDependencies();
    
    expect(result.success).toBe(true);
    expect(result.data?.valid).toBe(false);
    expect(result.data?.issues.length).toBe(1);
    expect(result.data?.issues[0].taskId).toBe(2);
  });

  it('should associate a task with an agent', async () => {
    // Create a task
    await taskManager.createTask({
      title: 'Test Task',
      description: 'Test Description',
      priority: 'medium',
      status: 'pending',
      dependencies: []
    });
    
    const result = await taskManager.assignTaskToAgent(1, 'test-agent');
    
    expect(result.success).toBe(true);
    expect(result.data?.agentId).toBe('test-agent');
    
    // Check if agent was assigned
    const taskResult = await taskManager.getTask(1);
    expect(taskResult.data?.agentId).toBe('test-agent');
  });

  it('should associate a task with a checkpoint', async () => {
    // Create a task
    await taskManager.createTask({
      title: 'Test Task',
      description: 'Test Description',
      priority: 'medium',
      status: 'pending',
      dependencies: []
    });
    
    const result = await taskManager.associateTaskWithCheckpoint(1, 'test-checkpoint');
    
    expect(result.success).toBe(true);
    expect(result.data?.checkpointId).toBe('test-checkpoint');
    
    // Check if checkpoint was associated
    const taskResult = await taskManager.getTask(1);
    expect(taskResult.data?.checkpointId).toBe('test-checkpoint');
  });
});

