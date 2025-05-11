import type { z } from "zod";
import { MemoryManager } from "../memory";
import type { BaseRetriever } from "../retriever/retriever";
import type { Tool, Toolkit } from "../tool";
import { ToolManager } from "../tool";
import type { Voice } from "../voice";
import { type AgentHistoryEntry, HistoryManager } from "./history";
import { type AgentHooks } from "./hooks";
import type { BaseMessage, BaseTool, LLMProvider, ToolExecuteOptions } from "./providers";
import { SubAgentManager } from "./subagent";
import type {
  AgentOptions,
  InferGenerateObjectResponse,
  InferGenerateTextResponse,
  InferStreamObjectResponse,
  InferStreamTextResponse,
  ModelType,
  ProviderInstance,
  PublicGenerateOptions,
} from "./types";
/**
 * Agent class for interacting with AI models
 */
export declare class Agent<
  TProvider extends {
    llm: LLMProvider<unknown>;
  },
> {
  /**
   * Unique identifier for the agent
   */
  readonly id: string;
  /**
   * Agent name
   */
  readonly name: string;
  /**
   * @deprecated Use `instructions` instead. Will be removed in a future version.
   */
  readonly description: string;
  /**
   * Agent instructions. This is the preferred field over `description`.
   */
  readonly instructions: string;
  /**
   * The LLM provider to use
   */
  readonly llm: ProviderInstance<TProvider>;
  /**
   * The AI model to use
   */
  readonly model: ModelType<TProvider>;
  /**
   * Hooks for agent lifecycle events
   */
  hooks: AgentHooks;
  /**
   * Voice provider for the agent
   */
  readonly voice?: Voice;
  /**
   * Indicates if the agent should format responses using Markdown.
   */
  readonly markdown: boolean;
  /**
   * Memory manager for the agent
   */
  protected memoryManager: MemoryManager;
  /**
   * Tool manager for the agent
   */
  protected toolManager: ToolManager;
  /**
   * Sub-agent manager for the agent
   */
  protected subAgentManager: SubAgentManager;
  /**
   * History manager for the agent
   */
  protected historyManager: HistoryManager;
  /**
   * Retriever for automatic RAG
   */
  private retriever?;
  /**
   * Create a new agent
   */
  constructor(
    options: AgentOptions &
      TProvider & {
        model: ModelType<TProvider>;
        subAgents?: Agent<any>[];
        maxHistoryEntries?: number;
        hooks?: AgentHooks;
        retriever?: BaseRetriever;
        voice?: Voice;
        markdown?: boolean;
      },
  );
  /**
   * Get the system message for the agent
   */
  protected getSystemMessage({
    input,
    historyEntryId,
    contextMessages,
  }: {
    input?: string | BaseMessage[];
    historyEntryId: string;
    contextMessages: BaseMessage[];
  }): Promise<BaseMessage>;
  /**
   * Prepare agents memory for the supervisor system message
   * This fetches and formats recent interactions with sub-agents
   */
  private prepareAgentsMemory;
  /**
   * Add input to messages array based on type
   */
  private formatInputMessages;
  /**
   * Calculate maximum number of steps based on sub-agents
   */
  private calculateMaxSteps;
  /**
   * Prepare common options for text generation
   */
  private prepareTextOptions;
  /**
   * Initialize a new history entry
   * @param input User input
   * @param initialStatus Initial status
   * @param options Options including parent context
   * @returns Created operation context
   */
  private initializeHistory;
  /**
   * Get full agent state including tools status
   */
  getFullState(): {
    id: string;
    name: string;
    description: string;
    instructions: string;
    status: string;
    model: string;
    node_id: string;
    tools: {
      node_id: string;
      id: string;
      name: string;
      description: string;
      parameters: any;
      execute: (args: any, options?: ToolExecuteOptions) => Promise<unknown>;
    }[];
    subAgents: {
      node_id: string;
    }[];
    memory: {
      node_id: string;
    };
    retriever: {
      name: string;
      description: string;
      status: string;
      node_id: string;
    } | null;
  };
  /**
   * Get agent's history
   */
  getHistory(): Promise<AgentHistoryEntry[]>;
  /**
   * Add step to history immediately
   */
  private addStepToHistory;
  /**
   * Update history entry
   */
  private updateHistoryEntry;
  /**
   * Standard timeline event creator
   */
  private createStandardTimelineEvent;
  /**
   * Fix delete operator usage for better performance
   */
  private addToolEvent;
  /**
   * Agent event creator (update)
   */
  private addAgentEvent;
  /**
   * Helper method to enrich and end an OpenTelemetry span associated with a tool call.
   */
  private _endOtelToolSpan;
  /**
   * Generate a text response without streaming
   */
  generateText(
    input: string | BaseMessage[],
    options?: PublicGenerateOptions,
  ): Promise<InferGenerateTextResponse<TProvider>>;
  /**
   * Stream a text response
   */
  streamText(
    input: string | BaseMessage[],
    options?: PublicGenerateOptions,
  ): Promise<InferStreamTextResponse<TProvider>>;
  /**
   * Generate a structured object response
   */
  generateObject<T extends z.ZodType>(
    input: string | BaseMessage[],
    schema: T,
    options?: PublicGenerateOptions,
  ): Promise<InferGenerateObjectResponse<TProvider>>;
  /**
   * Stream a structured object response
   */
  streamObject<T extends z.ZodType>(
    input: string | BaseMessage[],
    schema: T,
    options?: PublicGenerateOptions,
  ): Promise<InferStreamObjectResponse<TProvider>>;
  /**
   * Add a sub-agent that this agent can delegate tasks to
   */
  addSubAgent(agent: Agent<any>): void;
  /**
   * Remove a sub-agent
   */
  removeSubAgent(agentId: string): void;
  /**
   * Get agent's tools for API exposure
   */
  getToolsForApi(): {
    name: string;
    description: string;
    parameters: any;
  }[];
  /**
   * Get all tools
   */
  getTools(): BaseTool[];
  /**
   * Get agent's model name for API exposure
   */
  getModelName(): string;
  /**
   * Get all sub-agents
   */
  getSubAgents(): Agent<any>[];
  /**
   * Unregister this agent
   */
  unregister(): void;
  /**
   * Get agent's history manager
   * This provides access to the history manager for direct event handling
   * @returns The history manager instance
   */
  getHistoryManager(): HistoryManager;
  /**
   * Add one or more tools or toolkits to the agent.
   * Delegates to ToolManager's addItems method.
   * @returns Object containing added items (difficult to track precisely here, maybe simplify return)
   */
  addItems(items: (Tool<any> | Toolkit)[]): {
    added: (Tool<any> | Toolkit)[];
  };
}
