import { EventEmitter } from "events";
import type { AgentStatus } from "../agent/types";
import type { AgentHistoryEntry } from "../agent/history";
import type { TimelineEvent } from "../agent/history";
import { AgentRegistry } from "../server/registry";
import { v4 as uuidv4 } from "uuid";

/**
 * Status change event data
 */
export interface StatusChangeEvent {
  agentId: string;
  historyId?: string;
  previousStatus?: AgentStatus;
  newStatus: AgentStatus;
  timestamp: string;
  metadata?: Record<string, any>;
  source: "agent" | "tool" | "system" | "external";
}

/**
 * Status synchronization options
 */
export interface StatusSyncOptions {
  enableWebSocket?: boolean;
  enableTelemetry?: boolean;
  enableHistory?: boolean;
  enableRealTimeEvents?: boolean;
  batchUpdates?: boolean;
  batchInterval?: number;
}

/**
 * Status update request
 */
export interface StatusUpdateRequest {
  agentId: string;
  historyId?: string;
  status: AgentStatus;
  metadata?: Record<string, any>;
  source?: "agent" | "tool" | "system" | "external";
  eventName?: string;
  eventType?: "memory" | "tool" | "agent" | "retriever";
  additionalData?: Record<string, any>;
}

/**
 * Status synchronization result
 */
export interface StatusSyncResult {
  success: boolean;
  agentId: string;
  historyId?: string;
  status: AgentStatus;
  timestamp: string;
  propagatedTo: string[];
  errors?: Array<{ target: string; error: string }>;
}

/**
 * Unified Status Synchronization Coordinator
 * 
 * This class consolidates all status synchronization logic into a single,
 * cohesive system that eliminates duplication and provides consistent
 * status reporting across all channels.
 */
export class StatusSynchronizationCoordinator extends EventEmitter {
  private static instance: StatusSynchronizationCoordinator | null = null;
  private options: StatusSyncOptions;
  private pendingUpdates: Map<string, StatusUpdateRequest[]> = new Map();
  private batchTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  private constructor(options: StatusSyncOptions = {}) {
    super();
    this.options = {
      enableWebSocket: true,
      enableTelemetry: true,
      enableHistory: true,
      enableRealTimeEvents: true,
      batchUpdates: false,
      batchInterval: 100,
      ...options,
    };
  }

  /**
   * Get the singleton instance of StatusSynchronizationCoordinator
   */
  public static getInstance(options?: StatusSyncOptions): StatusSynchronizationCoordinator {
    if (!StatusSynchronizationCoordinator.instance) {
      StatusSynchronizationCoordinator.instance = new StatusSynchronizationCoordinator(options);
    }
    return StatusSynchronizationCoordinator.instance;
  }

