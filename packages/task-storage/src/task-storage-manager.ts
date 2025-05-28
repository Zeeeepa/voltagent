import { v4 as uuidv4 } from 'uuid';
import { DatabaseConnection } from './database/connection';
import type {
  Task,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter,
  TaskDependency,
  AIInteraction,
  ValidationResult,
  PerformanceMetric,
  TaskAnalytics,
  TaskStorageOptions,
  DatabaseConfig,
  DependencyType,
  InteractionType,
  ValidationType,
  MetricType,
} from './types';

export class TaskStorageManager {
  private db: DatabaseConnection;
  private options: TaskStorageOptions;

  constructor(config: DatabaseConfig | TaskStorageOptions) {
    if ('database' in config) {
      this.options = config;
      this.db = new DatabaseConnection(config.database);
    } else {
      this.options = {
        database: config,
        enableQueryLogging: false,
        enableSlowQueryLogging: true,
        slowQueryThresholdMs: 1000,
        enableConnectionPooling: true,
      };
      this.db = new DatabaseConnection(config);
    }
  }

  /**
   * Initialize the task storage system
   */
  async initialize(): Promise<void> {
    await this.db.initialize();
  }

  /**
   * Create a new task
   */
  async createTask(input: CreateTaskInput): Promise<Task> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO tasks (
        id, title, description, requirements, acceptance_criteria, affected_files,
        complexity_score, priority, assigned_to, tags, metadata, estimated_hours,
        parent_task_id, project_id, workflow_id, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      ) RETURNING *
    `;

    const params = [
      id,
      input.title,
      input.description || null,
      JSON.stringify(input.requirements || {}),
      JSON.stringify(input.acceptance_criteria || {}),
      input.affected_files || [],
      input.complexity_score || null,
      input.priority || 'medium',
      input.assigned_to || null,
      input.tags || [],
      JSON.stringify(input.metadata || {}),
      input.estimated_hours || null,
      input.parent_task_id || null,
      input.project_id || null,
      input.workflow_id || null,
      now,
      now,
    ];

    const result = await this.db.queryOne<Task>(query, params);
    if (!result) {
      throw new Error('Failed to create task');
    }

    return this.mapTaskFromDb(result);
  }

  /**
   * Get a task by ID
   */
  async getTask(id: string): Promise<Task | null> {
    const query = 'SELECT * FROM tasks WHERE id = $1';
    const result = await this.db.queryOne<any>(query, [id]);
    
    if (!result) {
      return null;
    }

    return this.mapTaskFromDb(result);
  }

  /**
   * Update a task
   */
  async updateTask(id: string, updates: UpdateTaskInput): Promise<Task> {
    const setParts: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Build dynamic update query
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'requirements' || key === 'acceptance_criteria' || key === 'metadata') {
          setParts.push(`${key} = $${paramIndex}`);
          params.push(JSON.stringify(value));
        } else {
          setParts.push(`${key} = $${paramIndex}`);
          params.push(value);
        }
        paramIndex++;
      }
    });

    if (setParts.length === 0) {
      throw new Error('No updates provided');
    }

    setParts.push(`updated_at = $${paramIndex}`);
    params.push(new Date());
    paramIndex++;

    params.push(id); // For WHERE clause

    const query = `
      UPDATE tasks 
      SET ${setParts.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.queryOne<any>(query, params);
    if (!result) {
      throw new Error('Task not found');
    }

    return this.mapTaskFromDb(result);
  }

