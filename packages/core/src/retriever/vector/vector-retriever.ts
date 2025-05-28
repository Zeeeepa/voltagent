/**
 * Vector retriever implementation
 * @module retriever/vector/vector-retriever
 */

import { BaseVectorRetriever } from "./base";
import type { Document, VectorRetrieverOptions } from "./types";
import { chunkDocuments } from "./utils";

/**
 * Options for configuring the VectorRetriever
 */
export interface VectorRetrieverOptions extends VectorRetrieverOptions {
  /**
   * Whether to automatically chunk documents when adding them
   * @default true
   */
  autoChunk?: boolean;

  /**
   * Size of each chunk in characters when auto-chunking
   * @default 1000
   */
  chunkSize?: number;

  /**
   * Overlap between chunks in characters when auto-chunking
   * @default 200
   */
  chunkOverlap?: number;
}

/**
 * Vector-based retriever implementation.
 * Uses vector embeddings to find semantically similar documents.
 */
export class VectorRetriever extends BaseVectorRetriever {
  /**
   * Whether to automatically chunk documents when adding them
   */
  private autoChunk: boolean;

  /**
   * Size of each chunk in characters when auto-chunking
   */
  private chunkSize: number;

  /**
   * Overlap between chunks in characters when auto-chunking
   */
  private chunkOverlap: number;

  /**
   * Constructor for VectorRetriever
   * @param options - Configuration options
   */
  constructor(options: VectorRetrieverOptions) {
    super(options);

    this.autoChunk = options.autoChunk !== false;
    this.chunkSize = options.chunkSize || 1000;
    this.chunkOverlap = options.chunkOverlap || 200;
  }

  /**
   * Add documents to the vector store, with optional chunking
   * @param documents - Array of documents to add
   * @param chunk - Whether to chunk documents (overrides autoChunk setting)
   * @returns Promise resolving when documents are added
   */
  async addDocuments(documents: Document[], chunk?: boolean): Promise<void> {
    if (!documents.length) {
      return;
    }

    // Determine whether to chunk documents
    const shouldChunk = chunk !== undefined ? chunk : this.autoChunk;

    // Process documents (chunk if needed)
    const processedDocs = shouldChunk
      ? chunkDocuments(documents, {
          chunkSize: this.chunkSize,
          chunkOverlap: this.chunkOverlap,
        })
      : documents;

    // Add processed documents to the store
    await super.addDocuments(processedDocs);
  }
}

