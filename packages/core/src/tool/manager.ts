// ... existing imports ...
import { v4 as uuidv4 } from "uuid";
import type { Tool, ToolOptions } from "./index";
import type { Toolkit } from "./toolkit";
import { defaultToolRegistry } from "./registry";
import type { ToolExecutionContext } from "./registry/types";

// ... existing code ...

/**
 * Tool manager for registering and executing tools
 */
export class ToolManager {
  private tools: Map<string, Tool> = new Map();
  private toolkits: Map<string, Toolkit> = new Map();
  private statusInfo: Map<string, ToolStatusInfo> = new Map();

  /**
   * Create a new tool manager
   */
  constructor() {
    // Initialize with empty maps
  }

  /**
   * Register a tool with the manager
   * @param tool Tool to register
   * @returns The registered tool
   */
  registerTool<T extends z.ZodType>(tool: Tool<T>): Tool<T> {
    this.tools.set(tool.name, tool);
    this.statusInfo.set(tool.name, { status: ToolStatus.READY });
    
    // Also register with the tool registry
    defaultToolRegistry.registerTool(tool);
    
    return tool;
  }

  /**
   * Execute a tool with the given arguments
   * @param toolName Name of the tool to execute
   * @param args Arguments to pass to the tool
   * @param options Options for tool execution
   * @returns Result of the tool execution
   */
  async executeTool(toolName: string, args: any, options?: ToolExecuteOptions): Promise<any> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool ${toolName} not found`);
    }

    this.setToolStatus(toolName, ToolStatus.RUNNING);

    try {
      // Create execution context
      const executionContext: ToolExecutionContext = {
        executionId: uuidv4(),
        ...(options || {}),
      };
      
      // Execute the tool using the registry if possible
      const result = await defaultToolRegistry.executeToolWithCallbacks(
        tool.id,
        undefined,
        args,
        executionContext
      );
      
      this.setToolStatus(toolName, ToolStatus.READY);
      return result;
    } catch (error) {
      this.setToolStatus(toolName, ToolStatus.ERROR, (error as Error).message);
      throw error;
    }
  }
}
