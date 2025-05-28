/**
 * Sample test data and fixtures for VoltAgent testing
 */

export const SampleMessages = {
  userGreeting: {
    role: 'user' as const,
    content: 'Hello, how are you?',
    timestamp: '2024-01-01T00:00:00.000Z',
  },
  
  agentGreeting: {
    role: 'assistant' as const,
    content: 'Hello! I\'m doing well, thank you for asking. How can I help you today?',
    timestamp: '2024-01-01T00:00:01.000Z',
  },
  
  userQuestion: {
    role: 'user' as const,
    content: 'What is the weather like today?',
    timestamp: '2024-01-01T00:00:02.000Z',
  },
  
  agentToolResponse: {
    role: 'assistant' as const,
    content: 'Let me check the weather for you.',
    timestamp: '2024-01-01T00:00:03.000Z',
    toolCalls: [{
      type: 'tool-call',
      toolName: 'getWeather',
      args: { location: 'current' },
      toolCallId: 'call_weather_001',
    }],
  },
};

export const SampleTools = {
  weatherTool: {
    name: 'getWeather',
    description: 'Get current weather information',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'Location to get weather for',
        },
      },
      required: ['location'],
    },
  },
  
  calculatorTool: {
    name: 'calculator',
    description: 'Perform mathematical calculations',
    parameters: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['add', 'subtract', 'multiply', 'divide'],
          description: 'Mathematical operation to perform',
        },
        a: {
          type: 'number',
          description: 'First number',
        },
        b: {
          type: 'number',
          description: 'Second number',
        },
      },
      required: ['operation', 'a', 'b'],
    },
  },
  
  searchTool: {
    name: 'webSearch',
    description: 'Search the web for information',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results',
          default: 10,
        },
      },
      required: ['query'],
    },
  },
};

export const SampleProviderResponses = {
  textResponse: {
    text: 'This is a sample text response from the LLM provider.',
    usage: {
      promptTokens: 15,
      completionTokens: 12,
      totalTokens: 27,
    },
  },
  
  objectResponse: {
    object: {
      intent: 'greeting',
      confidence: 0.95,
      entities: [],
    },
    usage: {
      promptTokens: 20,
      completionTokens: 8,
      totalTokens: 28,
    },
  },
  
  streamChunks: [
    { type: 'text-delta', textDelta: 'Hello' },
    { type: 'text-delta', textDelta: ' there!' },
    { type: 'text-delta', textDelta: ' How' },
    { type: 'text-delta', textDelta: ' can' },
    { type: 'text-delta', textDelta: ' I' },
    { type: 'text-delta', textDelta: ' help?' },
    { 
      type: 'finish', 
      usage: { 
        promptTokens: 10, 
        completionTokens: 6, 
        totalTokens: 16 
      } 
    },
  ],
};

export const SampleConfigurations = {
  basicAgent: {
    model: 'test-model',
    temperature: 0.7,
    maxTokens: 1000,
    systemPrompt: 'You are a helpful AI assistant.',
  },
  
  toolEnabledAgent: {
    model: 'test-model',
    temperature: 0.5,
    maxTokens: 2000,
    systemPrompt: 'You are an AI assistant with access to tools.',
    tools: [SampleTools.calculatorTool, SampleTools.weatherTool],
  },
  
  memoryEnabledAgent: {
    model: 'test-model',
    temperature: 0.8,
    maxTokens: 1500,
    systemPrompt: 'You are an AI assistant with memory capabilities.',
    memory: {
      type: 'in-memory',
      maxMessages: 100,
    },
  },
};

export const SampleErrors = {
  providerError: new Error('LLM provider is temporarily unavailable'),
  toolError: new Error('Tool execution failed'),
  memoryError: new Error('Memory storage error'),
  validationError: new Error('Invalid input parameters'),
  timeoutError: new Error('Request timeout'),
  rateLimitError: new Error('Rate limit exceeded'),
};

export const SampleTestScenarios = {
  simpleConversation: [
    SampleMessages.userGreeting,
    SampleMessages.agentGreeting,
    SampleMessages.userQuestion,
  ],
  
  toolUsageScenario: [
    {
      role: 'user' as const,
      content: 'Calculate 15 + 27',
      timestamp: '2024-01-01T00:00:00.000Z',
    },
    {
      role: 'assistant' as const,
      content: 'I\'ll calculate that for you.',
      timestamp: '2024-01-01T00:00:01.000Z',
      toolCalls: [{
        type: 'tool-call',
        toolName: 'calculator',
        args: { operation: 'add', a: 15, b: 27 },
        toolCallId: 'call_calc_001',
      }],
    },
    {
      type: 'tool-result',
      toolCallId: 'call_calc_001',
      result: { answer: 42 },
    },
    {
      role: 'assistant' as const,
      content: 'The result of 15 + 27 is 42.',
      timestamp: '2024-01-01T00:00:02.000Z',
    },
  ],
  
  errorRecoveryScenario: [
    {
      role: 'user' as const,
      content: 'Get the weather',
      timestamp: '2024-01-01T00:00:00.000Z',
    },
    {
      role: 'assistant' as const,
      content: 'I\'m sorry, the weather service is currently unavailable. Please try again later.',
      timestamp: '2024-01-01T00:00:01.000Z',
    },
  ],
};

export default {
  SampleMessages,
  SampleTools,
  SampleProviderResponses,
  SampleConfigurations,
  SampleErrors,
  SampleTestScenarios,
};

