/**
 * Unified Status Synchronization System
 * 
 * This module consolidates all status synchronization functionality into a single,
 * cohesive system that eliminates duplication and provides consistent status
 * reporting across all channels including:
 * 
 * - Real-time WebSocket updates
 * - Linear integration and status sync
 * - Agent history and timeline events
 * - Telemetry and external reporting
 * - REST API status queries
 * 
 * Key Features:
 * - Zero duplication in sync logic
 * - Consistent status update patterns
 * - Unified status reporting
 * - Pluggable integration system
 * - Real-time broadcasting
 * - Comprehensive error handling
 */

// Core coordinator and types
export { StatusSynchronizationCoordinator } from "./coordinator";
export type {
  StatusChangeEvent,
  StatusSyncOptions,
  StatusUpdateRequest,
  StatusSyncResult,
} from "./coordinator";

// Type definitions
export type {
  StatusSyncChannel,
  StatusUpdateSource,
  StatusSyncPriority,
  StatusSyncMode,
  StatusChangeReason,
  StatusValidationResult,
  StatusSyncMetrics,
  StatusSyncConfig,
  StatusUpdateContext,
  StatusSyncFilter,
  StatusSyncEvent,
  StatusSyncListener,
  StatusSyncQueueItem,
  StatusSyncBatch,
  StatusSyncHealthCheck,
  LinearStatusMapping,
  StatusSubscription,
  StatusSyncPlugin,
  StatusSyncMiddleware,
} from "./types";

export { StatusChangeReason } from "./types";

// Linear integration
export { 
  LinearStatusSyncPlugin,
  createLinearStatusSync,
  DEFAULT_LINEAR_MAPPINGS,
} from "./integrations/linear";
export type { LinearIntegrationConfig } from "./integrations/linear";

// Real-time broadcasting
export { RealTimeStatusBroadcaster } from "./realtime/broadcaster";

// Utility functions and helpers
import { StatusSynchronizationCoordinator } from "./coordinator";
import { RealTimeStatusBroadcaster } from "./realtime/broadcaster";
import type { AgentStatus } from "../agent/types";
import type { StatusUpdateRequest, StatusSyncOptions } from "./coordinator";

/**
 * Global status synchronization instance
 */
let globalStatusSync: StatusSynchronizationCoordinator | null = null;
let globalBroadcaster: RealTimeStatusBroadcaster | null = null;

/**
 * Initialize the unified status synchronization system
 */
export function initializeStatusSync(options?: StatusSyncOptions): StatusSynchronizationCoordinator {
  if (!globalStatusSync) {
    globalStatusSync = StatusSynchronizationCoordinator.getInstance(options);
    globalBroadcaster = new RealTimeStatusBroadcaster();
    
    // Connect coordinator to broadcaster
    globalStatusSync.on("statusChanged", (event) => {
      globalBroadcaster?.broadcastStatusChange(event);
    });
    
    globalStatusSync.on("statusUpdateCompleted", ({ result }) => {
      // Broadcast sync completion events if needed
      console.debug("[StatusSync] Status update completed:", result);
    });
    
    console.log("[StatusSync] Unified status synchronization system initialized");
  }
  
  return globalStatusSync;
}

/**
 * Get the global status synchronization coordinator
 */
export function getStatusSync(): StatusSynchronizationCoordinator {
  if (!globalStatusSync) {
    return initializeStatusSync();
  }
  return globalStatusSync;
}

/**
 * Get the global real-time broadcaster
 */
export function getBroadcaster(): RealTimeStatusBroadcaster {
  if (!globalBroadcaster) {
    initializeStatusSync(); // This will create both
  }
  return globalBroadcaster!;
}

/**
 * Convenience function to update agent status
 */
export async function updateAgentStatus(
  agentId: string,
  status: AgentStatus,
  options?: {
    historyId?: string;
    metadata?: Record<string, any>;
    source?: "agent" | "tool" | "system" | "external";
    eventName?: string;
    eventType?: "memory" | "tool" | "agent" | "retriever";
    additionalData?: Record<string, any>;
  }
) {
  const coordinator = getStatusSync();
  
  const request: StatusUpdateRequest = {
    agentId,
    status,
    historyId: options?.historyId,
    metadata: options?.metadata,
    source: options?.source || "system",
    eventName: options?.eventName,
    eventType: options?.eventType,
    additionalData: options?.additionalData,
  };
  
  return await coordinator.updateStatus(request);
}

/**
 * Subscribe to status changes for a specific agent
 */
export function subscribeToAgentStatus(
  agentId: string,
  callback: (event: any) => void
): () => void {
  const coordinator = getStatusSync();
  return coordinator.onStatusChange(agentId, callback);
}

/**
 * Subscribe to all status changes
 */
export function subscribeToAllStatusChanges(
  callback: (event: any) => void
): () => void {
  const coordinator = getStatusSync();
  return coordinator.onAnyStatusChange(callback);
}

/**
 * Get current status for an agent
 */
export function getAgentStatus(agentId: string): AgentStatus | null {
  const coordinator = getStatusSync();
  return coordinator.getAgentStatus(agentId);
}

/**
 * Get status history for an agent
 */
export async function getAgentStatusHistory(agentId: string, limit?: number) {
  const coordinator = getStatusSync();
  return await coordinator.getStatusHistory(agentId, limit);
}

/**
 * Add WebSocket connection for real-time updates
 */
export function addWebSocketConnection(
  connectionId: string,
  ws: any,
  agentId?: string,
  filter?: any
): void {
  const broadcaster = getBroadcaster();
  broadcaster.addWebSocketConnection(connectionId, ws, agentId, filter);
}

/**
 * Remove WebSocket connection
 */
export function removeWebSocketConnection(connectionId: string): void {
  const broadcaster = getBroadcaster();
  broadcaster.removeConnection(connectionId);
}

/**
 * Get connection statistics
 */
export function getConnectionStats() {
  const broadcaster = getBroadcaster();
  return broadcaster.getConnectionStats();
}

/**
 * Configure status synchronization options
 */
export function configureStatusSync(options: Partial<StatusSyncOptions>): void {
  const coordinator = getStatusSync();
  coordinator.configure(options);
}

/**
 * Cleanup all status synchronization resources
 */
export function cleanupStatusSync(): void {
  if (globalStatusSync) {
    globalStatusSync.cleanup();
    globalStatusSync = null;
  }
  
  if (globalBroadcaster) {
    globalBroadcaster.cleanup();
    globalBroadcaster = null;
  }
  
  console.log("[StatusSync] Cleaned up unified status synchronization system");
}

/**
 * Health check for the status synchronization system
 */
export function getStatusSyncHealth(): {
  coordinator: boolean;
  broadcaster: boolean;
  connections: number;
  lastUpdate?: string;
} {
  return {
    coordinator: globalStatusSync !== null,
    broadcaster: globalBroadcaster !== null,
    connections: globalBroadcaster?.getConnectionStats().totalConnections || 0,
    lastUpdate: new Date().toISOString(),
  };
}

// Re-export commonly used types for convenience
export type { AgentStatus } from "../agent/types";

