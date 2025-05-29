/**
 * Correlations Model for Task Master
 * Phase 4.1: Comprehensive Database & Event Storage Implementation
 */

import { PoolClient } from 'pg';
import { getDatabaseManager } from '../connection';

export interface Correlation {
  id: string;
  task_master_id?: string;
  linear_issue_id?: string;
  github_pr_id?: string;
  codegen_request_id?: string;
  claude_session_id?: string;
  wsl2_deployment_id?: string;
  status: CorrelationStatus;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

export type CorrelationStatus = 'active' | 'inactive' | 'completed' | 'failed';

export interface CreateCorrelationInput {
  task_master_id?: string;
  linear_issue_id?: string;
  github_pr_id?: string;
  codegen_request_id?: string;
  claude_session_id?: string;
  wsl2_deployment_id?: string;
  status?: CorrelationStatus;
  metadata?: Record<string, any>;
}

export interface UpdateCorrelationInput {
  task_master_id?: string;
  linear_issue_id?: string;
  github_pr_id?: string;
  codegen_request_id?: string;
  claude_session_id?: string;
  wsl2_deployment_id?: string;
  status?: CorrelationStatus;
  metadata?: Record<string, any>;
}

export interface CorrelationFilterOptions {
  task_master_id?: string;
  linear_issue_id?: string;
  github_pr_id?: string;
  codegen_request_id?: string;
  claude_session_id?: string;
  wsl2_deployment_id?: string;
  status?: CorrelationStatus;
  limit?: number;
  offset?: number;
}

export class CorrelationsModel {
  private dbManager = getDatabaseManager();

