# MCP Commands

The `volt mcp` command group provides tools for working with the Model Context Protocol (MCP) server and client.

## Server Command

Start an MCP server.

```bash
volt mcp server [options]
```

### Options

- `-p, --port <port>`: Port to run the server on (default: "3000")
- `-h, --host <host>`: Host to bind the server to (default: "localhost")
- `-c, --config <file>`: Path to server configuration file
- `-d, --debug`: Enable debug logging
- `--no-auth`: Disable authentication

### Examples

```bash
# Start an MCP server with default settings
volt mcp server

# Start an MCP server on a specific port
volt mcp server --port 8080

# Start an MCP server with debug logging
volt mcp server --debug

# Start an MCP server with a custom configuration
volt mcp server --config ./mcp-config.json

# Start an MCP server without authentication
volt mcp server --no-auth
```

## Client Command

Connect to an MCP server.

```bash
volt mcp client [options]
```

### Options

- `-u, --url <url>`: URL of the MCP server (default: "http://localhost:3000")
- `-t, --token <token>`: Authentication token
- `-c, --config <file>`: Path to client configuration file
- `-d, --debug`: Enable debug logging
- `--interactive`: Start in interactive mode

### Examples

```bash
# Connect to an MCP server with default settings
volt mcp client

# Connect to a specific MCP server
volt mcp client --url http://mcp-server.example.com:8080

# Connect with authentication
volt mcp client --token my-auth-token

# Connect with debug logging
volt mcp client --debug

# Connect in interactive mode
volt mcp client --interactive

# Connect with a custom configuration
volt mcp client --config ./mcp-client-config.json
```

## What is MCP?

The Model Context Protocol (MCP) is a standardized protocol for communication between AI models and external tools or data sources. It allows AI agents to access and manipulate data, execute code, and interact with external systems in a structured way.

### Key Features

- **Standardized Communication**: Provides a consistent interface for AI models to interact with external tools
- **Tool Registration**: Allows tools to be registered and discovered by AI models
- **Context Management**: Manages the context window for AI models, ensuring relevant information is available
- **Security**: Provides authentication and authorization mechanisms for secure access to tools and data

### Use Cases

- **Agent Development**: Build AI agents that can use tools to accomplish tasks
- **Tool Integration**: Integrate existing tools and services with AI models
- **Multi-Agent Systems**: Enable communication between multiple AI agents
- **Data Access**: Provide AI models with access to structured data sources

