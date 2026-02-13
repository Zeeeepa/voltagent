import { TaskManager, TaskPriority } from './consolidated/task-manager';
import { OriginalTaskRunnerAdapter, NewTaskRunnerAdapter } from './consolidated/adapters';

/**
 * Main entry point for the consolidated task management system
 * 
 * @param options Configuration options
 * @returns An object with task management functions
 */
export function createConsolidatedTaskRunner(options: {
  poolSize?: number;
  monitorResources?: boolean;
  autoShutdown?: boolean;
} = {}) {
  // Create the task manager
  const taskManager = new TaskManager();
  
  // Create adapters for backward compatibility
  const originalAdapter = new OriginalTaskRunnerAdapter(taskManager);
  const newAdapter = new NewTaskRunnerAdapter(taskManager);

  return {
    /**
     * The core task manager
     */
    taskManager,
    
    /**
     * Adapter for the original task runner API
     */
    originalAdapter,
    
    /**
     * Adapter for the new task runner API
     */
    newAdapter,
    
    /**
     * Registers a task with the consolidated system
     * 
     * @param id Task ID
     * @param name Task name
     * @param executeFn Task execution function
     * @param config Task configuration
     */
    registerTask(
      id: string,
      name: string,
      executeFn: (...args: any[]) => Promise<any>,
      config: {
        priority?: 'low' | 'medium' | 'high' | 'critical';
        dependencies?: string[];
        retries?: number;
        timeout?: number;
        autoShutdown?: boolean;
      } = {}
    ) {
      // Map string priority to enum
      let priority: TaskPriority;
      switch (config.priority) {
        case 'low': priority = TaskPriority.LOW; break;
        case 'high': priority = TaskPriority.HIGH; break;
        case 'critical': priority = TaskPriority.CRITICAL; break;
        default: priority = TaskPriority.MEDIUM;
      }
      
      taskManager.registerTask({
        id,
        name,
        execute: executeFn,
        config: {
          priority,
          dependencies: config.dependencies,
          retries: config.retries,
          timeout: config.timeout,
          autoShutdown: config.autoShutdown ?? options.autoShutdown
        }
      });
    },
    
    /**
     * Executes a task by ID
     * 
     * @param taskId The ID of the task to execute
     * @param args Arguments to pass to the task
     * @returns The result of the task execution
     */
    executeTask(taskId: string, ...args: any[]) {
      return taskManager.executeTask(taskId, ...args);
    },
    
    /**
     * Shuts down the task runner
     */
    shutdown() {
      taskManager.shutdown();
    }
  };
}

// Export a default instance for quick usage
export default createConsolidatedTaskRunner();

