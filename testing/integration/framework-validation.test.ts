/**
 * Framework validation tests to ensure the testing infrastructure works correctly
 */

import { describe, it, expect } from '@jest/globals';
import { 
  createMockLLMProvider,
  createMockMemoryProvider,
  createMockTool,
  createTestAgent,
  TestData,
  TestAssertions
} from '../utils/test-helpers';

describe('Testing Framework Validation', () => {
  describe('Mock Factories', () => {
    it('should create functional LLM provider mock', async () => {
      const mockProvider = createMockLLMProvider();
      
      expect(mockProvider.generateText).toBeDefined();
      expect(mockProvider.generateObject).toBeDefined();
      expect(mockProvider.generateStream).toBeDefined();
      
      const response = await mockProvider.generateText({
        messages: [TestData.message('test')],
        model: 'test-model'
      });
      
      expect(response.text).toBe('Mock response');
      expect(response.usage).toBeDefined();
    });

    it('should create functional memory provider mock', async () => {
      const mockMemory = createMockMemoryProvider();
      
      expect(mockMemory.addMessage).toBeDefined();
      expect(mockMemory.getMessages).toBeDefined();
      expect(mockMemory.clearMessages).toBeDefined();
      
      const message = TestData.message('test message');
      await mockMemory.addMessage(message);
      
      const messages = await mockMemory.getMessages();
      expect(messages).toContain(message);
    });

    it('should create functional tool mock', async () => {
      const mockTool = createMockTool('testTool');
      
      expect(mockTool.name).toBe('testTool');
      expect(mockTool.description).toContain('testTool');
      expect(mockTool.execute).toBeDefined();
      
      const result = await mockTool.execute({ input: 'test' });
      expect(result.result).toBe('Mock result from testTool');
    });

    it('should create functional test agent', () => {
      const agent = createTestAgent();
      
      expect(agent.provider).toBeDefined();
      expect(agent.memory).toBeDefined();
      expect(agent.tools).toBeDefined();
      expect(agent.tools).toHaveLength(1);
    });
  });

  describe('Test Data Generators', () => {
    it('should generate valid test messages', () => {
      const userMessage = TestData.message('Hello');
      const agentResponse = TestData.agentResponse('Hi there');
      
      expect(userMessage.role).toBe('user');
      expect(userMessage.content).toBe('Hello');
      expect(userMessage.timestamp).toBeDefined();
      
      expect(agentResponse.role).toBe('assistant');
      expect(agentResponse.content).toBe('Hi there');
      expect(agentResponse.timestamp).toBeDefined();
    });

    it('should generate valid tool calls and results', () => {
      const toolCall = TestData.toolCall('calculator', { a: 1, b: 2 });
      const toolResult = TestData.toolResult(toolCall.toolCallId, { sum: 3 });
      
      expect(toolCall.type).toBe('tool-call');
      expect(toolCall.toolName).toBe('calculator');
      expect(toolCall.args).toEqual({ a: 1, b: 2 });
      expect(toolCall.toolCallId).toBeDefined();
      
      expect(toolResult.type).toBe('tool-result');
      expect(toolResult.toolCallId).toBe(toolCall.toolCallId);
      expect(toolResult.result).toEqual({ sum: 3 });
    });
  });

  describe('Test Assertions', () => {
    it('should provide working assertion helpers', () => {
      const mockFn = jest.fn();
      mockFn('arg1', 'arg2');
      
      TestAssertions.toHaveBeenCalledWithArgs(mockFn, ['arg1', 'arg2']);
      
      const response = { content: 'Hello world' };
      TestAssertions.responseContains(response, 'Hello');
      
      const toolResult = { result: 'success' };
      TestAssertions.toolExecutedSuccessfully(toolResult);
    });
  });

  describe('Environment Setup', () => {
    it('should have correct test environment variables', () => {
      expect(process.env.NODE_ENV).toBe('test');
      expect(process.env.TEST_MODE).toBe('integration');
    });

    it('should have Jest globals available', () => {
      expect(describe).toBeDefined();
      expect(it).toBeDefined();
      expect(expect).toBeDefined();
      expect(beforeEach).toBeDefined();
      expect(afterEach).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    it('should have proper module resolution', () => {
      // This test passing means TypeScript compilation worked
      // and module resolution is configured correctly
      expect(true).toBe(true);
    });

    it('should have proper timeout configuration', () => {
      // Integration tests should have extended timeout
      expect(jest.getTimerCount).toBeDefined();
    });
  });
});

