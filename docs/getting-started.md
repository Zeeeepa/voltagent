# Getting Started with VoltAgent

This guide will help you get started with VoltAgent, from installation to creating your first AI agent.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Creating Your First Agent](#creating-your-first-agent)
- [Adding Tools](#adding-tools)
- [Running Your Agent](#running-your-agent)
- [Next Steps](#next-steps)

## Prerequisites

Before you begin, make sure you have:

- Node.js 18 or later installed
- A package manager (npm, yarn, or pnpm)
- API keys for the LLM provider you want to use (e.g., OpenAI, Anthropic, Google)

## Installation

The easiest way to get started is to use the `create-voltagent-app` CLI tool:

```bash
npm create voltagent-app@latest my-agent-app
```

This will guide you through an interactive setup process:

1. Project name selection (defaults to the directory name)
2. Package manager selection (npm, yarn, pnpm)
3. Template selection (basic, with-nextjs, etc.)
4. Initial configuration options

After the setup is complete, navigate to your project directory:

```bash
cd my-agent-app
```

Copy the example environment file and add your API keys:

```bash
cp .env.example .env
```

Edit the `.env` file to add your API keys:

```
# LLM Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-...
GOOGLE_API_KEY=...

# Other Configuration
PORT=3141
```

Install dependencies:

```bash
npm install
```

## Creating Your First Agent

Open the `src/index.ts` file, which contains a basic agent setup:

```typescript
import { VoltAgent, Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Define a simple agent
const agent = new Agent({
  name: "my-agent",
  instructions: "A helpful assistant that answers questions without using tools",
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

This creates a basic agent that can answer questions using the OpenAI GPT-4o-mini model through the Vercel AI SDK.

You can customize the agent by modifying its properties:

```typescript
const agent = new Agent({
  name: "my-agent",
  description: "A helpful assistant for answering questions about programming",
  instructions: `
    You are a programming assistant specialized in JavaScript, TypeScript, and Node.js.
    Your goal is to provide clear, concise, and accurate answers to programming questions.
    Include code examples when appropriate.
    Be friendly and helpful.
  `,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});
```

## Adding Tools

Tools extend an agent's capabilities by allowing it to perform specific tasks. Let's add a calculator tool:

```typescript
import { VoltAgent, Agent, createTool } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Define a calculator tool
const calculatorTool = createTool({
  name: "calculate",
  description: "Perform a mathematical calculation",
  parameters: z.object({
    expression: z.string().describe("The mathematical expression to evaluate, e.g. (2 + 2) * 3"),
  }),
  execute: async (args) => {
    try {
      // Using Function is still not ideal for production but safer than direct eval
      // eslint-disable-next-line no-new-func
      const result = new Function(`return ${args.expression}`)();
      return { result };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      throw new Error(`Invalid expression: ${args.expression}. Error: ${errorMessage}`);
    }
  },
});

// Define a simple agent with the calculator tool
const agent = new Agent({
  name: "my-agent",
  description: "A helpful assistant that can answer questions and perform calculations",
  instructions: `
    You are a helpful assistant that can answer questions and perform calculations.
    When a user asks you to calculate something, use the calculate tool.
  `,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [calculatorTool],
});

// Initialize VoltAgent with your agent(s)
new VoltAgent({
  agents: {
    agent,
  },
});
```

## Running Your Agent

Start the development server:

```bash
npm run dev
```

You should see output similar to:

```
═══════════════════════════════════════════════
VOLTAGENT SERVER STARTED SUCCESSFULLY
═══════════════════════════════════════════════
✓ HTTP Server: http://localhost:3141

Developer Console: https://console.voltagent.dev
═══════════════════════════════════════════════
```

Your agent is now running! To interact with it:

1. Open the Console: Click the [VoltAgent Console](https://console.voltagent.dev) link in your terminal output (or copy-paste it into your browser).
2. Find Your Agent: On the VoltAgent Console page, you should see your agent listed (e.g., "my-agent").
3. Open Agent Details: Click on your agent's name.
4. Start Chatting: On the agent detail page, click the chat icon in the bottom right corner to open the chat window.
5. Send a Message: Type a message like "Hello" or "What is 2 + 2 * 3?" and press Enter.

## Next Steps

Now that you have a basic agent running, here are some next steps to explore:

### Add More Tools

Create additional tools to extend your agent's capabilities:

```typescript
// Weather tool
const weatherTool = createTool({
  name: "getWeather",
  description: "Get the current weather for a location",
  parameters: z.object({
    location: z.string().describe("The city and state, e.g. San Francisco, CA"),
  }),
  execute: async (args) => {
    // Implementation to fetch weather data
    // This is a placeholder - you would integrate with a weather API
    return {
      temperature: 72,
      conditions: "Sunny",
      location: args.location,
    };
  },
});

// Add to your agent's tools
const agent = new Agent({
  // ... other properties
  tools: [calculatorTool, weatherTool],
});
```

### Add Memory

Enable your agent to remember past interactions:

```typescript
import { Agent, InMemoryMemory } from "@voltagent/core";

const agent = new Agent({
  // ... other properties
  memory: new InMemoryMemory(),
});
```

### Create a Multi-Agent System

Build a system with multiple specialized agents:

```typescript
// Create specialized agents
const researchAgent = new Agent({
  name: "research-agent",
  description: "Specialized in researching information",
  // ... other properties
});

const writingAgent = new Agent({
  name: "writing-agent",
  description: "Specialized in writing content",
  // ... other properties
});

// Create a supervisor agent
const supervisorAgent = new Agent({
  name: "content-supervisor",
  description: "Coordinates research and writing to create comprehensive content",
  // ... other properties
  subAgents: [researchAgent, writingAgent],
});
```

### Integrate with a Web Application

For Next.js integration, check out the `with-nextjs` template:

```bash
npm create voltagent-app@latest my-nextjs-agent -- --template with-nextjs
```

This creates a project with both a VoltAgent backend and a Next.js frontend.

### Explore Advanced Features

- **Voice Integration**: Add voice capabilities with `@voltagent/voice`
- **Database Integration**: Connect to databases with `@voltagent/supabase`
- **Monitoring**: Add observability with `@voltagent/langfuse-exporter`
- **RAG**: Implement Retrieval-Augmented Generation with the retriever system

## Troubleshooting

### Common Issues

1. **API Key Errors**: Make sure your API keys are correctly set in the `.env` file
2. **Port Conflicts**: If port 3141 is already in use, change the PORT in your `.env` file
3. **Dependency Issues**: Make sure you have the correct versions of dependencies

### Getting Help

If you encounter issues:

1. Check the [documentation](https://voltagent.dev/docs/)
2. Join the [Discord server](https://s.voltagent.dev/discord) for community support
3. Open an issue on [GitHub](https://github.com/voltagent/voltagent/issues)

