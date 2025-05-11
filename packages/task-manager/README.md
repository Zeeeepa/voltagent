# VoltAgent Task Manager

Task management system for the VoltAgent framework.

## Installation

```bash
npm install @voltagent/task-manager
# or
yarn add @voltagent/task-manager
# or
pnpm add @voltagent/task-manager
```

## Usage

### As a library

```typescript
import { TaskManager } from "@voltagent/task-manager";

// Create a task manager
const taskManager = new TaskManager({
  // options...
});

// Create a new task
taskManager
  .createTask({
    title: "Implement feature X",
    description: "Detailed description of the feature...",
  })
  .then((task) => {
    console.log("Task created:", task);

    // Run the task
    return taskManager.runTask(task.id);
  })
  .then((task) => {
    console.log("Task status:", task.status);
  })
  .catch((error) => {
    console.error("Error:", error);
  });
```

### As a CLI

```bash
# Install globally
npm install -g @voltagent/task-manager

# Run the task manager
voltagent-task
```

## API

### `TaskManager`

The main class for managing tasks.

#### `createTask(options: CreateTaskOptions): Promise<Task>`

Creates a new task.

#### `getTask(id: string): Task | undefined`

Gets a task by ID.

#### `runTask(id: string): Promise<Task>`

Runs a task by ID.

#### `listTasks(): Task[]`

Lists all tasks.

## License

MIT
