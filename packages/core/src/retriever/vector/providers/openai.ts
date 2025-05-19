/**
 * OpenAI embedding provider implementation
 * @module retriever/vector/providers/openai
 */

import type { EmbeddingOptions, EmbeddingProvider } from "../types";

/**
 * Options specific to the OpenAI embedding provider
 */
export interface OpenAIEmbeddingOptions extends EmbeddingOptions {
  /**
   * OpenAI API key
   */
  apiKey?: string;

  /**
   * OpenAI API base URL
   * @default "https://api.openai.com/v1"
   */
  baseURL?: string;

  /**
   * OpenAI organization ID
   */
  organization?: string;

  /**
   * Embedding model to use
   * @default "text-embedding-3-small"
   */
  model?: string;

  /**
   * Batch size for embedding requests
   * @default 100
   */
  batchSize?: number;
}

/**
 * OpenAI embedding provider implementation
 * Uses OpenAI's embedding API to generate embeddings
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  private apiKey: string;
  private baseURL: string;
  private organization?: string;
  private model: string;
  private batchSize: number;

  /**
   * Constructor for OpenAIEmbeddingProvider
   * @param options - Configuration options
   */
  constructor(options: OpenAIEmbeddingOptions) {
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || "";
    this.baseURL = options.baseURL || "https://api.openai.com/v1";
    this.organization = options.organization || process.env.OPENAI_ORGANIZATION;
    this.model = options.model || "text-embedding-3-small";
    this.batchSize = options.batchSize || 100;

    if (!this.apiKey) {
      throw new Error(
        "OpenAI API key is required. Provide it in options or set OPENAI_API_KEY environment variable."
      );
    }
  }

  /**
   * Generate embeddings for a list of texts
   * @param texts - Array of text strings to embed
   * @returns Promise resolving to a 2D array of embedding vectors
   */
  async embedTexts(texts: string[]): Promise<number[][]> {
    if (!texts.length) {
      return [];
    }

    // Process in batches to avoid API limits
    const batches: string[][] = [];
    for (let i = 0; i < texts.length; i += this.batchSize) {
      batches.push(texts.slice(i, i + this.batchSize));
    }

    // Process each batch and collect results
    const embeddings: number[][] = [];
    for (const batch of batches) {
      const batchEmbeddings = await this.processBatch(batch);
      embeddings.push(...batchEmbeddings);
    }

    return embeddings;
  }

  /**
   * Generate an embedding for a single text
   * @param text - Text string to embed
   * @returns Promise resolving to an embedding vector
   */
  async embedText(text: string): Promise<number[]> {
    const embeddings = await this.embedTexts([text]);
    return embeddings[0] || [];
  }

  /**
   * Process a batch of texts to generate embeddings
   * @param batch - Array of text strings to embed
   * @returns Promise resolving to a 2D array of embedding vectors
   * @private
   */
  private async processBatch(batch: string[]): Promise<number[][]> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers["OpenAI-Organization"] = this.organization;
    }

    const response = await fetch(`${this.baseURL}/embeddings`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.model,
        input: batch,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} ${error}`);
    }

    const result = await response.json();
    return result.data.map((item: any) => item.embedding);
  }
}

