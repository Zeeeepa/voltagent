import type { z } from "zod";
import { AgentEventEmitter } from "../events";
import type { EventStatus, EventUpdater } from "../events";
import { MemoryManager } from "../memory";
import type { Tool, Toolkit } from "../tool";
import { ToolManager } from "../tool";
import type { ReasoningToolExecuteOptions } from "../tool/reasoning/types";
import { type AgentHistoryEntry, HistoryManager } from "./history";
import { type AgentHooks, createHooks } from "./hooks";
import type {
  BaseMessage,
  BaseTool,
  LLMProvider,
  StepWithContent,
  ToolExecuteOptions,
} from "./providers";
import { SubAgentManager } from "./subagent";
import type {
  AgentOptions,
  AgentStatus,
  CommonGenerateOptions,
  InferGenerateObjectResponse,
  InferGenerateTextResponse,
  InferStreamObjectResponse,
  InferStreamTextResponse,
  InternalGenerateOptions,
  ModelType,
  ProviderInstance,
  PublicGenerateOptions,
  OperationContext,
  ToolExecutionContext,
  VoltAgentError,
  StreamOnErrorCallback,
  StreamTextFinishResult,
  StreamTextOnFinishCallback,
  StreamObjectFinishResult,
  StreamObjectOnFinishCallback,
  StandardizedTextResult,
  StandardizedObjectResult,
} from "./types";
import type { BaseRetriever } from "../retriever/retriever";
import { NodeType, createNodeId } from "../utils/node-utils";
import type { StandardEventData } from "../events/types";
import type { Voice } from "../voice";
import { serializeValueForDebug } from "../utils/serialization";
import { AgentRegistry } from "../server/registry";
import type { VoltAgentExporter } from "../telemetry/exporter";

import { startOperationSpan, endOperationSpan, startToolSpan, endToolSpan } from "./open-telemetry";
import type { Span } from "@opentelemetry/api";

// Import the new modules
import { MessageProcessor } from "./modules/message-processor";
import { GenerationEngine } from "./modules/generation-engine";
import { EventManager } from "./modules/event-manager";
import { HistoryCoordinator } from "./modules/history-coordinator";

/**
 * Agent class for creating and managing AI agents
 */
export class Agent<TProvider extends { llm: LLMProvider<unknown> }> {
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
  public hooks: AgentHooks;

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
  private retriever?: BaseRetriever;

  // New modular components
  private messageProcessor: MessageProcessor;
  private generationEngine: GenerationEngine<TProvider>;
  private eventManager: EventManager;
  private historyCoordinator: HistoryCoordinator;

  /**
   * Create a new agent
   */
  constructor(
    options: AgentOptions &
      TProvider & {
        model: ModelType<TProvider>;
        subAgents?: Agent<any>[]; // Reverted to Agent<any>[] temporarily
        maxHistoryEntries?: number;
        hooks?: AgentHooks;
        retriever?: BaseRetriever;
        voice?: Voice;
        markdown?: boolean;
        telemetryExporter?: VoltAgentExporter;
      },
  ) {
    this.id = options.id || options.name;
    this.name = options.name;
    this.instructions = options.instructions ?? options.description ?? "A helpful AI assistant";
    this.description = this.instructions;
    this.llm = options.llm as ProviderInstance<TProvider>;
    this.model = options.model;
    this.retriever = options.retriever;
    this.voice = options.voice;
    this.markdown = options.markdown ?? false;

    // Initialize hooks
    if (options.hooks) {
      this.hooks = options.hooks;
    } else {
      this.hooks = createHooks();
    }

    // Initialize memory manager
    this.memoryManager = new MemoryManager(this.id, options.memory, options.memoryOptions || {});

    // Initialize tool manager (tools are now passed directly)
    this.toolManager = new ToolManager(options.tools || []);

    // Initialize sub-agent manager
    this.subAgentManager = new SubAgentManager(this.name, options.subAgents || []);

    // Initialize history manager
    const chosenExporter =
      options.telemetryExporter || AgentRegistry.getInstance().getGlobalVoltAgentExporter();
    this.historyManager = new HistoryManager(
      this.id,
      this.memoryManager,
      options.maxHistoryEntries || 0,
      chosenExporter,
    );

    // Initialize modular components
    this.messageProcessor = new MessageProcessor(
      this.instructions,
      this.markdown,
      this.toolManager,
      this.subAgentManager,
      this.retriever,
    );
    
    this.generationEngine = new GenerationEngine(
      this.llm,
      this.model,
      this.id,
      this.name,
    );
    
    this.eventManager = new EventManager(this.id, this.name);
    
    this.historyCoordinator = new HistoryCoordinator(
      this.id,
      this.historyManager,
      this.memoryManager,
    );
  }

