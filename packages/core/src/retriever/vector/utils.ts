/**
 * Utility functions for vector-based retrieval
 * @module retriever/vector/utils
 */

import type { Document } from "./types";

/**
 * Options for text chunking
 */
export interface ChunkOptions {
  /**
   * Size of each chunk in characters
   * @default 1000
   */
  chunkSize?: number;

  /**
   * Overlap between chunks in characters
   * @default 200
   */
  chunkOverlap?: number;

  /**
   * Whether to split on sentences
   * @default true
   */
  splitOnSentence?: boolean;
}

/**
 * Split a text into chunks with optional overlap
 * @param text - Text to split into chunks
 * @param options - Chunking options
 * @returns Array of text chunks
 */
export function chunkText(
  text: string,
  options: ChunkOptions = {}
): string[] {
  const chunkSize = options.chunkSize || 1000;
  const chunkOverlap = options.chunkOverlap || 200;
  const splitOnSentence = options.splitOnSentence !== false;

  if (text.length <= chunkSize) {
    return [text];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    // Calculate end index for this chunk
    let endIndex = startIndex + chunkSize;
    
    // Adjust end index if it exceeds text length
    if (endIndex > text.length) {
      endIndex = text.length;
    } else if (splitOnSentence) {
      // Try to find a sentence boundary to split on
      const sentenceEndMatch = text
        .substring(endIndex - 100, endIndex + 100)
        .match(/[.!?]\s+/);
      
      if (sentenceEndMatch) {
        const matchIndex = sentenceEndMatch.index || 0;
        // Adjust endIndex to end at sentence boundary
        endIndex = Math.min(
          endIndex - 100 + matchIndex + sentenceEndMatch[0].length,
          text.length
        );
      }
    }

    // Extract chunk and add to results
    chunks.push(text.substring(startIndex, endIndex));
    
    // Move start index for next chunk, accounting for overlap
    startIndex = endIndex - chunkOverlap;
    
    // Ensure we make progress
    if (startIndex <= 0 || startIndex >= text.length - 10) {
      break;
    }
  }

  return chunks;
}

/**
 * Split a document into multiple documents based on chunk size
 * @param document - Document to split
 * @param options - Chunking options
 * @returns Array of chunked documents
 */
export function chunkDocument(
  document: Document,
  options: ChunkOptions = {}
): Document[] {
  const { id, content, metadata } = document;
  
  // Split the content into chunks
  const textChunks = chunkText(content, options);
  
  // Create a new document for each chunk
  return textChunks.map((chunk, index) => ({
    id: id ? `${id}-chunk-${index}` : undefined,
    content: chunk,
    metadata: {
      ...metadata,
      chunkIndex: index,
      totalChunks: textChunks.length,
      originalDocumentId: id,
    },
  }));
}

/**
 * Split multiple documents into chunks
 * @param documents - Array of documents to split
 * @param options - Chunking options
 * @returns Array of chunked documents
 */
export function chunkDocuments(
  documents: Document[],
  options: ChunkOptions = {}
): Document[] {
  return documents.flatMap((doc) => chunkDocument(doc, options));
}

