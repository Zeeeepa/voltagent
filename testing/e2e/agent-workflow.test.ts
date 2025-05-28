/**
 * End-to-end tests for complete agent workflows
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
  createTestAgent, 
  createMockLLMProvider, 
  createMockMemoryProvider,
  createMockTool,
  TestData,
  waitFor 
} from '../utils/test-helpers';

describe('Agent Workflow E2E', () => {
  let agent: any;
  let mockProvider: any;
  let mockMemory: any;
  let mockTool: any;

  beforeEach(() => {
    mockProvider = createMockLLMProvider();
    mockMemory = createMockMemoryProvider();
    mockTool = createMockTool('calculatorTool');
    
    agent = createTestAgent({
      provider: mockProvider,
      memory: mockMemory,
      tools: [mockTool]
    });
  });

  describe('Complete Conversation Flow', () => {
    it('should handle a complete user interaction with tool usage', async () => {
      // Simulate a user asking for a calculation
      const userMessage = TestData.message('Calculate 2 + 2 using the calculator tool');
      
      // Step 1: Store user message
      await agent.memory.addMessage(userMessage);
      
      // Step 2: Generate response with tool call
      mockProvider.generateText.mockResolvedValue({
        text: 'I\'ll calculate that for you.',
        toolCalls: [TestData.toolCall('calculatorTool', { operation: 'add', a: 2, b: 2 })],
        usage: { promptTokens: 20, completionTokens: 10 }
      });
      
      const response = await agent.provider.generateText({
        messages: [userMessage],
        model: 'test-model',
        tools: [mockTool]
      });
      
      // Step 3: Execute tool
      mockTool.execute.mockResolvedValue({ result: 4 });
      const toolResult = await mockTool.execute({ operation: 'add', a: 2, b: 2 });
      
      // Step 4: Generate final response
      const finalResponse = TestData.agentResponse('The result is 4');
      await agent.memory.addMessage(finalResponse);
      
      // Verify the complete workflow
      expect(agent.memory.addMessage).toHaveBeenCalledTimes(2);
      expect(mockProvider.generateText).toHaveBeenCalledTimes(1);
      expect(mockTool.execute).toHaveBeenCalledWith({ operation: 'add', a: 2, b: 2 });
      expect(toolResult.result).toBe(4);
    });

    it('should handle multi-turn conversations', async () => {
      const conversation = [
        TestData.message('Hello, I need help with math'),
        TestData.agentResponse('I\'d be happy to help with math! What calculation do you need?'),
        TestData.message('What is 5 * 3?'),
        TestData.agentResponse('5 * 3 = 15'),
        TestData.message('Thank you!'),
        TestData.agentResponse('You\'re welcome! Is there anything else I can help you with?')
      ];

      // Simulate the conversation
      for (const message of conversation) {
        await agent.memory.addMessage(message);
      }

      const messages = await agent.memory.getMessages();
      
      expect(messages).toHaveLength(6);
      expect(agent.memory.addMessage).toHaveBeenCalledTimes(6);
      
      // Verify conversation flow
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
      expect(messages[2].role).toBe('user');
      expect(messages[3].role).toBe('assistant');
    });
  });

  describe('Error Recovery', () => {
    it('should recover gracefully from provider errors', async () => {
      const userMessage = TestData.message('Test message');
      await agent.memory.addMessage(userMessage);
      
      // First attempt fails
      mockProvider.generateText.mockRejectedValueOnce(new Error('Provider temporarily unavailable'));
      
      // Second attempt succeeds
      mockProvider.generateText.mockResolvedValueOnce({
        text: 'Sorry for the delay, how can I help you?',
        usage: { promptTokens: 10, completionTokens: 8 }
      });

      // Simulate retry logic
      let response;
      try {
        response = await agent.provider.generateText({
          messages: [userMessage],
          model: 'test-model'
        });
      } catch (error) {
        // Retry on error
        response = await agent.provider.generateText({
          messages: [userMessage],
          model: 'test-model'
        });
      }

      expect(response.text).toBe('Sorry for the delay, how can I help you?');
      expect(mockProvider.generateText).toHaveBeenCalledTimes(2);
    });

    it('should handle tool execution failures gracefully', async () => {
      const userMessage = TestData.message('Use the calculator tool');
      await agent.memory.addMessage(userMessage);
      
      // Tool execution fails
      mockTool.execute.mockRejectedValue(new Error('Calculator service unavailable'));
      
      try {
        await mockTool.execute({ operation: 'add', a: 1, b: 1 });
      } catch (error) {
        // Handle tool error and provide fallback response
        const errorResponse = TestData.agentResponse('I\'m sorry, the calculator tool is currently unavailable. Please try again later.');
        await agent.memory.addMessage(errorResponse);
      }

      const messages = await agent.memory.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[1].content).toContain('calculator tool is currently unavailable');
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => 
        TestData.message(`Concurrent request ${i + 1}`)
      );

      // Process requests concurrently
      const promises = requests.map(async (message) => {
        await agent.memory.addMessage(message);
        return agent.provider.generateText({
          messages: [message],
          model: 'test-model'
        });
      });

      const responses = await Promise.all(promises);
      
      expect(responses).toHaveLength(5);
      expect(agent.memory.addMessage).toHaveBeenCalledTimes(5);
      expect(mockProvider.generateText).toHaveBeenCalledTimes(5);
    });

    it('should complete workflow within reasonable time', async () => {
      const startTime = Date.now();
      
      const userMessage = TestData.message('Quick test');
      await agent.memory.addMessage(userMessage);
      
      const response = await agent.provider.generateText({
        messages: [userMessage],
        model: 'test-model'
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(response).toBeDefined();
      expect(duration).toBeLessThan(1000); // Should complete within 1 second for mocked operations
    });
  });

  describe('State Management', () => {
    it('should maintain consistent state across operations', async () => {
      // Initial state
      expect(await agent.memory.getMessages()).toHaveLength(0);
      
      // Add messages and verify state
      const message1 = TestData.message('First message');
      await agent.memory.addMessage(message1);
      expect(await agent.memory.getMessages()).toHaveLength(1);
      
      const message2 = TestData.message('Second message');
      await agent.memory.addMessage(message2);
      expect(await agent.memory.getMessages()).toHaveLength(2);
      
      // Clear and verify state
      await agent.memory.clearMessages();
      expect(await agent.memory.getMessages()).toHaveLength(0);
    });
  });
});

