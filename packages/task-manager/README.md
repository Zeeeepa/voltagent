# VoltAgent Task Manager

This package provides the task management system for VoltAgent, allowing you to manage AI-driven development tasks.

## Installation

```bash
npm install @voltagent/task-manager
```

## Usage

### As a CLI

```bash
# Install globally
npm install -g @voltagent/task-manager

# Initialize a new project
voltagent-task init

# List tasks
voltagent-task list

# Create a new task
voltagent-task create "Task description"

# Run a task
voltagent-task run <task-id>
```

### As a library

```typescript
import { TaskManager } from '@voltagent/task-manager';

// Create a task manager
const taskManager = new TaskManager({
  // options...
});

// Create a new task
const task = await taskManager.createTask({
  title: 'Implement feature X',
  description: 'Detailed description of the feature...',
});

// Run the task
await taskManager.runTask(task.id);
```

## Configuration

The task manager can be configured using environment variables or by passing options to the `TaskManager` constructor.

### Environment Variables

- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `OPENAI_API_KEY`: Your OpenAI API key
- `TASK_STORAGE_PATH`: Path to store task data (default: ./.voltagent/tasks)

### Configuration Options

```typescript
const taskManager = new TaskManager({
  anthropicApiKey: 'your-anthropic-api-key',
  openaiApiKey: 'your-openai-api-key',
  storagePath: './.voltagent/tasks',
  // other options...
});
```

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run in development mode
pnpm dev
```

