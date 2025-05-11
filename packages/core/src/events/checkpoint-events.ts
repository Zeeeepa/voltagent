/**
 * checkpoint-events.ts
 * 
 * Events related to checkpointing in the execution environment
 */

import { EventEmitter } from 'events';

/**
 * Event name for when a checkpoint is ready
 */
export const CHECKPOINT_READY_EVENT = 'checkpoint:ready';

/**
 * Checkpoint event data
 */
export interface CheckpointEvent {
  sessionId: string;
  toolExecutionId: string;
  hostCommit: string;
  shadowCommit: string;
  bundle?: string;
}

/**
 * Global event emitter for checkpoint events
 */
export const CheckpointEvents = new EventEmitter();

// Set a higher limit for event listeners to avoid warnings
CheckpointEvents.setMaxListeners(50);

/**
 * Subscribe to a checkpoint event
 * @param eventType Event type to subscribe to
 * @param handler Event handler function
 * @returns Unsubscribe function
 */
export function subscribeToCheckpointEvent(
  eventType: string,
  handler: (data: CheckpointEvent) => void
): () => void {
  CheckpointEvents.on(eventType, handler);
  return () => {
    CheckpointEvents.off(eventType, handler);
  };
}

/**
 * Subscribe to a checkpoint event once
 * @param eventType Event type to subscribe to
 * @param handler Event handler function
 * @returns Unsubscribe function
 */
export function subscribeToCheckpointEventOnce(
  eventType: string,
  handler: (data: CheckpointEvent) => void
): () => void {
  CheckpointEvents.once(eventType, handler);
  return () => {
    CheckpointEvents.off(eventType, handler);
  };
}

