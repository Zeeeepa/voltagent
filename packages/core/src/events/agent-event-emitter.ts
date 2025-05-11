/**
 * agent-event-emitter.ts
 *
 * Event emitter for agent-specific events
 */

import { EventEmitter } from "node:events";

/**
 * Status of an agent environment
 */
export enum EventStatus {
  INITIALIZING = "initializing",
  READY = "ready",
  ERROR = "error",
  TERMINATED = "terminated",
}

/**
 * Event updater function type
 */
export type EventUpdater = (status: EventStatus, message?: string) => void;

/**
 * Agent event emitter singleton class
 */
export class AgentEventEmitter {
  private static instance: AgentEventEmitter | null = null;
  private emitter: EventEmitter;

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
}
