/**
 * Basic usage example for the task management system
 */

import { TaskManager } from '../core/TaskManager';
import { TaskRunner } from '../core/TaskRunner';
import { TaskStatus } from '../types/status';
import { DependencyType } from '../types/dependency';
import { Agent } from '@voltagent/core';

// This is a simplified example. In a real application, you would:
// 1. Create an agent with the appropriate provider and model
// 2. Configure the task manager with a storage adapter
// 3. Set up proper error handling and logging

async function main() {
  // Create a task manager
  const taskManager = new TaskManager();
  
  // Create some tasks
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
  
  const task3 = await taskManager.createTask({
    title: 'Create test suite',
    description: 'Implement basic tests for the core functionality',
    priority: 3,
  });
  
  // Add dependencies
  await taskManager.addDependency(
    task2.id,
    task1.id,
    DependencyType.REQUIRES,
    'Project structure must be set up before implementing core modules'
  );
  
  await taskManager.addDependency(
    task3.id,
    task2.id,
    DependencyType.REQUIRES,
    'Core modules must be implemented before creating tests'
  );
  
  // Transition tasks to READY
  await taskManager.transitionTaskStatus(task1.id, TaskStatus.READY);
  
  // Create an agent (simplified example)
  const agent = new Agent({
    name: 'TaskAgent',
    instructions: 'You are an agent that executes tasks for the project.',
    llm: {
      // This would be a real LLM provider in a real application
      generateText: async () => ({ text: 'Task completed successfully' }),
      streamText: async () => ({ text: 'Task completed successfully' }),
      generateObject: async () => ({ object: {} }),
      streamObject: async () => ({ object: {} }),
      getModelIdentifier: () => 'mock-model',
    },
    model: 'mock-model',
  });
  
  // Create a task runner
  const taskRunner = new TaskRunner({
    taskManager,
    agent,
    autoStart: true,
  });
  
  // Wait for a moment to let the task runner process tasks
  await new Promise((resolve) => setTimeout(resolve, 1000));
  
  // Print the current state of tasks
  console.log('Tasks:');
  taskManager.getAllTasks().forEach((task) => {
    console.log(`- ${task.title} (${task.status})`);
  });
  
  // Stop the task runner
  taskRunner.stop();
}

// Run the example
main().catch(console.error);

