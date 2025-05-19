/**
 * Types for vector-based retrieval functionality
 * @module retriever/vector/types
 */

import type { RetrieverOptions } from "../types";

/**
 * Represents a document to be indexed in a vector store
 */
export interface Document {
  /**
   * Unique identifier for the document
   */
  id?: string;

  /**
   * The text content of the document
   */
  content: string;

  /**
   * Optional metadata associated with the document
   */
  metadata?: Record<string, any>;
}

/**
 * Represents a document with its embedding vector
 */
export interface DocumentWithEmbedding extends Document {
  /**
   * The embedding vector for the document
   */
  embedding: number[];
}

/**
 * Represents a document with its similarity score
 */
export interface ScoredDocument extends Document {
  /**
   * Similarity score between the document and the query
   * Higher values indicate greater similarity
   */
  score: number;
}

/**
 * Configuration options for embedding providers
 */
export interface EmbeddingOptions {
  /**
   * The model to use for generating embeddings
   */
  model?: string;

  /**
   * The dimension of the embedding vectors
   */
  dimensions?: number;

  /**
   * Additional provider-specific options
   */
  [key: string]: any;
}

/**
 * Interface for embedding providers
 */
export interface EmbeddingProvider {
  /**
   * Generate embeddings for a list of texts
   * @param texts - Array of text strings to embed
   * @returns Promise resolving to a 2D array of embedding vectors
   */
  embedTexts(texts: string[]): Promise<number[][]>;

  /**
   * Generate an embedding for a single text
   * @param text - Text string to embed
   * @returns Promise resolving to an embedding vector
   */
  embedText(text: string): Promise<number[]>;
}

/**
 * Interface for vector stores
 */
export interface VectorStore {
  /**
   * Add documents to the vector store
   * @param documents - Array of documents with embeddings to add
   * @returns Promise resolving when documents are added
   */
  addDocuments(documents: DocumentWithEmbedding[]): Promise<void>;

  /**
   * Search for similar documents based on a query embedding
   * @param embedding - Query embedding vector
   * @param options - Search options including limit and filter
   * @returns Promise resolving to array of scored documents
   */
  similaritySearch(
    embedding: number[],
    options?: {
      limit?: number;
      filter?: Record<string, any>;
    }
  ): Promise<ScoredDocument[]>;

  /**
   * Delete documents from the vector store
   * @param ids - Array of document IDs to delete
   * @returns Promise resolving when documents are deleted
   */
  deleteDocuments(ids: string[]): Promise<void>;
}

/**
 * Options for configuring a vector retriever
 */
export interface VectorRetrieverOptions extends RetrieverOptions {
  /**
   * The embedding provider to use
   */
  embeddingProvider: EmbeddingProvider;

  /**
   * The vector store to use
   */
  vectorStore: VectorStore;

  /**
   * Maximum number of documents to return in search results
   * @default 5
   */
  topK?: number;

  /**
   * Metadata filter to apply during search
   */
  filter?: Record<string, any>;

  /**
   * Format string for formatting search results
   * Available variables: {documents}, {query}
   * @default "Relevant information for '{query}':\n\n{documents}"
   */
  resultFormat?: string;

  /**
   * Format string for individual documents in search results
   * Available variables: {content}, {score}, {metadata}
   * @default "{content}\n"
   */
  documentFormat?: string;

  /**
   * Format string when no results are found
   * Available variables: {query}
   * @default "No relevant information found for '{query}'."
   */
  noResultsFormat?: string;
}

