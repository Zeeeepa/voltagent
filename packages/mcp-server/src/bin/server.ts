#!/usr/bin/env node

/**
 * MCP Server CLI
 *
 * Command-line interface for the VoltAgent MCP Server
 */

import { createMCPServer } from "../index";

async function main() {
  try {
    const server = createMCPServer({
      port: parseInt(process.env.MCP_PORT || "3000", 10),
      host: process.env.MCP_HOST || "localhost",
    });

    await server.start();

    // Handle graceful shutdown
    process.on("SIGINT", async () => {
      console.log("Shutting down MCP server...");
      await server.stop();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      console.log("Shutting down MCP server...");
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start MCP server:", error);
    process.exit(1);
  }
}

main();
