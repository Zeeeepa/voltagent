# VoltAgent MCP Server

The Model Context Protocol (MCP) server implementation for the VoltAgent framework.

## Installation

```bash
npm install @voltagent/mcp-server
# or
yarn add @voltagent/mcp-server
# or
pnpm add @voltagent/mcp-server
```

## Usage

### As a library

```typescript
import { createMCPServer } from "@voltagent/mcp-server";

const server = createMCPServer({
  port: 3000,
  host: "localhost",
  // other options...
});

server
  .start()
  .then(() => {
    console.log("MCP server started successfully");
  })
  .catch((error) => {
    console.error("Failed to start MCP server:", error);
  });
```

### As a CLI

```bash
# Install globally
npm install -g @voltagent/mcp-server

# Run the server
voltagent-mcp

# With custom port
MCP_PORT=4000 voltagent-mcp
```

## Configuration

The MCP server can be configured with the following options:

| Option | Environment Variable | Default     | Description           |
| ------ | -------------------- | ----------- | --------------------- |
| `port` | `MCP_PORT`           | `3000`      | The port to listen on |
| `host` | `MCP_HOST`           | `localhost` | The host to bind to   |

## License

MIT
