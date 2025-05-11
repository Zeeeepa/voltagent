import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";

// Import the retrieval tool
import { retriever } from "./retriever/index.js";

// Create the agent with retrieval tool
const agent = new Agent({
  name: "Assistant with Retrieval",
  description:
    "A helpful assistant that can retrieve information from documents using keyword-based search to provide better answers",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  retriever: retriever,
});

// Create the agent with retrieval tool
const agentWithTools = new Agent({
  name: "Assistant with Retrieval and Tools",
  description:
    "A helpful assistant that can retrieve information from documents using keyword-based search to provide better answers",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [retriever.tool],
});

// Initialize the VoltAgent
new VoltAgent({
  agents: {
    agent,
    agentWithTools,
  },
});
