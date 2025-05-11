# VoltAgent MCP Server Example

This example demonstrates how to use the VoltAgent MCP Server.

## Installation

```bash
# Clone the repository
git clone https://github.com/Zeeeepa/voltagent.git
cd voltagent

# Install dependencies
pnpm install

# Build packages
pnpm build
```

## Usage

```bash
# Start the MCP server
cd examples/mcp-server-example
node index.js
```

## Example Code

```javascript
// index.js
import { createMCPServer } from '@voltagent/mcp-server';

// Create and start the MCP server
const server = createMCPServer({
  port: 3000,
  // other options...
});

server.start()
  .then(() => {
    console.log('MCP server started successfully');
  })
  .catch((error) => {
    console.error('Failed to start MCP server:', error);
  });
```

## Configuration

See the [MCP Server documentation](../../packages/mcp-server/README.md) for more information on configuration options.

