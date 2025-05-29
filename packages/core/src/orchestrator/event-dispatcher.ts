import { EventEmitter } from "events";
import type {
  OrchestratorEvent,
  EventRoutingRule,
  EventHandler,
  ComponentStatus,
  ComponentHealth,
  OrchestratorComponent,
} from "./types";

/**
 * Event Dispatcher - Routes events between all system components
 * Implements event filtering, prioritization, correlation, and replay capabilities
 */
export class EventDispatcher implements OrchestratorComponent {
  public readonly id: string;
  public readonly name: string = "EventDispatcher";
  private _status: ComponentStatus = "idle";
  private eventEmitter: EventEmitter;
  private routingRules: Map<string, EventRoutingRule> = new Map();
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private eventHistory: OrchestratorEvent[] = [];
  private correlationMap: Map<string, string[]> = new Map();
  private startTime: Date = new Date();
  private errorCount: number = 0;
  private lastError?: Error;
  private processedEvents: number = 0;
  private readonly maxHistorySize: number;
  private readonly enableReplay: boolean;

  constructor(options: {
    id?: string;
    maxHistorySize?: number;
    enableReplay?: boolean;
    maxListeners?: number;
  } = {}) {
    this.id = options.id || `event-dispatcher-${Date.now()}`;
    this.maxHistorySize = options.maxHistorySize || 10000;
    this.enableReplay = options.enableReplay ?? true;
    this.eventEmitter = new EventEmitter();
    this.eventEmitter.setMaxListeners(options.maxListeners || 100);
  }

  public get status(): ComponentStatus {
    return this._status;
  }

