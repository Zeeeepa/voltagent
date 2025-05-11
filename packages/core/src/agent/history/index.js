"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryManager = void 0;
const uuid_1 = require("uuid");
const events_1 = require("../../events");
/**
 * Manages agent interaction history
 */
class HistoryManager {
  /**
   * Create a new history manager
   *
   * @param maxEntries - Maximum number of history entries to keep (0 = unlimited)
   * @param agentId - Agent ID for emitting events
   * @param memoryManager - Memory manager instance to use
   */
  constructor(maxEntries = 0, agentId, memoryManager) {
    this.maxEntries = maxEntries;
    this.agentId = agentId;
    // Use provided memory manager
    this.memoryManager = memoryManager;
  }
  /**
   * Set the agent ID for this history manager
   */
  setAgentId(agentId) {
    this.agentId = agentId;
  }
  /**
   * Add a new history entry
   *
   * @param input - Input to the agent
   * @param output - Output from the agent
   * @param status - Status of the entry
   * @param steps - Steps taken during generation
   * @param options - Additional options for the entry
   * @returns The new history entry
   */
  async addEntry(input, output, status, steps = [], options = {}) {
    if (!this.agentId) {
      throw new Error("Agent ID must be set to manage history");
    }
    // If maxEntries is set and we already have that many entries, remove the oldest
    if (this.maxEntries > 0) {
      const entries = await this.getEntries();
      if (entries.length >= this.maxEntries) {
        // TODO: Implement deletion of oldest entry
        // For now, we'll just let them accumulate
      }
    }
    const entry = {
      id: (0, uuid_1.v4)(),
      timestamp: new Date(),
      input,
      output,
      status,
      steps,
      ...options,
    };
    // Store in memory storage
    await this.memoryManager.storeHistoryEntry(this.agentId, entry);
    // Emit event
    events_1.AgentEventEmitter.getInstance().emitHistoryEntryCreated(this.agentId, entry);
    return entry;
  }
  /**
   * Add a timeline event to an existing history entry
   *
   * @param entryId - ID of the entry to update
   * @param event - Timeline event to add
   * @returns The updated entry or undefined if not found
   */
  async addEventToEntry(entryId, event) {
    if (!this.agentId) return undefined;
    try {
      // Directly use the MemoryManager's addEventToHistoryEntry method
      // This correctly saves the event in the new relational database structure
      return await this.memoryManager.addEventToHistoryEntry(this.agentId, entryId, event);
    } catch (error) {
      console.error(`[HistoryManager] Failed to add event to entry: ${entryId}`, error);
      return undefined;
    }
  }
  /**
   * Add steps to an existing history entry
   *
   * @param entryId - ID of the entry to update
   * @param steps - Steps to add
   * @returns The updated entry or undefined if not found
   */
  async addStepsToEntry(entryId, steps) {
    if (!this.agentId) return undefined;
    // Convert StepWithContent to HistoryStep
    const historySteps = steps.map((step) => ({
      type: step.type,
      name: step.name,
      content: step.content,
      arguments: step.arguments,
    }));
    // Add steps to entry in memory storage
    const updatedEntry = await this.memoryManager.addStepsToHistoryEntry(
      this.agentId,
      entryId,
      historySteps,
    );
    // Emit update event if agent ID is set
    if (updatedEntry) {
      events_1.AgentEventEmitter.getInstance().emitHistoryUpdate(this.agentId, updatedEntry);
    }
    return updatedEntry;
  }
  /**
   * Get history entry by ID
   *
   * @param id - ID of the entry to find
   * @returns The history entry or undefined if not found
   */
  async getEntryById(id) {
    if (!this.agentId) return undefined;
    return this.memoryManager.getHistoryEntryById(this.agentId, id);
  }
  /**
   * Get all history entries
   *
   * @returns Array of history entries
   */
  async getEntries() {
    if (!this.agentId) return [];
    return this.memoryManager.getAllHistoryEntries(this.agentId);
  }
  /**
   * Get the latest history entry
   *
   * @returns The latest history entry or undefined if no entries
   */
  async getLatestEntry() {
    if (!this.agentId) return undefined;
    const entries = await this.getEntries();
    if (entries.length === 0) {
      return undefined;
    }
    // Entries are already sorted by timestamp (newest first)
    return entries[0];
  }
  /**
   * Clear all history entries
   */
  async clear() {
    // Not implemented yet
    // Would need to add a method to MemoryManager to delete all entries for an agent
  }
  /**
   * Update an existing history entry
   *
   * @param id - ID of the entry to update
   * @param updates - Partial entry with fields to update
   * @returns The updated entry or undefined if not found
   */
  async updateEntry(id, updates) {
    if (!this.agentId) return undefined;
    // Update entry in memory storage
    const updatedEntry = await this.memoryManager.updateHistoryEntry(this.agentId, id, updates);
    // Emit update event if agent ID is set
    if (updatedEntry) {
      events_1.AgentEventEmitter.getInstance().emitHistoryUpdate(this.agentId, updatedEntry);
    }
    return updatedEntry;
  }
  /**
   * Get a tracked event by ID
   *
   * @param historyId - ID of the history entry
   * @param eventId - ID of the event or _trackedEventId
   * @returns The tracked event or undefined if not found
   */
  async getTrackedEvent(historyId, eventId) {
    if (!this.agentId) return undefined;
    try {
      const entry = await this.getEntryById(historyId);
      if (!entry || !entry.events) return undefined;
      // First search directly by ID
      let timelineEvent = entry.events.find((event) => event.id === eventId);
      // If not found, search by _trackedEventId
      if (!timelineEvent) {
        timelineEvent = entry.events.find(
          (event) => event.data && event.data._trackedEventId === eventId,
        );
      }
      return timelineEvent;
    } catch (error) {
      console.error(`[HistoryManager] Failed to get tracked event: ${eventId}`, error);
      return undefined;
    }
  }
  /**
   * Update a tracked event by ID
   *
   * @param historyId - ID of the history entry
   * @param eventId - ID of the event or _trackedEventId
   * @param updates - Updates to apply to the event
   * @returns The updated history entry or undefined if not found
   */
  async updateTrackedEvent(historyId, eventId, updates) {
    if (!this.agentId) return undefined;
    try {
      const entry = await this.getEntryById(historyId);
      if (!entry || !entry.events) return undefined;
      // First find the event by ID
      let eventIndex = entry.events.findIndex((event) => event.id === eventId);
      // If not found, search by _trackedEventId
      if (eventIndex === -1) {
        eventIndex = entry.events.findIndex(
          (event) => event.data && event.data._trackedEventId === eventId,
        );
      }
      // If event is not found, show error message and return undefined
      if (eventIndex === -1) {
        console.debug(`[HistoryManager] Tracked event not found: ${eventId}`);
        return undefined;
      }
      // Copy the entry to be updated
      const updatedEntry = { ...entry };
      // Define the events array definitively
      if (!updatedEntry.events) {
        updatedEntry.events = [];
        return undefined;
      }
      const originalEvent = updatedEntry.events[eventIndex];
      // Update the event
      updatedEntry.events[eventIndex] = {
        ...originalEvent,
        updatedAt: new Date(),
        data: {
          ...originalEvent.data,
          ...(updates.data || {}),
        },
      };
      // Save the updated entry to the database
      const result = await this.updateEntry(historyId, {
        events: updatedEntry.events,
        status: updates.status,
      });
      return result;
    } catch (error) {
      console.error(`[HistoryManager] Failed to update tracked event: ${eventId}`, error);
      return undefined;
    }
  }
}
exports.HistoryManager = HistoryManager;
//# sourceMappingURL=index.js.map
