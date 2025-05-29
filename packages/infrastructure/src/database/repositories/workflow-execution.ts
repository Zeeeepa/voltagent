import { WorkflowExecution } from "../../types";
import { SQL_QUERIES } from "../sql";
import { BaseRepository } from "./base";

export class WorkflowExecutionRepository extends BaseRepository {
  /**
   * Create a new workflow execution
   */
  async create(data: Omit<WorkflowExecution, "id" | "created_at" | "updated_at">): Promise<WorkflowExecution> {
    const result = await this.executeQuerySingle(
      SQL_QUERIES.CREATE_WORKFLOW_EXECUTION,
      [
        data.pr_id,
        data.workflow_name,
        data.status,
        JSON.stringify(data.metadata || {}),
      ]
    );
    
    return this.parseRow<WorkflowExecution>(result);
  }

  /**
   * Get workflow execution by PR (latest)
   */
  async getByPR(prId: string): Promise<WorkflowExecution | null> {
    const result = await this.executeQuerySingle(
      SQL_QUERIES.GET_WORKFLOW_EXECUTION_BY_PR,
      [prId]
    );
    
    return result ? this.parseRow<WorkflowExecution>(result) : null;
  }

  /**
   * Update workflow execution
   */
  async update(
    id: string,
    status: WorkflowExecution["status"],
    currentStep?: string,
    stepsCompleted?: string[],
    stepsFailed?: string[],
    completedAt?: Date
  ): Promise<WorkflowExecution | null> {
    const result = await this.executeQuerySingle(
      SQL_QUERIES.UPDATE_WORKFLOW_EXECUTION,
      [id, status, currentStep, stepsCompleted || [], stepsFailed || [], completedAt]
    );
    
    return result ? this.parseRow<WorkflowExecution>(result) : null;
  }

  /**
   * Get workflow execution by ID
   */
  async getById(id: string): Promise<WorkflowExecution | null> {
    const result = await this.executeQuerySingle(
      "SELECT * FROM workflow_executions WHERE id = $1",
      [id]
    );
    
    return result ? this.parseRow<WorkflowExecution>(result) : null;
  }

  /**
   * Get all workflow executions for a PR
   */
  async getAllByPR(prId: string): Promise<WorkflowExecution[]> {
    const results = await this.executeQuery(
      "SELECT * FROM workflow_executions WHERE pr_id = $1 ORDER BY created_at DESC",
      [prId]
    );
    
    return this.parseRows<WorkflowExecution>(results);
  }

  /**
   * Get workflow executions by status
   */
  async getByStatus(status: WorkflowExecution["status"]): Promise<WorkflowExecution[]> {
    const results = await this.executeQuery(
      "SELECT * FROM workflow_executions WHERE status = $1 ORDER BY created_at DESC",
      [status]
    );
    
    return this.parseRows<WorkflowExecution>(results);
  }

  /**
   * Get active workflow executions
   */
  async getActiveWorkflows(): Promise<WorkflowExecution[]> {
    return this.getByStatus("active");
  }

  /**
   * Mark workflow as started
   */
  async markAsStarted(id: string, currentStep: string): Promise<WorkflowExecution | null> {
    const result = await this.executeQuerySingle(
      `UPDATE workflow_executions 
       SET status = 'active', current_step = $2, started_at = NOW()
       WHERE id = $1 
       RETURNING *`,
      [id, currentStep]
    );
    
    return result ? this.parseRow<WorkflowExecution>(result) : null;
  }

  /**
   * Add completed step
   */
  async addCompletedStep(id: string, step: string, nextStep?: string): Promise<WorkflowExecution | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const stepsCompleted = [...(existing.steps_completed || []), step];
    
    const result = await this.executeQuerySingle(
      `UPDATE workflow_executions 
       SET steps_completed = $2, current_step = $3
       WHERE id = $1 
       RETURNING *`,
      [id, stepsCompleted, nextStep]
    );
    
    return result ? this.parseRow<WorkflowExecution>(result) : null;
  }

  /**
   * Add failed step
   */
  async addFailedStep(id: string, step: string): Promise<WorkflowExecution | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const stepsFailed = [...(existing.steps_failed || []), step];
    
    const result = await this.executeQuerySingle(
      `UPDATE workflow_executions 
       SET steps_failed = $2, status = 'failed', completed_at = NOW()
       WHERE id = $1 
       RETURNING *`,
      [id, stepsFailed]
    );
    
    return result ? this.parseRow<WorkflowExecution>(result) : null;
  }

  /**
   * Mark workflow as completed
   */
  async markAsCompleted(id: string): Promise<WorkflowExecution | null> {
    return this.update(id, "completed", undefined, undefined, undefined, new Date());
  }

  /**
   * Mark workflow as failed
   */
  async markAsFailed(id: string, failedStep?: string): Promise<WorkflowExecution | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const stepsFailed = failedStep 
      ? [...(existing.steps_failed || []), failedStep]
      : existing.steps_failed;

    return this.update(id, "failed", undefined, undefined, stepsFailed, new Date());
  }

  /**
   * Cancel workflow
   */
  async cancel(id: string): Promise<WorkflowExecution | null> {
    return this.update(id, "cancelled", undefined, undefined, undefined, new Date());
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_workflow: Record<string, number>;
    success_rate: number;
    average_duration_minutes: number;
  }> {
    const results = await this.executeQuery(`
      SELECT 
        status,
        workflow_name,
        COUNT(*) as count,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at))/60) as avg_duration_minutes
      FROM workflow_executions 
      WHERE started_at IS NOT NULL
      GROUP BY status, workflow_name
    `);

    const stats = {
      total: 0,
      by_status: {} as Record<string, number>,
      by_workflow: {} as Record<string, number>,
      success_rate: 0,
      average_duration_minutes: 0,
    };

    let completedCount = 0;
    let totalDuration = 0;
    let durationCount = 0;

    for (const row of results) {
      const count = parseInt(row.count) || 0;
      stats.total += count;
      
      stats.by_status[row.status] = (stats.by_status[row.status] || 0) + count;
      stats.by_workflow[row.workflow_name] = (stats.by_workflow[row.workflow_name] || 0) + count;
      
      if (row.status === "completed") {
        completedCount += count;
      }

      if (row.avg_duration_minutes) {
        totalDuration += parseFloat(row.avg_duration_minutes) * count;
        durationCount += count;
      }
    }

    stats.success_rate = stats.total > 0 ? (completedCount / stats.total) * 100 : 0;
    stats.average_duration_minutes = durationCount > 0 ? totalDuration / durationCount : 0;

    return stats;
  }

  /**
   * Get workflow execution history for a project
   */
  async getProjectHistory(projectId: string, limit: number = 50): Promise<WorkflowExecution[]> {
    const results = await this.executeQuery(`
      SELECT we.* FROM workflow_executions we
      JOIN prs p ON we.pr_id = p.id
      WHERE p.project_id = $1
      ORDER BY we.created_at DESC
      LIMIT $2
    `, [projectId, limit]);
    
    return this.parseRows<WorkflowExecution>(results);
  }
}

