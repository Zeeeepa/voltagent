import { Command } from 'commander';
import chalk from 'chalk';
import { captureEvent } from '../../utils/analytics';

/**
 * Register the next command
 * @param program - The commander program instance
 */
export function registerNextCommand(program: Command): void {
  program
    .command('next')
    .description('Show the next task to work on based on dependencies and status')
    .option('-f, --file <file>', 'Path to the tasks file', 'tasks/tasks.json')
    .action((options) => {
      try {
        // Track command usage
        captureEvent({
          event: 'command_executed',
          properties: {
            command: 'task_next',
            options: JSON.stringify(options),
          },
        });

        console.log(chalk.cyan('Finding next task to work on...'));
        console.log(chalk.yellow('NOTE: This is a placeholder implementation.'));
        console.log(chalk.yellow('The full implementation will integrate the task management functionality from SwarmMCP.'));
        
        // Display options
        console.log(chalk.blue('Configuration:'));
        console.log(`- Tasks file: ${options.file}`);
        
        // Mock next task
        console.log(chalk.green('\nNext Task:'));
        console.log(chalk.bold('ID: 2'));
        console.log(chalk.bold('Title: Implement core functionality'));
        console.log(chalk.bold('Priority: High'));
        console.log(chalk.bold('Dependencies: 1 (✅ Set up project structure)'));
        console.log('\nDescription:');
        console.log('Implement the core functionality of the application, including:');
        console.log('- Data models');
        console.log('- Business logic');
        console.log('- API endpoints');
        
        console.log('\nSubtasks:');
        console.log('2.1. [PENDING] Define data models');
        console.log('2.2. [PENDING] Implement business logic');
        console.log('2.3. [PENDING] Create API endpoints');
        
        console.log('\nSuggested Actions:');
        console.log(chalk.blue('- Mark as in-progress: volt task set-status --id=2 --status=in-progress'));
        console.log(chalk.blue('- Mark as done when completed: volt task set-status --id=2 --status=done'));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`Error: ${errorMessage}`));
      }
    });
}

