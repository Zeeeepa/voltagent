import { Command } from 'commander';
import { registerParsePrdCommand } from './parse-prd';
import { registerListCommand } from './list';
import { registerNextCommand } from './next';
import { registerGenerateCommand } from './generate';
import { registerExpandCommand } from './expand';
import { registerSetStatusCommand } from './set-status';
import { registerAnalyzeCommand } from './analyze';

/**
 * Register all task-related commands
 * @param program - The commander program instance
 */
export function registerTaskCommands(program: Command): void {
  const taskCommand = program
    .command('task')
    .description('Task management commands for AI-driven development');

  // Register subcommands
  registerParsePrdCommand(taskCommand);
  registerListCommand(taskCommand);
  registerNextCommand(taskCommand);
  registerGenerateCommand(taskCommand);
  registerExpandCommand(taskCommand);
  registerSetStatusCommand(taskCommand);
  registerAnalyzeCommand(taskCommand);
}