  /**
   * Start the event dispatcher
   */
  public async start(): Promise<void> {
    if (this._status === "running") {
      return;
    }

    this._status = "starting";
    
    try {
      // Initialize default routing rules
      this.initializeDefaultRules();
      
      // Set up error handling
      this.eventEmitter.on("error", (error) => {
        this.handleError(error);
      });

      this._status = "running";
      this.startTime = new Date();
      
      this.emit("dispatcher.started", {
        id: this.generateEventId(),
        type: "dispatcher.started",
        source: this.id,
        timestamp: new Date(),
        version: 1,
        data: { dispatcherId: this.id },
      });
    } catch (error) {
      this._status = "error";
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Stop the event dispatcher
   */
  public async stop(): Promise<void> {
    if (this._status === "stopped") {
      return;
    }

    this._status = "stopping";
    
    try {
      // Clear all listeners
      this.eventEmitter.removeAllListeners();
      
      // Clear internal state
      this.eventHandlers.clear();
      this.correlationMap.clear();
      
      if (!this.enableReplay) {
        this.eventHistory = [];
      }

      this._status = "stopped";
    } catch (error) {
      this._status = "error";
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Restart the event dispatcher
   */
  public async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  /**
   * Get component health information
   */
  public getHealth(): ComponentHealth {
    return {
      id: this.id,
      name: this.name,
      status: this._status,
      lastHeartbeat: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      errorCount: this.errorCount,
      lastError: this.lastError,
      metadata: {
        processedEvents: this.processedEvents,
        activeHandlers: this.eventHandlers.size,
        routingRules: this.routingRules.size,
        historySize: this.eventHistory.length,
        correlations: this.correlationMap.size,
      },
    };
  }

  /**
   * Get component metrics
   */
  public getMetrics(): Record<string, unknown> {
    return {
      processedEvents: this.processedEvents,
      activeHandlers: this.eventHandlers.size,
      routingRules: this.routingRules.size,
      historySize: this.eventHistory.length,
      correlations: this.correlationMap.size,
      uptime: Date.now() - this.startTime.getTime(),
      errorRate: this.errorCount / Math.max(this.processedEvents, 1),
    };
  }

  /**
   * Emit an event through the dispatcher
   */
  public emit(eventType: string, event: Omit<OrchestratorEvent, "id" | "timestamp"> | OrchestratorEvent): void {
    if (this._status !== "running") {
      console.warn(`EventDispatcher: Cannot emit event ${eventType} - dispatcher not running`);
      return;
    }

    try {
      const fullEvent: OrchestratorEvent = {
        id: event.id || this.generateEventId(),
        timestamp: event.timestamp || new Date(),
        ...event,
        type: eventType,
      };

      // Store in history if replay is enabled
      if (this.enableReplay) {
        this.addToHistory(fullEvent);
      }

      // Apply routing rules
      const routedEvents = this.applyRoutingRules(fullEvent);

      // Emit each routed event
      for (const routedEvent of routedEvents) {
        this.processEvent(routedEvent);
      }

      this.processedEvents++;
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Subscribe to events with optional filtering
   */
  public on(eventType: string, handler: EventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, new Set());
    }
    this.eventHandlers.get(eventType)!.add(handler);
    this.eventEmitter.on(eventType, handler);
  }

  /**
   * Unsubscribe from events
   */
  public off(eventType: string, handler: EventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(eventType);
      }
    }
    this.eventEmitter.off(eventType, handler);
  }

  /**
   * Subscribe to events once
   */
  public once(eventType: string, handler: EventHandler): void {
    this.eventEmitter.once(eventType, handler);
  }

  /**
   * Add routing rule for event processing
   */
  public addRoutingRule(rule: EventRoutingRule): void {
    this.routingRules.set(rule.id, rule);
  }

  /**
   * Remove routing rule
   */
  public removeRoutingRule(ruleId: string): void {
    this.routingRules.delete(ruleId);
  }

  /**
   * Get all routing rules
   */
  public getRoutingRules(): EventRoutingRule[] {
    return Array.from(this.routingRules.values());
  }

  /**
   * Correlate events by correlation ID
   */
  public correlateEvents(correlationId: string, eventId: string): void {
    if (!this.correlationMap.has(correlationId)) {
      this.correlationMap.set(correlationId, []);
    }
    this.correlationMap.get(correlationId)!.push(eventId);
  }

  /**
   * Get correlated events
   */
  public getCorrelatedEvents(correlationId: string): OrchestratorEvent[] {
    const eventIds = this.correlationMap.get(correlationId) || [];
    return this.eventHistory.filter(event => eventIds.includes(event.id));
  }

  /**
   * Replay events from history
   */
  public replayEvents(filter?: {
    fromTime?: Date;
    toTime?: Date;
    eventTypes?: string[];
    source?: string;
    correlationId?: string;
  }): void {
    if (!this.enableReplay) {
      throw new Error("Event replay is disabled");
    }

    let eventsToReplay = this.eventHistory;

    if (filter) {
      eventsToReplay = eventsToReplay.filter(event => {
        if (filter.fromTime && event.timestamp < filter.fromTime) return false;
        if (filter.toTime && event.timestamp > filter.toTime) return false;
        if (filter.eventTypes && !filter.eventTypes.includes(event.type)) return false;
        if (filter.source && event.source !== filter.source) return false;
        if (filter.correlationId && event.correlationId !== filter.correlationId) return false;
        return true;
      });
    }

    // Replay events in chronological order
    eventsToReplay
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      .forEach(event => {
        this.processEvent({ ...event, id: this.generateEventId() }); // New ID for replay
      });
  }

  /**
   * Get event history
   */
  public getEventHistory(filter?: {
    limit?: number;
    offset?: number;
    eventTypes?: string[];
    source?: string;
  }): OrchestratorEvent[] {
    let history = this.eventHistory;

    if (filter) {
      if (filter.eventTypes) {
        history = history.filter(event => filter.eventTypes!.includes(event.type));
      }
      if (filter.source) {
        history = history.filter(event => event.source === filter.source);
      }
      if (filter.offset) {
        history = history.slice(filter.offset);
      }
      if (filter.limit) {
        history = history.slice(0, filter.limit);
      }
    }

    return history;
  }

  /**
   * Clear event history
   */
  public clearHistory(): void {
    this.eventHistory = [];
    this.correlationMap.clear();
  }

  /**
   * Initialize default routing rules
   */
  private initializeDefaultRules(): void {
    // Rule for error events - high priority
    this.addRoutingRule({
      id: "error-events",
      name: "Error Event Routing",
      eventType: "*.error",
      priority: 100,
      enabled: true,
      condition: (event) => event.type.endsWith(".error") || event.status === "error",
    });

    // Rule for system events
    this.addRoutingRule({
      id: "system-events",
      name: "System Event Routing",
      eventType: "system.*",
      priority: 90,
      enabled: true,
      condition: (event) => event.type.startsWith("system."),
    });

    // Rule for workflow events
    this.addRoutingRule({
      id: "workflow-events",
      name: "Workflow Event Routing",
      eventType: "workflow.*",
      priority: 80,
      enabled: true,
      condition: (event) => event.type.startsWith("workflow."),
    });

    // Rule for agent events
    this.addRoutingRule({
      id: "agent-events",
      name: "Agent Event Routing",
      eventType: "agent.*",
      priority: 70,
      enabled: true,
      condition: (event) => event.type.startsWith("agent."),
    });
  }

  /**
   * Apply routing rules to an event
   */
  private applyRoutingRules(event: OrchestratorEvent): OrchestratorEvent[] {
    const applicableRules = Array.from(this.routingRules.values())
      .filter(rule => rule.enabled && this.matchesRule(event, rule))
      .sort((a, b) => b.priority - a.priority);

    if (applicableRules.length === 0) {
      return [event];
    }

    const routedEvents: OrchestratorEvent[] = [];

    for (const rule of applicableRules) {
      let routedEvent = event;

      // Apply transformation if specified
      if (rule.transform) {
        try {
          routedEvent = rule.transform(event);
        } catch (error) {
          console.error(`Error applying transformation for rule ${rule.id}:`, error);
          continue;
        }
      }

      routedEvents.push(routedEvent);
    }

    return routedEvents.length > 0 ? routedEvents : [event];
  }

  /**
   * Check if event matches routing rule
   */
  private matchesRule(event: OrchestratorEvent, rule: EventRoutingRule): boolean {
    // Check event type pattern
    if (rule.eventType !== "*" && !this.matchesPattern(event.type, rule.eventType)) {
      return false;
    }

    // Check source pattern
    if (rule.sourcePattern && !this.matchesPattern(event.source, rule.sourcePattern)) {
      return false;
    }

    // Check target pattern
    if (rule.targetPattern && event.target && !this.matchesPattern(event.target, rule.targetPattern)) {
      return false;
    }

    // Check custom condition
    if (rule.condition) {
      try {
        return rule.condition(event);
      } catch (error) {
        console.error(`Error evaluating condition for rule ${rule.id}:`, error);
        return false;
      }
    }

    return true;
  }

  /**
   * Check if string matches pattern (supports wildcards)
   */
  private matchesPattern(value: string, pattern: string): boolean {
    if (pattern === "*") return true;
    if (pattern === value) return true;
    
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\./g, "\\.")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(value);
  }

  /**
   * Process an event through the event emitter
   */
  private processEvent(event: OrchestratorEvent): void {
    try {
      // Handle correlation
      if (event.correlationId) {
        this.correlateEvents(event.correlationId, event.id);
      }

      // Emit the event
      this.eventEmitter.emit(event.type, event);
      this.eventEmitter.emit("*", event); // Wildcard listener
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Add event to history
   */
  private addToHistory(event: OrchestratorEvent): void {
    this.eventHistory.push(event);

    // Maintain history size limit
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    this.errorCount++;
    this.lastError = error;
    console.error(`EventDispatcher Error:`, error);

    // Emit error event if dispatcher is running
    if (this._status === "running") {
      try {
        this.processEvent({
          id: this.generateEventId(),
          type: "dispatcher.error",
          source: this.id,
          timestamp: new Date(),
          version: 1,
          status: "error",
          affectedNodeId: this.id,
          error: error.message,
          errorMessage: error.message,
          data: {
            error: error.message,
            stack: error.stack,
          },
        });
      } catch (emitError) {
        console.error("Failed to emit error event:", emitError);
      }
    }
  }
}

