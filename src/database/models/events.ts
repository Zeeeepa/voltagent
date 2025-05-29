/**
 * Events Model for Task Master
 * Phase 4.1: Comprehensive Database & Event Storage Implementation
 */

import { PoolClient } from 'pg';
import { getDatabaseManager } from '../connection';

export interface Event {
  id: string;
  event_type: string;
  source: string;
  actor?: string;
  target_type?: string;
  target_id?: string;
  action: string;
  payload: Record<string, any>;
  timestamp: string;
  correlation_id?: string;
  session_id?: string;
  metadata: Record<string, any>;
}

export interface CreateEventInput {
  event_type: string;
  source: string;
  actor?: string;
  target_type?: string;
  target_id?: string;
  action: string;
  payload?: Record<string, any>;
  correlation_id?: string;
  session_id?: string;
  metadata?: Record<string, any>;
}

export interface EventFilterOptions {
  event_type?: string;
  source?: string;
  actor?: string;
  target_type?: string;
  target_id?: string;
  action?: string;
  correlation_id?: string;
  session_id?: string;
  start_time?: Date;
  end_time?: Date;
  limit?: number;
  offset?: number;
}

export interface EventAggregation {
  event_type: string;
  count: number;
  first_occurrence: string;
  last_occurrence: string;
}

export class EventsModel {
  private dbManager = getDatabaseManager();

