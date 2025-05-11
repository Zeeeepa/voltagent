/**
 * Task Management Tools
 * 
 * Tools for integrating the task management system with the agent's tool registry
 */

import { z } from 'zod';
import { 
  addTaskDirect, 
  listTasksDirect, 
  getCacheStatsDirect 
} from '../core/task-master-core';
import { DirectFunctionArgs, Logger } from '../types';

/**
 * Create a default logger that logs to console
 * @returns Logger instance
 */
function createDefaultLogger(): Logger {
  return {
    info: (message: string) => console.info(`[INFO] ${message}`),
    warn: (message: string) => console.warn(`[WARN] ${message}`),
    error: (message: string) => console.error(`[ERROR] ${message}`)
  };
}

/**
 * Create task management tools for the agent's tool registry
 * @param tasksJsonPath - Path to the tasks.json file
 * @returns Object containing task management tools
 */
export function createTaskManagementTools(tasksJsonPath: string) {
  const logger = createDefaultLogger();
  
  return {
    /**
     * List tasks tool
     */
    listTasks: {
      description: 'List tasks from the task management system',
      schema: z.object({
        status: z.enum(['todo', 'in_progress', 'done', 'blocked', 'all']).optional().describe('Filter tasks by status'),
        withSubtasks: z.boolean().optional().describe('Include subtasks in the results')
      }),
      execute: async ({ status, withSubtasks }: { status?: string; withSubtasks?: boolean }) => {
        const args: DirectFunctionArgs = {
          tasksJsonPath,
          status: status as any,
          withSubtasks
        };
        
        const result = await listTasksDirect(args, logger);
        
        if (!result.success) {
          throw new Error(`Failed to list tasks: ${result.error?.message}`);
        }
        
        return result.data;
      }
    },
    
    /**
     * Add task tool
     */
    addTask: {
      description: 'Add a new task to the task management system',
      schema: z.object({
        title: z.string().optional().describe('Task title (required if prompt is not provided)'),
        description: z.string().optional().describe('Task description'),
        details: z.string().optional().describe('Implementation details'),
        testStrategy: z.string().optional().describe('Test strategy'),
        prompt: z.string().optional().describe('Prompt for AI to generate task (required if title is not provided)'),
        dependencies: z.array(z.number()).optional().describe('Task dependencies'),
        priority: z.enum(['high', 'medium', 'low']).optional().describe('Task priority')
      }),
      execute: async (params: {
        title?: string;
        description?: string;
        details?: string;
        testStrategy?: string;
        prompt?: string;
        dependencies?: number[];
        priority?: string;
      }) => {
        const args: DirectFunctionArgs = {
          tasksJsonPath,
          ...params,
          priority: params.priority as any
        };
        
        const result = await addTaskDirect(args, logger);
        
        if (!result.success) {
          throw new Error(`Failed to add task: ${result.error?.message}`);
        }
        
        return result.data;
      }
    },
    
    /**
     * Get cache stats tool
     */
    getCacheStats: {
      description: 'Get statistics about the task management cache',
      schema: z.object({}),
      execute: async () => {
        const args: DirectFunctionArgs = {
          tasksJsonPath
        };
        
        const result = await getCacheStatsDirect(args, logger);
        
        if (!result.success) {
          throw new Error(`Failed to get cache stats: ${result.error?.message}`);
        }
        
        return result.data;
      }
    }
    
    // Additional tools will be added as more direct functions are implemented
  };
}

