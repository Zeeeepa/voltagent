/**
 * In-memory vector store implementation
 * @module retriever/vector/stores/memory
 */

import type {
  DocumentWithEmbedding,
  ScoredDocument,
  VectorStore,
} from "../types";

/**
 * Options for configuring the in-memory vector store
 */
export interface InMemoryVectorStoreOptions {
  /**
   * Initial documents to add to the store
   */
  initialDocuments?: DocumentWithEmbedding[];

  /**
   * Distance metric to use for similarity calculations
   * @default "cosine"
   */
  distanceMetric?: "cosine" | "euclidean" | "dot";
}

/**
 * In-memory implementation of a vector store.
 * Stores documents and their embeddings in memory for quick retrieval.
 * Suitable for development, testing, and small-scale applications.
 */
export class InMemoryVectorStore implements VectorStore {
  /**
   * Documents stored in memory
   */
  private documents: Map<string, DocumentWithEmbedding>;

  /**
   * Distance metric to use for similarity calculations
   */
  private distanceMetric: "cosine" | "euclidean" | "dot";

  /**
   * Constructor for InMemoryVectorStore
   * @param options - Configuration options
   */
  constructor(options: InMemoryVectorStoreOptions = {}) {
    this.documents = new Map();
    this.distanceMetric = options.distanceMetric || "cosine";

    // Add initial documents if provided
    if (options.initialDocuments) {
      this.addDocuments(options.initialDocuments);
    }
  }

  /**
   * Add documents to the vector store
   * @param documents - Array of documents with embeddings to add
   * @returns Promise resolving when documents are added
   */
  async addDocuments(documents: DocumentWithEmbedding[]): Promise<void> {
    for (const doc of documents) {
      if (!doc.id) {
        throw new Error("Document ID is required for InMemoryVectorStore");
      }
      this.documents.set(doc.id, { ...doc });
    }
  }

  /**
   * Search for similar documents based on a query embedding
   * @param embedding - Query embedding vector
   * @param options - Search options including limit and filter
   * @returns Promise resolving to array of scored documents
   */
  async similaritySearch(
    embedding: number[],
    options: {
      limit?: number;
      filter?: Record<string, any>;
    } = {}
  ): Promise<ScoredDocument[]> {
    const limit = options.limit || 5;
    const filter = options.filter;

    // Calculate similarity scores for all documents
    const scoredDocs: ScoredDocument[] = [];

    for (const doc of this.documents.values()) {
      // Apply filter if provided
      if (filter && !this.matchesFilter(doc, filter)) {
        continue;
      }

      const score = this.calculateSimilarity(embedding, doc.embedding);
      
      scoredDocs.push({
        id: doc.id,
        content: doc.content,
        metadata: doc.metadata,
        score,
      });
    }

    // Sort by score (higher is better) and limit results
    return scoredDocs
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Delete documents from the vector store
   * @param ids - Array of document IDs to delete
   * @returns Promise resolving when documents are deleted
   */
  async deleteDocuments(ids: string[]): Promise<void> {
    for (const id of ids) {
      this.documents.delete(id);
    }
  }

  /**
   * Calculate similarity between two vectors based on the configured distance metric
   * @param vec1 - First vector
   * @param vec2 - Second vector
   * @returns Similarity score (higher means more similar)
   * @private
   */
  private calculateSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error(
        `Vector dimensions do not match: ${vec1.length} vs ${vec2.length}`
      );
    }

    switch (this.distanceMetric) {
      case "cosine":
        return this.cosineSimilarity(vec1, vec2);
      case "euclidean":
        return this.euclideanSimilarity(vec1, vec2);
      case "dot":
        return this.dotProduct(vec1, vec2);
      default:
        return this.cosineSimilarity(vec1, vec2);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param vec1 - First vector
   * @param vec2 - Second vector
   * @returns Cosine similarity (1 means identical, 0 means orthogonal)
   * @private
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = this.dotProduct(vec1, vec2);
    const mag1 = Math.sqrt(this.dotProduct(vec1, vec1));
    const mag2 = Math.sqrt(this.dotProduct(vec2, vec2));
    
    if (mag1 === 0 || mag2 === 0) {
      return 0;
    }
    
    return dotProduct / (mag1 * mag2);
  }

  /**
   * Calculate dot product between two vectors
   * @param vec1 - First vector
   * @param vec2 - Second vector
   * @returns Dot product
   * @private
   */
  private dotProduct(vec1: number[], vec2: number[]): number {
    return vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  }

  /**
   * Calculate euclidean similarity between two vectors
   * (Converted from distance to similarity where 1 means identical)
   * @param vec1 - First vector
   * @param vec2 - Second vector
   * @returns Euclidean similarity (1 means identical, approaches 0 as distance increases)
   * @private
   */
  private euclideanSimilarity(vec1: number[], vec2: number[]): number {
    const distance = Math.sqrt(
      vec1.reduce((sum, val, i) => sum + Math.pow(val - vec2[i], 2), 0)
    );
    
    // Convert distance to similarity (1 / (1 + distance))
    return 1 / (1 + distance);
  }

  /**
   * Check if a document matches a filter
   * @param doc - Document to check
   * @param filter - Filter to apply
   * @returns True if document matches filter, false otherwise
   * @private
   */
  private matchesFilter(
    doc: DocumentWithEmbedding,
    filter: Record<string, any>
  ): boolean {
    if (!doc.metadata) {
      return false;
    }

    // Check if all filter conditions match
    for (const [key, value] of Object.entries(filter)) {
      // Handle nested paths with dot notation (e.g., "user.name")
      const path = key.split(".");
      let current: any = doc.metadata;

      // Traverse the path
      for (let i = 0; i < path.length; i++) {
        if (current === undefined || current === null) {
          return false;
        }
        current = current[path[i]];
      }

      // Check if the value matches
      if (current !== value) {
        return false;
      }
    }

    return true;
  }
}

