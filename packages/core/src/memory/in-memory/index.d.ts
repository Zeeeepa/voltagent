import type {
  Conversation,
  CreateConversationInput,
  Memory,
  MemoryMessage,
  MemoryOptions,
  MessageFilterOptions,
} from "../types";
/**
 * Options for configuring the InMemoryStorage
 */
export interface InMemoryStorageOptions extends MemoryOptions {
  /**
   * Whether to enable debug logging
   * @default false
   */
  debug?: boolean;
}
/**
 * A simple in-memory implementation of the Memory interface
 * Stores messages in memory, organized by user and conversation
 */
export declare class InMemoryStorage implements Memory {
  private storage;
  private conversations;
  private historyEntries;
  private agentHistory;
  private options;
  /**
   * Create a new in-memory storage
   * @param options Configuration options
   */
  constructor(options?: InMemoryStorageOptions);
  /**
   * Get a history entry by ID
   */
  getHistoryEntry(key: string): Promise<any | undefined>;
  /**
   * Get a history event (not needed for in-memory, but required by interface)
   */
  getHistoryEvent(key: string): Promise<any | undefined>;
  /**
   * Get a history step (not needed for in-memory, but required by interface)
   */
  getHistoryStep(key: string): Promise<any | undefined>;
  /**
   * Add a history entry
   */
  addHistoryEntry(key: string, value: any, agentId: string): Promise<void>;
  /**
   * Update a history entry
   */
  updateHistoryEntry(key: string, value: any, agentId?: string): Promise<void>;
  /**
   * Add a history event
   */
  addHistoryEvent(key: string, value: any, historyId: string, agentId: string): Promise<void>;
  /**
   * Update a history event
   */
  updateHistoryEvent(key: string, value: any, historyId: string, agentId: string): Promise<void>;
  /**
   * Add a history step
   */
  addHistoryStep(key: string, value: any, historyId: string, agentId: string): Promise<void>;
  /**
   * Update a history step
   */
  updateHistoryStep(key: string, value: any, historyId: string, agentId: string): Promise<void>;
  /**
   * Get all history entries for an agent
   */
  getAllHistoryEntriesByAgent(agentId: string): Promise<any[]>;
  /**
   * Log a debug message if debug is enabled
   * @param message Message to log
   * @param data Additional data to log
   */
  private debug;
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
   * Clear all messages for a user and optionally a specific conversation
   * @param options Options specifying which messages to clear
   */
  clearMessages(options: {
    userId: string;
    conversationId?: string;
  }): Promise<void>;
  /**
   * Create a new conversation
   * @param conversation Conversation to create
   * @returns Created conversation
   */
  createConversation(conversation: CreateConversationInput): Promise<Conversation>;
  /**
   * Get a conversation by ID
   * @param id Conversation ID
   * @returns Conversation or null if not found
   */
  getConversation(id: string): Promise<Conversation | null>;
  /**
   * Get all conversations for a resource
   * @param resourceId Resource ID
   * @returns Array of conversations
   */
  getConversations(resourceId: string): Promise<Conversation[]>;
  /**
   * Update a conversation
   * @param id Conversation ID
   * @param updates Updates to apply
   * @returns Updated conversation
   */
  updateConversation(
    id: string,
    updates: Partial<Omit<Conversation, "id" | "createdAt" | "updatedAt">>,
  ): Promise<Conversation>;
  /**
   * Delete a conversation by ID
   * @param id Conversation ID
   */
  deleteConversation(id: string): Promise<void>;
}
