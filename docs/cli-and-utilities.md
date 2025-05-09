# CLI and Utility Packages Documentation

VoltAgent provides several utility packages to enhance development workflows and extend functionality. This documentation covers the CLI tools and utility packages available in the VoltAgent ecosystem.

## Table of Contents

- [CLI Tools](#cli-tools)
  - [create-voltagent-app](#create-voltagent-app)
  - [voltagent-cli](#voltagent-cli)
- [Utility Packages](#utility-packages)
  - [langfuse-exporter](#langfuse-exporter)
  - [supabase](#supabase)
  - [voice](#voice)
- [Development Utilities](#development-utilities)
  - [Prompt Creation](#prompt-creation)
  - [Tool Parsing](#tool-parsing)
  - [Serialization](#serialization)

## CLI Tools

### create-voltagent-app

The `create-voltagent-app` package provides a command-line tool for scaffolding new VoltAgent projects.

#### Installation

```bash
npm create voltagent-app@latest
# or
npx create-voltagent-app@latest
```

#### Usage

Running the command will start an interactive prompt to configure your project:

```bash
npm create voltagent-app@latest my-agent-app
```

This will guide you through:
1. Project name selection
2. Package manager selection (npm, yarn, pnpm)
3. Template selection (basic, with-nextjs, etc.)
4. Initial configuration options

#### Templates

The following templates are available:

- **basic**: A simple VoltAgent project with a single agent
- **with-nextjs**: Integration with Next.js for web applications
- **with-voice**: Setup for voice-enabled agents
- **with-rag**: Configuration for Retrieval-Augmented Generation
- **with-multi-agent**: Setup for multi-agent systems

#### Project Structure

The generated project will have the following structure (for the basic template):

```
my-agent-app/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── index.ts
    └── tools/
        └── index.ts
```

#### Configuration

After project creation, you'll need to:

1. Copy `.env.example` to `.env` and add your API keys
2. Install dependencies with your chosen package manager
3. Start the development server with `npm run dev`

### voltagent-cli

The `@voltagent/cli` package provides command-line tools for managing VoltAgent projects.

#### Installation

```bash
npm install -g @voltagent/cli
```

#### Commands

```bash
# Display help
volt --help

# Create a new agent
volt create agent

# List all agents
volt list agents

# Start the VoltAgent server
volt start

# Check for updates
volt update

# Generate tool definitions
volt generate tool

# Initialize a new project
volt init
```

#### Configuration

The CLI stores configuration in a `.voltrc` file in your home directory:

```json
{
  "apiKeys": {
    "openai": "sk-...",
    "anthropic": "sk-..."
  },
  "defaultProvider": "openai",
  "defaultPort": 3141
}
```

You can modify this file directly or use the CLI:

```bash
volt config set apiKeys.openai sk-...
volt config get apiKeys
volt config delete apiKeys.anthropic
```

## Utility Packages

### langfuse-exporter

The `@voltagent/langfuse-exporter` package provides integration with Langfuse for observability and monitoring.

#### Installation

```bash
npm install @voltagent/langfuse-exporter
```

#### Usage

```typescript
import { VoltAgent, Agent } from "@voltagent/core";
import { LangfuseExporter } from "@voltagent/langfuse-exporter";

// Create a Langfuse exporter
const langfuseExporter = new LangfuseExporter({
  apiKey: process.env.LANGFUSE_API_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_BASE_URL, // Optional
});

// Create an agent
const agent = new Agent({
  // ... agent configuration
});

// Initialize VoltAgent with telemetry
new VoltAgent({
  agents: { agent },
  telemetryExporter: langfuseExporter,
});
```

#### Features

- **Trace Generation**: Creates traces for agent runs and tool executions
- **Span Creation**: Records detailed spans for each operation
- **Metrics Collection**: Collects metrics on token usage, latency, etc.
- **Error Tracking**: Records errors and exceptions
- **Custom Attributes**: Supports adding custom attributes to traces and spans

#### Configuration Options

```typescript
const langfuseExporter = new LangfuseExporter({
  apiKey: string,           // Langfuse API key
  publicKey: string,        // Langfuse public key
  baseUrl?: string,         // Langfuse base URL (optional)
  flushInterval?: number,   // Interval for flushing data (ms, default: 5000)
  debug?: boolean,          // Enable debug logging (default: false)
  sessionId?: string,       // Custom session ID (optional)
  userId?: string,          // User ID for attribution (optional)
  tags?: string[],          // Tags for all traces (optional)
});
```

### supabase

The `@voltagent/supabase` package provides integration with Supabase for storage, authentication, and database access.

#### Installation

```bash
npm install @voltagent/supabase
```

#### Usage

```typescript
import { Agent } from "@voltagent/core";
import { SupabaseMemory, createSupabaseTool } from "@voltagent/supabase";
import { z } from "zod";

// Create a Supabase memory provider
const memory = new SupabaseMemory({
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
  tableName: "agent_memory", // Optional, defaults to "agent_history"
});

// Create a Supabase tool
const databaseTool = createSupabaseTool({
  name: "queryDatabase",
  description: "Query the database for information",
  parameters: z.object({
    query: z.string().describe("The SQL query to execute"),
  }),
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseKey: process.env.SUPABASE_KEY,
});

// Create an agent with Supabase integration
const agent = new Agent({
  name: "supabase-agent",
  // ... other configuration
  memory,
  tools: [databaseTool],
});
```

#### Features

- **Memory Provider**: Store agent history in Supabase
- **Database Tools**: Create tools for database operations
- **Authentication**: Integrate with Supabase authentication
- **Storage**: Access Supabase storage for file operations

#### Configuration Options

```typescript
// Memory provider configuration
const memory = new SupabaseMemory({
  supabaseUrl: string,       // Supabase URL
  supabaseKey: string,       // Supabase API key
  tableName?: string,        // Table name (default: "agent_history")
  schema?: string,           // Schema name (default: "public")
  maxEntries?: number,       // Maximum entries to store (optional)
});

// Tool configuration
const tool = createSupabaseTool({
  name: string,              // Tool name
  description: string,       // Tool description
  parameters: ZodSchema,     // Tool parameters
  supabaseUrl: string,       // Supabase URL
  supabaseKey: string,       // Supabase API key
  schema?: string,           // Schema name (default: "public")
});
```

### voice

The `@voltagent/voice` package provides voice capabilities for agents, including speech recognition and synthesis.

#### Installation

```bash
npm install @voltagent/voice
```

#### Usage

```typescript
import { Agent, VoltAgent } from "@voltagent/core";
import { VoiceProvider, createVoiceTool } from "@voltagent/voice";
import { z } from "zod";

// Create a voice provider
const voiceProvider = new VoiceProvider({
  recognitionProvider: "browser", // or "google", "azure", etc.
  synthesisProvider: "browser",   // or "google", "azure", etc.
  // Provider-specific configuration
});

// Create a voice tool
const speakTool = createVoiceTool({
  name: "speak",
  description: "Speak a message to the user",
  parameters: z.object({
    message: z.string().describe("The message to speak"),
    voice: z.string().optional().describe("The voice to use"),
  }),
  voiceProvider,
});

// Create an agent with voice capabilities
const agent = new Agent({
  name: "voice-agent",
  // ... other configuration
  tools: [speakTool],
});

// Initialize VoltAgent
new VoltAgent({
  agents: { agent },
});

// Start voice recognition
voiceProvider.startListening({
  onResult: (transcript) => {
    // Run the agent with the transcript
    agent.run(transcript);
  },
  onError: (error) => {
    console.error("Voice recognition error:", error);
  },
});
```

#### Features

- **Speech Recognition**: Convert spoken language to text
- **Speech Synthesis**: Convert text to spoken language
- **Voice Selection**: Choose from multiple voices
- **Provider Flexibility**: Support for browser, Google, Azure, and other providers
- **Streaming**: Support for streaming audio input and output

#### Configuration Options

```typescript
// Voice provider configuration
const voiceProvider = new VoiceProvider({
  recognitionProvider: "browser" | "google" | "azure" | "custom",
  synthesisProvider: "browser" | "google" | "azure" | "custom",
  
  // Browser-specific options
  browserOptions?: {
    language?: string,        // Recognition language (default: "en-US")
    continuous?: boolean,     // Continuous recognition (default: true)
  },
  
  // Google-specific options
  googleOptions?: {
    apiKey?: string,          // Google API key
    language?: string,        // Recognition language
  },
  
  // Azure-specific options
  azureOptions?: {
    subscriptionKey?: string, // Azure subscription key
    region?: string,          // Azure region
    language?: string,        // Recognition language
  },
  
  // Custom provider options
  customOptions?: any,
});
```

## Development Utilities

### Prompt Creation

The `createPrompt` utility helps create dynamic prompts with template literals:

```typescript
import { createPrompt } from "@voltagent/core";

// Create a prompt template
const prompt = createPrompt`
You are a helpful assistant named ${(ctx) => ctx.agentName}.
Your task is to ${(ctx) => ctx.task}.

User query: ${(ctx) => ctx.query}
`;

// Use the prompt with context
const result = prompt({
  agentName: "Assistant",
  task: "answer questions about programming",
  query: "How do I use async/await in JavaScript?",
});

console.log(result);
// Output:
// You are a helpful assistant named Assistant.
// Your task is to answer questions about programming.
//
// User query: How do I use async/await in JavaScript?
```

#### Advanced Usage

```typescript
// With conditional sections
const advancedPrompt = createPrompt`
You are a ${(ctx) => ctx.role} assistant.

${(ctx) => ctx.includeHistory ? `Previous conversation:
${ctx.history}

` : ''}

User query: ${(ctx) => ctx.query}

${(ctx) => ctx.tools ? `Available tools:
${ctx.tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}` : 'You do not have access to any tools.'}
`;

// With formatting functions
const formattedPrompt = createPrompt`
System: ${(ctx) => ctx.system}

${(ctx) => formatHistory(ctx.history)}

User: ${(ctx) => ctx.query}
`;

function formatHistory(history) {
  if (!history || history.length === 0) return '';
  
  return history.map(entry => {
    if (entry.type === 'user') return `User: ${entry.content}`;
    if (entry.type === 'agent') return `Assistant: ${entry.content}`;
    return '';
  }).join('\n\n');
}
```

### Tool Parsing

The `parseToolCalls` utility extracts tool calls from LLM responses:

```typescript
import { parseToolCalls } from "@voltagent/core";

// LLM response with tool calls
const llmResponse = `
I'll help you with that calculation.

<tool:calculate>
{"expression": "2 + 2 * 3"}
</tool:calculate>

The result is 8.
`;

// Parse tool calls
const toolCalls = parseToolCalls(llmResponse);
console.log(toolCalls);
// Output:
// [{ name: "calculate", arguments: { expression: "2 + 2 * 3" } }]

// You can also specify a custom format
const customToolCalls = parseToolCalls(llmResponse, {
  startDelimiter: "<tool:",
  endDelimiter: "</tool:>",
  extractName: (tag) => tag.split(":")[1].trim(),
});
```

### Serialization

The serialization utilities help with converting complex objects to and from JSON:

```typescript
import { serialize, deserialize } from "@voltagent/core";

// Serialize complex objects
const data = {
  date: new Date(),
  regex: /test/g,
  map: new Map([["key", "value"]]),
  set: new Set([1, 2, 3]),
  buffer: Buffer.from("hello"),
  error: new Error("test error"),
  // ... other complex types
};

// Serialize to JSON-compatible format
const serialized = serialize(data);
console.log(serialized);
// Output: JSON-compatible object with type information

// Deserialize back to original types
const deserialized = deserialize(serialized);
console.log(deserialized.date instanceof Date); // true
console.log(deserialized.regex instanceof RegExp); // true
```

## Best Practices

### CLI Usage

1. **Project Structure**: Follow the recommended project structure for easier maintenance
2. **Environment Variables**: Use `.env` files for configuration and API keys
3. **Version Control**: Add `.env` to `.gitignore` to avoid committing sensitive information
4. **Dependency Management**: Keep dependencies up to date with `volt update`

### Utility Integration

1. **Modular Integration**: Add utility packages as needed rather than all at once
2. **Configuration Management**: Use environment variables for configuration
3. **Error Handling**: Implement proper error handling for utility functions
4. **Testing**: Test utility integrations thoroughly

### Development Workflow

1. **Prompt Engineering**: Use `createPrompt` for complex, dynamic prompts
2. **Tool Development**: Use Zod schemas for type-safe tool parameters
3. **Serialization**: Use serialization utilities for complex data structures
4. **Monitoring**: Integrate with Langfuse for observability

