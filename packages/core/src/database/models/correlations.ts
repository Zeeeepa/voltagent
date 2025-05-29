import { DatabaseConnection } from '../connection';
import { v4 as uuidv4 } from 'uuid';

/**
 * Correlations model for VoltAgent database
 * Phase 1.3: Setup Database Event Storage System
 */

export interface Correlation {
  id: string;
  task_id?: string;
  linear_issue_id?: string;
  github_pr_number?: number;
  correlation_type: CorrelationType;
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export type CorrelationType = 'linear_issue' | 'github_pr' | 'task_dependency' | 'event_correlation';

export interface CreateCorrelationInput {
  task_id?: string;
  linear_issue_id?: string;
  github_pr_number?: number;
  correlation_type: CorrelationType;
  metadata?: Record<string, any>;
}

export interface UpdateCorrelationInput {
  task_id?: string;
  linear_issue_id?: string;
  github_pr_number?: number;
  correlation_type?: CorrelationType;
  metadata?: Record<string, any>;
}

export interface CorrelationFilters {
  task_id?: string;
  linear_issue_id?: string;
  github_pr_number?: number;
  correlation_type?: CorrelationType;
  limit?: number;
  offset?: number;
}

export class CorrelationsModel {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * Create a new correlation
   */
  async create(input: CreateCorrelationInput): Promise<Correlation> {
    // Validate that at least one identifier is provided
    if (!input.task_id && !input.linear_issue_id && !input.github_pr_number) {
      throw new Error('At least one identifier (task_id, linear_issue_id, or github_pr_number) must be provided');
    }

    const id = uuidv4();
    
    const query = `
      INSERT INTO correlations (id, task_id, linear_issue_id, github_pr_number, correlation_type, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      id,
      input.task_id || null,
      input.linear_issue_id || null,
      input.github_pr_number || null,
      input.correlation_type,
      JSON.stringify(input.metadata || {})
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToCorrelation(result.rows[0]);
  }

  /**
   * Get correlation by ID
   */
  async findById(id: string): Promise<Correlation | null> {
    const query = 'SELECT * FROM correlations WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToCorrelation(result.rows[0]);
  }

  /**
   * Update a correlation
   */
  async update(id: string, input: UpdateCorrelationInput): Promise<Correlation | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.task_id !== undefined) {
      updateFields.push(`task_id = $${paramIndex++}`);
      values.push(input.task_id);
    }
    
    if (input.linear_issue_id !== undefined) {
      updateFields.push(`linear_issue_id = $${paramIndex++}`);
      values.push(input.linear_issue_id);
    }
    
    if (input.github_pr_number !== undefined) {
      updateFields.push(`github_pr_number = $${paramIndex++}`);
      values.push(input.github_pr_number);
    }
    
    if (input.correlation_type !== undefined) {
      updateFields.push(`correlation_type = $${paramIndex++}`);
      values.push(input.correlation_type);
    }
    
    if (input.metadata !== undefined) {
      updateFields.push(`metadata = $${paramIndex++}`);
      values.push(JSON.stringify(input.metadata));
    }

    if (updateFields.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    
    const query = `
      UPDATE correlations 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToCorrelation(result.rows[0]);
  }

  /**
   * Delete a correlation
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM correlations WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Find correlations with filters
   */
  async find(filters: CorrelationFilters = {}): Promise<Correlation[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.task_id) {
      conditions.push(`task_id = $${paramIndex++}`);
      values.push(filters.task_id);
    }
    
    if (filters.linear_issue_id) {
      conditions.push(`linear_issue_id = $${paramIndex++}`);
      values.push(filters.linear_issue_id);
    }
    
    if (filters.github_pr_number) {
      conditions.push(`github_pr_number = $${paramIndex++}`);
      values.push(filters.github_pr_number);
    }
    
    if (filters.correlation_type) {
      conditions.push(`correlation_type = $${paramIndex++}`);
      values.push(filters.correlation_type);
    }

    let query = 'SELECT * FROM correlations';
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      values.push(filters.limit);
    }
    
    if (filters.offset) {
      query += ` OFFSET $${paramIndex++}`;
      values.push(filters.offset);
    }

