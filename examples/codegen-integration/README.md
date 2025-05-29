# VoltAgent Codegen Integration Example

This example demonstrates how to integrate and use the Codegen SDK with VoltAgent for AI-powered code generation, review, and repository operations.

## Features Demonstrated

- **Code Generation**: Generate code from natural language prompts
- **Task Management**: Execute and monitor long-running code generation tasks
- **Code Review**: Automated code quality analysis and feedback
- **Workflow Execution**: Multi-step development workflows
- **Repository Operations**: Git operations and PR management
- **Event Handling**: Real-time progress monitoring

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your Codegen credentials:
   - Get your `CODEGEN_ORG_ID` and `CODEGEN_TOKEN` from [codegen.com/developer](https://codegen.com/developer)

3. **Run the Example**
   ```bash
   npm run dev
   ```

## Configuration Options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CODEGEN_ORG_ID` | Your organization ID (required) | - |
| `CODEGEN_TOKEN` | Your API token (required) | - |
| `CODEGEN_BASE_URL` | API base URL | `https://codegen-sh-rest-api.modal.run` |
| `CODEGEN_TIMEOUT` | Request timeout (ms) | `30000` |
| `CODEGEN_RETRIES` | Retry attempts | `3` |
| `CODEGEN_MAX_CONCURRENT_TASKS` | Max concurrent tasks | `5` |
| `CODEGEN_TASK_TIMEOUT` | Task timeout (ms) | `600000` |
| `CODEGEN_ENABLE_EVENTS` | Enable event emission | `true` |
| `CODEGEN_ENABLE_AUTO_RETRY` | Enable auto-retry | `true` |

### Configuration Presets

The example includes configuration presets for different environments:

- **Development**: Longer timeouts, fewer retries, verbose logging
- **Production**: Optimized for performance and reliability
- **Testing**: Fast timeouts, no retries, minimal caching

## Example Usage

### 1. Simple Code Generation

```typescript
import { setupCodegen } from '@voltagent/core';

const orchestrator = await setupCodegen();

const result = await orchestrator.generateCode({
  prompt: 'Create a TypeScript function that validates email addresses',
  context: {
    language: 'typescript',
    framework: 'node'
  },
  parameters: {
    style: 'documented',
    includeTypes: true,
    includeErrorHandling: true
  }
});

console.log('Generated code:', result.code);
console.log('Quality score:', result.quality.score);
```

### 2. Task Execution with Progress Monitoring

```typescript
// Set up event listeners
orchestrator.on('task_started', ({ task }) => {
  console.log(`Task started: ${task.id}`);
});

orchestrator.on('task_progress', ({ task, context }) => {
  console.log(`Progress: ${context.progress}%`);
});

orchestrator.on('task_completed', ({ task }) => {
  console.log(`Task completed: ${task.id}`);
});

// Execute task
const task = await orchestrator.executeTask({
  prompt: 'Create a React component for user authentication',
  repository: {
    url: 'https://github.com/myorg/myapp',
    branch: 'feature/auth'
  },
  parameters: {
    language: 'typescript',
    framework: 'react',
    includeTests: true
  }
});
```

### 3. Code Review

```typescript
const reviewResult = await orchestrator.reviewCode({
  code: myCodeString,
  language: 'typescript',
  criteria: {
    security: true,
    performance: true,
    maintainability: true,
    bestPractices: true,
    testCoverage: true
  }
});

console.log('Review score:', reviewResult.score);
console.log('Approved:', reviewResult.approved);
reviewResult.findings.forEach(finding => {
  console.log(`[${finding.severity}] ${finding.message}`);
});
```

### 4. Workflow Execution

```typescript
const workflow = orchestrator.createWorkflow({
  name: 'Feature Development',
  description: 'Complete feature development workflow',
  steps: [
    {
      id: 'generate_code',
      name: 'Generate Code',
      type: 'code_generation',
      parameters: { /* ... */ },
      dependencies: [],
      optional: false
    },
    {
      id: 'review_code',
      name: 'Review Code',
      type: 'code_review',
      parameters: { /* ... */ },
      dependencies: ['generate_code'],
      optional: false
    },
    {
      id: 'create_pr',
      name: 'Create PR',
      type: 'repository_operation',
      parameters: { /* ... */ },
      dependencies: ['review_code'],
      optional: false
    }
  ],
  metadata: {}
});

const execution = await orchestrator.executeWorkflow(workflow.id);
```

## Error Handling

The SDK includes comprehensive error handling:

- **Network errors**: Automatic retries with exponential backoff
- **Rate limiting**: Built-in rate limiting and quota management
- **Circuit breaker**: Prevents cascading failures
- **Validation errors**: Clear error messages for invalid inputs
- **Task failures**: Automatic retry for failed tasks (configurable)

## Monitoring and Debugging

### Health Status

```typescript
const status = orchestrator.getStatus();
console.log('Active tasks:', status.activeTasks);
console.log('Circuit breaker state:', status.health.client.circuitBreakerState);
console.log('Cache stats:', status.health.client.cacheStats);
```

### Event Monitoring

The orchestrator emits events for all operations:

- `task_started`, `task_progress`, `task_completed`, `task_failed`
- `code_generation_started`, `code_generation_completed`
- `workflow_execution_started`, `workflow_step_completed`
- `error`, `client_error`

### Logging

Set `NODE_ENV=development` for verbose logging of all operations.

## Best Practices

1. **Environment Variables**: Always use environment variables for credentials
2. **Error Handling**: Implement proper error handling for all async operations
3. **Event Listeners**: Use event listeners for real-time progress monitoring
4. **Configuration**: Use appropriate configuration presets for your environment
5. **Resource Cleanup**: Call `orchestrator.destroy()` when shutting down
6. **Rate Limiting**: Be mindful of API rate limits and quotas
7. **Caching**: Leverage built-in caching for better performance

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify your `CODEGEN_ORG_ID` and `CODEGEN_TOKEN`
   - Check that your token hasn't expired

2. **Network Timeouts**
   - Increase `CODEGEN_TIMEOUT` for slow networks
   - Check your internet connection

3. **Task Failures**
   - Review task error messages in event handlers
   - Enable auto-retry for transient failures

4. **Rate Limiting**
   - Monitor your quota usage
   - Reduce `CODEGEN_MAX_CONCURRENT_TASKS` if needed

### Debug Mode

Enable debug logging:

```bash
NODE_ENV=development npm run dev
```

This will show detailed logs of all API requests, responses, and internal operations.

## Support

For issues with the Codegen SDK integration:

1. Check the [VoltAgent documentation](https://docs.voltagent.dev)
2. Review the [Codegen API documentation](https://docs.codegen.com)
3. Open an issue on the [VoltAgent GitHub repository](https://github.com/voltagent/voltagent)

For Codegen-specific issues:
- Visit [codegen.com/support](https://codegen.com/support)
- Check your account at [codegen.com/developer](https://codegen.com/developer)

