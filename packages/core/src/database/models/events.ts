import { DatabaseConnection } from '../connection';
import { v4 as uuidv4 } from 'uuid';

/**
 * Events model for VoltAgent database
 * Phase 1.3: Setup Database Event Storage System
 */

export interface Event {
  id: string;
  event_type: string;
  source: string;
  timestamp: Date;
  data: Record<string, any>;
  correlation_id?: string;
  agent_id?: string;
  history_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface CreateEventInput {
  event_type: string;
  source: string;
  data: Record<string, any>;
  correlation_id?: string;
  agent_id?: string;
  history_id?: string;
  timestamp?: Date;
}

export interface UpdateEventInput {
  event_type?: string;
  source?: string;
  data?: Record<string, any>;
  correlation_id?: string;
  agent_id?: string;
  history_id?: string;
}

export interface EventFilters {
  event_type?: string;
  source?: string;
  agent_id?: string;
  history_id?: string;
  correlation_id?: string;
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
}

export class EventsModel {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * Create a new event
   */
  async create(input: CreateEventInput): Promise<Event> {
    const id = uuidv4();
    const timestamp = input.timestamp || new Date();
    
    const query = `
      INSERT INTO events (id, event_type, source, timestamp, data, correlation_id, agent_id, history_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      id,
      input.event_type,
      input.source,
      timestamp,
      JSON.stringify(input.data),
      input.correlation_id,
      input.agent_id,
      input.history_id
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToEvent(result.rows[0]);
  }

  /**
   * Get event by ID
   */
  async findById(id: string): Promise<Event | null> {
    const query = 'SELECT * FROM events WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToEvent(result.rows[0]);
  }

  /**
   * Update an event
   */
  async update(id: string, input: UpdateEventInput): Promise<Event | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.event_type !== undefined) {
      updateFields.push(`event_type = $${paramIndex++}`);
      values.push(input.event_type);
    }
    
    if (input.source !== undefined) {
      updateFields.push(`source = $${paramIndex++}`);
      values.push(input.source);
    }
    
    if (input.data !== undefined) {
      updateFields.push(`data = $${paramIndex++}`);
      values.push(JSON.stringify(input.data));
    }
    
    if (input.correlation_id !== undefined) {
      updateFields.push(`correlation_id = $${paramIndex++}`);
      values.push(input.correlation_id);
    }
    
    if (input.agent_id !== undefined) {
      updateFields.push(`agent_id = $${paramIndex++}`);
      values.push(input.agent_id);
    }
    
    if (input.history_id !== undefined) {
      updateFields.push(`history_id = $${paramIndex++}`);
      values.push(input.history_id);
    }

    if (updateFields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    
    const query = `
      UPDATE events 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToEvent(result.rows[0]);
  }

  /**
   * Delete an event
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM events WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Find events with filters
   */
  async find(filters: EventFilters = {}): Promise<Event[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.event_type) {
      conditions.push(`event_type = $${paramIndex++}`);
      values.push(filters.event_type);
    }
    
    if (filters.source) {
      conditions.push(`source = $${paramIndex++}`);
      values.push(filters.source);
    }
    
    if (filters.agent_id) {
      conditions.push(`agent_id = $${paramIndex++}`);
      values.push(filters.agent_id);
    }
    
    if (filters.history_id) {
      conditions.push(`history_id = $${paramIndex++}`);
      values.push(filters.history_id);
    }
    
    if (filters.correlation_id) {
      conditions.push(`correlation_id = $${paramIndex++}`);
      values.push(filters.correlation_id);
    }
    
    if (filters.start_date) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      values.push(filters.start_date);
    }
    
    if (filters.end_date) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      values.push(filters.end_date);
    }

    let query = 'SELECT * FROM events';
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ' ORDER BY timestamp DESC';
    
    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(filters.limit);
    }
    
    if (filters.offset) {
      query += ` OFFSET $${paramIndex++}`;
      values.push(filters.offset);
    }

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapRowToEvent(row));
  }

  /**
   * Get events count with filters
   */
  async count(filters: EventFilters = {}): Promise<number> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.event_type) {
      conditions.push(`event_type = $${paramIndex++}`);
      values.push(filters.event_type);
    }
    
    if (filters.source) {
      conditions.push(`source = $${paramIndex++}`);
      values.push(filters.source);
    }
    
    if (filters.agent_id) {
      conditions.push(`agent_id = $${paramIndex++}`);
      values.push(filters.agent_id);
    }
    
    if (filters.history_id) {
      conditions.push(`history_id = $${paramIndex++}`);
      values.push(filters.history_id);
    }
    
    if (filters.correlation_id) {
      conditions.push(`correlation_id = $${paramIndex++}`);
      values.push(filters.correlation_id);
    }
    
    if (filters.start_date) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      values.push(filters.start_date);
    }
    
    if (filters.end_date) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      values.push(filters.end_date);
    }

    let query = 'SELECT COUNT(*) as count FROM events';
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await this.db.query(query, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * Batch create events for high-throughput scenarios
   */
  async batchCreate(inputs: CreateEventInput[]): Promise<Event[]> {
    if (inputs.length === 0) {
      return [];
    }

    const values: any[] = [];
    const valueStrings: string[] = [];
    
    inputs.forEach((input, index) => {
      const id = uuidv4();
      const timestamp = input.timestamp || new Date();
      const baseIndex = index * 8;
      
      valueStrings.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, $${baseIndex + 7}, $${baseIndex + 8})`);
      
      values.push(
        id,
        input.event_type,
        input.source,
        timestamp,
        JSON.stringify(input.data),
        input.correlation_id,
        input.agent_id,
        input.history_id
      );
    });

    const query = `
      INSERT INTO events (id, event_type, source, timestamp, data, correlation_id, agent_id, history_id)
      VALUES ${valueStrings.join(', ')}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapRowToEvent(row));
  }

  /**
   * Get events by correlation ID
   */
  async findByCorrelationId(correlationId: string): Promise<Event[]> {
    return this.find({ correlation_id: correlationId });
  }

  /**
   * Get events by agent ID
   */
  async findByAgentId(agentId: string, limit?: number): Promise<Event[]> {
    return this.find({ agent_id: agentId, limit });
  }

  /**
   * Get recent events
   */
  async getRecent(limit: number = 100): Promise<Event[]> {
    return this.find({ limit });
  }

  /**
   * Map database row to Event object
   */
  private mapRowToEvent(row: any): Event {
    return {
      id: row.id,
      event_type: row.event_type,
      source: row.source,
      timestamp: new Date(row.timestamp),
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      correlation_id: row.correlation_id,
      agent_id: row.agent_id,
      history_id: row.history_id,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}

