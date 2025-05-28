/**
 * Core workflow types for the VoltAgent CI/CD orchestration system
 */

export type WorkflowStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type WorkflowState = 'created' | 'initialized' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'retrying';
export type WorkflowStepType = 'analysis' | 'task_creation' | 'codegen' | 'validation' | 'completion' | 'custom';
export type WorkflowPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Core workflow definition
 */
export interface Workflow {
  id: string;
  title: string;
  description?: string;
  requirementText: string;
  projectContext: Record<string, any>;
  currentState: WorkflowState;
  status: WorkflowStatus;
  priority: WorkflowPriority;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdBy?: string;
  metadata: Record<string, any>;
  steps: WorkflowStep[];
}

/**
 * Individual workflow step definition
 */
export interface WorkflowStep {
  id: string;
  workflowId: string;
  stepType: WorkflowStepType;
  stepName: string;
  stepOrder: number;
  status: WorkflowStepStatus;
  startedAt?: Date;
  completedAt?: Date;
  inputData: Record<string, any>;
  outputData: Record<string, any>;
  errorData: Record<string, any>;
  retryCount: number;
  maxRetries: number;
  dependencies: string[];
  metadata: Record<string, any>;
}

/**
 * Workflow state transition
 */
export interface WorkflowStateTransition {
  id: string;
  workflowId: string;
  fromState?: WorkflowState;
  toState: WorkflowState;
  trigger: string;
  timestamp: Date;
  metadata: Record<string, any>;
}

/**
 * Workflow event
 */
export interface WorkflowEvent {
  id: string;
  workflowId: string;
  eventType: string;
  eventName: string;
  eventData: Record<string, any>;
  timestamp: Date;
  sourceComponent?: string;
  targetComponent?: string;
}

/**
 * Workflow metrics
 */
export interface WorkflowMetric {
  id: string;
  workflowId: string;
  metricName: string;
  metricValue: number;
  unit?: string;
  timestamp: Date;
  stepId?: string;
  metadata: Record<string, any>;
}

/**
 * Workflow creation options
 */
export interface WorkflowCreateOptions {
  title?: string;
  description?: string;
  priority?: WorkflowPriority;
  metadata?: Record<string, any>;
  createdBy?: string;
}

/**
 * Workflow execution options
 */
export interface WorkflowExecutionOptions {
  maxConcurrentSteps?: number;
  stepTimeout?: number;
  enableParallelExecution?: boolean;
  retryDelay?: number;
}

/**
 * Workflow step execution context
 */
export interface WorkflowStepExecutionContext {
  workflow: Workflow;
  step: WorkflowStep;
  previousSteps: WorkflowStep[];
  dependencies: WorkflowStep[];
  executionOptions: WorkflowExecutionOptions;
}

/**
 * Workflow step execution result
 */
export interface WorkflowStepExecutionResult {
  success: boolean;
  outputData?: Record<string, any>;
  errorData?: Record<string, any>;
  shouldRetry?: boolean;
  nextSteps?: string[];
}

/**
 * Workflow orchestrator configuration
 */
export interface WorkflowOrchestratorConfig {
  nlpEngine?: any;
  codegenIntegration?: any;
  validationEngine?: any;
  taskStorage?: any;
  executionOptions?: WorkflowExecutionOptions;
}

/**
 * Workflow progress event data
 */
export interface WorkflowProgressEvent {
  workflowId: string;
  stepId?: string;
  status: WorkflowStatus | WorkflowStepStatus;
  progress: number; // 0-100
  message?: string;
  data?: Record<string, any>;
}

/**
 * Workflow completion event data
 */
export interface WorkflowCompletionEvent {
  workflowId: string;
  status: WorkflowStatus;
  completedAt: Date;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  duration: number; // in milliseconds
  result?: Record<string, any>;
}

/**
 * Error information for workflow failures
 */
export interface WorkflowError {
  code: string;
  message: string;
  details?: Record<string, any>;
  recoverable: boolean;
  retryable: boolean;
  timestamp: Date;
}

/**
 * Workflow analytics data
 */
export interface WorkflowAnalytics {
  totalWorkflows: number;
  completedWorkflows: number;
  failedWorkflows: number;
  activeWorkflows: number;
  averageDuration: number;
  averageStepsPerWorkflow: number;
  stepSuccessRate: number;
  componentCoordinationLatency: number;
  errorRecoverySuccessRate: number;
}

