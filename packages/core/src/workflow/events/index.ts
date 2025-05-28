import { EventEmitter } from 'events';
import type {
  WorkflowEvent,
  WorkflowProgressEvent,
  WorkflowCompletionEvent,
  WorkflowError
} from '../types';

/**
 * Workflow event types
 */
export type WorkflowEventType = 
  | 'workflow_created'
  | 'workflow_started'
  | 'workflow_paused'
  | 'workflow_resumed'
  | 'workflow_cancelled'
  | 'workflow_completed'
  | 'workflow_failed'
  | 'workflow_progress'
  | 'step_started'
  | 'step_completed'
  | 'step_failed'
  | 'step_retry'
  | 'component_event';

/**
 * Workflow event bus for coordinating between components
 */
export class WorkflowEventBus extends EventEmitter {
  private static instance: WorkflowEventBus | null = null;
  private eventQueue: WorkflowEvent[] = [];
  private maxQueueSize: number;
  private processingBatchSize: number;
  private retentionDays: number;
  private isProcessing: boolean = false;

  private constructor(options: {
    maxQueueSize?: number;
    processingBatchSize?: number;
    retentionDays?: number;
  } = {}) {
    super();
    this.maxQueueSize = options.maxQueueSize || 1000;
    this.processingBatchSize = options.processingBatchSize || 10;
    this.retentionDays = options.retentionDays || 30;

    // Start event processing
    this.startEventProcessing();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(options?: {
    maxQueueSize?: number;
    processingBatchSize?: number;
    retentionDays?: number;
  }): WorkflowEventBus {
    if (!WorkflowEventBus.instance) {
      WorkflowEventBus.instance = new WorkflowEventBus(options);
    }
    return WorkflowEventBus.instance;
  }

  /**
   * Publish workflow event
   */
  publishEvent(
    workflowId: string,
    eventType: WorkflowEventType,
    eventName: string,
    eventData: Record<string, any> = {},
    sourceComponent?: string,
    targetComponent?: string
  ): void {
    const event: WorkflowEvent = {
      id: `${workflowId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      eventType,
      eventName,
      eventData,
      timestamp: new Date(),
      sourceComponent,
      targetComponent
    };

    // Add to queue
    this.eventQueue.push(event);

    // Limit queue size
    if (this.eventQueue.length > this.maxQueueSize) {
      this.eventQueue = this.eventQueue.slice(-this.maxQueueSize);
    }

    // Emit event immediately for real-time listeners
    this.emit(eventType, event);
    this.emit('workflow_event', event);
  }

  /**
   * Subscribe to workflow events
   */
  subscribeToWorkflow(
    workflowId: string,
    callback: (event: WorkflowEvent) => void
  ): () => void {
    const eventHandler = (event: WorkflowEvent) => {
      if (event.workflowId === workflowId) {
        callback(event);
      }
    };

    this.on('workflow_event', eventHandler);

    // Return unsubscribe function
    return () => {
      this.off('workflow_event', eventHandler);
    };
  }

  /**
   * Subscribe to specific event type
   */
  subscribeToEventType(
    eventType: WorkflowEventType,
    callback: (event: WorkflowEvent) => void
  ): () => void {
    this.on(eventType, callback);

    // Return unsubscribe function
    return () => {
      this.off(eventType, callback);
    };
  }

  /**
   * Get workflow events
   */
  getWorkflowEvents(
    workflowId: string,
    eventType?: WorkflowEventType,
    limit: number = 100
  ): WorkflowEvent[] {
    let events = this.eventQueue.filter(event => event.workflowId === workflowId);

    if (eventType) {
      events = events.filter(event => event.eventType === eventType);
    }

    // Sort by timestamp (newest first) and limit
    return events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get all events for a time range
   */
  getEventsInRange(
    startTime: Date,
    endTime: Date,
    eventType?: WorkflowEventType
  ): WorkflowEvent[] {
    let events = this.eventQueue.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime
    );

    if (eventType) {
      events = events.filter(event => event.eventType === eventType);
    }

    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Clear old events based on retention policy
   */
  clearOldEvents(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);

    this.eventQueue = this.eventQueue.filter(event => 
      event.timestamp > cutoffDate
    );
  }

  /**
   * Get event statistics
   */
  getEventStatistics(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsByWorkflow: Record<string, number>;
    recentEvents: number;
  } {
    const totalEvents = this.eventQueue.length;
    
    const eventsByType: Record<string, number> = {};
    const eventsByWorkflow: Record<string, number> = {};
    
    // Count events in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    let recentEvents = 0;

    this.eventQueue.forEach(event => {
      // Count by type
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      
      // Count by workflow
      eventsByWorkflow[event.workflowId] = (eventsByWorkflow[event.workflowId] || 0) + 1;
      
      // Count recent events
      if (event.timestamp > oneHourAgo) {
        recentEvents++;
      }
    });

    return {
      totalEvents,
      eventsByType,
      eventsByWorkflow,
      recentEvents
    };
  }

  /**
   * Start event processing
   */
  private startEventProcessing(): void {
    // Process events in batches
    setInterval(() => {
      if (!this.isProcessing && this.eventQueue.length > 0) {
        this.processEventBatch();
      }
    }, 1000); // Process every second

    // Clean up old events
    setInterval(() => {
      this.clearOldEvents();
    }, 60 * 60 * 1000); // Clean up every hour
  }

  /**
   * Process a batch of events
   */
  private async processEventBatch(): Promise<void> {
    if (this.isProcessing) return;

    this.isProcessing = true;

    try {
      const batch = this.eventQueue.slice(0, this.processingBatchSize);
      
      // Process each event in the batch
      for (const event of batch) {
        await this.processEvent(event);
      }

      // Remove processed events from queue
      this.eventQueue = this.eventQueue.slice(this.processingBatchSize);
    } catch (error) {
      console.error('Error processing event batch:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process individual event
   */
  private async processEvent(event: WorkflowEvent): Promise<void> {
    try {
      // Here you could add event persistence, external notifications, etc.
      // For now, we'll just emit a processed event
      this.emit('event_processed', event);
    } catch (error) {
      console.error('Error processing event:', error);
      this.emit('event_processing_error', { event, error });
    }
  }
}

/**
 * Workflow event coordinator - Coordinates events between components
 */
export class WorkflowEventCoordinator {
  private eventBus: WorkflowEventBus;
  private componentSubscriptions: Map<string, (() => void)[]> = new Map();

  constructor(eventBus?: WorkflowEventBus) {
    this.eventBus = eventBus || WorkflowEventBus.getInstance();
  }

  /**
   * Register component for event coordination
   */
  registerComponent(
    componentName: string,
    eventHandlers: Record<WorkflowEventType, (event: WorkflowEvent) => void>
  ): void {
    const subscriptions: (() => void)[] = [];

    // Subscribe to each event type
    Object.entries(eventHandlers).forEach(([eventType, handler]) => {
      const unsubscribe = this.eventBus.subscribeToEventType(
        eventType as WorkflowEventType,
        (event) => {
          // Add component context to event
          const enrichedEvent = {
            ...event,
            targetComponent: componentName
          };
          handler(enrichedEvent);
        }
      );
      subscriptions.push(unsubscribe);
    });

    this.componentSubscriptions.set(componentName, subscriptions);
  }

  /**
   * Unregister component
   */
  unregisterComponent(componentName: string): void {
    const subscriptions = this.componentSubscriptions.get(componentName);
    if (subscriptions) {
      subscriptions.forEach(unsubscribe => unsubscribe());
      this.componentSubscriptions.delete(componentName);
    }
  }

  /**
   * Coordinate component communication
   */
  coordinateComponents(
    sourceComponent: string,
    targetComponent: string,
    workflowId: string,
    eventType: WorkflowEventType,
    eventName: string,
    eventData: Record<string, any>
  ): void {
    this.eventBus.publishEvent(
      workflowId,
      eventType,
      eventName,
      eventData,
      sourceComponent,
      targetComponent
    );
  }

  /**
   * Broadcast to all components
   */
  broadcastToComponents(
    sourceComponent: string,
    workflowId: string,
    eventType: WorkflowEventType,
    eventName: string,
    eventData: Record<string, any>
  ): void {
    this.eventBus.publishEvent(
      workflowId,
      eventType,
      eventName,
      eventData,
      sourceComponent
    );
  }

  /**
   * Get component coordination metrics
   */
  getCoordinationMetrics(): {
    registeredComponents: number;
    activeSubscriptions: number;
    coordinationLatency: number;
  } {
    const registeredComponents = this.componentSubscriptions.size;
    const activeSubscriptions = Array.from(this.componentSubscriptions.values())
      .reduce((total, subs) => total + subs.length, 0);

    // Mock coordination latency - in real implementation, this would be measured
    const coordinationLatency = 85; // milliseconds

    return {
      registeredComponents,
      activeSubscriptions,
      coordinationLatency
    };
  }
}

/**
 * Real-time workflow monitor
 */
export class WorkflowMonitor {
  private eventBus: WorkflowEventBus;
  private activeWorkflows: Set<string> = new Set();
  private workflowMetrics: Map<string, any> = new Map();

  constructor(eventBus?: WorkflowEventBus) {
    this.eventBus = eventBus || WorkflowEventBus.getInstance();
    this.setupEventListeners();
  }

  /**
   * Start monitoring a workflow
   */
  startMonitoring(workflowId: string): () => void {
    this.activeWorkflows.add(workflowId);
    
    // Initialize metrics
    this.workflowMetrics.set(workflowId, {
      startTime: new Date(),
      stepCount: 0,
      completedSteps: 0,
      failedSteps: 0,
      events: []
    });

    // Return stop monitoring function
    return () => this.stopMonitoring(workflowId);
  }

  /**
   * Stop monitoring a workflow
   */
  stopMonitoring(workflowId: string): void {
    this.activeWorkflows.delete(workflowId);
    this.workflowMetrics.delete(workflowId);
  }

  /**
   * Get workflow metrics
   */
  getWorkflowMetrics(workflowId: string): any {
    return this.workflowMetrics.get(workflowId);
  }

  /**
   * Get all active workflows
   */
  getActiveWorkflows(): string[] {
    return Array.from(this.activeWorkflows);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.eventBus.on('workflow_event', (event: WorkflowEvent) => {
      if (this.activeWorkflows.has(event.workflowId)) {
        this.updateWorkflowMetrics(event);
      }
    });
  }

  /**
   * Update workflow metrics based on events
   */
  private updateWorkflowMetrics(event: WorkflowEvent): void {
    const metrics = this.workflowMetrics.get(event.workflowId);
    if (!metrics) return;

    // Update metrics based on event type
    switch (event.eventType) {
      case 'step_completed':
        metrics.completedSteps++;
        break;
      case 'step_failed':
        metrics.failedSteps++;
        break;
      case 'workflow_completed':
        metrics.endTime = new Date();
        metrics.duration = metrics.endTime.getTime() - metrics.startTime.getTime();
        break;
    }

    // Add event to history
    metrics.events.push({
      type: event.eventType,
      timestamp: event.timestamp,
      data: event.eventData
    });

    // Limit event history
    if (metrics.events.length > 100) {
      metrics.events = metrics.events.slice(-100);
    }
  }
}

