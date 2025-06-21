import type { ChatCompletion } from 'openai/resources';

export interface PerplexityProviderOptions {
  /**
   * Perplexity API key
   */
  apiKey?: string;
  
  /**
   * Optional pre-configured OpenAI client for Perplexity
   * Used primarily for testing
   */
  client?: any;
}

export interface PerplexityToolCall {
  type: 'tool-call';
  toolCallId: string;
  toolName: string;
  args: Record<string, any>;
}

export interface PerplexityTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
      [k: string]: unknown;
    };
  };
}

export interface PerplexityMessage {
  role: 'assistant' | 'user' | 'system';
  content: string;
  tool_calls?: PerplexityToolCall[];
}

export interface StopMessageChunk {
  type: 'message_stop';
  message: ChatCompletion;
}

