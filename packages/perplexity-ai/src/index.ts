import OpenAI from 'openai';
import type { ChatCompletion, ChatCompletionChunk } from 'openai/resources';
import type {
  BaseMessage,
  GenerateObjectOptions,
  GenerateTextOptions,
  LLMProvider,
  MessageRole,
  ProviderObjectResponse,
  ProviderObjectStreamResponse,
  ProviderTextResponse,
  ProviderTextStreamResponse,
  StepWithContent,
  StreamObjectOptions,
  StreamTextOptions,
  VoltAgentError,
} from '@voltagent/core';
import type { z } from 'zod';
import type {
  PerplexityMessage,
  PerplexityProviderOptions,
  PerplexityToolCall,
  StopMessageChunk,
} from './types';
import { coreToolToPerplexity } from './utils';

export class PerplexityProvider implements LLMProvider<string> {
  private client: OpenAI;
  private model: string;

  constructor(options: PerplexityProviderOptions = {}) {
    // Use provided client or create a new one
    this.client = options.client ?? new OpenAI({
      apiKey: options.apiKey ?? process.env.PERPLEXITY_API_KEY,
      baseURL: 'https://api.perplexity.ai'
    });
    
    // Default to Perplexity's most capable model
    this.model = 'sonar-medium-online';

    // Bind methods
    this.createStepFromChunk = this.createStepFromChunk.bind(this);
    this.getModelIdentifier = this.getModelIdentifier.bind(this);
    this.toMessage = this.toMessage.bind(this);
    this.generateText = this.generateText.bind(this);
    this.streamText = this.streamText.bind(this);
    this.generateObject = this.generateObject.bind(this);
    this.streamObject = this.streamObject.bind(this);
  }

  getModelIdentifier(model: string): string {
    return model;
  }

  toMessage = (message: BaseMessage): PerplexityMessage => {
    return message as PerplexityMessage;
  };

  createStepFromChunk = (chunk: { type: string; [key: string]: any }): StepWithContent | null => {
    if (chunk.type === 'text' && chunk.text) {
      return {
        id: '',
        type: 'text',
        content: chunk.text,
        role: 'assistant' as MessageRole,
        usage: chunk.usage || undefined,
      };
    }

    if (chunk.type === 'tool-call' || chunk.type === 'tool_call') {
      return {
        id: chunk.toolCallId,
        type: 'tool_call',
        name: chunk.toolName,
        arguments: chunk.args,
        content: JSON.stringify([
          {
            type: 'tool-call',
            toolCallId: chunk.toolCallId,
            toolName: chunk.toolName,
            args: chunk.args,
          },
        ]),
        role: 'assistant' as MessageRole,
        usage: chunk.usage || undefined,
      };
    }

    if (chunk.type === 'tool-result' || chunk.type === 'tool_result') {
      return {
        id: chunk.toolCallId,
        type: 'tool_result',
        name: chunk.toolName,
        result: chunk.result,
        content: JSON.stringify([
          {
            type: 'tool-result',
            toolCallId: chunk.toolCallId,
            result: chunk.result,
          },
        ]),
        role: 'assistant' as MessageRole,
        usage: chunk.usage || undefined,
      };
    }

    return null;
  };

  private processResponseContent(content: string, toolCalls?: any[]): {
    responseText: string;
    toolCalls: PerplexityToolCall[];
  } {
    let responseText = content || '';
    const processedToolCalls: PerplexityToolCall[] = [];

    if (toolCalls && toolCalls.length > 0) {
      for (const toolCall of toolCalls) {
        processedToolCalls.push({
          type: 'tool-call',
          toolCallId: toolCall.id,
          toolName: toolCall.function.name,
          args: JSON.parse(toolCall.function.arguments),
        });
      }
    }

    return { responseText, toolCalls: processedToolCalls };
  }

  private async handleStepFinish(
    options: GenerateTextOptions<string>,
    responseText: string,
    toolCalls: PerplexityToolCall[],
    usage?: any,
  ): Promise<void> {
    if (!options.onStepFinish) return;

    if (responseText) {
      const step = this.createStepFromChunk({
        type: 'text',
        text: responseText,
        usage,
      });
      if (step) await options.onStepFinish(step);
    }

    for (const toolCall of toolCalls) {
      const step = this.createStepFromChunk({
        type: 'tool-call',
        toolCallId: toolCall.toolCallId,
        toolName: toolCall.toolName,
        args: toolCall.args,
        usage,
      });
      if (step) await options.onStepFinish(step);
    }
  }

  private createResponseObject(
    response: ChatCompletion,
    responseText: string,
    toolCalls: PerplexityToolCall[],
  ): ProviderTextResponse<any> {
    return {
      provider: response,
      text: responseText,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
      toolCalls: toolCalls,
      finishReason: response.choices[0]?.finish_reason,
    };
  }

