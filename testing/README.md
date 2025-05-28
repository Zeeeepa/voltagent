# VoltAgent Testing Framework

## 🧪 Comprehensive Testing & Quality Assurance Consolidation

This directory contains the consolidated testing framework for VoltAgent, providing unified testing infrastructure across unit, integration, and end-to-end test scenarios.

## 📁 Directory Structure

```
testing/
├── config/                 # Jest configurations for different test types
│   ├── jest.base.config.js     # Base configuration shared across all test types
│   ├── jest.unit.config.js     # Unit test specific configuration
│   ├── jest.integration.config.js  # Integration test configuration
│   └── jest.e2e.config.js      # End-to-end test configuration
├── utils/                   # Shared testing utilities and helpers
│   ├── setup.ts                # Global test setup
│   ├── integration-setup.ts    # Integration test setup
│   ├── e2e-setup.ts            # E2E test setup
│   ├── global-setup.ts         # Global setup for all test types
│   ├── global-teardown.ts      # Global teardown for all test types
│   └── test-helpers.ts         # Shared test utilities and mock factories
├── integration/             # Integration tests
│   ├── agent-provider.test.ts  # Agent-Provider integration tests
│   ├── agent-memory.test.ts    # Agent-Memory integration tests
│   └── agent-tools.test.ts     # Agent-Tools integration tests
├── e2e/                     # End-to-end tests
│   └── agent-workflow.test.ts  # Complete agent workflow tests
├── fixtures/                # Test data and fixtures
│   └── sample-data.ts          # Sample test data and scenarios
└── reports/                 # Test reports and coverage
    └── coverage/               # Coverage reports by test type
```

## 🎯 Testing Strategy

### Three-Tier Testing Approach

1. **Unit Tests** (`packages/*/src/**/*.spec.ts`)
   - Test individual components in isolation
   - Fast execution with mocked dependencies
   - High coverage requirements (80%+)

2. **Integration Tests** (`testing/integration/`)
   - Test interactions between VoltAgent components
   - Verify package-to-package communication
   - Test with real implementations where possible

3. **End-to-End Tests** (`testing/e2e/`)
   - Test complete user workflows
   - Validate entire agent interaction patterns
   - Performance and reliability testing

## 🚀 Quick Start

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test types
pnpm test:unit           # Unit tests only
pnpm test:integration    # Integration tests only
pnpm test:e2e           # End-to-end tests only

# Run with coverage
pnpm test:coverage       # All tests with coverage
pnpm test:coverage:unit  # Unit tests with coverage

# Watch mode for development
pnpm test:watch          # Watch all tests
pnpm test:watch:unit     # Watch unit tests only
```

### Legacy Support

The framework maintains backward compatibility with existing package-level tests:

```bash
# Run legacy package-level tests
pnpm test:legacy         # All package tests
pnpm test:all           # Specific package scope tests
```

## 🛠️ Configuration

### Jest Configuration Hierarchy

1. **Base Config** (`jest.base.config.js`)
   - Shared settings across all test types
   - TypeScript support with ts-jest
   - Coverage thresholds and reporters
   - Module name mapping for monorepo

2. **Test Type Configs**
   - Unit: Fast execution, isolated testing
   - Integration: Extended timeouts, setup/teardown
   - E2E: Sequential execution, full environment

### Environment Variables

```bash
NODE_ENV=test           # Set automatically for all tests
TEST_MODE=unit|integration|e2e  # Test type identifier
LOG_LEVEL=error         # Reduced logging during tests
```

## 🧰 Testing Utilities

### Mock Factories

```typescript
import { 
  createMockLLMProvider,
  createMockMemoryProvider,
  createMockTool,
  createTestAgent 
} from '@testing/utils/test-helpers';

// Create mock components
const mockProvider = createMockLLMProvider();
const mockMemory = createMockMemoryProvider();
const mockTool = createMockTool('calculatorTool');

// Create test agent with mocks
const agent = createTestAgent({
  provider: mockProvider,
  memory: mockMemory,
  tools: [mockTool]
});
```

### Test Data Generators

```typescript
import { TestData } from '@testing/utils/test-helpers';

// Generate test messages
const userMessage = TestData.message('Hello, world!');
const agentResponse = TestData.agentResponse('Hi there!');
const toolCall = TestData.toolCall('calculator', { a: 1, b: 2 });
```

### Sample Fixtures

```typescript
import { 
  SampleMessages,
  SampleTools,
  SampleTestScenarios 
} from '@testing/fixtures/sample-data';

// Use predefined test data
const conversation = SampleTestScenarios.simpleConversation;
const weatherTool = SampleTools.weatherTool;
```

## 📊 Coverage and Quality Gates

### Coverage Thresholds

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

### Quality Gates

1. **Unit Tests**: Must pass with 80%+ coverage
2. **Integration Tests**: Must pass with component interaction validation
3. **E2E Tests**: Must pass with complete workflow validation
4. **Performance**: E2E tests must complete within reasonable timeframes

## 🔧 Development Workflow

### Adding New Tests

1. **Unit Tests**: Add `.spec.ts` files alongside source code in packages
2. **Integration Tests**: Add to `testing/integration/` directory
3. **E2E Tests**: Add to `testing/e2e/` directory

### Test Naming Conventions

- Unit tests: `component.spec.ts`
- Integration tests: `component-integration.test.ts`
- E2E tests: `workflow-name.test.ts`

### Mock Guidelines

- Use provided mock factories for consistency
- Mock external dependencies in integration tests
- Avoid mocking in E2E tests unless absolutely necessary

## 🚨 Troubleshooting

### Common Issues

1. **Module Resolution**: Ensure `@voltagent/*` and `@testing/*` aliases are configured
2. **Timeout Issues**: Increase timeout for integration/E2E tests
3. **Coverage Issues**: Check file patterns in coverage configuration

### Debug Mode

```bash
# Run tests with debug output
NODE_OPTIONS="--inspect-brk" pnpm test:unit
```

## 🔄 Migration from Legacy Tests

### Gradual Migration Strategy

1. Keep existing package-level tests functional
2. Add new tests using consolidated framework
3. Gradually migrate existing tests to new structure
4. Remove legacy configurations once migration complete

### Compatibility

- Existing Jest configurations remain functional
- New framework provides enhanced capabilities
- No breaking changes to existing test execution

## 📈 Continuous Integration

### GitHub Actions Integration

The testing framework integrates with existing CI/CD pipeline:

```yaml
- name: Run Tests
  run: |
    pnpm test:unit
    pnpm test:integration
    pnpm test:e2e
```

### Coverage Reporting

- HTML reports: `testing/reports/coverage/`
- LCOV format for CI integration
- JSON format for programmatic access

## 🎯 Best Practices

1. **Test Isolation**: Each test should be independent
2. **Clear Naming**: Descriptive test and describe block names
3. **Arrange-Act-Assert**: Follow AAA pattern
4. **Mock Appropriately**: Mock external dependencies, not internal logic
5. **Performance**: Keep unit tests fast, allow longer times for integration/E2E
6. **Cleanup**: Always clean up resources in teardown

## 🤝 Contributing

When adding new tests:

1. Follow the established directory structure
2. Use provided utilities and mock factories
3. Add appropriate documentation
4. Ensure tests pass in CI environment
5. Update this README if adding new patterns

---

This consolidated testing framework eliminates duplication, provides consistent patterns, and ensures comprehensive quality assurance across the VoltAgent ecosystem.

