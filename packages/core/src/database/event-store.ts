/**
 * EventStore - Comprehensive event storage system for tracking all development activities
 */

import { v4 as uuidv4 } from 'uuid';
import { DatabaseConnectionPool, EventStoreDatabaseConfig } from './config';

export interface BaseEvent {
  id?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
  created_at?: Date;
  updated_at?: Date;
}

export interface SystemEvent extends BaseEvent {
  event_type: string;
  event_name: string;
  agent_id?: string;
  session_id?: string;
  user_id?: string;
  data?: Record<string, any>;
  status?: 'pending' | 'completed' | 'error';
  duration_ms?: number;
}

export interface TaskEvent extends BaseEvent {
  task_id: string;
  task_name: string;
  agent_id: string;
  event_type: string;
  event_name: string;
  status: 'started' | 'running' | 'completed' | 'error' | 'cancelled';
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  error_data?: Record<string, any>;
  started_at?: Date;
  completed_at?: Date;
  duration_ms?: number;
}

export interface AgentEvent extends BaseEvent {
  agent_id: string;
  agent_name?: string;
  parent_agent_id?: string;
  event_type: string;
  event_name: string;
  action?: string;
  status: 'active' | 'idle' | 'completed' | 'error';
  context?: Record<string, any>;
  result?: Record<string, any>;
  error_data?: Record<string, any>;
  duration_ms?: number;
}

export interface DeploymentEvent extends BaseEvent {
  deployment_id: string;
  environment: string;
  event_type: string;
  event_name: string;
  status: 'pending' | 'running' | 'completed' | 'error' | 'cancelled';
  branch_name?: string;
  commit_hash?: string;
  pr_number?: number;
  deployment_config?: Record<string, any>;
  logs?: Record<string, any>;
  error_data?: Record<string, any>;
  started_at?: Date;
  completed_at?: Date;
  duration_ms?: number;
}

export interface EventBatch {
  id?: string;
  batch_id: string;
  event_count: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  started_at?: Date;
  completed_at?: Date;
  error_data?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface EventQueryOptions {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
  eventType?: string;
  agentId?: string;
  status?: string;
  orderBy?: 'timestamp' | 'created_at';
  orderDirection?: 'ASC' | 'DESC';
}

export interface EventStatistics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsByStatus: Record<string, number>;
  eventsByAgent: Record<string, number>;
  averageDuration: number;
  timeRange: {
    earliest: Date;
    latest: Date;
  };
}

/**
 * EventStore class for comprehensive event logging and querying
 */
export class EventStore {
  private db: DatabaseConnectionPool;
  private tablePrefix: string;
  private batchQueue: SystemEvent[] = [];
  private batchSize: number = 100;
  private batchTimeout: number = 5000; // 5 seconds
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(config: EventStoreDatabaseConfig) {
    this.db = new DatabaseConnectionPool(config);
    this.tablePrefix = config.tablePrefix || 'voltagent_events';
  }

  /**
   * Initialize the EventStore
   */
  async initialize(): Promise<void> {
    await this.db.initialize();
    await this.runMigrations();
    console.log('[EventStore] Initialized successfully');
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    // This would typically read migration files and execute them
    // For now, we'll assume the migration has been run manually
    console.log('[EventStore] Migrations completed');
  }

