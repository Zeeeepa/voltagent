// Jest setup file for PR analysis tests

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.GITHUB_TOKEN = 'test-token'
process.env.GITHUB_WEBHOOK_SECRET = 'test-secret'
process.env.LINEAR_API_KEY = 'test-linear-key'
process.env.LINEAR_TEAM_ID = 'test-team-id'
process.env.AGENTAPI_BASE_URL = 'http://localhost:8080'
process.env.AGENTAPI_KEY = 'test-agentapi-key'

// Global test timeout
jest.setTimeout(30000)

// Mock console methods in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}

