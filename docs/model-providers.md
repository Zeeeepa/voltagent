# Model Providers in VoltAgent

VoltAgent provides a unified interface for interacting with various LLM providers. This document explains how to use the built-in providers and how to implement your own custom provider.

## Available Providers

VoltAgent currently supports the following model providers:

- **Anthropic** (`@voltagent/anthropic-ai`): For Claude models
- **Perplexity** (`@voltagent/perplexity-ai`): For Perplexity models
- **Google AI** (`@voltagent/google-ai`): For Gemini models
- **Groq AI** (`@voltagent/groq-ai`): For Groq-hosted models
- **Vercel AI** (`@voltagent/vercel-ai`): For Vercel AI SDK integration

## Using a Provider

All providers implement the `LLMProvider` interface from `@voltagent/core`. Here's how to use them:

### Anthropic Provider

```typescript
import { AnthropicProvider } from '@voltagent/anthropic-ai';

// Create a provider instance
const provider = new AnthropicProvider({
  apiKey: 'your-anthropic-api-key', // Optional, defaults to process.env.ANTHROPIC_API_KEY
});

// Generate text
const response = await provider.generateText({
  messages: [{ role: 'user', content: 'Hello, world!' }],
  model: 'claude-3-7-sonnet-20250219',
  provider: {
    temperature: 0.7,
    maxTokens: 1000,
  }
});

console.log(response.text);
```

### Perplexity Provider

```typescript
import { PerplexityProvider } from '@voltagent/perplexity-ai';

// Create a provider instance
const provider = new PerplexityProvider({
  apiKey: 'your-perplexity-api-key', // Optional, defaults to process.env.PERPLEXITY_API_KEY
});

// Generate text
const response = await provider.generateText({
  messages: [{ role: 'user', content: 'Hello, world!' }],
  model: 'sonar-medium-online',
  provider: {
    temperature: 0.7,
    maxTokens: 1000,
  }
});

console.log(response.text);
```

## Provider Interface

All providers implement the `LLMProvider` interface, which includes the following methods:

- `generateText`: Generate text from a prompt
- `streamText`: Stream text generation
- `generateObject`: Generate a structured object from a prompt
- `streamObject`: Stream object generation
- `toMessage`: Convert a base message to the provider's format
- `getModelIdentifier`: Get a string identifier for a model

## Implementing a Custom Provider

You can implement your own provider by implementing the `LLMProvider` interface:

```typescript
import type {
  BaseMessage,
  GenerateObjectOptions,
  GenerateTextOptions,
  LLMProvider,
  ProviderObjectResponse,
  ProviderTextResponse,
  StreamObjectOptions,
  StreamTextOptions,
} from '@voltagent/core';
import type { z } from 'zod';

export class CustomProvider implements LLMProvider<string> {
  constructor(options: any = {}) {
    // Initialize your provider
  }

  getModelIdentifier(model: string): string {
    return model;
  }

  toMessage(message: BaseMessage): any {
    // Convert a base message to your provider's format
    return message;
  }

  async generateText(options: GenerateTextOptions<string>): Promise<ProviderTextResponse<any>> {
    // Implement text generation
  }

  async streamText(options: StreamTextOptions<string>): Promise<any> {
    // Implement text streaming
  }

  async generateObject<TSchema extends z.ZodType>(
    options: GenerateObjectOptions<unknown, TSchema>,
  ): Promise<ProviderObjectResponse<any, z.infer<TSchema>>> {
    // Implement object generation
  }

  async streamObject<TSchema extends z.ZodType>(
    options: StreamObjectOptions<unknown, TSchema>,
  ): Promise<any> {
    // Implement object streaming
  }
}
```

## Error Handling

All providers implement consistent error handling:

1. API errors are caught and wrapped in a `VoltAgentError` object
2. Rate limiting and retries are handled automatically
3. Token limit errors are handled gracefully

## Environment Variables

Providers look for API keys in environment variables by default:

- Anthropic: `ANTHROPIC_API_KEY`
- Perplexity: `PERPLEXITY_API_KEY`
- Google AI: `GOOGLE_API_KEY`
- Groq: `GROQ_API_KEY`
- Vercel AI: Depends on the underlying provider

You can also pass API keys directly to the provider constructor.