  /**
   * Get the system message for the agent
   */
  protected async getSystemMessage({
    input,
    historyEntryId,
    contextMessages,
  }: {
    input?: string | BaseMessage[];
    historyEntryId: string;
    contextMessages: BaseMessage[];
  }): Promise<BaseMessage> {
    return await this.messageProcessor.getSystemMessage({
      input,
      historyEntryId,
      contextMessages,
    });
  }

  /**
   * Prepare sub-agents memory context
   */
  private async prepareAgentsMemory(contextMessages: BaseMessage[]): Promise<string> {
    // This method is now handled by MessageProcessor
    // Keeping for backward compatibility but delegating to the module
    return "";
  }

  /**
   * Format input messages for processing
   */
  private async formatInputMessages(
    input: string | BaseMessage[],
    contextMessages: BaseMessage[],
  ): Promise<BaseMessage[]> {
    return await this.messageProcessor.formatInputMessages(input, contextMessages);
  }

  /**
   * Calculate maximum steps for generation
   */
  private calculateMaxSteps(): number {
    return 25;
  }

  /**
   * Prepare text generation options (deprecated - now handled by GenerationEngine)
   */
  private prepareTextOptions(options: CommonGenerateOptions = {}): {
    maxSteps: number;
    experimental_continueSteps?: boolean;
    tools: BaseTool[];
  } {
    return {
      maxSteps: options.maxSteps ?? this.calculateMaxSteps(),
      experimental_continueSteps: options.experimental_continueSteps,
      tools: this.toolManager.getTools(),
    };
  }

  /**
   * Initialize history for a new operation
   */
  private async initializeHistory(
    input: string | BaseMessage[],
    context: OperationContext,
    eventUpdater: EventUpdater,
  ): Promise<void> {
    return await this.historyCoordinator.initializeHistory(input, context, eventUpdater);
  }

  /**
   * Get full agent state
   */
  public getFullState() {
    return this.historyCoordinator.getFullState();
  }

  /**
   * Get agent history
   */
  public async getHistory(): Promise<AgentHistoryEntry[]> {
    return await this.historyCoordinator.getHistory();
  }

  /**
   * Add step to history
   */
  private addStepToHistory(step: StepWithContent, context: OperationContext): void {
    this.historyCoordinator.addStepToHistory(step, context);
  }

  /**
   * Update history entry
   */
  private updateHistoryEntry(context: OperationContext, updates: Partial<AgentHistoryEntry>): void {
    this.historyCoordinator.updateHistoryEntry(context, updates);
  }

  /**
   * Create standard timeline event
   */
  private createStandardTimelineEvent = (
    type: "agent" | "tool",
    status: EventStatus,
    data: any,
    context: OperationContext,
  ): StandardEventData => {
    return this.eventManager.createStandardTimelineEvent(type, status, data, context);
  };

  /**
   * Add tool execution event
   */
  private addToolEvent = async (
    toolCallId: string,
    status: EventStatus,
    resultData?: any,
    context?: OperationContext,
  ): Promise<void> => {
    return await this.eventManager.addToolEvent(toolCallId, status, resultData, context);
  };

  /**
   * Create event updater function
   */
  private createEventUpdater = (context: OperationContext): EventUpdater => {
    return this.eventManager.createEventUpdater(context);
  };

  /**
   * Add agent event
   */
  private addAgentEvent = (
    status: EventStatus,
    data: any,
    context: OperationContext,
  ): void => {
    this.eventManager.addAgentEvent(status, data, context);
  };

  /**
   * End OpenTelemetry tool span
   */
  private _endOtelToolSpan(
    toolCallId: string,
    resultData?: any,
    context?: OperationContext,
  ): void {
    this.eventManager.endOtelToolSpan(toolCallId, resultData, context);
  }