  async generateText(options: GenerateTextOptions<string>): Promise<ProviderTextResponse<any>> {
    try {
      const perplexityMessages = options.messages.map(this.toMessage);
      const perplexityTools = options.tools ? coreToolToPerplexity(options.tools) : undefined;

      const response = await this.client.chat.completions.create({
        messages: perplexityMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        model: options.model || this.model,
        max_tokens: options.provider?.maxTokens ?? 1024,
        temperature: options.provider?.temperature ?? 0.7,
        top_p: options.provider?.topP,
        stream: false,
        tools: perplexityTools,
      });

      // Process the response content
      const { responseText, toolCalls } = this.processResponseContent(
        response.choices[0]?.message.content || '',
        response.choices[0]?.message.tool_calls
      );

      // Handle onStepFinish
      await this.handleStepFinish(options, responseText, toolCalls, response.usage);

      return this.createResponseObject(response, responseText, toolCalls);
    } catch (error) {
      console.error('Perplexity API error:', error);
      return { error: String(error) } as any;
    }
  }

  async streamText(options: StreamTextOptions<string>): Promise<ProviderTextStreamResponse<any>> {
    try {
      const perplexityMessages = options.messages.map(this.toMessage);
      const perplexityTools = options.tools ? coreToolToPerplexity(options.tools) : undefined;

      const { temperature = 0.7, maxTokens = 1024, topP } = options.provider || {};

      const response = await this.client.chat.completions.create({
        messages: perplexityMessages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        model: options.model || this.model,
        max_tokens: maxTokens,
        temperature: temperature,
        top_p: topP,
        stream: true,
        tools: perplexityTools,
      });

      const textStream = new ReadableStream({
        start: async (controller) => {
          try {
            let currentText = '';
            const currentToolCalls: PerplexityToolCall[] = [];

            for await (const chunk of response) {
              const content = chunk.choices[0]?.delta?.content;
              
              if (content) {
                currentText += content;

                const textChunk = this.createStepFromChunk({
                  type: 'text',
                  text: content,
                  usage: undefined,
                });

                controller.enqueue(content);

                if (textChunk) {
                  if (options.onChunk) {
                    options.onChunk(textChunk);
                  }

                  if (options.onStepFinish) {
                    options.onStepFinish(textChunk);
                  }
                }
              }

              // Handle tool calls in streaming
              if (chunk.choices[0]?.delta?.tool_calls) {
                for (const toolCall of chunk.choices[0].delta.tool_calls) {
                  // Only process complete tool calls
                  if (toolCall.function?.name && toolCall.function?.arguments) {
                    try {
                      const args = JSON.parse(toolCall.function.arguments);
                      const perplexityToolCall: PerplexityToolCall = {
                        type: 'tool-call',
                        toolCallId: toolCall.id || '',
                        toolName: toolCall.function.name,
                        args,
                      };

                      currentToolCalls.push(perplexityToolCall);

                      // Handle onChunk callback for tool call
                      if (options?.onChunk) {
                        const step = this.createStepFromChunk(perplexityToolCall);
                        if (step) await options.onChunk(step);
                      }

                      // Handle onStepFinish for tool call
                      if (options.onStepFinish) {
                        const step = this.createStepFromChunk(perplexityToolCall);
                        if (step) await options.onStepFinish(step);
                      }
                    } catch (e) {
                      console.warn('Error parsing tool call arguments:', e);
                    }
                  }
                }
              }

              // Handle message completion
              if (chunk.choices[0]?.finish_reason) {
                // Call onFinish with the final result
                if (options.onFinish) {
                  const finalResult = {
                    text: currentText,
                    toolCalls: currentToolCalls,
                    toolResults: [],
                    finishReason: chunk.choices[0].finish_reason,
                  };

                  await options.onFinish(finalResult);
                }

                // Close the stream
                controller.close();
              }
            }
          } catch (error) {
            const voltError: VoltAgentError = {
              message: 'Error while parsing streamed text response from Perplexity API',
              originalError: error,
            };
            // Handle errors
            if (options.onError) {
              options.onError(voltError);
            }
            controller.error(voltError);
          }
        },
      });

      return {
        provider: response,
        textStream: textStream,
      };
    } catch (error) {
      const voltError: VoltAgentError = {
        message: 'Error generating streaming text in Perplexity API',
        originalError: error,
      };
      //Handles Api Errors
      if (options.onError) {
        options.onError(voltError);
      }
      console.error('Perplexity API error:', error);
      throw voltError;
    }
  }

