import { Command } from 'commander';
import { registerChatCommand } from './chat';
import { registerEvalCommand } from './eval';

/**
 * Register all agent-related commands
 * @param program - The commander program instance
 */
export function registerAgentCommands(program: Command): void {
  const agentCommand = program
    .command('agent')
    .description('Agent-related commands for interacting with and evaluating agents');

  // Register subcommands
  registerChatCommand(agentCommand);
  registerEvalCommand(agentCommand);
}

