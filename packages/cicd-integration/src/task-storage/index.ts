import { Pool, PoolClient } from 'pg';
import { 
  Task, 
  TaskStatus, 
  TaskType, 
  TaskPriority, 
  PipelineContext, 
  PipelineStatus,
  TaskArtifact,
  ArtifactType 
} from '../types';

export interface TaskStorageConfig {
  connectionString: string;
  maxConnections: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  enableLogging: boolean;
}

export interface TaskQuery {
  pipelineId?: string;
  status?: TaskStatus[];
  type?: TaskType[];
  priority?: TaskPriority[];
  assignee?: string;
  parentTaskId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'status';
  sortOrder?: 'ASC' | 'DESC';
}

export interface TaskUpdate {
  status?: TaskStatus;
  assignee?: string;
  description?: string;
  priority?: TaskPriority;
  completedAt?: Date;
}

export class PostgreSQLTaskStorage {
  private pool: Pool;
  private config: TaskStorageConfig;

  constructor(config: TaskStorageConfig) {
    this.config = config;
    this.pool = new Pool({
      connectionString: config.connectionString,
      max: config.maxConnections,
      idleTimeoutMillis: config.idleTimeoutMillis,
      connectionTimeoutMillis: config.connectionTimeoutMillis,
      log: config.enableLogging ? console.log : undefined
    });
  }

