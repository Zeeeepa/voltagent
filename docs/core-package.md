# Core Package Documentation

The `@voltagent/core` package is the foundation of the VoltAgent framework. It provides the essential components for building AI agents, including the Agent class, tool management, memory systems, and server capabilities.

## Table of Contents

- [Installation](#installation)
- [Key Components](#key-components)
- [Agent](#agent)
- [Tools](#tools)
- [Memory](#memory)
- [Retriever](#retriever)
- [MCP (Model Context Protocol)](#mcp-model-context-protocol)
- [Server](#server)
- [Utilities](#utilities)

## Installation

```bash
npm install @voltagent/core
```

## Key Components

### Agent

The `Agent` class is the central component of VoltAgent. It represents an AI agent with specific capabilities, tools, and memory.

#### Creating an Agent

```typescript
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "my-agent",
  description: "A helpful assistant",
  instructions: "You are a helpful assistant that answers questions accurately.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});
```

#### Agent Options

- `name` (required): Unique identifier for the agent
- `description` (optional): Human-readable description of the agent's purpose
- `instructions` (optional): Detailed instructions for the agent's behavior
- `llm` (required): LLM provider instance
- `model` (required): Specific model configuration
- `tools` (optional): Array of tools available to the agent
- `memory` (optional): Memory provider for context retention
- `hooks` (optional): Lifecycle hooks for customizing agent behavior
- `subAgents` (optional): Sub-agents for multi-agent systems

#### Agent Methods

- `run(input: string, options?: RunOptions)`: Run the agent with a text input
- `runStream(input: string, options?: StreamOptions)`: Run the agent with streaming output
- `getSubAgents()`: Get all sub-agents
- `getTools()`: Get all tools available to the agent

### Tools

Tools are functions that agents can use to interact with external systems or perform specific tasks. VoltAgent provides a type-safe way to define tools using Zod schemas.

#### Creating a Tool

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";

const weatherTool = createTool({
  name: "getWeather",
  description: "Get the current weather for a location",
  parameters: z.object({
    location: z.string().describe("The city and state, e.g. San Francisco, CA"),
  }),
  execute: async (args) => {
    // Implementation to fetch weather data
    const weather = await fetchWeatherData(args.location);
    return { temperature: weather.temp, conditions: weather.conditions };
  },
});
```

#### Tool Options

- `name` (required): Unique identifier for the tool
- `description` (required): Human-readable description of the tool's purpose
- `parameters` (required): Zod schema defining the tool's parameters
- `execute` (required): Function that implements the tool's functionality
- `hooks` (optional): Lifecycle hooks for customizing tool behavior

### Memory

Memory systems allow agents to retain context across interactions. VoltAgent supports different memory providers.

#### In-Memory Memory

```typescript
import { Agent, InMemoryMemory } from "@voltagent/core";

const agent = new Agent({
  // ... other properties
  memory: new InMemoryMemory(),
});
```

#### LibSQL Memory

```typescript
import { Agent, LibSQLMemory } from "@voltagent/core";

const agent = new Agent({
  // ... other properties
  memory: new LibSQLMemory({
    url: "file:memory.db",
  }),
});
```

#### Custom Memory Provider

You can create custom memory providers by implementing the `MemoryProvider` interface:

```typescript
import { MemoryProvider, AgentHistoryEntry } from "@voltagent/core";

class CustomMemory implements MemoryProvider {
  async addEntry(entry: AgentHistoryEntry): Promise<void> {
    // Implementation
  }

  async getEntries(limit?: number): Promise<AgentHistoryEntry[]> {
    // Implementation
    return [];
  }

  async clear(): Promise<void> {
    // Implementation
  }
}
```

### Retriever

The retriever system enables agents to fetch relevant information from various sources, supporting Retrieval-Augmented Generation (RAG) patterns.

#### Creating a Retriever

```typescript
import { Retriever, createTool } from "@voltagent/core";
import { z } from "zod";

// Create a data source
const dataSource = {
  async search(query: string) {
    // Implementation to search data
    return [{ content: "Relevant information", score: 0.95 }];
  }
};

// Create a retriever
const retriever = new Retriever({
  name: "knowledgeBase",
  description: "Retrieves information from the knowledge base",
  dataSource,
});

// Create a retriever tool
const retrieverTool = createTool({
  name: "searchKnowledge",
  description: "Search the knowledge base for information",
  parameters: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async (args) => {
    const results = await retriever.retrieve(args.query);
    return { results };
  },
});
```

### MCP (Model Context Protocol)

VoltAgent supports the Model Context Protocol for standardized tool interactions, allowing agents to connect to external tool servers.

#### Creating an MCP Client

```typescript
import { MCPClient } from "@voltagent/core";

// Create an MCP client for an HTTP server
const mcpClient = new MCPClient({
  type: "http",
  url: "http://localhost:8000",
});

// Get available tools
const tools = await mcpClient.getTools();

// Use in an agent
const agent = new Agent({
  // ... other properties
  tools: tools,
});
```

### Server

VoltAgent includes a built-in HTTP server for agent interaction and management.

#### Starting the Server

The server is automatically started when you create a VoltAgent instance with `autoStart: true` (default):

```typescript
import { VoltAgent, Agent } from "@voltagent/core";

const agent = new Agent({ /* ... */ });

new VoltAgent({
  agents: { agent },
  port: 3141, // Optional, defaults to 3141
  autoStart: true, // Optional, defaults to true
});
```

You can also start the server manually:

```typescript
const voltAgent = new VoltAgent({
  agents: { agent },
  autoStart: false,
});

await voltAgent.startServer();
```

### Utilities

VoltAgent provides various utilities for working with agents and tools.

#### Creating Prompts

```typescript
import { createPrompt } from "@voltagent/core";

const prompt = createPrompt`
You are a helpful assistant named ${(ctx) => ctx.agentName}.
Your task is to ${(ctx) => ctx.task}.

User query: ${(ctx) => ctx.query}
`;

const result = prompt({
  agentName: "Assistant",
  task: "answer questions about programming",
  query: "How do I use async/await in JavaScript?",
});
```

#### Tool Parsing

```typescript
import { parseToolCalls } from "@voltagent/core";

const llmResponse = `
I'll help you with that calculation.

<tool:calculate>
{"expression": "2 + 2 * 3"}
</tool:calculate>

The result is 8.
`;

const toolCalls = parseToolCalls(llmResponse);
// [{ name: "calculate", arguments: { expression: "2 + 2 * 3" } }]
```

## Advanced Usage

### Agent Hooks

Hooks allow you to customize agent behavior at various points in the execution lifecycle:

```typescript
import { Agent } from "@voltagent/core";

const agent = new Agent({
  // ... other properties
  hooks: {
    beforeRun: async (context) => {
      console.log(`Running agent with input: ${context.input}`);
      return context;
    },
    afterRun: async (context) => {
      console.log(`Agent response: ${context.response}`);
      return context;
    },
    beforeToolCall: async (context) => {
      console.log(`About to call tool: ${context.toolCall.name}`);
      return context;
    },
    afterToolCall: async (context) => {
      console.log(`Tool call completed: ${context.toolCall.name}`);
      return context;
    },
  },
});
```

### Open Telemetry

VoltAgent supports OpenTelemetry for monitoring and tracing:

```typescript
import { VoltAgent } from "@voltagent/core";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";

new VoltAgent({
  agents: { /* ... */ },
  telemetryExporter: new ConsoleSpanExporter(),
});
```

### Events

VoltAgent provides an event system for monitoring agent activity:

```typescript
import { VoltAgent, AgentRegistry } from "@voltagent/core";

const agent = new Agent({ /* ... */ });

new VoltAgent({
  agents: { agent },
});

const registry = AgentRegistry.getInstance();
registry.on("agentRun", (event) => {
  console.log(`Agent ${event.agentId} ran with input: ${event.input}`);
});
```

Available events:
- `agentRun`: Triggered when an agent runs
- `agentResponse`: Triggered when an agent generates a response
- `toolCall`: Triggered when a tool is called
- `toolResponse`: Triggered when a tool returns a response
- `error`: Triggered when an error occurs

