/**
 * Base implementation for vector-based retrievers
 * @module retriever/vector/base
 */

import { v4 as uuidv4 } from "uuid";
import { BaseRetriever } from "../retriever";
import type { BaseMessage } from "../../agent/providers";
import type {
  Document,
  DocumentWithEmbedding,
  EmbeddingProvider,
  ScoredDocument,
  VectorRetrieverOptions,
  VectorStore,
} from "./types";

/**
 * Abstract base class for vector-based retrievers.
 * Extends the BaseRetriever class with vector-specific functionality.
 */
export abstract class BaseVectorRetriever extends BaseRetriever {
  /**
   * The embedding provider used to generate embeddings
   */
  protected embeddingProvider: EmbeddingProvider;

  /**
   * The vector store used to store and search embeddings
   */
  protected vectorStore: VectorStore;

  /**
   * Maximum number of documents to return in search results
   */
  protected topK: number;

  /**
   * Metadata filter to apply during search
   */
  protected filter?: Record<string, any>;

  /**
   * Format string for formatting search results
   */
  protected resultFormat: string;

  /**
   * Format string for individual documents in search results
   */
  protected documentFormat: string;

  /**
   * Format string when no results are found
   */
  protected noResultsFormat: string;

  /**
   * Constructor for the BaseVectorRetriever class.
   * @param options - Configuration options for the vector retriever
   */
  constructor(options: VectorRetrieverOptions) {
    super(options);

    if (!options.embeddingProvider) {
      throw new Error("embeddingProvider is required for BaseVectorRetriever");
    }

    if (!options.vectorStore) {
      throw new Error("vectorStore is required for BaseVectorRetriever");
    }

    this.embeddingProvider = options.embeddingProvider;
    this.vectorStore = options.vectorStore;
    this.topK = options.topK ?? 5;
    this.filter = options.filter;
    this.resultFormat =
      options.resultFormat ?? "Relevant information for '{query}':\n\n{documents}";
    this.documentFormat = options.documentFormat ?? "{content}\n";
    this.noResultsFormat =
      options.noResultsFormat ?? "No relevant information found for '{query}'.";
  }

  /**
   * Add documents to the vector store
   * @param documents - Array of documents to add
   * @returns Promise resolving when documents are added
   */
  async addDocuments(documents: Document[]): Promise<void> {
    if (!documents.length) {
      return;
    }

    // Assign IDs to documents that don't have them
    const docsWithIds = documents.map((doc) => ({
      ...doc,
      id: doc.id || uuidv4(),
    }));

    // Extract text content for embedding
    const texts = docsWithIds.map((doc) => doc.content);

    // Generate embeddings for all documents
    const embeddings = await this.embeddingProvider.embedTexts(texts);

    // Combine documents with their embeddings
    const docsWithEmbeddings: DocumentWithEmbedding[] = docsWithIds.map((doc, i) => ({
      ...doc,
      embedding: embeddings[i],
    }));

    // Add documents with embeddings to the vector store
    await this.vectorStore.addDocuments(docsWithEmbeddings);
  }

  /**
   * Delete documents from the vector store
   * @param ids - Array of document IDs to delete
   * @returns Promise resolving when documents are deleted
   */
  async deleteDocuments(ids: string[]): Promise<void> {
    if (!ids.length) {
      return;
    }

    await this.vectorStore.deleteDocuments(ids);
  }

  /**
   * Format search results into a string
   * @param results - Array of scored documents
   * @param query - The original query string
   * @returns Formatted results string
   */
  protected formatResults(results: ScoredDocument[], query: string): string {
    if (!results.length) {
      return this.noResultsFormat.replace("{query}", query);
    }

    const formattedDocuments = results
      .map((doc) => {
        return this.documentFormat
          .replace("{content}", doc.content)
          .replace("{score}", doc.score.toString())
          .replace(
            "{metadata}",
            doc.metadata ? JSON.stringify(doc.metadata) : ""
          );
      })
      .join("\n");

    return this.resultFormat
      .replace("{documents}", formattedDocuments)
      .replace("{query}", query);
  }

  /**
   * Extract query text from input
   * @param input - Input string or array of messages
   * @returns Extracted query text
   */
  protected extractQueryText(input: string | BaseMessage[]): string {
    if (typeof input === "string") {
      return input;
    }

    if (Array.isArray(input) && input.length > 0) {
      const lastMessage = input[input.length - 1];

      // Handle content as array of content parts with text type
      if (Array.isArray(lastMessage.content)) {
        const textParts = lastMessage.content
          .filter((part: any) => part.type === "text")
          .map((part: any) => part.text);

        return textParts.join(" ");
      }

      // Fallback to string content
      return lastMessage.content as string;
    }

    return "";
  }

  /**
   * Retrieve information based on input.
   * This method is implemented to perform vector-based retrieval.
   *
   * @param input - The input to base the retrieval on, can be string or BaseMessage array
   * @returns A Promise that resolves to a formatted context string
   */
  async retrieve(input: string | BaseMessage[]): Promise<string> {
    const query = this.extractQueryText(input);

    if (!query) {
      return this.noResultsFormat.replace("{query}", "");
    }

    // Generate embedding for the query
    const queryEmbedding = await this.embeddingProvider.embedText(query);

    // Search for similar documents
    const results = await this.vectorStore.similaritySearch(queryEmbedding, {
      limit: this.topK,
      filter: this.filter,
    });

    // Format and return results
    return this.formatResults(results, query);
  }
}

