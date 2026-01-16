import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createConsolidatedTaskRunner } from '../../src/task/run-task-consolidated';
import { TaskStatus, TaskPriority } from '../../src/task/consolidated/task-manager';

describe('Consolidated Task Management System', () => {
  let taskRunner: ReturnType<typeof createConsolidatedTaskRunner>;

  beforeEach(() => {
    taskRunner = createConsolidatedTaskRunner();
  });

  afterEach(() => {
    taskRunner.shutdown();
  });

  describe('Task Registration and Execution', () => {
    it('should register and execute a task', async () => {
      // Register a task
      taskRunner.registerTask(
        'test-task',
        'Test Task',
        async (data: any) => {
          return data * 2;
        }
      );

      // Execute the task
      const result = await taskRunner.executeTask('test-task', 5);
      
      // Verify the result
      expect(result).toBe(10);
    });

    it('should handle task dependencies', async () => {
      // Create a mock for tracking execution order
      const executionOrder: string[] = [];

      // Register dependent tasks
      taskRunner.registerTask(
        'dependency-task',
        'Dependency Task',
        async () => {
          executionOrder.push('dependency-task');
          return 'dependency-result';
        }
      );

      taskRunner.registerTask(
        'main-task',
        'Main Task',
        async (data: any) => {
          executionOrder.push('main-task');
          return `${data}-processed`;
        },
        {
          dependencies: ['dependency-task']
        }
      );

      // Execute the main task
      const result = await taskRunner.executeTask('main-task', 'dependency-result');
      
      // Verify execution order and result
      expect(executionOrder).toEqual(['dependency-task', 'main-task']);
      expect(result).toBe('dependency-result-processed');
    });

    it('should respect task priorities', async () => {
      // Create a mock for tracking execution order
      const executionOrder: string[] = [];

      // Register tasks with different priorities
      taskRunner.registerTask(
        'low-priority',
        'Low Priority Task',
        async () => {
          executionOrder.push('low-priority');
        },
        { priority: 'low' }
      );

      taskRunner.registerTask(
        'high-priority',
        'High Priority Task',
        async () => {
          executionOrder.push('high-priority');
        },
        { priority: 'high' }
      );

      // Execute tasks simultaneously
      await Promise.all([
        taskRunner.executeTask('low-priority'),
        taskRunner.executeTask('high-priority')
      ]);
      
      // Verify execution order (high priority should be first)
      expect(executionOrder[0]).toBe('high-priority');
      expect(executionOrder[1]).toBe('low-priority');
    });
  });

  describe('Error Handling and Retries', () => {
    it('should retry failed tasks', async () => {
      // Create a mock function that fails on first call
      const mockFn = vi.fn()
        .mockRejectedValueOnce(new Error('Task failed'))
        .mockResolvedValueOnce('success');

      // Register a task with retries
      taskRunner.registerTask(
        'retry-task',
        'Retry Task',
        mockFn,
        { retries: 1 }
      );

      // Execute the task
      const result = await taskRunner.executeTask('retry-task');
      
      // Verify the function was called twice and succeeded
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(result).toBe('success');
    });

    it('should handle task timeouts', async () => {
      // Register a task that takes too long
      taskRunner.registerTask(
        'timeout-task',
        'Timeout Task',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 200));
          return 'completed';
        },
        { timeout: 100 }
      );

      // Execute the task and expect it to timeout
      await expect(taskRunner.executeTask('timeout-task')).rejects.toThrow(/timeout/i);
    });
  });

  describe('Adapters for Backward Compatibility', () => {
    it('should support the original task runner API', async () => {
      const { originalAdapter } = taskRunner;
      
      // Register a task using the original API
      originalAdapter.registerTask('original-task', async (data: any) => {
        return data.value * 3;
      });

      // Execute the task using the original API
      const result = await originalAdapter.runTask('original-task', { value: 5 });
      
      // Verify the result
      expect(result).toBe(15);
    });

    it('should support the new task runner API', async () => {
      const { newAdapter } = taskRunner;
      
      // Register a task using the new API
      newAdapter.addTask('new-task', async (config: any) => {
        return config.value * 4;
      }, { priority: 2 });

      // Execute the task using the new API
      const result = await newAdapter.executeTask('new-task', { value: 5 });
      
      // Verify the result
      expect(result).toBe(20);
    });
  });

  describe('Task Monitoring', () => {
    it('should track task status and metrics', async () => {
      const { taskManager } = taskRunner;
      const { taskMonitor } = taskManager;
      
      // Register a task
      taskRunner.registerTask('monitored-task', 'Monitored Task', async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'done';
      });

      // Execute the task
      await taskRunner.executeTask('monitored-task');
      
      // Get task status and metrics
      const status = taskMonitor.getTaskStatus('monitored-task');
      const metrics = taskMonitor.getTaskMetrics('monitored-task');
      
      // Verify status and metrics
      expect(status).toBe(TaskStatus.COMPLETED);
      expect(metrics?.duration).toBeGreaterThanOrEqual(50);
      
      // Generate a report
      const report = taskMonitor.generateReport();
      
      // Verify report
      expect(report.summary.total).toBe(1);
      expect(report.summary.completed).toBe(1);
    });
  });
});

