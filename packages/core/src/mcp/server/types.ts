import type { FastMCP } from "fastmcp";
import type { AsyncOperationManager } from "./async-manager";

/**
 * Options for the MCP server
 */
export interface MCPServerOptions {
  /**
   * Name of the MCP server
   */
  name: string;

  /**
   * Version of the MCP server
   */
  version: string;

  /**
   * Additional options for the MCP server
   */
  [key: string]: unknown;
}

/**
 * Transport type for the MCP server
 */
export type TransportType = "stdio" | "http";

/**
 * Start options for the MCP server
 */
export interface MCPServerStartOptions {
  /**
   * Transport type for the MCP server
   * @default "stdio"
   */
  transportType?: TransportType;

  /**
   * Timeout for MCP operations in milliseconds
   * @default 120000 (2 minutes)
   */
  timeout?: number;
}

/**
 * Tool registration function type
 */
export type ToolRegistrationFn = (server: FastMCP, asyncManager: AsyncOperationManager) => void;

/**
 * MCP server interface
 */
export interface IMCPServer {
  /**
   * Initialize the MCP server
   */
  init(): Promise<this>;

  /**
   * Start the MCP server
   * @param options Start options
   */
  start(options?: MCPServerStartOptions): Promise<this>;

  /**
   * Stop the MCP server
   */
  stop(): Promise<void>;

  /**
   * Register a tool with the MCP server
   * @param registrationFn Tool registration function
   */
  registerTool(registrationFn: ToolRegistrationFn): void;
}

