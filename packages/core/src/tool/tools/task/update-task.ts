import { z } from "zod";
import { createTool } from "../../index";
import { ToolCategory } from "../../registry/types";
import { TaskStatus, TaskPriority } from "./add-task";

/**
 * Result of updating a task
 */
export interface UpdateTaskResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * ID of the updated task
   */
  taskId?: string;
  
  /**
   * Error message if the operation failed
   */
  error?: string;
  
  /**
   * Updated task data
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
}

/**
 * Tool for updating an existing task
 */
export const UpdateTaskTool = createTool({
  name: "update_task",
  description: `- Updates an existing task
- Can update title, description, status, priority, and other metadata
- Use this tool to modify task details

Usage notes:
- Provide the task ID to update
- Only provide the fields you want to update
- Returns the updated task with all its details`,
  category: ToolCategory.TASK_MANAGEMENT,
  source: "swarmMCP",
  parameters: z.object({
    taskId: z.string().describe("ID of the task to update"),
    title: z.string().optional().describe("New task title"),
    description: z.string().optional().describe("New task description"),
    details: z.string().optional().describe("New implementation details"),
    testStrategy: z.string().optional().describe("New test strategy"),
    status: z.enum([
      TaskStatus.TODO,
      TaskStatus.IN_PROGRESS,
      TaskStatus.BLOCKED,
      TaskStatus.DONE,
      TaskStatus.CANCELLED,
    ]).optional().describe("New task status"),
    priority: z.enum([
      TaskPriority.LOW,
      TaskPriority.MEDIUM,
      TaskPriority.HIGH,
    ]).optional().describe("New task priority"),
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
      
      // Create update data
      const updateData: any = {};
      
      if (args.title !== undefined) updateData.title = args.title;
      if (args.description !== undefined) updateData.description = args.description;
      if (args.details !== undefined) updateData.details = args.details;
      if (args.testStrategy !== undefined) updateData.testStrategy = args.testStrategy;
      if (args.status !== undefined) updateData.status = args.status;
      if (args.priority !== undefined) updateData.priority = args.priority;
      
      // Update the task
      const result = await taskManager.updateTask(args.taskId, updateData, {
        projectRoot: args.projectRoot,
      });
      
      if (result.success) {
        return {
          success: true,
          taskId: args.taskId,
          task: result.task,
        };
      } else {
        return {
          success: false,
          error: result.error || `Failed to update task ${args.taskId}`,
        };
      }
    } catch (error) {
      if (context && (context as any).logger) {
        (context as any).logger.error(`Error updating task: ${(error as Error).message}`);
      } else {
        console.error(`Error updating task: ${(error as Error).message}`);
      }
      
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

