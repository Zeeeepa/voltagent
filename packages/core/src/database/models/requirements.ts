import { DatabaseConnection } from '../connection';
import { v4 as uuidv4 } from 'uuid';

/**
 * Requirements model for VoltAgent database
 * Phase 1.3: Setup Database Event Storage System
 */

export interface Requirement {
  id: string;
  title: string;
  description?: string;
  complexity_score: number;
  status: RequirementStatus;
  dependencies: string[];
  metadata: Record<string, any>;
  created_at: Date;
  updated_at: Date;
}

export type RequirementStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'blocked';

export interface CreateRequirementInput {
  title: string;
  description?: string;
  complexity_score?: number;
  status?: RequirementStatus;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateRequirementInput {
  title?: string;
  description?: string;
  complexity_score?: number;
  status?: RequirementStatus;
  dependencies?: string[];
  metadata?: Record<string, any>;
}

export interface RequirementFilters {
  status?: RequirementStatus;
  min_complexity?: number;
  max_complexity?: number;
  has_dependencies?: boolean;
  limit?: number;
  offset?: number;
}

export class RequirementsModel {
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  /**
   * Create a new requirement
   */
  async create(input: CreateRequirementInput): Promise<Requirement> {
    const id = uuidv4();
    
    const query = `
      INSERT INTO requirements (id, title, description, complexity_score, status, dependencies, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      id,
      input.title,
      input.description || null,
      input.complexity_score || 0,
      input.status || 'pending',
      JSON.stringify(input.dependencies || []),
      JSON.stringify(input.metadata || {})
    ];

    const result = await this.db.query(query, values);
    return this.mapRowToRequirement(result.rows[0]);
  }

  /**
   * Get requirement by ID
   */
  async findById(id: string): Promise<Requirement | null> {
    const query = 'SELECT * FROM requirements WHERE id = $1';
    const result = await this.db.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToRequirement(result.rows[0]);
  }

  /**
   * Update a requirement
   */
  async update(id: string, input: UpdateRequirementInput): Promise<Requirement | null> {
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
    
    if (input.complexity_score !== undefined) {
      updateFields.push(`complexity_score = $${paramIndex++}`);
      values.push(input.complexity_score);
    }
    
    if (input.status !== undefined) {
      updateFields.push(`status = $${paramIndex++}`);
      values.push(input.status);
    }
    
    if (input.dependencies !== undefined) {
      updateFields.push(`dependencies = $${paramIndex++}`);
      values.push(JSON.stringify(input.dependencies));
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
      UPDATE requirements 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToRequirement(result.rows[0]);
  }

  /**
   * Delete a requirement
   */
  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM requirements WHERE id = $1';
    const result = await this.db.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Find requirements with filters
   */
  async find(filters: RequirementFilters = {}): Promise<Requirement[]> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }
    
    if (filters.min_complexity !== undefined) {
      conditions.push(`complexity_score >= $${paramIndex++}`);
      values.push(filters.min_complexity);
    }
    
    if (filters.max_complexity !== undefined) {
      conditions.push(`complexity_score <= $${paramIndex++}`);
      values.push(filters.max_complexity);
    }
    
    if (filters.has_dependencies !== undefined) {
      if (filters.has_dependencies) {
        conditions.push(`jsonb_array_length(dependencies) > 0`);
      } else {
        conditions.push(`jsonb_array_length(dependencies) = 0`);
      }
    }

    let query = 'SELECT * FROM requirements';
    
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
    return result.rows.map(row => this.mapRowToRequirement(row));
  }

  /**
   * Get requirements count with filters
   */
  async count(filters: RequirementFilters = {}): Promise<number> {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }
    
    if (filters.min_complexity !== undefined) {
      conditions.push(`complexity_score >= $${paramIndex++}`);
      values.push(filters.min_complexity);
    }
    
    if (filters.max_complexity !== undefined) {
      conditions.push(`complexity_score <= $${paramIndex++}`);
      values.push(filters.max_complexity);
    }
    
    if (filters.has_dependencies !== undefined) {
      if (filters.has_dependencies) {
        conditions.push(`jsonb_array_length(dependencies) > 0`);
      } else {
        conditions.push(`jsonb_array_length(dependencies) = 0`);
      }
    }

    let query = 'SELECT COUNT(*) as count FROM requirements';
    
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    const result = await this.db.query(query, values);
    return parseInt(result.rows[0].count);
  }

  /**
   * Get requirements by status
   */
  async findByStatus(status: RequirementStatus): Promise<Requirement[]> {
    return this.find({ status });
  }

  /**
   * Get requirements by complexity range
   */
  async findByComplexityRange(min: number, max: number): Promise<Requirement[]> {
    return this.find({ min_complexity: min, max_complexity: max });
  }

  /**
   * Add dependency to requirement
   */
  async addDependency(id: string, dependencyId: string): Promise<Requirement | null> {
    const requirement = await this.findById(id);
    if (!requirement) {
      return null;
    }

    const dependencies = [...requirement.dependencies];
    if (!dependencies.includes(dependencyId)) {
      dependencies.push(dependencyId);
      return this.update(id, { dependencies });
    }

    return requirement;
  }

  /**
   * Remove dependency from requirement
   */
  async removeDependency(id: string, dependencyId: string): Promise<Requirement | null> {
    const requirement = await this.findById(id);
    if (!requirement) {
      return null;
    }

    const dependencies = requirement.dependencies.filter(dep => dep !== dependencyId);
    return this.update(id, { dependencies });
  }

  /**
   * Calculate complexity score based on description and dependencies
   */
  calculateComplexityScore(description: string, dependencies: string[]): number {
    let score = 0;
    
    // Base score from description length
    if (description) {
      score += Math.min(description.length / 100, 20); // Max 20 points for description
    }
    
    // Score from dependencies
    score += dependencies.length * 5; // 5 points per dependency
    
    // Score from keywords in description
    const complexityKeywords = [
      'integration', 'api', 'database', 'authentication', 'security',
      'performance', 'scalability', 'migration', 'refactor', 'architecture'
    ];
    
    if (description) {
      const lowerDescription = description.toLowerCase();
      complexityKeywords.forEach(keyword => {
        if (lowerDescription.includes(keyword)) {
          score += 10;
        }
      });
    }
    
    return Math.min(Math.round(score), 100); // Cap at 100
  }

  /**
   * Update complexity score automatically
   */
  async updateComplexityScore(id: string): Promise<Requirement | null> {
    const requirement = await this.findById(id);
    if (!requirement) {
      return null;
    }

    const complexityScore = this.calculateComplexityScore(
      requirement.description || '',
      requirement.dependencies
    );

    return this.update(id, { complexity_score: complexityScore });
  }

  /**
   * Get requirements dependency graph
   */
  async getDependencyGraph(): Promise<Array<{ id: string; title: string; dependencies: string[] }>> {
    const query = 'SELECT id, title, dependencies FROM requirements';
    const result = await this.db.query(query);
    
    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      dependencies: typeof row.dependencies === 'string' 
        ? JSON.parse(row.dependencies) 
        : row.dependencies
    }));
  }

  /**
   * Map database row to Requirement object
   */
  private mapRowToRequirement(row: any): Requirement {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      complexity_score: row.complexity_score,
      status: row.status as RequirementStatus,
      dependencies: typeof row.dependencies === 'string' 
        ? JSON.parse(row.dependencies) 
        : row.dependencies,
      metadata: typeof row.metadata === 'string' 
        ? JSON.parse(row.metadata) 
        : row.metadata,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    };
  }
}

