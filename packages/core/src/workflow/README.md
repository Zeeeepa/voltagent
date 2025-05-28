# VoltAgent Workflow Orchestration System

The VoltAgent Workflow Orchestration System provides comprehensive coordination of AI-driven CI/CD pipelines. It integrates seamlessly with the existing VoltAgent architecture to enable end-to-end workflow execution from natural language requirements to validated, production-ready code.

## Features

- **Workflow Creation and Management**: Create, start, pause, resume, and cancel workflows
- **Step-by-Step Execution**: Coordinate workflow steps with dependency management
- **State Management**: Track workflow states and transitions with comprehensive history
- **Event-Driven Architecture**: Real-time component coordination through events
- **Parallel Execution**: Support for concurrent workflow steps
- **Error Handling and Recovery**: Intelligent retry mechanisms with exponential backoff
- **Real-Time Monitoring**: Live workflow progress tracking and analytics
- **Component Integration**: Seamless integration with NLP, Codegen, and Validation engines

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Workflow Orchestrator                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  Workflow       │  │  State          │  │  Event          │  │
│  │  Engine         │  │  Manager        │  │  System         │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                    Component Integration                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐  │
│  │ NLP Engine  │  │ Codegen     │  │ Validation  │  │ Task    │  │
│  │             │  │ Integration │  │ Engine      │  │ Storage │  │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### Basic Usage

```typescript
import { createWorkflowOrchestrator } from '@voltagent/core';

// Create orchestrator
const orchestrator = createWorkflowOrchestrator({
  maxConcurrentSteps: 10,
  stepTimeout: 300000,
  enableParallelExecution: true
});

// Create and start a workflow
const workflow = await orchestrator.createWorkflow(
  "Implement user authentication system with JWT tokens",
  { 
    framework: "Express.js",
    database: "PostgreSQL",
    testing: "Jest"
  }
);

await orchestrator.startWorkflow(workflow.workflow_id);

// Monitor progress
orchestrator.on('workflow_progress', (event) => {
  console.log(`Progress: ${event.progress}% - ${event.message}`);
});

orchestrator.on('workflow_completed', (event) => {
  console.log('Workflow completed successfully!');
});
```

### With CI/CD API Server

```typescript
import { createCICDServer } from '@voltagent/core';

// Create and start CI/CD server
const server = await createCICDServer({
  port: 3000,
  nlpEngine: myNLPEngine,
  codegenIntegration: myCodegenClient,
  validationEngine: myValidationEngine
});

// Server is now running with full API endpoints
// POST /api/v1/workflows - Create workflow
// GET /api/v1/workflows/:id/status - Get status
// WebSocket /api/v1/workflows/:id/stream - Real-time updates
```

### Complete Integration

```typescript
import { VoltAgentWorkflowIntegration } from '@voltagent/core';

// Create complete integration
const integration = new VoltAgentWorkflowIntegration({
  nlpEngine: myNLPEngine,
  codegenIntegration: myCodegenClient,
  validationEngine: myValidationEngine,
  taskStorage: myTaskStorage
});

// Create and start workflow with monitoring
const { workflowId, stopMonitoring } = await integration.createAndStartWorkflow(
  "Build a REST API for user management",
  { language: "TypeScript", framework: "Express" }
);

// Get real-time status updates
const { status, unsubscribe } = await integration.getWorkflowStatusWithUpdates(
  workflowId,
  (update) => console.log('Status update:', update)
);

// Clean up when done
stopMonitoring();
unsubscribe();
```

## API Reference

### WorkflowOrchestrator

The main orchestration class that coordinates all workflow operations.

#### Methods

- `createWorkflow(requirementText, projectContext, options)` - Create a new workflow
- `startWorkflow(workflowId)` - Start workflow execution
- `getWorkflowStatus(workflowId)` - Get current workflow status
- `pauseWorkflow(workflowId)` - Pause workflow execution
- `resumeWorkflow(workflowId)` - Resume paused workflow
- `cancelWorkflow(workflowId, reason)` - Cancel workflow execution
- `getWorkflowAnalytics()` - Get system-wide analytics

#### Events

- `workflow_created` - Emitted when a workflow is created
- `workflow_started` - Emitted when a workflow starts
- `workflow_progress` - Emitted during workflow execution
- `workflow_completed` - Emitted when a workflow completes
- `workflow_failed` - Emitted when a workflow fails

### WorkflowEngine

Handles the execution of individual workflow steps.

#### Features

- Dependency resolution
- Parallel execution
- Timeout handling
- Retry mechanisms
- Error recovery

### WorkflowStateManager

Manages workflow states and transitions.

#### States

- `created` - Workflow has been created
- `initialized` - Workflow is initialized and ready
- `running` - Workflow is actively executing
- `paused` - Workflow execution is paused
- `completed` - Workflow has completed successfully
- `failed` - Workflow has failed
- `cancelled` - Workflow has been cancelled

### WorkflowEventBus

Provides event-driven communication between components.

#### Features

- Event publishing and subscription
- Event queuing and processing
- Event retention and cleanup
- Real-time notifications

## Workflow Steps

The system supports various types of workflow steps:

### Analysis Step
Analyzes natural language requirements using NLP engine.

```typescript
{
  stepType: 'analysis',
  stepName: 'Requirement Analysis',
  dependencies: [],
  inputData: { requirement_text: "..." },
  outputData: { analysis_result: {...} }
}
```

### Task Creation Step
Creates atomic tasks based on analysis results.

