import { Task, WorkflowExecution } from "../types";

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  type: "analysis" | "codegen" | "validation" | "notification";
  dependencies?: string[];
  timeout?: number;
  retryAttempts?: number;
  config?: Record<string, unknown>;
}

export interface WorkflowDefinition {
  name: string;
  description: string;
  version: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  config?: WorkflowConfig;
}

export interface WorkflowTrigger {
  type: "pr_created" | "pr_updated" | "manual" | "scheduled";
  conditions?: Record<string, unknown>;
}

export interface WorkflowConfig {
  maxConcurrentTasks?: number;
  taskTimeout?: number;
  retryAttempts?: number;
  notifications?: {
    onSuccess?: boolean;
    onFailure?: boolean;
    channels?: string[];
  };
}

export interface WorkflowContext {
  prId: string;
  projectId: string;
  workflowExecution: WorkflowExecution;
  variables: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface TaskExecutionResult {
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkflowStepExecutor {
  execute(
    step: WorkflowStep,
    context: WorkflowContext,
    task: Task
  ): Promise<TaskExecutionResult>;
}

export interface WorkflowEventHandler {
  onWorkflowStarted?(context: WorkflowContext): Promise<void>;
  onWorkflowCompleted?(context: WorkflowContext): Promise<void>;
  onWorkflowFailed?(context: WorkflowContext, error: string): Promise<void>;
  onStepStarted?(step: WorkflowStep, context: WorkflowContext): Promise<void>;
  onStepCompleted?(step: WorkflowStep, context: WorkflowContext, result: TaskExecutionResult): Promise<void>;
  onStepFailed?(step: WorkflowStep, context: WorkflowContext, error: string): Promise<void>;
}

