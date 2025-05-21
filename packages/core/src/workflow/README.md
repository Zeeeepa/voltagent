# Parallel Execution Engine

The Parallel Execution Engine is a powerful component of the VoltAgent framework that enables the execution of workflow tasks in parallel while respecting dependencies. It provides a robust system for task scheduling, dependency resolution, resource management, and error handling.

## Key Features

- **Parallel Task Execution**: Execute multiple tasks concurrently to maximize throughput
- **Dependency Resolution**: Automatically determine execution order based on task dependencies
- **Resource Management**: Allocate and track resources for optimal utilization
- **Task Isolation**: Prevent cross-task interference with configurable isolation levels
- **Priority System**: Prioritize critical path tasks for faster workflow completion
- **Task Cancellation**: Support for graceful cancellation of tasks and workflows
- **Failure Isolation**: Prevent cascading failures with configurable failure modes
- **Retry Mechanisms**: Automatically retry failed tasks with configurable policies
- **Event System**: Monitor workflow and task execution with a comprehensive event system

## Usage

### Creating a Simple Workflow

```typescript
import { 
  createTask, 
  createWorkflow, 
  createWorkflowEngine, 
  Priority 
} from "@voltagent/core";

// Create tasks
const fetchDataTask = createTask(
  "fetch-data",
  "Fetch Data",
  async (input: { url: string }) => {
    // Fetch data from URL
    return { data: `Data from ${input.url}` };
  }
)
  .withInput({ url: "https://api.example.com/data" })
  .withPriority(Priority.HIGH)
  .build();

const processDataTask = createTask(
  "process-data",
  "Process Data",
  async (input: { data: string }) => {
    // Process the data
    return { processed: `Processed ${input.data}` };
  }
)
  .withInputFunction(results => ({ data: results["fetch-data"].data }))
  .withDependencies(["fetch-data"])
  .build();

// Create workflow
const workflow = createWorkflow("example-workflow", "Example Workflow")
  .withDescription("A simple example workflow")
  .addTask(fetchDataTask)
  .addTask(processDataTask)
  .withConcurrencyLimit(2) // Only run 2 tasks at a time
  .build();

// Create workflow engine
const engine = createWorkflowEngine();

// Execute workflow
const result = await engine.executeWorkflow(workflow);
console.log("Results:", result.results);
```

### Handling Errors and Retries

```typescript
const taskWithRetry = createTask(
  "task-with-retry",
  "Task With Retry",
  async (input) => {
    // Task implementation that might fail
    if (Math.random() < 0.5) {
      throw new Error("Random failure");
    }
    return { value: "Success" };
  }
)
  .withRetryPolicy({
    maxRetries: 3,
    initialDelay: 1000,
    backoffFactor: 2,
    retryableErrors: ["Random failure"]
  })
  .withFailureMode("continue-workflow") // Continue workflow even if this task fails
  .build();
```

### Resource Management

```typescript
// Create tasks with resource requirements
const highCpuTask = createTask(
  "high-cpu",
  "High CPU Task",
  async (input) => {
    // CPU-intensive task
    return { value: "High CPU Task result" };
  }
)
  .withResources({ cpu: 80, memory: 20 })
  .build();

// Set resource limits on the engine
engine.updateResources({
  cpu: 100, // 100 CPU units available
  memory: 100, // 100 memory units available
});
```

### Event Handling

```typescript
// Add event listeners to the workflow
workflow.eventEmitter.on("task:started", (event) => {
  console.log(`Task ${event.taskName} started at ${event.timestamp}`);
});

workflow.eventEmitter.on("task:completed", (event) => {
  console.log(`Task ${event.taskName} completed in ${event.duration}ms`);
});

workflow.eventEmitter.on("task:failed", (event) => {
  console.log(`Task ${event.taskName} failed: ${event.error.message}`);
});

workflow.eventEmitter.on("workflow:completed", (event) => {
  console.log(`Workflow completed in ${event.duration}ms`);
});
```

## API Reference

### Core Classes

- **WorkflowEngine**: Main class for executing workflows
- **TaskScheduler**: Schedules tasks for execution based on dependencies and resources
- **DependencyResolver**: Analyzes task dependencies and determines execution order
- **ResourceManager**: Manages resource allocation for tasks
- **TaskExecutor**: Executes individual tasks with retry and timeout handling

### Factory Functions

- **createWorkflow(id, name)**: Creates a new workflow builder
- **createTask(id, name, execute)**: Creates a new task builder
- **createWorkflowEngine()**: Creates a new workflow engine

### Types

- **WorkflowDefinition**: Definition of a workflow
- **TaskDefinition**: Definition of a task
- **WorkflowInstance**: Runtime instance of a workflow
- **TaskInstance**: Runtime instance of a task
- **WorkflowExecutionResult**: Result of a workflow execution
- **TaskExecutionResult**: Result of a task execution

## Best Practices

1. **Task Granularity**: Design tasks with appropriate granularity - too fine-grained tasks may have high overhead, while too coarse-grained tasks limit parallelism.

2. **Resource Allocation**: Set realistic resource requirements for tasks to ensure optimal resource utilization.

3. **Error Handling**: Use retry policies for transient errors and appropriate failure modes for different types of tasks.

4. **Critical Path Optimization**: Identify and prioritize tasks on the critical path to minimize overall workflow execution time.

5. **Monitoring**: Use the event system to monitor workflow execution and detect bottlenecks or issues.

6. **Task Dependencies**: Keep the dependency graph as flat as possible to maximize parallelism.

7. **Input/Output Design**: Design task inputs and outputs carefully to minimize data transfer between tasks.

8. **Timeout Configuration**: Set appropriate timeouts for tasks to prevent hanging workflows.

## Advanced Features

### Task Isolation

Tasks can be isolated at different levels to prevent interference:

```typescript
const isolatedTask = createTask(
  "isolated-task",
  "Isolated Task",
  async (input) => {
    // Task implementation
    return { value: "Result" };
  }
)
  .withIsolationLevel("process") // Run in a separate process
  .build();
```

### Dynamic Input Resolution

Task inputs can be dynamically derived from previous task results:

```typescript
const dynamicTask = createTask(
  "dynamic-task",
  "Dynamic Task",
  async (input) => {
    // Use dynamically resolved input
    return { value: `Processed ${input.data}` };
  }
)
  .withInputFunction(results => {
    // Combine results from multiple upstream tasks
    return {
      data: `${results["task1"].value} + ${results["task2"].value}`
    };
  })
  .withDependencies(["task1", "task2"])
  .build();
```

### Critical Path Analysis

The engine automatically identifies the critical path in a workflow to prioritize tasks:

```typescript
// Get the critical path of a workflow
const criticalPath = dependencyResolver.getCriticalPath(workflow);
console.log("Critical path:", criticalPath);
```

