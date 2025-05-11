import { z } from "zod";
import { createTool } from "../../index";
import { ToolCategory } from "../../registry/types";
import { TaskStatus, TaskPriority } from "./add-task";

/**
 * Result of getting a task
 */
export interface GetTaskResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Task data
   */
  task?: {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dependencies: string[];
    subtasks: any[];
    details?: string;
    testStrategy?: string;
  };
  
  /**
   * Error message if the operation failed
   */
  error?: string;
}

/**
 * Tool for getting a specific task
 */
export const GetTaskTool = createTool({
  name: "get_task",
  description: `- Gets a specific task by ID
- Returns all task details including subtasks and dependencies
- Use this tool to view detailed information about a task

Usage notes:
- Provide the task ID to get
- Returns the task with all its details
- Returns an error if the task doesn't exist`,
  category: ToolCategory.TASK_MANAGEMENT,
  source: "swarmMCP",
  parameters: z.object({
    taskId: z.string().describe("ID of the task to get"),
    projectRoot: z.string().describe("The directory of the project. Must be an absolute path."),
  }),
  execute: async (args, context) => {
    try {
      // Get the task manager from context
      const taskManager = (context && (context as any).taskManager) || null;
      
      if (!taskManager) {
        return {
          success: false,
          error: "Task manager not available in context",
        };
      }
      
      // Get the task
      const result = await taskManager.getTask(args.taskId, {
        projectRoot: args.projectRoot,
      });
      
      if (result.success) {
        return {
          success: true,
          task: result.task,
        };
      } else {
        return {
          success: false,
          error: result.error || `Task ${args.taskId} not found`,
        };
      }
    } catch (error) {
      if (context && (context as any).logger) {
        (context as any).logger.error(`Error getting task: ${(error as Error).message}`);
      } else {
        console.error(`Error getting task: ${(error as Error).message}`);
      }
      
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