  /**
   * Generate a text response without streaming
   */
  async generateText(
    input: string | BaseMessage[],
    options: PublicGenerateOptions = {},
  ): Promise<InferGenerateTextResponse<TProvider>> {
    // Create operation context
    const context: OperationContext = {
      historyEntryId: createNodeId(NodeType.Event),
      userContext: new Map(),
      toolSpans: new Map(),
    };

    // Get system message and format input
    const contextMessages: BaseMessage[] = [];
    const systemMessage = await this.getSystemMessage({
      input,
      historyEntryId: context.historyEntryId,
      contextMessages,
    });
    
    const messages = await this.formatInputMessages(input, [systemMessage, ...contextMessages]);
    const tools = this.toolManager.getTools();

    // Initialize history
    const eventUpdater = this.createEventUpdater(context);
    await this.initializeHistory(input, context, eventUpdater);

    try {
      // Generate text using the generation engine
      const result = await this.generationEngine.generateText(
        messages,
        tools,
        options,
        context,
        this.addStepToHistory.bind(this),
        this.addToolEvent.bind(this),
        this._endOtelToolSpan.bind(this),
      );

      // Finalize history
      await this.historyCoordinator.finalizeHistory(context, result, "completed");

      return result;
    } catch (error) {
      // Finalize history with error
      await this.historyCoordinator.finalizeHistory(context, error, "failed");
      throw error;
    }
  }

  /**
   * Stream text generation
   */
  async streamText(
    input: string | BaseMessage[],
    options: PublicGenerateOptions = {},
  ): Promise<InferStreamTextResponse<TProvider>> {
    // Create operation context
    const context: OperationContext = {
      historyEntryId: createNodeId(NodeType.Event),
      userContext: new Map(),
      toolSpans: new Map(),
    };

    // Get system message and format input
    const contextMessages: BaseMessage[] = [];
    const systemMessage = await this.getSystemMessage({
      input,
      historyEntryId: context.historyEntryId,
      contextMessages,
    });
    
    const messages = await this.formatInputMessages(input, [systemMessage, ...contextMessages]);
    const tools = this.toolManager.getTools();

    // Initialize history
    const eventUpdater = this.createEventUpdater(context);
    await this.initializeHistory(input, context, eventUpdater);

    try {
      // Stream text using the generation engine
      const result = await this.generationEngine.streamText(
        messages,
        tools,
        options,
        context,
        this.addStepToHistory.bind(this),
        this.addToolEvent.bind(this),
        this._endOtelToolSpan.bind(this),
      );

      return result;
    } catch (error) {
      // Finalize history with error
      await this.historyCoordinator.finalizeHistory(context, error, "failed");
      throw error;
    }
  }

  /**
   * Generate a structured object response
   */
  async generateObject<T extends z.ZodType>(
    schema: T,
    input: string | BaseMessage[],
    options: PublicGenerateOptions = {},
  ): Promise<InferGenerateObjectResponse<TProvider, T>> {
    // Create operation context
    const context: OperationContext = {
      historyEntryId: createNodeId(NodeType.Event),
      userContext: new Map(),
      toolSpans: new Map(),
    };

    // Get system message and format input
    const contextMessages: BaseMessage[] = [];
    const systemMessage = await this.getSystemMessage({
      input,
      historyEntryId: context.historyEntryId,
      contextMessages,
    });
    
    const messages = await this.formatInputMessages(input, [systemMessage, ...contextMessages]);
    const tools = this.toolManager.getTools();

    // Initialize history
    const eventUpdater = this.createEventUpdater(context);
    await this.initializeHistory(input, context, eventUpdater);

    try {
      // Generate object using the generation engine
      const result = await this.generationEngine.generateObject(
        schema,
        messages,
        tools,
        options,
        context,
        this.addStepToHistory.bind(this),
        this.addToolEvent.bind(this),
        this._endOtelToolSpan.bind(this),
      );

      // Finalize history
      await this.historyCoordinator.finalizeHistory(context, result, "completed");

      return result;
    } catch (error) {
      // Finalize history with error
      await this.historyCoordinator.finalizeHistory(context, error, "failed");
      throw error;
    }
  }