    const result = await this.db.query(query, values);
    return result.rows.map(row => this.mapRowToCorrelation(row));
  }

  /**
   * Get correlations count with filters
   */
  async count(filters: CorrelationFilters = {}): Promise<number> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.task_id) {
      conditions.push(`task_id = $${paramIndex++}`);
      values.push(filters.task_id);
    }
    
    if (filters.linear_issue_id) {
      conditions.push(`linear_issue_id = $${paramIndex++}`);
      values.push(filters.linear_issue_id);
    }
    
    if (filters.github_pr_number) {
      conditions.push(`github_pr_number = $${paramIndex++}`);
      values.push(filters.github_pr_number);
    }
    
    if (filters.correlation_type) {
      conditions.push(`correlation_type = $${paramIndex++}`);
      values.push(filters.correlation_type);
    }

    let query = 'SELECT COUNT(*) as count FROM correlations';
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await this.db.query(query, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get correlations by task ID
   */
  async findByTaskId(taskId: string): Promise<Correlation[]> {
    return this.find({ task_id: taskId });
  }

  /**
   * Get correlations by Linear issue ID
   */
  async findByLinearIssueId(linearIssueId: string): Promise<Correlation[]> {
    return this.find({ linear_issue_id: linearIssueId });
  }

  /**
   * Get correlations by GitHub PR number
   */
  async findByGithubPrNumber(prNumber: number): Promise<Correlation[]> {
    return this.find({ github_pr_number: prNumber });
  }

  /**
   * Get correlations by type
   */
  async findByType(type: CorrelationType): Promise<Correlation[]> {
    return this.find({ correlation_type: type });
  }

  /**
   * Create Linear issue correlation
   */
  async createLinearIssueCorrelation(
    taskId: string, 
    linearIssueId: string, 
    metadata?: Record<string, any>
  ): Promise<Correlation> {
    return this.create({
      task_id: taskId,
      linear_issue_id: linearIssueId,
      correlation_type: 'linear_issue',
      metadata
    });
  }

  /**
   * Create GitHub PR correlation
   */
  async createGithubPrCorrelation(
    taskId: string, 
    prNumber: number, 
    metadata?: Record<string, any>
  ): Promise<Correlation> {
    return this.create({
      task_id: taskId,
      github_pr_number: prNumber,
      correlation_type: 'github_pr',
      metadata
    });
  }

  /**
   * Create task dependency correlation
   */
  async createTaskDependencyCorrelation(
    taskId: string, 
    dependentTaskId: string, 
    metadata?: Record<string, any>
  ): Promise<Correlation> {
    return this.create({
      task_id: taskId,
      correlation_type: 'task_dependency',
      metadata: {
        ...metadata,
        dependent_task_id: dependentTaskId
      }
    });
  }

  /**
   * Create event correlation
   */
  async createEventCorrelation(
    taskId: string, 
    eventId: string, 
    metadata?: Record<string, any>
  ): Promise<Correlation> {
    return this.create({
      task_id: taskId,
      correlation_type: 'event_correlation',
      metadata: {
        ...metadata,
        event_id: eventId
      }
    });
  }

  /**
   * Find task by Linear issue ID
   */
  async findTaskByLinearIssue(linearIssueId: string): Promise<string | null> {
    const correlations = await this.findByLinearIssueId(linearIssueId);
    const taskCorrelation = correlations.find(c => c.task_id);
    return taskCorrelation?.task_id || null;
  }

  /**
   * Find task by GitHub PR number
   */
  async findTaskByGithubPr(prNumber: number): Promise<string | null> {
    const correlations = await this.findByGithubPrNumber(prNumber);
    const taskCorrelation = correlations.find(c => c.task_id);
    return taskCorrelation?.task_id || null;
  }

  /**
   * Find Linear issue by task ID
   */
  async findLinearIssueByTask(taskId: string): Promise<string | null> {
    const correlations = await this.findByTaskId(taskId);
    const linearCorrelation = correlations.find(c => c.correlation_type === 'linear_issue' && c.linear_issue_id);
    return linearCorrelation?.linear_issue_id || null;
  }

  /**
   * Find GitHub PR by task ID
   */
  async findGithubPrByTask(taskId: string): Promise<number | null> {
    const correlations = await this.findByTaskId(taskId);
    const prCorrelation = correlations.find(c => c.correlation_type === 'github_pr' && c.github_pr_number);
    return prCorrelation?.github_pr_number || null;
  }

  /**
   * Get correlation statistics
   */
  async getCorrelationStats(): Promise<{
    total: number;
    by_type: Record<CorrelationType, number>;
  }> {
    const totalQuery = 'SELECT COUNT(*) as count FROM correlations';
    const totalResult = await this.db.query(totalQuery);
    
    const typeQuery = `
      SELECT correlation_type, COUNT(*) as count 
      FROM correlations 
      GROUP BY correlation_type
    `;
    const typeResult = await this.db.query(typeQuery);
    
    const byType: Record<CorrelationType, number> = {
      linear_issue: 0,
      github_pr: 0,
      task_dependency: 0,
      event_correlation: 0
    };
    
    typeResult.rows.forEach(row => {
      byType[row.correlation_type as CorrelationType] = parseInt(row.count);
    });
    
    return {
      total: parseInt(totalResult.rows[0].count),
      by_type: byType
    };
  }

  /**
   * Map database row to Correlation object
   */
  private mapRowToCorrelation(row: any): Correlation {
    return {
      id: row.id,
      task_id: row.task_id,
      linear_issue_id: row.linear_issue_id,
      github_pr_number: row.github_pr_number,
      correlation_type: row.correlation_type as CorrelationType,
      metadata: typeof row.metadata === 'string' 
        ? JSON.parse(row.metadata) 
        : row.metadata,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}

