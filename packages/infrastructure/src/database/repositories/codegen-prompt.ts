import { CodegenPrompt } from "../../types";
import { SQL_QUERIES } from "../sql";
import { BaseRepository } from "./base";

export class CodegenPromptRepository extends BaseRepository {
  /**
   * Create a new codegen prompt
   */
  async create(data: Omit<CodegenPrompt, "id" | "created_at" | "updated_at">): Promise<CodegenPrompt> {
    const result = await this.executeQuerySingle(
      SQL_QUERIES.CREATE_CODEGEN_PROMPT,
      [
        data.task_id,
        data.template_name,
        data.prompt_content,
        JSON.stringify(data.variables || {}),
      ]
    );
    
    return this.parseRow<CodegenPrompt>(result);
  }

  /**
   * Get codegen prompts by task
   */
  async getByTask(taskId: string): Promise<CodegenPrompt[]> {
    const results = await this.executeQuery(
      SQL_QUERIES.GET_CODEGEN_PROMPTS_BY_TASK,
      [taskId]
    );
    
    return this.parseRows<CodegenPrompt>(results);
  }

  /**
   * Update codegen prompt execution
   */
  async updateExecution(
    id: string,
    executionStatus: CodegenPrompt["execution_status"],
    result?: Record<string, unknown>,
    errorMessage?: string,
    executedAt?: Date
  ): Promise<CodegenPrompt | null> {
    const updateResult = await this.executeQuerySingle(
      SQL_QUERIES.UPDATE_CODEGEN_PROMPT_EXECUTION,
      [
        id,
        executionStatus,
        result ? JSON.stringify(result) : null,
        errorMessage,
        executedAt || new Date(),
      ]
    );
    
    return updateResult ? this.parseRow<CodegenPrompt>(updateResult) : null;
  }

  /**
   * Get codegen prompt by ID
   */
  async getById(id: string): Promise<CodegenPrompt | null> {
    const result = await this.executeQuerySingle(
      "SELECT * FROM codegen_prompts WHERE id = $1",
      [id]
    );
    
    return result ? this.parseRow<CodegenPrompt>(result) : null;
  }

  /**
   * Get prompts by execution status
   */
  async getByExecutionStatus(status: CodegenPrompt["execution_status"]): Promise<CodegenPrompt[]> {
    const results = await this.executeQuery(
      "SELECT * FROM codegen_prompts WHERE execution_status = $1 ORDER BY created_at ASC",
      [status]
    );
    
    return this.parseRows<CodegenPrompt>(results);
  }

  /**
   * Get prompts by template name
   */
  async getByTemplate(templateName: string): Promise<CodegenPrompt[]> {
    const results = await this.executeQuery(
      "SELECT * FROM codegen_prompts WHERE template_name = $1 ORDER BY created_at DESC",
      [templateName]
    );
    
    return this.parseRows<CodegenPrompt>(results);
  }

  /**
   * Get pending prompts for execution
   */
  async getPendingPrompts(): Promise<CodegenPrompt[]> {
    return this.getByExecutionStatus("pending");
  }

  /**
   * Get failed prompts for retry
   */
  async getFailedPrompts(): Promise<CodegenPrompt[]> {
    return this.getByExecutionStatus("failed");
  }

  /**
   * Mark prompt as executing
   */
  async markAsExecuting(id: string): Promise<CodegenPrompt | null> {
    return this.updateExecution(id, "executing");
  }

  /**
   * Mark prompt as completed
   */
  async markAsCompleted(id: string, result: Record<string, unknown>): Promise<CodegenPrompt | null> {
    return this.updateExecution(id, "completed", result, undefined, new Date());
  }

  /**
   * Mark prompt as failed
   */
  async markAsFailed(id: string, errorMessage: string): Promise<CodegenPrompt | null> {
    return this.updateExecution(id, "failed", undefined, errorMessage, new Date());
  }

  /**
   * Get prompt execution statistics
   */
  async getExecutionStats(): Promise<{
    total: number;
    by_status: Record<string, number>;
    by_template: Record<string, number>;
    success_rate: number;
  }> {
    const results = await this.executeQuery(`
      SELECT 
        execution_status,
        template_name,
        COUNT(*) as count
      FROM codegen_prompts 
      GROUP BY execution_status, template_name
    `);

    const stats = {
      total: 0,
      by_status: {} as Record<string, number>,
      by_template: {} as Record<string, number>,
      success_rate: 0,
    };

    let completedCount = 0;

    for (const row of results) {
      const count = parseInt(row.count) || 0;
      stats.total += count;
      
      stats.by_status[row.execution_status] = (stats.by_status[row.execution_status] || 0) + count;
      stats.by_template[row.template_name] = (stats.by_template[row.template_name] || 0) + count;
      
      if (row.execution_status === "completed") {
        completedCount += count;
      }
    }

    stats.success_rate = stats.total > 0 ? (completedCount / stats.total) * 100 : 0;

    return stats;
  }

  /**
   * Get prompts for a specific PR (via tasks)
   */
  async getByPR(prId: string): Promise<CodegenPrompt[]> {
    const results = await this.executeQuery(`
      SELECT cp.* FROM codegen_prompts cp
      JOIN tasks t ON cp.task_id = t.id
      WHERE t.pr_id = $1
      ORDER BY cp.created_at DESC
    `, [prId]);
    
    return this.parseRows<CodegenPrompt>(results);
  }

  /**
   * Delete prompts by task
   */
  async deleteByTask(taskId: string): Promise<number> {
    const result = await this.executeQuery(
      "DELETE FROM codegen_prompts WHERE task_id = $1",
      [taskId]
    );
    
    return result.length;
  }
}

