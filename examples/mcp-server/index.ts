import { MCPServer, createToolRegistrationFn, logger } from "../../packages/core/src/mcp/server";
import { ToolManager } from "../../packages/core/src/tool/manager";
import { createTool } from "../../packages/core/src/tool";
import { z } from "zod";

// Create a tool manager
const toolManager = new ToolManager();

// Register some example tools
toolManager.addTool(
  createTool({
    name: "echo",
    description: "Echo back the input",
    parameters: z.object({
      message: z.string().describe("Message to echo"),
    }),
    execute: async ({ message }) => {
      return { message };
    },
  })
);

toolManager.addTool(
  createTool({
    name: "add",
    description: "Add two numbers",
    parameters: z.object({
      a: z.number().describe("First number"),
      b: z.number().describe("Second number"),
    }),
    execute: async ({ a, b }) => {
      return { result: a + b };
    },
  })
);

// Create an MCP server
const mcpServer = new MCPServer({
  name: "Example MCP Server",
  version: "1.0.0",
});

// Register tools from the tool manager
mcpServer.registerTool(createToolRegistrationFn(toolManager));

// Start the server
async function startServer() {
  try {
    await mcpServer.start({
      transportType: "stdio",
      timeout: 120000, // 2 minutes
    });
  } catch (error) {
    logger.error(`Failed to start MCP server: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  await mcpServer.stop();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await mcpServer.stop();
  process.exit(0);
});

// Start the server
startServer();

