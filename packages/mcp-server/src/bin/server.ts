#!/usr/bin/env node

/**
 * MCP Server CLI
 * 
 * This module provides a command-line interface for the MCP server.
 */

import { Command } from 'commander';
import { createMCPServer } from '../index';

const program = new Command();

program
  .name('voltagent-mcp')
  .description('VoltAgent MCP Server')
  .version('0.1.0')
  .option('-p, --port <port>', 'Port to run the server on', '3000')
  .option('-h, --host <host>', 'Host to bind to', 'localhost')
  .action(async (options) => {
    const server = createMCPServer({
      port: parseInt(options.port, 10),
      host: options.host,
    });

    try {
      await server.start();
      
      // Handle graceful shutdown
      process.on('SIGINT', async () => {
        console.log('Shutting down MCP server...');
        await server.stop();
        process.exit(0);
      });
      
      process.on('SIGTERM', async () => {
        console.log('Shutting down MCP server...');
        await server.stop();
        process.exit(0);
      });
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      process.exit(1);
    }
  });

program.parse(process.argv);

