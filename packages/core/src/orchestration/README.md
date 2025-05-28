# VoltAgent Workflow Orchestration Engine

A unified workflow orchestration system that consolidates workflow and task management into a single cohesive engine, building upon VoltAgent's existing SubAgentManager while providing advanced orchestration capabilities.

## 🎯 Overview

The Workflow Orchestration Engine addresses the need for sophisticated workflow management in VoltAgent by providing:

- **Multiple Execution Modes**: Sequential, parallel, conditional, pipeline, and graph-based execution
- **Advanced Task Scheduling**: Intelligent queuing, dependency management, and resource allocation
- **State Management**: Workflow persistence, recovery, and monitoring
- **Comprehensive Validation**: Pre-execution validation and runtime error handling
- **Event-Driven Architecture**: Real-time monitoring and observability
- **Backward Compatibility**: Seamless integration with existing SubAgentManager

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Workflow Orchestration Engine               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Workflow      │  │   Task          │  │   State      │ │
│  │   Engine        │  │   Scheduler     │  │   Manager    │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐ │
│  │   Validator     │  │   Integration   │  │   Events     │ │
│  │                 │  │   Layer         │  │   System     │ │
│  └─────────────────┘  └─────────────────┘  └──────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    SubAgentManager                          │
│                   (Backward Compatible)                     │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { 
  WorkflowOrchestrationEngine, 
  WorkflowDefinition,
  createSequentialWorkflow 
} from '@voltagent/core/orchestration';

// Create orchestration engine with agents
const engine = new WorkflowOrchestrationEngine([agent1, agent2, agent3]);
await engine.start();

// Define a simple workflow
const workflow = createSequentialWorkflow('data-processing', 'Data Processing', [
  {
    id: 'extract',
    name: 'Extract Data',
    agentName: 'DataExtractor',
    input: 'Extract data from database'
  },
  {
    id: 'transform',
    name: 'Transform Data', 
    agentName: 'DataTransformer',
    input: 'Transform extracted data'
  }
]);

