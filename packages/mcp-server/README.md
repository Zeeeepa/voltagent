# VoltAgent MCP Server

This package provides the Model Context Protocol (MCP) server implementation for VoltAgent.

## Installation

```bash
npm install @voltagent/mcp-server
```

## Usage

### As a CLI

```bash
# Install globally
npm install -g @voltagent/mcp-server

# Run the MCP server
voltagent-mcp
```

### As a library

```typescript
import { createMCPServer } from '@voltagent/mcp-server';

// Create and start the MCP server
const server = createMCPServer({
  port: 3000,
  // other options...
});

server.start();
```

## Configuration

The MCP server can be configured using environment variables or by passing options to the `createMCPServer` function.

### Environment Variables

- `PORT`: The port to run the server on (default: 3000)
- `HOST`: The host to bind to (default: localhost)
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `OPENAI_API_KEY`: Your OpenAI API key

### Configuration Options

```typescript
const server = createMCPServer({
  port: 3000,
  host: 'localhost',
  anthropicApiKey: 'your-anthropic-api-key',
  openaiApiKey: 'your-openai-api-key',
  // other options...
});
```

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run in development mode
pnpm dev
```

