# Tools and Memory Documentation

This documentation covers two essential aspects of the VoltAgent framework: Tools and Memory. These components enable agents to interact with external systems and maintain context across interactions.

## Table of Contents

- [Tools](#tools)
  - [Creating Tools](#creating-tools)
  - [Tool Parameters](#tool-parameters)
  - [Tool Execution](#tool-execution)
  - [Tool Hooks](#tool-hooks)
  - [Tool Manager](#tool-manager)
  - [Reasoning Tools](#reasoning-tools)
  - [Tool Kits](#tool-kits)
- [Memory](#memory)
  - [Memory Providers](#memory-providers)
  - [In-Memory Provider](#in-memory-provider)
  - [LibSQL Provider](#libsql-provider)
  - [Custom Memory Providers](#custom-memory-providers)
  - [Memory Manager](#memory-manager)

## Tools

Tools are functions that agents can use to interact with external systems or perform specific tasks. VoltAgent provides a type-safe way to define tools using Zod schemas.

### Creating Tools

The `createTool` function is the primary way to define tools:

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

### Tool Parameters

Tool parameters are defined using Zod schemas, providing type safety and validation:

```typescript
import { z } from "zod";

const parameters = z.object({
  // Simple string parameter
  name: z.string().describe("The user's name"),
  
  // Number parameter with constraints
  age: z.number().min(0).max(120).describe("The user's age"),
  
  // Optional parameter
  email: z.string().email().optional().describe("The user's email address"),
  
  // Enum parameter
  role: z.enum(["admin", "user", "guest"]).describe("The user's role"),
  
  // Nested object
  address: z.object({
    street: z.string(),
    city: z.string(),
    zipCode: z.string(),
  }).describe("The user's address"),
  
  // Array parameter
  tags: z.array(z.string()).describe("Tags associated with the user"),
});
```

### Tool Execution

The `execute` function implements the tool's functionality:

```typescript
const searchTool = createTool({
  name: "search",
  description: "Search for information on the web",
  parameters: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async (args, context) => {
    try {
      // Access the query parameter
      const { query } = args;
      
      // Access the context (optional)
      const { agentId } = context;
      
      // Perform the search
      const results = await performSearch(query);
      
      // Return the results
      return {
        results: results.map(r => ({
          title: r.title,
          snippet: r.snippet,
          url: r.url,
        })),
        totalResults: results.length,
      };
    } catch (error) {
      // Handle errors
      throw new Error(`Search failed: ${error.message}`);
    }
  },
});
```

The `context` parameter provides additional information about the execution environment:

```typescript
type ToolExecutionContext = {
  agentId: string;
  operationId: string;
  parentOperationId?: string;
  toolCallId: string;
  // Additional context properties may be available
};
```

### Tool Hooks

Tool hooks allow you to customize tool behavior at various points in the execution lifecycle:

```typescript
const databaseTool = createTool({
  name: "queryDatabase",
  description: "Query a database for information",
  parameters: z.object({
    query: z.string().describe("The SQL query to execute"),
  }),
  hooks: {
    beforeExecution: async (args, context) => {
      console.log(`Executing query: ${args.query}`);
      // You can modify the args before execution
      return args;
    },
    afterExecution: async (result, context) => {
      console.log(`Query returned ${result.rows.length} rows`);
      // You can modify the result before returning
      return result;
    },
    onError: async (error, args, context) => {
      console.error(`Query failed: ${error.message}`);
      // You can handle the error or rethrow it
      throw error;
    },
  },
  execute: async (args) => {
    // Implementation
    return { rows: [] };
  },
});
```

### Tool Manager

The `ToolManager` class manages a collection of tools:

```typescript
import { ToolManager, createTool } from "@voltagent/core";

// Create tools
const calculatorTool = createTool({ /* ... */ });
const weatherTool = createTool({ /* ... */ });

// Create a tool manager
const toolManager = new ToolManager();

// Register tools
toolManager.registerTool(calculatorTool);
toolManager.registerTool(weatherTool);

// Get all tools
const allTools = toolManager.getTools();

// Get a specific tool
const calculator = toolManager.getTool("calculator");

// Execute a tool
const result = await toolManager.executeTool("calculator", { expression: "2 + 2" }, context);
```

### Reasoning Tools

VoltAgent includes specialized reasoning tools that help agents perform complex reasoning tasks:

```typescript
import { Agent, createReasoningTool } from "@voltagent/core";

const reasoningTool = createReasoningTool({
  name: "solveComplexProblem",
  description: "Solve a complex problem step by step",
  parameters: z.object({
    problem: z.string().describe("The problem to solve"),
  }),
  reasoning: async (args, context) => {
    // Step 1: Analyze the problem
    const analysis = await context.think(`
      Let me analyze the problem: ${args.problem}
      What are the key components and constraints?
    `);
    
    // Step 2: Develop a solution approach
    const approach = await context.think(`
      Based on my analysis: ${analysis}
      I'll develop a solution approach.
    `);
    
    // Step 3: Implement the solution
    const solution = await context.think(`
      Following my approach: ${approach}
      The solution is...
    `);
    
    // Return the final result
    return {
      analysis,
      approach,
      solution,
    };
  },
});

const agent = new Agent({
  // ... other properties
  tools: [reasoningTool],
});
```

### Tool Kits

Tool kits are collections of related tools:

```typescript
import { createToolkit, createTool } from "@voltagent/core";

// Create individual tools
const addTool = createTool({ /* ... */ });
const subtractTool = createTool({ /* ... */ });
const multiplyTool = createTool({ /* ... */ });
const divideTool = createTool({ /* ... */ });

// Create a toolkit
const mathToolkit = createToolkit({
  name: "mathTools",
  description: "Tools for mathematical operations",
  tools: [addTool, subtractTool, multiplyTool, divideTool],
});

// Use the toolkit with an agent
const agent = new Agent({
  // ... other properties
  tools: [...mathToolkit.tools],
});
```

## Memory

Memory systems allow agents to retain context across interactions. VoltAgent supports different memory providers.

### Memory Providers

Memory providers implement the `MemoryProvider` interface:

```typescript
interface MemoryProvider {
  addEntry(entry: AgentHistoryEntry): Promise<void>;
  getEntries(limit?: number): Promise<AgentHistoryEntry[]>;
  clear(): Promise<void>;
}

type AgentHistoryEntry = {
  id: string;
  agentId: string;
  operationId: string;
  parentOperationId?: string;
  timestamp: number;
  type: "user" | "agent" | "tool" | "system";
  content: string;
  metadata?: Record<string, any>;
};
```

### In-Memory Provider

The `InMemoryMemory` provider stores entries in memory:

```typescript
import { Agent, InMemoryMemory } from "@voltagent/core";

const agent = new Agent({
  // ... other properties
  memory: new InMemoryMemory({
    maxEntries: 100, // Optional, defaults to 1000
  }),
});
```

### LibSQL Provider

The `LibSQLMemory` provider stores entries in a SQLite database using LibSQL:

```typescript
import { Agent, LibSQLMemory } from "@voltagent/core";

const agent = new Agent({
  // ... other properties
  memory: new LibSQLMemory({
    url: "file:memory.db", // SQLite file path or URL
    authToken: "token", // Optional, for remote LibSQL instances
    tableName: "agent_memory", // Optional, defaults to "agent_history"
  }),
});
```

### Custom Memory Providers

You can create custom memory providers by implementing the `MemoryProvider` interface:

```typescript
import { MemoryProvider, AgentHistoryEntry } from "@voltagent/core";

class RedisMemory implements MemoryProvider {
  private client: any; // Redis client
  private prefix: string;
  
  constructor(options: { url: string; prefix?: string }) {
    this.client = createRedisClient(options.url);
    this.prefix = options.prefix || "agent:memory:";
  }
  
  async addEntry(entry: AgentHistoryEntry): Promise<void> {
    const key = `${this.prefix}${entry.agentId}:${entry.id}`;
    await this.client.set(key, JSON.stringify(entry));
    
    // Add to sorted set for retrieval by timestamp
    await this.client.zadd(
      `${this.prefix}${entry.agentId}:entries`,
      entry.timestamp,
      entry.id
    );
  }
  
  async getEntries(limit?: number): Promise<AgentHistoryEntry[]> {
    const count = limit || -1; // -1 means all entries in Redis
    
    // Get entry IDs from sorted set, newest first
    const ids = await this.client.zrevrange(
      `${this.prefix}${entry.agentId}:entries`,
      0,
      count - 1
    );
    
    // Get entries by ID
    const entries = await Promise.all(
      ids.map(async (id) => {
        const data = await this.client.get(`${this.prefix}${entry.agentId}:${id}`);
        return JSON.parse(data);
      })
    );
    
    return entries;
  }
  
  async clear(): Promise<void> {
    // Delete all keys with the prefix
    const keys = await this.client.keys(`${this.prefix}*`);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }
}

// Use the custom memory provider
const agent = new Agent({
  // ... other properties
  memory: new RedisMemory({
    url: "redis://localhost:6379",
    prefix: "myapp:agent:",
  }),
});
```

### Memory Manager

The `MemoryManager` class provides additional functionality for working with memory:

```typescript
import { Agent, MemoryManager, InMemoryMemory } from "@voltagent/core";

// Create a memory provider
const memoryProvider = new InMemoryMemory();

// Create a memory manager
const memoryManager = new MemoryManager({
  provider: memoryProvider,
  agentId: "my-agent",
});

// Add entries
await memoryManager.addUserMessage("Hello, how can you help me?");
await memoryManager.addAgentMessage("I can answer questions and perform tasks for you.");
await memoryManager.addSystemMessage("Session started.");

// Get recent entries
const recentEntries = await memoryManager.getRecentEntries(10);

// Get formatted history for LLM context
const formattedHistory = await memoryManager.getFormattedHistory();

// Clear memory
await memoryManager.clear();

// Use with an agent
const agent = new Agent({
  name: "my-agent",
  // ... other properties
  memory: memoryProvider,
});
```

## Best Practices

### Tool Design

1. **Clear Naming and Description**: Use descriptive names and detailed descriptions for tools.
2. **Specific Parameters**: Define parameters with clear descriptions and appropriate constraints.
3. **Error Handling**: Implement robust error handling in the `execute` function.
4. **Idempotency**: Design tools to be idempotent when possible.
5. **Validation**: Use Zod schemas to validate input parameters.

### Memory Usage

1. **Appropriate Provider**: Choose the right memory provider based on your needs:
   - `InMemoryMemory` for simple applications or testing
   - `LibSQLMemory` for persistence across restarts
   - Custom providers for specific requirements
2. **Memory Limits**: Set appropriate limits to prevent excessive memory usage.
3. **Sensitive Information**: Be cautious about storing sensitive information in memory.
4. **Performance**: Consider the performance implications of large memory stores.

### Integration

1. **Tool Registration**: Register tools with the agent at initialization.
2. **Memory Initialization**: Initialize memory providers before using them.
3. **Error Handling**: Implement proper error handling for tool execution and memory operations.
4. **Testing**: Test tools and memory providers thoroughly before deployment.

