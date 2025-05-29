import { z } from "zod";

// Database Schema Types
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  repository_url: z.string().url(),
  repository_id: z.string(),
  configuration: z.record(z.unknown()).optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const PRSchema = z.object({
  id: z.string().uuid(),
  project_id: z.string().uuid(),
  pr_number: z.number(),
  pr_id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  author: z.string(),
  status: z.enum(["open", "closed", "merged", "draft"]),
  base_branch: z.string(),
  head_branch: z.string(),
  analysis_status: z.enum(["pending", "in_progress", "completed", "failed"]),
  created_at: z.date(),
  updated_at: z.date(),
});

export const AnalysisResultSchema = z.object({
  id: z.string().uuid(),
  pr_id: z.string().uuid(),
  module_name: z.string(),
  analysis_type: z.string(),
  findings: z.record(z.unknown()),
  severity: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["pending", "completed", "failed"]),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.date(),
  updated_at: z.date(),
});

export const TaskSchema = z.object({
  id: z.string().uuid(),
  pr_id: z.string().uuid(),
  name: z.string(),
  description: z.string(),
  task_type: z.string(),
  dependencies: z.array(z.string().uuid()).optional(),
  status: z.enum(["pending", "running", "completed", "failed", "cancelled"]),
  priority: z.enum(["low", "medium", "high", "critical"]),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.date(),
  updated_at: z.date(),
  started_at: z.date().optional(),
  completed_at: z.date().optional(),
});

export const CodegenPromptSchema = z.object({
  id: z.string().uuid(),
  task_id: z.string().uuid(),
  template_name: z.string(),
  prompt_content: z.string(),
  variables: z.record(z.unknown()).optional(),
  execution_status: z.enum(["pending", "executing", "completed", "failed"]),
  result: z.record(z.unknown()).optional(),
  error_message: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date(),
  executed_at: z.date().optional(),
});

// Workflow Types
export const WorkflowStatusSchema = z.enum(["active", "completed", "failed", "cancelled"]);

export const WorkflowExecutionSchema = z.object({
  id: z.string().uuid(),
  pr_id: z.string().uuid(),
  workflow_name: z.string(),
  status: WorkflowStatusSchema,
  current_step: z.string().optional(),
  steps_completed: z.array(z.string()),
  steps_failed: z.array(z.string()),
  metadata: z.record(z.unknown()).optional(),
  created_at: z.date(),
  updated_at: z.date(),
  started_at: z.date().optional(),
  completed_at: z.date().optional(),
});

// Output Format Schema
export const ModuleOutputSchema = z.object({
  module: z.literal("database_workflow_orchestration"),
  workflow_status: WorkflowStatusSchema,
  database: z.object({
    pr_id: z.string(),
    analysis_complete: z.boolean(),
    total_findings: z.number(),
    critical_issues: z.number(),
    codegen_tasks: z.array(z.object({
      task_id: z.string(),
      status: z.enum(["pending", "running", "completed", "failed"]),
      prompt: z.string(),
      priority: z.enum(["low", "medium", "high", "critical"]),
    })),
  }),
});

// Type exports
export type Project = z.infer<typeof ProjectSchema>;
export type PR = z.infer<typeof PRSchema>;
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type CodegenPrompt = z.infer<typeof CodegenPromptSchema>;
export type WorkflowExecution = z.infer<typeof WorkflowExecutionSchema>;
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;
export type ModuleOutput = z.infer<typeof ModuleOutputSchema>;

// Database Configuration
export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  pool?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
  };
}

// Redis Configuration
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
}

// Infrastructure Configuration
export interface InfrastructureConfig {
  database: DatabaseConfig;
  redis: RedisConfig;
  workflow?: {
    maxConcurrentTasks?: number;
    taskTimeout?: number;
    retryAttempts?: number;
  };
}

