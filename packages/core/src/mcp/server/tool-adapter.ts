import type { FastMCP } from "fastmcp";
import { z } from "zod";
import type { Tool } from "../../tool";
import type { ToolManager } from "../../tool/manager";
import type { AsyncOperationManager } from "./async-manager";
import { logger } from "./logger";

/**
 * Adapter to register tools from the tool manager with the MCP server
 */
export class MCPToolAdapter {
  /**
   * Tool manager instance
   */
  private toolManager: ToolManager;

  /**
   * MCP server instance
   */
  private mcpServer: FastMCP;

  /**
   * Async operation manager
   */
  private asyncManager: AsyncOperationManager;

  /**
   * Create a new MCP tool adapter
   * @param toolManager Tool manager instance
   * @param mcpServer MCP server instance
   * @param asyncManager Async operation manager
   */
  constructor(toolManager: ToolManager, mcpServer: FastMCP, asyncManager: AsyncOperationManager) {
    this.toolManager = toolManager;
    this.mcpServer = mcpServer;
    this.asyncManager = asyncManager;
  }

  /**
   * Register all tools from the tool manager with the MCP server
   */
  registerAllTools(): void {
    const tools = this.toolManager.getTools();
    for (const tool of tools) {
      this.registerTool(tool);
    }
    logger.info(`Registered ${tools.length} tools with MCP server`);
  }

  /**
   * Register a single tool with the MCP server
   * @param tool Tool to register
   */
  registerTool(tool: Tool<any>): void {
    if (!tool.name || !tool.execute || typeof tool.execute !== "function") {
      logger.warn(`Skipping invalid tool: ${tool.name || "unnamed"}`);
      return;
    }

    try {
      // Convert Zod schema to JSON schema
      const inputSchema = tool.parameters?.toJSON?.() || {
        type: "object",
        properties: {},
        additionalProperties: true,
      };

      // Register the tool with the MCP server
      this.mcpServer.addTool({
        name: tool.name,
        description: tool.description || "",
        inputSchema,
        handler: async (args, _context) => {
          try {
            // Execute the tool
            const result = await tool.execute(args);
            return {
              success: true,
              data: result,
            };
          } catch (error) {
            logger.error(
              `Error executing tool ${tool.name}: ${error instanceof Error ? error.message : String(error)}`,
            );
            return {
              success: false,
              error: {
                code: "TOOL_EXECUTION_ERROR",
                message: error instanceof Error ? error.message : String(error),
              },
            };
          }
        },
      });

      logger.debug(`Registered tool with MCP server: ${tool.name}`);
    } catch (error) {
      logger.error(
        `Failed to register tool ${tool.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Register a tool with async execution support
   * @param tool Tool to register
   */
  registerAsyncTool(tool: Tool<any>): void {
    if (!tool.name || !tool.execute || typeof tool.execute !== "function") {
      logger.warn(`Skipping invalid async tool: ${tool.name || "unnamed"}`);
      return;
    }

    try {
      // Convert Zod schema to JSON schema
      const inputSchema = tool.parameters?.toJSON?.() || {
        type: "object",
        properties: {},
        additionalProperties: true,
      };

      // Register the tool with the MCP server
      this.mcpServer.addTool({
        name: `async_${tool.name}`,
        description: `Async version of: ${tool.description || tool.name}`,
        inputSchema,
        handler: async (args, context) => {
          // Create an operation ID for this async execution
          const operationId = this.asyncManager.addOperation(
            async (toolArgs, log, _opContext) => {
              try {
                // Execute the tool
                const result = await tool.execute(toolArgs);
                return {
                  success: true,
                  data: result,
                };
              } catch (error) {
                log.error(
                  `Error executing async tool ${tool.name}: ${error instanceof Error ? error.message : String(error)}`,
                );
                return {
                  success: false,
                  error: {
                    code: "ASYNC_TOOL_EXECUTION_ERROR",
                    message: error instanceof Error ? error.message : String(error),
                  },
                };
              }
            },
            args,
            context,
          );

          // Return the operation ID immediately
          return {
            success: true,
            data: {
              operationId,
              status: "pending",
              message: `Async operation started for tool ${tool.name}`,
            },
          };
        },
      });

      // Also register a tool to check the status of the async operation
      this.mcpServer.addTool({
        name: "check_async_operation",
        description: "Check the status of an async operation",
        inputSchema: {
          type: "object",
          properties: {
            operationId: {
              type: "string",
              description: "The ID of the async operation to check",
            },
          },
          required: ["operationId"],
        },
        handler: async (args, _context) => {
          const { operationId } = args as { operationId: string };
          const status = this.asyncManager.getStatus(operationId);
          return {
            success: true,
            data: status,
          };
        },
      });

      logger.debug(`Registered async tool with MCP server: ${tool.name}`);
    } catch (error) {
      logger.error(
        `Failed to register async tool ${tool.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}

/**
 * Create a tool registration function for the MCP server
 * @param toolManager Tool manager instance
 * @returns Tool registration function
 */
export function createToolRegistrationFn(toolManager: ToolManager) {
  return (mcpServer: FastMCP, asyncManager: AsyncOperationManager) => {
    const adapter = new MCPToolAdapter(toolManager, mcpServer, asyncManager);
    adapter.registerAllTools();
  };
}