  /**
   * Create a new correlation
   */
  async create(input: CreateCorrelationInput): Promise<Correlation> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const query = `
        INSERT INTO correlations (
          task_master_id, linear_issue_id, github_pr_id, 
          codegen_request_id, claude_session_id, wsl2_deployment_id, 
          status, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const values = [
        input.task_master_id || null,
        input.linear_issue_id || null,
        input.github_pr_id || null,
        input.codegen_request_id || null,
        input.claude_session_id || null,
        input.wsl2_deployment_id || null,
        input.status || 'active',
        JSON.stringify(input.metadata || {}),
      ];

      const result = await client.query(query, values);
      return this.mapRowToCorrelation(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Get correlation by ID
   */
  async getById(id: string): Promise<Correlation | null> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const query = 'SELECT * FROM correlations WHERE id = $1';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToCorrelation(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Update correlation
   */
  async update(id: string, input: UpdateCorrelationInput): Promise<Correlation | null> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (input.task_master_id !== undefined) {
        updateFields.push(`task_master_id = $${paramIndex++}`);
        values.push(input.task_master_id);
      }
      
      if (input.linear_issue_id !== undefined) {
        updateFields.push(`linear_issue_id = $${paramIndex++}`);
        values.push(input.linear_issue_id);
      }
      
      if (input.github_pr_id !== undefined) {
        updateFields.push(`github_pr_id = $${paramIndex++}`);
        values.push(input.github_pr_id);
      }
      
      if (input.codegen_request_id !== undefined) {
        updateFields.push(`codegen_request_id = $${paramIndex++}`);
        values.push(input.codegen_request_id);
      }
      
      if (input.claude_session_id !== undefined) {
        updateFields.push(`claude_session_id = $${paramIndex++}`);
        values.push(input.claude_session_id);
      }
      
      if (input.wsl2_deployment_id !== undefined) {
        updateFields.push(`wsl2_deployment_id = $${paramIndex++}`);
        values.push(input.wsl2_deployment_id);
      }
      
      if (input.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(input.status);
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
        UPDATE correlations 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToCorrelation(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Delete correlation
   */
  async delete(id: string): Promise<boolean> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const query = 'DELETE FROM correlations WHERE id = $1';
      const result = await client.query(query, [id]);
      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Find correlations with filters
   */
  async find(options: CorrelationFilterOptions = {}): Promise<Correlation[]> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (options.task_master_id) {
        conditions.push(`task_master_id = $${paramIndex++}`);
        values.push(options.task_master_id);
      }

      if (options.linear_issue_id) {
        conditions.push(`linear_issue_id = $${paramIndex++}`);
        values.push(options.linear_issue_id);
      }

      if (options.github_pr_id) {
        conditions.push(`github_pr_id = $${paramIndex++}`);
        values.push(options.github_pr_id);
      }

      if (options.codegen_request_id) {
        conditions.push(`codegen_request_id = $${paramIndex++}`);
        values.push(options.codegen_request_id);
      }

      if (options.claude_session_id) {
        conditions.push(`claude_session_id = $${paramIndex++}`);
        values.push(options.claude_session_id);
      }

      if (options.wsl2_deployment_id) {
        conditions.push(`wsl2_deployment_id = $${paramIndex++}`);
        values.push(options.wsl2_deployment_id);
      }

      if (options.status) {
        conditions.push(`status = $${paramIndex++}`);
        values.push(options.status);
      }

      let query = 'SELECT * FROM correlations';
      
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
      return result.rows.map(row => this.mapRowToCorrelation(row));
    } finally {
      client.release();
    }
  }

  /**
   * Find correlation by Linear issue ID
   */
  async getByLinearIssueId(linearIssueId: string): Promise<Correlation | null> {
    const correlations = await this.find({ linear_issue_id: linearIssueId, limit: 1 });
    return correlations.length > 0 ? correlations[0] : null;
  }

  /**
   * Find correlation by GitHub PR ID
   */
  async getByGithubPrId(githubPrId: string): Promise<Correlation | null> {
    const correlations = await this.find({ github_pr_id: githubPrId, limit: 1 });
    return correlations.length > 0 ? correlations[0] : null;
  }

  /**
   * Find correlation by Codegen request ID
   */
  async getByCodegenRequestId(codegenRequestId: string): Promise<Correlation | null> {
    const correlations = await this.find({ codegen_request_id: codegenRequestId, limit: 1 });
    return correlations.length > 0 ? correlations[0] : null;
  }

  /**
   * Find correlation by Claude session ID
   */
  async getByClaudeSessionId(claudeSessionId: string): Promise<Correlation | null> {
    const correlations = await this.find({ claude_session_id: claudeSessionId, limit: 1 });
    return correlations.length > 0 ? correlations[0] : null;
  }

  /**
   * Find correlation by WSL2 deployment ID
   */
  async getByWsl2DeploymentId(wsl2DeploymentId: string): Promise<Correlation | null> {
    const correlations = await this.find({ wsl2_deployment_id: wsl2DeploymentId, limit: 1 });
    return correlations.length > 0 ? correlations[0] : null;
  }

  /**
   * Create or update correlation by Linear issue ID
   */
  async upsertByLinearIssueId(
    linearIssueId: string,
    input: Omit<CreateCorrelationInput, 'linear_issue_id'>
  ): Promise<Correlation> {
    const existing = await this.getByLinearIssueId(linearIssueId);
    
    if (existing) {
      return await this.update(existing.id, input) as Correlation;
    } else {
      return await this.create({ ...input, linear_issue_id: linearIssueId });
    }
  }

  /**
   * Get correlation statistics
   */
  async getStatistics(): Promise<{
    total: number;
    by_status: Record<CorrelationStatus, number>;
    with_linear_issues: number;
    with_github_prs: number;
    with_codegen_requests: number;
    with_claude_sessions: number;
    with_wsl2_deployments: number;
  }> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const queries = await Promise.all([
        // Total count
        client.query('SELECT COUNT(*) as total FROM correlations'),
        
        // By status
        client.query(`
          SELECT status, COUNT(*) as count 
          FROM correlations 
          GROUP BY status
        `),
        
        // Counts by system
        client.query(`
          SELECT 
            COUNT(CASE WHEN linear_issue_id IS NOT NULL THEN 1 END) as with_linear_issues,
            COUNT(CASE WHEN github_pr_id IS NOT NULL THEN 1 END) as with_github_prs,
            COUNT(CASE WHEN codegen_request_id IS NOT NULL THEN 1 END) as with_codegen_requests,
            COUNT(CASE WHEN claude_session_id IS NOT NULL THEN 1 END) as with_claude_sessions,
            COUNT(CASE WHEN wsl2_deployment_id IS NOT NULL THEN 1 END) as with_wsl2_deployments
          FROM correlations
        `),
      ]);

      const total = parseInt(queries[0].rows[0].total);
      
      const by_status = queries[1].rows.reduce((acc, row) => {
        acc[row.status as CorrelationStatus] = parseInt(row.count);
        return acc;
      }, {} as Record<CorrelationStatus, number>);
      
      const systemCounts = queries[2].rows[0];
      
      return {
        total,
        by_status,
        with_linear_issues: parseInt(systemCounts.with_linear_issues),
        with_github_prs: parseInt(systemCounts.with_github_prs),
        with_codegen_requests: parseInt(systemCounts.with_codegen_requests),
        with_claude_sessions: parseInt(systemCounts.with_claude_sessions),
        with_wsl2_deployments: parseInt(systemCounts.with_wsl2_deployments),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Map database row to Correlation object
   */
  private mapRowToCorrelation(row: any): Correlation {
    return {
      id: row.id,
      task_master_id: row.task_master_id,
      linear_issue_id: row.linear_issue_id,
      github_pr_id: row.github_pr_id,
      codegen_request_id: row.codegen_request_id,
      claude_session_id: row.claude_session_id,
      wsl2_deployment_id: row.wsl2_deployment_id,
      status: row.status,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
      metadata: row.metadata || {},
    };
  }
}

