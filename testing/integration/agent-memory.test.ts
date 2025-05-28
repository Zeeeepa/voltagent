/**
 * Integration tests for Agent-Memory interactions
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createTestAgent, createMockMemoryProvider, TestData } from '../utils/test-helpers';

describe('Agent-Memory Integration', () => {
  let agent: any;
  let mockMemory: any;

  beforeEach(() => {
    mockMemory = createMockMemoryProvider();
    agent = createTestAgent({ memory: mockMemory });
  });

  describe('Message Storage', () => {
    it('should store and retrieve messages correctly', async () => {
      const message = TestData.message('Test message');
      
      await agent.memory.addMessage(message);
      const messages = await agent.memory.getMessages();

      expect(mockMemory.addMessage).toHaveBeenCalledWith(message);
      expect(messages).toContain(message);
    });

    it('should handle multiple messages in sequence', async () => {
      const messages = [
        TestData.message('First message'),
        TestData.agentResponse('First response'),
        TestData.message('Second message'),
        TestData.agentResponse('Second response'),
      ];

      for (const message of messages) {
        await agent.memory.addMessage(message);
      }

      const storedMessages = await agent.memory.getMessages();
      expect(storedMessages).toHaveLength(4);
      expect(mockMemory.addMessage).toHaveBeenCalledTimes(4);
    });
  });

  describe('Message Management', () => {
    it('should clear messages when requested', async () => {
      const message = TestData.message('Test message');
      await agent.memory.addMessage(message);
      
      await agent.memory.clearMessages();
      const messages = await agent.memory.getMessages();

      expect(mockMemory.clearMessages).toHaveBeenCalledTimes(1);
      expect(messages).toHaveLength(0);
    });

    it('should update existing messages', async () => {
      const messageId = 'test-message-id';
      const updatedContent = 'Updated message content';
      
      await agent.memory.updateMessage(messageId, { content: updatedContent });

      expect(mockMemory.updateMessage).toHaveBeenCalledWith(
        messageId, 
        { content: updatedContent }
      );
    });

    it('should delete specific messages', async () => {
      const messageId = 'test-message-id';
      
      await agent.memory.deleteMessage(messageId);

      expect(mockMemory.deleteMessage).toHaveBeenCalledWith(messageId);
    });
  });

  describe('Memory Persistence', () => {
    it('should maintain message order', async () => {
      const messages = [
        TestData.message('Message 1'),
        TestData.message('Message 2'),
        TestData.message('Message 3'),
      ];

      for (const message of messages) {
        await agent.memory.addMessage(message);
      }

      const storedMessages = await agent.memory.getMessages();
      
      // Verify order is maintained
      expect(storedMessages[0]).toEqual(messages[0]);
      expect(storedMessages[1]).toEqual(messages[1]);
      expect(storedMessages[2]).toEqual(messages[2]);
    });
  });
});

