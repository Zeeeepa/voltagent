import { DatabaseConnection } from '../connection';
import { EventsModel, Event, CreateEventInput, EventFilters } from '../models/events';
import { v4 as uuidv4 } from 'uuid';

/**
 * Event Storage Service for VoltAgent
 * Phase 1.3: Setup Database Event Storage System
 * 
 * Handles high-throughput event storage with 1000+ events per minute capacity
 */

export interface EventBatch {
  events: CreateEventInput[];
  batchId: string;
  timestamp: Date;
}

export interface EventStorageMetrics {
  totalEvents: number;
  eventsPerMinute: number;
  averageProcessingTime: number;
  batchesProcessed: number;
  lastBatchTime: Date;
}

export interface EventQuery {
  filters: EventFilters;
  includeMetrics?: boolean;
}

export interface EventQueryResult {
  events: Event[];
  total: number;
  metrics?: EventStorageMetrics;
}

export class EventStorageService {
  private eventsModel: EventsModel;
  private db: DatabaseConnection;
  private batchQueue: EventBatch[] = [];
  private processingBatch = false;
  private batchSize = 100; // Process events in batches of 100
  private batchTimeout = 1000; // Process batch every 1 second
  private metrics: EventStorageMetrics;
  private batchTimer?: NodeJS.Timeout;

  constructor(db: DatabaseConnection) {
    this.db = db;
    this.eventsModel = new EventsModel(db);
    this.metrics = {
      totalEvents: 0,
      eventsPerMinute: 0,
      averageProcessingTime: 0,
      batchesProcessed: 0,
      lastBatchTime: new Date()
    };
    
    this.startBatchProcessor();
  }

  /**
   * Store a single event
   */
  async storeEvent(input: CreateEventInput): Promise<Event> {
    const startTime = Date.now();
    
    try {
      const event = await this.eventsModel.create(input);
      this.updateMetrics(Date.now() - startTime);
      return event;
    } catch (error) {
      console.error('Failed to store event:', error);
      throw error;
    }
  }

  /**
   * Store multiple events in batch (high-throughput)
   */
  async storeEventsBatch(inputs: CreateEventInput[]): Promise<Event[]> {
    const startTime = Date.now();
    
    try {
      const events = await this.eventsModel.batchCreate(inputs);
      this.updateMetrics(Date.now() - startTime, inputs.length);
      return events;
    } catch (error) {
      console.error('Failed to store events batch:', error);
      throw error;
    }
  }

  /**
   * Queue event for batch processing (for high-throughput scenarios)
   */
  queueEvent(input: CreateEventInput): void {
    const batch = this.getOrCreateCurrentBatch();
    batch.events.push(input);
    
    // Process immediately if batch is full
    if (batch.events.length >= this.batchSize) {
      this.processBatchQueue();
    }
  }

  /**
   * Queue multiple events for batch processing
   */
  queueEvents(inputs: CreateEventInput[]): void {
    inputs.forEach(input => this.queueEvent(input));
  }

  /**
   * Get or create current batch
   */
  private getOrCreateCurrentBatch(): EventBatch {
    if (this.batchQueue.length === 0 || 
        this.batchQueue[this.batchQueue.length - 1].events.length >= this.batchSize) {
      const newBatch: EventBatch = {
        events: [],
        batchId: uuidv4(),
        timestamp: new Date()
      };
      this.batchQueue.push(newBatch);
    }
    
    return this.batchQueue[this.batchQueue.length - 1];
  }

  /**
   * Start batch processor timer
   */
  private startBatchProcessor(): void {
    this.batchTimer = setInterval(() => {
      this.processBatchQueue();
    }, this.batchTimeout);
  }

  /**
   * Process queued batches
   */
  private async processBatchQueue(): Promise<void> {
    if (this.processingBatch || this.batchQueue.length === 0) {
      return;
    }

    this.processingBatch = true;
    
    try {
      const batchesToProcess = [...this.batchQueue];
      this.batchQueue = [];
      
      for (const batch of batchesToProcess) {
        if (batch.events.length > 0) {
          await this.processBatch(batch);
        }
      }
    } catch (error) {
      console.error('Error processing batch queue:', error);
    } finally {
      this.processingBatch = false;
    }
  }

