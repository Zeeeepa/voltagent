/**
 * Unified Event System
 * 
 * Consolidates event handling patterns across the VoltAgent system,
 * providing standardized event emission, propagation, and handling.
 */

import { EventEmitter } from 'events';
import type { AgentStatus, OperationContext } from "../agent/types";
import type { EventStatus, EventUpdater } from "../events";
import { AgentEventEmitter } from "../events";
import { NodeType, createNodeId } from "../utils/node-utils";
import { serializeValueForDebug } from "../utils/serialization";

/**
 * Standard event data structure
 */
export interface StandardEventData {
  /** Unique identifier for the affected node */
  affectedNodeId: string;
  /** Event status */
  status: EventStatus;
  /** Event timestamp */
  timestamp: string;
  /** Source agent ID */
  sourceAgentId: string;
  /** Input data */
  input?: any;
  /** Output data */
  output?: any;
  /** Error information */
  error?: any;
  /** Error message */
  errorMessage?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** User context data */
  userContext?: Record<string, unknown>;
}

/**
 * Event types for the unified system
 */
export type UnifiedEventType = 
  | 'agent:started'
  | 'agent:completed'
  | 'agent:failed'
  | 'agent:cancelled'
  | 'tool:started'
  | 'tool:completed'
  | 'tool:failed'
  | 'operation:started'
  | 'operation:completed'
  | 'operation:failed'
  | 'operation:cancelled'
  | 'system:initialized'
  | 'system:shutdown'
  | 'memory:updated'
  | 'retriever:started'
  | 'retriever:completed'
  | 'retriever:failed';

/**
 * Event payload structure
 */
export interface EventPayload {
  /** Event type */
  type: UnifiedEventType;
  /** Agent ID */
  agentId: string;
  /** History entry ID */
  historyId?: string;
  /** Operation ID */
  operationId?: string;
  /** Event data */
  data: StandardEventData;
  /** Parent agent ID for event propagation */
  parentAgentId?: string;
  /** Parent history entry ID */
  parentHistoryEntryId?: string;
}

/**
 * Event listener function type
 */
export type EventListener = (payload: EventPayload) => void | Promise<void>;

/**
 * Event filter function type
 */
export type EventFilter = (payload: EventPayload) => boolean;

/**
 * Unified Event Manager
 * 
 * Provides centralized event management with:
 * - Standardized event emission
 * - Event propagation to parent agents
 * - Event filtering and routing
 * - Performance monitoring
 * - Error handling and recovery
 */
export class UnifiedEventManager extends EventEmitter {
  private static instance: UnifiedEventManager | null = null;
  
  private agentEventEmitter: AgentEventEmitter;
  private eventFilters: Map<string, EventFilter> = new Map();
  private eventMetrics: Map<UnifiedEventType, number> = new Map();
  private isInitialized = false;

  private constructor() {
    super();
    this.agentEventEmitter = AgentEventEmitter.getInstance();
    this.setMaxListeners(1000); // Increase max listeners for high-throughput scenarios
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): UnifiedEventManager {
    if (!UnifiedEventManager.instance) {
      UnifiedEventManager.instance = new UnifiedEventManager();
    }
    return UnifiedEventManager.instance;
  }

  /**
   * Initialize the event manager
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Set up default event handlers
    this.setupDefaultHandlers();
    
    this.isInitialized = true;
    this.emitSystemEvent('system:initialized', 'system', {});
  }

  /**
   * Shutdown the event manager
   */
  public shutdown(): void {
    if (!this.isInitialized) {
      return;
    }

    this.removeAllListeners();
    this.eventFilters.clear();
    this.eventMetrics.clear();
    
    this.isInitialized = false;
    this.emitSystemEvent('system:shutdown', 'system', {});
  }

  /**
   * Emit a standardized event
   */
  public emitEvent(payload: EventPayload): void {
    // Update metrics
    this.updateEventMetrics(payload.type);

    // Apply filters
    if (!this.passesFilters(payload)) {
      return;
    }

    // Emit to internal listeners
    this.emit(payload.type, payload);
    this.emit('*', payload); // Wildcard listener

    // Emit to legacy agent event emitter for backward compatibility
    this.emitToLegacySystem(payload);

    // Propagate to parent agents if configured
    if (payload.parentAgentId && payload.parentHistoryEntryId) {
      this.propagateToParent(payload);
    }
  }

