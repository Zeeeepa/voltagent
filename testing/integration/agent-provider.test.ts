/**
 * Integration tests for Agent-Provider interactions
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createTestAgent, createMockLLMProvider, TestData } from '../utils/test-helpers';

describe('Agent-Provider Integration', () => {
  let agent: any;
  let mockProvider: any;

  beforeEach(() => {
    mockProvider = createMockLLMProvider();
    agent = createTestAgent({ provider: mockProvider });
  });

  describe('Text Generation', () => {
    it('should successfully generate text through provider', async () => {
      const message = TestData.message('Generate a greeting');
      
      const response = await agent.provider.generateText({
        messages: [message],
        model: 'test-model',
      });

      expect(response).toBeDefined();
      expect(response.text).toBe('Mock response');
      expect(response.usage).toBeDefined();
      expect(mockProvider.generateText).toHaveBeenCalledTimes(1);
    });

    it('should handle provider errors gracefully', async () => {
      mockProvider.generateText.mockRejectedValue(new Error('Provider error'));
      
      const message = TestData.message('Test message');
      
      await expect(
        agent.provider.generateText({
          messages: [message],
          model: 'test-model',
        })
      ).rejects.toThrow('Provider error');
    });
  });

  describe('Object Generation', () => {
    it('should successfully generate structured objects', async () => {
      const message = TestData.message('Generate a JSON object');
      
      const response = await agent.provider.generateObject({
        messages: [message],
        model: 'test-model',
        schema: {
          type: 'object',
          properties: {
            result: { type: 'string' }
          }
        }
      });

      expect(response).toBeDefined();
      expect(response.object).toEqual({ result: 'mock' });
      expect(response.usage).toBeDefined();
      expect(mockProvider.generateObject).toHaveBeenCalledTimes(1);
    });
  });

  describe('Streaming', () => {
    it('should handle streaming responses correctly', async () => {
      const message = TestData.message('Stream a response');
      const chunks: any[] = [];
      
      const stream = agent.provider.generateStream({
        messages: [message],
        model: 'test-model',
      });

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      expect(chunks).toHaveLength(3);
      expect(chunks[0]).toEqual({ type: 'text-delta', textDelta: 'Mock ' });
      expect(chunks[1]).toEqual({ type: 'text-delta', textDelta: 'stream' });
      expect(chunks[2]).toEqual({ 
        type: 'finish', 
        usage: { promptTokens: 10, completionTokens: 5 } 
      });
    });
  });
});