// Register and execute
await engine.registerWorkflow(workflow);
const result = await engine.executeWorkflow('data-processing');
console.log('Workflow completed:', result.status);
```

### Advanced Workflow Definition

```typescript
const advancedWorkflow: WorkflowDefinition = {
  id: 'advanced-processing',
  name: 'Advanced Data Processing',
  version: '1.0.0',
  mode: 'graph', // Dependency-based execution
  tasks: [
    {
      id: 'validate',
      name: 'Validate Input',
      agentName: 'DataValidator',
      input: 'Validate incoming data',
      timeout: 30000,
      retries: 2
    },
    {
      id: 'extract',
      name: 'Extract Data',
      agentName: 'DataExtractor', 
      input: 'Extract validated data',
      dependencies: ['validate']
    },
    {
      id: 'analyze',
      name: 'Analyze Quality',
      agentName: 'QualityAnalyzer',
      input: 'Analyze data quality',
      dependencies: ['extract']
    },
    {
      id: 'process-good',
      name: 'Process High Quality Data',
      agentName: 'DataProcessor',
      input: 'Process high quality data',
      dependencies: ['analyze'],
      conditions: [{
        type: 'result',
        taskId: 'analyze',
        operator: 'contains',
        value: 'high_quality'
      }]
    },
    {
      id: 'clean-bad',
      name: 'Clean Low Quality Data',
      agentName: 'DataCleaner',
      input: 'Clean low quality data',
      dependencies: ['analyze'],
      conditions: [{
        type: 'result',
        taskId: 'analyze',
        operator: 'contains',
        value: 'low_quality'
      }]
    }
  ],
  retryPolicy: {
    maxRetries: 3,
    backoffStrategy: 'exponential',
    baseDelay: 1000,
    maxDelay: 30000
  },
  errorHandling: {
    onTaskFailure: 'continue',
    onWorkflowFailure: 'partial_complete'
  }
};
```

## 📋 Execution Modes

### 1. Sequential Mode
Tasks execute one after another in order.

```typescript
const sequentialWorkflow = createSequentialWorkflow('seq-workflow', 'Sequential Processing', [
  { id: 'step1', name: 'First Step', agentName: 'Agent1', input: 'Do step 1' },
  { id: 'step2', name: 'Second Step', agentName: 'Agent2', input: 'Do step 2' },
  { id: 'step3', name: 'Third Step', agentName: 'Agent3', input: 'Do step 3' }
]);
```

### 2. Parallel Mode
All tasks execute simultaneously.

```typescript
const parallelWorkflow = createParallelWorkflow('par-workflow', 'Parallel Processing', [
  { id: 'task1', name: 'Task 1', agentName: 'Agent1', input: 'Process batch 1' },
  { id: 'task2', name: 'Task 2', agentName: 'Agent2', input: 'Process batch 2' },
  { id: 'task3', name: 'Task 3', agentName: 'Agent3', input: 'Process batch 3' }
]);
```

### 3. Pipeline Mode
Tasks execute sequentially with data flowing between them.

```typescript
const pipelineWorkflow = createPipelineWorkflow('pipe-workflow', 'Data Pipeline', [
  { id: 'extract', name: 'Extract', agentName: 'Extractor', input: 'Extract raw data' },
  { id: 'transform', name: 'Transform', agentName: 'Transformer', input: 'Transform data' },
  { id: 'load', name: 'Load', agentName: 'Loader', input: 'Load processed data' }
]);
```

### 4. Graph Mode
Tasks execute based on dependency relationships.

```typescript
const graphWorkflow = createGraphWorkflow('graph-workflow', 'Dependency Graph', [
  { id: 'init', name: 'Initialize', agentName: 'Initializer', input: 'Initialize system' },
  { 
    id: 'process1', 
    name: 'Process 1', 
    agentName: 'Processor1', 
    input: 'Process type 1',
    dependencies: ['init']
  },
  { 
    id: 'process2', 
    name: 'Process 2', 
    agentName: 'Processor2', 
    input: 'Process type 2',
    dependencies: ['init']
  },
  { 
    id: 'finalize', 
    name: 'Finalize', 
    agentName: 'Finalizer', 
    input: 'Finalize results',
    dependencies: ['process1', 'process2']
  }
]);
```

### 5. Conditional Mode
Tasks execute based on runtime conditions.

```typescript
const conditionalWorkflow: WorkflowDefinition = {
  id: 'conditional-workflow',
  name: 'Conditional Processing',
  version: '1.0.0',
  mode: 'conditional',
  tasks: [
    {
      id: 'check',
      name: 'Check Condition',
      agentName: 'Checker',
      input: 'Check system status'
    },
    {
      id: 'action-a',
      name: 'Action A',
      agentName: 'ProcessorA',
      input: 'Execute action A',
      conditions: [{
        type: 'result',
        taskId: 'check',
        operator: 'equals',
        value: 'condition_a_met'
      }]
    },
    {
      id: 'action-b',
      name: 'Action B',
      agentName: 'ProcessorB',
      input: 'Execute action B',
      conditions: [{
        type: 'result',
        taskId: 'check',
        operator: 'equals',
        value: 'condition_b_met'
      }]
    }
  ]
};
```

## 🔧 Configuration

### Engine Configuration

```typescript
const engine = new WorkflowOrchestrationEngine(agents, {
  maxConcurrentWorkflows: 10,    // Maximum concurrent workflows
  maxConcurrentTasks: 50,        // Maximum concurrent tasks
  persistenceEnabled: true       // Enable state persistence
});
```

### Retry Policies

```typescript
const retryPolicy: RetryPolicy = {
  maxRetries: 3,
  backoffStrategy: 'exponential', // 'linear', 'exponential', 'fixed'
  baseDelay: 1000,               // Base delay in milliseconds
  maxDelay: 30000,               // Maximum delay for exponential backoff
  retryableErrors: ['TIMEOUT', 'NETWORK_ERROR'] // Specific errors to retry
};
```

### Error Handling

```typescript
const errorHandling: ErrorHandlingStrategy = {
  onTaskFailure: 'continue',        // 'stop', 'continue', 'retry', 'skip_dependents'
  onWorkflowFailure: 'partial_complete', // 'stop', 'rollback', 'partial_complete'
  errorNotification: true,
  customErrorHandler: async (error, context) => {
    console.log('Custom error handling:', error.message);
    // Custom error handling logic
  }
};
```

## 📊 Monitoring and Events

### Event Handling

```typescript
engine.onWorkflowEvent((event) => {
  console.log(`Event: ${event.type}`, {
    workflowId: event.workflowId,
    executionId: event.executionId,
    taskId: event.taskId,
    timestamp: event.timestamp,
    data: event.data
  });
});

