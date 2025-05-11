/**
 * agent-event-emitter.ts
 *
 * Event emitter for agent-specific events
 */

import { EventEmitter } from "node:events";
import { BaseMessage } from "../agent/types";

/**
 * Status of an agent environment
 */
export enum EventStatus {
  INITIALIZING = "initializing",
  READY = "ready",
  ERROR = "error",
  TERMINATED = "terminated",
  WORKING = "working",
  COMPLETED = "completed",
}

/**
 * Event updater function type
 */
export type EventUpdater = (status: EventStatus, message?: string) => void;

/**
 * Event data interface
 */
export interface EventData {
  status: EventStatus;
  updatedAt: string;
  error?: string;
  errorMessage?: string;
  output?: {
    success?: boolean;
    messages?: BaseMessage[];
  };
}

/**
 * Agent event emitter singleton class
 */
export class AgentEventEmitter {
  private static instance: AgentEventEmitter | null = null;
  private emitter: EventEmitter;
  private events: Map<string, EventData> = new Map();

  private constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(50);
  }

  /**
   * Get the singleton instance of AgentEventEmitter
   */
  public static getInstance(): AgentEventEmitter {
    if (!AgentEventEmitter.instance) {
      AgentEventEmitter.instance = new AgentEventEmitter();
    }
    return AgentEventEmitter.instance;
  }

  /**
   * Create a tracked event
   * @param eventId ID of the event
   * @param initialStatus Initial status of the event
   * @returns Event updater function
   */
  public createTrackedEvent(eventId: string, initialStatus: EventStatus): EventUpdater {
    const eventData: EventData = {
      status: initialStatus,
      updatedAt: new Date().toISOString(),
    };

    this.events.set(eventId, eventData);
    this.emitter.emit(`event:${eventId}:created`, eventData);

    return (status: EventStatus, message?: string) => {
      const event = this.events.get(eventId);
      if (event) {
        event.status = status;
        event.updatedAt = new Date().toISOString();

        if (message) {
          if (status === EventStatus.ERROR) {
            event.error = "error";
            event.errorMessage = message;
            event.output = { success: false };
          } else {
            event.output = {
              success: true,
              messages: [{ content: message, role: "assistant" }] as BaseMessage[],
            };
          }
        }

        this.events.set(eventId, event);
        this.emitter.emit(`event:${eventId}:updated`, event);
      }
    };
  }

  /**
   * Add a history event
   * @param agentId ID of the agent
   * @param eventData Event data
   */
  public addHistoryEvent(agentId: string, eventData: any): void {
    this.emitter.emit(`agent:${agentId}:history`, eventData);
  }

  /**
   * Emit agent registered event
   * @param agentId ID of the registered agent
   */
  public emitAgentRegistered(agentId: string): void {
    this.emitter.emit("agent:registered", agentId);
  }

  /**
   * Emit agent unregistered event
   * @param agentId ID of the unregistered agent
   */
  public emitAgentUnregistered(agentId: string): void {
    this.emitter.emit("agent:unregistered", agentId);
  }

  /**
   * Subscribe to agent registered events
   * @param handler Event handler function
   * @returns Unsubscribe function
   */
  public onAgentRegistered(handler: (agentId: string) => void): () => void {
    this.emitter.on("agent:registered", handler);
    return () => {
      this.emitter.off("agent:registered", handler);
    };
  }

  /**
   * Subscribe to agent unregistered events
   * @param handler Event handler function
   * @returns Unsubscribe function
   */
  public onAgentUnregistered(handler: (agentId: string) => void): () => void {
    this.emitter.on("agent:unregistered", handler);
    return () => {
      this.emitter.off("agent:unregistered", handler);
    };
  }

  /**
   * Subscribe to agent history events
   * @param agentId ID of the agent
   * @param handler Event handler function
   * @returns Unsubscribe function
   */
  public onAgentHistory(agentId: string, handler: (eventData: any) => void): () => void {
    const eventName = `agent:${agentId}:history`;
    this.emitter.on(eventName, handler);
    return () => {
      this.emitter.off(eventName, handler);
    };
  }

  /**
   * Subscribe to event created events
   * @param eventId ID of the event
   * @param handler Event handler function
   * @returns Unsubscribe function
   */
  public onEventCreated(eventId: string, handler: (eventData: EventData) => void): () => void {
    const eventName = `event:${eventId}:created`;
    this.emitter.on(eventName, handler);
    return () => {
      this.emitter.off(eventName, handler);
    };
  }

  /**
   * Subscribe to event updated events
   * @param eventId ID of the event
   * @param handler Event handler function
   * @returns Unsubscribe function
   */
  public onEventUpdated(eventId: string, handler: (eventData: EventData) => void): () => void {
    const eventName = `event:${eventId}:updated`;
    this.emitter.on(eventName, handler);
    return () => {
      this.emitter.off(eventName, handler);
    };
  }
}
