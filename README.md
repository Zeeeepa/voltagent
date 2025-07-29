# VoltAgent

Open Source TypeScript AI Agent Framework

## Overview

VoltAgent is a powerful and flexible framework for building AI agents with TypeScript. It provides a clean, extensible architecture that supports multiple AI providers and makes it easy to create sophisticated AI-powered applications.

## Features

- 🚀 **TypeScript First** - Built with TypeScript for type safety and excellent developer experience
- 🔌 **Multi-Provider Support** - Works with OpenAI, Anthropic, and custom providers
- 🏗️ **Extensible Architecture** - Clean, modular design for easy customization
- 📝 **Comprehensive Logging** - Built-in logging with configurable levels
- 🧪 **Well Tested** - Comprehensive test suite with Jest
- 📦 **Easy to Use** - Simple API that gets you started quickly

## Installation

```bash
npm install voltagent
```

## Quick Start

```typescript
import { Agent } from 'voltagent';

const agent = new Agent({
  name: 'my-agent',
  provider: 'openai',
  model: 'gpt-4',
  apiKey: process.env.OPENAI_API_KEY,
});

const response = await agent.execute('Hello, how can you help me?');
console.log(response.content);
```

## Configuration

```typescript
interface AgentConfig {
  name: string;
  description?: string;
  model?: string;
  provider?: 'openai' | 'anthropic' | 'custom';
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}
```

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run linting
npm run lint

# Format code
npm run format
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) file for details.

