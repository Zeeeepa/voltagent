# Task Management System

A TypeScript implementation of the task management system from SwarmMCP, integrated with the VoltAgent framework.

## Overview

The Task Management System provides a structured way to manage tasks, subtasks, and their dependencies within a project. It includes functionality for:

- Creating and managing tasks and subtasks
- Tracking task status and dependencies
- Analyzing task complexity
- Generating tasks from PRD documents
- Integrating with AI models for task generation and analysis

## Architecture

The Task Management System is organized into several key components:

### Core Components

- **task-master-core.ts**: Central module that imports and re-exports all direct function implementations
- **context-manager.ts**: Manages caching and context for task operations
- **path-utils.ts**: Utilities for file path operations and project structure

### Direct Functions

Direct functions are the core implementation of task management operations:

- **list-tasks.ts**: List tasks with filtering options
- **add-task.ts**: Add new tasks manually or using AI
- **update-task-by-id.ts**: Update existing tasks
- **expand-task.ts**: Break down tasks into subtasks
- **set-task-status.ts**: Update task status
- And many more...

### Tools

The system provides tools that can be integrated with the agent's tool registry:

- **listTasks**: List tasks from the task management system
- **addTask**: Add a new task to the task management system
- **getCacheStats**: Get statistics about the task management cache

## Usage

### Basic Usage

```typescript
import { createTaskManagementTools } from '@voltagent/core';

// Initialize the task management system
const tasksJsonPath = '/path/to/tasks.json';

// Create task management tools
const taskTools = createTaskManagementTools(tasksJsonPath);

// Create an agent with task management tools
const agent = new Agent({
  provider: new AnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-3-7-sonnet-20250219'
  }),
  tools: {
    ...taskTools,
    // Add other tools as needed
  },
  name: 'TaskManagerAgent',
  description: 'An agent that can manage tasks using the task management system'
});
```

### Direct Function Usage

You can also use the direct functions directly:

```typescript
import { 
  initializeProjectDirect, 
  addTaskDirect, 
  listTasksDirect 
} from '@voltagent/core';

// Create a logger
const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`)
};

// Initialize a project
const initResult = await initializeProjectDirect(
  { projectRoot: '/path/to/project', tasksJsonPath: '/path/to/tasks.json' },
  logger
);

// Add a task
const addResult = await addTaskDirect(
  {
    tasksJsonPath: '/path/to/tasks.json',
    title: 'Implement user authentication',
    description: 'Add user authentication to the application',
    priority: 'high'
  },
  logger
);

// List tasks
const listResult = await listTasksDirect(
  { tasksJsonPath: '/path/to/tasks.json' },
  logger
);
```

## Task Structure

Tasks are structured as follows:

```typescript
interface Task {
  id: number;
  title: string;
  description?: string;
  details?: string;
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  dependencies?: number[];
  subtasks?: Subtask[];
  testStrategy?: string;
  complexity?: number;
}
```

## Integration with AI

The Task Management System integrates with AI models (primarily Claude) for:

- Generating tasks from project requirements
- Breaking down tasks into subtasks
- Analyzing task complexity
- Updating tasks based on new context

## Example

See the `examples/with-task-management` directory for a complete example of using the Task Management System with VoltAgent.

