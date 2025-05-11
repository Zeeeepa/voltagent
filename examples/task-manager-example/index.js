// Example usage of the VoltAgent Task Manager
import { TaskManager } from '../../packages/task-manager/dist/index.mjs';

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
    process.exit(1);
  });

