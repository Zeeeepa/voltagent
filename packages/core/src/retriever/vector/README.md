# Vector-Based Retrieval for VoltAgent

This module provides vector-based retrieval capabilities for VoltAgent, enabling semantic search and Retrieval-Augmented Generation (RAG) applications.

## Features

- Semantic search using vector embeddings
- Multiple embedding provider support
- Flexible vector storage options
- Document chunking utilities
- Metadata filtering
- Configurable result formatting

## Architecture

The vector retrieval module consists of several components:

1. **BaseVectorRetriever**: Abstract base class extending BaseRetriever with vector-specific functionality
2. **VectorRetriever**: Concrete implementation with chunking support
3. **EmbeddingProvider**: Interface for generating embeddings (with OpenAI implementation)
4. **VectorStore**: Interface for storing and searching embeddings (with in-memory implementation)
5. **Utility functions**: For document processing and chunking

## Usage

### Basic Usage

```typescript
import {
  VectorRetriever,
  OpenAIEmbeddingProvider,
  InMemoryVectorStore,
} from "@voltagent/core";

// Create an embedding provider
const embeddingProvider = new OpenAIEmbeddingProvider({
  apiKey: "your-openai-api-key",
  model: "text-embedding-3-small",
});

// Create a vector store
const vectorStore = new InMemoryVectorStore();

// Create a vector retriever
const vectorRetriever = new VectorRetriever({
  embeddingProvider,
  vectorStore,
  topK: 3,
});

// Add documents to the vector store
await vectorRetriever.addDocuments([
  {
    id: "doc1",
    content: "VoltAgent is an open source TypeScript framework for building AI agents.",
    metadata: { source: "documentation" },
  },
  // More documents...
]);

// Use the retriever
const results = await vectorRetriever.retrieve("What is VoltAgent?");
console.log(results);
```

### Integration with Agent

```typescript
import { Agent } from "@voltagent/core";

// Create an agent with the vector retriever
const agent = new Agent({
  name: "RAG Agent",
  instructions: "Answer questions using the retrieved information.",
  llm: yourLLMProvider,
  retriever: vectorRetriever,
});
```

### Using as a Tool

```typescript
import { createRetrieverTool } from "@voltagent/core";

// Create a retriever tool
const retrievalTool = createRetrieverTool(vectorRetriever, {
  name: "search_documentation",
  description: "Search the documentation for relevant information",
});

// Add the tool to an agent
const agent = new Agent({
  name: "Agent with Tools",
  instructions: "Use tools to answer questions.",
  llm: yourLLMProvider,
  tools: [retrievalTool],
});
```

## Customization

### Custom Embedding Provider

You can implement custom embedding providers by implementing the `EmbeddingProvider` interface:

```typescript
import { EmbeddingProvider } from "@voltagent/core";

class CustomEmbeddingProvider implements EmbeddingProvider {
  async embedTexts(texts: string[]): Promise<number[][]> {
    // Implementation...
  }

  async embedText(text: string): Promise<number[]> {
    // Implementation...
  }
}
```

### Custom Vector Store

You can implement custom vector stores by implementing the `VectorStore` interface:

```typescript
import { VectorStore, DocumentWithEmbedding, ScoredDocument } from "@voltagent/core";

class CustomVectorStore implements VectorStore {
  async addDocuments(documents: DocumentWithEmbedding[]): Promise<void> {
    // Implementation...
  }

  async similaritySearch(
    embedding: number[],
    options?: { limit?: number; filter?: Record<string, any> }
  ): Promise<ScoredDocument[]> {
    // Implementation...
  }

  async deleteDocuments(ids: string[]): Promise<void> {
    // Implementation...
  }
}
```

## Advanced Configuration

The `VectorRetriever` supports various configuration options:

```typescript
const vectorRetriever = new VectorRetriever({
  embeddingProvider,
  vectorStore,
  topK: 5,                // Number of results to return
  filter: { type: "doc" }, // Metadata filter
  autoChunk: true,        // Automatically chunk documents
  chunkSize: 1000,        // Size of each chunk
  chunkOverlap: 200,      // Overlap between chunks
  resultFormat: "Relevant information:\n\n{documents}",
  documentFormat: "[{score}] {content}\n",
  noResultsFormat: "No information found for '{query}'.",
});
```

## Examples

See the `examples/with-vector-retrieval` directory for a complete example of using vector-based retrieval in a VoltAgent application.

