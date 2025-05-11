"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryStorage = void 0;
/**
 * A simple in-memory implementation of the Memory interface
 * Stores messages in memory, organized by user and conversation
 */
class InMemoryStorage {
  /**
   * Create a new in-memory storage
   * @param options Configuration options
   */
  constructor(options = {}) {
    this.storage = {};
    this.conversations = new Map();
    this.historyEntries = new Map();
    this.agentHistory = {};
    this.options = {
      storageLimit: options.storageLimit || 100,
      debug: options.debug || false,
    };
  }
  /**
   * Get a history entry by ID
   */
  async getHistoryEntry(key) {
    this.debug(`Getting history entry with key ${key}`);
    const entry = this.historyEntries.get(key);
    // No need for additional processing - we already store complete objects
    return entry ? JSON.parse(JSON.stringify(entry)) : undefined;
  }
  /**
   * Get a history event (not needed for in-memory, but required by interface)
   */
  async getHistoryEvent(key) {
    this.debug(`Getting history event with key ${key} - not needed for in-memory implementation`);
    // For in-memory, we don't need to get individual events
    // as they're stored directly in the history entries
    return undefined;
  }
  /**
   * Get a history step (not needed for in-memory, but required by interface)
   */
  async getHistoryStep(key) {
    this.debug(`Getting history step with key ${key} - not needed for in-memory implementation`);
    // For in-memory, we don't need to get individual steps
    // as they're stored directly in the history entries
    return undefined;
  }
  /**
   * Add a history entry
   */
  async addHistoryEntry(key, value, agentId) {
    this.debug(`Adding history entry with key ${key} for agent ${agentId}`, value);
    // Make sure events and steps arrays exist
    if (!value.events) value.events = [];
    if (!value.steps) value.steps = [];
    // Store the entry directly
    this.historyEntries.set(key, {
      ...value,
      _agentId: agentId,
      updatedAt: new Date().toISOString(),
    });
    // Add to agent history index
    if (!this.agentHistory[agentId]) {
      this.agentHistory[agentId] = [];
    }
    if (!this.agentHistory[agentId].includes(key)) {
      this.agentHistory[agentId].push(key);
    }
  }
  /**
   * Update a history entry
   */
  async updateHistoryEntry(key, value, agentId) {
    this.debug(`Updating history entry with key ${key}`, value);
    const existingEntry = this.historyEntries.get(key);
    if (!existingEntry) {
      throw new Error(`History entry with key ${key} not found`);
    }
    // Ensure _agentId is preserved
    const effectiveAgentId = agentId || existingEntry._agentId;
    // Update the entry with the new values, preserving existing values not in the update
    this.historyEntries.set(key, {
      ...existingEntry,
      ...value,
      _agentId: effectiveAgentId,
      updatedAt: new Date().toISOString(),
    });
  }
  /**
   * Add a history event
   */
  async addHistoryEvent(key, value, historyId, agentId) {
    this.debug(
      `Adding history event with key ${key} for history ${historyId} and agent ${agentId}`,
      value,
    );
    // Link to the history entry
    const historyEntry = this.historyEntries.get(historyId);
    if (!historyEntry) {
      throw new Error(`History entry with key ${historyId} not found`);
    }
    // Format the event object to match expected structure
    const eventObject = {
      id: key,
      timestamp: value.timestamp || new Date().toISOString(),
      name: value.name,
      type: value.type,
      affectedNodeId: value.affectedNodeId || value.data?.affectedNodeId,
      data: {
        ...(value.metadata || value.data || {}),
        _trackedEventId: value._trackedEventId,
        affectedNodeId: value.affectedNodeId || value.data?.affectedNodeId,
      },
      updatedAt: new Date().toISOString(),
    };
    // Initialize events array if it doesn't exist
    if (!historyEntry.events) {
      historyEntry.events = [];
    }
    // Add the complete event object directly to the history entry
    historyEntry.events.push(eventObject);
    // Update the history entry
    await this.updateHistoryEntry(historyId, historyEntry, agentId);
  }
  /**
   * Update a history event
   */
  async updateHistoryEvent(key, value, historyId, agentId) {
    this.debug(`Updating history event with key ${key}`, value);
    // Get the history entry
    const historyEntry = this.historyEntries.get(historyId);
    if (!historyEntry || !Array.isArray(historyEntry.events)) {
      throw new Error(`History entry with key ${historyId} not found or has no events`);
    }
    // Find and update the event in the array
    const eventIndex = historyEntry.events.findIndex((event) => event.id === key);
    if (eventIndex === -1) {
      throw new Error(`Event with key ${key} not found in history ${historyId}`);
    }
    // Update the event
    historyEntry.events[eventIndex] = {
      ...historyEntry.events[eventIndex],
      ...value,
      updatedAt: new Date().toISOString(),
    };
    // Update the history entry
    await this.updateHistoryEntry(historyId, historyEntry, agentId);
  }
  /**
   * Add a history step
   */
  async addHistoryStep(key, value, historyId, agentId) {
    this.debug(
      `Adding history step with key ${key} for history ${historyId} and agent ${agentId}`,
      value,
    );
    // Link to the history entry
    const historyEntry = this.historyEntries.get(historyId);
    if (!historyEntry) {
      throw new Error(`History entry with key ${historyId} not found`);
    }
    // Format the step object
    const stepObject = {
      id: key,
      type: value.type,
      name: value.name,
      content: value.content,
      arguments: value.arguments,
    };
    // Initialize steps array if it doesn't exist
    if (!historyEntry.steps) {
      historyEntry.steps = [];
    }
    // Add the complete step object directly to the history entry
    historyEntry.steps.push(stepObject);
    // Update the history entry
    await this.updateHistoryEntry(historyId, historyEntry, agentId);
  }
  /**
   * Update a history step
   */
  async updateHistoryStep(key, value, historyId, agentId) {
    this.debug(`Updating history step with key ${key}`, value);
    // Get the history entry
    const historyEntry = this.historyEntries.get(historyId);
    if (!historyEntry || !Array.isArray(historyEntry.steps)) {
      throw new Error(`History entry with key ${historyId} not found or has no steps`);
    }
    // Find and update the step in the array
    const stepIndex = historyEntry.steps.findIndex((step) => step.id === key);
    if (stepIndex === -1) {
      throw new Error(`Step with key ${key} not found in history ${historyId}`);
    }
    // Update the step
    historyEntry.steps[stepIndex] = {
      ...historyEntry.steps[stepIndex],
      ...value,
    };
    // Update the history entry
    await this.updateHistoryEntry(historyId, historyEntry, agentId);
  }
  /**
   * Get all history entries for an agent
   */
  async getAllHistoryEntriesByAgent(agentId) {
    this.debug(`Getting all history entries for agent ${agentId}`);
    // Get all entry keys for this agent
    const entryKeys = this.agentHistory[agentId] || [];
    // Get all entries
    const entries = entryKeys.map((key) => this.historyEntries.get(key)).filter(Boolean);
    // Return deep copies of entries to prevent accidental modifications
    const result = entries.map((entry) => JSON.parse(JSON.stringify(entry)));
    // Sort by timestamp (newest first)
    return result;
  }
  /**
   * Log a debug message if debug is enabled
   * @param message Message to log
   * @param data Additional data to log
   */
  debug(message, data) {
    if (this.options.debug) {
      console.log(`[InMemoryStorage] ${message}`, data || "");
    }
  }
  /**
   * Get messages with filtering options
   * @param options Filtering options
   * @returns Filtered messages
   */
  async getMessages(options = {}) {
    const {
      userId = "default",
      conversationId = "default",
      limit = this.options.storageLimit,
      before,
      after,
      role,
    } = options;
    this.debug(
      `Getting messages for user ${userId} and conversation ${conversationId} with options`,
      options,
    );
    // Get user's messages or create new empty object
    const userMessages = this.storage[userId] || {};
    // Get conversation's messages or create new empty array
    const messages = userMessages[conversationId] || [];
    // Apply filters
    let filteredMessages = messages;
    // Filter by role if specified
    if (role) {
      filteredMessages = filteredMessages.filter((m) => m.role === role);
    }
    // Filter by created timestamp if specified
    if (before) {
      filteredMessages = filteredMessages.filter(
        (m) => new Date(m.createdAt).getTime() < new Date(before).getTime(),
      );
    }
    if (after) {
      filteredMessages = filteredMessages.filter(
        (m) => new Date(m.createdAt).getTime() > new Date(after).getTime(),
      );
    }
    // Sort by created timestamp (ascending)
    filteredMessages.sort((a, b) => {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    // Apply limit if specified
    if (limit && limit > 0 && filteredMessages.length > limit) {
      filteredMessages = filteredMessages.slice(-limit);
    }
    return filteredMessages;
  }
  /**
   * Add a message to the conversation history
   * @param message Message to add
   * @param userId User identifier (optional, defaults to "default")
   * @param conversationId Conversation identifier (optional, defaults to "default")
   */
  async addMessage(message, userId = "default", conversationId = "default") {
    this.debug(`Adding message for user ${userId} and conversation ${conversationId}`, message);
    // Create user's messages container if it doesn't exist
    if (!this.storage[userId]) {
      this.storage[userId] = {};
    }
    // Create conversation's messages array if it doesn't exist
    if (!this.storage[userId][conversationId]) {
      this.storage[userId][conversationId] = [];
    }
    // Add the message with metadata
    this.storage[userId][conversationId].push(message);
    // Apply storage limit if specified
    if (this.options.storageLimit && this.options.storageLimit > 0) {
      const messages = this.storage[userId][conversationId];
      if (messages.length > this.options.storageLimit) {
        // Remove oldest messages to maintain limit
        this.storage[userId][conversationId] = messages.slice(-this.options.storageLimit);
      }
    }
  }
  /**
   * Clear all messages for a user and optionally a specific conversation
   * @param options Options specifying which messages to clear
   */
  async clearMessages(options) {
    const { userId, conversationId } = options;
    this.debug(
      `Clearing messages for user ${userId} ${conversationId ? `and conversation ${conversationId}` : ""}`,
    );
    // If user doesn't exist, nothing to clear
    if (!this.storage[userId]) {
      return;
    }
    // If conversationId specified, clear only that conversation
    if (conversationId) {
      this.storage[userId][conversationId] = [];
    } else {
      // Clear all conversations for the user
      this.storage[userId] = {};
    }
  }
  /**
   * Create a new conversation
   * @param conversation Conversation to create
   * @returns Created conversation
   */
  async createConversation(conversation) {
    const now = new Date().toISOString();
    const newConversation = {
      id: conversation.id,
      resourceId: conversation.resourceId,
      title: conversation.title,
      metadata: conversation.metadata,
      createdAt: now,
      updatedAt: now,
    };
    this.conversations.set(conversation.id, newConversation);
    this.debug(`Created conversation ${conversation.id}`, newConversation);
    return newConversation;
  }
  /**
   * Get a conversation by ID
   * @param id Conversation ID
   * @returns Conversation or null if not found
   */
  async getConversation(id) {
    this.debug(`Getting conversation ${id}`);
    return this.conversations.get(id) || null;
  }
  /**
   * Get all conversations for a resource
   * @param resourceId Resource ID
   * @returns Array of conversations
   */
  async getConversations(resourceId) {
    this.debug(`Getting conversations for resource ${resourceId}`);
    // Filter and sort conversations (newest first)
    return Array.from(this.conversations.values())
      .filter((c) => c.resourceId === resourceId)
      .sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }
  /**
   * Update a conversation
   * @param id Conversation ID
   * @param updates Updates to apply
   * @returns Updated conversation
   */
  async updateConversation(id, updates) {
    this.debug(`Updating conversation ${id}`, updates);
    const conversation = this.conversations.get(id);
    if (!conversation) {
      throw new Error(`Conversation with ID ${id} not found`);
    }
    const updatedConversation = {
      ...conversation,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.conversations.set(id, updatedConversation);
    return updatedConversation;
  }
  /**
   * Delete a conversation by ID
   * @param id Conversation ID
   */
  async deleteConversation(id) {
    // Delete all messages in the conversation
    for (const userId in this.storage) {
      delete this.storage[userId][id];
    }
    // Delete the conversation
    this.conversations.delete(id);
    this.debug(`Deleted conversation ${id}`);
  }
}
exports.InMemoryStorage = InMemoryStorage;
//# sourceMappingURL=index.js.map
