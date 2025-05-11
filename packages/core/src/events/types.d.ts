/**
 * Event statuses
 */
export type EventStatus = "idle" | "working" | "completed" | "error";
/**
 * Standard event data interface
 */
export interface StandardEventData {
  affectedNodeId: string;
  status: EventStatus;
  timestamp: string;
  input?: unknown;
  output?: unknown;
  error?: unknown;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  sourceAgentId?: string;
  userContext?: Record<string, unknown>;
}
/**
 * Standard timeline event
 */
export interface StandardTimelineEvent {
  id: string;
  timestamp: Date;
  name: string;
  data: StandardEventData;
  agentId: string;
  historyId: string;
}
