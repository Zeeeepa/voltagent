import type { StepWithContent } from "../../agent/providers";
import type { BaseMessage } from "../../agent/providers/base/types";
import type { OperationContext } from "../../agent/types";
import type { Memory, MemoryOptions } from "../types";
/**
 * Manager class to handle all memory-related operations
 */
export declare class MemoryManager {
  /**
   * The memory storage instance
   */
  private memory;
  /**
   * Memory configuration options
   */
  private options;
  /**
   * The ID of the resource (agent) that owns this memory manager
   */
  private resourceId;
  /**
   * Creates a new MemoryManager
   */
  constructor(resourceId: string, memory?: Memory | false, options?: MemoryOptions);
  /**
   * Create a tracked event for a memory operation
   *
   * @param context - Operation context with history entry info
   * @param operationName - Name of the memory operation
   * @param status - Current status of the memory operation
   * @param initialData - Initial data for the event
   * @returns An event updater function
   */
  private createMemoryEvent;
  /**
   * Save a message to memory
   */
  saveMessage(
    context: OperationContext,
    message: BaseMessage,
    userId?: string,
    conversationId?: string,
    type?: "text" | "tool-call" | "tool-result",
  ): Promise<void>;
  /**
   * Get messages from memory
   */
  getMessages(
    context: OperationContext,
    userId?: string,
    conversationId?: string,
    limit?: number,
  ): Promise<BaseMessage[]>;
  /**
   * Create a step finish handler to save messages during generation
   */
  createStepFinishHandler(
    context: OperationContext,
    userId?: string,
    conversationId?: string,
  ): (() => void) | ((step: StepWithContent) => Promise<void>);
  /**
   * Prepare conversation context for message generation
   */
  prepareConversationContext(
    context: OperationContext,
    input: string | BaseMessage[],
    userId?: string,
    conversationIdParam?: string,
    contextLimit?: number,
  ): Promise<{
    messages: BaseMessage[];
    conversationId: string;
  }>;
  /**
   * Get the memory instance
   */
  getMemory(): Memory | undefined;
  /**
   * Get the memory options
   */
  getOptions(): MemoryOptions;
  /**
   * Get memory state for display in UI
   */
  getMemoryState(): Record<string, any>;
  /**
   * Store a history entry in memory storage
   *
   * @param agentId - The ID of the agent
   * @param entry - The history entry to store
   * @returns A promise that resolves when the entry is stored
   */
  storeHistoryEntry(agentId: string, entry: any): Promise<void>;
  /**
   * Get a history entry by ID with related events and steps
   *
   * @param agentId - The ID of the agent
   * @param entryId - The ID of the entry to retrieve
   * @returns A promise that resolves to the entry or undefined
   */
  getHistoryEntryById(agentId: string, entryId: string): Promise<any | undefined>;
  /**
   * Get all history entries for an agent
   *
   * @param agentId - The ID of the agent
   * @returns A promise that resolves to an array of entries
   */
  getAllHistoryEntries(agentId: string): Promise<any[]>;
  /**
   * Update a history entry
   *
   * @param agentId - The ID of the agent
   * @param entryId - The ID of the entry to update
   * @param updates - Partial entry with fields to update
   * @returns A promise that resolves to the updated entry or undefined
   */
  updateHistoryEntry(agentId: string, entryId: string, updates: any): Promise<any | undefined>;
  /**
   * Update an existing event in a history entry
   *
   * @param agentId - The ID of the agent
   * @param entryId - The ID of the history entry
   * @param eventId - The ID of the event to update
   * @param event - Updated event data
   * @returns A promise that resolves when the update is complete
   */
  updateEventInHistoryEntry(
    agentId: string,
    entryId: string,
    eventId: string,
    event: any,
  ): Promise<any | undefined>;
  /**
   * Add steps to a history entry
   *
   * @param agentId - The ID of the agent
   * @param entryId - The ID of the entry to update
   * @param steps - Steps to add
   * @returns A promise that resolves to the updated entry or undefined
   */
  addStepsToHistoryEntry(agentId: string, entryId: string, steps: any[]): Promise<any | undefined>;
  /**
   * Add an event to a history entry
   *
   * @param agentId - The ID of the agent
   * @param entryId - The ID of the entry to update
   * @param event - Timeline event to add
   * @returns A promise that resolves to the updated entry or undefined
   */
  addEventToHistoryEntry(agentId: string, entryId: string, event: any): Promise<any | undefined>;
}
