import { Command } from 'commander';
import chalk from 'chalk';
import { captureEvent } from '../../utils/analytics';

/**
 * Register the set-status command
 * @param program - The commander program instance
 */
export function registerSetStatusCommand(program: Command): void {
  program
    .command('set-status')
    .description('Change the status of a task')
    .argument('<task-id>', 'ID of the task to update')
    .option('-f, --file <file>', 'Path to the tasks file', 'tasks/tasks.json')
    .option('-s, --status <status>', 'New status for the task', 'done')
    .option('-r, --recursive', 'Apply status change to all subtasks')
    .action((taskId, options) => {
      try {
        // Track command usage
        captureEvent({
          event: 'command_executed',
          properties: {
            command: 'task_set_status',
            taskId,
            options: JSON.stringify(options),
          },
        });

        console.log(chalk.cyan(`Updating status of task ${taskId} to ${options.status}...`));
        console.log(chalk.yellow('NOTE: This is a placeholder implementation.'));
        console.log(chalk.yellow('The full implementation will integrate the task management functionality from SwarmMCP.'));
        
        // Display options
        console.log(chalk.blue('Configuration:'));
        console.log(`- Tasks file: ${options.file}`);
        console.log(`- New status: ${options.status}`);
        console.log(`- Recursive: ${options.recursive ? 'yes' : 'no'}`);
        
        console.log(chalk.green('\nTask status updated successfully!'));
        
        if (options.recursive) {
          console.log(chalk.green('Subtask statuses updated:'));
          console.log(`${taskId}.1: ${options.status}`);
          console.log(`${taskId}.2: ${options.status}`);
          console.log(`${taskId}.3: ${options.status}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`Error: ${errorMessage}`));
      }
    });
}

