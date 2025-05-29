/**
 * Requirements Model for Task Master
 * Phase 4.1: Comprehensive Database & Event Storage Implementation
 */

import { PoolClient } from 'pg';
import { getDatabaseManager } from '../connection';

export interface Requirement {
  id: string;
  title: string;
  description?: string;
  priority: number;
  complexity_score?: number;
  estimated_hours?: number;
  status: RequirementStatus;
  parent_id?: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export type RequirementStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';

export interface CreateRequirementInput {
  title: string;
  description?: string;
  priority?: number;
  complexity_score?: number;
  estimated_hours?: number;
  status?: RequirementStatus;
  parent_id?: string;
  metadata?: Record<string, any>;
}

export interface UpdateRequirementInput {
  title?: string;
  description?: string;
  priority?: number;
  complexity_score?: number;
  estimated_hours?: number;
  status?: RequirementStatus;
  parent_id?: string;
  metadata?: Record<string, any>;
}

export interface RequirementFilterOptions {
  status?: RequirementStatus;
  priority?: number;
  parent_id?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

export class RequirementsModel {
  private dbManager = getDatabaseManager();

  /**
   * Create a new requirement
   */
  async create(input: CreateRequirementInput): Promise<Requirement> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const query = `
        INSERT INTO requirements (
          title, description, priority, complexity_score, 
          estimated_hours, status, parent_id, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        input.title,
        input.description || null,
        input.priority || 3,
        input.complexity_score || null,
        input.estimated_hours || null,
        input.status || 'pending',
        input.parent_id || null,
        JSON.stringify(input.metadata || {}),
      ];

      const result = await client.query(query, values);
      return this.mapRowToRequirement(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Get requirement by ID
   */
  async getById(id: string): Promise<Requirement | null> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const query = 'SELECT * FROM requirements WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToRequirement(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Update requirement
   */
  async update(id: string, input: UpdateRequirementInput): Promise<Requirement | null> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (input.title !== undefined) {
        updateFields.push(`title = $${paramIndex++}`);
        values.push(input.title);
      }
      
      if (input.description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        values.push(input.description);
      }
      
      if (input.priority !== undefined) {
        updateFields.push(`priority = $${paramIndex++}`);
        values.push(input.priority);
      }
      
      if (input.complexity_score !== undefined) {
        updateFields.push(`complexity_score = $${paramIndex++}`);
        values.push(input.complexity_score);
      }
      
      if (input.estimated_hours !== undefined) {
        updateFields.push(`estimated_hours = $${paramIndex++}`);
        values.push(input.estimated_hours);
      }
      
      if (input.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(input.status);
      }
      
      if (input.parent_id !== undefined) {
        updateFields.push(`parent_id = $${paramIndex++}`);
        values.push(input.parent_id);
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
        UPDATE requirements 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToRequirement(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Delete requirement
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const query = 'DELETE FROM requirements WHERE id = $1';
      const result = await client.query(query, [id]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Find requirements with filters
   */
  async find(options: RequirementFilterOptions = {}): Promise<Requirement[]> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (options.status) {
        conditions.push(`status = $${paramIndex++}`);
        values.push(options.status);
      }

      if (options.priority) {
        conditions.push(`priority = $${paramIndex++}`);
        values.push(options.priority);
      }

      if (options.parent_id !== undefined) {
        if (options.parent_id === null) {
          conditions.push('parent_id IS NULL');
        } else {
          conditions.push(`parent_id = $${paramIndex++}`);
          values.push(options.parent_id);
        }
      }

      if (options.search) {
        conditions.push(`(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        values.push(`%${options.search}%`);
        paramIndex++;
      }

      let query = 'SELECT * FROM requirements';
      
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
      return result.rows.map(row => this.mapRowToRequirement(row));
    } finally {
      client.release();
    }
  }

  /**
   * Get requirement hierarchy (parent and children)
   */
  async getHierarchy(id: string): Promise<{
    requirement: Requirement | null;
    parent: Requirement | null;
    children: Requirement[];
  }> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      // Get the requirement itself
      const requirement = await this.getById(id);
      if (!requirement) {
        return { requirement: null, parent: null, children: [] };
      }

      // Get parent if exists
      let parent: Requirement | null = null;
      if (requirement.parent_id) {
        parent = await this.getById(requirement.parent_id);
      }

      // Get children
      const children = await this.find({ parent_id: id });

      return { requirement, parent, children };
    } finally {
      client.release();
    }
  }

  /**
   * Get requirement statistics
   */
  async getStatistics(): Promise<{
    total: number;
    by_status: Record<RequirementStatus, number>;
    by_priority: Record<number, number>;
    avg_complexity: number;
    avg_estimated_hours: number;
  }> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const queries = await Promise.all([
        // Total count
        client.query('SELECT COUNT(*) as total FROM requirements'),
        
        // By status
        client.query(`
          SELECT status, COUNT(*) as count 
          FROM requirements 
          GROUP BY status
        `),
        
        // By priority
        client.query(`
          SELECT priority, COUNT(*) as count 
          FROM requirements 
          GROUP BY priority
        `),
        
        // Averages
        client.query(`
          SELECT 
            AVG(complexity_score) as avg_complexity,
            AVG(estimated_hours) as avg_estimated_hours
          FROM requirements
          WHERE complexity_score IS NOT NULL 
            AND estimated_hours IS NOT NULL
        `),
      ]);

      const total = parseInt(queries[0].rows[0].total);
      
      const by_status = queries[1].rows.reduce((acc, row) => {
        acc[row.status as RequirementStatus] = parseInt(row.count);
        return acc;
      }, {} as Record<RequirementStatus, number>);
      
      const by_priority = queries[2].rows.reduce((acc, row) => {
        acc[row.priority] = parseInt(row.count);
        return acc;
      }, {} as Record<number, number>);
      
      const averages = queries[3].rows[0];
      
      return {
        total,
        by_status,
        by_priority,
        avg_complexity: parseFloat(averages.avg_complexity) || 0,
        avg_estimated_hours: parseFloat(averages.avg_estimated_hours) || 0,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Map database row to Requirement object
   */
  private mapRowToRequirement(row: any): Requirement {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      priority: row.priority,
      complexity_score: row.complexity_score,
      estimated_hours: row.estimated_hours,
      status: row.status,
      parent_id: row.parent_id,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
      metadata: row.metadata || {},
    };
  }
}

