import type { MemoryManager } from "../../memory";
import type { BaseMessage, StepWithContent, UsageInfo } from "../providers/base/types";
import type { AgentStatus } from "../types";
/**
 * Step information for history
 */
export interface HistoryStep {
  type: "message" | "tool_call" | "tool_result" | "text";
  name?: string;
  content?: string;
  arguments?: Record<string, any>;
}
/**
 * Timeline event for detailed history
 */
export interface TimelineEvent {
  /**
   * Unique identifier for the event
   */
  id?: string;
  /**
   * Timestamp when the event occurred
   */
  timestamp: Date;
  /**
   * Name of the event (e.g., "generating", "tool_calling", "tool_result", etc.)
   * In the new format, "componentName:operationName" style (e.g.: "memory:getMessages")
   */
  name: string;
  /**
   * ID of the affected Flow node
   * Added with the new format
   */
  affectedNodeId?: string;
  /**
   * Optional additional data specific to the event type
   * In the new format: { status, input, output, updatedAt etc. }
   */
  data?: Record<string, any>;
  /**
   * Optional timestamp for when the event was last updated
   */
  updatedAt?: Date;
  /**
   * Type of the event
   */
  type: "memory" | "tool" | "agent" | "retriever";
}
/**
 * Agent history entry
 */
export interface AgentHistoryEntry {
  /**
   * Unique identifier
   */
  id: string;
  /**
   * Timestamp of the entry
   */
  timestamp: Date;
  /**
   * Original input to the agent
   */
  input: string | Record<string, any> | BaseMessage[];
  /**
   * Final output from the agent
   */
  output: string;
  /**
   * Status of the history entry
   */
  status: AgentStatus;
  /**
   * Steps taken during generation
   */
  steps?: HistoryStep[];
  /**
   * Usage information returned by the LLM
   */
  usage?: UsageInfo;
  /**
   * Timeline events for detailed agent state history
   */
  events?: TimelineEvent[];
  /**
   * Sequence number for the history entry
   */
  _sequenceNumber?: number;
}
/**
 * Manages agent interaction history
 */
export declare class HistoryManager {
  /**
   * Maximum number of history entries to keep
   * Set to 0 for unlimited
   */
  private maxEntries;
  /**
   * Agent ID for emitting events
   */
  private agentId?;
  /**
   * Memory manager for storing history entries
   */
  private memoryManager;
  /**
   * Create a new history manager
   *
   * @param maxEntries - Maximum number of history entries to keep (0 = unlimited)
   * @param agentId - Agent ID for emitting events
   * @param memoryManager - Memory manager instance to use
   */
  constructor(maxEntries: number | undefined, agentId: string, memoryManager: MemoryManager);
  /**
   * Set the agent ID for this history manager
   */
  setAgentId(agentId: string): void;
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
  addEntry(
    input: string | Record<string, any> | BaseMessage[],
    output: string,
    status: AgentStatus,
    steps?: HistoryStep[],
    options?: Partial<
      Omit<AgentHistoryEntry, "id" | "timestamp" | "input" | "output" | "status" | "steps">
    >,
  ): Promise<AgentHistoryEntry>;
  /**
   * Add a timeline event to an existing history entry
   *
   * @param entryId - ID of the entry to update
   * @param event - Timeline event to add
   * @returns The updated entry or undefined if not found
   */
  addEventToEntry(entryId: string, event: TimelineEvent): Promise<AgentHistoryEntry | undefined>;
  /**
   * Add steps to an existing history entry
   *
   * @param entryId - ID of the entry to update
   * @param steps - Steps to add
   * @returns The updated entry or undefined if not found
   */
  addStepsToEntry(
    entryId: string,
    steps: StepWithContent[],
  ): Promise<AgentHistoryEntry | undefined>;
  /**
   * Get history entry by ID
   *
   * @param id - ID of the entry to find
   * @returns The history entry or undefined if not found
   */
  getEntryById(id: string): Promise<AgentHistoryEntry | undefined>;
  /**
   * Get all history entries
   *
   * @returns Array of history entries
   */
  getEntries(): Promise<AgentHistoryEntry[]>;
  /**
   * Get the latest history entry
   *
   * @returns The latest history entry or undefined if no entries
   */
  getLatestEntry(): Promise<AgentHistoryEntry | undefined>;
  /**
   * Clear all history entries
   */
  clear(): Promise<void>;
  /**
   * Update an existing history entry
   *
   * @param id - ID of the entry to update
   * @param updates - Partial entry with fields to update
   * @returns The updated entry or undefined if not found
   */
  updateEntry(
    id: string,
    updates: Partial<Omit<AgentHistoryEntry, "id" | "timestamp">>,
  ): Promise<AgentHistoryEntry | undefined>;
  /**
   * Get a tracked event by ID
   *
   * @param historyId - ID of the history entry
   * @param eventId - ID of the event or _trackedEventId
   * @returns The tracked event or undefined if not found
   */
  getTrackedEvent(historyId: string, eventId: string): Promise<TimelineEvent | undefined>;
  /**
   * Update a tracked event by ID
   *
   * @param historyId - ID of the history entry
   * @param eventId - ID of the event or _trackedEventId
   * @param updates - Updates to apply to the event
   * @returns The updated history entry or undefined if not found
   */
  updateTrackedEvent(
    historyId: string,
    eventId: string,
    updates: {
      status?: AgentStatus;
      data?: Record<string, any>;
    },
  ): Promise<AgentHistoryEntry | undefined>;
}
