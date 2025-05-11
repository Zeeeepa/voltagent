/**
 * agent/history/types.ts
 *
 * Types for the agent history system
 */

import { BaseMessage } from "../types";

/**
 * History entry type
 */
export enum HistoryEntryType {
  MESSAGE = "message",
  STATUS = "status",
  USAGE = "usage",
  CUSTOM = "custom",
}

/**
 * History entry interface
 */
export interface HistoryEntry {
  id: string;
  type: HistoryEntryType;
  timestamp: string;
  data: any;
}

/**
 * History options interface
 */
export interface HistoryOptions {
  maxEntries?: number;
}

/**
 * Agent status interface
 */
export interface AgentStatus {
  status: string;
  timestamp: string;
}

/**
 * Usage info interface
 */
export interface UsageInfo {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  timestamp: string;
}
