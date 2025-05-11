/**
 * execution-example.ts
 * 
 * Example of using execution environments with the MCP server
 */

import { createExecutionAdapter, LogCategory } from '@voltagent/core';
import { FastMCP } from 'fastmcp';

// Create a logger
const logger = {
  debug: (message: string, category?: LogCategory, data?: any) => {
    console.debug(`[DEBUG] [${category || 'GENERAL'}]`, message, data || '');
  },
  info: (message: string, category?: LogCategory, data?: any) => {
    console.info(`[INFO] [${category || 'GENERAL'}]`, message, data || '');
  },
  warn: (message: string, category?: LogCategory, data?: any) => {
    console.warn(`[WARN] [${category || 'GENERAL'}]`, message, data || '');
  },
  error: (message: string, error?: Error, category?: LogCategory, data?: any) => {
    console.error(`[ERROR] [${category || 'GENERAL'}]`, message, error || '', data || '');
  }
};

/**
 * Start the MCP server with execution environment tools
 */
async function startServer() {
  // Create an execution adapter
  const { adapter } = await createExecutionAdapter({
    type: 'local', // Use 'docker' or 'e2b' for other environments
    logger
  });

  // Create an MCP server
  const server = new FastMCP({
    name: 'VoltAgent MCP Server with Execution Environments',
    version: '1.0.0'
  });

  // Register execution environment tools
  
  // Execute command tool
  server.registerTool({
    name: 'execute_command',
    description: 'Execute a command in the execution environment',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Command to execute'
        },
        working_dir: {
          type: 'string',
          description: 'Working directory for the command'
        }
      },
      required: ['command']
    },
    handler: async ({ command, working_dir }) => {
      const result = await adapter.executeCommand('mcp-execute', command, working_dir);
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: result.exitCode
      };
    }
  });

  // Read file tool
  server.registerTool({
    name: 'read_file',
    description: 'Read a file from the execution environment',
    parameters: {
      type: 'object',
      properties: {
        filepath: {
          type: 'string',
          description: 'Path to the file'
        },
        max_size: {
          type: 'number',
          description: 'Maximum size to read (in bytes)'
        },
        line_offset: {
          type: 'number',
          description: 'Line number to start reading from (0-based)'
        },
        line_count: {
          type: 'number',
          description: 'Number of lines to read'
        }
      },
      required: ['filepath']
    },
    handler: async ({ filepath, max_size, line_offset, line_count }) => {
      const result = await adapter.readFile('mcp-read', filepath, max_size, line_offset, line_count);
      return result;
    }
  });

  // Write file tool
  server.registerTool({
    name: 'write_file',
    description: 'Write content to a file in the execution environment',
    parameters: {
      type: 'object',
      properties: {
        filepath: {
          type: 'string',
          description: 'Path to the file'
        },
        content: {
          type: 'string',
          description: 'Content to write'
        }
      },
      required: ['filepath', 'content']
    },
    handler: async ({ filepath, content }) => {
      await adapter.writeFile('mcp-write', filepath, content);
      return { success: true };
    }
  });

  // Edit file tool
  server.registerTool({
    name: 'edit_file',
    description: 'Edit a file by replacing content',
    parameters: {
      type: 'object',
      properties: {
        filepath: {
          type: 'string',
          description: 'Path to the file'
        },
        search_code: {
          type: 'string',
          description: 'Code to search for'
        },
        replace_code: {
          type: 'string',
          description: 'Code to replace with'
        }
      },
      required: ['filepath', 'search_code', 'replace_code']
    },
    handler: async ({ filepath, search_code, replace_code }) => {
      const result = await adapter.editFile('mcp-edit', filepath, search_code, replace_code);
      return result;
    }
  });

  // List directory tool
  server.registerTool({
    name: 'list_directory',
    description: 'List files in a directory',
    parameters: {
      type: 'object',
      properties: {
        dirpath: {
          type: 'string',
          description: 'Path to the directory'
        },
        show_hidden: {
          type: 'boolean',
          description: 'Whether to show hidden files'
        },
        details: {
          type: 'boolean',
          description: 'Whether to include detailed file information'
        }
      },
      required: ['dirpath']
    },
    handler: async ({ dirpath, show_hidden, details }) => {
      const result = await adapter.ls('mcp-ls', dirpath, show_hidden, details);
      return result;
    }
  });

  // Start the server
  await server.start({
    transportType: 'stdio',
    timeout: 120000 // 2 minutes timeout (in milliseconds)
  });

  console.log('MCP server started with execution environment tools');
}

// Start the server
startServer().catch(error => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});

