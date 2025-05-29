import { PR } from "../../types";
import { SQL_QUERIES } from "../sql";
import { BaseRepository } from "./base";

export class PRRepository extends BaseRepository {
  /**
   * Create a new PR
   */
  async create(data: Omit<PR, "id" | "created_at" | "updated_at">): Promise<PR> {
    const result = await this.executeQuerySingle(
      SQL_QUERIES.CREATE_PR,
      [
        data.project_id,
        data.pr_number,
        data.pr_id,
        data.title,
        data.description,
        data.author,
        data.status,
        data.base_branch,
        data.head_branch,
      ]
    );
    
    return this.parseRow<PR>(result);
  }

  /**
   * Get PR by ID
   */
  async getById(id: string): Promise<PR | null> {
    const result = await this.executeQuerySingle(
      SQL_QUERIES.GET_PR_BY_ID,
      [id]
    );
    
    return result ? this.parseRow<PR>(result) : null;
  }

  /**
   * Get PR by project and PR number
   */
  async getByProjectAndNumber(projectId: string, prNumber: number): Promise<PR | null> {
    const result = await this.executeQuerySingle(
      SQL_QUERIES.GET_PR_BY_PROJECT_AND_NUMBER,
      [projectId, prNumber]
    );
    
    return result ? this.parseRow<PR>(result) : null;
  }

  /**
   * Update PR status
   */
  async updateStatus(id: string, status: PR["status"], analysisStatus?: PR["analysis_status"]): Promise<PR | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const result = await this.executeQuerySingle(
      SQL_QUERIES.UPDATE_PR_STATUS,
      [id, status, analysisStatus ?? existing.analysis_status]
    );
    
    return result ? this.parseRow<PR>(result) : null;
  }

  /**
   * Get PRs by project
   */
  async getByProject(projectId: string): Promise<PR[]> {
    const results = await this.executeQuery(
      SQL_QUERIES.GET_PRS_BY_PROJECT,
      [projectId]
    );
    
    return this.parseRows<PR>(results);
  }

  /**
   * Get PRs by status
   */
  async getByStatus(status: PR["status"]): Promise<PR[]> {
    const results = await this.executeQuery(
      "SELECT * FROM prs WHERE status = $1 ORDER BY created_at DESC",
      [status]
    );
    
    return this.parseRows<PR>(results);
  }

  /**
   * Get PRs by analysis status
   */
  async getByAnalysisStatus(analysisStatus: PR["analysis_status"]): Promise<PR[]> {
    const results = await this.executeQuery(
      "SELECT * FROM prs WHERE analysis_status = $1 ORDER BY created_at DESC",
      [analysisStatus]
    );
    
    return this.parseRows<PR>(results);
  }

  /**
   * Update PR analysis status
   */
  async updateAnalysisStatus(id: string, analysisStatus: PR["analysis_status"]): Promise<PR | null> {
    const existing = await this.getById(id);
    if (!existing) return null;

    const result = await this.executeQuerySingle(
      SQL_QUERIES.UPDATE_PR_STATUS,
      [id, existing.status, analysisStatus]
    );
    
    return result ? this.parseRow<PR>(result) : null;
  }

  /**
   * Get PR analysis summary
   */
  async getAnalysisSummary(id: string): Promise<{
    id: string;
    analysis_status: string;
    total_findings: number;
    critical_issues: number;
    total_tasks: number;
    pending_tasks: number;
  } | null> {
    const result = await this.executeQuerySingle(
      SQL_QUERIES.GET_PR_ANALYSIS_SUMMARY,
      [id]
    );
    
    return result ? {
      ...result,
      total_findings: parseInt(result.total_findings) || 0,
      critical_issues: parseInt(result.critical_issues) || 0,
      total_tasks: parseInt(result.total_tasks) || 0,
      pending_tasks: parseInt(result.pending_tasks) || 0,
    } : null;
  }

  /**
   * Check if PR exists
   */
  async exists(projectId: string, prNumber: number): Promise<boolean> {
    const result = await this.executeQuerySingle(
      "SELECT id FROM prs WHERE project_id = $1 AND pr_number = $2",
      [projectId, prNumber]
    );
    
    return result !== null;
  }
}