  /**
   * Stream object generation
   */
  async streamObject<T extends z.ZodType>(
    schema: T,
    input: string | BaseMessage[],
    options: PublicGenerateOptions = {},
  ): Promise<InferStreamObjectResponse<TProvider, T>> {
    // Create operation context
    const context: OperationContext = {
      historyEntryId: createNodeId(NodeType.Event),
      userContext: new Map(),
      toolSpans: new Map(),
    };

    // Get system message and format input
    const contextMessages: BaseMessage[] = [];
    const systemMessage = await this.getSystemMessage({
      input,
      historyEntryId: context.historyEntryId,
      contextMessages,
    });
    
    const messages = await this.formatInputMessages(input, [systemMessage, ...contextMessages]);
    const tools = this.toolManager.getTools();

    // Initialize history
    const eventUpdater = this.createEventUpdater(context);
    await this.initializeHistory(input, context, eventUpdater);

    try {
      // Stream object using the generation engine
      const result = await this.generationEngine.streamObject(
        schema,
        messages,
        tools,
        options,
        context,
        this.addStepToHistory.bind(this),
        this.addToolEvent.bind(this),
        this._endOtelToolSpan.bind(this),
      );

      return result;
    } catch (error) {
      // Finalize history with error
      await this.historyCoordinator.finalizeHistory(context, error, "failed");
      throw error;
    }
  }

  /**
   * Add a sub-agent that this agent can delegate tasks to
   */
  public addSubAgent(agent: Agent<any>): void {
    this.subAgentManager.addSubAgent(agent);

    // Add delegate tool if this is the first sub-agent
    if (this.subAgentManager.getSubAgents().length === 1) {
      const delegateTool = this.subAgentManager.createDelegateTool({
        sourceAgent: this,
      });
      this.toolManager.addTool(delegateTool);
    }
  }

  /**
   * Remove a sub-agent
   */
  public removeSubAgent(agentId: string): void {
    this.subAgentManager.removeSubAgent(agentId);

    // Remove delegate tool if no sub-agents left
    if (this.subAgentManager.getSubAgents().length === 0) {
      this.toolManager.removeTool("delegate_task");
    }
  }

  /**
   * Get agent's tools for API exposure
   */
  public getToolsForApi() {
    // Delegate to tool manager
    return this.toolManager.getToolsForApi();
  }

  /**
   * Get all tools
   */
  public getTools(): BaseTool[] {
    // Delegate to tool manager
    return this.toolManager.getTools();
  }

  /**
   * Get agent's model name for API exposure
   */
  public getModelName(): string {
    // Delegate to the provider's standardized method
    return this.llm.getModelIdentifier(this.model);
  }

  /**
   * Get all sub-agents
   */
  public getSubAgents(): Agent<any>[] {
    return this.subAgentManager.getSubAgents();
  }

  /**
   * Unregister this agent
   */
  public unregister(): void {
    // Notify event system about agent unregistration
    AgentEventEmitter.getInstance().emitAgentUnregistered(this.id);
  }

  /**
   * Get history manager instance
   */
  public getHistoryManager(): HistoryManager {
    return this.historyCoordinator.getHistoryManager();
  }

  /**
   * Checks if telemetry (VoltAgentExporter) is configured for this agent.
   * @returns True if telemetry is configured, false otherwise.
   */
  public isTelemetryConfigured(): boolean {
    return this.historyManager.isExporterConfigured();
  }

  /**
   * Add one or more tools or toolkits to the agent.
   * Delegates to ToolManager's addItems method.
   * @returns Object containing added items (difficult to track precisely here, maybe simplify return)
   */
  addItems(items: (Tool<any> | Toolkit)[]): { added: (Tool<any> | Toolkit)[] } {
    // ToolManager handles the logic of adding tools vs toolkits and checking conflicts
    this.toolManager.addItems(items);

    // Returning the original list as 'added' might be misleading if conflicts occurred.
    // A simpler approach might be to return void or let ToolManager handle logging.
    // For now, returning the input list for basic feedback.
    return {
      added: items,
    };
  }

  /**
   * @internal
   * Internal method to set the VoltAgentExporter on the agent's HistoryManager.
   * This is typically called by the main VoltAgent instance after it has initialized its exporter.
   */
  public _INTERNAL_setVoltAgentExporter(exporter: VoltAgentExporter): void {
    if (this.historyManager) {
      this.historyManager.setExporter(exporter);
    }
  }
}
