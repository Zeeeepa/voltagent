import type { z } from "zod";
import type { BaseTool, ToolExecuteOptions, ToolSchema } from "../../agent/providers/base/types";
import type { AgentTool } from "../index";

/**
 * Categories for tools to classify their purpose and permission requirements
 */
export enum ToolCategory {
  FILE_OPERATION = "file_operation",
  SHELL_EXECUTION = "shell_execution",
  READONLY = "readonly",
  NETWORK = "network",
  TASK_MANAGEMENT = "task_management",
  PROJECT_MANAGEMENT = "project_management",
  ANALYSIS = "analysis",
}

/**
 * Permission level for tools
 */
export enum ToolPermission {
  NONE = "none",
  USER = "user",
  ADMIN = "admin",
}

/**
 * Extended tool options with additional metadata
 */
export interface ExtendedToolOptions<T extends ToolSchema = ToolSchema> {
  /**
   * Unique identifier for the tool
   */
  id?: string;

  /**
   * Name of the tool
   */
  name: string;

  /**
   * Description of the tool
   */
  description: string;

  /**
   * Tool parameter schema
   */
  parameters: T;

  /**
   * Function to execute when the tool is called
   */
  execute: (args: z.infer<T>, options?: ToolExecuteOptions) => Promise<unknown>;

  /**
   * Tool categories for classification
   */
  category?: ToolCategory | ToolCategory[];

  /**
   * Whether the tool requires permission to execute
   */
  requiresPermission?: boolean;

  /**
   * Permission level required to use this tool
   */
  permissionLevel?: ToolPermission;

  /**
   * Whether the tool always requires permission, even in trusted environments
   */
  alwaysRequirePermission?: boolean;

  /**
   * Source repository of the tool
   */
  source?: "serv" | "swarmMCP" | "voltagent" | "custom";
}

/**
 * Extended tool with additional metadata
 */
export interface ExtendedTool<T extends ToolSchema = ToolSchema> extends BaseTool {
  /**
   * Unique identifier for the tool
   */
  id: string;

  /**
   * Tool categories for classification
   */
  category?: ToolCategory | ToolCategory[];

  /**
   * Whether the tool requires permission to execute
   */
  requiresPermission?: boolean;

  /**
   * Permission level required to use this tool
   */
  permissionLevel?: ToolPermission;

  /**
   * Whether the tool always requires permission, even in trusted environments
   */
  alwaysRequirePermission?: boolean;

  /**
   * Source repository of the tool
   */
  source?: "serv" | "swarmMCP" | "voltagent" | "custom";
}

/**
 * Tool execution context
 */
export interface ToolExecutionContext {
  /**
   * Unique identifier for the execution
   */
  executionId: string;

  /**
   * Logger instance
   */
  logger?: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
    debug: (message: string) => void;
  };

  /**
   * Session state
   */
  sessionState?: any;

  /**
   * Execution adapter
   */
  executionAdapter?: any;

  /**
   * Additional context data
   */
  [key: string]: any;
}

/**
 * Tool execution event data
 */
export interface ToolExecutionEventData {
  /**
   * Execution ID
   */
  executionId: string;

  /**
   * Tool ID
   */
  toolId: string;

  /**
   * Tool use ID (from LLM)
   */
  toolUseId?: string;

  /**
   * Tool arguments
   */
  args: any;

  /**
   * Execution context
   */
  context: ToolExecutionContext;

  /**
   * Execution result
   */
  result?: any;

  /**
   * Execution error
   */
  error?: Error;

  /**
   * Execution time in milliseconds
   */
  executionTime?: number;
}

/**
 * Tool registry interface
 */
export interface ToolRegistry {
  /**
   * Register a tool with the registry
   */
  registerTool(tool: ExtendedTool | AgentTool): void;

  /**
   * Get a tool by its ID
   */
  getTool(toolId: string): ExtendedTool | undefined;

  /**
   * Get all registered tools
   */
  getAllTools(): ExtendedTool[];

  /**
   * Get tool descriptions for the model
   */
  getToolDescriptions(): Omit<ExtendedTool, "execute">[];

  /**
   * Get tools by category
   */
  getToolsByCategory(category: ToolCategory): ExtendedTool[];

  /**
   * Check if a tool belongs to a category
   */
  isToolInCategory(toolId: string, category: ToolCategory): boolean;

  /**
   * Execute a tool with callbacks
   */
  executeToolWithCallbacks(
    toolId: string,
    toolUseId: string | undefined,
    args: any,
    context: ToolExecutionContext
  ): Promise<any>;

  /**
   * Register a callback for tool execution start
   */
  onToolExecutionStart(
    callback: (
      executionId: string,
      toolId: string,
      toolUseId: string | undefined,
      args: any,
      context: ToolExecutionContext
    ) => void
  ): () => void;

  /**
   * Register a callback for tool execution completion
   */
  onToolExecutionComplete(
    callback: (
      executionId: string,
      toolId: string,
      args: any,
      result: any,
      executionTime: number
    ) => void
  ): () => void;

  /**
   * Register a callback for tool execution error
   */
  onToolExecutionError(
    callback: (executionId: string, toolId: string, args: any, error: Error) => void
  ): () => void;

  /**
   * Check if a tool has permission to execute
   */
  checkToolPermission(toolId: string, context: ToolExecutionContext): boolean;
}

