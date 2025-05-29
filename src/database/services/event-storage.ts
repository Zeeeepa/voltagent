/**
 * Event Storage Service for Task Master
 * Phase 4.1: Comprehensive Database & Event Storage Implementation
 */

import { EventEmitter } from 'events';
import { getDatabaseManager } from '../connection';
import { EventsModel, CreateEventInput, Event, EventFilterOptions } from '../models/events';

export interface EventIngestionOptions {
  batchSize?: number;
  flushInterval?: number;
  enableDeduplication?: boolean;
  retentionDays?: number;
}

export interface EventProcessingRule {
  eventType: string;
  processor: (event: Event) => Promise<void>;
}

export class EventStorageService extends EventEmitter {
  private eventsModel: EventsModel;
  private dbManager = getDatabaseManager();
  private eventBuffer: CreateEventInput[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private processingRules: Map<string, EventProcessingRule[]> = new Map();
  private options: Required<EventIngestionOptions>;

  constructor(options: EventIngestionOptions = {}) {
    super();
    this.eventsModel = new EventsModel();
    this.options = {
      batchSize: options.batchSize || 100,
      flushInterval: options.flushInterval || 5000, // 5 seconds
      enableDeduplication: options.enableDeduplication || true,
      retentionDays: options.retentionDays || 90,
    };

    this.startFlushTimer();
  }

  /**
   * Ingest a single event
   */
  async ingestEvent(input: CreateEventInput): Promise<void> {
    // Add correlation ID if not provided
    if (!input.correlation_id) {
      input.correlation_id = this.generateCorrelationId();
    }

    // Add to buffer for batch processing
    this.eventBuffer.push(input);

    // Emit event for real-time processing
    this.emit('event:ingested', input);

    // Flush if buffer is full
    if (this.eventBuffer.length >= this.options.batchSize) {
      await this.flushBuffer();
    }
  }

  /**
   * Ingest multiple events
   */
  async ingestEvents(inputs: CreateEventInput[]): Promise<void> {
    for (const input of inputs) {
      await this.ingestEvent(input);
    }
  }

  /**
   * Process events in real-time
   */
  async processEvent(event: Event): Promise<void> {
    const rules = this.processingRules.get(event.event_type) || [];
    
    for (const rule of rules) {
      try {
        await rule.processor(event);
      } catch (error) {
        console.error(`Error processing event ${event.id} with rule for ${event.event_type}:`, error);
        this.emit('error', error);
      }
    }

    // Emit processed event
    this.emit('event:processed', event);
  }

  /**
   * Add event processing rule
   */
  addProcessingRule(rule: EventProcessingRule): void {
    if (!this.processingRules.has(rule.eventType)) {
      this.processingRules.set(rule.eventType, []);
    }
    this.processingRules.get(rule.eventType)!.push(rule);
  }

  /**
   * Remove event processing rule
   */
  removeProcessingRule(eventType: string, processor: (event: Event) => Promise<void>): void {
    const rules = this.processingRules.get(eventType);
    if (rules) {
      const index = rules.findIndex(rule => rule.processor === processor);
      if (index !== -1) {
        rules.splice(index, 1);
      }
    }
  }

  /**
   * Query events
   */
  async queryEvents(options: EventFilterOptions): Promise<Event[]> {
    return await this.eventsModel.find(options);
  }

  /**
   * Get events by correlation ID
   */
  async getEventsByCorrelation(correlationId: string): Promise<Event[]> {
    return await this.eventsModel.getByCorrelationId(correlationId);
  }

  /**
   * Get events by session ID
   */
  async getEventsBySession(sessionId: string): Promise<Event[]> {
    return await this.eventsModel.getBySessionId(sessionId);
  }

  /**
   * Get event timeline for a target
   */
  async getEventTimeline(targetType: string, targetId: string, limit?: number): Promise<Event[]> {
    return await this.eventsModel.getTimeline(targetType, targetId, limit);
  }

  /**
   * Get event aggregations
   */
  async getEventAggregations(startTime?: Date, endTime?: Date) {
    return await this.eventsModel.getAggregationsByType(startTime, endTime);
  }

  /**
   * Get event statistics
   */
  async getEventStatistics(startTime?: Date, endTime?: Date) {
    return await this.eventsModel.getStatistics(startTime, endTime);
  }

  /**
   * Export events to JSON
   */
  async exportEvents(options: EventFilterOptions): Promise<Event[]> {
    // Remove limit to get all matching events
    const { limit, offset, ...filterOptions } = options;
    return await this.eventsModel.find(filterOptions);
  }

  /**
   * Clean up old events based on retention policy
   */
  async cleanupOldEvents(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.options.retentionDays);
    
    const deletedCount = await this.eventsModel.deleteOldEvents(cutoffDate);
    
    if (deletedCount > 0) {
      console.log(`Cleaned up ${deletedCount} old events older than ${cutoffDate.toISOString()}`);
      this.emit('events:cleaned', { deletedCount, cutoffDate });
    }
    
    return deletedCount;
  }

