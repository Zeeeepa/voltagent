# Consolidated Workflow Example

This example demonstrates the unified VoltAgent workflow system that consolidates features from multiple PRs:

- **PR #27**: Parallel Execution Engine (core foundation)
- **PR #26**: Dependency Management (visualization features)
- **PR #29**: Progress Tracking (monitoring capabilities)
- **PR #30**: Synchronization Management (conflict resolution)

## Features Demonstrated

- ✅ **Unified Configuration**: Single configuration system for all components
- ✅ **Parallel Task Execution**: Execute tasks concurrently with dependency resolution
- ✅ **Dependency Visualization**: Generate Mermaid, DOT, and HTML visualizations
- ✅ **Progress Tracking**: Real-time progress monitoring and metrics
- ✅ **Synchronization**: Conflict detection and resolution
- ✅ **Builder Pattern**: Fluent API for creating tasks and workflows
- ✅ **Event System**: Comprehensive event emission for monitoring

## Quick Start

```typescript
import { createVoltAgent, createTask, createWorkflow, Priority } from '@voltagent/core';

// Create VoltAgent instance with configuration
const voltAgent = createVoltAgent({
  workflow: {
    concurrencyLimit: 5,
    defaultTimeout: 30000,
  },
  dependency: {
    enableVisualization: true,
    defaultVisualizationFormat: 'mermaid',
  },
  progress: {
    realTimeUpdates: true,
    enablePredictiveAnalytics: true,
  },
});

// Create tasks using builder pattern
const fetchDataTask = voltAgent.createTask('fetch-data', 'Fetch Data')
  .description('Fetch data from external API')
  .execute(async (input) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { data: 'fetched data' };
  })
  .priority(Priority.HIGH)
  .timeout(5000)
  .build();

const processDataTask = voltAgent.createTask('process-data', 'Process Data')
  .description('Process the fetched data')
  .execute(async (input, context) => {
    // Access results from previous tasks
    const fetchResult = context?.results?.['fetch-data'];
    return { processed: `processed ${fetchResult?.data}` };
  })
  .dependencies(['fetch-data'])
  .priority(Priority.NORMAL)
  .build();

// Create workflow
const workflow = voltAgent.createWorkflow('example-workflow', 'Example Workflow')
  .description('Demonstrates consolidated functionality')
  .addTask(fetchDataTask)
  .addTask(processDataTask)
  .concurrencyLimit(2)
  .failFast(false)
  .build();

// Execute workflow
const result = await voltAgent.runWorkflow(workflow);
console.log('Workflow completed:', result);

// Generate dependency visualization
const mermaidDiagram = voltAgent.visualizeDependencies('example-workflow', 'mermaid');
console.log('Dependency diagram:', mermaidDiagram);

// Get progress metrics
const progress = await voltAgent.getProgress('example-workflow');
console.log('Progress:', progress);
```

## Advanced Features

### Configuration Management

```typescript
import { ConfigManager, createConfigFromEnvironment } from '@voltagent/core';

// Load configuration from environment variables
const envConfig = createConfigFromEnvironment();

// Create config manager
const configManager = ConfigManager.getInstance(envConfig);

// Update configuration at runtime
configManager.updateConfig({
  workflow: {
    concurrencyLimit: 10,
  },
  progress: {
    metricCalculationInterval: 1000,
  },
});
```

### Event Monitoring

```typescript
const engine = voltAgent.getEngine();

// Listen to workflow events
engine.on('workflow:started', ({ workflowId }) => {
  console.log(`Workflow ${workflowId} started`);
});

engine.on('task:completed', ({ taskId, result }) => {
  console.log(`Task ${taskId} completed with result:`, result);
});

engine.on('milestone:updated', ({ milestone }) => {
  console.log(`Milestone ${milestone.name} updated:`, milestone.status);
});

engine.on('conflict:detected', ({ conflict }) => {
  console.log(`Conflict detected:`, conflict);
});
```

### Progress Tracking

