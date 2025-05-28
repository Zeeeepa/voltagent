/**
 * Example demonstrating the task management system integration
 */

import path from 'path';
import { EventEmitter } from 'events';
import { 
  VoltAgent, 
  createAgent, 
  createAnthropicProvider,
  TaskManager,
  FileTaskStorage,
  TaskAgentIntegration,
  registerTaskTools
} from '@voltagent/core';

// Create a global event emitter for task events
const events = new EventEmitter();

// Create a file-based task storage provider
const taskStorage = new FileTaskStorage({
  tasksFilePath: path.join(process.cwd(), 'tasks', 'tasks.json'),
  complexityReportPath: path.join(process.cwd(), 'tasks', 'task-complexity-report.json'),
  createIfNotExists: true,
  defaultProjectName: 'Task Management Example',
  defaultProjectVersion: '1.0.0'
});

// Create a task manager
const taskManager = new TaskManager({
  storage: taskStorage,
  events
});

// Create a task-agent integration
const taskAgentIntegration = new TaskAgentIntegration({
  taskManager,
  events
});

// Create a model provider
const modelProvider = createAnthropicProvider({
  model: 'claude-3-haiku-20240307'
});

// Create an agent
const agent = createAgent({
  id: 'task-management-agent',
  modelProvider,
  environment: {
    type: 'local'
  }
});

// Create the VoltAgent instance
const voltAgent = new VoltAgent({
  agents: {
    'task-management-agent': agent
  },
  autoStart: true
});

// Register task management tools with the MCP server
registerTaskTools(voltAgent, taskManager);

// Listen for task events
events.on('task:created', (task) => {
  console.log(`Task created: ${task.id} - ${task.title}`);
});

events.on('task:updated', (task) => {
  console.log(`Task updated: ${task.id} - ${task.title}`);
});

events.on('task:deleted', (task) => {
  console.log(`Task deleted: ${task.id} - ${task.title}`);
});

events.on('subtask:created', ({ taskId, subtask }) => {
  console.log(`Subtask created: ${taskId}.${subtask.id} - ${subtask.title}`);
});

events.on('subtask:updated', ({ taskId, subtask }) => {
  console.log(`Subtask updated: ${taskId}.${subtask.id} - ${subtask.title}`);
});

events.on('subtask:deleted', ({ taskId, subtask }) => {
  console.log(`Subtask deleted: ${taskId}.${subtask.id} - ${subtask.title}`);
});

// Example of creating a task
async function createExampleTask() {
  const result = await taskManager.createTask({
    title: 'Example Task',
    description: 'This is an example task created by the task management system',
    priority: 'medium',
    status: 'pending',
    dependencies: [],
    details: 'Implementation details for the example task',
    testStrategy: 'Test strategy for the example task'
  });

  if (result.success && result.data) {
    console.log('Created example task:', result.data);

    // Add a subtask
    const subtaskResult = await taskManager.addSubtask(result.data.id, {
      title: 'Example Subtask',
      description: 'This is an example subtask',
      status: 'pending',
      dependencies: [],
      details: 'Implementation details for the example subtask'
    });

    if (subtaskResult.success && subtaskResult.data) {
      console.log('Created example subtask:', subtaskResult.data);
    }

    // Assign the task to the agent
    await taskAgentIntegration.assignTaskToAgent(result.data.id, 'task-management-agent');
    console.log(`Task ${result.data.id} assigned to agent task-management-agent`);

    // Start the task
    await taskAgentIntegration.startTask(result.data.id, 'task-management-agent');
    console.log(`Task ${result.data.id} started by agent task-management-agent`);
  }
}

// Run the example
createExampleTask().catch(console.error);

// Export for testing
export { taskManager, taskAgentIntegration, agent };