  /**
   * Emit an agent event
   */
  public emitAgentEvent(
    type: 'started' | 'completed' | 'failed' | 'cancelled',
    agentId: string,
    data: Partial<StandardEventData>,
    context?: OperationContext
  ): void {
    const eventData: StandardEventData = {
      affectedNodeId: createNodeId(NodeType.AGENT, agentId),
      status: type === 'started' ? 'working' : type === 'completed' ? 'completed' : 'error',
      timestamp: new Date().toISOString(),
      sourceAgentId: agentId,
      ...data,
    };

    // Add user context if available
    if (context?.userContext && context.userContext.size > 0) {
      eventData.userContext = this.serializeUserContext(context.userContext);
    }

    this.emitEvent({
      type: `agent:${type}` as UnifiedEventType,
      agentId,
      historyId: context?.historyEntry?.id,
      operationId: context?.operationId,
      data: eventData,
      parentAgentId: context?.parentAgentId,
      parentHistoryEntryId: context?.parentHistoryEntryId,
    });
  }

  /**
   * Emit a tool event
   */
  public emitToolEvent(
    type: 'started' | 'completed' | 'failed',
    agentId: string,
    toolName: string,
    toolCallId: string,
    data: Partial<StandardEventData>,
    context?: OperationContext
  ): void {
    const eventData: StandardEventData = {
      affectedNodeId: createNodeId(NodeType.TOOL, toolName, agentId),
      status: type === 'started' ? 'working' : type === 'completed' ? 'completed' : 'error',
      timestamp: new Date().toISOString(),
      sourceAgentId: agentId,
      metadata: {
        toolName,
        toolCallId,
        ...data.metadata,
      },
      ...data,
    };

    // Add user context if available
    if (context?.userContext && context.userContext.size > 0) {
      eventData.userContext = this.serializeUserContext(context.userContext);
    }

    this.emitEvent({
      type: `tool:${type}` as UnifiedEventType,
      agentId,
      historyId: context?.historyEntry?.id,
      operationId: context?.operationId,
      data: eventData,
      parentAgentId: context?.parentAgentId,
      parentHistoryEntryId: context?.parentHistoryEntryId,
    });
  }

  /**
   * Emit an operation event
   */
  public emitOperationEvent(
    type: 'started' | 'completed' | 'failed' | 'cancelled',
    operationId: string,
    agentId: string,
    data: Partial<StandardEventData>
  ): void {
    const eventData: StandardEventData = {
      affectedNodeId: operationId,
      status: type === 'started' ? 'working' : type === 'completed' ? 'completed' : 'error',
      timestamp: new Date().toISOString(),
      sourceAgentId: agentId,
      ...data,
    };

    this.emitEvent({
      type: `operation:${type}` as UnifiedEventType,
      agentId,
      operationId,
      data: eventData,
    });
  }

  /**
   * Emit a system event
   */
  public emitSystemEvent(
    type: 'initialized' | 'shutdown',
    agentId: string,
    data: Partial<StandardEventData>
  ): void {
    const eventData: StandardEventData = {
      affectedNodeId: createNodeId(NodeType.SYSTEM, 'core'),
      status: 'completed',
      timestamp: new Date().toISOString(),
      sourceAgentId: agentId,
      ...data,
    };

    this.emitEvent({
      type: `system:${type}` as UnifiedEventType,
      agentId,
      data: eventData,
    });
  }

  /**
   * Create a unified event updater
   */
  public createEventUpdater(
    agentId: string,
    historyId: string,
    eventType: UnifiedEventType,
    context?: OperationContext
  ): EventUpdater {
    return async (update: {
      status?: AgentStatus;
      data?: Record<string, unknown>;
    }): Promise<any> => {
      const eventData: StandardEventData = {
        affectedNodeId: createNodeId(NodeType.EVENT, eventType, agentId),
        status: (update.status as EventStatus) || 'working',
        timestamp: new Date().toISOString(),
        sourceAgentId: agentId,
        ...update.data,
      };

      this.emitEvent({
        type: eventType,
        agentId,
        historyId,
        operationId: context?.operationId,
        data: eventData,
        parentAgentId: context?.parentAgentId,
        parentHistoryEntryId: context?.parentHistoryEntryId,
      });

      return context?.historyEntry;
    };
  }

  /**
   * Add an event filter
   */
  public addEventFilter(name: string, filter: EventFilter): void {
    this.eventFilters.set(name, filter);
  }

