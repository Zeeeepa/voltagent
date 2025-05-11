# Execution Environments

The execution environments module provides a unified interface for executing commands and managing files across different execution environments (local, Docker, E2B).

## Overview

The execution environments system consists of the following components:

- **ExecutionAdapter**: Interface that defines the common API for all execution adapters
- **LocalExecutionAdapter**: Executes commands locally on the host machine
- **DockerExecutionAdapter**: Executes commands in a Docker container
- **E2BExecutionAdapter**: Executes commands in an E2B sandbox
- **CheckpointingExecutionAdapter**: Wraps an execution adapter to add checkpointing functionality
- **ExecutionAdapterFactory**: Factory function to create the appropriate execution adapter

## Usage

### Creating an Execution Adapter

```typescript
import { createExecutionAdapter } from '@voltagent/core';

// Create a local execution adapter
const { adapter, type } = await createExecutionAdapter({
  type: 'local',
  logger: console
});

// Create a Docker execution adapter
const { adapter, type } = await createExecutionAdapter({
  type: 'docker',
  docker: {
    projectRoot: '/path/to/project',
    composeFilePath: '/path/to/docker-compose.yml',
    serviceName: 'voltagent',
    projectName: 'voltagent'
  },
  logger: console
});

// Create an E2B execution adapter
const { adapter, type } = await createExecutionAdapter({
  type: 'e2b',
  e2b: {
    sandboxId: 'your-e2b-sandbox-id'
  },
  logger: console
});
```

### Executing Commands

```typescript
// Execute a command
const result = await adapter.executeCommand('execution-id', 'echo "Hello, World!"');
console.log(result.stdout); // Hello, World!
```

### Reading Files

```typescript
// Read a file
const result = await adapter.readFile('execution-id', '/path/to/file.txt');
if (result.success) {
  console.log(result.content);
}
```

### Writing Files

```typescript
// Write a file
await adapter.writeFile('execution-id', '/path/to/file.txt', 'Hello, World!');
```

### Editing Files

```typescript
// Edit a file
const result = await adapter.editFile(
  'execution-id',
  '/path/to/file.txt',
  'Hello, World!',
  'Hello, VoltAgent!'
);
```

### Listing Directories

```typescript
// List files in a directory
const result = await adapter.ls('execution-id', '/path/to/directory');
if (result.success) {
  console.log(result.entries);
}
```

## Checkpointing

The execution environments system includes a checkpointing feature that allows you to create snapshots of the file system before making changes. This is useful for implementing undo/redo functionality or for debugging purposes.

The `CheckpointingExecutionAdapter` automatically creates checkpoints before executing state-changing operations (writeFile, editFile, executeCommand).

```typescript
import { CheckpointManager } from '@voltagent/core';

// List all checkpoints for a session
const checkpoints = await CheckpointManager.list('session-id', adapter);

// Restore a checkpoint
await CheckpointManager.restore('session-id', 'checkpoint-sha', adapter, '/path/to/repo');
```

## Environment Status Events

The execution adapters emit events when the environment status changes. You can subscribe to these events to be notified when the environment is initializing, connecting, connected, disconnected, or in an error state.

```typescript
import { AgentEvents, AgentEventType } from '@voltagent/core';

// Subscribe to environment status events
AgentEvents.on(AgentEventType.ENVIRONMENT_STATUS_CHANGED, (event) => {
  console.log(`Environment ${event.environmentType} status: ${event.status}`);
});
```

## Integration with MCP Server

The execution environments can be integrated with the MCP server to provide a unified interface for executing commands and managing files across different environments.

```typescript
import { createExecutionAdapter } from '@voltagent/core';
import { FastMCP } from 'fastmcp';

// Create an execution adapter
const { adapter } = await createExecutionAdapter({
  type: 'local',
  logger: console
});

// Create an MCP server
const server = new FastMCP({
  name: 'VoltAgent MCP Server',
  version: '1.0.0'
});

// Register a tool that uses the execution adapter
server.registerTool({
  name: 'execute_command',
  description: 'Execute a command in the execution environment',
  parameters: {
    type: 'object',
    properties: {
      command: {
        type: 'string',
        description: 'Command to execute'
      }
    },
    required: ['command']
  },
  handler: async ({ command }) => {
    const result = await adapter.executeCommand('mcp-execute', command);
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode
    };
  }
});
```