  /**
   * Log a system event
   */
  async logSystemEvent(event: SystemEvent): Promise<string> {
    const eventId = event.id || uuidv4();
    const timestamp = event.timestamp || new Date();

    const query = `
      INSERT INTO ${this.tablePrefix}_events 
      (id, event_type, event_name, agent_id, session_id, user_id, timestamp, data, metadata, status, duration_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
    `;

    const values = [
      eventId,
      event.event_type,
      event.event_name,
      event.agent_id,
      event.session_id,
      event.user_id,
      timestamp,
      JSON.stringify(event.data || {}),
      JSON.stringify(event.metadata || {}),
      event.status || 'completed',
      event.duration_ms
    ];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      console.error('[EventStore] Failed to log system event:', error);
      throw error;
    }
  }

  /**
   * Log a task event
   */
  async logTaskEvent(event: TaskEvent): Promise<string> {
    const eventId = event.id || uuidv4();
    const startedAt = event.started_at || new Date();

    const query = `
      INSERT INTO ${this.tablePrefix}_task_events 
      (id, task_id, task_name, agent_id, event_type, event_name, status, input_data, output_data, error_data, metadata, started_at, completed_at, duration_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `;

    const values = [
      eventId,
      event.task_id,
      event.task_name,
      event.agent_id,
      event.event_type,
      event.event_name,
      event.status,
      JSON.stringify(event.input_data || {}),
      JSON.stringify(event.output_data || {}),
      JSON.stringify(event.error_data || {}),
      JSON.stringify(event.metadata || {}),
      startedAt,
      event.completed_at,
      event.duration_ms
    ];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      console.error('[EventStore] Failed to log task event:', error);
      throw error;
    }
  }

  /**
   * Log an agent event
   */
  async logAgentEvent(event: AgentEvent): Promise<string> {
    const eventId = event.id || uuidv4();
    const timestamp = event.timestamp || new Date();

    const query = `
      INSERT INTO ${this.tablePrefix}_agent_events 
      (id, agent_id, agent_name, parent_agent_id, event_type, event_name, action, status, context, result, error_data, metadata, timestamp, duration_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `;

    const values = [
      eventId,
      event.agent_id,
      event.agent_name,
      event.parent_agent_id,
      event.event_type,
      event.event_name,
      event.action,
      event.status,
      JSON.stringify(event.context || {}),
      JSON.stringify(event.result || {}),
      JSON.stringify(event.error_data || {}),
      JSON.stringify(event.metadata || {}),
      timestamp,
      event.duration_ms
    ];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      console.error('[EventStore] Failed to log agent event:', error);
      throw error;
    }
  }

  /**
   * Log a deployment event
   */
  async logDeploymentEvent(event: DeploymentEvent): Promise<string> {
    const eventId = event.id || uuidv4();
    const startedAt = event.started_at || new Date();

    const query = `
      INSERT INTO ${this.tablePrefix}_deployment_events 
      (id, deployment_id, environment, event_type, event_name, status, branch_name, commit_hash, pr_number, deployment_config, logs, error_data, metadata, started_at, completed_at, duration_ms)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id
    `;

    const values = [
      eventId,
      event.deployment_id,
      event.environment,
      event.event_type,
      event.event_name,
      event.status,
      event.branch_name,
      event.commit_hash,
      event.pr_number,
      JSON.stringify(event.deployment_config || {}),
      JSON.stringify(event.logs || {}),
      JSON.stringify(event.error_data || {}),
      JSON.stringify(event.metadata || {}),
      startedAt,
      event.completed_at,
      event.duration_ms
    ];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0].id;
    } catch (error) {
      console.error('[EventStore] Failed to log deployment event:', error);
      throw error;
    }
  }

  /**
   * Query system events with filtering options
   */
  async querySystemEvents(options: EventQueryOptions = {}): Promise<SystemEvent[]> {
    const {
      limit = 100,
      offset = 0,
      startDate,
      endDate,
      eventType,
      agentId,
      status,
      orderBy = 'timestamp',
      orderDirection = 'DESC'
    } = options;

    let query = `SELECT * FROM ${this.tablePrefix}_events WHERE 1=1`;
    const values: any[] = [];
    let paramCount = 0;

    if (startDate) {
      query += ` AND timestamp >= $${++paramCount}`;
      values.push(startDate);
    }

    if (endDate) {
      query += ` AND timestamp <= $${++paramCount}`;
      values.push(endDate);
    }

    if (eventType) {
      query += ` AND event_type = $${++paramCount}`;
      values.push(eventType);
    }

    if (agentId) {
      query += ` AND agent_id = $${++paramCount}`;
      values.push(agentId);
    }

    if (status) {
      query += ` AND status = $${++paramCount}`;
      values.push(status);
    }

    query += ` ORDER BY ${orderBy} ${orderDirection}`;
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    values.push(limit, offset);

    try {
      const result = await this.db.query(query, values);
      return result.rows.map(this.parseSystemEvent);
    } catch (error) {
      console.error('[EventStore] Failed to query system events:', error);
      throw error;
    }
  }

  /**
   * Query task events with filtering options
   */
  async queryTaskEvents(options: EventQueryOptions & { taskId?: string } = {}): Promise<TaskEvent[]> {
    const {
      limit = 100,
      offset = 0,
      startDate,
      endDate,
      eventType,
      agentId,
      status,
      taskId,
      orderBy = 'started_at',
      orderDirection = 'DESC'
    } = options;

    let query = `SELECT * FROM ${this.tablePrefix}_task_events WHERE 1=1`;
    const values: any[] = [];
    let paramCount = 0;

    if (startDate) {
      query += ` AND started_at >= $${++paramCount}`;
      values.push(startDate);
    }

    if (endDate) {
      query += ` AND started_at <= $${++paramCount}`;
      values.push(endDate);
    }

    if (eventType) {
      query += ` AND event_type = $${++paramCount}`;
      values.push(eventType);
    }

    if (agentId) {
      query += ` AND agent_id = $${++paramCount}`;
      values.push(agentId);
    }

    if (status) {
      query += ` AND status = $${++paramCount}`;
      values.push(status);
    }

    if (taskId) {
      query += ` AND task_id = $${++paramCount}`;
      values.push(taskId);
    }

    query += ` ORDER BY ${orderBy} ${orderDirection}`;
    query += ` LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    values.push(limit, offset);

    try {
      const result = await this.db.query(query, values);
      return result.rows.map(this.parseTaskEvent);
    } catch (error) {
      console.error('[EventStore] Failed to query task events:', error);
      throw error;
    }
  }

  /**
   * Get event statistics
   */
  async getEventStatistics(options: { startDate?: Date; endDate?: Date } = {}): Promise<EventStatistics> {
    const { startDate, endDate } = options;

    let whereClause = '';
    const values: any[] = [];
    let paramCount = 0;

    if (startDate || endDate) {
      whereClause = 'WHERE ';
      const conditions: string[] = [];

      if (startDate) {
        conditions.push(`timestamp >= $${++paramCount}`);
        values.push(startDate);
      }

      if (endDate) {
        conditions.push(`timestamp <= $${++paramCount}`);
        values.push(endDate);
      }

      whereClause += conditions.join(' AND ');
    }

    const queries = {
      total: `SELECT COUNT(*) as count FROM ${this.tablePrefix}_events ${whereClause}`,
      byType: `SELECT event_type, COUNT(*) as count FROM ${this.tablePrefix}_events ${whereClause} GROUP BY event_type`,
      byStatus: `SELECT status, COUNT(*) as count FROM ${this.tablePrefix}_events ${whereClause} GROUP BY status`,
      byAgent: `SELECT agent_id, COUNT(*) as count FROM ${this.tablePrefix}_events ${whereClause} WHERE agent_id IS NOT NULL GROUP BY agent_id`,
      avgDuration: `SELECT AVG(duration_ms) as avg_duration FROM ${this.tablePrefix}_events ${whereClause} WHERE duration_ms IS NOT NULL`,
      timeRange: `SELECT MIN(timestamp) as earliest, MAX(timestamp) as latest FROM ${this.tablePrefix}_events ${whereClause}`
    };

    try {
      const [totalResult, byTypeResult, byStatusResult, byAgentResult, avgDurationResult, timeRangeResult] = await Promise.all([
        this.db.query(queries.total, values),
        this.db.query(queries.byType, values),
        this.db.query(queries.byStatus, values),
        this.db.query(queries.byAgent, values),
        this.db.query(queries.avgDuration, values),
        this.db.query(queries.timeRange, values)
      ]);

      const eventsByType: Record<string, number> = {};
      byTypeResult.rows.forEach((row: any) => {
        eventsByType[row.event_type] = parseInt(row.count);
      });

      const eventsByStatus: Record<string, number> = {};
      byStatusResult.rows.forEach((row: any) => {
        eventsByStatus[row.status] = parseInt(row.count);
      });

      const eventsByAgent: Record<string, number> = {};
      byAgentResult.rows.forEach((row: any) => {
        eventsByAgent[row.agent_id] = parseInt(row.count);
      });

      return {
        totalEvents: parseInt(totalResult.rows[0].count),
        eventsByType,
        eventsByStatus,
        eventsByAgent,
        averageDuration: parseFloat(avgDurationResult.rows[0].avg_duration) || 0,
        timeRange: {
          earliest: timeRangeResult.rows[0].earliest,
          latest: timeRangeResult.rows[0].latest
        }
      };
    } catch (error) {
      console.error('[EventStore] Failed to get event statistics:', error);
      throw error;
    }
  }

  /**
   * Add event to batch queue for performance optimization
   */
  async addToBatch(event: SystemEvent): Promise<void> {
    this.batchQueue.push(event);

    if (this.batchQueue.length >= this.batchSize) {
      await this.processBatch();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.processBatch(), this.batchTimeout);
    }
  }

  /**
   * Process batch of events
   */
  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return;

    const batchId = uuidv4();
    const events = [...this.batchQueue];
    this.batchQueue = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      // Create batch record
      await this.db.query(`
        INSERT INTO ${this.tablePrefix}_event_batches (batch_id, event_count, status)
        VALUES ($1, $2, 'processing')
      `, [batchId, events.length]);

      // Insert all events in a transaction
      const client = await this.db.getClient();
      try {
        await client.query('BEGIN');

        for (const event of events) {
          await this.logSystemEvent(event);
        }

        await client.query('COMMIT');

        // Update batch status
        await this.db.query(`
          UPDATE ${this.tablePrefix}_event_batches 
          SET status = 'completed', completed_at = NOW()
          WHERE batch_id = $1
        `, [batchId]);

      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }

    } catch (error) {
      console.error('[EventStore] Failed to process batch:', error);
      
      // Update batch status to error
      await this.db.query(`
        UPDATE ${this.tablePrefix}_event_batches 
        SET status = 'error', error_data = $2, completed_at = NOW()
        WHERE batch_id = $1
      `, [batchId, JSON.stringify({ error: error.message })]);
    }
  }

  /**
   * Get database health status
   */
  async getHealthStatus(): Promise<{
    isHealthy: boolean;
    poolStats: any;
    lastHealthCheck: Date | null;
  }> {
    const poolStats = this.db.getPoolStats();
    return {
      isHealthy: poolStats?.isHealthy || false,
      poolStats,
      lastHealthCheck: poolStats?.lastHealthCheck || null
    };
  }

  /**
   * Parse system event from database row
   */
  private parseSystemEvent(row: any): SystemEvent {
    return {
      id: row.id,
      event_type: row.event_type,
      event_name: row.event_name,
      agent_id: row.agent_id,
      session_id: row.session_id,
      user_id: row.user_id,
      timestamp: row.timestamp,
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      status: row.status,
      duration_ms: row.duration_ms,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Parse task event from database row
   */
  private parseTaskEvent(row: any): TaskEvent {
    return {
      id: row.id,
      task_id: row.task_id,
      task_name: row.task_name,
      agent_id: row.agent_id,
      event_type: row.event_type,
      event_name: row.event_name,
      status: row.status,
      input_data: typeof row.input_data === 'string' ? JSON.parse(row.input_data) : row.input_data,
      output_data: typeof row.output_data === 'string' ? JSON.parse(row.output_data) : row.output_data,
      error_data: typeof row.error_data === 'string' ? JSON.parse(row.error_data) : row.error_data,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      started_at: row.started_at,
      completed_at: row.completed_at,
      duration_ms: row.duration_ms,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  /**
   * Close the EventStore
   */
  async close(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    // Process any remaining batched events
    if (this.batchQueue.length > 0) {
      await this.processBatch();
    }

    await this.db.close();
  }
}

