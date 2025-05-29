/**
 * Tasks Model for Task Master
 * Phase 4.1: Comprehensive Database & Event Storage Implementation
 */

import { PoolClient } from 'pg';
import { getDatabaseManager } from '../connection';

export interface Task {
  id: string;
  requirement_id?: string;
  linear_issue_id?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: number;
  assigned_to?: string;
  estimated_hours?: number;
  actual_hours?: number;
  parent_task_id?: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';

export interface CreateTaskInput {
  requirement_id?: string;
  linear_issue_id?: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: number;
  assigned_to?: string;
  estimated_hours?: number;
  actual_hours?: number;
  parent_task_id?: string;
  metadata?: Record<string, any>;
}

export interface UpdateTaskInput {
  requirement_id?: string;
  linear_issue_id?: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: number;
  assigned_to?: string;
  estimated_hours?: number;
  actual_hours?: number;
  parent_task_id?: string;
  metadata?: Record<string, any>;
}

export interface TaskFilterOptions {
  requirement_id?: string;
  linear_issue_id?: string;
  status?: TaskStatus;
  priority?: number;
  assigned_to?: string;
  parent_task_id?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

export class TasksModel {
  private dbManager = getDatabaseManager();

  /**
   * Create a new task
   */
  async create(input: CreateTaskInput): Promise<Task> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const query = `
        INSERT INTO tasks (
          requirement_id, linear_issue_id, title, description, status, 
          priority, assigned_to, estimated_hours, actual_hours, 
          parent_task_id, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const values = [
        input.requirement_id || null,
        input.linear_issue_id || null,
        input.title,
        input.description || null,
        input.status || 'pending',
        input.priority || 3,
        input.assigned_to || null,
        input.estimated_hours || null,
        input.actual_hours || null,
        input.parent_task_id || null,
        JSON.stringify(input.metadata || {}),
      ];

      const result = await client.query(query, values);
      return this.mapRowToTask(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Get task by ID
   */
  async getById(id: string): Promise<Task | null> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const query = 'SELECT * FROM tasks WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToTask(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Get task by Linear issue ID
   */
  async getByLinearIssueId(linearIssueId: string): Promise<Task | null> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const query = 'SELECT * FROM tasks WHERE linear_issue_id = $1';
      const result = await client.query(query, [linearIssueId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToTask(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Update task
   */
  async update(id: string, input: UpdateTaskInput): Promise<Task | null> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (input.requirement_id !== undefined) {
        updateFields.push(`requirement_id = $${paramIndex++}`);
        values.push(input.requirement_id);
      }
      
      if (input.linear_issue_id !== undefined) {
        updateFields.push(`linear_issue_id = $${paramIndex++}`);
        values.push(input.linear_issue_id);
      }
      
      if (input.title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        values.push(input.title);
      }
      
      if (input.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(input.description);
      }
      
      if (input.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(input.status);
      }
      
      if (input.priority !== undefined) {
        updateFields.push(`priority = $${paramIndex++}`);
        values.push(input.priority);
      }
      
      if (input.assigned_to !== undefined) {
        updateFields.push(`assigned_to = $${paramIndex++}`);
        values.push(input.assigned_to);
      }
      
      if (input.estimated_hours !== undefined) {
        updateFields.push(`estimated_hours = $${paramIndex++}`);
        values.push(input.estimated_hours);
      }
      
      if (input.actual_hours !== undefined) {
        updateFields.push(`actual_hours = $${paramIndex++}`);
        values.push(input.actual_hours);
      }
      
      if (input.parent_task_id !== undefined) {
        updateFields.push(`parent_task_id = $${paramIndex++}`);
        values.push(input.parent_task_id);
      }
      
      if (input.metadata !== undefined) {
        updateFields.push(`metadata = $${paramIndex++}`);
        values.push(JSON.stringify(input.metadata));
      }

      if (updateFields.length === 0) {
        return await this.getById(id);
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(id);

      const query = `
        UPDATE tasks 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToTask(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Delete task
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const query = 'DELETE FROM tasks WHERE id = $1';
      const result = await client.query(query, [id]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Find tasks with filters
   */
  async find(options: TaskFilterOptions = {}): Promise<Task[]> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (options.requirement_id) {
        conditions.push(`requirement_id = $${paramIndex++}`);
        values.push(options.requirement_id);
      }

      if (options.linear_issue_id) {
        conditions.push(`linear_issue_id = $${paramIndex++}`);
        values.push(options.linear_issue_id);
      }

      if (options.status) {
        conditions.push(`status = $${paramIndex++}`);
        values.push(options.status);
      }

      if (options.priority) {
        conditions.push(`priority = $${paramIndex++}`);
        values.push(options.priority);
      }

      if (options.assigned_to) {
        conditions.push(`assigned_to = $${paramIndex++}`);
        values.push(options.assigned_to);
      }

      if (options.parent_task_id !== undefined) {
        if (options.parent_task_id === null) {
          conditions.push('parent_task_id IS NULL');
        } else {
          conditions.push(`parent_task_id = $${paramIndex++}`);
          values.push(options.parent_task_id);
        }
      }

      if (options.search) {
        conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        values.push(`%${options.search}%`);
        paramIndex++;
      }

      let query = 'SELECT * FROM tasks';
      
      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }
      
      query += ' ORDER BY created_at DESC';
      
      if (options.limit) {
        query += ` LIMIT $${paramIndex++}`;
        values.push(options.limit);
      }
      
      if (options.offset) {
        query += ` OFFSET $${paramIndex++}`;
        values.push(options.offset);
      }

      const result = await client.query(query, values);
      return result.rows.map(row => this.mapRowToTask(row));
    } finally {
      client.release();
    }
  }

