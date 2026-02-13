# @voltagent/perplexity-ai

Perplexity AI provider for VoltAgent.

## Installation

```bash
npm install @voltagent/perplexity-ai
# or
yarn add @voltagent/perplexity-ai
# or
pnpm add @voltagent/perplexity-ai
```

## Usage

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

## Supported Models

- `sonar-medium-online` (default)
- `sonar-small-online`
- `sonar-medium-chat`
- `sonar-small-chat`
- `mixtral-8x7b-instruct`
- `llama-3-70b-instruct`

## Features

- Text generation
- Object generation
- Streaming support
- Tool calling support

## API

### Constructor

```typescript
new PerplexityProvider(options?: PerplexityProviderOptions)
```

#### PerplexityProviderOptions

- `apiKey`: Perplexity API key (optional, defaults to `process.env.PERPLEXITY_API_KEY`)
- `client`: Pre-configured OpenAI client for Perplexity (optional, mainly for testing)

### Methods

#### generateText

Generate text from a prompt.

```typescript
generateText(options: GenerateTextOptions<string>): Promise<ProviderTextResponse<any>>
```

#### streamText

Stream text generation.

```typescript
streamText(options: StreamTextOptions<string>): Promise<ProviderTextStreamResponse<any>>
```

#### generateObject

Generate a structured object from a prompt.

```typescript
generateObject<TSchema extends z.ZodType>(
  options: GenerateObjectOptions<unknown, TSchema>
): Promise<ProviderObjectResponse<any, z.infer<TSchema>>>
```

#### streamObject

Stream object generation.

```typescript
streamObject<TSchema extends z.ZodType>(
  options: StreamObjectOptions<unknown, TSchema>
): Promise<ProviderObjectStreamResponse<any, z.infer<TSchema>>>
```

## License

MIT

