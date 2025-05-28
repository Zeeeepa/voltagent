/**
 * Task management tools for MCP server
 */

import { z } from 'zod';
import { TaskManager } from '../manager';
import { TaskStatus, TaskPriority } from '../types';

// Task status schema
const taskStatusSchema = z.enum(['pending', 'in-progress', 'done', 'deferred']);

// Task priority schema
const taskPrioritySchema = z.enum(['high', 'medium', 'low']);

/**
 * Register task management tools with the MCP server
 * @param server MCP server instance
 * @param taskManager Task manager instance
 */
export function registerTaskTools(server: any, taskManager: TaskManager) {
  // Get all tasks
  server.addTool({
    name: 'get_tasks',
    description: 'Get all tasks, optionally filtering by status',
    parameters: z.object({
      status: taskStatusSchema.optional().describe('Filter tasks by status')
    }),
    execute: async (args: { status?: TaskStatus }) => {
      const result = await taskManager.getTasks({ status: args.status });
      return result;
    }
  });

  // Get a specific task
  server.addTool({
    name: 'get_task',
    description: 'Get a specific task by ID',
    parameters: z.object({
      taskId: z.number().describe('ID of the task to retrieve')
    }),
    execute: async (args: { taskId: number }) => {
      const result = await taskManager.getTask(args.taskId);
      return result;
    }
  });

  // Create a new task
  server.addTool({
    name: 'create_task',
    description: 'Create a new task',
    parameters: z.object({
      title: z.string().describe('Title of the task'),
      description: z.string().describe('Description of the task'),
      priority: taskPrioritySchema.default('medium').describe('Priority of the task'),
      dependencies: z.array(z.number()).optional().describe('IDs of tasks this task depends on'),
      details: z.string().optional().describe('Implementation details for the task'),
      testStrategy: z.string().optional().describe('Test strategy for the task')
    }),
    execute: async (args: {
      title: string;
      description: string;
      priority: TaskPriority;
      dependencies?: number[];
      details?: string;
      testStrategy?: string;
    }) => {
      const result = await taskManager.createTask({
        title: args.title,
        description: args.description,
        priority: args.priority,
        dependencies: args.dependencies || [],
        status: 'pending',
        details: args.details,
        testStrategy: args.testStrategy
      });
      return result;
    }
  });

  // Update a task
  server.addTool({
    name: 'update_task',
    description: 'Update an existing task',
    parameters: z.object({
      taskId: z.number().describe('ID of the task to update'),
      title: z.string().optional().describe('New title for the task'),
      description: z.string().optional().describe('New description for the task'),
      status: taskStatusSchema.optional().describe('New status for the task'),
      priority: taskPrioritySchema.optional().describe('New priority for the task'),
      dependencies: z.array(z.number()).optional().describe('New dependencies for the task'),
      details: z.string().optional().describe('New implementation details for the task'),
      testStrategy: z.string().optional().describe('New test strategy for the task')
    }),
    execute: async (args: {
      taskId: number;
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      dependencies?: number[];
      details?: string;
      testStrategy?: string;
    }) => {
      const updates: Record<string, any> = {};
      
      if (args.title !== undefined) updates.title = args.title;
      if (args.description !== undefined) updates.description = args.description;
      if (args.status !== undefined) updates.status = args.status;
      if (args.priority !== undefined) updates.priority = args.priority;
      if (args.dependencies !== undefined) updates.dependencies = args.dependencies;
      if (args.details !== undefined) updates.details = args.details;
      if (args.testStrategy !== undefined) updates.testStrategy = args.testStrategy;
      
      const result = await taskManager.updateTask(args.taskId, updates);
      return result;
    }
  });

  // Delete a task
  server.addTool({
    name: 'delete_task',
    description: 'Delete a task',
    parameters: z.object({
      taskId: z.number().describe('ID of the task to delete')
    }),
    execute: async (args: { taskId: number }) => {
      const result = await taskManager.deleteTask(args.taskId);
      return result;
    }
  });

  // Add a subtask
  server.addTool({
    name: 'add_subtask',
    description: 'Add a subtask to a task',
    parameters: z.object({
      taskId: z.number().describe('ID of the parent task'),
      title: z.string().describe('Title of the subtask'),
      description: z.string().describe('Description of the subtask'),
      dependencies: z.array(z.number()).optional().describe('IDs of subtasks this subtask depends on'),
      details: z.string().optional().describe('Implementation details for the subtask')
    }),
    execute: async (args: {
      taskId: number;
      title: string;
      description: string;
      dependencies?: number[];
      details?: string;
    }) => {
      const result = await taskManager.addSubtask(args.taskId, {
        title: args.title,
        description: args.description,
        dependencies: args.dependencies || [],
        status: 'pending',
        details: args.details
      });
      return result;
    }
  });

  // Update a subtask
  server.addTool({
    name: 'update_subtask',
    description: 'Update a subtask',
    parameters: z.object({
      taskId: z.number().describe('ID of the parent task'),
      subtaskId: z.number().describe('ID of the subtask to update'),
      title: z.string().optional().describe('New title for the subtask'),
      description: z.string().optional().describe('New description for the subtask'),
      status: taskStatusSchema.optional().describe('New status for the subtask'),
      dependencies: z.array(z.number()).optional().describe('New dependencies for the subtask'),
      details: z.string().optional().describe('New implementation details for the subtask')
    }),
    execute: async (args: {
      taskId: number;
      subtaskId: number;
      title?: string;
      description?: string;
      status?: TaskStatus;
      dependencies?: number[];
      details?: string;
    }) => {
      const updates: Record<string, any> = {};
      
      if (args.title !== undefined) updates.title = args.title;
      if (args.description !== undefined) updates.description = args.description;
      if (args.status !== undefined) updates.status = args.status;
      if (args.dependencies !== undefined) updates.dependencies = args.dependencies;
      if (args.details !== undefined) updates.details = args.details;
      
      const result = await taskManager.updateSubtask(args.taskId, args.subtaskId, updates);
      return result;
    }
  });

  // Delete a subtask
  server.addTool({
    name: 'delete_subtask',
    description: 'Delete a subtask',
    parameters: z.object({
      taskId: z.number().describe('ID of the parent task'),
      subtaskId: z.number().describe('ID of the subtask to delete')
    }),
    execute: async (args: { taskId: number; subtaskId: number }) => {
      const result = await taskManager.deleteSubtask(args.taskId, args.subtaskId);
      return result;
    }
  });

  // Set task status
  server.addTool({
    name: 'set_task_status',
    description: 'Set the status of a task',
    parameters: z.object({
      taskId: z.number().describe('ID of the task'),
      status: taskStatusSchema.describe('New status for the task')
    }),
    execute: async (args: { taskId: number; status: TaskStatus }) => {
      const result = await taskManager.setTaskStatus(args.taskId, args.status);
      return result;
    }
  });

  // Set subtask status
  server.addTool({
    name: 'set_subtask_status',
    description: 'Set the status of a subtask',
    parameters: z.object({
      taskId: z.number().describe('ID of the parent task'),
      subtaskId: z.number().describe('ID of the subtask'),
      status: taskStatusSchema.describe('New status for the subtask')
    }),
    execute: async (args: { taskId: number; subtaskId: number; status: TaskStatus }) => {
      const result = await taskManager.setSubtaskStatus(args.taskId, args.subtaskId, args.status);
      return result;
    }
  });

  // Find next task
  server.addTool({
    name: 'find_next_task',
    description: 'Find the next task to work on based on dependencies and status',
    parameters: z.object({}),
    execute: async () => {
      const result = await taskManager.findNextTask();
      return result;
    }
  });

  // Add dependency
  server.addTool({
    name: 'add_dependency',
    description: 'Add a dependency between tasks',
    parameters: z.object({
      taskId: z.number().describe('ID of the task that depends on another'),
      dependsOnTaskId: z.number().describe('ID of the task that is depended upon')
    }),
    execute: async (args: { taskId: number; dependsOnTaskId: number }) => {
      const result = await taskManager.addDependency(args.taskId, args.dependsOnTaskId);
      return result;
    }
  });

  // Remove dependency
  server.addTool({
    name: 'remove_dependency',
    description: 'Remove a dependency between tasks',
    parameters: z.object({
      taskId: z.number().describe('ID of the task that depends on another'),
      dependsOnTaskId: z.number().describe('ID of the task that is depended upon')
    }),
    execute: async (args: { taskId: number; dependsOnTaskId: number }) => {
      const result = await taskManager.removeDependency(args.taskId, args.dependsOnTaskId);
      return result;
    }
  });

  // Validate dependencies
  server.addTool({
    name: 'validate_dependencies',
    description: 'Validate all task dependencies',
    parameters: z.object({}),
    execute: async () => {
      const result = await taskManager.validateDependencies();
      return result;
    }
  });

  // Get complexity report
  server.addTool({
    name: 'get_complexity_report',
    description: 'Get the complexity report for tasks',
    parameters: z.object({}),
    execute: async () => {
      const result = await taskManager.getComplexityReport();
      return result;
    }
  });

  // Assign task to agent
  server.addTool({
    name: 'assign_task_to_agent',
    description: 'Assign a task to an agent',
    parameters: z.object({
      taskId: z.number().describe('ID of the task to assign'),
      agentId: z.string().describe('ID of the agent to assign the task to')
    }),
    execute: async (args: { taskId: number; agentId: string }) => {
      const result = await taskManager.assignTaskToAgent(args.taskId, args.agentId);
      return result;
    }
  });

  // Associate task with checkpoint
  server.addTool({
    name: 'associate_task_with_checkpoint',
    description: 'Associate a task with a checkpoint',
    parameters: z.object({
      taskId: z.number().describe('ID of the task'),
      checkpointId: z.string().describe('ID of the checkpoint')
    }),
    execute: async (args: { taskId: number; checkpointId: string }) => {
      const result = await taskManager.associateTaskWithCheckpoint(args.taskId, args.checkpointId);
      return result;
    }
  });
}

