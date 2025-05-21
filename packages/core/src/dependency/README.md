# Dependency Management System

The Dependency Management System is a comprehensive solution for modeling, visualizing, and optimizing dependencies between workflow tasks in VoltAgent.

## Overview

This system provides tools for:

- Modeling dependencies between tasks
- Visualizing dependency graphs
- Analyzing critical paths
- Validating dependency relationships
- Supporting different dependency types
- Analyzing dependency impact
- Providing optimization recommendations
- Monitoring dependency health

## Core Components

### DependencyGraph

The `DependencyGraph` class is the core data structure that manages tasks and their dependencies. It provides methods for:

- Adding, updating, and removing tasks
- Creating and removing dependencies
- Validating the graph
- Detecting cycles
- Analyzing the critical path
- Determining task readiness

### DependencyManager

The `DependencyManager` class provides a higher-level interface for managing dependencies, with event-based notifications for changes. It extends the functionality of `DependencyGraph` with:

- Event emission for task and dependency changes
- Health metrics calculation
- Dependency minimization recommendations
- Integration with visualization tools

### DependencyVisualizer

The `DependencyVisualizer` class provides tools for visualizing dependency graphs in various formats:

- JSON
- Mermaid flowcharts
- DOT (Graphviz)
- HTML with interactive elements

### DependencyWorkflowManager

The `DependencyWorkflowManager` class integrates the dependency management system with VoltAgent's workflow capabilities:

- Creating workflows with tasks and dependencies
- Executing tasks using agents
- Monitoring workflow progress
- Handling task completion and failure

## Dependency Types

The system supports four types of dependencies:

1. **Finish-to-Start (FS)**: The dependent task can start only after the predecessor task finishes
2. **Start-to-Start (SS)**: The dependent task can start only after the predecessor task starts
3. **Finish-to-Finish (FF)**: The dependent task can finish only after the predecessor task finishes
4. **Start-to-Finish (SF)**: The dependent task can finish only after the predecessor task starts

## Task States

Tasks can be in one of the following states:

- **PENDING**: Task is not yet ready to be executed
- **READY**: Task is ready to be executed
- **IN_PROGRESS**: Task is currently being executed
- **COMPLETED**: Task has been completed successfully
- **FAILED**: Task has failed
- **BLOCKED**: Task has been blocked due to a dependency failure

## Critical Path Analysis

The critical path is the sequence of tasks that determines the minimum time needed to complete the project. The system performs critical path analysis to:

- Identify the critical path
- Calculate earliest and latest start/finish times
- Determine slack time for each task
- Estimate project completion time

## Dependency Validation

The system validates dependency graphs to detect issues like:

- Cycles (circular dependencies)
- Missing tasks
- Self-dependencies
- Invalid dependency types

## Health Metrics

The system calculates health metrics for dependency graphs:

- Task and dependency counts
- Average dependencies per task
- Complexity score
- Health score
- Recommendations for improvement

## Usage Examples

### Creating Tasks and Dependencies

```typescript
import { DependencyManager, DependencyType } from "@voltagent/core";

// Create a dependency manager
const dependencyManager = new DependencyManager();

// Create tasks
const taskA = dependencyManager.createTask({
  name: "Task A",
  description: "First task",
  estimatedDuration: 2 * 60 * 60 * 1000, // 2 hours
});

const taskB = dependencyManager.createTask({
  name: "Task B",
  description: "Second task",
  estimatedDuration: 3 * 60 * 60 * 1000, // 3 hours
});

// Create a dependency
dependencyManager.createDependency({
  predecessorId: taskA.id,
  dependentId: taskB.id,
  type: DependencyType.FINISH_TO_START,
});
```

### Analyzing the Critical Path

```typescript
// Analyze the critical path
const criticalPath = dependencyManager.analyzeCriticalPath();
console.log("Critical Path:", criticalPath.path);
console.log("Project Duration:", criticalPath.duration);
```

### Visualizing the Dependency Graph