```typescript
{
  stepType: 'task_creation',
  stepName: 'Create Atomic Tasks',
  dependencies: ['Requirement Analysis'],
  inputData: { analysis_result: {...} },
  outputData: { created_tasks: [...] }
}
```

### Codegen Step
Generates code using the codegen integration.

```typescript
{
  stepType: 'codegen',
  stepName: 'Generate Code for Task 1',
  dependencies: ['Create Atomic Tasks'],
  inputData: { task: {...} },
  outputData: { codegen_result: {...} }
}
```

### Validation Step
Validates generated code using validation engine.

```typescript
{
  stepType: 'validation',
  stepName: 'Validate PR for Task 1',
  dependencies: ['Generate Code for Task 1'],
  inputData: { task_index: 0 },
  outputData: { validation_result: {...} }
}
```

### Completion Step
Finalizes workflow execution and gathers results.

```typescript
{
  stepType: 'completion',
  stepName: 'Workflow Completion',
  dependencies: ['Validate PR for Task 1', '...'],
  outputData: { completion_result: {...} }
}
```

## Configuration

### Environment Variables

```bash
# Workflow Orchestration
WORKFLOW_MAX_CONCURRENT_STEPS=10
WORKFLOW_STEP_TIMEOUT=300000
WORKFLOW_ENABLE_PARALLEL_EXECUTION=true
WORKFLOW_DEFAULT_MAX_RETRIES=3
WORKFLOW_RETRY_DELAY_MS=5000

# Event System
EVENT_SYSTEM_ENABLED=true
EVENT_QUEUE_SIZE=1000
EVENT_PROCESSING_BATCH_SIZE=10
EVENT_RETENTION_DAYS=30

# State Management
STATE_MANAGER_MAX_HISTORY_ENTRIES=1000
STATE_MANAGER_ENABLE_SNAPSHOTS=true
STATE_MANAGER_SNAPSHOT_INTERVAL=3600

# Monitoring
WORKFLOW_METRICS_ENABLED=true
WORKFLOW_ANALYTICS_ENABLED=true
WORKFLOW_REAL_TIME_UPDATES=true
```

### Programmatic Configuration

```typescript
const orchestrator = createWorkflowOrchestrator({
  executionOptions: {
    maxConcurrentSteps: 5,
    stepTimeout: 600000, // 10 minutes
    enableParallelExecution: true,
    retryDelay: 10000 // 10 seconds
  }
});
```

## Monitoring and Analytics

### Real-Time Monitoring

```typescript
import { WorkflowMonitor } from '@voltagent/core';

const monitor = new WorkflowMonitor();
const stopMonitoring = monitor.startMonitoring(workflowId);

// Get metrics
const metrics = monitor.getWorkflowMetrics(workflowId);
console.log('Workflow metrics:', metrics);
```

### Analytics

```typescript
const analytics = orchestrator.getWorkflowAnalytics();
console.log('System analytics:', {
  totalWorkflows: analytics.totalWorkflows,
  completedWorkflows: analytics.completedWorkflows,
  averageDuration: analytics.averageDuration,
  stepSuccessRate: analytics.stepSuccessRate
});
```

## Error Handling

The system provides comprehensive error handling:

### Automatic Retry

Steps that fail with recoverable errors are automatically retried:

```typescript
{
  retryCount: 2,
  maxRetries: 3,
  errorData: {
    error: {
      code: 'NETWORK_ERROR',
      message: 'Connection timeout',
      recoverable: true,
      retryable: true
    }
  }
}
```

### Error Recovery

Failed workflows can be recovered and resumed:

```typescript
// Check if workflow can be recovered
const workflow = await orchestrator.getWorkflowStatus(workflowId);
if (workflow.status === 'failed') {
  // Retry failed steps
  await orchestrator.resumeWorkflow(workflowId);
}
```

## Integration with VoltAgent

The workflow system integrates seamlessly with existing VoltAgent components:

### Agent Integration

```typescript
import { Agent, VoltAgentWorkflowIntegration } from '@voltagent/core';

// Create agent with workflow capabilities
const agent = new Agent({
  name: 'CI/CD Agent',
  instructions: 'Coordinate CI/CD workflows',
  llm: myLLMProvider
});

// Add workflow integration
const workflow = new VoltAgentWorkflowIntegration();
agent.addTool(workflow.createWorkflowTool());
```

### Memory Integration

Workflow state is automatically integrated with VoltAgent's memory system:

```typescript
// Workflow history is stored in agent memory
const history = agent.getHistory();
const workflowEntries = history.filter(entry => 
  entry.type === 'workflow'
);
```

## Best Practices

### 1. Workflow Design

- Keep workflows focused on single objectives
- Design steps to be atomic and idempotent
- Use clear, descriptive step names
- Define explicit dependencies

### 2. Error Handling

- Implement proper error boundaries
- Use recoverable error patterns
- Set appropriate retry limits
- Monitor error rates

### 3. Performance

- Use parallel execution for independent steps
- Set reasonable timeouts
- Monitor resource usage
- Optimize step execution order

### 4. Monitoring

- Track workflow metrics
- Set up alerting for failures
- Monitor system performance
- Use real-time dashboards

## Examples

See the `examples/` directory for complete examples:

- `basic-workflow.ts` - Simple workflow creation and execution
- `cicd-pipeline.ts` - Complete CI/CD pipeline implementation
- `monitoring-dashboard.ts` - Real-time monitoring setup
- `error-recovery.ts` - Error handling and recovery patterns

## Contributing

When contributing to the workflow system:

1. Follow the existing architecture patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Ensure backward compatibility
5. Add examples for new functionality

## License

This module is part of the VoltAgent framework and follows the same license terms.

