# Provider Packages Documentation

VoltAgent supports multiple LLM providers through dedicated packages. This documentation covers the available provider packages and how to use them.

## Table of Contents

- [Overview](#overview)
- [Vercel AI Provider](#vercel-ai-provider)
- [Anthropic AI Provider](#anthropic-ai-provider)
- [Google AI Provider](#google-ai-provider)
- [Groq AI Provider](#groq-ai-provider)
- [XSAI Provider](#xsai-provider)
- [Custom Providers](#custom-providers)

## Overview

Provider packages in VoltAgent serve as adapters between the core framework and various LLM services. They handle the communication with the LLM APIs, format requests and responses, and manage streaming.

Each provider package follows a similar pattern:
1. Install the provider package
2. Create a provider instance
3. Configure the model
4. Use the provider and model with an Agent

## Vercel AI Provider

The Vercel AI Provider (`@voltagent/vercel-ai`) integrates with the Vercel AI SDK, allowing you to use various models supported by Vercel.

### Installation

```bash
npm install @voltagent/vercel-ai
```

### Usage

```typescript
import { Agent } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

const agent = new Agent({
  name: "openai-agent",
  instructions: "You are a helpful assistant.",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
});
```

### Supported Models

The Vercel AI Provider supports all models available in the Vercel AI SDK, including:
- OpenAI models via `@ai-sdk/openai`
- Anthropic models via `@ai-sdk/anthropic`
- Google models via `@ai-sdk/google`
- Mistral models via `@ai-sdk/mistral`
- And more

### Configuration

You can configure the provider with options:

```typescript
const provider = new VercelAIProvider({
  // Provider-specific options
});
```

## Anthropic AI Provider

The Anthropic AI Provider (`@voltagent/anthropic-ai`) integrates directly with Anthropic's Claude models.

### Installation

```bash
npm install @voltagent/anthropic-ai
```

### Usage

```typescript
import { Agent } from "@voltagent/core";
import { AnthropicAIProvider } from "@voltagent/anthropic-ai";

const agent = new Agent({
  name: "claude-agent",
  instructions: "You are a helpful assistant.",
  llm: new AnthropicAIProvider({
    apiKey: process.env.ANTHROPIC_API_KEY,
  }),
  model: "claude-3-opus-20240229",
});
```

### Supported Models

- `claude-3-opus-20240229`
- `claude-3-sonnet-20240229`
- `claude-3-haiku-20240307`
- And other Claude models as they become available

### Configuration

```typescript
const provider = new AnthropicAIProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseURL: "https://api.anthropic.com", // Optional
  maxTokens: 4096, // Optional
  temperature: 0.7, // Optional
});
```

## Google AI Provider

The Google AI Provider (`@voltagent/google-ai`) integrates with Google's Gemini models.

### Installation

```bash
npm install @voltagent/google-ai
```

### Usage

```typescript
import { Agent } from "@voltagent/core";
import { GoogleAIProvider } from "@voltagent/google-ai";

const agent = new Agent({
  name: "gemini-agent",
  instructions: "You are a helpful assistant.",
  llm: new GoogleAIProvider({
    apiKey: process.env.GOOGLE_API_KEY,
  }),
  model: "gemini-1.5-pro",
});
```

### Supported Models

- `gemini-1.5-pro`
- `gemini-1.5-flash`
- `gemini-1.0-pro`
- And other Gemini models as they become available

### Configuration

```typescript
const provider = new GoogleAIProvider({
  apiKey: process.env.GOOGLE_API_KEY,
  maxOutputTokens: 2048, // Optional
  temperature: 0.7, // Optional
});
```

## Groq AI Provider

The Groq AI Provider (`@voltagent/groq-ai`) integrates with Groq's high-performance inference API.

### Installation

```bash
npm install @voltagent/groq-ai
```

### Usage

```typescript
import { Agent } from "@voltagent/core";
import { GroqAIProvider } from "@voltagent/groq-ai";

const agent = new Agent({
  name: "groq-agent",
  instructions: "You are a helpful assistant.",
  llm: new GroqAIProvider({
    apiKey: process.env.GROQ_API_KEY,
  }),
  model: "llama3-70b-8192",
});
```

### Supported Models

- `llama3-70b-8192`
- `llama3-8b-8192`
- `mixtral-8x7b-32768`
- And other models available on Groq

### Configuration

```typescript
const provider = new GroqAIProvider({
  apiKey: process.env.GROQ_API_KEY,
  maxTokens: 4096, // Optional
  temperature: 0.7, // Optional
});
```

## XSAI Provider

The XSAI Provider (`@voltagent/xsai`) is a flexible provider that can work with various LLM APIs.

### Installation

```bash
npm install @voltagent/xsai
```

### Usage

```typescript
import { Agent } from "@voltagent/core";
import { XSAIProvider } from "@voltagent/xsai";

const agent = new Agent({
  name: "xsai-agent",
  instructions: "You are a helpful assistant.",
  llm: new XSAIProvider({
    apiKey: process.env.XSAI_API_KEY,
    baseURL: "https://api.xsai.example",
  }),
  model: "model-name",
});
```

### Configuration

```typescript
const provider = new XSAIProvider({
  apiKey: process.env.XSAI_API_KEY,
  baseURL: "https://api.xsai.example",
  maxTokens: 4096, // Optional
  temperature: 0.7, // Optional
});
```

## Custom Providers

You can create custom providers by implementing the `LLMProvider` interface from the core package.

### Creating a Custom Provider

```typescript
import { LLMProvider, ModelToolCall } from "@voltagent/core";

class CustomProvider implements LLMProvider {
  async generateText(
    prompt: string,
    options: {
      tools?: any[];
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<string> {
    // Implementation to generate text
    return "Generated text";
  }

  async generateTextStream(
    prompt: string,
    options: {
      tools?: any[];
      temperature?: number;
      maxTokens?: number;
      onToken?: (token: string) => void;
      onToolCall?: (toolCall: ModelToolCall) => void;
      onFinish?: (result: any) => void;
    }
  ): Promise<void> {
    // Implementation to generate text stream
  }
}
```

### Using a Custom Provider

```typescript
import { Agent } from "@voltagent/core";

const customProvider = new CustomProvider();

const agent = new Agent({
  name: "custom-agent",
  instructions: "You are a helpful assistant.",
  llm: customProvider,
  model: "custom-model",
});
```

## Best Practices

### Environment Variables

Store API keys in environment variables:

```typescript
import { AnthropicAIProvider } from "@voltagent/anthropic-ai";

const provider = new AnthropicAIProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
});
```

### Provider Selection

Choose the provider based on your requirements:
- For maximum flexibility with multiple models: Use `VercelAIProvider`
- For direct integration with specific providers: Use the dedicated provider packages
- For custom or self-hosted models: Create a custom provider

### Model Parameters

Adjust model parameters based on your use case:
- Higher temperature (e.g., 0.7-1.0) for more creative responses
- Lower temperature (e.g., 0.0-0.3) for more deterministic responses
- Adjust max tokens based on expected response length

### Error Handling

Implement proper error handling for API failures:

```typescript
try {
  const response = await agent.run("Hello");
  console.log(response);
} catch (error) {
  console.error("Error calling LLM:", error);
  // Implement fallback behavior
}
```

