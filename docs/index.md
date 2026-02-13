# VoltAgent Documentation

Welcome to the VoltAgent documentation! This comprehensive guide will help you understand and use the VoltAgent framework effectively.

## Introduction

VoltAgent is an open-source TypeScript framework for building and orchestrating AI agents. It provides modular building blocks, standardized patterns, and abstractions to simplify the development of AI agent applications.

## Documentation Sections

- [**Core Overview**](README.md): Introduction to VoltAgent and its key features
- [**Core Package**](core-package.md): Detailed documentation of the `@voltagent/core` package
- [**Provider Packages**](provider-packages.md): Documentation for LLM provider integrations
- [**Tools and Memory**](tools-and-memory.md): Guide to creating tools and managing memory
- [**Multi-Agent Systems**](multi-agent-systems.md): Building complex systems with multiple agents
- [**CLI and Utilities**](cli-and-utilities.md): Command-line tools and utility packages

## Quick Start

Create a new VoltAgent project in seconds using the `create-voltagent-app` CLI tool:

```bash
npm create voltagent-app@latest
```

This command guides you through setup.

You'll see the starter code in `src/index.ts` to get you started with the VoltAgent framework.

```typescript
import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Define a simple agent
const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant that answers questions without using tools",
  // Note: You can swap VercelAIProvider and openai with other supported providers/models
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

Afterwards, navigate to your project and run:

```bash
npm run dev
```

## Key Concepts

### Agents

Agents are the core building blocks of VoltAgent. An agent is an AI entity with specific capabilities, tools, and memory.

```typescript
const agent = new Agent({
  name: "my-agent",
  description: "A helpful assistant",
  instructions: "You are a helpful assistant that answers questions accurately.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [calculatorTool],
  memory: new InMemoryMemory(),
});
```

### Tools

Tools are functions that agents can use to interact with external systems or perform specific tasks.

```typescript
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
```

### Memory

Memory systems allow agents to retain context across interactions.

```typescript
const agent = new Agent({
  // ... other properties
  memory: new InMemoryMemory(),
});
```

### Multi-Agent Systems

VoltAgent supports building complex systems with multiple specialized agents.

```typescript
const supervisorAgent = new Agent({
  name: "supervisor",
  // ... other properties
  subAgents: [researchAgent, writingAgent, factCheckingAgent],
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

## API Reference

For detailed API reference, see the specific documentation sections:

- [Core Package](core-package.md#api-reference)
- [Provider Packages](provider-packages.md)
- [Tools and Memory](tools-and-memory.md)
- [Multi-Agent Systems](multi-agent-systems.md)
- [CLI and Utilities](cli-and-utilities.md)

## Contributing

Contributions to VoltAgent are welcome! Please refer to the [contribution guidelines](https://github.com/voltagent/voltagent/blob/main/CONTRIBUTING.md) for more information.

Join the [Discord server](https://s.voltagent.dev/discord) for questions and discussions.

