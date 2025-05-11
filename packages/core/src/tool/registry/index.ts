import { v4 as uuidv4, v5 as uuidv5 } from "uuid";
import type { BaseTool, ToolExecuteOptions } from "../../agent/providers/base/types";
import type { AgentTool } from "../index";
import {
  type ExtendedTool,
  type ToolExecutionContext,
  type ToolRegistry,
  ToolPermission,
} from "./types";

/**
 * UUID Namespace for tool execution IDs
 * Used to generate consistent UUIDs from tool use IDs
 */
const TOOL_EXECUTION_NAMESPACE = "1b671a64-40d5-491e-99b0-da01ff1f3341";

/**
 * Generate a stable execution ID from a tool use ID
 * @param toolUseId The tool use ID
 * @returns A stable UUID v5 generated from the tool use ID
 */
function generateExecutionId(toolUseId?: string): string {
  if (!toolUseId) {
    return uuidv4(); // Generate a random UUID if no tool use ID is provided
  }
  return uuidv5(toolUseId, TOOL_EXECUTION_NAMESPACE);
}

/**
 * Creates a tool registry to manage available tools
 * @returns The tool registry interface
 */
export function createToolRegistry(): ToolRegistry {
  // Private storage for registered tools
  const tools = new Map<string, ExtendedTool>();
  
  // Index to look up tools by category
  const toolsByCategory = new Map<string, Set<string>>();
  
  // Callbacks for tool execution events
  const startCallbacks: Array<
    (
      executionId: string,
      toolId: string,
      toolUseId: string | undefined,
      args: any,
      context: ToolExecutionContext
    ) => void
  > = [];
  
  const completeCallbacks: Array<
    (executionId: string, toolId: string, args: any, result: any, executionTime: number) => void
  > = [];
  
  const errorCallbacks: Array<
    (executionId: string, toolId: string, args: any, error: Error) => void
  > = [];

  return {
    /**
     * Register a tool with the registry
     * @param tool - The tool to register
     */
    registerTool(tool: ExtendedTool | AgentTool) {
      if (!tool || !tool.name) {
        throw new Error("Invalid tool: Tool must have a name");
      }

      // Convert AgentTool to ExtendedTool if needed
      const extendedTool: ExtendedTool = {
        id: (tool as ExtendedTool).id || tool.name,
        name: tool.name,
        description: tool.description || "",
        parameters: tool.parameters,
        execute: tool.execute,
        category: (tool as ExtendedTool).category,
        requiresPermission: (tool as ExtendedTool).requiresPermission || false,
        permissionLevel: (tool as ExtendedTool).permissionLevel || ToolPermission.NONE,
        alwaysRequirePermission: (tool as ExtendedTool).alwaysRequirePermission || false,
        source: (tool as ExtendedTool).source || "custom",
      };

      tools.set(extendedTool.id, extendedTool);

      // If the tool has category information, add it to the category index
      if (extendedTool.category) {
        // Handle both single category and arrays of categories
        const categories = Array.isArray(extendedTool.category)
          ? extendedTool.category
          : [extendedTool.category];
        
        for (const category of categories) {
          if (!toolsByCategory.has(category)) {
            toolsByCategory.set(category, new Set());
          }
          toolsByCategory.get(category)?.add(extendedTool.id);
        }
      }
    },

    /**
     * Get a tool by its ID
     * @param toolId - The ID of the tool to retrieve
     * @returns The requested tool or undefined if not found
     */
    getTool(toolId: string) {
      return tools.get(toolId);
    },

    /**
     * Get all registered tools
     * @returns Array of all registered tools
     */
    getAllTools() {
      return Array.from(tools.values());
    },

    /**
     * Get descriptions of all tools for the model
     * @returns Array of tool descriptions
     */
    getToolDescriptions() {
      return Array.from(tools.values()).map((tool) => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
        category: tool.category,
        requiresPermission: tool.requiresPermission,
        permissionLevel: tool.permissionLevel,
        alwaysRequirePermission: tool.alwaysRequirePermission,
        source: tool.source,
      }));
    },

    /**
     * Get all tools in a specific category
     * @param category - The category to query
     * @returns Array of tools in the specified category
     */
    getToolsByCategory(category) {
      const toolIds = toolsByCategory.get(category) || new Set();
      return Array.from(toolIds)
        .map((id) => tools.get(id))
        .filter(Boolean) as ExtendedTool[];
    },

    /**
     * Check if a tool belongs to a specific category
     * @param toolId - The ID of the tool to check
     * @param category - The category to check against
     * @returns Whether the tool belongs to the specified category
     */
    isToolInCategory(toolId, category) {
      const tool = tools.get(toolId);
      if (!tool || !tool.category) return false;

      // Check if the tool belongs to the specified category
      const categories = Array.isArray(tool.category) ? tool.category : [tool.category];
      return categories.includes(category);
    },

    /**
     * Register a callback to be called when a tool execution starts
     * @param callback - The callback function to register
     * @returns A function to unregister the callback
     */
    onToolExecutionStart(callback) {
      startCallbacks.push(callback);
      // Return unsubscribe function
      return () => {
        const index = startCallbacks.indexOf(callback);
        if (index !== -1) {
          startCallbacks.splice(index, 1);
        }
      };
    },

    /**
     * Register a callback to be called when a tool execution completes successfully
     * @param callback - The callback function to register
     * @returns A function to unregister the callback
     */
    onToolExecutionComplete(callback) {
      completeCallbacks.push(callback);
      // Return unsubscribe function
      return () => {
        const index = completeCallbacks.indexOf(callback);
        if (index !== -1) {
          completeCallbacks.splice(index, 1);
        }
      };
    },

    /**
     * Register a callback to be called when a tool execution encounters an error
     * @param callback - The callback function to register
     * @returns A function to unregister the callback
     */
    onToolExecutionError(callback) {
      errorCallbacks.push(callback);
      // Return unsubscribe function
      return () => {
        const index = errorCallbacks.indexOf(callback);
        if (index !== -1) {
          errorCallbacks.splice(index, 1);
        }
      };
    },

    /**
     * Check if a tool has permission to execute
     * @param toolId - The ID of the tool to check
     * @param context - The execution context
     * @returns Whether the tool has permission to execute
     */
    checkToolPermission(toolId, context) {
      const tool = tools.get(toolId);
      if (!tool) {
        return false;
      }

      // If the tool doesn't require permission, allow it
      if (!tool.requiresPermission) {
        return true;
      }

      // If the tool always requires permission, check the context
      if (tool.alwaysRequirePermission) {
        // Check if the context has permission information
        if (!context.permissions) {
          return false;
        }

        // Check if the context has the required permission level
        const contextPermissionLevel = context.permissions[toolId] || context.permissions.default;
        if (!contextPermissionLevel) {
          return false;
        }

        // Check if the context permission level is sufficient
        const requiredLevel = tool.permissionLevel || ToolPermission.USER;
        if (requiredLevel === ToolPermission.ADMIN && contextPermissionLevel !== ToolPermission.ADMIN) {
          return false;
        }

        return true;
      }

      // If we're in a trusted environment, allow the tool
      if (context.trusted) {
        return true;
      }

      // Otherwise, check the context permissions
      if (!context.permissions) {
        return false;
      }

      // Check if the context has the required permission level
      const contextPermissionLevel = context.permissions[toolId] || context.permissions.default;
      if (!contextPermissionLevel) {
        return false;
      }

      // Check if the context permission level is sufficient
      const requiredLevel = tool.permissionLevel || ToolPermission.USER;
      if (requiredLevel === ToolPermission.ADMIN && contextPermissionLevel !== ToolPermission.ADMIN) {
        return false;
      }

      return true;
    },

    /**
     * Execute a tool with callback notifications
     * @param toolId - The ID of the tool to execute
     * @param toolUseId - The ID of the tool use message
     * @param args - The arguments to pass to the tool
     * @param context - The execution context
     * @returns The result of the tool execution
     */
    async executeToolWithCallbacks(toolId, toolUseId, args, context) {
      const tool = tools.get(toolId);
      if (!tool) {
        throw new Error(`Tool ${toolId} not found`);
      }

      // Check if the tool has permission to execute
      if (!this.checkToolPermission(toolId, context)) {
        throw new Error(`Tool ${toolId} does not have permission to execute`);
      }

      // Ensure the context has an execution ID
      if (!context.executionId) {
        context.executionId = generateExecutionId(toolUseId);
      }

      // Notify start callbacks
      startCallbacks.forEach((callback) =>
        callback(context.executionId, toolId, toolUseId, args, context)
      );

      const startTime = Date.now();
      try {
        // Execute the tool
        const result = await tool.execute(args, context as ToolExecuteOptions);

        // Calculate execution time
        const executionTime = Date.now() - startTime;

        // Notify complete callbacks
        completeCallbacks.forEach((callback) =>
          callback(context.executionId, toolId, args, result, executionTime)
        );

        return result;
      } catch (error) {
        // Notify error callbacks
        errorCallbacks.forEach((callback) =>
          callback(
            context.executionId,
            toolId,
            args,
            error instanceof Error ? error : new Error(String(error))
          )
        );

        // Re-throw the error
        throw error;
      }
    },
  };
}

/**
 * Default tool registry instance
 */
export const defaultToolRegistry = createToolRegistry();

