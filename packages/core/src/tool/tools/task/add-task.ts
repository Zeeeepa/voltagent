import { z } from "zod";
import { createTool } from "../../index";
import { ToolCategory } from "../../registry/types";

/**
 * Task priority levels
 */
export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

/**
 * Task status values
 */
export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  BLOCKED = "blocked",
  DONE = "done",
  CANCELLED = "cancelled",
}

/**
 * Result of adding a task
 */
export interface AddTaskResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * ID of the created task
   */
  taskId?: string;
  
  /**
   * Error message if the operation failed
   */
  error?: string;
  
  /**
   * Created task data
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
 * Tool for adding a new task
 */
export const AddTaskTool = createTool({
  name: "add_task",
  description: `- Adds a new task to the task list
- Can create tasks with title, description, and other metadata
- Can specify dependencies on other tasks
- Can set priority and status
- Use this tool to create new tasks

Usage notes:
- Provide a title and description for the task
- Use prompt for AI-generated task details
- Use dependencies to specify task dependencies
- Use priority to set task importance
- Returns the created task with its ID`,
  category: ToolCategory.TASK_MANAGEMENT,
  source: "swarmMCP",
  parameters: z.object({
    prompt: z.string().optional().describe("Description of the task to add (required if not using manual fields)"),
    title: z.string().optional().describe("Task title (for manual task creation)"),
    description: z.string().optional().describe("Task description (for manual task creation)"),
    details: z.string().optional().describe("Implementation details (for manual task creation)"),
    testStrategy: z.string().optional().describe("Test strategy (for manual task creation)"),
    dependencies: z.string().optional().describe("Comma-separated list of task IDs this task depends on"),
    priority: z.enum([TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH]).optional().describe("Task priority"),
    projectRoot: z.string().describe("The directory of the project. Must be an absolute path."),
    research: z.boolean().optional().describe("Whether to use research capabilities for task creation"),
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
      
      // Process dependencies if provided
      const dependencies = args.dependencies ? args.dependencies.split(",").map(d => d.trim()) : [];
      
      // Create task data
      const taskData: any = {
        title: args.title || "",
        description: args.description || "",
        details: args.details || "",
        testStrategy: args.testStrategy || "",
        dependencies,
        priority: args.priority || TaskPriority.MEDIUM,
        status: TaskStatus.TODO,
      };
      
      // If using prompt, generate task details
      if (args.prompt) {
        // In a real implementation, this would call an AI service to generate task details
        // For now, we'll just use the prompt as the description
        taskData.description = args.prompt;
        taskData.title = args.prompt.split("\n")[0].substring(0, 50) + (args.prompt.length > 50 ? "..." : "");
      }
      
      // Add the task
      const result = await taskManager.addTask(taskData, {
        projectRoot: args.projectRoot,
        research: args.research,
      });
      
      if (result.success) {
        return {
          success: true,
          taskId: result.taskId,
          task: result.task,
        };
      } else {
        return {
          success: false,
          error: result.error || "Failed to add task",
        };
      }
    } catch (error) {
      if (context && (context as any).logger) {
        (context as any).logger.error(`Error adding task: ${(error as Error).message}`);
      } else {
        console.error(`Error adding task: ${(error as Error).message}`);
      }
      
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

