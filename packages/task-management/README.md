# Task Management System

This package provides a task management system for AI-driven development, integrating the core agent functionality from `serv` with the task management system from `SwarmMCP`.

## Architecture

The task management system is built around the following core components:

### TaskManager

The `TaskManager` is responsible for creating, updating, and managing tasks. It provides methods for:

- Creating and updating tasks
- Managing task dependencies
- Transitioning task statuses
- Assigning tasks to agents
- Querying tasks by various criteria

### TaskFSM

The `TaskFSM` (Finite State Machine) manages task status transitions. It ensures that tasks can only transition between valid states according to defined rules. The FSM:

- Validates status transitions
- Applies conditional transitions based on task properties
- Provides information about possible next states

### TaskRunner

The `TaskRunner` executes tasks using agents. It:

- Polls for available tasks
- Assigns tasks to agents
- Executes tasks using the agent's capabilities
- Manages task execution lifecycle
- Handles concurrent task execution

## Data Model

### Task

A task represents a unit of work to be completed. Tasks have:

- Unique identifier
- Title and description
- Current status
- Priority and complexity
- Dependencies on other tasks
- Subtasks (for hierarchical task structures)
- Assignment information
- Timestamps and metadata

### TaskStatus

Tasks can be in one of the following statuses:

- `BACKLOG`: Not yet ready to be worked on
- `READY`: Ready to be worked on
- `IN_PROGRESS`: Currently being worked on
- `BLOCKED`: Blocked by another task or external factor
- `REVIEW`: Completed and awaiting review
- `COMPLETED`: Fully completed
- `CANCELLED`: No longer needed

### Dependencies

Tasks can have dependencies on other tasks. Dependency types include:

- `BLOCKS`: Task must be completed before the dependent task can start
- `RELATES_TO`: Task is related to the dependent task but doesn't block it
- `DUPLICATES`: Task is a duplicate of the dependent task
- `REQUIRES`: Task is a prerequisite for the dependent task

## Usage

### Basic Usage

```typescript
import { TaskManager, TaskRunner, TaskStatus, DependencyType } from '@voltagent/task-management';
import { Agent } from '@voltagent/core';

// Create a task manager
const taskManager = new TaskManager();

// Create tasks
const task1 = await taskManager.createTask({
  title: 'Set up project structure',
  description: 'Create the initial project structure with TypeScript configuration',
  priority: 1,
});

const task2 = await taskManager.createTask({
  title: 'Implement core agent modules',
  description: 'Port the core agent modules from the serv repository',
  priority: 2,
});

// Add dependencies
await taskManager.addDependency(
  task2.id,
  task1.id,
  DependencyType.REQUIRES,
  'Project structure must be set up before implementing core modules'
);

// Transition tasks to READY
await taskManager.transitionTaskStatus(task1.id, TaskStatus.READY);

// Create an agent
const agent = new Agent({
  name: 'TaskAgent',
  instructions: 'You are an agent that executes tasks for the project.',
  // ... other agent configuration
});

// Create a task runner
const taskRunner = new TaskRunner({
  taskManager,
  agent,
  autoStart: true,
});
```

### Custom Storage

You can implement a custom storage adapter to persist tasks:

```typescript
import { TaskManager, TaskStorageAdapter, Task } from '@voltagent/task-management';
import fs from 'fs/promises';

// Implement a file-based storage adapter
class FileStorageAdapter implements TaskStorageAdapter {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  async saveTasks(tasks: Task[]): Promise<void> {
    await fs.writeFile(this.filePath, JSON.stringify(tasks, null, 2));
  }

  async loadTasks(): Promise<Task[]> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // If file doesn't exist or is invalid, return empty array
      return [];
    }
  }
}

// Create a task manager with custom storage
const taskManager = new TaskManager({
  storage: new FileStorageAdapter('tasks.json'),
});

// Initialize the task manager (loads tasks from storage)
await taskManager.initialize();
```

### Custom Status Transitions

You can customize the allowed status transitions:

```typescript
import { TaskFSM, TaskStatus, StatusTransition } from '@voltagent/task-management';

// Define custom transitions
const customTransitions: StatusTransition[] = [
  // Allow direct transition from BACKLOG to IN_PROGRESS for high priority tasks
  {
    from: TaskStatus.BACKLOG,
    to: TaskStatus.IN_PROGRESS,
    allowed: true,
    conditions: [
      (task) => task.priority === 1,
    ],
  },
  // ... other custom transitions
];

// Create a task manager with custom FSM
const taskManager = new TaskManager({
  fsm: new TaskFSM({ transitions: customTransitions }),
});
```

## Integration with Agents

The task management system integrates with the agent system from `@voltagent/core`. Agents can:

- Execute tasks assigned to them
- Update task status based on execution results
- Create subtasks for complex tasks
- Manage dependencies between tasks

This integration enables AI-driven task management and execution, where agents can autonomously work on tasks and collaborate with each other.

## License

MIT