```typescript
// Register milestones
await engine.registerMilestone({
  id: 'data-processing-complete',
  name: 'Data Processing Complete',
  workflowId: 'example-workflow',
  taskIds: ['fetch-data', 'process-data'],
  weight: 50,
});

// Update milestone status
await engine.updateMilestoneStatus('data-processing-complete', 'completed');

// Calculate various metrics
const overallProgress = await engine.calculateProgressMetric('example-workflow', 'overall_progress');
const completedTasks = await engine.calculateProgressMetric('example-workflow', 'completed_tasks');
```

### Synchronization

```typescript
// Create synchronization point
const syncPoint = engine.createSyncPoint({
  id: 'data-sync',
  name: 'Data Synchronization',
  workstreamIds: ['stream1', 'stream2', 'stream3'],
  minimumParticipants: 2,
  timeout: 30000,
});

// Wait at synchronization point
await engine.waitAtSyncPoint('data-sync', 'stream1');

// Detect and resolve conflicts
const conflict = engine.detectConflict(
  'data-sync',
  ['stream1', 'stream2'],
  'Data version mismatch',
  'data_conflict',
  'medium'
);

await engine.resolveConflict(conflict.id, 'last_wins');
```

### Dependency Visualization

```typescript
// Generate different visualization formats
const mermaidDiagram = engine.generateDependencyVisualization('example-workflow', 'mermaid');
const dotDiagram = engine.generateDependencyVisualization('example-workflow', 'dot');
const htmlVisualization = engine.generateDependencyVisualization('example-workflow', 'html');

// Save visualizations to files
import fs from 'fs';
fs.writeFileSync('workflow.mermaid', mermaidDiagram);
fs.writeFileSync('workflow.dot', dotDiagram);
fs.writeFileSync('workflow.html', htmlVisualization);
```

## Migration from Individual PRs

### From PR #27 (Parallel Execution Engine)

```typescript
// Before (PR #27)
import { createWorkflowEngine, createTask } from '@voltagent/workflow';

// After (Consolidated)
import { createVoltAgent } from '@voltagent/core';
const voltAgent = createVoltAgent();
const engine = voltAgent.getEngine();
```

### From PR #26 (Dependency Management)

```typescript
// Before (PR #26)
import { DependencyManager } from '@voltagent/dependency';

// After (Consolidated)
import { createVoltAgent } from '@voltagent/core';
const voltAgent = createVoltAgent();
// Dependency management is built into the workflow engine
```

### From PR #29 (Progress Tracking)

```typescript
// Before (PR #29)
import { Progress } from '@voltagent/progress';

// After (Consolidated)
import { createVoltAgent } from '@voltagent/core';
const voltAgent = createVoltAgent();
const progress = await voltAgent.getProgress('workflow-id');
```

### From PR #30 (Synchronization)

```typescript
// Before (PR #30)
import { SynchronizationManager } from '@voltagent/synchronization';

// After (Consolidated)
import { createVoltAgent } from '@voltagent/core';
const voltAgent = createVoltAgent();
const syncPoint = voltAgent.createSyncPoint('sync-id', 'Sync Point', ['stream1', 'stream2']);
```

## Benefits of Consolidation

1. **Reduced Complexity**: Single import instead of multiple packages
2. **Unified Configuration**: One configuration system for all features
3. **Better Integration**: Features work seamlessly together
4. **Improved Performance**: Optimized for combined usage
5. **Easier Maintenance**: Single codebase to maintain
6. **Consistent API**: Unified interface across all features
7. **Better Documentation**: Single source of truth

## Running the Example

```bash
# Install dependencies
npm install

# Run the example
npm start

# Run with custom configuration
VOLTAGENT_WORKFLOW_CONCURRENCY_LIMIT=5 npm start
```

## Next Steps

- Explore the [API Documentation](../../docs/api-reference.md)
- Check out [Advanced Examples](../advanced-workflows/)
- Read the [Migration Guide](../../docs/migration-guide.md)
- Join the [Community Discord](https://discord.gg/voltagent)

