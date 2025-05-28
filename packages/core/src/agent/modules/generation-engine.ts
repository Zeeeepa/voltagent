import type { z } from "zod";
import type { 
  BaseMessage,
  LLMProvider,
  StepWithContent,
  ToolExecuteOptions,
} from "../providers";
import type {
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
  VoltAgentError,
  StreamOnErrorCallback,
  StreamTextFinishResult,
  StreamTextOnFinishCallback,
  StreamObjectFinishResult,
  StreamObjectOnFinishCallback,
  StandardizedTextResult,
  StandardizedObjectResult,
} from "../types";
import type { BaseTool } from "../providers";
import type { ReasoningToolExecuteOptions } from "../../tool/reasoning/types";

/**
 * Handles text and object generation operations for agents
 */
export class GenerationEngine<TProvider extends { llm: LLMProvider<unknown> }> {
  constructor(
    private llm: ProviderInstance<TProvider>,
    private model: ModelType<TProvider>,
    private agentId: string,
    private agentName: string,
  ) {}

  /**
   * Calculate maximum steps for generation
   */
  private calculateMaxSteps(): number {
    return 25;
  }

  /**
   * Prepare text generation options
   */
  private prepareTextOptions(options: CommonGenerateOptions = {}): {
    maxSteps: number;
    experimental_continueSteps?: boolean;
  } {
    return {
      maxSteps: options.maxSteps ?? this.calculateMaxSteps(),
      experimental_continueSteps: options.experimental_continueSteps,
    };
  }

  /**
   * Prepare tools for generation with proper execution context
   */
  private prepareToolsForGeneration(
    tools: BaseTool[],
    context: OperationContext,
    addToolEvent: (toolCallId: string, status: string, resultData?: any) => Promise<void>,
    endOtelToolSpan: (toolCallId: string, resultData?: any) => void,
  ): BaseTool[] {
    return tools.map((tool) => ({
      ...tool,
      execute: async (args: unknown, execOptions?: ToolExecuteOptions): Promise<unknown> => {
        const toolCallId = execOptions?.toolCallId || crypto.randomUUID();
        
        try {
          await addToolEvent(toolCallId, "working");
          
          let result: unknown;
          if (tool.name === "think" || tool.name === "analyze") {
            const reasoningOptions: ReasoningToolExecuteOptions = {
              ...execOptions,
              agentId: this.agentId,
              agentName: this.agentName,
              historyEntryId: context.historyEntryId || "unknown",
            };
            
            if (!reasoningOptions.historyEntryId || reasoningOptions.historyEntryId === "unknown") {
              console.warn("Missing historyEntryId for reasoning tool execution");
            }
            
            result = await tool.execute(args, reasoningOptions);
          } else {
            result = await tool.execute(args, execOptions);
          }
          
          await addToolEvent(toolCallId, "completed", result);
          endOtelToolSpan(toolCallId, result);
          
          return result;
        } catch (error) {
          await addToolEvent(toolCallId, "failed", { error: error instanceof Error ? error.message : String(error) });
          endOtelToolSpan(toolCallId, { error: error instanceof Error ? error.message : String(error) });
          throw error;
        }
      },
    }));
  }

  /**
   * Generate text using the LLM
   */
  async generateText(
    messages: BaseMessage[],
    tools: BaseTool[],
    options: PublicGenerateOptions,
    context: OperationContext,
    addStepToHistory: (step: StepWithContent, context: OperationContext) => void,
    addToolEvent: (toolCallId: string, status: string, resultData?: any) => Promise<void>,
    endOtelToolSpan: (toolCallId: string, resultData?: any) => void,
  ): Promise<InferGenerateTextResponse<TProvider>> {
    const internalOptions: InternalGenerateOptions = {
      ...this.prepareTextOptions(options),
      ...options,
      provider: this.llm,
    };

    const preparedTools = this.prepareToolsForGeneration(tools, context, addToolEvent, endOtelToolSpan);

    const result = await this.llm.generateText({
      model: this.model,
      messages,
      tools: preparedTools,
      ...internalOptions,
      onStepFinish: async (step) => {
        addStepToHistory(step, context);
        if (internalOptions.provider.onStepFinish) {
          await (internalOptions.provider.onStepFinish as (step: StepWithContent) => Promise<void>)(step);
        }
      },
    });

    return result as InferGenerateTextResponse<TProvider>;
  }

