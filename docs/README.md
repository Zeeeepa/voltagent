# VoltAgent Documentation

VoltAgent is an open-source TypeScript framework for building and orchestrating AI agents. This documentation provides a comprehensive overview of the framework, its components, and how to use it effectively.

## Table of Contents

- [Introduction](#introduction)
- [Architecture Overview](#architecture-overview)
- [Core Components](#core-components)
- [Getting Started](#getting-started)
- [Advanced Usage](#advanced-usage)
- [API Reference](#api-reference)
- [Examples](#examples)
- [Contributing](#contributing)

## Introduction

VoltAgent is designed to simplify the development of AI agent applications by providing modular building blocks, standardized patterns, and abstractions. It bridges the gap between DIY approaches and no-code builders, offering structure and components without sacrificing flexibility.

### Key Features

- **Agent Core:** Define agents with descriptions, LLM providers, tools, and memory management
- **Multi-Agent Systems:** Build complex workflows using Supervisor Agents coordinating multiple specialized Sub-Agents
- **Tool Usage & Lifecycle:** Equip agents with custom or pre-built tools with type-safety (Zod)
- **Flexible LLM Support:** Integrate with various LLM providers (OpenAI, Anthropic, Google, etc.)
- **Memory Management:** Enable agents to retain context across interactions
- **Observability & Debugging:** Monitor agent states, interactions, logs, and performance
- **Voice Interaction:** Build voice-enabled agents with speech recognition and synthesis
- **Data Retrieval & RAG:** Implement specialized retriever agents for efficient information fetching
- **Model Context Protocol (MCP) Support:** Connect to external tool servers adhering to the MCP standard
- **Prompt Engineering Tools:** Utilities for crafting and managing effective prompts

## Architecture Overview

VoltAgent follows a modular architecture with several key components:

1. **Core Engine (`@voltagent/core`):** The foundation of the framework, providing the Agent class, tool management, memory systems, and server capabilities.

2. **Provider Packages:** Integrations with various LLM providers:
   - `@voltagent/anthropic-ai`
   - `@voltagent/google-ai`
   - `@voltagent/groq-ai`
   - `@voltagent/vercel-ai`
   - `@voltagent/xsai`

3. **Utility Packages:**
   - `@voltagent/cli`: Command-line tools for managing VoltAgent projects
   - `@voltagent/create-voltagent-app`: Project scaffolding tool
   - `@voltagent/langfuse-exporter`: Integration with Langfuse for observability
   - `@voltagent/supabase`: Supabase integration for storage and authentication
   - `@voltagent/voice`: Voice capabilities for agents

4. **Server Component:** Built-in HTTP server for agent interaction and management

## Core Components

### Agent

The `Agent` class is the central component of VoltAgent. It represents an AI agent with specific capabilities, tools, and memory.

Key properties:
- `name`: Unique identifier for the agent
- `description`: Human-readable description of the agent's purpose
- `llm`: LLM provider instance
- `model`: Specific model configuration
- `tools`: Array of tools available to the agent
- `memory`: Memory provider for context retention

### Tools

Tools are functions that agents can use to interact with external systems or perform specific tasks. VoltAgent provides a type-safe way to define tools using Zod schemas.

### Memory

Memory systems allow agents to retain context across interactions. VoltAgent supports different memory providers:
- In-memory storage
- LibSQL-based persistence
- Custom memory providers

### Retriever

The retriever system enables agents to fetch relevant information from various sources, supporting Retrieval-Augmented Generation (RAG) patterns.

### MCP (Model Context Protocol)

VoltAgent supports the Model Context Protocol for standardized tool interactions, allowing agents to connect to external tool servers.

## Getting Started

### Installation

Create a new VoltAgent project using the CLI:

```bash
npm create voltagent-app@latest
```

Or install the core package in an existing project:

```bash
npm install @voltagent/core
```

### Basic Usage

Here's a simple example of creating an agent:

```typescript
import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Define a simple agent
const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant that answers questions",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// Initialize VoltAgent with your agent(s)
new VoltAgent({
  agents: {
    agent,
  },
});
```

### Adding Tools

Tools extend an agent's capabilities:

```typescript
import { createTool } from "@voltagent/core";
import { z } from "zod";

const calculatorTool = createTool({
  name: "calculate",
  description: "Perform a mathematical calculation",
  parameters: z.object({
    expression: z.string().describe("The mathematical expression to evaluate"),
  }),
  execute: async (args) => {
    try {
      const result = new Function(`return ${args.expression}`)();
      return { result };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      throw new Error(`Invalid expression: ${args.expression}. Error: ${errorMessage}`);
    }
  },
});

const agent = new Agent({
  // ... other properties
  tools: [calculatorTool],
});
```

## Advanced Usage

### Multi-Agent Systems

VoltAgent supports creating complex systems with multiple agents:

```typescript
import { Agent, VoltAgent } from "@voltagent/core";

// Create specialized agents
const researchAgent = new Agent({ /* ... */ });
const writingAgent = new Agent({ /* ... */ });
const factCheckingAgent = new Agent({ /* ... */ });

// Create a supervisor agent
const supervisorAgent = new Agent({
  name: "supervisor",
  // ... other properties
  subAgents: [researchAgent, writingAgent, factCheckingAgent],
});

// Initialize VoltAgent
new VoltAgent({
  agents: {
    supervisor: supervisorAgent,
  },
});
```

### Memory Management

Configure memory to retain context across interactions:

```typescript
import { Agent, InMemoryMemory } from "@voltagent/core";

const agent = new Agent({
  // ... other properties
  memory: new InMemoryMemory(),
});
```

### Hooks

Use hooks to customize agent behavior:

```typescript
import { Agent } from "@voltagent/core";

const agent = new Agent({
  // ... other properties
  hooks: {
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

## API Reference

### VoltAgent Class

The main class for managing agents and the server.

```typescript
new VoltAgent({
  agents: Record<string, Agent<any>>,
  port?: number,
  autoStart?: boolean,
  checkDependencies?: boolean,
  telemetryExporter?: SpanExporter | SpanExporter[],
});
```

Methods:
- `registerAgent(agent: Agent<any>)`: Register a single agent
- `registerAgents(agents: Record<string, Agent<any>>)`: Register multiple agents
- `startServer()`: Start the HTTP server
- `getAgents()`: Get all registered agents
- `getAgent(id: string)`: Get an agent by ID
- `getAgentCount()`: Get the number of registered agents
- `shutdownTelemetry()`: Shut down the telemetry provider

### Agent Class

Represents an AI agent with specific capabilities.

```typescript
new Agent({
  name: string,
  description?: string,
  instructions?: string,
  llm: LLMProvider,
  model: any,
  tools?: Tool[],
  memory?: MemoryProvider,
  hooks?: AgentHooks,
  subAgents?: Agent<any>[],
});
```

Methods:
- `run(input: string, options?: RunOptions)`: Run the agent with a text input
- `runStream(input: string, options?: StreamOptions)`: Run the agent with streaming output
- `getSubAgents()`: Get all sub-agents
- `getTools()`: Get all tools available to the agent

### Tool Creation

Create custom tools for agents:

```typescript
createTool({
  name: string,
  description: string,
  parameters: ZodSchema,
  execute: (args: any) => Promise<any>,
});
```

## Examples

VoltAgent includes various examples demonstrating different use cases:

- Basic agent with tools
- Integration with Next.js
- Voice-enabled agents
- Multi-agent systems
- RAG implementations
- MCP integrations

See the [examples directory](https://github.com/voltagent/voltagent/tree/main/examples) for complete implementations.

## Contributing

Contributions to VoltAgent are welcome! Please refer to the [contribution guidelines](https://github.com/voltagent/voltagent/blob/main/CONTRIBUTING.md) for more information.

Join the [Discord server](https://s.voltagent.dev/discord) for questions and discussions.

