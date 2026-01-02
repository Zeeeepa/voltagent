# VoltAgent Examples

This documentation provides an overview of the example projects included in the VoltAgent repository. These examples demonstrate various use cases and integration patterns.

## Table of Contents

- [Basic Example](#basic-example)
- [Next.js Integration](#nextjs-integration)
- [Google Vertex AI Integration](#google-vertex-ai-integration)
- [Google Drive MCP Integration](#google-drive-mcp-integration)
- [Other Examples](#other-examples)
- [Running the Examples](#running-the-examples)

## Basic Example

The basic example demonstrates a simple agent with a calculator tool.

### Key Features

- Basic agent setup
- Calculator tool implementation
- Simple HTTP server

### Code Structure

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
  name: "Assistant",
  description: "A helpful assistant that can answer questions and perform calculations",
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

## Next.js Integration

The Next.js example demonstrates how to integrate VoltAgent with a Next.js application.

### Key Features

- Integration with Next.js
- Server-side agent setup
- Client-side chat interface
- Server actions for agent communication

### Code Structure

#### Server-Side Agent Setup (`voltagent/index.ts`)

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

export const agent = new Agent({
  name: "Assistant",
  description: "A helpful assistant that can answer questions and perform calculations",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [calculatorTool],
});

new VoltAgent({
  agents: {
    agent,
  },
});
```

#### Server Actions (`app/actions.ts`)

```typescript
"use server";

import { agent } from "../voltagent";

export async function chat(message: string) {
  try {
    const response = await agent.run(message);
    return { message: response };
  } catch (error) {
    console.error("Error in chat:", error);
    return { error: "Failed to get response from agent" };
  }
}
```

#### Client-Side Chat Interface (`app/page.tsx`)

```tsx
"use client";

import { useState } from "react";
import { chat } from "./actions";

export default function Home() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: input }]);
    setLoading(true);

    try {
      // Get agent response
      const response = await chat(input);
      
      if (response.error) {
        setMessages((prev) => [...prev, { role: "error", content: response.error }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: response.message }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: "error", content: "Failed to get response" }]);
    } finally {
      setLoading(false);
      setInput("");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">VoltAgent Chat</h1>
        
        <div className="mb-4 border rounded-lg p-4 h-96 overflow-y-auto">
          {messages.map((msg, i) => (
            <div key={i} className={`mb-4 ${msg.role === "user" ? "text-blue-500" : "text-green-500"}`}>
              <strong>{msg.role === "user" ? "You" : "Assistant"}:</strong> {msg.content}
            </div>
          ))}
          {loading && <div className="text-gray-400">Assistant is thinking...</div>}
        </div>
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 p-2 border rounded"
            placeholder="Ask something..."
          />
          <button 
            type="submit" 
            disabled={loading} 
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
          >
            Send
          </button>
        </form>
      </div>
    </main>
  );
}
```

## Google Vertex AI Integration

The Google Vertex AI example demonstrates how to use Google's Gemini models with VoltAgent.

### Key Features

- Integration with Google Vertex AI
- Gemini model usage
- Custom tools for Google services

### Code Structure

```typescript
import { VoltAgent, Agent, createTool } from "@voltagent/core";
import { GoogleAIProvider } from "@voltagent/google-ai";
import { z } from "zod";

// Create a Google AI provider
const googleProvider = new GoogleAIProvider({
  apiKey: process.env.GOOGLE_API_KEY,
});

// Define a search tool
const searchTool = createTool({
  name: "search",
  description: "Search for information on the web",
  parameters: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async (args) => {
    // Implementation to search using Google Search API
    // This is a placeholder - you would integrate with the Google Search API
    return {
      results: [
        { title: "Result 1", snippet: "Snippet 1", url: "https://example.com/1" },
        { title: "Result 2", snippet: "Snippet 2", url: "https://example.com/2" },
      ],
    };
  },
});

// Define an agent with Google AI
const agent = new Agent({
  name: "google-agent",
  description: "A helpful assistant powered by Google Gemini",
  instructions: "You are a helpful assistant powered by Google Gemini. You can search for information on the web.",
  llm: googleProvider,
  model: "gemini-1.5-pro",
  tools: [searchTool],
});

// Initialize VoltAgent
new VoltAgent({
  agents: {
    agent,
  },
});
```

## Google Drive MCP Integration

The Google Drive MCP example demonstrates how to use the Model Context Protocol (MCP) to integrate with Google Drive.

### Key Features

- MCP client integration
- Google Drive API access
- File operations through MCP

### Code Structure

#### MCP Client Setup

```typescript
import { VoltAgent, Agent, MCPClient } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Create an MCP client for Google Drive
const mcpClient = new MCPClient({
  type: "http",
  url: "http://localhost:8000", // URL of the Google Drive MCP server
});

// Get available tools from the MCP server
const mcpTools = await mcpClient.getTools();

// Create an agent with MCP tools
const agent = new Agent({
  name: "drive-agent",
  description: "An assistant that can interact with Google Drive",
  instructions: "You are an assistant that can help users manage their Google Drive files and folders.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: mcpTools,
});

// Initialize VoltAgent
new VoltAgent({
  agents: {
    agent,
  },
});
```

#### MCP Server Implementation

```typescript
import { createServer } from "http";
import { MCPServer } from "mcp-server";
import { google } from "googleapis";

// Set up Google Drive API client
const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
const drive = google.drive({ version: "v3", auth });

// Create MCP server
const mcpServer = new MCPServer();

// Register tools
mcpServer.registerTool({
  name: "listFiles",
  description: "List files in Google Drive",
  parameters: {
    type: "object",
    properties: {
      folderId: {
        type: "string",
        description: "The folder ID to list files from. Use 'root' for the root folder.",
      },
    },
    required: ["folderId"],
  },
  handler: async (params) => {
    const res = await drive.files.list({
      q: `'${params.folderId === "root" ? "root" : params.folderId}' in parents`,
      fields: "files(id, name, mimeType, webViewLink)",
    });
    
    return {
      files: res.data.files,
    };
  },
});

// Add more tools for file operations

// Start the server
const httpServer = createServer((req, res) => {
  mcpServer.handleRequest(req, res);
});

httpServer.listen(8000, () => {
  console.log("MCP server running on port 8000");
});
```

## Other Examples

The VoltAgent repository includes several other examples:

- **Voice Integration**: Demonstrates using the `@voltagent/voice` package for speech recognition and synthesis
- **RAG Implementation**: Shows how to implement Retrieval-Augmented Generation with VoltAgent
- **Multi-Agent System**: Illustrates building complex systems with multiple specialized agents
- **Supabase Integration**: Demonstrates using Supabase for storage and authentication
- **Langfuse Integration**: Shows how to add observability with Langfuse

## Running the Examples

To run an example:

1. Clone the VoltAgent repository:

```bash
git clone https://github.com/voltagent/voltagent.git
cd voltagent
```

2. Install dependencies:

```bash
pnpm install
```

3. Build the packages:

```bash
pnpm build:all
```

4. Navigate to the example directory:

```bash
cd examples/with-nextjs
```

5. Install example dependencies:

```bash
pnpm install
```

6. Create a `.env` file with your API keys:

```
OPENAI_API_KEY=sk-...
# Other required API keys
```

7. Start the example:

```bash
pnpm dev
```

8. Open your browser to the URL shown in the console (typically http://localhost:3000 or http://localhost:3141).