  /**
   * Stream text generation
   */
  async streamText(
    messages: BaseMessage[],
    tools: BaseTool[],
    options: PublicGenerateOptions,
    context: OperationContext,
    addStepToHistory: (step: StepWithContent, context: OperationContext) => void,
    addToolEvent: (toolCallId: string, status: string, resultData?: any) => Promise<void>,
    endOtelToolSpan: (toolCallId: string, resultData?: any) => void,
  ): Promise<InferStreamTextResponse<TProvider>> {
    const internalOptions: InternalGenerateOptions = {
      ...this.prepareTextOptions(options),
      ...options,
      provider: this.llm,
    };

    const preparedTools = this.prepareToolsForGeneration(tools, context, addToolEvent, endOtelToolSpan);

    const result = await this.llm.streamText({
      model: this.model,
      messages,
      tools: preparedTools,
      ...internalOptions,
      onChunk: async (chunk: StepWithContent) => {
        if (internalOptions.onChunk) {
          await internalOptions.onChunk(chunk);
        }
      },
      onStepFinish: async (step: StepWithContent) => {
        addStepToHistory(step, context);
        if (internalOptions.provider.onStepFinish) {
          await (internalOptions.provider.onStepFinish as (step: StepWithContent) => Promise<void>)(step);
        }
      },
      onFinish: async (result: StreamTextFinishResult) => {
        if (internalOptions.provider.onFinish) {
          await (internalOptions.provider.onFinish as StreamTextOnFinishCallback)(result);
        }
      },
      onError: async (error: VoltAgentError) => {
        if (internalOptions.provider.onError) {
          await (internalOptions.provider.onError as StreamOnErrorCallback)(error);
        }
      },
    });

    return result as InferStreamTextResponse<TProvider>;
  }

  /**
   * Generate object using the LLM
   */
  async generateObject<T extends z.ZodType>(
    schema: T,
    messages: BaseMessage[],
    tools: BaseTool[],
    options: PublicGenerateOptions,
    context: OperationContext,
    addStepToHistory: (step: StepWithContent, context: OperationContext) => void,
    addToolEvent: (toolCallId: string, status: string, resultData?: any) => Promise<void>,
    endOtelToolSpan: (toolCallId: string, resultData?: any) => void,
  ): Promise<InferGenerateObjectResponse<TProvider, T>> {
    const internalOptions: InternalGenerateOptions = {
      ...this.prepareTextOptions(options),
      ...options,
      provider: this.llm,
    };

    const preparedTools = this.prepareToolsForGeneration(tools, context, addToolEvent, endOtelToolSpan);

    const result = await this.llm.generateObject({
      schema,
      model: this.model,
      messages,
      tools: preparedTools,
      ...internalOptions,
      onStepFinish: async (step) => {
        addStepToHistory(step, context);
        if (internalOptions.provider.onStepFinish) {
          await (internalOptions.provider.onStepFinish as (step: StepWithContent) => Promise<void>)(step);
        }
      },
    });

    return result as InferGenerateObjectResponse<TProvider, T>;
  }

  /**
   * Stream object generation
   */
  async streamObject<T extends z.ZodType>(
    schema: T,
    messages: BaseMessage[],
    tools: BaseTool[],
    options: PublicGenerateOptions,
    context: OperationContext,
    addStepToHistory: (step: StepWithContent, context: OperationContext) => void,
    addToolEvent: (toolCallId: string, status: string, resultData?: any) => Promise<void>,
    endOtelToolSpan: (toolCallId: string, resultData?: any) => void,
  ): Promise<InferStreamObjectResponse<TProvider, T>> {
    const internalOptions: InternalGenerateOptions = {
      ...this.prepareTextOptions(options),
      ...options,
      provider: this.llm,
    };

    const preparedTools = this.prepareToolsForGeneration(tools, context, addToolEvent, endOtelToolSpan);

    const result = await this.llm.streamObject({
      schema,
      model: this.model,
      messages,
      tools: preparedTools,
      ...internalOptions,
      onStepFinish: async (step) => {
        addStepToHistory(step, context);
        if (internalOptions.provider.onStepFinish) {
          await (internalOptions.provider.onStepFinish as (step: StepWithContent) => Promise<void>)(step);
        }
      },
      onFinish: async (result: StreamObjectFinishResult<z.infer<T>>) => {
        if (internalOptions.provider.onFinish) {
          await (internalOptions.provider.onFinish as StreamObjectOnFinishCallback<z.infer<T>>)(result);
        }
      },
      onError: async (error: VoltAgentError) => {
        if (internalOptions.provider.onError) {
          await (internalOptions.provider.onError as StreamOnErrorCallback)(error);
        }
      },
    });

    return result as InferStreamObjectResponse<TProvider, T>;
  }
}

