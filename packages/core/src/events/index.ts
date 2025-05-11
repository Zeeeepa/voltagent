/**
 * events/index.ts
 *
 * Event system for the voltagent framework
 */

import { EventEmitter } from "node:events";
import { AgentEventEmitter, EventStatus, EventUpdater } from "./agent-event-emitter";

// Export the AgentEventEmitter class and related types
export { AgentEventEmitter, EventStatus, EventUpdater };

/**
 * Event types for the agent system
 */
export enum AgentEventType {
  ENVIRONMENT_STATUS_CHANGED = "environment:status",
  CHECKPOINT_READY = "checkpoint:ready",
  TOOL_EXECUTION_START = "tool:execution:start",
  TOOL_EXECUTION_END = "tool:execution:end",
  AGENT_STATE_CHANGED = "agent:state:changed",
  AGENT_MESSAGE = "agent:message",
  MCP_REQUEST = "mcp:request",
  MCP_RESPONSE = "mcp:response",
}

/**
 * Global event emitter for the agent system
 */
export const AgentEvents = new EventEmitter();

// Set a higher limit for event listeners to avoid warnings
AgentEvents.setMaxListeners(50);

/**
 * Subscribe to an agent event
 * @param eventType Event type to subscribe to
 * @param handler Event handler function
 * @returns Unsubscribe function
 */
export function subscribeToEvent<T>(
  eventType: AgentEventType,
  handler: (data: T) => void,
): () => void {
  AgentEvents.on(eventType, handler);
  return () => {
    AgentEvents.off(eventType, handler);
  };
}

/**
 * Subscribe to an agent event once
 * @param eventType Event type to subscribe to
 * @param handler Event handler function
 * @returns Unsubscribe function
 */
export function subscribeToEventOnce<T>(
  eventType: AgentEventType,
  handler: (data: T) => void,
): () => void {
  AgentEvents.once(eventType, handler);
  return () => {
    AgentEvents.off(eventType, handler);
  };
}

/**
 * Emit an agent event
 * @param eventType Event type to emit
 * @param data Event data
 */
export function emitEvent<T>(eventType: AgentEventType, data: T): void {
  AgentEvents.emit(eventType, data);
}
