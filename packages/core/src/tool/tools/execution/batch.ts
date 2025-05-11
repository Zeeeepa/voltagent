import { z } from "zod";
import { createTool } from "../../index";
import { ToolCategory } from "../../registry/types";

/**
 * Result of a batch operation
 */
export interface BatchResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Results of each command
   */
  results?: any[];
  
  /**
   * Error message if the operation failed
   */
  error?: string;
  
  /**
   * Number of successful commands
   */
  successCount?: number;
  
  /**
   * Number of failed commands
   */
  failureCount?: number;
  
  /**
   * Execution time in milliseconds
   */
  executionTime?: number;
}

/**
 * Tool for executing multiple tools in a batch
 */
export const BatchTool = createTool({
  name: "batch",
  description: `- Executes multiple tools in a batch
- Can run tools sequentially or in parallel
- Can pass results from one tool to another
- Can handle errors and continue execution
- Use this tool to run multiple tools in a single operation

Usage notes:
- Provide an array of tool calls to execute
- Use parallel to run tools in parallel
- Use stopOnError to stop execution on first error
- Returns results of each tool call`,
  category: ToolCategory.SHELL_EXECUTION,
  source: "serv",
  requiresPermission: true,
  parameters: z.object({
    tools: z.array(z.object({
      name: z.string().describe("Name of the tool to execute"),
      args: z.record(z.any()).describe("Arguments to pass to the tool"),
    })).describe("Array of tool calls to execute"),
    parallel: z.boolean().optional().describe("Whether to run tools in parallel. Default: false"),
    stopOnError: z.boolean().optional().describe("Whether to stop execution on first error. Default: false"),
  }),
  execute: async (args, context) => {
    // Extract and type-cast each argument individually
    const tools = args.tools;
    const parallel = args.parallel || false;
    const stopOnError = args.stopOnError || false;

    try {
      // Get the tool manager from context
      const toolManager = (context && (context as any).toolManager) || null;
      
      if (!toolManager) {
        return {
          success: false,
          error: "Tool manager not available in context",
        };
      }
      
      const startTime = Date.now();
      const results: any[] = [];
      let successCount = 0;
      let failureCount = 0;
      
      // Execute tools
      if (parallel) {
        // Execute tools in parallel
        const promises = tools.map(async (tool) => {
          try {
            const result = await toolManager.executeTool(tool.name, tool.args, context);
            successCount++;
            return { success: true, tool: tool.name, result };
          } catch (error) {
            failureCount++;
            return {
              success: false,
              tool: tool.name,
              error: (error as Error).message,
            };
          }
        });
        
        results.push(...(await Promise.all(promises)));
      } else {
        // Execute tools sequentially
        for (const tool of tools) {
          try {
            const result = await toolManager.executeTool(tool.name, tool.args, context);
            results.push({ success: true, tool: tool.name, result });
            successCount++;
          } catch (error) {
            results.push({
              success: false,
              tool: tool.name,
              error: (error as Error).message,
            });
            failureCount++;
            
            if (stopOnError) {
              break;
            }
          }
        }
      }
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: failureCount === 0 || !stopOnError,
        results,
        successCount,
        failureCount,
        executionTime,
      };
    } catch (error) {
      if (context && (context as any).logger) {
        (context as any).logger.error(`Error in batch execution: ${(error as Error).message}`);
      } else {
        console.error(`Error in batch execution: ${(error as Error).message}`);
      }
      
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

