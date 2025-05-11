import type { BaseTool, ToolExecuteOptions } from "../../agent/providers/base/types";
import { type AgentTool } from "../index";
import type { Toolkit } from "../toolkit";
/**
 * Status of a tool at any given time
 */
export type ToolStatus = "idle" | "working" | "error" | "completed";
/**
 * Tool status information
 */
export type ToolStatusInfo = {
  name: string;
  status: ToolStatus;
  result?: any;
  error?: any;
  input?: any;
  output?: any;
  timestamp: Date;
  parameters?: any;
};
/**
 * Manager class to handle all tool-related operations, including Toolkits.
 */
export declare class ToolManager {
  /**
   * Standalone tools managed by this manager.
   */
  private tools;
  /**
   * Toolkits managed by this manager.
   */
  private toolkits;
  /**
   * Creates a new ToolManager.
   * Accepts both individual tools and toolkits.
   */
  constructor(items?: (AgentTool | Toolkit)[]);
  /**
   * Get all individual tools and tools within toolkits as a flattened list.
   */
  getTools(): BaseTool[];
  /**
   * Get all toolkits managed by this manager.
   */
  getToolkits(): Toolkit[];
  /**
   * Add an individual tool to the manager.
   * If a standalone tool with the same name already exists, it will be replaced.
   * A warning is issued if the name conflicts with a tool inside a toolkit, but the standalone tool is still added/replaced.
   * @returns true if the tool was successfully added or replaced.
   */
  addTool(tool: AgentTool): boolean;
  /**
   * Add a toolkit to the manager.
   * If a toolkit with the same name already exists, it will be replaced.
   * Also checks if any tool within the toolkit conflicts with existing standalone tools or tools in other toolkits.
   * @returns true if the toolkit was successfully added or replaced.
   */
  addToolkit(toolkit: Toolkit): boolean;
  /**
   * Add multiple tools or toolkits to the manager.
   */
  addItems(items: (AgentTool | Toolkit)[]): void;
  /**
   * Remove a standalone tool by name. Does not remove tools from toolkits.
   * @returns true if the tool was removed, false if it wasn't found.
   */
  removeTool(toolName: string): boolean;
  /**
   * Remove a toolkit by name.
   * @returns true if the toolkit was removed, false if it wasn't found.
   */
  removeToolkit(toolkitName: string): boolean;
  /**
   * Prepare tools for text generation (includes tools from toolkits).
   */
  prepareToolsForGeneration(dynamicTools?: BaseTool[]): BaseTool[];
  /**
   * Get agent's tools (including those in toolkits) for API exposure.
   */
  getToolsForApi(): {
    name: string;
    description: string;
    parameters: any;
  }[];
  /**
   * Check if a tool with the given name exists (either standalone or in a toolkit).
   */
  hasTool(toolName: string): boolean;
  /**
   * Get a tool by name (searches standalone tools and tools within toolkits).
   * @param toolName The name of the tool to get
   * @returns The tool (as BaseTool) or undefined if not found
   */
  getToolByName(toolName: string): BaseTool | undefined;
  /**
   * Execute a tool by name
   * @param toolName The name of the tool to execute
   * @param args The arguments to pass to the tool
   * @param options Optional execution options like signal
   * @returns The result of the tool execution
   * @throws Error if the tool doesn't exist or fails to execute
   */
  executeTool(toolName: string, args: any, options?: ToolExecuteOptions): Promise<any>;
}
