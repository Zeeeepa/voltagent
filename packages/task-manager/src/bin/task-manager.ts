#!/usr/bin/env node

/**
 * Task Manager CLI
 * 
 * This module provides a command-line interface for the task management system.
 */

import { Command } from 'commander';
import { TaskManager } from '../index';

const program = new Command();
const taskManager = new TaskManager();

program
  .name('voltagent-task')
  .description('VoltAgent Task Manager')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize a new project')
  .action(async () => {
    console.log('Initializing new project...');
    // Implementation will be added in future PRs
  });

program
  .command('list')
  .description('List all tasks')
  .action(async () => {
    console.log('Listing tasks...');
    // Implementation will be added in future PRs
  });

program
  .command('create <title>')
  .description('Create a new task')
  .option('-d, --description <description>', 'Task description')
  .action(async (title, options) => {
    try {
      const task = await taskManager.createTask({
        title,
        description: options.description,
      });
      console.log(`Task created with ID: ${task.id}`);
    } catch (error) {
      console.error('Failed to create task:', error);
      process.exit(1);
    }
  });

program
  .command('run <taskId>')
  .description('Run a task')
  .action(async (taskId) => {
    try {
      const task = await taskManager.runTask(taskId);
      console.log(`Task ${taskId} is now ${task.status}`);
    } catch (error) {
      console.error('Failed to run task:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);