  /**
   * Flush event buffer to database
   */
  private async flushBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    try {
      // Apply deduplication if enabled
      const uniqueEvents = this.options.enableDeduplication 
        ? this.deduplicateEvents(eventsToFlush)
        : eventsToFlush;

      // Store events in database
      const storedEvents = await this.eventsModel.createBatch(uniqueEvents);

      // Process each stored event
      for (const event of storedEvents) {
        await this.processEvent(event);
      }

      this.emit('events:flushed', { count: storedEvents.length });
    } catch (error) {
      console.error('Error flushing event buffer:', error);
      this.emit('error', error);
      
      // Re-add events to buffer for retry
      this.eventBuffer.unshift(...eventsToFlush);
    }
  }

  /**
   * Deduplicate events based on content hash
   */
  private deduplicateEvents(events: CreateEventInput[]): CreateEventInput[] {
    const seen = new Set<string>();
    const unique: CreateEventInput[] = [];

    for (const event of events) {
      const hash = this.generateEventHash(event);
      if (!seen.has(hash)) {
        seen.add(hash);
        unique.push(event);
      }
    }

    return unique;
  }

  /**
   * Generate hash for event deduplication
   */
  private generateEventHash(event: CreateEventInput): string {
    const hashData = {
      event_type: event.event_type,
      source: event.source,
      action: event.action,
      target_type: event.target_type,
      target_id: event.target_id,
      payload: event.payload,
    };
    
    return Buffer.from(JSON.stringify(hashData)).toString('base64');
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      await this.flushBuffer();
    }, this.options.flushInterval);
  }

  /**
   * Stop flush timer
   */
  private stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    this.stopFlushTimer();
    await this.flushBuffer();
    this.removeAllListeners();
  }
}

// Event type constants for common Task Master events
export const TaskMasterEventTypes = {
  // Task events
  TASK_CREATED: 'task.created',
  TASK_UPDATED: 'task.updated',
  TASK_COMPLETED: 'task.completed',
  TASK_ASSIGNED: 'task.assigned',
  TASK_BLOCKED: 'task.blocked',

  // Requirement events
  REQUIREMENT_CREATED: 'requirement.created',
  REQUIREMENT_UPDATED: 'requirement.updated',
  REQUIREMENT_ANALYZED: 'requirement.analyzed',

  // System events
  SYSTEM_STARTED: 'system.started',
  SYSTEM_STOPPED: 'system.stopped',
  SYSTEM_ERROR: 'system.error',

  // Integration events
  LINEAR_SYNC: 'linear.sync',
  GITHUB_PR_CREATED: 'github.pr.created',
  GITHUB_PR_MERGED: 'github.pr.merged',
  CODEGEN_REQUEST: 'codegen.request',
  CLAUDE_SESSION: 'claude.session',
  WSL2_DEPLOYMENT: 'wsl2.deployment',

  // Analytics events
  ANALYTICS_GENERATED: 'analytics.generated',
  REPORT_CREATED: 'report.created',
} as const;

// Event source constants
export const TaskMasterEventSources = {
  TASK_MASTER: 'task-master',
  LINEAR: 'linear',
  GITHUB: 'github',
  CODEGEN: 'codegen',
  CLAUDE: 'claude',
  WSL2: 'wsl2',
  ANALYTICS: 'analytics',
  USER: 'user',
  SYSTEM: 'system',
} as const;

