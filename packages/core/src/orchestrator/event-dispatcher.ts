import { EventEmitter } from "events";
import type {
  SystemEvent,
  EventPriority,
  EventHandler,
  OrchestratorConfig,
} from "./types";

/**
 * Event Dispatcher for routing and managing system events
 */
export class EventDispatcher extends EventEmitter {
  private handlers: Map<string, EventHandler[]> = new Map();
  private eventQueue: SystemEvent[] = [];
  private processingQueue = false;
  private eventHistory: SystemEvent[] = [];
  private correlationMap: Map<string, SystemEvent[]> = new Map();
  private config: OrchestratorConfig;
  private isRunning = false;

  constructor(config: OrchestratorConfig) {
    super();
    this.config = config;
  }

  /**
   * Start the event dispatcher
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.startEventProcessing();
    this.emit("dispatcher:started");
  }

  /**
   * Stop the event dispatcher
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    // Process remaining events in queue
    await this.processEventQueue();
    
    this.emit("dispatcher:stopped");
  }

  /**
   * Register an event handler
   */
  public registerHandler(handler: EventHandler): void {
    const handlers = this.handlers.get(handler.type) || [];
    handlers.push(handler);
    
    // Sort handlers by priority (critical first)
    handlers.sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));
    
    this.handlers.set(handler.type, handlers);
    this.emit("handler:registered", handler);
  }

  /**
   * Unregister an event handler
   */
  public unregisterHandler(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
        this.emit("handler:unregistered", { eventType, handler });
      }
    }
  }

  /**
   * Dispatch an event
   */
  public async dispatchEvent(event: SystemEvent): Promise<void> {
    // Add to event history
    this.eventHistory.push(event);
    
    // Maintain history size limit
    if (this.eventHistory.length > 10000) {
      this.eventHistory = this.eventHistory.slice(-5000);
    }

    // Handle correlation
    if (event.correlationId) {
      const correlatedEvents = this.correlationMap.get(event.correlationId) || [];
      correlatedEvents.push(event);
      this.correlationMap.set(event.correlationId, correlatedEvents);
    }

    // Add to queue based on priority
    this.addToQueue(event);
    
    // Process queue if not already processing
    if (!this.processingQueue) {
      await this.processEventQueue();
    }

    this.emit("event:dispatched", event);
  }

  /**
   * Create and dispatch an event
   */
  public async createEvent(
    type: string,
    source: string,
    data: Record<string, any>,
    options: {
      priority?: EventPriority;
      target?: string;
      correlationId?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<SystemEvent> {
    const event: SystemEvent = {
      id: this.generateEventId(),
      type,
      priority: options.priority || "normal",
      source,
      target: options.target,
      data,
      timestamp: new Date(),
      correlationId: options.correlationId,
      metadata: options.metadata,
    };

    await this.dispatchEvent(event);
    return event;
  }

  /**
   * Get events by correlation ID
   */
  public getCorrelatedEvents(correlationId: string): SystemEvent[] {
    return this.correlationMap.get(correlationId) || [];
  }

  /**
   * Get event history
   */
  public getEventHistory(
    filter?: {
      type?: string;
      source?: string;
      priority?: EventPriority;
      since?: Date;
      limit?: number;
    }
  ): SystemEvent[] {
    let events = [...this.eventHistory];

    if (filter) {
      if (filter.type) {
        events = events.filter(e => e.type === filter.type);
      }
      if (filter.source) {
        events = events.filter(e => e.source === filter.source);
      }
      if (filter.priority) {
        events = events.filter(e => e.priority === filter.priority);
      }
      if (filter.since) {
        events = events.filter(e => e.timestamp >= filter.since!);
      }
      if (filter.limit) {
        events = events.slice(-filter.limit);
      }
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Replay events for a correlation ID
   */
  public async replayEvents(correlationId: string): Promise<void> {
    const events = this.getCorrelatedEvents(correlationId);
    
    for (const event of events) {
      // Create a replay event
      const replayEvent: SystemEvent = {
        ...event,
        id: this.generateEventId(),
        timestamp: new Date(),
        metadata: {
          ...event.metadata,
          isReplay: true,
          originalEventId: event.id,
          originalTimestamp: event.timestamp,
        },
      };
      
      await this.dispatchEvent(replayEvent);
    }
  }

  /**
   * Get event statistics
   */
  public getEventStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByPriority: Record<EventPriority, number>;
    queueSize: number;
    averageProcessingTime: number;
  } {
    const eventsByType: Record<string, number> = {};
    const eventsByPriority: Record<EventPriority, number> = {
      low: 0,
      normal: 0,
      high: 0,
      critical: 0,
    };

    for (const event of this.eventHistory) {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsByPriority[event.priority]++;
    }

    return {
      totalEvents: this.eventHistory.length,
      eventsByType,
      eventsByPriority,
      queueSize: this.eventQueue.length,
      averageProcessingTime: this.calculateAverageProcessingTime(),
    };
  }

  /**
   * Clear event history
   */
  public clearHistory(): void {
    this.eventHistory = [];
    this.correlationMap.clear();
    this.emit("history:cleared");
  }

  /**
   * Add event to queue based on priority
   */
  private addToQueue(event: SystemEvent): void {
    // Insert event in queue based on priority
    const priorityWeight = this.getPriorityWeight(event.priority);
    let insertIndex = this.eventQueue.length;
    
    for (let i = 0; i < this.eventQueue.length; i++) {
      const queueEventWeight = this.getPriorityWeight(this.eventQueue[i].priority);
      if (priorityWeight > queueEventWeight) {
        insertIndex = i;
        break;
      }
    }
    
    this.eventQueue.splice(insertIndex, 0, event);
  }

  /**
   * Get priority weight for sorting
   */
  private getPriorityWeight(priority: EventPriority): number {
    switch (priority) {
      case "critical": return 4;
      case "high": return 3;
      case "normal": return 2;
      case "low": return 1;
      default: return 0;
    }
  }

  /**
   * Start event processing loop
   */
  private startEventProcessing(): void {
    // Process events every 100ms
    setInterval(async () => {
      if (this.isRunning && !this.processingQueue && this.eventQueue.length > 0) {
        await this.processEventQueue();
      }
    }, 100);
  }

  /**
   * Process events in the queue
   */
  private async processEventQueue(): Promise<void> {
    if (this.processingQueue || this.eventQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      while (this.eventQueue.length > 0 && this.isRunning) {
        const event = this.eventQueue.shift();
        if (event) {
          await this.processEvent(event);
        }
      }
    } catch (error) {
      console.error("Error processing event queue:", error);
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Process a single event
   */
  private async processEvent(event: SystemEvent): Promise<void> {
    const startTime = Date.now();
    
    try {
      const handlers = this.handlers.get(event.type) || [];
      
      // Execute handlers in parallel for better performance
      const handlerPromises = handlers.map(async (handler) => {
        try {
          await handler.handler(event);
        } catch (error) {
          console.error(`Error in event handler for ${event.type}:`, error);
          this.emit("handler:error", { event, handler, error });
        }
      });

      await Promise.all(handlerPromises);
      
      const processingTime = Date.now() - startTime;
      this.emit("event:processed", { event, processingTime });
      
    } catch (error) {
      console.error(`Error processing event ${event.id}:`, error);
      this.emit("event:error", { event, error });
    }
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate average processing time
   */
  private calculateAverageProcessingTime(): number {
    // This would track actual processing times
    // For now, return a mock value
    return Math.random() * 50 + 10; // 10-60ms
  }

  /**
   * Filter events by criteria
   */
  public filterEvents(
    events: SystemEvent[],
    criteria: {
      types?: string[];
      sources?: string[];
      priorities?: EventPriority[];
      timeRange?: { start: Date; end: Date };
    }
  ): SystemEvent[] {
    return events.filter(event => {
      if (criteria.types && !criteria.types.includes(event.type)) {
        return false;
      }
      if (criteria.sources && !criteria.sources.includes(event.source)) {
        return false;
      }
      if (criteria.priorities && !criteria.priorities.includes(event.priority)) {
        return false;
      }
      if (criteria.timeRange) {
        const eventTime = event.timestamp.getTime();
        const startTime = criteria.timeRange.start.getTime();
        const endTime = criteria.timeRange.end.getTime();
        if (eventTime < startTime || eventTime > endTime) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Aggregate events by type
   */
  public aggregateEventsByType(events: SystemEvent[]): Record<string, SystemEvent[]> {
    return events.reduce((acc, event) => {
      if (!acc[event.type]) {
        acc[event.type] = [];
      }
      acc[event.type].push(event);
      return acc;
    }, {} as Record<string, SystemEvent[]>);
  }
}

