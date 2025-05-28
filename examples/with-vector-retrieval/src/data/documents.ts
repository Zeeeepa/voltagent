/**
 * Sample documents for the vector retrieval example
 */
export const documents = [
  {
    id: "doc1",
    content:
      "VoltAgent is an open source TypeScript framework for building and orchestrating AI agents. It provides the foundational structure and tools needed to build applications powered by autonomous agents. These agents, often driven by Large Language Models (LLMs), can perceive their environment, make decisions, and take actions to achieve specific goals.",
    metadata: {
      source: "documentation",
      section: "introduction",
      topic: "overview"
    }
  },
  {
    id: "doc2",
    content:
      "The Core Engine (@voltagent/core) is the heart of VoltAgent, providing fundamental capabilities for your AI agents. It allows you to define individual agents with specific roles, tools, and memory. You can architect complex applications by coordinating multiple specialized agents using Supervisors.",
    metadata: {
      source: "documentation",
      section: "architecture",
      topic: "core-engine"
    }
  },
  {
    id: "doc3",
    content:
      "VoltAgent supports the Model Context Protocol (MCP) for standardized tool interactions. This allows agents to connect to external APIs, databases, and services, enabling them to perform real-world tasks. The framework also includes specialized retriever agents for efficient information fetching and Retrieval-Augmented Generation (RAG).",
    metadata: {
      source: "documentation",
      section: "features",
      topic: "mcp-support"
    }
  },
  {
    id: "doc4",
    content:
      "Memory in VoltAgent enables agents to remember past interactions for more natural and context-aware conversations. The framework works with popular AI models from OpenAI, Google, Anthropic, and more, allowing easy switching between providers.",
    metadata: {
      source: "documentation",
      section: "features",
      topic: "memory"
    }
  },
  {
    id: "doc5",
    content:
      "The VoltAgent developer ecosystem includes helpers like create-voltagent-app, @voltagent/cli, and the visual VoltAgent Console for quick setup, monitoring, and debugging. These tools help developers build sophisticated AI applications faster and more reliably.",
    metadata: {
      source: "documentation",
      section: "ecosystem",
      topic: "developer-tools"
    }
  },
  {
    id: "doc6",
    content:
      "Building AI applications often involves a trade-off between a DIY approach and no-code builders. VoltAgent provides a middle ground, offering structure and components without sacrificing flexibility. It helps you build faster with pre-built components, maintain code more easily, and scale from simple to complex multi-agent systems.",
    metadata: {
      source: "documentation",
      section: "benefits",
      topic: "flexibility"
    }
  },
  {
    id: "doc7",
    content:
      "VoltAgent gives you full control over agent behavior, LLM choice, tool integrations, and UI connections. It helps you avoid vendor lock-in with the freedom to switch AI providers and models as needed. The framework also includes features designed to optimize AI service usage and reduce redundant calls.",
    metadata: {
      source: "documentation",
      section: "benefits",
      topic: "control"
    }
  },
  {
    id: "doc8",
    content:
      "The VoltAgent Console is a visual monitoring tool that helps you track agent performance, inspect state, and debug visually. It provides insights into agent behavior and helps you identify and fix issues quickly.",
    metadata: {
      source: "documentation",
      section: "tools",
      topic: "console"
    }
  },
  {
    id: "doc9",
    content:
      "To create a new VoltAgent project, use the create-voltagent-app CLI tool: npm create voltagent-app@latest. This command guides you through setup and creates a starter project with basic agent configuration.",
    metadata: {
      source: "documentation",
      section: "getting-started",
      topic: "installation"
    }
  },
  {
    id: "doc10",
    content:
      "A simple agent in VoltAgent can be defined as: const agent = new Agent({ name: 'my-agent', instructions: 'A helpful assistant', llm: new VercelAIProvider(), model: openai('gpt-4o-mini') }); new VoltAgent({ agents: { agent } });",
    metadata: {
      source: "documentation",
      section: "getting-started",
      topic: "basic-agent"
    }
  }
];

