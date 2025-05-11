/**
 * Example of using the Task Management System with VoltAgent
 */

import path from 'path';
import { Agent, VoltAgent, createTaskManagementTools } from '@voltagent/core';
import { AnthropicProvider } from '@voltagent/anthropic-ai';

// Initialize the task management system
const projectRoot = process.cwd();
const tasksJsonPath = path.join(projectRoot, 'tasks', 'tasks.json');

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

// Initialize VoltAgent with our agent
const voltAgent = new VoltAgent({
  agents: {
    taskManager: agent
  },
  autoStart: true
});

console.log('Task Management Agent is running!');
console.log('Available tools:');
console.log('- listTasks: List tasks from the task management system');
console.log('- addTask: Add a new task to the task management system');
console.log('- getCacheStats: Get statistics about the task management cache');

// Example of how to use the agent programmatically
async function runExample() {
  try {
    // Initialize the project if needed
    await agent.execute({
      messages: [{
        role: 'user',
        content: 'Initialize the task management system for this project'
      }]
    });

    // Add a task
    const addTaskResponse = await agent.execute({
      messages: [{
        role: 'user',
        content: 'Add a task to implement user authentication'
      }]
    });
    console.log('Add Task Response:', addTaskResponse);

    // List tasks
    const listTasksResponse = await agent.execute({
      messages: [{
        role: 'user',
        content: 'List all tasks in the system'
      }]
    });
    console.log('List Tasks Response:', listTasksResponse);
  } catch (error) {
    console.error('Error running example:', error);
  }
}

// Uncomment to run the example
// runExample();

