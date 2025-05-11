import type { FastMCP } from "fastmcp";
import type { AsyncOperationManager } from "./async-manager";
/**
 * MCP server options
 */
export interface MCPServerOptions {
  /**
   * Server name
   */
  name: string;
  /**
   * Server version
   */
  version: string;
}
/**
 * Transport type
 */
export type TransportType = "stdio" | "httpStream";
/**
 * MCP server start options
 */
export interface MCPServerStartOptions {
  /**
   * Transport type
   */
  transportType?: TransportType;
  /**
   * Timeout in milliseconds
   */
  timeout?: number;
}
/**
 * Tool registration function
 */
export type ToolRegistrationFn = (server: FastMCP, asyncManager: AsyncOperationManager) => void;
/**
 * MCP server interface
 */
export interface IMCPServer {
  /**
   * Initialize the server
   */
  init(): Promise<IMCPServer>;
  /**
   * Start the server
   * @param options Start options
   */
  start(options?: MCPServerStartOptions): Promise<IMCPServer>;
  /**
   * Stop the server
   */
  stop(): Promise<void>;
  /**
   * Register a tool with the server
   * @param registrationFn Tool registration function
   */
  registerTool(registrationFn: ToolRegistrationFn): void;
}