```typescript
import { VisualizationOptions } from "@voltagent/core";
import * as fs from "fs";

// Generate a Mermaid visualization
const mermaidOptions: VisualizationOptions = {
  format: "mermaid",
  includeTaskDetails: true,
  highlightCriticalPath: true,
};
const mermaidVisualization = dependencyManager.visualize(mermaidOptions);
fs.writeFileSync("dependency_graph.mermaid", mermaidVisualization);

// Generate an HTML visualization
const htmlOptions: VisualizationOptions = {
  format: "html",
  includeTaskDetails: true,
  highlightCriticalPath: true,
};
const htmlVisualization = dependencyManager.visualize(htmlOptions);
fs.writeFileSync("dependency_graph.html", htmlVisualization);
```

### Updating Task Status

```typescript
import { TaskStatus } from "@voltagent/core";

// Mark a task as in progress
dependencyManager.updateTaskStatus(taskA.id, TaskStatus.IN_PROGRESS);

// Mark a task as completed
dependencyManager.updateTaskStatus(taskA.id, TaskStatus.COMPLETED);

// Get tasks that are now ready to be executed
const readyTasks = dependencyManager.getReadyTasks();
```

### Calculating Health Metrics

```typescript
// Calculate health metrics
const healthMetrics = dependencyManager.calculateHealthMetrics();
console.log("Health Score:", healthMetrics.healthScore);
console.log("Recommendations:", healthMetrics.recommendations);
```

### Creating a Workflow with Agents

```typescript
import { Agent, DependencyWorkflowManager } from "@voltagent/core";

// Create a supervisor agent
const supervisorAgent = new Agent({
  name: "SupervisorAgent",
  instructions: "I am a supervisor agent that coordinates workflow tasks.",
  // ... other agent options
});

// Create sub-agents
const agentA = new Agent({
  name: "AgentA",
  instructions: "I am responsible for Task A.",
  // ... other agent options
});

const agentB = new Agent({
  name: "AgentB",
  instructions: "I am responsible for Task B.",
  // ... other agent options
});

// Create a workflow manager
const workflowManager = new DependencyWorkflowManager(supervisorAgent);

// Add sub-agents
workflowManager.addAgent(agentA);
workflowManager.addAgent(agentB);

// Create a workflow
const taskIds = workflowManager.createWorkflow({
  name: "My Workflow",
  description: "A simple workflow with two tasks",
  tasks: [
    {
      name: "Task A",
      description: "First task",
      estimatedDuration: 2 * 60 * 60 * 1000,
      agentId: agentA.id,
    },
    {
      name: "Task B",
      description: "Second task",
      estimatedDuration: 3 * 60 * 60 * 1000,
      agentId: agentB.id,
    },
  ],
  dependencies: [
    {
      predecessorId: taskIds[0],
      dependentId: taskIds[1],
      type: DependencyType.FINISH_TO_START,
    },
  ],
});

// Start the workflow
workflowManager.startWorkflow("My Workflow").then((result) => {
  console.log("Workflow completed:", result);
});
```

## Integration with Agents

The dependency management system can be integrated with VoltAgent's agent system to create intelligent workflow orchestration:

- Agents can be assigned to specific tasks
- Agents can analyze dependencies and suggest optimizations
- Agents can monitor workflow progress and handle exceptions
- Agents can dynamically adjust workflows based on changing conditions

## Best Practices

1. **Validate Dependency Graphs**: Always validate dependency graphs after creating or modifying dependencies to detect issues early.

2. **Monitor Critical Path**: Regularly analyze the critical path to identify bottlenecks and optimization opportunities.

3. **Use Appropriate Dependency Types**: Choose the appropriate dependency type (FS, SS, FF, SF) based on the actual relationship between tasks.

4. **Minimize Dependencies**: Keep the dependency graph as simple as possible to reduce complexity and improve maintainability.

5. **Visualize Complex Workflows**: Use visualization tools to understand and communicate complex workflows.

6. **Handle Failures Gracefully**: Implement proper error handling for task failures to prevent cascading failures in the workflow.

7. **Optimize Resource Allocation**: Use critical path analysis to allocate resources efficiently to tasks that impact project completion time.

8. **Monitor Health Metrics**: Regularly check dependency health metrics to identify potential issues and improvement opportunities.