  /**
   * Create a new event
   */
  async create(input: CreateEventInput): Promise<Event> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const query = `
        INSERT INTO events (
          event_type, source, actor, target_type, target_id, 
          action, payload, correlation_id, session_id, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;
      
      const values = [
        input.event_type,
        input.source,
        input.actor || null,
        input.target_type || null,
        input.target_id || null,
        input.action,
        JSON.stringify(input.payload || {}),
        input.correlation_id || null,
        input.session_id || null,
        JSON.stringify(input.metadata || {}),
      ];

      const result = await client.query(query, values);
      return this.mapRowToEvent(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Create multiple events in batch
   */
  async createBatch(events: CreateEventInput[]): Promise<Event[]> {
    if (events.length === 0) return [];

    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      await client.query('BEGIN');

      const results: Event[] = [];
      
      for (const event of events) {
        const query = `
          INSERT INTO events (
            event_type, source, actor, target_type, target_id, 
            action, payload, correlation_id, session_id, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `;
        
        const values = [
          event.event_type,
          event.source,
          event.actor || null,
          event.target_type || null,
          event.target_id || null,
          event.action,
          JSON.stringify(event.payload || {}),
          event.correlation_id || null,
          event.session_id || null,
          JSON.stringify(event.metadata || {}),
        ];

        const result = await client.query(query, values);
        results.push(this.mapRowToEvent(result.rows[0]));
      }

      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get event by ID
   */
  async getById(id: string): Promise<Event | null> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const query = 'SELECT * FROM events WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToEvent(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Find events with filters
   */
  async find(options: EventFilterOptions = {}): Promise<Event[]> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (options.event_type) {
        conditions.push(`event_type = $${paramIndex++}`);
        values.push(options.event_type);
      }

      if (options.source) {
        conditions.push(`source = $${paramIndex++}`);
        values.push(options.source);
      }

      if (options.actor) {
        conditions.push(`actor = $${paramIndex++}`);
        values.push(options.actor);
      }

      if (options.target_type) {
        conditions.push(`target_type = $${paramIndex++}`);
        values.push(options.target_type);
      }

      if (options.target_id) {
        conditions.push(`target_id = $${paramIndex++}`);
        values.push(options.target_id);
      }

      if (options.action) {
        conditions.push(`action = $${paramIndex++}`);
        values.push(options.action);
      }

      if (options.correlation_id) {
        conditions.push(`correlation_id = $${paramIndex++}`);
        values.push(options.correlation_id);
      }

      if (options.session_id) {
        conditions.push(`session_id = $${paramIndex++}`);
        values.push(options.session_id);
      }

      if (options.start_time) {
        conditions.push(`timestamp >= $${paramIndex++}`);
        values.push(options.start_time);
      }

      if (options.end_time) {
        conditions.push(`timestamp <= $${paramIndex++}`);
        values.push(options.end_time);
      }

      let query = 'SELECT * FROM events';
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ' ORDER BY timestamp DESC';
      
      if (options.limit) {
        query += ` LIMIT $${paramIndex++}`;
        values.push(options.limit);
      }
      
      if (options.offset) {
        query += ` OFFSET $${paramIndex++}`;
        values.push(options.offset);
      }

      const result = await client.query(query, values);
      return result.rows.map(row => this.mapRowToEvent(row));
    } finally {
      client.release();
    }
  }

  /**
   * Get events by correlation ID
   */
  async getByCorrelationId(correlationId: string): Promise<Event[]> {
    return await this.find({ correlation_id: correlationId });
  }

  /**
   * Get events by session ID
   */
  async getBySessionId(sessionId: string): Promise<Event[]> {
    return await this.find({ session_id: sessionId });
  }

  /**
   * Get events for a specific target
   */
  async getByTarget(targetType: string, targetId: string): Promise<Event[]> {
    return await this.find({ target_type: targetType, target_id: targetId });
  }

  /**
   * Get event aggregations by type
   */
  async getAggregationsByType(
    startTime?: Date,
    endTime?: Date
  ): Promise<EventAggregation[]> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (startTime) {
        conditions.push(`timestamp >= $${paramIndex++}`);
        values.push(startTime);
      }

      if (endTime) {
        conditions.push(`timestamp <= $${paramIndex++}`);
        values.push(endTime);
      }

      let query = `
        SELECT 
          event_type,
          COUNT(*) as count,
          MIN(timestamp) as first_occurrence,
          MAX(timestamp) as last_occurrence
        FROM events
      `;
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ' GROUP BY event_type ORDER BY count DESC';

      const result = await client.query(query, values);
      
      return result.rows.map(row => ({
        event_type: row.event_type,
        count: parseInt(row.count),
        first_occurrence: row.first_occurrence.toISOString(),
        last_occurrence: row.last_occurrence.toISOString(),
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Get event timeline for a specific target
   */
  async getTimeline(
    targetType: string,
    targetId: string,
    limit: number = 100
  ): Promise<Event[]> {
    return await this.find({
      target_type: targetType,
      target_id: targetId,
      limit,
    });
  }

  /**
   * Delete old events (for retention policy)
   */
  async deleteOldEvents(olderThan: Date): Promise<number> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const query = 'DELETE FROM events WHERE timestamp < $1';
      const result = await client.query(query, [olderThan]);
      return result.rowCount;
    } finally {
      client.release();
    }
  }

  /**
   * Get event statistics
   */
  async getStatistics(
    startTime?: Date,
    endTime?: Date
  ): Promise<{
    total: number;
    by_type: Record<string, number>;
    by_source: Record<string, number>;
    by_action: Record<string, number>;
    events_per_hour: number;
  }> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (startTime) {
        conditions.push(`timestamp >= $${paramIndex++}`);
        values.push(startTime);
      }

      if (endTime) {
        conditions.push(`timestamp <= $${paramIndex++}`);
        values.push(endTime);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const queries = await Promise.all([
        // Total count
        client.query(`SELECT COUNT(*) as total FROM events ${whereClause}`, values),
        
        // By type
        client.query(`
          SELECT event_type, COUNT(*) as count 
          FROM events ${whereClause}
          GROUP BY event_type
        `, values),
        
        // By source
        client.query(`
          SELECT source, COUNT(*) as count 
          FROM events ${whereClause}
          GROUP BY source
        `, values),
        
        // By action
        client.query(`
          SELECT action, COUNT(*) as count 
          FROM events ${whereClause}
          GROUP BY action
        `, values),
      ]);

      const total = parseInt(queries[0].rows[0].total);
      
      const by_type = queries[1].rows.reduce((acc, row) => {
        acc[row.event_type] = parseInt(row.count);
        return acc;
      }, {} as Record<string, number>);
      
      const by_source = queries[2].rows.reduce((acc, row) => {
        acc[row.source] = parseInt(row.count);
        return acc;
      }, {} as Record<string, number>);
      
      const by_action = queries[3].rows.reduce((acc, row) => {
        acc[row.action] = parseInt(row.count);
        return acc;
      }, {} as Record<string, number>);

      // Calculate events per hour
      let events_per_hour = 0;
      if (startTime && endTime) {
        const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
        events_per_hour = hours > 0 ? total / hours : 0;
      }
      
      return {
        total,
        by_type,
        by_source,
        by_action,
        events_per_hour,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Map database row to Event object
   */
  private mapRowToEvent(row: any): Event {
    return {
      id: row.id,
      event_type: row.event_type,
      source: row.source,
      actor: row.actor,
      target_type: row.target_type,
      target_id: row.target_id,
      action: row.action,
      payload: row.payload || {},
      timestamp: row.timestamp.toISOString(),
      correlation_id: row.correlation_id,
      session_id: row.session_id,
      metadata: row.metadata || {},
    };
  }
}