  /**
   * Update agent status with unified synchronization
   * This is the single entry point for all status updates
   */
  public async updateStatus(request: StatusUpdateRequest): Promise<StatusSyncResult> {
    const timestamp = new Date().toISOString();
    const updateId = uuidv4();

    // Validate request
    if (!request.agentId || !request.status) {
      throw new Error("Invalid status update request: agentId and status are required");
    }

    // Get agent to validate it exists
    const agent = AgentRegistry.getInstance().getAgent(request.agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${request.agentId}`);
    }

    // Get current status for comparison
    const currentState = agent.getFullState();
    const previousStatus = currentState.status as AgentStatus;

    // Create status change event
    const statusChangeEvent: StatusChangeEvent = {
      agentId: request.agentId,
      historyId: request.historyId,
      previousStatus,
      newStatus: request.status,
      timestamp,
      metadata: request.metadata,
      source: request.source || "system",
    };

    // Emit pre-update event
    this.emit("statusUpdateStarted", statusChangeEvent);

    const result: StatusSyncResult = {
      success: true,
      agentId: request.agentId,
      historyId: request.historyId,
      status: request.status,
      timestamp,
      propagatedTo: [],
      errors: [],
    };

    try {
      // Handle batching if enabled
      if (this.options.batchUpdates) {
        return await this.handleBatchedUpdate(request, result);
      }

      // Process update immediately
      return await this.processStatusUpdate(request, result, statusChangeEvent);
    } catch (error) {
      result.success = false;
      result.errors = [{ target: "coordinator", error: error instanceof Error ? error.message : String(error) }];
      
      // Emit error event
      this.emit("statusUpdateError", { ...statusChangeEvent, error });
      
      return result;
    }
  }

  /**
   * Handle batched status updates
   */
  private async handleBatchedUpdate(
    request: StatusUpdateRequest,
    result: StatusSyncResult
  ): Promise<StatusSyncResult> {
    const agentId = request.agentId;
    
    // Add to pending updates
    if (!this.pendingUpdates.has(agentId)) {
      this.pendingUpdates.set(agentId, []);
    }
    this.pendingUpdates.get(agentId)!.push(request);

    // Start batch timer if not already running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processBatchedUpdates();
      }, this.options.batchInterval);
    }

    return result;
  }

  /**
   * Process batched updates
   */
  private async processBatchedUpdates(): Promise<void> {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.batchTimer = null;

    try {
      const allUpdates = Array.from(this.pendingUpdates.entries());
      this.pendingUpdates.clear();

      for (const [agentId, updates] of allUpdates) {
        // Process only the latest update for each agent
        const latestUpdate = updates[updates.length - 1];
        
        const result: StatusSyncResult = {
          success: true,
          agentId,
          historyId: latestUpdate.historyId,
          status: latestUpdate.status,
          timestamp: new Date().toISOString(),
          propagatedTo: [],
          errors: [],
        };

        const statusChangeEvent: StatusChangeEvent = {
          agentId,
          historyId: latestUpdate.historyId,
          newStatus: latestUpdate.status,
          timestamp: result.timestamp,
          metadata: latestUpdate.metadata,
          source: latestUpdate.source || "system",
        };

        await this.processStatusUpdate(latestUpdate, result, statusChangeEvent);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process a single status update through all channels
   */
  private async processStatusUpdate(
    request: StatusUpdateRequest,
    result: StatusSyncResult,
    statusChangeEvent: StatusChangeEvent
  ): Promise<StatusSyncResult> {
    const propagationTasks: Array<Promise<void>> = [];

    // 1. Update agent history if enabled and historyId provided
    if (this.options.enableHistory && request.historyId) {
      propagationTasks.push(
        this.updateAgentHistory(request, result).catch((error) => {
          result.errors?.push({ target: "history", error: error.message });
        })
      );
    }

    // 2. Emit real-time events if enabled
    if (this.options.enableRealTimeEvents) {
      propagationTasks.push(
        this.emitRealTimeEvents(request, statusChangeEvent, result).catch((error) => {
          result.errors?.push({ target: "events", error: error.message });
        })
      );
    }

    // 3. Send telemetry updates if enabled
    if (this.options.enableTelemetry) {
      propagationTasks.push(
        this.sendTelemetryUpdate(request, result).catch((error) => {
          result.errors?.push({ target: "telemetry", error: error.message });
        })
      );
    }

    // 4. Broadcast WebSocket updates if enabled
    if (this.options.enableWebSocket) {
      propagationTasks.push(
        this.broadcastWebSocketUpdate(request, statusChangeEvent, result).catch((error) => {
          result.errors?.push({ target: "websocket", error: error.message });
        })
      );
    }

    // Wait for all propagation tasks to complete
    await Promise.allSettled(propagationTasks);

    // Emit completion event
    this.emit("statusUpdateCompleted", { ...statusChangeEvent, result });

    return result;
  }

  /**
   * Update agent history with status change
   */
  private async updateAgentHistory(
    request: StatusUpdateRequest,
    result: StatusSyncResult
  ): Promise<void> {
    const agent = AgentRegistry.getInstance().getAgent(request.agentId);
    if (!agent || !request.historyId) return;

    try {
      const historyManager = agent.getHistoryManager();
      
      // Update history entry status
      await historyManager.updateEntry(request.historyId, { 
        status: request.status 
      });

      // Add timeline event if additional data provided
      if (request.eventName || request.additionalData) {
        const event: TimelineEvent = {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          name: request.eventName || `status_change_${request.status}`,
          data: {
            statusChange: {
              newStatus: request.status,
              source: request.source,
              metadata: request.metadata,
            },
            ...request.additionalData,
          },
          type: request.eventType || "agent",
        };

        await historyManager.addEventToEntry(request.historyId, event);
      }

      result.propagatedTo.push("history");
    } catch (error) {
      throw new Error(`Failed to update agent history: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Emit real-time events through AgentEventEmitter
   */
  private async emitRealTimeEvents(
    request: StatusUpdateRequest,
    statusChangeEvent: StatusChangeEvent,
    result: StatusSyncResult
  ): Promise<void> {
    try {
      // Import AgentEventEmitter dynamically to avoid circular dependencies
      const { AgentEventEmitter } = await import("../events");
      const eventEmitter = AgentEventEmitter.getInstance();

      // Get updated history entry if available
      if (request.historyId) {
        const agent = AgentRegistry.getInstance().getAgent(request.agentId);
        if (agent) {
          const history = await agent.getHistory();
          const historyEntry = history.find(entry => entry.id === request.historyId);
          
          if (historyEntry) {
            eventEmitter.emitHistoryUpdate(request.agentId, historyEntry);
          }
        }
      }

      // Emit custom status change event
      this.emit("statusChanged", statusChangeEvent);

      result.propagatedTo.push("events");
    } catch (error) {
      throw new Error(`Failed to emit real-time events: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Send telemetry update
   */
  private async sendTelemetryUpdate(
    request: StatusUpdateRequest,
    result: StatusSyncResult
  ): Promise<void> {
    try {
      const agent = AgentRegistry.getInstance().getAgent(request.agentId);
      if (!agent || !agent.isTelemetryConfigured()) return;

      // Get telemetry exporter from agent
      const telemetryExporter = agent.getTelemetryExporter();
      if (!telemetryExporter || !request.historyId) return;

      // Update agent history in telemetry system
      await telemetryExporter.updateAgentHistory(request.historyId, {
        status: request.status,
        agent_snapshot: {
          statusChange: {
            timestamp: result.timestamp,
            source: request.source,
            metadata: request.metadata,
          },
        },
      });

      result.propagatedTo.push("telemetry");
    } catch (error) {
      throw new Error(`Failed to send telemetry update: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Broadcast WebSocket update
   */
  private async broadcastWebSocketUpdate(
    request: StatusUpdateRequest,
    statusChangeEvent: StatusChangeEvent,
    result: StatusSyncResult
  ): Promise<void> {
    try {
      // Emit WebSocket-specific event that the WebSocket server can listen to
      this.emit("webSocketStatusUpdate", {
        agentId: request.agentId,
        historyId: request.historyId,
        status: request.status,
        timestamp: result.timestamp,
        metadata: request.metadata,
        statusChangeEvent,
      });

      result.propagatedTo.push("websocket");
    } catch (error) {
      throw new Error(`Failed to broadcast WebSocket update: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get current status for an agent
   */
  public getAgentStatus(agentId: string): AgentStatus | null {
    const agent = AgentRegistry.getInstance().getAgent(agentId);
    if (!agent) return null;
    
    const state = agent.getFullState();
    return state.status as AgentStatus;
  }

  /**
   * Get status history for an agent
   */
  public async getStatusHistory(agentId: string, limit?: number): Promise<StatusChangeEvent[]> {
    const agent = AgentRegistry.getInstance().getAgent(agentId);
    if (!agent) return [];

    try {
      const history = await agent.getHistory();
      const statusEvents: StatusChangeEvent[] = [];

      for (const entry of history.slice(0, limit)) {
        // Extract status change events from timeline
        if (entry.events) {
          for (const event of entry.events) {
            if (event.name.startsWith("status_change_") || event.data?.statusChange) {
              statusEvents.push({
                agentId,
                historyId: entry.id,
                newStatus: entry.status,
                timestamp: event.timestamp,
                metadata: event.data?.statusChange?.metadata,
                source: event.data?.statusChange?.source || "system",
              });
            }
          }
        }
      }

      return statusEvents.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error(`Failed to get status history for agent ${agentId}:`, error);
      return [];
    }
  }

  /**
   * Subscribe to status changes for a specific agent
   */
  public onStatusChange(
    agentId: string,
    callback: (event: StatusChangeEvent) => void
  ): () => void {
    const wrappedCallback = (event: StatusChangeEvent) => {
      if (event.agentId === agentId) {
        callback(event);
      }
    };

    this.on("statusChanged", wrappedCallback);
    return () => this.off("statusChanged", wrappedCallback);
  }

  /**
   * Subscribe to all status changes
   */
  public onAnyStatusChange(callback: (event: StatusChangeEvent) => void): () => void {
    this.on("statusChanged", callback);
    return () => this.off("statusChanged", callback);
  }

  /**
   * Configure synchronization options
   */
  public configure(options: Partial<StatusSyncOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Get current configuration
   */
  public getConfiguration(): StatusSyncOptions {
    return { ...this.options };
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
    this.pendingUpdates.clear();
    this.removeAllListeners();
  }
}

