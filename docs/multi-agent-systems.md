# Multi-Agent Systems Documentation

VoltAgent supports building complex multi-agent systems where multiple specialized agents work together to accomplish tasks. This documentation covers the concepts, implementation, and best practices for multi-agent systems.

## Table of Contents

- [Introduction to Multi-Agent Systems](#introduction-to-multi-agent-systems)
- [Agent Hierarchy](#agent-hierarchy)
- [Supervisor Agents](#supervisor-agents)
- [Sub-Agents](#sub-agents)
- [Communication Between Agents](#communication-between-agents)
- [Implementing Multi-Agent Systems](#implementing-multi-agent-systems)
- [Advanced Patterns](#advanced-patterns)
- [Best Practices](#best-practices)

## Introduction to Multi-Agent Systems

Multi-agent systems in VoltAgent consist of multiple agents working together, each with specialized roles and capabilities. This approach allows for:

1. **Specialization**: Agents can focus on specific tasks or domains
2. **Modularity**: Systems can be built from reusable agent components
3. **Scalability**: Complex problems can be broken down into manageable parts
4. **Flexibility**: Agents can be added, removed, or modified independently

## Agent Hierarchy

VoltAgent implements a hierarchical model for multi-agent systems:

1. **Supervisor Agents**: Coordinate and delegate tasks to sub-agents
2. **Sub-Agents**: Specialized agents that handle specific tasks
3. **Nested Hierarchies**: Sub-agents can themselves be supervisors of other agents

This hierarchy allows for complex workflows and delegation patterns.

## Supervisor Agents

Supervisor agents are responsible for:

1. **Task Decomposition**: Breaking down complex tasks into smaller subtasks
2. **Delegation**: Assigning subtasks to appropriate sub-agents
3. **Coordination**: Managing the workflow between sub-agents
4. **Integration**: Combining results from sub-agents into a cohesive response

### Creating a Supervisor Agent

```typescript
import { Agent, VoltAgent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Create sub-agents
const researchAgent = new Agent({
  name: "research-agent",
  description: "Specialized in researching information",
  instructions: "You are a research specialist. Your role is to find and summarize information on various topics.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  // ... other properties
});

const writingAgent = new Agent({
  name: "writing-agent",
  description: "Specialized in writing content",
  instructions: "You are a writing specialist. Your role is to create well-structured, engaging content based on provided information.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  // ... other properties
});

// Create a supervisor agent
const supervisorAgent = new Agent({
  name: "content-supervisor",
  description: "Coordinates research and writing to create comprehensive content",
  instructions: `
    You are a content production supervisor. Your role is to:
    1. Analyze the user's content request
    2. Delegate research tasks to the research-agent
    3. Delegate writing tasks to the writing-agent
    4. Review and refine the final content
    5. Present the completed content to the user
  `,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [researchAgent, writingAgent],
  // ... other properties
});

// Initialize VoltAgent with the supervisor agent
new VoltAgent({
  agents: {
    supervisor: supervisorAgent,
  },
});
```

## Sub-Agents

Sub-agents are specialized agents that handle specific tasks within a multi-agent system. They:

1. **Focus on Specific Domains**: Each sub-agent specializes in a particular area
2. **Receive Tasks from Supervisors**: Execute tasks delegated by supervisor agents
3. **Return Results to Supervisors**: Provide results back to the supervisor for integration

### Creating Sub-Agents

Sub-agents are created like regular agents but are registered with a supervisor:

```typescript
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

// Create a specialized data analysis agent
const dataAnalysisAgent = new Agent({
  name: "data-analysis-agent",
  description: "Specialized in analyzing numerical data",
  instructions: "You are a data analysis specialist. Your role is to analyze numerical data and extract insights.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [
    // Data analysis specific tools
  ],
});

// Create a specialized visualization agent
const visualizationAgent = new Agent({
  name: "visualization-agent",
  description: "Specialized in creating data visualizations",
  instructions: "You are a data visualization specialist. Your role is to create clear, informative visualizations based on data and insights.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [
    // Visualization specific tools
  ],
});

// Create a supervisor agent for data projects
const dataProjectSupervisor = new Agent({
  name: "data-project-supervisor",
  description: "Coordinates data analysis and visualization",
  instructions: "You are a data project supervisor. Your role is to coordinate data analysis and visualization to create comprehensive data reports.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [dataAnalysisAgent, visualizationAgent],
});
```

## Communication Between Agents

Agents in a multi-agent system communicate through the supervisor-subagent relationship:

### Supervisor to Sub-Agent Communication

```typescript
import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

// Create a supervisor agent with tools to communicate with sub-agents
const supervisorAgent = new Agent({
  // ... other properties
  tools: [
    createTool({
      name: "delegateToResearchAgent",
      description: "Delegate a research task to the research agent",
      parameters: z.object({
        query: z.string().describe("The research query to investigate"),
      }),
      execute: async (args) => {
        // Get the research agent from sub-agents
        const researchAgent = supervisorAgent.getSubAgents().find(a => a.getName() === "research-agent");
        
        if (!researchAgent) {
          throw new Error("Research agent not found");
        }
        
        // Run the research agent with the query
        const result = await researchAgent.run(args.query);
        
        return { result };
      },
    }),
    
    createTool({
      name: "delegateToWritingAgent",
      description: "Delegate a writing task to the writing agent",
      parameters: z.object({
        topic: z.string().describe("The topic to write about"),
        researchResults: z.string().describe("The research results to base the writing on"),
      }),
      execute: async (args) => {
        // Get the writing agent from sub-agents
        const writingAgent = supervisorAgent.getSubAgents().find(a => a.getName() === "writing-agent");
        
        if (!writingAgent) {
          throw new Error("Writing agent not found");
        }
        
        // Run the writing agent with the topic and research
        const prompt = `Write about ${args.topic} based on this research: ${args.researchResults}`;
        const result = await writingAgent.run(prompt);
        
        return { result };
      },
    }),
  ],
});
```

### Sub-Agent to Supervisor Communication

Sub-agents communicate back to supervisors through their return values:

```typescript
// In the supervisor's tool execution
const researchResult = await researchAgent.run(args.query);

// The research result is now available to the supervisor
// The supervisor can process it and pass it to other sub-agents
const writingResult = await writingAgent.run(
  `Write about ${args.topic} based on this research: ${researchResult}`
);

// The supervisor can combine results
return {
  research: researchResult,
  content: writingResult,
};
```

## Implementing Multi-Agent Systems

### Basic Implementation

```typescript
import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

// Create specialized sub-agents
const weatherAgent = new Agent({
  name: "weather-agent",
  description: "Provides weather information",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [
    // Weather API tool
  ],
});

const planningAgent = new Agent({
  name: "planning-agent",
  description: "Creates activity plans based on weather and preferences",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});

// Create a supervisor agent
const travelAssistantAgent = new Agent({
  name: "travel-assistant",
  description: "Helps plan travel activities based on weather and preferences",
  instructions: `
    You are a travel assistant that helps users plan activities.
    1. When a user asks about activities, first check the weather using the weather-agent
    2. Based on the weather and user preferences, create an activity plan using the planning-agent
    3. Present the final plan to the user
  `,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [weatherAgent, planningAgent],
  tools: [
    createTool({
      name: "getWeatherForecast",
      description: "Get the weather forecast for a location",
      parameters: z.object({
        location: z.string().describe("The location to get weather for"),
        date: z.string().describe("The date to get weather for"),
      }),
      execute: async (args) => {
        const weatherAgent = travelAssistantAgent.getSubAgents().find(a => a.getName() === "weather-agent");
        if (!weatherAgent) throw new Error("Weather agent not found");
        
        const result = await weatherAgent.run(`What's the weather in ${args.location} on ${args.date}?`);
        return { forecast: result };
      },
    }),
    
    createTool({
      name: "createActivityPlan",
      description: "Create an activity plan based on weather and preferences",
      parameters: z.object({
        location: z.string().describe("The location for activities"),
        weatherForecast: z.string().describe("The weather forecast"),
        preferences: z.string().describe("User activity preferences"),
      }),
      execute: async (args) => {
        const planningAgent = travelAssistantAgent.getSubAgents().find(a => a.getName() === "planning-agent");
        if (!planningAgent) throw new Error("Planning agent not found");
        
        const prompt = `
          Create an activity plan for ${args.location} with the following details:
          Weather: ${args.weatherForecast}
          User preferences: ${args.preferences}
        `;
        
        const result = await planningAgent.run(prompt);
        return { plan: result };
      },
    }),
  ],
});

// Initialize VoltAgent
new VoltAgent({
  agents: {
    travelAssistant: travelAssistantAgent,
  },
});
```

### Advanced Implementation with Memory Sharing

```typescript
import { Agent, VoltAgent, createTool, InMemoryMemory, MemoryManager } from "@voltagent/core";
import { z } from "zod";

// Create shared memory
const sharedMemory = new InMemoryMemory();

// Create specialized sub-agents with shared memory
const customerInfoAgent = new Agent({
  name: "customer-info-agent",
  description: "Manages customer information",
  memory: sharedMemory,
  // ... other properties
});

const productRecommendationAgent = new Agent({
  name: "product-recommendation-agent",
  description: "Recommends products based on customer information",
  memory: sharedMemory,
  // ... other properties
});

const orderProcessingAgent = new Agent({
  name: "order-processing-agent",
  description: "Processes customer orders",
  memory: sharedMemory,
  // ... other properties
});

// Create a supervisor agent
const salesAssistantAgent = new Agent({
  name: "sales-assistant",
  description: "Assists customers with product information and purchases",
  memory: sharedMemory,
  subAgents: [customerInfoAgent, productRecommendationAgent, orderProcessingAgent],
  tools: [
    // Tools for delegating to sub-agents
  ],
  // ... other properties
});

// Initialize VoltAgent
new VoltAgent({
  agents: {
    salesAssistant: salesAssistantAgent,
  },
});
```

## Advanced Patterns

### Parallel Processing

Execute multiple sub-agents in parallel for efficiency:

```typescript
import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

const supervisorAgent = new Agent({
  // ... other properties
  tools: [
    createTool({
      name: "processDataInParallel",
      description: "Process data using multiple agents in parallel",
      parameters: z.object({
        data: z.string().describe("The data to process"),
      }),
      execute: async (args) => {
        const subAgents = supervisorAgent.getSubAgents();
        
        // Run all sub-agents in parallel
        const results = await Promise.all(
          subAgents.map(agent => agent.run(`Process this data: ${args.data}`))
        );
        
        // Combine results
        return {
          results,
          summary: `Processed data with ${subAgents.length} agents`,
        };
      },
    }),
  ],
});
```

### Dynamic Agent Selection

Select sub-agents dynamically based on the task:

```typescript
import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

const supervisorAgent = new Agent({
  // ... other properties
  tools: [
    createTool({
      name: "delegateTask",
      description: "Delegate a task to the most appropriate sub-agent",
      parameters: z.object({
        task: z.string().describe("The task to delegate"),
        taskType: z.enum(["research", "writing", "analysis"]).describe("The type of task"),
      }),
      execute: async (args) => {
        const subAgents = supervisorAgent.getSubAgents();
        
        // Select the appropriate agent based on task type
        let selectedAgent;
        switch (args.taskType) {
          case "research":
            selectedAgent = subAgents.find(a => a.getName() === "research-agent");
            break;
          case "writing":
            selectedAgent = subAgents.find(a => a.getName() === "writing-agent");
            break;
          case "analysis":
            selectedAgent = subAgents.find(a => a.getName() === "analysis-agent");
            break;
          default:
            throw new Error(`Unknown task type: ${args.taskType}`);
        }
        
        if (!selectedAgent) {
          throw new Error(`No agent found for task type: ${args.taskType}`);
        }
        
        // Delegate the task
        const result = await selectedAgent.run(args.task);
        
        return { result };
      },
    }),
  ],
});
```

### Recursive Task Decomposition

Break down complex tasks recursively:

```typescript
import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

const projectManagerAgent = new Agent({
  // ... other properties
  tools: [
    createTool({
      name: "manageProject",
      description: "Manage a complex project by breaking it down into tasks",
      parameters: z.object({
        projectDescription: z.string().describe("Description of the project"),
        complexity: z.number().min(1).max(10).describe("Complexity level of the project"),
      }),
      execute: async (args) => {
        // For complex projects, break down into sub-projects
        if (args.complexity > 7) {
          console.log("Breaking down complex project into sub-projects");
          
          // Identify sub-projects
          const planningAgent = projectManagerAgent.getSubAgents().find(a => a.getName() === "planning-agent");
          if (!planningAgent) throw new Error("Planning agent not found");
          
          const subProjectsResult = await planningAgent.run(
            `Break down this complex project into 3-5 sub-projects: ${args.projectDescription}`
          );
          
          // Parse sub-projects (assuming the planning agent returns a structured format)
          const subProjects = JSON.parse(subProjectsResult).subProjects;
          
          // Process each sub-project recursively with reduced complexity
          const subProjectResults = await Promise.all(
            subProjects.map(subProject => 
              projectManagerAgent.tools.find(t => t.name === "manageProject").execute({
                projectDescription: subProject.description,
                complexity: args.complexity - 3, // Reduce complexity for sub-projects
              })
            )
          );
          
          // Combine results
          return {
            projectPlan: {
              overview: args.projectDescription,
              subProjects: subProjectResults.map((result, index) => ({
                name: subProjects[index].name,
                plan: result.projectPlan,
              })),
            },
          };
        } else {
          // For simpler projects, create a direct plan
          const planningAgent = projectManagerAgent.getSubAgents().find(a => a.getName() === "planning-agent");
          if (!planningAgent) throw new Error("Planning agent not found");
          
          const planResult = await planningAgent.run(
            `Create a detailed plan for this project: ${args.projectDescription}`
          );
          
          return {
            projectPlan: {
              overview: args.projectDescription,
              detailedPlan: planResult,
            },
          };
        }
      },
    }),
  ],
});
```

## Best Practices

### Agent Design

1. **Clear Responsibilities**: Define clear, non-overlapping responsibilities for each agent
2. **Appropriate Specialization**: Create specialized agents for distinct domains or tasks
3. **Consistent Interfaces**: Use consistent input/output formats between agents
4. **Appropriate Hierarchy**: Design the agent hierarchy to match the natural structure of the problem

### Communication

1. **Structured Data**: Use structured data formats for communication between agents
2. **Context Preservation**: Ensure important context is preserved when passing information
3. **Error Handling**: Implement robust error handling for inter-agent communication
4. **Feedback Loops**: Create feedback mechanisms between supervisors and sub-agents

### System Architecture

1. **Appropriate Granularity**: Balance between too many small agents and too few large agents
2. **Shared Resources**: Use shared memory or other resources when appropriate
3. **Scalability**: Design systems that can scale by adding more agents
4. **Monitoring**: Implement monitoring and logging for multi-agent interactions

### Performance

1. **Parallel Execution**: Use parallel execution when sub-tasks are independent
2. **Resource Management**: Be mindful of resource usage, especially with many agents
3. **Caching**: Implement caching for frequently requested information
4. **Timeout Handling**: Implement timeouts for sub-agent operations

### Testing

1. **Unit Testing**: Test individual agents in isolation
2. **Integration Testing**: Test interactions between agents
3. **System Testing**: Test the entire multi-agent system
4. **Scenario Testing**: Test specific scenarios that exercise the system's capabilities

