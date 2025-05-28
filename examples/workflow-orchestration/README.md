# Workflow Orchestration Example

This example demonstrates the unified workflow orchestration engine that consolidates workflow and task management into a single cohesive system.

## Features Demonstrated

- **Multiple Execution Modes**: Sequential, parallel, conditional, pipeline, and graph-based workflows
- **Advanced Task Scheduling**: Dependency management and intelligent queuing
- **State Management**: Workflow persistence and recovery
- **Event Monitoring**: Real-time workflow and task events
- **Error Handling**: Retry policies and fault tolerance
- **Integration**: Backward compatibility with SubAgentManager

## Running the Example

```bash
npm install
npm run dev
```

## Example Workflows

### 1. Data Processing Pipeline
A sequential workflow that processes data through multiple stages.

### 2. Parallel Analysis
Multiple agents analyze different aspects of data simultaneously.

### 3. Conditional Processing
Workflow execution based on runtime conditions and previous task results.

### 4. Dependency Graph
Complex workflow with task dependencies and parallel branches.

### 5. Integration Example
Shows how to migrate from SubAgentManager to workflow orchestration.

## Key Concepts

- **Workflow Definition**: Declarative workflow specification
- **Task Dependencies**: Control execution order and parallelism
- **Conditional Execution**: Dynamic workflow paths based on results
- **State Persistence**: Workflow recovery and monitoring
- **Event-Driven Monitoring**: Real-time observability

