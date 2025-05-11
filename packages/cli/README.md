<div align="center">
<a href="https://voltagent.dev/">
<img width="1800" alt="435380213-b6253409-8741-462b-a346-834cd18565a9" src="https://github.com/user-attachments/assets/452a03e7-eeda-4394-9ee7-0ffbcf37245c" />
</a>

<br/>
<br/>

<div align="center">
    <a href="https://voltagent.dev">Home Page</a> |
    <a href="https://voltagent.dev/docs/">Documentation</a> |
    <a href="https://github.com/voltagent/voltagent/tree/main/examples">Examples</a> |
    <a href="https://s.voltagent.dev/discord">Discord</a> |
    <a href="https://voltagent.dev/blog/">Blog</a>
</div>
</div>

<br/>

<div align="center">
    <strong>VoltAgent is an open source TypeScript framework for building and orchestrating AI agents.</strong><br>
Escape the limitations of no-code builders and the complexity of starting from scratch.
    <br />
    <br />
</div>

<div align="center">
    
[![npm version](https://img.shields.io/npm/v/@voltagent/core.svg)](https://www.npmjs.com/package/@voltagent/core)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.0-4baaaa.svg)](CODE_OF_CONDUCT.md)
[![Discord](https://img.shields.io/discord/1361559153780195478.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2)](https://s.voltagent.dev/discord)
[![Twitter Follow](https://img.shields.io/twitter/follow/voltagent_dev?style=social)](https://twitter.com/voltagent_dev)
    
</div>

<br/>

<div align="center">
<a href="https://voltagent.dev/">
<img width="896" alt="flow" src="https://github.com/user-attachments/assets/f0627868-6153-4f63-ba7f-bdfcc5dd603d" />
</a>

</div>

## What is VoltAgent?

> An **AI Agent Framework** provides the foundational structure and tools needed to build applications powered by autonomous agents. These agents, often driven by Large Language Models (LLMs), can perceive their environment, make decisions, and take actions to achieve specific goals. Building such agents from scratch involves managing complex interactions with LLMs, handling state, connecting to external tools and data, and orchestrating workflows.

**VoltAgent** is an open-source TypeScript framework that acts as this essential toolkit. It simplifies the development of AI agent applications by providing modular building blocks, standardized patterns, and abstractions. Whether you're creating chatbots, virtual assistants, automated workflows, or complex multi-agent systems, VoltAgent handles the underlying complexity, allowing you to focus on defining your agents' capabilities and logic.

## CLI Features

The VoltAgent CLI provides a comprehensive set of tools for agent development, task management, and MCP (Model Context Protocol) integration:

### Agent Commands

- **Chat**: Start an interactive chat session with an agent
- **Eval**: Evaluation tools for agent testing and benchmarking
  - **Run**: Run evaluation tests
  - **List**: List available test cases
  - **Report**: Generate evaluation reports

### Task Commands

- **Parse-PRD**: Parse a PRD file and generate tasks
- **List**: List all tasks with their status
- **Next**: Show the next task to work on
- **Generate**: Generate task files and boilerplate code
- **Expand**: Add subtasks to a task using AI
- **Set-Status**: Change the status of a task
- **Analyze**: Analyze task complexity and dependencies

### MCP Commands

- **Server**: Start an MCP server
- **Client**: Connect to an MCP server

### Core Commands

- **Init**: Initialize a new project
- **Update**: Check for updates
- **Whoami**: Show configuration info
- **Add**: Add components to an agent

## Installation

```bash
# Install globally
npm install -g @voltagent/cli

# Or with yarn
yarn global add @voltagent/cli

# Or with pnpm
pnpm add -g @voltagent/cli
```

## Usage

```bash
# Show help
volt --help

# Initialize a new project
volt init my-agent-project

# Start a chat session with an agent
volt agent chat

# Parse a PRD and generate tasks
volt task parse-prd ./docs/prd.md

# Start an MCP server
volt mcp server
```

## Documentation

For detailed documentation on each command, see:

- [Agent Commands](./docs/agent-commands.md)
- [Task Commands](./docs/task-commands.md)
- [MCP Commands](./docs/mcp-commands.md)

### Migration Guides

If you're migrating from one of the predecessor projects:

- [Migration Guide: serv to voltagent](./docs/migration-guide-serv.md)
- [Migration Guide: SwarmMCP to voltagent](./docs/migration-guide-swarmmcp.md)

## Key Features

- **Agent Core:** Define agents with descriptions, LLM providers, tools, and memory management.
- **Multi-Agent Systems:** Build complex workflows using Supervisor Agents coordinating multiple specialized Sub-Agents.
- **Tool Usage & Lifecycle:** Equip agents with custom or pre-built tools (functions) with type-safety (Zod), lifecycle hooks, and cancellation support to interact with external systems.
- **Flexible LLM Support:** Integrate seamlessly with various LLM providers (OpenAI, Anthropic, Google, etc.) and easily switch between models.
- **Memory Management:** Enable agents to retain context across interactions using different configurable memory providers.
- **Observability & Debugging:** Visually monitor agent states, interactions, logs, and performance via the [VoltAgent Console](https://console.voltagent.dev).
- **Voice Interaction:** Build voice-enabled agents capable of speech recognition and synthesis using the `@voltagent/voice` package.
- **Data Retrieval & RAG:** Integrate specialized retriever agents for efficient information fetching and **Retrieval-Augmented Generation (RAG)** from various sources.
- **Model Context Protocol (MCP) Support:** Connect to external tool servers (HTTP/stdio) adhering to the [MCP standard](https://modelcontextprotocol.io/) for extended capabilities.
- **Prompt Engineering Tools:** Leverage utilities like `createPrompt` for crafting and managing effective prompts for your agents.
- **Framework Compatibility:** Designed for easy integration into existing Node.js applications and popular frameworks.

## Use Cases

VoltAgent is versatile and can power a wide range of AI-driven applications:

- **Complex Workflow Automation:** Orchestrate multi-step processes involving various tools, APIs, and decision points using coordinated agents.
- **Intelligent Data Pipelines:** Build agents that fetch, process, analyze, and transform data from diverse sources.
- **AI-Powered Internal Tools & Dashboards:** Create interactive internal applications that leverage AI for analysis, reporting, or task automation, often integrated with UIs using hooks.
- **Automated Customer Support Agents:** Develop sophisticated chatbots that can understand context (memory), use tools (e.g., check order status), and escalate complex issues.
- **Repository Analysis & Codebase Automation:** Analyze code repositories, automate refactoring tasks, generate documentation, or manage CI/CD processes.
- **Retrieval-Augmented Generation (RAG) Systems:** Build agents that retrieve relevant information from knowledge bases (using retriever agents) before generating informed responses.
- **Voice-Controlled Interfaces & Applications:** Utilize the `@voltagent/voice` package to create applications that respond to and generate spoken language.
- **Personalized User Experiences:** Develop agents that adapt responses and actions based on user history and preferences stored in memory.
- **Real-time Monitoring & Alerting:** Design agents that continuously monitor data streams or systems and trigger actions or notifications based on defined conditions.
- **And Virtually Anything Else...**: If you can imagine an AI agent doing it, VoltAgent can likely help you build it! ⚡

## Learning VoltAgent

- **[Documentation](https://voltagent.dev/docs/)**: Dive into guides, concepts, and tutorials.
- **[Examples](https://github.com/voltagent/voltagent/tree/main/examples)**: Explore practical implementations.
- **[Blog](https://voltagent.dev/blog/)**: Read more about technical insights, and best practices.

## Contribution

We welcome contributions! Please refer to the contribution guidelines (link needed if available). Join our [Discord](https://s.voltagent.dev/discord) server for questions and discussions.

## Community ♥️ Thanks

Your stars help us reach more developers! If you find VoltAgent useful, please consider giving us a star on GitHub to support the project and help others discover it.

## License

Licensed under the MIT License, Copyright © 2025-present VoltAgent.
