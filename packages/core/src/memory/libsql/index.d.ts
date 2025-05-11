import type {
  Conversation,
  CreateConversationInput,
  Memory,
  MemoryMessage,
  MemoryOptions,
  MessageFilterOptions,
} from "../types";
/**
 * Options for configuring the LibSQLStorage
 */
export interface LibSQLStorageOptions extends MemoryOptions {
  /**
   * LibSQL connection URL
   * Can be either a remote Turso URL or a local file path
   * @example "libsql://your-database.turso.io" for remote Turso
   * @example "file:memory.db" for local SQLite in current directory
   * @example "file:.voltagent/memory.db" for local SQLite in .voltagent folder
   */
  url: string;
  /**
   * Auth token for LibSQL/Turso
   * Not needed for local SQLite
   */
  authToken?: string;
  /**
   * Prefix for table names
   * @default "voltagent_memory"
   */
  tablePrefix?: string;
  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean;
  /**
   * Storage limit for the LibSQLStorage
   * @default 100
   */
  storageLimit?: number;
}
/**
 * A LibSQL storage implementation of the Memory interface
 * Uses libsql/Turso to store and retrieve conversation history
 *
 * This implementation automatically handles both:
 * - Remote Turso databases (with libsql:// URLs)
 * - Local SQLite databases (with file: URLs)
 */
export declare class LibSQLStorage implements Memory {
  private client;
  private options;
  private initialized;
  /**
   * Create a new LibSQL storage
   * @param options Configuration options
   */
  constructor(options: LibSQLStorageOptions);
  /**
   * Normalize the URL for SQLite database
   * - Ensures local files exist in the correct directory
   * - Creates the .voltagent directory if needed for default storage
   */
  private normalizeUrl;
  /**
   * Log a debug message if debug is enabled
   * @param message Message to log
   * @param data Additional data to log
   */
  private debug;
  /**
   * Initialize the database tables
   * @returns Promise that resolves when initialization is complete
   */
  private initializeDatabase;
  /**
   * Generate a unique ID for a message
   * @returns Unique ID
   */
  private generateId;
  /**
   * Get messages with filtering options
   * @param options Filtering options
   * @returns Filtered messages
   */
  getMessages(options?: MessageFilterOptions): Promise<MemoryMessage[]>;
  /**
   * Add a message to the conversation history
   * @param message Message to add
   * @param userId User identifier (optional, defaults to "default")
   * @param conversationId Conversation identifier (optional, defaults to "default")
   */
  addMessage(message: MemoryMessage, userId?: string, conversationId?: string): Promise<void>;
  /**
   * Clear messages from memory
   */
  clearMessages(options: {
    userId: string;
    conversationId?: string;
  }): Promise<void>;
  /**
   * Close the database connection
   */
  close(): void;
  /**
   * Add or update a history entry
   * @param key Entry ID
   * @param value Entry data
   * @param agentId Agent ID for filtering
   */
  addHistoryEntry(key: string, value: any, agentId: string): Promise<void>;
  /**
   * Update an existing history entry
   * @param key Entry ID
   * @param value Updated entry data
   * @param agentId Agent ID for filtering
   */
  updateHistoryEntry(key: string, value: any, agentId: string): Promise<void>;
  /**
   * Add a history event
   * @param key Event ID
   * @param value Event data
   * @param historyId Related history entry ID
   * @param agentId Agent ID for filtering
   */
  addHistoryEvent(key: string, value: any, historyId: string, agentId: string): Promise<void>;
  /**
   * Update a history event
   * @param key Event ID
   * @param value Updated event data
   * @param historyId Related history entry ID
   * @param agentId Agent ID for filtering
   */
  updateHistoryEvent(key: string, value: any, historyId: string, agentId: string): Promise<void>;
  /**
   * Add a history step
   * @param key Step ID
   * @param value Step data
   * @param historyId Related history entry ID
   * @param agentId Agent ID for filtering
   */
  addHistoryStep(key: string, value: any, historyId: string, agentId: string): Promise<void>;
  /**
   * Update a history step
   * @param key Step ID
   * @param value Updated step data
   * @param historyId Related history entry ID
   * @param agentId Agent ID for filtering
   */
  updateHistoryStep(key: string, value: any, historyId: string, agentId: string): Promise<void>;
  /**
   * Get a history entry by ID
   * @param key Entry ID
   * @returns The history entry or undefined if not found
   */
  getHistoryEntry(key: string): Promise<any | undefined>;
  /**
   * Get a history event by ID
   * @param key Event ID
   * @returns The history event or undefined if not found
   */
  getHistoryEvent(key: string): Promise<any | undefined>;
  /**
   * Get a history step by ID
   * @param key Step ID
   * @returns The history step or undefined if not found
   */
  getHistoryStep(key: string): Promise<any | undefined>;
  createConversation(conversation: CreateConversationInput): Promise<Conversation>;
  getConversation(id: string): Promise<Conversation | null>;
  getConversations(resourceId: string): Promise<Conversation[]>;
  updateConversation(
    id: string,
    updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Conversation>;
  deleteConversation(id: string): Promise<void>;
  /**
   * Get all history entries for an agent
   * @param agentId Agent ID
   * @returns Array of all history entries for the agent
   */
  getAllHistoryEntriesByAgent(agentId: string): Promise<any[]>;
}
