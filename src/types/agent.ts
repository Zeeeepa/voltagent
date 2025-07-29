import { BaseConfig, LogLevelType } from './common';

export interface AgentConfig extends BaseConfig {
  name: string;
  description?: string;
  model?: string;
  provider?: 'openai' | 'anthropic' | 'custom';
  logLevel?: LogLevelType;
}

export interface AgentOptions {
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AgentResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