  /**
   * Process a single batch
   */
  private async processBatch(batch: EventBatch): Promise<void> {
    const startTime = Date.now();
    
    try {
      await this.eventsModel.batchCreate(batch.events);
      this.updateMetrics(Date.now() - startTime, batch.events.length);
      this.metrics.batchesProcessed++;
      this.metrics.lastBatchTime = new Date();
      
      console.log(`Processed batch ${batch.batchId} with ${batch.events.length} events`);
    } catch (error) {
      console.error(`Failed to process batch ${batch.batchId}:`, error);
      // Could implement retry logic here
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(processingTime: number, eventCount: number = 1): void {
    this.metrics.totalEvents += eventCount;
    
    // Calculate rolling average processing time
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime + processingTime) / 2;
    
    // Calculate events per minute (simple approximation)
    const now = Date.now();
    const timeDiff = now - this.metrics.lastBatchTime.getTime();
    if (timeDiff > 0) {
      this.metrics.eventsPerMinute = Math.round((eventCount / timeDiff) * 60000);
    }
  }

  /**
   * Query events with advanced filtering
   */
  async queryEvents(query: EventQuery): Promise<EventQueryResult> {
    const events = await this.eventsModel.find(query.filters);
    const total = await this.eventsModel.count(query.filters);
    
    const result: EventQueryResult = {
      events,
      total
    };
    
    if (query.includeMetrics) {
      result.metrics = { ...this.metrics };
    }
    
    return result;
  }

  /**
   * Get event by ID
   */
  async getEvent(id: string): Promise<Event | null> {
    return this.eventsModel.findById(id);
  }

  /**
   * Get events by correlation ID
   */
  async getEventsByCorrelation(correlationId: string): Promise<Event[]> {
    return this.eventsModel.findByCorrelationId(correlationId);
  }

  /**
   * Get events by agent ID
   */
  async getEventsByAgent(agentId: string, limit?: number): Promise<Event[]> {
    return this.eventsModel.findByAgentId(agentId, limit);
  }

  /**
   * Get recent events
   */
  async getRecentEvents(limit: number = 100): Promise<Event[]> {
    return this.eventsModel.getRecent(limit);
  }

  /**
   * Create correlation between events
   */
  async correlateEvents(eventIds: string[], correlationId?: string): Promise<string> {
    const correlation = correlationId || uuidv4();
    
    for (const eventId of eventIds) {
      await this.eventsModel.update(eventId, { correlation_id: correlation });
    }
    
    return correlation;
  }

  /**
   * Track agent activity
   */
  async trackAgentActivity(
    agentId: string, 
    activity: string, 
    data: Record<string, any>,
    historyId?: string
  ): Promise<Event> {
    return this.storeEvent({
      event_type: 'agent_activity',
      source: 'agent',
      agent_id: agentId,
      history_id: historyId,
      data: {
        activity,
        ...data
      }
    });
  }

  /**
   * Track tool usage
   */
  async trackToolUsage(
    agentId: string,
    toolName: string,
    input: any,
    output: any,
    duration: number,
    historyId?: string
  ): Promise<Event> {
    return this.storeEvent({
      event_type: 'tool_usage',
      source: 'tool',
      agent_id: agentId,
      history_id: historyId,
      data: {
        tool_name: toolName,
        input,
        output,
        duration,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Track memory operations
   */
  async trackMemoryOperation(
    agentId: string,
    operation: string,
    data: Record<string, any>,
    historyId?: string
  ): Promise<Event> {
    return this.storeEvent({
      event_type: 'memory_operation',
      source: 'memory',
      agent_id: agentId,
      history_id: historyId,
      data: {
        operation,
        ...data
      }
    });
  }

  /**
   * Track system events
   */
  async trackSystemEvent(
    eventType: string,
    source: string,
    data: Record<string, any>
  ): Promise<Event> {
    return this.storeEvent({
      event_type: eventType,
      source,
      data
    });
  }

  /**
   * Get storage metrics
   */
  getMetrics(): EventStorageMetrics {
    return { ...this.metrics };
  }

  /**
   * Get event statistics
   */
  async getEventStatistics(): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySource: Record<string, number>;
    eventsLast24Hours: number;
    eventsLastHour: number;
  }> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    
    const [
      totalEvents,
      eventsLast24Hours,
      eventsLastHour,
      eventsByType,
      eventsBySource
    ] = await Promise.all([
      this.eventsModel.count(),
      this.eventsModel.count({ start_date: last24Hours }),
      this.eventsModel.count({ start_date: lastHour }),
      this.getEventCountByField('event_type'),
      this.getEventCountByField('source')
    ]);
    
    return {
      totalEvents,
      eventsByType,
      eventsBySource,
      eventsLast24Hours,
      eventsLastHour
    };
  }

  /**
   * Get event count grouped by field
   */
  private async getEventCountByField(field: string): Promise<Record<string, number>> {
    const query = `
      SELECT ${field}, COUNT(*) as count 
      FROM events 
      GROUP BY ${field}
      ORDER BY count DESC
    `;
    
    const result = await this.db.query(query);
    const counts: Record<string, number> = {};
    
    result.rows.forEach(row => {
      counts[row[field]] = parseInt(row.count);
    });
    
    return counts;
  }

  /**
   * Clean up old events (for maintenance)
   */
  async cleanupOldEvents(olderThanDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const query = 'DELETE FROM events WHERE created_at < $1';
    const result = await this.db.query(query, [cutoffDate]);
    
    console.log(`Cleaned up ${result.rowCount} events older than ${olderThanDays} days`);
    return result.rowCount;
  }

  /**
   * Stop the service and clean up resources
   */
  stop(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    // Process any remaining batches
    this.processBatchQueue();
  }
}