  /**
   * Initialize the database schema
   */
  async initialize(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await this.createTables(client);
      await this.createIndexes(client);
    } finally {
      client.release();
    }
  }

  /**
   * Create a new pipeline context
   */
  async createPipeline(pipeline: Omit<PipelineContext, 'createdAt' | 'updatedAt'>): Promise<PipelineContext> {
    const client = await this.pool.connect();
    try {
      const now = new Date();
      const query = `
        INSERT INTO pipelines (id, user_id, project_id, requirements, status, metadata, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        pipeline.id,
        pipeline.userId,
        pipeline.projectId,
        JSON.stringify(pipeline.requirements),
        pipeline.status,
        JSON.stringify(pipeline.metadata),
        now,
        now
      ];

      const result = await client.query(query, values);
      return this.mapPipelineRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Update pipeline status
   */
  async updatePipeline(id: string, updates: Partial<PipelineContext>): Promise<PipelineContext | null> {
    const client = await this.pool.connect();
    try {
      const setParts = [];
      const values = [];
      let paramIndex = 1;

      if (updates.status !== undefined) {
        setParts.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      if (updates.metadata !== undefined) {
        setParts.push(`metadata = $${paramIndex++}`);
        values.push(JSON.stringify(updates.metadata));
      }
      
      setParts.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      values.push(id);

      const query = `
        UPDATE pipelines 
        SET ${setParts.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      return result.rows.length > 0 ? this.mapPipelineRow(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /**
   * Get pipeline by ID
   */
  async getPipeline(id: string): Promise<PipelineContext | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM pipelines WHERE id = $1';
      const result = await client.query(query, [id]);
      return result.rows.length > 0 ? this.mapPipelineRow(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /**
   * Create a new task
   */
  async createTask(task: Omit<Task, 'createdAt' | 'updatedAt'>): Promise<Task> {
    const client = await this.pool.connect();
    try {
      const now = new Date();
      const query = `
        INSERT INTO tasks (
          id, pipeline_id, parent_task_id, type, title, description, 
          status, priority, assignee, dependencies, artifacts, context, 
          created_at, updated_at, completed_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `;
      
      const values = [
        task.id,
        task.pipelineId,
        task.parentTaskId || null,
        task.type,
        task.title,
        task.description,
        task.status,
        task.priority,
        task.assignee || null,
        JSON.stringify(task.dependencies),
        JSON.stringify(task.artifacts),
        JSON.stringify(task.context),
        now,
        now,
        task.completedAt || null
      ];

      const result = await client.query(query, values);
      return this.mapTaskRow(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Update a task
   */
  async updateTask(id: string, updates: TaskUpdate): Promise<Task | null> {
    const client = await this.pool.connect();
    try {
      const setParts = [];
      const values = [];
      let paramIndex = 1;

      if (updates.status !== undefined) {
        setParts.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }
      if (updates.assignee !== undefined) {
        setParts.push(`assignee = $${paramIndex++}`);
        values.push(updates.assignee);
      }
      if (updates.description !== undefined) {
        setParts.push(`description = $${paramIndex++}`);
        values.push(updates.description);
      }
      if (updates.priority !== undefined) {
        setParts.push(`priority = $${paramIndex++}`);
        values.push(updates.priority);
      }
      if (updates.completedAt !== undefined) {
        setParts.push(`completed_at = $${paramIndex++}`);
        values.push(updates.completedAt);
      }
      
      setParts.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      values.push(id);

      const query = `
        UPDATE tasks 
        SET ${setParts.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      return result.rows.length > 0 ? this.mapTaskRow(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /**
   * Get task by ID
   */
  async getTask(id: string): Promise<Task | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM tasks WHERE id = $1';
      const result = await client.query(query, [id]);
      return result.rows.length > 0 ? this.mapTaskRow(result.rows[0]) : null;
    } finally {
      client.release();
    }
  }

  /**
   * Query tasks with filters
   */
  async queryTasks(query: TaskQuery): Promise<{ tasks: Task[]; total: number }> {
    const client = await this.pool.connect();
    try {
      const conditions = [];
      const values = [];
      let paramIndex = 1;

      if (query.pipelineId) {
        conditions.push(`pipeline_id = $${paramIndex++}`);
        values.push(query.pipelineId);
      }
      if (query.status && query.status.length > 0) {
        conditions.push(`status = ANY($${paramIndex++})`);
        values.push(query.status);
      }
      if (query.type && query.type.length > 0) {
        conditions.push(`type = ANY($${paramIndex++})`);
        values.push(query.type);
      }
      if (query.priority && query.priority.length > 0) {
        conditions.push(`priority = ANY($${paramIndex++})`);
        values.push(query.priority);
      }
      if (query.assignee) {
        conditions.push(`assignee = $${paramIndex++}`);
        values.push(query.assignee);
      }
      if (query.parentTaskId) {
        conditions.push(`parent_task_id = $${paramIndex++}`);
        values.push(query.parentTaskId);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const sortBy = query.sortBy || 'created_at';
      const sortOrder = query.sortOrder || 'DESC';
      const limit = query.limit || 50;
      const offset = query.offset || 0;

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM tasks ${whereClause}`;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get tasks
      const tasksQuery = `
        SELECT * FROM tasks 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      values.push(limit, offset);

      const tasksResult = await client.query(tasksQuery, values);
      const tasks = tasksResult.rows.map(row => this.mapTaskRow(row));

      return { tasks, total };
    } finally {
      client.release();
    }
  }

  /**
   * Add artifact to task
   */
  async addTaskArtifact(taskId: string, artifact: TaskArtifact): Promise<void> {
    const client = await this.pool.connect();
    try {
      const task = await this.getTask(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      const updatedArtifacts = [...task.artifacts, artifact];
      
      const query = `
        UPDATE tasks 
        SET artifacts = $1, updated_at = $2
        WHERE id = $3
      `;
      
      await client.query(query, [JSON.stringify(updatedArtifacts), new Date(), taskId]);
    } finally {
      client.release();
    }
  }

  /**
   * Get task dependencies (recursive)
   */
  async getTaskDependencies(taskId: string): Promise<Task[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        WITH RECURSIVE task_deps AS (
          SELECT * FROM tasks WHERE id = $1
          UNION ALL
          SELECT t.* FROM tasks t
          INNER JOIN task_deps td ON t.id = ANY(
            SELECT jsonb_array_elements_text(td.dependencies::jsonb)
          )
        )
        SELECT * FROM task_deps WHERE id != $1
      `;
      
      const result = await client.query(query, [taskId]);
      return result.rows.map(row => this.mapTaskRow(row));
    } finally {
      client.release();
    }
  }

  /**
   * Get task hierarchy (parent and children)
   */
  async getTaskHierarchy(taskId: string): Promise<{ parent?: Task; children: Task[] }> {
    const client = await this.pool.connect();
    try {
      const task = await this.getTask(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      let parent: Task | undefined;
      if (task.parentTaskId) {
        parent = await this.getTask(task.parentTaskId) || undefined;
      }

      const childrenQuery = 'SELECT * FROM tasks WHERE parent_task_id = $1';
      const childrenResult = await client.query(childrenQuery, [taskId]);
      const children = childrenResult.rows.map(row => this.mapTaskRow(row));

      return { parent, children };
    } finally {
      client.release();
    }
  }

  /**
   * Close the connection pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }

  private async createTables(client: PoolClient): Promise<void> {
    // Create pipelines table
    await client.query(`
      CREATE TABLE IF NOT EXISTS pipelines (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        project_id VARCHAR(255) NOT NULL,
        requirements JSONB NOT NULL,
        status VARCHAR(50) NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL
      )
    `);

    // Create tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(255) PRIMARY KEY,
        pipeline_id VARCHAR(255) NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
        parent_task_id VARCHAR(255) REFERENCES tasks(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(500) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) NOT NULL,
        priority VARCHAR(50) NOT NULL,
        assignee VARCHAR(255),
        dependencies JSONB DEFAULT '[]',
        artifacts JSONB DEFAULT '[]',
        context JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE
      )
    `);

    // Create task_metrics table for analytics
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_metrics (
        id SERIAL PRIMARY KEY,
        task_id VARCHAR(255) NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        metric_name VARCHAR(100) NOT NULL,
        metric_value NUMERIC NOT NULL,
        recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      )
    `);
  }

  private async createIndexes(client: PoolClient): Promise<void> {
    // Pipeline indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_pipelines_user_id ON pipelines(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pipelines_project_id ON pipelines(project_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pipelines_status ON pipelines(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_pipelines_created_at ON pipelines(created_at)');

    // Task indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_pipeline_id ON tasks(pipeline_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at)');

    // Task metrics indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_task_metrics_task_id ON task_metrics(task_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_task_metrics_name ON task_metrics(metric_name)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_task_metrics_recorded_at ON task_metrics(recorded_at)');
  }

  private mapPipelineRow(row: any): PipelineContext {
    return {
      id: row.id,
      userId: row.user_id,
      projectId: row.project_id,
      requirements: JSON.parse(row.requirements),
      status: row.status as PipelineStatus,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      metadata: JSON.parse(row.metadata)
    };
  }

  private mapTaskRow(row: any): Task {
    return {
      id: row.id,
      pipelineId: row.pipeline_id,
      parentTaskId: row.parent_task_id,
      type: row.type as TaskType,
      title: row.title,
      description: row.description,
      status: row.status as TaskStatus,
      priority: row.priority as TaskPriority,
      assignee: row.assignee,
      dependencies: JSON.parse(row.dependencies),
      artifacts: JSON.parse(row.artifacts),
      context: JSON.parse(row.context),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined
    };
  }
}

export { TaskStorageConfig, TaskQuery, TaskUpdate };

