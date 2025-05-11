"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentEventEmitter = void 0;
const events_1 = require("events");
const uuid_1 = require("uuid");
const registry_1 = require("../server/registry");
/**
 * Singleton class for managing agent events
 */
class AgentEventEmitter extends events_1.EventEmitter {
  constructor() {
    super();
    this.trackedEvents = new Map();
  }
  /**
   * Get the singleton instance of AgentEventEmitter
   */
  static getInstance() {
    if (!AgentEventEmitter.instance) {
      AgentEventEmitter.instance = new AgentEventEmitter();
    }
    return AgentEventEmitter.instance;
  }
  /**
   * Add a timeline event to an agent's history entry
   * This is the central method for adding events to history
   *
   * @param agentId - Agent ID
   * @param historyId - History entry ID
   * @param eventName - Name of the event
   * @param status - Updated agent status (optional)
   * @param additionalData - Additional data to include in the event
   * @returns Updated history entry or undefined if not found
   */
  async addHistoryEvent(params) {
    // For backward compatibility: use name if eventName is not provided
    const { agentId, historyId, status, additionalData, type, eventName } = params;
    // Get agent from registry
    const agent = registry_1.AgentRegistry.getInstance().getAgent(agentId);
    if (!agent) {
      console.debug(`[AgentEventEmitter] Agent not found: ${agentId}`);
      return undefined;
    }
    // Get history entry from agent
    const historyEntry = (await agent.getHistory()).find((entry) => entry.id === historyId);
    if (!historyEntry) {
      console.debug(`[AgentEventEmitter] History entry not found: ${historyId}`);
      return undefined;
    }
    // Create timeline event
    const event = {
      id: (0, uuid_1.v4)(), // Add unique ID for the event
      timestamp: new Date(),
      name: eventName,
      data: additionalData,
      type,
    };
    // Update status if provided
    const updatedEntry = { ...historyEntry };
    if (status) {
      updatedEntry.status = status;
    }
    // Add event to history entry
    if (!updatedEntry.events) {
      updatedEntry.events = [];
    }
    updatedEntry.events.push(event);
    try {
      // Use the new method to access historyManager from agent
      const historyManager = agent.getHistoryManager();
      // Directly save the event to the database
      await historyManager.addEventToEntry(historyEntry.id, event);
      // If the status has changed, update the history entry too
      if (status) {
        await historyManager.updateEntry(historyEntry.id, { status });
      }
    } catch (error) {
      console.error(`[AgentEventEmitter] Failed to persist event:`, error);
    }
    // Emit history update event
    this.emitHistoryUpdate(agentId, updatedEntry);
    return updatedEntry;
  }
  /**
   * Create a tracked event that can be updated over time
   * Returns an updater function that can be called to update the event
   *
   * @param options - Options for creating the tracked event
   * @returns An updater function to update the event
   */
  async createTrackedEvent(options) {
    const { agentId, historyId, name, status, data = {}, type } = options;
    // Generate a unique ID for this tracked event
    const eventId = (0, uuid_1.v4)();
    // Create initial event
    const historyEntry = await this.addHistoryEvent({
      agentId,
      historyId,
      eventName: name,
      status,
      additionalData: {
        ...data,
        _trackedEventId: eventId,
      },
      type,
    });
    if (!historyEntry) {
      console.debug(`[AgentEventEmitter] Failed to create tracked event: ${name}`);
      return () => Promise.resolve(undefined);
    }
    // Store the timeline event reference
    const events = historyEntry.events || [];
    const timelineEvent = events[events.length - 1];
    this.trackedEvents.set(eventId, timelineEvent);
    // Return the updater function
    return async (updateOptions) => {
      return await this.updateTrackedEvent(agentId, historyId, eventId, updateOptions.status, {
        ...updateOptions.data,
      });
    };
  }
  /**
   * Update a tracked event by its ID
   *
   * @param agentId - Agent ID
   * @param historyId - History entry ID
   * @param eventId - Tracked event ID
   * @param status - Updated agent status (optional)
   * @param additionalData - Additional data to include in the event
   * @returns Updated history entry or undefined if not found
   */
  async updateTrackedEvent(agentId, historyId, eventId, status, additionalData = {}) {
    // Get agent from registry
    const agent = registry_1.AgentRegistry.getInstance().getAgent(agentId);
    if (!agent) {
      console.debug(`[AgentEventEmitter] Agent not found: ${agentId}`);
      return undefined;
    }
    try {
      // Use the new method to access historyManager from agent
      const historyManager = agent.getHistoryManager();
      // Use the new updateTrackedEvent method of HistoryManager
      const updatedEntry = await historyManager.updateTrackedEvent(historyId, eventId, {
        status,
        data: additionalData,
      });
      if (!updatedEntry) {
        console.debug(`[AgentEventEmitter] Failed to update tracked event: ${eventId}`);
        return undefined;
      }
      // Tracked event update is complete, no need to track anymore
      // Remove from the Map to prevent memory leaks
      this.trackedEvents.delete(eventId);
      // Log the removal for debugging purposes
      return updatedEntry;
    } catch (_error) {
      // Tracked event update failed, but still remove from the Map to prevent memory leaks
      // We shouldn't continue tracking even if it failed
      this.trackedEvents.delete(eventId);
      return undefined;
    }
  }
  /**
   * Track an operation with automatic start and completion updates
   * This is a higher-level utility that handles the event lifecycle
   *
   * @param options - Options for tracking the event
   * @returns The result of the operation
   */
  async trackEvent(options) {
    const { agentId, historyId, name, initialData = {}, initialStatus, operation, type } = options;
    // Create the initial tracked event
    const eventUpdater = await this.createTrackedEvent({
      agentId,
      historyId,
      name,
      status: initialStatus,
      data: {
        ...initialData,
      },
      type,
    });
    try {
      // Execute the operation with the updater
      const result = await operation(eventUpdater);
      // Final update with completed status and result
      eventUpdater({
        data: {
          ...result,
        },
      });
      return result;
    } catch (error) {
      // Update with error status
      eventUpdater({
        data: {
          error,
        },
      });
      throw error;
    }
  }
  /**
   * Emit a history update event
   */
  emitHistoryUpdate(agentId, historyEntry) {
    // Add a sequence number based on timestamp to ensure correct ordering
    const updatedHistoryEntry = {
      ...historyEntry,
      _sequenceNumber: Date.now(),
    };
    this.emit("historyUpdate", agentId, updatedHistoryEntry);
    // After emitting the direct update, propagate to parent agents
    // this.emitHierarchicalHistoryUpdate(agentId, updatedHistoryEntry);
  }
  /**
   * Emit hierarchical history updates to parent agents
   * This ensures that parent agents are aware of subagent history changes
   */
  async emitHierarchicalHistoryUpdate(agentId, historyEntry) {
    // Get parent agent IDs for this agent
    const parentIds = registry_1.AgentRegistry.getInstance().getParentAgentIds(agentId);
    // Propagate history update to each parent agent
    parentIds.forEach(async (parentId) => {
      const parentAgent = registry_1.AgentRegistry.getInstance().getAgent(parentId);
      if (parentAgent) {
        // Find active history entry for the parent
        const parentHistory = await parentAgent.getHistory();
        const activeParentHistoryEntry =
          parentHistory.length > 0 ? parentHistory[parentHistory.length - 1] : undefined;
        if (activeParentHistoryEntry) {
          // Create a special timeline event in parent's history about subagent update
          this.addHistoryEvent({
            agentId: parentId,
            historyId: activeParentHistoryEntry.id,
            eventName: `subagent:${agentId}`,
            status: undefined, // Don't change parent status
            additionalData: {
              subagentId: agentId,
              data: historyEntry,
              affectedNodeId: `agent_${agentId}`,
            },
            type: "agent",
          });
        }
      }
    });
  }
  /**
   * Emit a history entry created event
   */
  emitHistoryEntryCreated(agentId, historyEntry) {
    this.emit("historyEntryCreated", agentId, historyEntry);
    // After emitting the direct creation, propagate to parent agents
    this.emitHierarchicalHistoryEntryCreated(agentId, historyEntry);
  }
  /**
   * Emit hierarchical history entry created events to parent agents
   * This ensures that parent agents are aware of new subagent history entries
   */
  async emitHierarchicalHistoryEntryCreated(_agentId, _historyEntry) {
    return Promise.resolve();
    // Get parent agent IDs for this agent
    /*    const parentIds = AgentRegistry.getInstance().getParentAgentIds(agentId);
    
        // Propagate history creation to each parent agent
        parentIds.forEach(async (parentId) => {
          const parentAgent = AgentRegistry.getInstance().getAgent(parentId);
          if (parentAgent) {
            // Find active history entry for the parent
            const parentHistory = await parentAgent.getHistory();
            const activeParentHistoryEntry =
              parentHistory.length > 0 ? parentHistory[parentHistory.length - 1] : undefined;
    
            if (activeParentHistoryEntry) {
              // Create a special timeline event in parent's history about subagent history creation
              this.addHistoryEvent({
                agentId: parentId,
                historyId: activeParentHistoryEntry.id,
                eventName: `subagent:${agentId}`,
                status: undefined, // Don't change parent status
                additionalData: {
                  subagentId: agentId,
                  data: historyEntry,
                  affectedNodeId: `subagent_${agentId}`,
                },
                type: "agent",
              });
            }
          }
        }); */
  }
  /**
   * Emit an agent registered event
   */
  emitAgentRegistered(agentId) {
    this.emit("agentRegistered", agentId);
  }
  /**
   * Emit an agent unregistered event
   */
  emitAgentUnregistered(agentId) {
    this.emit("agentUnregistered", agentId);
  }
  /**
   * Subscribe to history update events
   */
  onHistoryUpdate(callback) {
    this.on("historyUpdate", callback);
    return () => this.off("historyUpdate", callback);
  }
  /**
   * Subscribe to history entry created events
   */
  onHistoryEntryCreated(callback) {
    this.on("historyEntryCreated", callback);
    return () => this.off("historyEntryCreated", callback);
  }
  /**
   * Subscribe to agent registered events
   */
  onAgentRegistered(callback) {
    this.on("agentRegistered", callback);
    return () => this.off("agentRegistered", callback);
  }
  /**
   * Subscribe to agent unregistered events
   */
  onAgentUnregistered(callback) {
    this.on("agentUnregistered", callback);
    return () => this.off("agentUnregistered", callback);
  }
}
exports.AgentEventEmitter = AgentEventEmitter;
AgentEventEmitter.instance = null;
//# sourceMappingURL=index.js.map
