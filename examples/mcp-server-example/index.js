// Example usage of the VoltAgent MCP Server
import { createMCPServer } from '../../packages/mcp-server/dist/index.mjs';

// Create and start the MCP server
const server = createMCPServer({
  port: 3000,
  // other options...
});

server.start()
  .then(() => {
    console.log('MCP server started successfully');
    console.log('Press Ctrl+C to stop the server');
  })
  .catch((error) => {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  });

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

