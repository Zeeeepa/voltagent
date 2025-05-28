// Jest setup file for comprehensive CI/CD tests

import { jest } from '@jest/globals';

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.AGENTAPI_URL = 'http://localhost:8000';
process.env.CLAUDE_CODE_API_KEY = 'test-key';

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleLog = console.log;

beforeEach(() => {
  // Mock console methods
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterEach(() => {
  // Restore console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  console.log = originalConsoleLog;
  
  // Clear all mocks
  jest.clearAllMocks();
});

// Global test utilities
global.createMockPRInfo = () => ({
  url: 'https://github.com/test/repo.git',
  number: 123,
  branchName: 'feature/test',
  repository: 'repo',
  owner: 'test',
});

global.createMockTaskContext = () => ({
  taskId: 'task-123',
  title: 'Test validation',
  description: 'Test description',
  priority: 1,
  metadata: {},
});

global.createMockValidationResult = () => ({
  sessionId: 'session-123',
  status: 'success' as const,
  overallScore: 85.5,
  grade: 'B+',
  scores: {
    codeQuality: 88,
    functionality: 90,
    testing: 75,
    documentation: 80,
  },
  strengths: [
    'Well-structured code',
    'Good error handling',
  ],
  weaknesses: [
    'Missing unit tests',
    'Incomplete documentation',
  ],
  feedback: [
    {
      type: 'suggestion',
      category: 'testing',
      title: 'Add unit tests',
      message: 'Consider adding unit tests for edge cases',
      severity: 'medium' as const,
      filePath: 'src/validation.ts',
      lineNumber: 42,
      suggestions: ['Add Jest test cases', 'Mock dependencies'],
    },
  ],
  duration: 45000,
});

global.createMockWSL2Instance = () => ({
  id: 'instance-123',
  instanceName: 'test-instance',
  projectId: 'project-123',
  status: 'running' as const,
  distro: 'Ubuntu-22.04',
  basePath: '/mnt/c/projects',
  resourceLimits: {
    memory: '8GB',
    processors: 4,
    swap: '2GB',
  },
  createdAt: new Date(),
  lastUsedAt: new Date(),
  metadata: {},
});

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidURL(): R;
    }
  }
  
  var createMockPRInfo: () => any;
  var createMockTaskContext: () => any;
  var createMockValidationResult: () => any;
  var createMockWSL2Instance: () => any;
}

// Custom Jest matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
  
  toBeValidURL(received: string) {
    try {
      new URL(received);
      return {
        message: () => `expected ${received} not to be a valid URL`,
        pass: true,
      };
    } catch {
      return {
        message: () => `expected ${received} to be a valid URL`,
        pass: false,
      };
    }
  },
});

