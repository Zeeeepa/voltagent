import { EventEmitter } from "events";
import type { AgentHistoryEntry } from "../agent/history";
import type { AgentStatus } from "../agent/types";
export type EventStatus = AgentStatus;
export type TimelineEventType = "memory" | "tool" | "agent" | "retriever";
/**
 * Types for tracked event functionality
 */
export type EventUpdater = (updateOptions: {
  status?: AgentStatus;
  data?: Record<string, any>;
}) => Promise<AgentHistoryEntry | undefined>;
export type TrackedEventOptions = {
  agentId: string;
  historyId: string;
  name: string;
  status?: AgentStatus;
  data?: Record<string, any>;
  type: "memory" | "tool" | "agent" | "retriever";
};
export type TrackEventOptions = {
  agentId: string;
  historyId: string;
  name: string;
  initialData?: Record<string, any>;
  initialStatus?: AgentStatus;
  operation: (update: EventUpdater) => Promise<any>;
  type: "memory" | "tool" | "agent" | "retriever";
};
/**
 * Events that can be emitted by agents
 */
export interface AgentEvents {
  /**
   * Emitted when an agent is registered
   */
  agentRegistered: (agentId: string) => void;
  /**
   * Emitted when an agent is unregistered
   */
  agentUnregistered: (agentId: string) => void;
  /**
   * Emitted when an agent's history entry is updated
   */
  historyUpdate: (agentId: string, historyEntry: AgentHistoryEntry) => void;
  /**
   * Emitted when a new history entry is created for an agent
   */
  historyEntryCreated: (agentId: string, historyEntry: AgentHistoryEntry) => void;
}
/**
 * Singleton class for managing agent events
 */
export declare class AgentEventEmitter extends EventEmitter {
  private static instance;
  private trackedEvents;
  private constructor();
  /**
   * Get the singleton instance of AgentEventEmitter
   */
  static getInstance(): AgentEventEmitter;
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
  addHistoryEvent(params: {
    agentId: string;
    historyId: string;
    eventName: string;
    status?: AgentStatus;
    additionalData: Record<string, any>;
    type: "memory" | "tool" | "agent" | "retriever";
  }): Promise<AgentHistoryEntry | undefined>;
  /**
   * Create a tracked event that can be updated over time
   * Returns an updater function that can be called to update the event
   *
   * @param options - Options for creating the tracked event
   * @returns An updater function to update the event
   */
  createTrackedEvent(options: TrackedEventOptions): Promise<EventUpdater>;
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
  updateTrackedEvent(
    agentId: string,
    historyId: string,
    eventId: string,
    status?: AgentStatus,
    additionalData?: Record<string, any>,
  ): Promise<AgentHistoryEntry | undefined>;
  /**
   * Track an operation with automatic start and completion updates
   * This is a higher-level utility that handles the event lifecycle
   *
   * @param options - Options for tracking the event
   * @returns The result of the operation
   */
  trackEvent<T>(options: TrackEventOptions): Promise<T>;
  /**
   * Emit a history update event
   */
  emitHistoryUpdate(agentId: string, historyEntry: AgentHistoryEntry): void;
  /**
   * Emit hierarchical history updates to parent agents
   * This ensures that parent agents are aware of subagent history changes
   */
  emitHierarchicalHistoryUpdate(agentId: string, historyEntry: AgentHistoryEntry): Promise<void>;
  /**
   * Emit a history entry created event
   */
  emitHistoryEntryCreated(agentId: string, historyEntry: AgentHistoryEntry): void;
  /**
   * Emit hierarchical history entry created events to parent agents
   * This ensures that parent agents are aware of new subagent history entries
   */
  emitHierarchicalHistoryEntryCreated(
    _agentId: string,
    _historyEntry: AgentHistoryEntry,
  ): Promise<void>;
  /**
   * Emit an agent registered event
   */
  emitAgentRegistered(agentId: string): void;
  /**
   * Emit an agent unregistered event
   */
  emitAgentUnregistered(agentId: string): void;
  /**
   * Subscribe to history update events
   */
  onHistoryUpdate(callback: (agentId: string, historyEntry: AgentHistoryEntry) => void): () => void;
  /**
   * Subscribe to history entry created events
   */
  onHistoryEntryCreated(
    callback: (agentId: string, historyEntry: AgentHistoryEntry) => void,
  ): () => void;
  /**
   * Subscribe to agent registered events
   */
  onAgentRegistered(callback: (agentId: string) => void): () => void;
  /**
   * Subscribe to agent unregistered events
   */
  onAgentUnregistered(callback: (agentId: string) => void): () => void;
}
