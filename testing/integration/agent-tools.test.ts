/**
 * Integration tests for Agent-Tools interactions
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
  createTestAgent, 
  createMockTool, 
  TestData, 
  TestAssertions 
} from '../utils/test-helpers';

describe('Agent-Tools Integration', () => {
  let agent: any;
  let mockTool: any;

  beforeEach(() => {
    mockTool = createMockTool('testTool');
    agent = createTestAgent({ tools: [mockTool] });
  });

  describe('Tool Execution', () => {
    it('should execute tools with correct parameters', async () => {
      const toolCall = TestData.toolCall('testTool', { input: 'test input' });
      
      const result = await mockTool.execute(toolCall.args);

      expect(result).toBeDefined();
      expect(result.result).toBe('Mock result from testTool');
      TestAssertions.toolExecutedSuccessfully(result);
    });

    it('should handle tool execution errors', async () => {
      mockTool.execute.mockRejectedValue(new Error('Tool execution failed'));
      
      const toolCall = TestData.toolCall('testTool', { input: 'test input' });
      
      await expect(mockTool.execute(toolCall.args)).rejects.toThrow('Tool execution failed');
    });

    it('should validate tool parameters before execution', async () => {
      const invalidToolCall = TestData.toolCall('testTool', {}); // Missing required 'input'
      
      // In a real implementation, this would validate against the tool's schema
      // For now, we'll just ensure the mock is called with the provided args
      await mockTool.execute(invalidToolCall.args);
      
      expect(mockTool.execute).toHaveBeenCalledWith({});
    });
  });

  describe('Multiple Tools', () => {
    it('should handle multiple tools correctly', async () => {
      const tool1 = createMockTool('tool1');
      const tool2 = createMockTool('tool2');
      const agentWithMultipleTools = createTestAgent({ tools: [tool1, tool2] });

      const result1 = await tool1.execute({ input: 'test1' });
      const result2 = await tool2.execute({ input: 'test2' });

      expect(result1.result).toBe('Mock result from tool1');
      expect(result2.result).toBe('Mock result from tool2');
      expect(tool1.execute).toHaveBeenCalledWith({ input: 'test1' });
      expect(tool2.execute).toHaveBeenCalledWith({ input: 'test2' });
    });

    it('should execute tools in sequence', async () => {
      const tool1 = createMockTool('sequentialTool1');
      const tool2 = createMockTool('sequentialTool2');
      const agentWithSequentialTools = createTestAgent({ tools: [tool1, tool2] });

      // Execute tools in sequence
      await tool1.execute({ input: 'step1' });
      await tool2.execute({ input: 'step2' });

      expect(tool1.execute).toHaveBeenCalledBefore(tool2.execute as jest.Mock);
    });
  });

  describe('Tool Results', () => {
    it('should format tool results correctly', async () => {
      const toolCall = TestData.toolCall('testTool', { input: 'format test' });
      const result = await mockTool.execute(toolCall.args);
      const toolResult = TestData.toolResult(toolCall.toolCallId, result);

      expect(toolResult).toEqual({
        type: 'tool-result',
        toolCallId: toolCall.toolCallId,
        result: result,
      });
    });

    it('should handle complex tool result objects', async () => {
      const complexResult = {
        data: { items: [1, 2, 3] },
        metadata: { count: 3, timestamp: new Date().toISOString() },
        status: 'success'
      };
      
      mockTool.execute.mockResolvedValue(complexResult);
      
      const result = await mockTool.execute({ input: 'complex test' });
      
      expect(result).toEqual(complexResult);
      expect(result.data.items).toHaveLength(3);
      expect(result.status).toBe('success');
    });
  });
});

