# VoltAgent 🚀

Open Source TypeScript AI Agent Framework with comprehensive async testing capabilities.

## Features

- **Async-First Design**: Built from the ground up for asynchronous operations
- **Comprehensive Testing**: Advanced async testing utilities and patterns
- **Agent Management**: Multi-agent coordination and lifecycle management
- **Performance Monitoring**: Built-in health checks and performance metrics
- **Error Recovery**: Robust error handling and retry mechanisms
- **TypeScript**: Full type safety and modern JavaScript features

## Quick Start

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run only async tests
npm run test:async

# Build the project
npm run build
```

## Basic Usage

```typescript
import { Agent, AgentManager } from 'voltagent';

// Create a single agent
const agent = new Agent({ name: 'my-agent', timeout: 5000 });
await agent.initialize();

const response = await agent.processRequest('Hello, world!');
console.log(response); // { success: true, data: 'Processed: Hello, world!', timestamp: ... }

// Create and manage multiple agents
const manager = new AgentManager();
await manager.createAgent({ name: 'agent-1' });
await manager.createAgent({ name: 'agent-2' });

const results = await manager.processAcrossAgents(['agent-1', 'agent-2'], 'batch request');
console.log(results); // Map with results from both agents
```

## Async Testing Features

### Custom Jest Matchers

```typescript
// Test that promises resolve within a timeout
await expect(someAsyncOperation()).toResolveWithin(1000);

// Test that promises reject within a timeout
await expect(failingOperation()).toRejectWithin(500);

// Test that values eventually equal expected values
await expect(() => getAsyncValue()).toEventuallyEqual('expected', 5000);
```

### Async Test Utilities

```typescript
import { AsyncTestUtils } from './tests/utils/async-test-utils';

// Wait for conditions
await AsyncTestUtils.waitFor(() => someCondition(), { timeout: 5000 });

// Run operations concurrently
const { results, duration, errors } = await AsyncTestUtils.runConcurrently([
  () => operation1(),
  () => operation2(),
  () => operation3()
]);

// Retry flaky operations
const result = await AsyncTestUtils.retry(
  () => flakyOperation(),
  { maxAttempts: 3, delay: 1000, backoff: 'exponential' }
);

// Create controllable promises for testing
const { promise, resolve, reject } = AsyncTestUtils.createControllablePromise();
```

## Testing Structure

```
tests/
├── setup.ts                    # Global test setup and custom matchers
├── utils/
│   ├── async-test-utils.ts     # Async testing utilities
│   └── async-test-utils.test.ts # Tests for utilities
├── agent.test.ts               # Agent class tests
├── agent-manager.test.ts       # AgentManager tests
└── integration/
    └── async-integration.test.ts # End-to-end integration tests
```

## Test Categories

### Unit Tests
- Individual component testing
- Async operation validation
- Error handling verification
- State management testing

### Integration Tests
- Multi-agent workflows
- Performance and load testing
- Error recovery scenarios
- Memory and resource management

### Performance Tests
- High concurrency handling
- Load testing with multiple agents
- Memory pressure scenarios
- Timeout and resilience testing

## Configuration

### Jest Configuration
The project uses Jest with TypeScript support and custom async testing configurations:

- **Timeout**: 30 seconds for async operations
- **Custom Matchers**: Extended Jest matchers for async testing
- **Coverage**: Comprehensive coverage reporting
- **Parallel Execution**: Optimized for concurrent test execution

### TypeScript Configuration
- **Target**: ES2020 with modern async/await support
- **Strict Mode**: Full type checking enabled
- **Path Mapping**: Convenient imports with `@/` and `@tests/` aliases

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add comprehensive async tests for new features
4. Ensure all tests pass: `npm test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

---

Built with ❤️ for the async future of AI agents.