  /**
   * Update task status with context
   */
  async updateTaskStatus(id: string, status: string, context?: Record<string, any>): Promise<Task> {
    return this.db.transaction(async (client) => {
      // Update task status
      const updateQuery = `
        UPDATE tasks 
        SET status = $1, updated_at = $2
        WHERE id = $3
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, [status, new Date(), id]);
      if (result.rows.length === 0) {
        throw new Error('Task not found');
      }

      // Store context if provided
      if (context) {
        const contextQuery = `
          INSERT INTO task_context (task_id, context_type, context_data)
          VALUES ($1, $2, $3)
        `;
        await client.query(contextQuery, [id, 'status_change', JSON.stringify(context)]);
      }

      return this.mapTaskFromDb(result.rows[0]);
    });
  }

  /**
   * Delete a task
   */
  async deleteTask(id: string): Promise<void> {
    const query = 'DELETE FROM tasks WHERE id = $1';
    await this.db.query(query, [id]);
  }

  /**
   * Get tasks with filtering
   */
  async getTasks(filter: TaskFilter = {}, limit = 100, offset = 0): Promise<Task[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (filter.status) {
      if (Array.isArray(filter.status)) {
        conditions.push(`status = ANY($${paramIndex})`);
        params.push(filter.status);
      } else {
        conditions.push(`status = $${paramIndex}`);
        params.push(filter.status);
      }
      paramIndex++;
    }

    if (filter.priority) {
      if (Array.isArray(filter.priority)) {
        conditions.push(`priority = ANY($${paramIndex})`);
        params.push(filter.priority);
      } else {
        conditions.push(`priority = $${paramIndex}`);
        params.push(filter.priority);
      }
      paramIndex++;
    }

    if (filter.assigned_to) {
      conditions.push(`assigned_to = $${paramIndex}`);
      params.push(filter.assigned_to);
      paramIndex++;
    }

    if (filter.project_id) {
      conditions.push(`project_id = $${paramIndex}`);
      params.push(filter.project_id);
      paramIndex++;
    }

    if (filter.workflow_id) {
      conditions.push(`workflow_id = $${paramIndex}`);
      params.push(filter.workflow_id);
      paramIndex++;
    }

    if (filter.parent_task_id) {
      conditions.push(`parent_task_id = $${paramIndex}`);
      params.push(filter.parent_task_id);
      paramIndex++;
    }

    if (filter.tags && filter.tags.length > 0) {
      conditions.push(`tags && $${paramIndex}`);
      params.push(filter.tags);
      paramIndex++;
    }

    if (filter.created_after) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(filter.created_after);
      paramIndex++;
    }

    if (filter.created_before) {
      conditions.push(`created_at <= $${paramIndex}`);
      params.push(filter.created_before);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    params.push(limit, offset);
    const query = `
      SELECT * FROM tasks 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const results = await this.db.query<any>(query, params);
    return results.map(row => this.mapTaskFromDb(row));
  }

  /**
   * Create task dependency
   */
  async createTaskDependency(
    parentTaskId: string,
    childTaskId: string,
    dependencyType: DependencyType = 'blocks',
    metadata?: Record<string, any>
  ): Promise<TaskDependency> {
    const id = uuidv4();
    const query = `
      INSERT INTO task_dependencies (id, parent_task_id, child_task_id, dependency_type, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const params = [id, parentTaskId, childTaskId, dependencyType, JSON.stringify(metadata || {})];
    const result = await this.db.queryOne<any>(query, params);
    
    if (!result) {
      throw new Error('Failed to create task dependency');
    }

    return {
      id: result.id,
      parent_task_id: result.parent_task_id,
      child_task_id: result.child_task_id,
      dependency_type: result.dependency_type,
      created_at: result.created_at,
      metadata: result.metadata,
    };
  }

  /**
   * Store AI interaction
   */
  async storeAIInteraction(
    taskId: string,
    agentName: string,
    interactionType: InteractionType,
    requestData?: Record<string, any>,
    responseData?: Record<string, any>,
    executionTimeMs?: number,
    success = true,
    sessionId?: string,
    workflowStep?: string
  ): Promise<AIInteraction> {
    const id = uuidv4();
    const query = `
      INSERT INTO ai_interactions (
        id, task_id, agent_name, interaction_type, request_data, response_data,
        execution_time_ms, success, session_id, workflow_step
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const params = [
      id, taskId, agentName, interactionType,
      requestData ? JSON.stringify(requestData) : null,
      responseData ? JSON.stringify(responseData) : null,
      executionTimeMs, success, sessionId, workflowStep
    ];

    const result = await this.db.queryOne<any>(query, params);
    if (!result) {
      throw new Error('Failed to store AI interaction');
    }

    return {
      id: result.id,
      task_id: result.task_id,
      agent_name: result.agent_name,
      interaction_type: result.interaction_type,
      request_data: result.request_data,
      response_data: result.response_data,
      execution_time_ms: result.execution_time_ms,
      success: result.success,
      created_at: result.created_at,
      session_id: result.session_id,
      workflow_step: result.workflow_step,
    };
  }

  /**
   * Store validation result
   */
  async storeValidationResult(
    taskId: string,
    validationType: ValidationType,
    validatorName: string,
    status: string,
    score?: number,
    details?: Record<string, any>,
    suggestions?: Record<string, any>
  ): Promise<ValidationResult> {
    const id = uuidv4();
    const query = `
      INSERT INTO validation_results (
        id, task_id, validation_type, validator_name, status, score, details, suggestions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const params = [
      id, taskId, validationType, validatorName, status, score,
      details ? JSON.stringify(details) : null,
      suggestions ? JSON.stringify(suggestions) : null
    ];

    const result = await this.db.queryOne<any>(query, params);
    if (!result) {
      throw new Error('Failed to store validation result');
    }

    return {
      id: result.id,
      task_id: result.task_id,
      validation_type: result.validation_type,
      validator_name: result.validator_name,
      status: result.status,
      score: result.score,
      details: result.details,
      suggestions: result.suggestions,
      created_at: result.created_at,
    };
  }

  /**
   * Store performance metric
   */
  async storePerformanceMetric(
    taskId: string,
    metricType: MetricType,
    metricName: string,
    metricValue: number,
    unit?: string,
    metadata?: Record<string, any>
  ): Promise<PerformanceMetric> {
    const id = uuidv4();
    const query = `
      INSERT INTO performance_metrics (
        id, task_id, metric_type, metric_name, metric_value, unit, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const params = [id, taskId, metricType, metricName, metricValue, unit, JSON.stringify(metadata || {})];
    const result = await this.db.queryOne<any>(query, params);
    
    if (!result) {
      throw new Error('Failed to store performance metric');
    }

    return {
      id: result.id,
      task_id: result.task_id,
      metric_type: result.metric_type,
      metric_name: result.metric_name,
      metric_value: result.metric_value,
      unit: result.unit,
      timestamp: result.timestamp,
      metadata: result.metadata,
    };
  }

  /**
   * Get task analytics
   */
  async getTaskAnalytics(filter: TaskFilter = {}): Promise<TaskAnalytics> {
    // Get basic analytics from the view
    const analyticsQuery = 'SELECT * FROM task_analytics_summary';
    const analytics = await this.db.queryOne<any>(analyticsQuery);

    // Get tasks by status
    const statusQuery = `
      SELECT status, COUNT(*) as count 
      FROM tasks 
      GROUP BY status
    `;
    const statusResults = await this.db.query<any>(statusQuery);
    const tasksByStatus = statusResults.reduce((acc, row) => {
      acc[row.status] = parseInt(row.count);
      return acc;
    }, {});

    // Get tasks by priority
    const priorityQuery = `
      SELECT priority, COUNT(*) as count 
      FROM tasks 
      GROUP BY priority
    `;
    const priorityResults = await this.db.query<any>(priorityQuery);
    const tasksByPriority = priorityResults.reduce((acc, row) => {
      acc[row.priority] = parseInt(row.count);
      return acc;
    }, {});

    // Get most common tags
    const tagsQuery = `
      SELECT unnest(tags) as tag, COUNT(*) as count
      FROM tasks
      WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 10
    `;
    const tagsResults = await this.db.query<any>(tagsQuery);
    const mostCommonTags = tagsResults.map(row => ({
      tag: row.tag,
      count: parseInt(row.count)
    }));

    // Get performance trends (last 30 days)
    const trendsQuery = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) FILTER (WHERE status = 'completed') as average_time
      FROM tasks
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `;
    const trendsResults = await this.db.query<any>(trendsQuery);
    const performanceTrends = trendsResults.map(row => ({
      date: row.date,
      completed_tasks: parseInt(row.completed_tasks || 0),
      average_time: parseFloat(row.average_time || 0)
    }));

    return {
      total_tasks: analytics?.total_tasks || 0,
      tasks_by_status: tasksByStatus,
      tasks_by_priority: tasksByPriority,
      average_completion_time: analytics?.avg_completion_hours || 0,
      success_rate: analytics?.success_rate || 0,
      most_common_tags: mostCommonTags,
      performance_trends: performanceTrends,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    return this.db.healthCheck();
  }

  /**
   * Get connection pool statistics
   */
  getPoolStats() {
    return this.db.getPoolStats();
  }

  /**
   * Close the connection
   */
  async close(): Promise<void> {
    await this.db.close();
  }

  /**
   * Map database row to Task object
   */
  private mapTaskFromDb(row: any): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      requirements: row.requirements,
      acceptance_criteria: row.acceptance_criteria,
      affected_files: row.affected_files || [],
      complexity_score: row.complexity_score,
      status: row.status,
      priority: row.priority,
      created_at: row.created_at,
      updated_at: row.updated_at,
      assigned_to: row.assigned_to,
      tags: row.tags || [],
      metadata: row.metadata,
      estimated_hours: row.estimated_hours,
      actual_hours: row.actual_hours,
      parent_task_id: row.parent_task_id,
      project_id: row.project_id,
      workflow_id: row.workflow_id,
    };
  }

  /**
   * Create a TaskStorageManager from environment variables
   */
  static fromEnvironment(): TaskStorageManager {
    const db = DatabaseConnection.fromEnvironment();
    return new TaskStorageManager(db.config);
  }
}

