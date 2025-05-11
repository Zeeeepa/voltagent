# VoltAgent Task Manager Example

This example demonstrates how to use the VoltAgent Task Manager.

## Installation

```bash
# Clone the repository
git clone https://github.com/Zeeeepa/voltagent.git
cd voltagent

# Install dependencies
pnpm install

# Build packages
pnpm build
```

## Usage

```bash
# Run the task manager example
cd examples/task-manager-example
node index.js
```

## Example Code

```javascript
// index.js
import { TaskManager } from '@voltagent/task-manager';

// Create a task manager
const taskManager = new TaskManager({
  // options...
});

// Create a new task
taskManager.createTask({
  title: 'Implement feature X',
  description: 'Detailed description of the feature...',
})
  .then((task) => {
    console.log('Task created:', task);
    
    // Run the task
    return taskManager.runTask(task.id);
  })
  .then((task) => {
    console.log('Task status:', task.status);
  })
  .catch((error) => {
    console.error('Error:', error);
  });
```

## Configuration

See the [Task Manager documentation](../../packages/task-manager/README.md) for more information on configuration options.

