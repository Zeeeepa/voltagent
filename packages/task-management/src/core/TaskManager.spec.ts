/**
 * Tests for TaskManager
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TaskManager } from './TaskManager';
import { TaskStatus } from '../types/status';
import { DependencyType } from '../types/dependency';

describe('TaskManager', () => {
  let taskManager: TaskManager;

  beforeEach(() => {
    taskManager = new TaskManager();
  });

  it('should create a task', async () => {
    const task = await taskManager.createTask({
      title: 'Test Task',
      description: 'This is a test task',
    });

    expect(task).toBeDefined();
    expect(task.id).toBeDefined();
    expect(task.title).toBe('Test Task');
    expect(task.description).toBe('This is a test task');
    expect(task.status).toBe(TaskStatus.BACKLOG);
    expect(task.priority).toBe(3);
    expect(task.complexity).toBe(3);
    expect(task.dependencies).toEqual([]);
    expect(task.subtasks).toEqual([]);
    expect(task.createdAt).toBeDefined();
    expect(task.updatedAt).toBeDefined();
  });

  it('should get a task by ID', async () => {
    const task = await taskManager.createTask({
      title: 'Test Task',
      description: 'This is a test task',
    });

    const retrievedTask = taskManager.getTaskById(task.id);
    expect(retrievedTask).toBeDefined();
    expect(retrievedTask?.id).toBe(task.id);
  });

  it('should update a task', async () => {
    const task = await taskManager.createTask({
      title: 'Test Task',
      description: 'This is a test task',
    });

    const updatedTask = await taskManager.updateTask(task.id, {
      title: 'Updated Task',
      description: 'This is an updated task',
      priority: 1,
    });

    expect(updatedTask).toBeDefined();
    expect(updatedTask?.title).toBe('Updated Task');
    expect(updatedTask?.description).toBe('This is an updated task');
    expect(updatedTask?.priority).toBe(1);
  });

  it('should delete a task', async () => {
    const task = await taskManager.createTask({
      title: 'Test Task',
      description: 'This is a test task',
    });

    const deleted = await taskManager.deleteTask(task.id);
    expect(deleted).toBe(true);

    const retrievedTask = taskManager.getTaskById(task.id);
    expect(retrievedTask).toBeUndefined();
  });

  it('should add a dependency between tasks', async () => {
    const task1 = await taskManager.createTask({
      title: 'Task 1',
      description: 'This is task 1',
    });

    const task2 = await taskManager.createTask({
      title: 'Task 2',
      description: 'This is task 2',
    });

    const updatedTask = await taskManager.addDependency(
      task2.id,
      task1.id,
      DependencyType.BLOCKS,
      'Task 1 blocks Task 2'
    );

    expect(updatedTask).toBeDefined();
    expect(updatedTask?.dependencies).toHaveLength(1);
    expect(updatedTask?.dependencies[0].taskId).toBe(task1.id);
    expect(updatedTask?.dependencies[0].type).toBe(DependencyType.BLOCKS);
    expect(updatedTask?.dependencies[0].description).toBe('Task 1 blocks Task 2');
  });

  it('should remove a dependency between tasks', async () => {
    const task1 = await taskManager.createTask({
      title: 'Task 1',
      description: 'This is task 1',
    });

    const task2 = await taskManager.createTask({
      title: 'Task 2',
      description: 'This is task 2',
    });

    await taskManager.addDependency(
      task2.id,
      task1.id,
      DependencyType.BLOCKS,
      'Task 1 blocks Task 2'
    );

    const updatedTask = await taskManager.removeDependency(task2.id, task1.id);
    expect(updatedTask).toBeDefined();
    expect(updatedTask?.dependencies).toHaveLength(0);
  });

  it('should transition a task status', async () => {
    const task = await taskManager.createTask({
      title: 'Test Task',
      description: 'This is a test task',
    });

    const updatedTask = await taskManager.transitionTaskStatus(task.id, TaskStatus.READY);
    expect(updatedTask).toBeDefined();
    expect(updatedTask?.status).toBe(TaskStatus.READY);
  });

  it('should assign a task to an agent', async () => {
    const task = await taskManager.createTask({
      title: 'Test Task',
      description: 'This is a test task',
    });

    const updatedTask = await taskManager.assignTask(task.id, 'agent-1');
    expect(updatedTask).toBeDefined();
    expect(updatedTask?.assignedTo).toBe('agent-1');
  });

  it('should unassign a task', async () => {
    const task = await taskManager.createTask({
      title: 'Test Task',
      description: 'This is a test task',
      assignedTo: 'agent-1',
    });

    const updatedTask = await taskManager.unassignTask(task.id);
    expect(updatedTask).toBeDefined();
    expect(updatedTask?.assignedTo).toBeUndefined();
  });

  it('should get tasks by status', async () => {
    await taskManager.createTask({
      title: 'Task 1',
      description: 'This is task 1',
    });

    const task2 = await taskManager.createTask({
      title: 'Task 2',
      description: 'This is task 2',
    });

    await taskManager.transitionTaskStatus(task2.id, TaskStatus.READY);

    const backlogTasks = taskManager.getTasksByStatus(TaskStatus.BACKLOG);
    expect(backlogTasks).toHaveLength(1);
    expect(backlogTasks[0].title).toBe('Task 1');

    const readyTasks = taskManager.getTasksByStatus(TaskStatus.READY);
    expect(readyTasks).toHaveLength(1);
    expect(readyTasks[0].title).toBe('Task 2');
  });

  it('should get tasks by assignee', async () => {
    const task1 = await taskManager.createTask({
      title: 'Task 1',
      description: 'This is task 1',
    });

    const task2 = await taskManager.createTask({
      title: 'Task 2',
      description: 'This is task 2',
    });

    await taskManager.assignTask(task1.id, 'agent-1');
    await taskManager.assignTask(task2.id, 'agent-2');

    const agent1Tasks = taskManager.getTasksByAssignee('agent-1');
    expect(agent1Tasks).toHaveLength(1);
    expect(agent1Tasks[0].title).toBe('Task 1');

    const agent2Tasks = taskManager.getTasksByAssignee('agent-2');
    expect(agent2Tasks).toHaveLength(1);
    expect(agent2Tasks[0].title).toBe('Task 2');
  });

  it('should get the next available task', async () => {
    await taskManager.createTask({
      title: 'Task 1',
      description: 'This is task 1',
    });

    const task2 = await taskManager.createTask({
      title: 'Task 2',
      description: 'This is task 2',
      priority: 1, // Higher priority
    });

    await taskManager.transitionTaskStatus(task2.id, TaskStatus.READY);

    const nextTask = taskManager.getNextAvailableTask();
    expect(nextTask).toBeDefined();
    expect(nextTask?.title).toBe('Task 2');
  });
});