  /**
   * Get task hierarchy (parent and children)
   */
  async getHierarchy(id: string): Promise<{
    task: Task | null;
    parent: Task | null;
    children: Task[];
  }> {
    const task = await this.getById(id);
    if (!task) {
      return { task: null, parent: null, children: [] };
    }

    // Get parent if exists
    let parent: Task | null = null;
    if (task.parent_task_id) {
      parent = await this.getById(task.parent_task_id);
    }

    // Get children
    const children = await this.find({ parent_task_id: id });

    return { task, parent, children };
  }

  /**
   * Get tasks by requirement
   */
  async getByRequirement(requirementId: string): Promise<Task[]> {
    return await this.find({ requirement_id: requirementId });
  }

  /**
   * Get tasks assigned to user
   */
  async getAssignedToUser(userId: string): Promise<Task[]> {
    return await this.find({ assigned_to: userId });
  }

  /**
   * Get task statistics
   */
  async getStatistics(): Promise<{
    total: number;
    by_status: Record<TaskStatus, number>;
    by_priority: Record<number, number>;
    by_assignee: Record<string, number>;
    avg_estimated_hours: number;
    avg_actual_hours: number;
    completion_rate: number;
  }> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const queries = await Promise.all([
        // Total count
        client.query('SELECT COUNT(*) as total FROM tasks'),
        
        // By status
        client.query(`
          SELECT status, COUNT(*) as count 
          FROM tasks 
          GROUP BY status
        `),
        
        // By priority
        client.query(`
          SELECT priority, COUNT(*) as count 
          FROM tasks 
          GROUP BY priority
        `),
        
        // By assignee
        client.query(`
          SELECT assigned_to, COUNT(*) as count 
          FROM tasks 
          WHERE assigned_to IS NOT NULL
          GROUP BY assigned_to
        `),
        
        // Averages and completion rate
        client.query(`
          SELECT 
            AVG(estimated_hours) as avg_estimated_hours,
            AVG(actual_hours) as avg_actual_hours,
            (COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*)) as completion_rate
          FROM tasks
        `),
      ]);

      const total = parseInt(queries[0].rows[0].total);
      
      const by_status = queries[1].rows.reduce((acc, row) => {
        acc[row.status as TaskStatus] = parseInt(row.count);
        return acc;
      }, {} as Record<TaskStatus, number>);
      
      const by_priority = queries[2].rows.reduce((acc, row) => {
        acc[row.priority] = parseInt(row.count);
        return acc;
      }, {} as Record<number, number>);
      
      const by_assignee = queries[3].rows.reduce((acc, row) => {
        acc[row.assigned_to] = parseInt(row.count);
        return acc;
      }, {} as Record<string, number>);
      
      const stats = queries[4].rows[0];
      
      return {
        total,
        by_status,
        by_priority,
        by_assignee,
        avg_estimated_hours: parseFloat(stats.avg_estimated_hours) || 0,
        avg_actual_hours: parseFloat(stats.avg_actual_hours) || 0,
        completion_rate: parseFloat(stats.completion_rate) || 0,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Map database row to Task object
   */
  private mapRowToTask(row: any): Task {
    return {
      id: row.id,
      requirement_id: row.requirement_id,
      linear_issue_id: row.linear_issue_id,
      title: row.title,
      description: row.description,
      status: row.status,
      priority: row.priority,
      assigned_to: row.assigned_to,
      estimated_hours: row.estimated_hours,
      actual_hours: row.actual_hours,
      parent_task_id: row.parent_task_id,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
      metadata: row.metadata || {},
    };
  }
}

