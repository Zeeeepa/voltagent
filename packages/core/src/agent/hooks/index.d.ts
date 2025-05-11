import type { AgentTool } from "../../tool";
import type { Agent } from "../index";
import type { AgentOperationOutput, OperationContext, VoltAgentError } from "../types";
export interface OnStartHookArgs {
  agent: Agent<any>;
  context: OperationContext;
}
export interface OnEndHookArgs {
  agent: Agent<any>;
  /** The standardized successful output object. Undefined on error. */
  output: AgentOperationOutput | undefined;
  /** The VoltAgentError object if the operation failed. Undefined on success. */
  error: VoltAgentError | undefined;
  context: OperationContext;
}
export interface OnHandoffHookArgs {
  agent: Agent<any>;
  source: Agent<any>;
}
export interface OnToolStartHookArgs {
  agent: Agent<any>;
  tool: AgentTool;
  context: OperationContext;
}
export interface OnToolEndHookArgs {
  agent: Agent<any>;
  tool: AgentTool;
  /** The successful output from the tool. Undefined on error. */
  output: unknown | undefined;
  /** The VoltAgentError if the tool execution failed. Undefined on success. */
  error: VoltAgentError | undefined;
  context: OperationContext;
}
export type AgentHookOnStart = (args: OnStartHookArgs) => Promise<void> | void;
export type AgentHookOnEnd = (args: OnEndHookArgs) => Promise<void> | void;
export type AgentHookOnHandoff = (args: OnHandoffHookArgs) => Promise<void> | void;
export type AgentHookOnToolStart = (args: OnToolStartHookArgs) => Promise<void> | void;
export type AgentHookOnToolEnd = (args: OnToolEndHookArgs) => Promise<void> | void;
/**
 * Type definition for agent hooks using single argument objects.
 */
export type AgentHooks = {
  onStart?: AgentHookOnStart;
  onEnd?: AgentHookOnEnd;
  onHandoff?: AgentHookOnHandoff;
  onToolStart?: AgentHookOnToolStart;
  onToolEnd?: AgentHookOnToolEnd;
};
/**
 * Create hooks from an object literal.
 */
export declare function createHooks(hooks?: Partial<AgentHooks>): AgentHooks;
