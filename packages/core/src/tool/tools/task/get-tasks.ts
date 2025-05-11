import { z } from "zod";
import { createTool } from "../../index";
import { ToolCategory } from "../../registry/types";
import { TaskStatus, TaskPriority } from "./add-task";

/**
 * Result of getting tasks
 */
export interface GetTasksResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * List of tasks
   */
  tasks?: Array<{
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dependencies: string[];
    subtasks: any[];
    details?: string;
    testStrategy?: string;
  }>;
  
  /**
   * Error message if the operation failed
   */
  error?: string;
  
  /**
   * Total number of tasks
   */
  count?: number;
}

/**
 * Tool for getting all tasks
 */
export const GetTasksTool = createTool({
  name: "get_tasks",
  description: `- Gets all tasks from the task list
- Can filter by status, priority, or dependencies
- Can sort by various criteria
- Use this tool to view and analyze tasks

Usage notes:
- Use status to filter by task status
- Use priority to filter by task priority
- Use dependsOn to filter by dependencies
- Use sort to sort the results
- Returns a list of tasks matching the criteria`,
  category: ToolCategory.TASK_MANAGEMENT,
  source: "swarmMCP",
  parameters: z.object({
    status: z.enum([
      TaskStatus.TODO,
      TaskStatus.IN_PROGRESS,
      TaskStatus.BLOCKED,
      TaskStatus.DONE,
      TaskStatus.CANCELLED,
    ]).optional().describe("Filter by task status"),
    priority: z.enum([
      TaskPriority.LOW,
      TaskPriority.MEDIUM,
      TaskPriority.HIGH,
    ]).optional().describe("Filter by task priority"),
    dependsOn: z.string().optional().describe("Filter by tasks that depend on this task ID"),
    sort: z.enum(["id", "title", "status", "priority"]).optional().describe("Sort criteria"),
    reverse: z.boolean().optional().describe("Whether to reverse the sort order"),
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
      
      // Get tasks
      const result = await taskManager.getTasks({
        status: args.status,
        priority: args.priority,
        dependsOn: args.dependsOn,
        sort: args.sort,
        reverse: args.reverse,
        projectRoot: args.projectRoot,
      });
      
      if (result.success) {
        return {
          success: true,
          tasks: result.tasks,
          count: result.tasks.length,
        };
      } else {
        return {
          success: false,
          error: result.error || "Failed to get tasks",
        };
      }
    } catch (error) {
      if (context && (context as any).logger) {
        (context as any).logger.error(`Error getting tasks: ${(error as Error).message}`);
      } else {
        console.error(`Error getting tasks: ${(error as Error).message}`);
      }
      
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