  /**
   * Remove an event filter
   */
  public removeEventFilter(name: string): boolean {
    return this.eventFilters.delete(name);
  }

  /**
   * Get event metrics
   */
  public getEventMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {};
    for (const [type, count] of this.eventMetrics.entries()) {
      metrics[type] = count;
    }
    return metrics;
  }

  /**
   * Reset event metrics
   */
  public resetEventMetrics(): void {
    this.eventMetrics.clear();
  }

  /**
   * Set up default event handlers
   */
  private setupDefaultHandlers(): void {
    // Log critical events
    this.on('agent:failed', (payload) => {
      console.error(`[UnifiedEventManager] Agent ${payload.agentId} failed:`, payload.data.error);
    });

    this.on('tool:failed', (payload) => {
      console.error(`[UnifiedEventManager] Tool failed in agent ${payload.agentId}:`, payload.data.error);
    });

    this.on('operation:failed', (payload) => {
      console.error(`[UnifiedEventManager] Operation ${payload.operationId} failed:`, payload.data.error);
    });
  }

  /**
   * Update event metrics
   */
  private updateEventMetrics(type: UnifiedEventType): void {
    const current = this.eventMetrics.get(type) || 0;
    this.eventMetrics.set(type, current + 1);
  }

  /**
   * Check if event passes all filters
   */
  private passesFilters(payload: EventPayload): boolean {
    for (const filter of this.eventFilters.values()) {
      if (!filter(payload)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Emit to legacy agent event emitter for backward compatibility
   */
  private emitToLegacySystem(payload: EventPayload): void {
    if (!payload.historyId) {
      return;
    }

    // Convert unified event to legacy format
    const legacyEventName = payload.type.replace(':', '_');
    
    this.agentEventEmitter.addHistoryEvent({
      agentId: payload.agentId,
      historyId: payload.historyId,
      eventName: legacyEventName,
      status: payload.data.status as any,
      additionalData: payload.data,
      type: this.getLegacyEventType(payload.type),
    });
  }

  /**
   * Get legacy event type for backward compatibility
   */
  private getLegacyEventType(unifiedType: UnifiedEventType): string {
    if (unifiedType.startsWith('agent:')) return 'agent';
    if (unifiedType.startsWith('tool:')) return 'tool';
    if (unifiedType.startsWith('operation:')) return 'agent';
    if (unifiedType.startsWith('system:')) return 'agent';
    if (unifiedType.startsWith('memory:')) return 'memory';
    if (unifiedType.startsWith('retriever:')) return 'retriever';
    return 'agent';
  }

  /**
   * Propagate event to parent agent
   */
  private propagateToParent(payload: EventPayload): void {
    if (!payload.parentAgentId || !payload.parentHistoryEntryId) {
      return;
    }

    const parentPayload: EventPayload = {
      ...payload,
      agentId: payload.parentAgentId,
      historyId: payload.parentHistoryEntryId,
      data: {
        ...payload.data,
        sourceAgentId: payload.agentId, // Keep original source
      },
    };

    // Emit to parent without further propagation to avoid infinite loops
    this.emit(parentPayload.type, parentPayload);
  }

  /**
   * Serialize user context for event data
   */
  private serializeUserContext(userContext: Map<string | symbol, unknown>): Record<string, unknown> {
    const serialized: Record<string, unknown> = {};
    
    try {
      for (const [key, value] of userContext.entries()) {
        const stringKey = typeof key === 'symbol' ? key.toString() : String(key);
        serialized[stringKey] = serializeValueForDebug(value);
      }
    } catch (error) {
      console.warn('[UnifiedEventManager] Failed to serialize user context:', error);
      return { serialization_error: true };
    }
    
    return serialized;
  }
}

/**
 * Factory function to get the unified event manager
 */
export function getUnifiedEventManager(): UnifiedEventManager {
  return UnifiedEventManager.getInstance();
}

/**
 * Factory function to create an event updater
 */
export function createUnifiedEventUpdater(
  agentId: string,
  historyId: string,
  eventType: UnifiedEventType,
  context?: OperationContext
): EventUpdater {
  const manager = UnifiedEventManager.getInstance();
  return manager.createEventUpdater(agentId, historyId, eventType, context);
}

// Export types
export type { 
  StandardEventData, 
  UnifiedEventType, 
  EventPayload, 
  EventListener, 
  EventFilter 
};

