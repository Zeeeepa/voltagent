/**
 * Shared test utilities and helpers for VoltAgent testing framework
 */

import { jest } from '@jest/globals';

/**
 * Mock LLM Provider for testing
 */
export function createMockLLMProvider() {
  return {
    generateText: jest.fn().mockResolvedValue({
      text: 'Mock response',
      usage: { promptTokens: 10, completionTokens: 5 }
    }),
    generateObject: jest.fn().mockResolvedValue({
      object: { result: 'mock' },
      usage: { promptTokens: 10, completionTokens: 5 }
    }),
    generateStream: jest.fn().mockImplementation(async function* () {
      yield { type: 'text-delta', textDelta: 'Mock ' };
      yield { type: 'text-delta', textDelta: 'stream' };
      yield { type: 'finish', usage: { promptTokens: 10, completionTokens: 5 } };
    }),
  };
}

/**
 * Mock Memory Provider for testing
 */
export function createMockMemoryProvider() {
  const messages: any[] = [];
  
  return {
    addMessage: jest.fn().mockImplementation((message) => {
      messages.push(message);
      return Promise.resolve();
    }),
    getMessages: jest.fn().mockImplementation(() => Promise.resolve([...messages])),
    clearMessages: jest.fn().mockImplementation(() => {
      messages.length = 0;
      return Promise.resolve();
    }),
    updateMessage: jest.fn().mockResolvedValue(undefined),
    deleteMessage: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Mock Tool for testing
 */
export function createMockTool(name: string = 'mockTool') {
  return {
    name,
    description: `Mock tool: ${name}`,
    parameters: {
      type: 'object',
      properties: {
        input: { type: 'string', description: 'Test input' }
      },
      required: ['input']
    },
    execute: jest.fn().mockResolvedValue({ result: `Mock result from ${name}` }),
  };
}

/**
 * Wait for a condition to be true with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error(`Condition not met within ${timeout}ms`);
}

/**
 * Create a test agent with mock dependencies
 */
export function createTestAgent(options: {
  provider?: any;
  memory?: any;
  tools?: any[];
} = {}) {
  return {
    provider: options.provider || createMockLLMProvider(),
    memory: options.memory || createMockMemoryProvider(),
    tools: options.tools || [createMockTool()],
    // Add other agent properties as needed
  };
}

/**
 * Test data generators
 */
export const TestData = {
  message: (content: string = 'Test message') => ({
    role: 'user' as const,
    content,
    timestamp: new Date().toISOString(),
  }),
  
  agentResponse: (content: string = 'Test response') => ({
    role: 'assistant' as const,
    content,
    timestamp: new Date().toISOString(),
  }),
  
  toolCall: (toolName: string = 'testTool', args: any = {}) => ({
    type: 'tool-call' as const,
    toolName,
    args,
    toolCallId: `call_${Math.random().toString(36).substr(2, 9)}`,
  }),
  
  toolResult: (toolCallId: string, result: any = {}) => ({
    type: 'tool-result' as const,
    toolCallId,
    result,
  }),
};

/**
 * Assertion helpers
 */
export const TestAssertions = {
  /**
   * Assert that a mock was called with specific arguments
   */
  toHaveBeenCalledWithArgs: (mockFn: jest.Mock, expectedArgs: any[]) => {
    expect(mockFn).toHaveBeenCalledWith(...expectedArgs);
  },
  
  /**
   * Assert that an agent response contains expected content
   */
  responseContains: (response: any, expectedContent: string) => {
    expect(response.content).toContain(expectedContent);
  },
  
  /**
   * Assert that a tool was executed successfully
   */
  toolExecutedSuccessfully: (toolResult: any) => {
    expect(toolResult).toBeDefined();
    expect(toolResult.error).toBeUndefined();
  },
};

export default {
  createMockLLMProvider,
  createMockMemoryProvider,
  createMockTool,
  createTestAgent,
  waitFor,
  TestData,
  TestAssertions,
};

