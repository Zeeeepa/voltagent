# VoltAgent MCP Server with Execution Environments Example

This example demonstrates how to use the execution environments with the MCP server.

## Overview

The execution environments module provides a unified interface for executing commands and managing files across different execution environments (local, Docker, E2B). This example shows how to integrate the execution environments with the MCP server to provide a set of tools for executing commands and managing files.

## Features

- Execute commands in the execution environment
- Read files from the execution environment
- Write files to the execution environment
- Edit files in the execution environment
- List directories in the execution environment

## Getting Started

### Prerequisites

- Node.js 18 or later
- Docker (optional, for Docker execution environment)
- E2B account (optional, for E2B execution environment)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
pnpm install
```

3. Build the example:

```bash
pnpm run build
```

### Running the Example

```bash
pnpm run start
```

This will start the MCP server with the execution environment tools.

## Usage

The MCP server provides the following tools:

- `execute_command`: Execute a command in the execution environment
- `read_file`: Read a file from the execution environment
- `write_file`: Write content to a file in the execution environment
- `edit_file`: Edit a file by replacing content
- `list_directory`: List files in a directory

You can use these tools with any MCP client, such as the VoltAgent MCP client.

## Execution Environments

The example uses the local execution environment by default. You can change the execution environment by modifying the `type` parameter in the `createExecutionAdapter` function:

```typescript
const { adapter } = await createExecutionAdapter({
  type: 'local', // Use 'docker' or 'e2b' for other environments
  logger
});
```

### Docker Execution Environment

To use the Docker execution environment, you need to have Docker installed and running. You also need to provide the `projectRoot` parameter:

```typescript
const { adapter } = await createExecutionAdapter({
  type: 'docker',
  docker: {
    projectRoot: '/path/to/project',
    composeFilePath: '/path/to/docker-compose.yml',
    serviceName: 'voltagent',
    projectName: 'voltagent'
  },
  logger
});
```

### E2B Execution Environment

To use the E2B execution environment, you need to have an E2B account and a sandbox ID:

```typescript
const { adapter } = await createExecutionAdapter({
  type: 'e2b',
  e2b: {
    sandboxId: 'your-e2b-sandbox-id'
  },
  logger
});
```

## License

MIT