  async generateObject<TSchema extends z.ZodType>(
    options: GenerateObjectOptions<unknown, TSchema>,
  ): Promise<ProviderObjectResponse<any, z.infer<TSchema>>> {
    const { temperature = 0.2, maxTokens = 1024, topP } = options.provider || {};

    const perplexityMessages = options.messages.map(this.toMessage);
    const model = (options.model || this.model) as string;

    try {
      // Add a system message to ensure JSON output
      const systemMessage = {
        role: 'system',
        content: 'You must return the response in valid JSON Format with proper schema, nothing else',
      };

      // Check if there's already a system message
      const hasSystemMessage = perplexityMessages.some(msg => msg.role === 'system');
      const messagesWithSystem = hasSystemMessage 
        ? perplexityMessages 
        : [systemMessage, ...perplexityMessages];

      const response = await this.client.chat.completions.create({
        messages: messagesWithSystem.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        model: model,
        max_tokens: maxTokens,
        temperature: temperature,
        top_p: topP,
        stream: false,
      });

      const responseText = response.choices[0]?.message.content || '';

      if (responseText === '') {
        throw new Error("Perplexity didn't respond");
      }

      let parsedObject: any;
      try {
        parsedObject = JSON.parse(responseText);
      } catch (err) {
        throw new Error(`The JSON returned by Perplexity API is not valid \n ${err}`);
      }

      const parsedResult = options.schema.safeParse(parsedObject);
      if (!parsedResult.success) {
        throw new Error(
          `the response doesn't match the specified schema: ${parsedResult.error.message}`,
        );
      }

      if (options.onStepFinish) {
        const step = this.createStepFromChunk({
          type: 'text',
          text: responseText,
          usage: response.usage,
        });
        if (step) options.onStepFinish(step);
      }

      return {
        provider: response,
        object: parsedResult.data,
        usage: {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        },
        finishReason: response.choices[0]?.finish_reason,
      };
    } catch (error) {
      console.error(
        `Failed to create object ${error instanceof Error ? error.message : String(error)}`,
      );
      return { error: String(error) } as any;
    }
  }

  async streamObject<TSchema extends z.ZodType>(
    options: StreamObjectOptions<unknown, TSchema>,
  ): Promise<ProviderObjectStreamResponse<any, z.infer<TSchema>>> {
    try {
      const perplexityMessages = options.messages.map(this.toMessage);
      const model = (options.model || this.model) as string;

      const { temperature = 0.2, maxTokens = 1024, topP } = options.provider || {};

      // Add a system message to ensure JSON output
      const systemMessage = {
        role: 'system',
        content: 'You must return the response in valid JSON Format, with proper schema',
      };

      // Check if there's already a system message
      const hasSystemMessage = perplexityMessages.some(msg => msg.role === 'system');
      const messagesWithSystem = hasSystemMessage 
        ? perplexityMessages 
        : [systemMessage, ...perplexityMessages];

      const response = await this.client.chat.completions.create({
        messages: messagesWithSystem.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        model: model,
        max_tokens: maxTokens,
        temperature: temperature,
        top_p: topP,
        stream: true,
      });

      let accumulatedText = '';

      // Start processing in the background without awaiting
      const objectStream = new ReadableStream({
        start: async (controller) => {
          try {
            for await (const chunk of response) {
              const content = chunk.choices[0]?.delta?.content;
              
              if (content) {
                accumulatedText += content;

                // Try to parse partial JSON as it comes in
                try {
                  const partialObject = JSON.parse(accumulatedText);
                  const parseResult = options.schema.safeParse(partialObject);

                  if (parseResult.success) {
                    controller.enqueue(parseResult.data);
                  }
                } catch {
                  // Expected - will fail until we have valid JSON
                }
              }

              if (chunk.choices[0]?.finish_reason) {
                try {
                  const parsedObject = JSON.parse(accumulatedText);
                  const parsedResult = options.schema.safeParse(parsedObject);

                  if (parsedResult.success) {
                    controller.enqueue(parsedResult.data);

                    if (options.onFinish) {
                      await options.onFinish(parsedResult.data);
                    }

                    if (options.onStepFinish) {
                      await options.onStepFinish(parsedResult.data);
                    }
                  } else {
                    console.warn(
                      'Response does not match the specified schema:',
                      parsedResult.error.message,
                    );
                    throw new Error(`Schema validation failed: ${parsedResult.error.message}`);
                  }
                } catch (error) {
                  const voltError: VoltAgentError = {
                    message: 'Perplexity API did not return valid JSON',
                    originalError: error,
                  };
                  if (options.onError) {
                    options?.onError(voltError);
                  }
                  console.warn('Perplexity API did not return valid JSON:', accumulatedText);
                  controller.error(voltError);
                }

                // Close when done
                controller.close();
                return;
              }
            }
          } catch (error) {
            const voltError: VoltAgentError = {
              message: 'Error while parsing streamed object response in Perplexity API',
              originalError: error,
            };
            if (options.onError) {
              options.onError(voltError);
            }
            controller.error(voltError);
          }
        },
      });

      return {
        provider: response,
        objectStream,
      };
    } catch (error) {
      const voltError: VoltAgentError = {
        message: 'Error while generating streamed object from Perplexity API',
        originalError: error,
      };

      if (options.onError) {
        options.onError(voltError);
      }

      console.error(
        `Failed to create object ${error instanceof Error ? error.message : String(error)}`,
      );
      throw voltError;
    }
  }
}

// Export types
export * from './types';
export { coreToolToPerplexity } from './utils';

