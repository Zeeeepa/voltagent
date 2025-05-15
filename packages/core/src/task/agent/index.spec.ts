/**
 * Task agent integration tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { TaskAgentIntegration, TASK_ASSIGNED_EVENT, TASK_STARTED_EVENT, TASK_COMPLETED_EVENT, TASK_FAILED_EVENT } from './index';
import { TaskManager } from '../manager';
import { CHECKPOINT_READY_EVENT } from '../../events';

// Mock task manager
const mockTaskManager = {
  getTasks: vi.fn(),
  getTask: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  addSubtask: vi.fn(),
  updateSubtask: vi.fn(),
  deleteSubtask: vi.fn(),
  setTaskStatus: vi.fn(),
  setSubtaskStatus: vi.fn(),
  findNextTask: vi.fn(),
  addDependency: vi.fn(),
  removeDependency: vi.fn(),
  validateDependencies: vi.fn(),
  getComplexityReport: vi.fn(),
  saveComplexityReport: vi.fn(),
  assignTaskToAgent: vi.fn(),
  associateTaskWithCheckpoint: vi.fn()
} as unknown as TaskManager;

describe('TaskAgentIntegration', () => {
  let taskAgentIntegration: TaskAgentIntegration;
  let events: EventEmitter;

  beforeEach(() => {
    events = new EventEmitter();
    taskAgentIntegration = new TaskAgentIntegration({
      taskManager: mockTaskManager,
      events
    });

    // Reset mocks
    vi.resetAllMocks();
  });

  it('should assign a task to an agent', async () => {
    const eventSpy = vi.spyOn(events, 'emit');
    
    mockTaskManager.assignTaskToAgent.mockResolvedValue({
      success: true,
      data: {
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        priority: 'medium',
        status: 'pending',
        dependencies: [],
        agentId: 'test-agent'
      }
    });
    
    await taskAgentIntegration.assignTaskToAgent(1, 'test-agent');
    
    expect(mockTaskManager.assignTaskToAgent).toHaveBeenCalledWith(1, 'test-agent');
    expect(eventSpy).toHaveBeenCalledWith(TASK_ASSIGNED_EVENT, expect.objectContaining({
      taskId: 1,
      agentId: 'test-agent'
    }));
  });

  it('should throw an error if assigning a task fails', async () => {
    mockTaskManager.assignTaskToAgent.mockResolvedValue({
      success: false,
      error: {
        code: 'TASK_NOT_FOUND',
        message: 'Task not found'
      }
    });
    
    await expect(taskAgentIntegration.assignTaskToAgent(1, 'test-agent'))
      .rejects.toThrow('Failed to assign task 1 to agent test-agent: Task not found');
  });

  it('should start a task', async () => {
    const eventSpy = vi.spyOn(events, 'emit');
    
    mockTaskManager.setTaskStatus.mockResolvedValue({
      success: true,
      data: {
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        priority: 'medium',
        status: 'in-progress',
        dependencies: [],
        agentId: 'test-agent'
      }
    });
    
    await taskAgentIntegration.startTask(1, 'test-agent');
    
    expect(mockTaskManager.setTaskStatus).toHaveBeenCalledWith(1, 'in-progress');
    expect(eventSpy).toHaveBeenCalledWith(TASK_STARTED_EVENT, expect.objectContaining({
      taskId: 1,
      agentId: 'test-agent'
    }));
  });

  it('should complete a task', async () => {
    const eventSpy = vi.spyOn(events, 'emit');
    
    mockTaskManager.setTaskStatus.mockResolvedValue({
      success: true,
      data: {
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        priority: 'medium',
        status: 'done',
        dependencies: [],
        agentId: 'test-agent'
      }
    });
    
    await taskAgentIntegration.completeTask(1, 'test-agent');
    
    expect(mockTaskManager.setTaskStatus).toHaveBeenCalledWith(1, 'done');
    expect(eventSpy).toHaveBeenCalledWith(TASK_COMPLETED_EVENT, expect.objectContaining({
      taskId: 1,
      agentId: 'test-agent'
    }));
  });

  it('should fail a task', async () => {
    const eventSpy = vi.spyOn(events, 'emit');
    
    mockTaskManager.getTask.mockResolvedValue({
      success: true,
      data: {
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        priority: 'medium',
        status: 'in-progress',
        dependencies: [],
        agentId: 'test-agent',
        details: 'Original details'
      }
    });
    
    mockTaskManager.updateTask.mockResolvedValue({
      success: true,
      data: {
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        priority: 'medium',
        status: 'deferred',
        dependencies: [],
        agentId: 'test-agent',
        details: 'Original details\n\nFailed: Test failure reason'
      }
    });
    
    await taskAgentIntegration.failTask(1, 'test-agent', 'Test failure reason');
    
    expect(mockTaskManager.getTask).toHaveBeenCalledWith(1);
    expect(mockTaskManager.updateTask).toHaveBeenCalledWith(1, {
      status: 'deferred',
      details: 'Original details\n\nFailed: Test failure reason'
    });
    expect(eventSpy).toHaveBeenCalledWith(TASK_FAILED_EVENT, expect.objectContaining({
      taskId: 1,
      agentId: 'test-agent',
      reason: 'Test failure reason'
    }));
  });

  it('should find the next task for an agent', async () => {
    mockTaskManager.findNextTask.mockResolvedValue({
      success: true,
      data: {
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        priority: 'medium',
        status: 'pending',
        dependencies: []
      }
    });
    
    mockTaskManager.assignTaskToAgent.mockResolvedValue({
      success: true,
      data: {
        id: 1,
        title: 'Test Task',
        description: 'Test Description',
        priority: 'medium',
        status: 'pending',
        dependencies: [],
        agentId: 'test-agent'
      }
    });
    
    const task = await taskAgentIntegration.findNextTaskForAgent('test-agent');
    
    expect(mockTaskManager.findNextTask).toHaveBeenCalled();
    expect(mockTaskManager.assignTaskToAgent).toHaveBeenCalledWith(1, 'test-agent');
    expect(task).toBeDefined();
    expect(task?.id).toBe(1);
  });

  it('should return null if no next task is found', async () => {
    mockTaskManager.findNextTask.mockResolvedValue({
      success: false,
      error: {
        code: 'NO_ELIGIBLE_TASKS',
        message: 'No eligible tasks found'
      }
    });
    
    const task = await taskAgentIntegration.findNextTaskForAgent('test-agent');
    
    expect(mockTaskManager.findNextTask).toHaveBeenCalled();
    expect(mockTaskManager.assignTaskToAgent).not.toHaveBeenCalled();
    expect(task).toBeNull();
  });

  it('should get tasks for an agent', async () => {
    mockTaskManager.getTasks.mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          title: 'Task 1',
          description: 'Task 1 Description',
          priority: 'medium',
          status: 'pending',
          dependencies: [],
          agentId: 'test-agent'
        },
        {
          id: 2,
          title: 'Task 2',
          description: 'Task 2 Description',
          priority: 'medium',
          status: 'pending',
          dependencies: [],
          agentId: 'other-agent'
        }
      ]
    });
    
    const tasks = await taskAgentIntegration.getTasksForAgent('test-agent');
    
    expect(mockTaskManager.getTasks).toHaveBeenCalled();
    expect(tasks.length).toBe(1);
    expect(tasks[0].id).toBe(1);
    expect(tasks[0].agentId).toBe('test-agent');
  });

  it('should get active task for an agent', async () => {
    mockTaskManager.getTasks.mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          title: 'Task 1',
          description: 'Task 1 Description',
          priority: 'medium',
          status: 'pending',
          dependencies: [],
          agentId: 'test-agent'
        },
        {
          id: 2,
          title: 'Task 2',
          description: 'Task 2 Description',
          priority: 'medium',
          status: 'in-progress',
          dependencies: [],
          agentId: 'test-agent'
        }
      ]
    });
    
    const task = await taskAgentIntegration.getActiveTaskForAgent('test-agent');
    
    expect(mockTaskManager.getTasks).toHaveBeenCalled();
    expect(task).toBeDefined();
    expect(task?.id).toBe(2);
    expect(task?.status).toBe('in-progress');
  });

  it('should handle checkpoint ready event', async () => {
    // Mock console.error to prevent test output pollution
    const originalConsoleError = console.error;
    console.error = vi.fn();
    
    mockTaskManager.getTasks.mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          title: 'Task 1',
          description: 'Task 1 Description',
          priority: 'medium',
          status: 'in-progress',
          dependencies: [],
          agentId: 'test-agent'
        },
        {
          id: 2,
          title: 'Task 2',
          description: 'Task 2 Description',
          priority: 'pending',
          dependencies: [],
          agentId: 'test-agent'
        }
      ]
    });
    
    mockTaskManager.associateTaskWithCheckpoint.mockResolvedValue({
      success: true,
      data: {
        id: 1,
        title: 'Task 1',
        description: 'Task 1 Description',
        priority: 'medium',
        status: 'in-progress',
        dependencies: [],
        agentId: 'test-agent',
        checkpointId: 'test-checkpoint'
      }
    });
    
    // Emit checkpoint ready event
    events.emit(CHECKPOINT_READY_EVENT, {
      checkpointId: 'test-checkpoint',
      agentId: 'test-agent'
    });
    
    // Wait for async event handler to complete
    await new Promise(resolve => setTimeout(resolve, 0));
    
    expect(mockTaskManager.getTasks).toHaveBeenCalled();
    expect(mockTaskManager.associateTaskWithCheckpoint).toHaveBeenCalledWith(1, 'test-checkpoint');
    expect(mockTaskManager.associateTaskWithCheckpoint).not.toHaveBeenCalledWith(2, 'test-checkpoint');
    
    // Restore console.error
    console.error = originalConsoleError;
  });
});

