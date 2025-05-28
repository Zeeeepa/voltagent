import { EventEmitter } from "events";
import type { WebSocket } from "ws";
import type { AgentStatus } from "../../agent/types";
import type { 
  StatusChangeEvent, 
  StatusSyncEvent, 
  StatusSubscription,
  StatusSyncFilter 
} from "../types";

/**
 * Real-time connection interface
 */
interface RealTimeConnection {
  id: string;
  type: "websocket" | "sse";
  agentId?: string;
  filter?: StatusSyncFilter;
  connection: WebSocket | Response;
  lastActivity: Date;
  subscriptions: Set<string>;
}

/**
 * Broadcast message types
 */
interface BroadcastMessage {
  type: "status_update" | "status_sync" | "agent_registered" | "agent_unregistered" | "heartbeat";
  timestamp: string;
  data: any;
  agentId?: string;
  sequenceNumber?: number;
}

/**
 * Real-time status broadcaster
 * 
 * Handles real-time broadcasting of status updates via WebSocket and SSE
 * with intelligent filtering and connection management.
 */
export class RealTimeStatusBroadcaster extends EventEmitter {
  private connections: Map<string, RealTimeConnection> = new Map();
  private subscriptions: Map<string, StatusSubscription> = new Map();
  private sequenceNumber = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startHeartbeat();
    this.startCleanup();
  }

  /**
   * Add WebSocket connection
   */
  public addWebSocketConnection(
    connectionId: string,
    ws: WebSocket,
    agentId?: string,
    filter?: StatusSyncFilter
  ): void {
    const connection: RealTimeConnection = {
      id: connectionId,
      type: "websocket",
      agentId,
      filter,
      connection: ws,
      lastActivity: new Date(),
      subscriptions: new Set(),
    };

    this.connections.set(connectionId, connection);

    // Set up WebSocket event handlers
    ws.on("close", () => {
      this.removeConnection(connectionId);
    });

    ws.on("error", (error) => {
      console.error(`[RealTimeBroadcaster] WebSocket error for ${connectionId}:`, error);
      this.removeConnection(connectionId);
    });

    ws.on("message", (message) => {
      this.handleWebSocketMessage(connectionId, message);
    });

    // Send initial connection confirmation
    this.sendToConnection(connectionId, {
      type: "heartbeat",
      timestamp: new Date().toISOString(),
      data: {
        message: "Connected to real-time status updates",
        connectionId,
        agentId,
      },
    });

    console.log(`[RealTimeBroadcaster] Added WebSocket connection: ${connectionId}`);
  }

  /**
   * Add SSE connection
   */
  public addSSEConnection(
    connectionId: string,
    response: Response,
    agentId?: string,
    filter?: StatusSyncFilter
  ): void {
    const connection: RealTimeConnection = {
      id: connectionId,
      type: "sse",
      agentId,
      filter,
      connection: response,
      lastActivity: new Date(),
      subscriptions: new Set(),
    };

    this.connections.set(connectionId, connection);

    // Send initial SSE message
    this.sendToConnection(connectionId, {
      type: "heartbeat",
      timestamp: new Date().toISOString(),
      data: {
        message: "Connected to real-time status updates",
        connectionId,
        agentId,
      },
    });

    console.log(`[RealTimeBroadcaster] Added SSE connection: ${connectionId}`);
  }

  /**
   * Remove connection
   */
  public removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Clean up subscriptions
    for (const subscriptionId of connection.subscriptions) {
      this.subscriptions.delete(subscriptionId);
    }

    this.connections.delete(connectionId);
    console.log(`[RealTimeBroadcaster] Removed connection: ${connectionId}`);
  }

  /**
   * Broadcast status change to all relevant connections
   */
  public broadcastStatusChange(event: StatusChangeEvent): void {
    const message: BroadcastMessage = {
      type: "status_update",
      timestamp: event.timestamp,
      agentId: event.agentId,
      sequenceNumber: ++this.sequenceNumber,
      data: {
        agentId: event.agentId,
        historyId: event.historyId,
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
        source: event.source,
        metadata: event.metadata,
      },
    };

    this.broadcastToFilteredConnections(message, (connection) => {
      return this.shouldReceiveStatusUpdate(connection, event);
    });
  }

  /**
   * Broadcast status sync event
   */
  public broadcastStatusSync(event: StatusSyncEvent): void {
    const message: BroadcastMessage = {
      type: "status_sync",
      timestamp: new Date().toISOString(),
      agentId: event.context.agentId,
      sequenceNumber: ++this.sequenceNumber,
      data: {
        id: event.id,
        type: event.type,
        agentId: event.context.agentId,
        historyId: event.context.historyId,
        previousStatus: event.previousStatus,
        newStatus: event.newStatus,
        channels: event.channels,
        success: event.success,
        errors: event.errors,
        latency: event.latency,
        retryCount: event.retryCount,
      },
    };

    this.broadcastToFilteredConnections(message, (connection) => {
      return this.shouldReceiveStatusSync(connection, event);
    });
  }

  /**
   * Broadcast agent registration
   */
  public broadcastAgentRegistered(agentId: string): void {
    const message: BroadcastMessage = {
      type: "agent_registered",
      timestamp: new Date().toISOString(),
      agentId,
      sequenceNumber: ++this.sequenceNumber,
      data: { agentId },
    };

    this.broadcastToAllConnections(message);
  }

  /**
   * Broadcast agent unregistration
   */
  public broadcastAgentUnregistered(agentId: string): void {
    const message: BroadcastMessage = {
      type: "agent_unregistered",
      timestamp: new Date().toISOString(),
      agentId,
      sequenceNumber: ++this.sequenceNumber,
      data: { agentId },
    };

    this.broadcastToAllConnections(message);
  }

  /**
   * Create subscription for filtered updates
   */
  public createSubscription(
    connectionId: string,
    filter: StatusSyncFilter,
    channels: ("websocket" | "sse" | "webhook")[] = ["websocket"]
  ): string {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: StatusSubscription = {
      id: subscriptionId,
      filter,
      channels,
      active: true,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Add subscription to connection
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.subscriptions.add(subscriptionId);
    }

    return subscriptionId;
  }

  /**
   * Remove subscription
   */
  public removeSubscription(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    this.subscriptions.delete(subscriptionId);

    // Remove from all connections
    for (const connection of this.connections.values()) {
      connection.subscriptions.delete(subscriptionId);
    }
  }

  /**
   * Get connection statistics
   */
  public getConnectionStats(): {
    totalConnections: number;
    webSocketConnections: number;
    sseConnections: number;
    activeSubscriptions: number;
    connectionsByAgent: Record<string, number>;
  } {
    const stats = {
      totalConnections: this.connections.size,
      webSocketConnections: 0,
      sseConnections: 0,
      activeSubscriptions: this.subscriptions.size,
      connectionsByAgent: {} as Record<string, number>,
    };

    for (const connection of this.connections.values()) {
      if (connection.type === "websocket") {
        stats.webSocketConnections++;
      } else {
        stats.sseConnections++;
      }

      if (connection.agentId) {
        stats.connectionsByAgent[connection.agentId] = 
          (stats.connectionsByAgent[connection.agentId] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    // Close all connections
    for (const connection of this.connections.values()) {
      if (connection.type === "websocket") {
        const ws = connection.connection as WebSocket;
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.close();
        }
      }
    }

    this.connections.clear();
    this.subscriptions.clear();

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.removeAllListeners();
  }

  /**
   * Handle WebSocket message
   */
  private handleWebSocketMessage(connectionId: string, message: Buffer): void {
    try {
      const data = JSON.parse(message.toString());
      const connection = this.connections.get(connectionId);
      
      if (!connection) return;

      connection.lastActivity = new Date();

      // Handle different message types
      switch (data.type) {
        case "ping":
          this.sendToConnection(connectionId, {
            type: "heartbeat",
            timestamp: new Date().toISOString(),
            data: { pong: true },
          });
          break;

        case "subscribe":
          if (data.filter) {
            const subscriptionId = this.createSubscription(connectionId, data.filter);
            this.sendToConnection(connectionId, {
              type: "heartbeat",
              timestamp: new Date().toISOString(),
              data: { subscribed: true, subscriptionId },
            });
          }
          break;

        case "unsubscribe":
          if (data.subscriptionId) {
            this.removeSubscription(data.subscriptionId);
            this.sendToConnection(connectionId, {
              type: "heartbeat",
              timestamp: new Date().toISOString(),
              data: { unsubscribed: true, subscriptionId: data.subscriptionId },
            });
          }
          break;
      }
    } catch (error) {
      console.error(`[RealTimeBroadcaster] Failed to handle WebSocket message:`, error);
    }
  }

  /**
   * Send message to specific connection
   */
  private sendToConnection(connectionId: string, message: BroadcastMessage): void {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    try {
      const messageStr = JSON.stringify(message);

      if (connection.type === "websocket") {
        const ws = connection.connection as WebSocket;
        if (ws.readyState === 1) { // WebSocket.OPEN
          ws.send(messageStr);
        }
      } else if (connection.type === "sse") {
        // SSE format
        const sseMessage = `data: ${messageStr}\n\n`;
        // Note: In a real implementation, you'd write to the SSE response stream
        console.log(`[RealTimeBroadcaster] SSE message:`, sseMessage);
      }

      connection.lastActivity = new Date();
    } catch (error) {
      console.error(`[RealTimeBroadcaster] Failed to send message to ${connectionId}:`, error);
      this.removeConnection(connectionId);
    }
  }

  /**
   * Broadcast to all connections
   */
  private broadcastToAllConnections(message: BroadcastMessage): void {
    for (const connectionId of this.connections.keys()) {
      this.sendToConnection(connectionId, message);
    }
  }

  /**
   * Broadcast to filtered connections
   */
  private broadcastToFilteredConnections(
    message: BroadcastMessage,
    filter: (connection: RealTimeConnection) => boolean
  ): void {
    for (const [connectionId, connection] of this.connections) {
      if (filter(connection)) {
        this.sendToConnection(connectionId, message);
      }
    }
  }

  /**
   * Check if connection should receive status update
   */
  private shouldReceiveStatusUpdate(
    connection: RealTimeConnection,
    event: StatusChangeEvent
  ): boolean {
    // Check agent-specific connection
    if (connection.agentId && connection.agentId !== event.agentId) {
      return false;
    }

    // Check connection filter
    if (connection.filter && !this.matchesFilter(connection.filter, event)) {
      return false;
    }

    // Check subscriptions
    for (const subscriptionId of connection.subscriptions) {
      const subscription = this.subscriptions.get(subscriptionId);
      if (subscription?.active && subscription.filter) {
        if (this.matchesFilter(subscription.filter, event)) {
          return true;
        }
      }
    }

    // Default: allow if no specific filters
    return !connection.filter && connection.subscriptions.size === 0;
  }

  /**
   * Check if connection should receive status sync event
   */
  private shouldReceiveStatusSync(
    connection: RealTimeConnection,
    event: StatusSyncEvent
  ): boolean {
    // Similar logic to shouldReceiveStatusUpdate but for sync events
    if (connection.agentId && connection.agentId !== event.context.agentId) {
      return false;
    }

    return true; // For now, broadcast all sync events
  }

  /**
   * Check if event matches filter
   */
  private matchesFilter(filter: StatusSyncFilter, event: StatusChangeEvent): boolean {
    // Check agent IDs
    if (filter.agentIds && !filter.agentIds.includes(event.agentId)) {
      return false;
    }

    // Check statuses
    if (filter.statuses && !filter.statuses.includes(event.newStatus)) {
      return false;
    }

    // Check sources
    if (filter.sources && !filter.sources.includes(event.source)) {
      return false;
    }

    // Check time range
    if (filter.timeRange) {
      const eventTime = new Date(event.timestamp);
      const startTime = new Date(filter.timeRange.start);
      const endTime = new Date(filter.timeRange.end);
      
      if (eventTime < startTime || eventTime > endTime) {
        return false;
      }
    }

    return true;
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const heartbeatMessage: BroadcastMessage = {
        type: "heartbeat",
        timestamp: new Date().toISOString(),
        data: { 
          connections: this.connections.size,
          subscriptions: this.subscriptions.size,
        },
      };

      this.broadcastToAllConnections(heartbeatMessage);
    }, 30000); // 30 seconds
  }

  /**
   * Start cleanup of stale connections
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = new Date();
      const staleThreshold = 5 * 60 * 1000; // 5 minutes

      for (const [connectionId, connection] of this.connections) {
        const timeSinceActivity = now.getTime() - connection.lastActivity.getTime();
        
        if (timeSinceActivity > staleThreshold) {
          console.log(`[RealTimeBroadcaster] Removing stale connection: ${connectionId}`);
          this.removeConnection(connectionId);
        }
      }
    }, 60000); // Check every minute
  }
}

