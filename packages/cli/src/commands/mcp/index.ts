import { Command } from 'commander';
import { registerServerCommand } from './server';
import { registerClientCommand } from './client';

/**
 * Register all MCP-related commands
 * @param program - The commander program instance
 */
export function registerMcpCommands(program: Command): void {
  const mcpCommand = program
    .command('mcp')
    .description('Model Context Protocol (MCP) server and client commands');

  // Register subcommands
  registerServerCommand(mcpCommand);
  registerClientCommand(mcpCommand);
}

