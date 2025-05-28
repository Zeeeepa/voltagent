// Core types for Claude Code integration

export interface ClaudeCodeProviderOptions {
  apiKey?: string;
  claudeCodeConfig?: any;
}

export interface ClaudeCodeAgentOptions {
  name: string;
  instructions?: string;
  claudeCodeProvider: any;
}

export interface CodeValidationRequest {
  deploymentPath: string;
  options?: any;
}

export interface PRValidationRequest {
  prInfo: any;
  taskContext: any;
  options?: any;
}

