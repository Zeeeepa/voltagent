# VoltAgent Vector Retrieval Example

This example demonstrates how to use the vector-based retrieval capabilities in VoltAgent for implementing Retrieval-Augmented Generation (RAG).

## Features

- Vector-based semantic search using embeddings
- In-memory vector storage for quick development
- Automatic document chunking
- Integration with OpenAI embeddings
- Configurable result formatting

## Getting Started

1. Set up your environment variables:

```bash
# Create a .env file with your OpenAI API key
echo "OPENAI_API_KEY=your-openai-api-key" > .env
```

2. Install dependencies:

```bash
# From the root of the monorepo
pnpm install
```

3. Build the packages:

```bash
pnpm build
```

4. Run the example:

```bash
# From the root of the monorepo
pnpm --filter voltagent-vector-retrieval-example dev
```

5. Connect to the agent using the VoltAgent Console:

Open the VoltAgent Console URL shown in the terminal (typically https://console.voltagent.dev) and connect to your local agent.

## How It Works

This example:

1. Creates an OpenAI embedding provider for generating vector embeddings
2. Sets up an in-memory vector store for storing and searching embeddings
3. Initializes a VectorRetriever with sample documents
4. Creates an agent that uses the vector retriever for answering questions
5. Starts a VoltAgent server with the RAG agent

## Sample Questions

Try asking the agent questions like:

- "What is VoltAgent?"
- "How does memory work in VoltAgent?"
- "What developer tools are available in the VoltAgent ecosystem?"
- "How do I create a new VoltAgent project?"
- "What are the benefits of using VoltAgent?"

## Customization

You can customize the vector retriever by modifying the configuration options:

- Change the embedding provider or model
- Adjust the chunk size and overlap for document processing
- Modify the result formatting templates
- Implement a different vector store for production use

## Learn More

For more information about VoltAgent and its capabilities, check out the [VoltAgent documentation](https://voltagent.dev/docs/).