// Event types:
// - workflow_started
// - workflow_completed  
// - workflow_failed
// - task_started
// - task_completed
// - task_failed
// - task_retried
```

### Execution Status

```typescript
// Get current execution status
const status = await engine.getExecutionStatus(executionId);
console.log('Current status:', status?.status);
console.log('Completed tasks:', status?.taskResults.size);

// Get execution history
const history = await engine.getExecutionHistory('workflow-id', 10);
console.log('Recent executions:', history.length);
```

## 🔄 Integration with SubAgentManager

The orchestration engine provides seamless backward compatibility with existing SubAgentManager usage:

```typescript
import { OrchestrationIntegration } from '@voltagent/core/orchestration/integration';

// Create integration layer
const integration = new OrchestrationIntegration(
  parentAgent,
  subAgentManager,
  orchestrationEngine
);

await integration.start();

// Enhanced delegate task with orchestration capabilities
const result = await integration.enhancedDelegateTask({
  task: 'Process complex data',
  targetAgents: ['Agent1', 'Agent2', 'Agent3'],
  useOrchestration: true,      // Auto-detect or force orchestration
  executionMode: 'parallel',   // Execution mode for orchestration
  timeout: 60000,
  retries: 2
});

// Create workflow-aware delegate tool
const enhancedTool = integration.createEnhancedDelegateTool();
```

## 🧪 Testing

### Unit Tests

```typescript
import { WorkflowOrchestrationEngine } from '@voltagent/core/orchestration';

describe('Workflow Orchestration', () => {
  let engine: WorkflowOrchestrationEngine;
  
  beforeEach(async () => {
    engine = new WorkflowOrchestrationEngine(mockAgents);
    await engine.start();
  });
  
  afterEach(async () => {
    await engine.stop();
  });
  
  it('should execute sequential workflow', async () => {
    const workflow = createSequentialWorkflow('test', 'Test', tasks);
    await engine.registerWorkflow(workflow);
    
    const result = await engine.executeWorkflow('test');
    expect(result.status).toBe('completed');
  });
});
```

### Dry Run Testing

```typescript
// Validate workflow without execution
const result = await engine.executeWorkflow('workflow-id', {}, { 
  dryRun: true 
});

console.log('Validation result:', result.status);
console.log('Would execute tasks:', result.taskResults.length);
```

## 🔍 Validation

The orchestration engine includes comprehensive validation:

```typescript
import { WorkflowValidator } from '@voltagent/core/orchestration';

const validator = new WorkflowValidator();

// Validate workflow definition
const validation = await validator.validateWorkflow(workflow, availableAgents);

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
  console.warn('Validation warnings:', validation.warnings);
}

// Validate agent compatibility
const compatibility = validator.validateAgentCompatibility(workflow, agent);
```

## 💾 State Management

### Persistence Configuration

```typescript
// Enable persistence for workflow recovery
const engine = new WorkflowOrchestrationEngine(agents, {
  persistenceEnabled: true
});

// State is automatically saved to:
// - Browser: localStorage
// - Node.js: .voltagent/workflow-state/ directory
```

### Manual State Operations

```typescript
import { WorkflowStateManager } from '@voltagent/core/orchestration';

const stateManager = new WorkflowStateManager(true);

// Save workflow state
await stateManager.saveWorkflowState(context);

// Load workflow state
const context = await stateManager.loadWorkflowState(executionId);

// List active workflows
const activeWorkflows = await stateManager.listActiveWorkflows();

