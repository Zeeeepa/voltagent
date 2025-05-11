import type { z } from "zod";
import type { BaseTool, ToolExecuteOptions, ToolSchema } from "../agent/providers/base/types";
export { ToolManager, ToolStatus, ToolStatusInfo } from "./manager";
export type { Toolkit } from "./toolkit";
/**
 * Tool definition compatible with Vercel AI SDK
 */
export type AgentTool = BaseTool;
/**
 * Tool options for creating a new tool
 */
export type ToolOptions<T extends ToolSchema = ToolSchema> = {
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
};
/**
 * Tool class for defining tools that agents can use
 */
export declare class Tool<T extends ToolSchema = ToolSchema> {
  /**
   * Unique identifier for the tool
   */
  readonly id: string;
  /**
   * Name of the tool
   */
  readonly name: string;
  /**
   * Description of the tool
   */
  readonly description: string;
  /**
   * Tool parameter schema
   */
  readonly parameters: T;
  /**
   * Function to execute when the tool is called
   */
  readonly execute: (args: z.infer<T>, options?: ToolExecuteOptions) => Promise<unknown>;
  /**
   * Create a new tool
   */
  constructor(options: ToolOptions<T>);
}
/**
 * Helper function for creating a new tool
 */
export declare const createTool: <T extends ToolSchema>(options: ToolOptions<T>) => Tool<T>;
/**
 * Alias for createTool function
 */
export declare const tool: <T extends ToolSchema>(options: ToolOptions<T>) => Tool<T>;
