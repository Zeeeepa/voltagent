# Task Management Migration Guide

This guide helps you transition from the original or new task management implementations to the consolidated system.

## Overview

The consolidated task management system combines the best features of both the original and new implementations, providing:

- Modular, plugin-based architecture
- Comprehensive resource monitoring and auto-shutdown
- Advanced error handling and retry mechanisms
- Task dependencies and priorities
- Cross-source analysis capabilities
- Better separation of concerns
- Improved code maintainability and extensibility

## Migration from Original Task Management

If you're using the original task management system (`run_task.py`), follow these steps:

### Step 1: Import the Consolidated System

```typescript
// Before
import { runTask, registerTask } from '@voltagent/core/task/run-task';

// After
import { createConsolidatedTaskRunner } from '@voltagent/core/task/run-task-consolidated';

const taskRunner = createConsolidatedTaskRunner();
```

### Step 2: Update Task Registration

```typescript
// Before
registerTask('processData', async (data) => {
  // Process data
  return result;
});

// After
taskRunner.registerTask(
  'processData',
  'Process Data Task',
  async (data) => {
    // Process data
    return result;
  },
  {
    priority: 'medium',
    retries: 1
  }
);
```

### Step 3: Update Task Execution

```typescript
// Before
const result = await runTask('processData', inputData);

// After
const result = await taskRunner.executeTask('processData', inputData);
```

### Step 4: Use Adapter for Gradual Migration

If you need to maintain backward compatibility during migration:

```typescript
// Use the original API adapter
const { originalAdapter } = createConsolidatedTaskRunner();

// Register using original API
originalAdapter.registerTask('processData', async (data) => {
  // Process data
  return result;
});

// Execute using original API
const result = await originalAdapter.runTask('processData', inputData);
```

## Migration from New Task Management

If you're using the new task management system (`run_task_new.py`), follow these steps:

### Step 1: Import the Consolidated System

```typescript
// Before
import { executeTask, addTask } from '@voltagent/core/task/run-task-new';

// After
import { createConsolidatedTaskRunner } from '@voltagent/core/task/run-task-consolidated';

const taskRunner = createConsolidatedTaskRunner();
```

### Step 2: Update Task Registration

```typescript
// Before
addTask('analyzeData', async (config) => {
  // Analyze data
  return analysis;
}, {
  priority: 2,
  dependencies: ['fetchData']
});

// After
taskRunner.registerTask(
  'analyzeData',
  'Analyze Data Task',
  async (config) => {
    // Analyze data
    return analysis;
  },
  {
    priority: 'high', // equivalent to 2 in the new system
    dependencies: ['fetchData']
  }
);
```

### Step 3: Update Task Execution

```typescript
// Before
const analysis = await executeTask('analyzeData', config);

// After
const analysis = await taskRunner.executeTask('analyzeData', config);
```

### Step 4: Use Adapter for Gradual Migration

If you need to maintain backward compatibility during migration:

```typescript
// Use the new API adapter
const { newAdapter } = createConsolidatedTaskRunner();

// Register using new API
newAdapter.addTask('analyzeData', async (config) => {
  // Analyze data
  return analysis;
}, {
  priority: 2,
  dependencies: ['fetchData']
});

// Execute using new API
const analysis = await newAdapter.executeTask('analyzeData', config);
```

## Advanced Features

The consolidated system offers several advanced features:

### Resource Monitoring

```typescript
const taskRunner = createConsolidatedTaskRunner({
  monitorResources: true
});

// Access the resource monitor
const { taskManager } = taskRunner;
const { resourceMonitor } = taskManager;

// Set custom thresholds
resourceMonitor.setWarningThreshold('memory', 75);
resourceMonitor.setCriticalThreshold('memory', 90);

// Register callbacks
resourceMonitor.onWarningResource((resource, value) => {
  console.warn(`Resource ${resource} at ${value}% (warning)`);
});
```

### Thread Pool Management

```typescript
const { taskManager } = taskRunner;
const { threadPoolManager } = taskManager;

// Adjust pool size based on workload
threadPoolManager.increasePoolSize(2);
```

### Plugin System

```typescript
const { taskManager } = taskRunner;
const { pluginManager } = taskManager;

// Register a plugin
pluginManager.registerPlugin({
  id: 'metrics-plugin',
  name: 'Metrics Plugin',
  version: '1.0.0',
  initialize: async () => {
    // Set up metrics collection
  },
  shutdown: async () => {
    // Clean up
  },
  recordMetric: (name, value) => {
    // Record a metric
  }
}, {
  autoInitialize: true
});

// Use the plugin
const metricsPlugin = pluginManager.getPlugin('metrics-plugin');
metricsPlugin.recordMetric('task_execution_time', 150);
```

### Task Monitoring

```typescript
const { taskManager } = taskRunner;
const { taskMonitor } = taskManager;

// Get task status
const status = taskMonitor.getTaskStatus('processData');

// Get task metrics
const metrics = taskMonitor.getTaskMetrics('processData');
console.log(`Task duration: ${metrics.duration}ms`);

// Generate a report
const report = taskMonitor.generateReport();
console.log(`Total tasks: ${report.summary.total}`);
console.log(`Completed tasks: ${report.summary.completed}`);
```

## Best Practices

1. **Use Descriptive Task IDs**: Choose clear, descriptive task IDs that indicate the purpose of the task.

2. **Set Appropriate Priorities**: Use priorities to ensure critical tasks are executed first.

3. **Define Dependencies**: Explicitly define task dependencies to ensure proper execution order.

4. **Handle Errors**: Implement proper error handling and use the retry mechanism for transient failures.

5. **Monitor Resource Usage**: Use the resource monitoring capabilities to prevent system overload.

6. **Clean Up Resources**: Always call `shutdown()` when done to release resources.

7. **Use Plugins for Extensions**: Extend functionality through plugins rather than modifying core components.

## Troubleshooting

### Task Not Executing

- Check if the task is registered correctly
- Verify that all dependencies are registered and completed successfully
- Ensure the thread pool has available workers

### High Resource Usage

- Reduce thread pool size
- Increase monitoring frequency
- Set lower thresholds for resource warnings

### Task Failures

- Check error messages in task monitor
- Verify input data is correct
- Increase retry count for transient failures

## Support

For additional help, please refer to the API documentation or contact the development team.