// Get storage statistics
const stats = await stateManager.getStorageStats();
console.log('Storage usage:', stats);
```

## 🎛️ Advanced Features

### Custom Conditions

```typescript
const customCondition: TaskCondition = {
  type: 'custom',
  operator: 'equals',
  value: true,
  customEvaluator: (context) => {
    // Custom logic to determine if task should execute
    const previousResult = context.taskResults.get('previous-task');
    return previousResult?.result?.includes('success');
  }
};
```

### Workflow Composition

```typescript
// Compose complex workflows from simpler ones
const subWorkflow1 = createSequentialWorkflow('sub1', 'Sub Workflow 1', tasks1);
const subWorkflow2 = createParallelWorkflow('sub2', 'Sub Workflow 2', tasks2);

const compositeWorkflow: WorkflowDefinition = {
  id: 'composite',
  name: 'Composite Workflow',
  version: '1.0.0',
  mode: 'graph',
  tasks: [
    // Tasks that reference sub-workflows
    {
      id: 'execute-sub1',
      name: 'Execute Sub Workflow 1',
      agentName: 'WorkflowExecutor',
      input: JSON.stringify({ workflowId: 'sub1', input: {} })
    },
    {
      id: 'execute-sub2',
      name: 'Execute Sub Workflow 2', 
      agentName: 'WorkflowExecutor',
      input: JSON.stringify({ workflowId: 'sub2', input: {} }),
      dependencies: ['execute-sub1']
    }
  ]
};
```

## 📈 Performance Considerations

### Resource Management

- **Concurrent Limits**: Configure `maxConcurrentWorkflows` and `maxConcurrentTasks` based on system resources
- **Memory Usage**: Monitor workflow state size, especially for long-running workflows
- **Persistence Overhead**: Consider disabling persistence for short-lived workflows

### Optimization Tips

1. **Use Parallel Mode** for independent tasks to maximize throughput
2. **Implement Timeouts** to prevent stuck workflows
3. **Configure Retry Policies** appropriately to balance reliability and performance
4. **Monitor Event Volume** in high-frequency scenarios
5. **Clean Up State** regularly for long-running systems

## 🔧 Troubleshooting

### Common Issues

1. **Circular Dependencies**: Use the validator to detect dependency cycles
2. **Agent Not Found**: Ensure all referenced agents are registered
3. **Memory Leaks**: Monitor state manager and clean up completed workflows
4. **Performance Issues**: Check concurrent limits and task complexity

### Debug Mode

```typescript
// Enable detailed logging
process.env.VOLTAGENT_DEBUG = 'orchestration';

// Monitor events for debugging
engine.onWorkflowEvent((event) => {
  if (event.type.includes('failed')) {
    console.error('Failure event:', event);
  }
});
```

## 🚀 Migration Guide

### From SubAgentManager

1. **Identify Patterns**: Analyze existing delegate_task usage
2. **Create Workflows**: Convert complex delegations to workflow definitions
3. **Use Integration Layer**: Leverage OrchestrationIntegration for gradual migration
4. **Test Thoroughly**: Validate behavior matches existing functionality

### Example Migration

```typescript
// Before: Simple delegation
const results = await subAgentManager.handoffToMultiple({
  task: 'Process data',
  targetAgents: [agent1, agent2, agent3]
});

// After: Workflow orchestration
const workflow = createParallelWorkflow('data-processing', 'Process Data', [
  { id: 'task1', name: 'Process 1', agentName: 'Agent1', input: 'Process data part 1' },
  { id: 'task2', name: 'Process 2', agentName: 'Agent2', input: 'Process data part 2' },
  { id: 'task3', name: 'Process 3', agentName: 'Agent3', input: 'Process data part 3' }
]);

await engine.registerWorkflow(workflow);
const result = await engine.executeWorkflow('data-processing');
```

## 📚 API Reference

See the TypeScript definitions in `types.ts` for complete API documentation.

## 🤝 Contributing

When contributing to the orchestration engine:

1. **Add Tests**: Include comprehensive test coverage
2. **Update Documentation**: Keep README and code comments current
3. **Validate Backward Compatibility**: Ensure SubAgentManager integration works
4. **Performance Testing**: Validate performance with realistic workloads
5. **Error Handling**: Implement robust error handling and recovery

