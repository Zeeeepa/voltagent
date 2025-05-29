import { readFileSync } from "fs";
import { join } from "path";

// Load SQL schema
export const SCHEMA_SQL = readFileSync(join(__dirname, "schema.sql"), "utf-8");

// Common SQL queries
export const SQL_QUERIES = {
  // Project queries
  CREATE_PROJECT: `
    INSERT INTO projects (name, repository_url, repository_id, configuration)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `,
  
  GET_PROJECT_BY_ID: `
    SELECT * FROM projects WHERE id = $1
  `,
  
  GET_PROJECT_BY_REPOSITORY_ID: `
    SELECT * FROM projects WHERE repository_id = $1
  `,
  
  UPDATE_PROJECT: `
    UPDATE projects 
    SET name = $2, repository_url = $3, configuration = $4
    WHERE id = $1
    RETURNING *
  `,
  
  DELETE_PROJECT: `
    DELETE FROM projects WHERE id = $1
  `,

  // PR queries
  CREATE_PR: `
    INSERT INTO prs (project_id, pr_number, pr_id, title, description, author, status, base_branch, head_branch)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `,
  
  GET_PR_BY_ID: `
    SELECT * FROM prs WHERE id = $1
  `,
  
  GET_PR_BY_PROJECT_AND_NUMBER: `
    SELECT * FROM prs WHERE project_id = $1 AND pr_number = $2
  `,
  
  UPDATE_PR_STATUS: `
    UPDATE prs 
    SET status = $2, analysis_status = $3
    WHERE id = $1
    RETURNING *
  `,
  
  GET_PRS_BY_PROJECT: `
    SELECT * FROM prs WHERE project_id = $1 ORDER BY created_at DESC
  `,

  // Analysis Result queries
  CREATE_ANALYSIS_RESULT: `
    INSERT INTO analysis_results (pr_id, module_name, analysis_type, findings, severity, status, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `,
  
  GET_ANALYSIS_RESULTS_BY_PR: `
    SELECT * FROM analysis_results WHERE pr_id = $1 ORDER BY created_at DESC
  `,
  
  UPDATE_ANALYSIS_RESULT_STATUS: `
    UPDATE analysis_results 
    SET status = $2, findings = $3, metadata = $4
    WHERE id = $1
    RETURNING *
  `,
  
  GET_CRITICAL_FINDINGS_COUNT: `
    SELECT COUNT(*) as count FROM analysis_results 
    WHERE pr_id = $1 AND severity = 'critical' AND status = 'completed'
  `,

  // Task queries
  CREATE_TASK: `
    INSERT INTO tasks (pr_id, name, description, task_type, dependencies, priority, metadata)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
  `,
  
  GET_TASK_BY_ID: `
    SELECT * FROM tasks WHERE id = $1
  `,
  
  GET_TASKS_BY_PR: `
    SELECT * FROM tasks WHERE pr_id = $1 ORDER BY priority DESC, created_at ASC
  `,
  
  UPDATE_TASK_STATUS: `
    UPDATE tasks 
    SET status = $2, started_at = $3, completed_at = $4
    WHERE id = $1
    RETURNING *
  `,
  
  GET_PENDING_TASKS: `
    SELECT * FROM tasks 
    WHERE status = 'pending' 
    ORDER BY priority DESC, created_at ASC
  `,

  // Codegen Prompt queries
  CREATE_CODEGEN_PROMPT: `
    INSERT INTO codegen_prompts (task_id, template_name, prompt_content, variables)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `,
  
  GET_CODEGEN_PROMPTS_BY_TASK: `
    SELECT * FROM codegen_prompts WHERE task_id = $1 ORDER BY created_at DESC
  `,
  
  UPDATE_CODEGEN_PROMPT_EXECUTION: `
    UPDATE codegen_prompts 
    SET execution_status = $2, result = $3, error_message = $4, executed_at = $5
    WHERE id = $1
    RETURNING *
  `,

  // Workflow Execution queries
  CREATE_WORKFLOW_EXECUTION: `
    INSERT INTO workflow_executions (pr_id, workflow_name, status, metadata)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `,
  
  GET_WORKFLOW_EXECUTION_BY_PR: `
    SELECT * FROM workflow_executions WHERE pr_id = $1 ORDER BY created_at DESC LIMIT 1
  `,
  
  UPDATE_WORKFLOW_EXECUTION: `
    UPDATE workflow_executions 
    SET status = $2, current_step = $3, steps_completed = $4, steps_failed = $5, completed_at = $6
    WHERE id = $1
    RETURNING *
  `,

  // Analytics queries
  GET_PR_ANALYSIS_SUMMARY: `
    SELECT 
      p.id,
      p.analysis_status,
      COUNT(ar.id) as total_findings,
      COUNT(CASE WHEN ar.severity = 'critical' THEN 1 END) as critical_issues,
      COUNT(t.id) as total_tasks,
      COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks
    FROM prs p
    LEFT JOIN analysis_results ar ON p.id = ar.pr_id AND ar.status = 'completed'
    LEFT JOIN tasks t ON p.id = t.pr_id
    WHERE p.id = $1
    GROUP BY p.id, p.analysis_status
  `,
} as const;

