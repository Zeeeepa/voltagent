import { AnalysisResult } from "../../types";
import { SQL_QUERIES } from "../sql";
import { BaseRepository } from "./base";

export class AnalysisResultRepository extends BaseRepository {
  /**
   * Create a new analysis result
   */
  async create(data: Omit<AnalysisResult, "id" | "created_at" | "updated_at">): Promise<AnalysisResult> {
    const result = await this.executeQuerySingle(
      SQL_QUERIES.CREATE_ANALYSIS_RESULT,
      [
        data.pr_id,
        data.module_name,
        data.analysis_type,
        JSON.stringify(data.findings),
        data.severity,
        data.status,
        JSON.stringify(data.metadata || {}),
      ]
    );
    
    return this.parseRow<AnalysisResult>(result);
  }

  /**
   * Get analysis results by PR
   */
  async getByPR(prId: string): Promise<AnalysisResult[]> {
    const results = await this.executeQuery(
      SQL_QUERIES.GET_ANALYSIS_RESULTS_BY_PR,
      [prId]
    );
    
    return this.parseRows<AnalysisResult>(results);
  }

  /**
   * Update analysis result status and findings
   */
  async updateStatus(
    id: string, 
    status: AnalysisResult["status"], 
    findings?: Record<string, unknown>,
    metadata?: Record<string, unknown>
  ): Promise<AnalysisResult | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const result = await this.executeQuerySingle(
      SQL_QUERIES.UPDATE_ANALYSIS_RESULT_STATUS,
      [
        id,
        status,
        JSON.stringify(findings ?? existing.findings),
        JSON.stringify(metadata ?? existing.metadata),
      ]
    );
    
    return result ? this.parseRow<AnalysisResult>(result) : null;
  }

  /**
   * Get analysis result by ID
   */
  async getById(id: string): Promise<AnalysisResult | null> {
    const result = await this.executeQuerySingle(
      "SELECT * FROM analysis_results WHERE id = $1",
      [id]
    );
    
    return result ? this.parseRow<AnalysisResult>(result) : null;
  }

  /**
   * Get analysis results by module
   */
  async getByModule(prId: string, moduleName: string): Promise<AnalysisResult[]> {
    const results = await this.executeQuery(
      "SELECT * FROM analysis_results WHERE pr_id = $1 AND module_name = $2 ORDER BY created_at DESC",
      [prId, moduleName]
    );
    
    return this.parseRows<AnalysisResult>(results);
  }

  /**
   * Get analysis results by severity
   */
  async getBySeverity(prId: string, severity: AnalysisResult["severity"]): Promise<AnalysisResult[]> {
    const results = await this.executeQuery(
      "SELECT * FROM analysis_results WHERE pr_id = $1 AND severity = $2 ORDER BY created_at DESC",
      [prId, severity]
    );
    
    return this.parseRows<AnalysisResult>(results);
  }

  /**
   * Get critical findings count for a PR
   */
  async getCriticalFindingsCount(prId: string): Promise<number> {
    const result = await this.executeQuerySingle(
      SQL_QUERIES.GET_CRITICAL_FINDINGS_COUNT,
      [prId]
    );
    
    return result ? parseInt(result.count) || 0 : 0;
  }

  /**
   * Get analysis results by status
   */
  async getByStatus(prId: string, status: AnalysisResult["status"]): Promise<AnalysisResult[]> {
    const results = await this.executeQuery(
      "SELECT * FROM analysis_results WHERE pr_id = $1 AND status = $2 ORDER BY created_at DESC",
      [prId, status]
    );
    
    return this.parseRows<AnalysisResult>(results);
  }

  /**
   * Get analysis summary for a PR
   */
  async getAnalysisSummary(prId: string): Promise<{
    total_findings: number;
    by_severity: Record<string, number>;
    by_module: Record<string, number>;
    by_status: Record<string, number>;
  }> {
    const results = await this.executeQuery(
      `SELECT 
        severity,
        module_name,
        status,
        COUNT(*) as count
      FROM analysis_results 
      WHERE pr_id = $1 
      GROUP BY severity, module_name, status`,
      [prId]
    );

    const summary = {
      total_findings: 0,
      by_severity: {} as Record<string, number>,
      by_module: {} as Record<string, number>,
      by_status: {} as Record<string, number>,
    };

    for (const row of results) {
      const count = parseInt(row.count) || 0;
      summary.total_findings += count;
      
      summary.by_severity[row.severity] = (summary.by_severity[row.severity] || 0) + count;
      summary.by_module[row.module_name] = (summary.by_module[row.module_name] || 0) + count;
      summary.by_status[row.status] = (summary.by_status[row.status] || 0) + count;
    }

    return summary;
  }

  /**
   * Delete analysis results for a PR
   */
  async deleteByPR(prId: string): Promise<number> {
    const result = await this.executeQuery(
      "DELETE FROM analysis_results WHERE pr_id = $1",
      [prId]
    );
    
    return result.length;
  }
}

