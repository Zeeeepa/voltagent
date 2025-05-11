/**
 * Options for configuring the Retriever
 */
export type RetrieverOptions = {
  /**
   * Name for the default tool created from this retriever
   * This is used for the pre-created 'tool' property
   * @default "search_knowledge"
   */
  toolName?: string;
  /**
   * Description for the default tool created from this retriever
   * This is used for the pre-created 'tool' property
   * @default "Searches for relevant information in the knowledge base based on the query."
   */
  toolDescription?: string;
  /**
   * Additional configuration specific to concrete retriever implementations
   */
  [key: string]: any;
};
/**
 * Retriever interface for retrieving relevant information
 */
export type Retriever = {
  /**
   * Retrieve relevant documents based on input text
   * @param text The text to use for retrieval
   * @returns Promise resolving to an array of retrieval results
   */
  retrieve(text: string): Promise<string>;
  /**
   * Configuration options for the retriever
   * This is optional and may not be present in all implementations
   */
  options?: RetrieverOptions;
  /**
   * Pre-created tool for easy destructuring
   * This is optional and may not be present in all implementations
   */
  tool?: any;
};
