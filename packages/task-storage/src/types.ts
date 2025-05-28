/**
 * Core types for the PostgreSQL Task Storage and Context Engine
 */

export interface Task {
  id: string;
  title: string;
  description?: string;
  requirements?: Record<string, any>;
  acceptance_criteria?: Record<string, any>;
  affected_files?: string[];
  complexity_score?: number;
  status: TaskStatus;
  priority: TaskPriority;
  created_at: Date;
  updated_at: Date;
  assigned_to?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  estimated_hours?: number;
  actual_hours?: number;
  parent_task_id?: string;
  project_id?: string;
  workflow_id?: string;
}

export type TaskStatus = 
  | 'pending'
  | 'in-progress'
  | 'blocked'
  | 'review'
  | 'testing'
  | 'completed'
  | 'cancelled'
  | 'failed';

export type TaskPriority = 
  | 'low'
  | 'medium'
  | 'high'
  | 'critical';

export interface TaskDependency {
  id: string;
  parent_task_id: string;
  child_task_id: string;
  dependency_type: DependencyType;
  created_at: Date;
  metadata?: Record<string, any>;
}

export type DependencyType = 
  | 'blocks'
  | 'depends_on'
  | 'related'
  | 'subtask';

export interface AIInteraction {
  id: string;
  task_id: string;
  agent_name: string;
  interaction_type: InteractionType;
  request_data?: Record<string, any>;
  response_data?: Record<string, any>;
  execution_time_ms?: number;
  success: boolean;
  created_at: Date;
  session_id?: string;
  workflow_step?: string;
}

export type InteractionType = 
  | 'task_creation'
  | 'task_analysis'
  | 'code_generation'
  | 'validation'
  | 'review'
  | 'deployment'
  | 'monitoring';

export interface TaskContext {
  id: string;
  task_id: string;
  context_type: ContextType;
  context_data: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  version: number;
}

export type ContextType = 
  | 'requirements'
  | 'codebase_analysis'
  | 'dependencies'
  | 'test_results'
  | 'deployment_config'
  | 'performance_metrics'
  | 'user_feedback'
  | 'ai_analysis';

export interface ValidationResult {
  id: string;
  task_id: string;
  validation_type: ValidationType;
  validator_name: string;
  status: ValidationStatus;
  score?: number;
  details?: Record<string, any>;
  suggestions?: Record<string, any>;
  created_at: Date;
}

export type ValidationType = 
  | 'code_quality'
  | 'security'
  | 'performance'
  | 'functionality'
  | 'compliance'
  | 'accessibility';

export type ValidationStatus = 
  | 'passed'
  | 'failed'
  | 'warning'
  | 'skipped';

export interface PerformanceMetric {
  id: string;
  task_id: string;
  metric_type: MetricType;
  metric_name: string;
  metric_value: number;
  unit?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export type MetricType = 
  | 'execution_time'
  | 'memory_usage'
  | 'cpu_usage'
  | 'network_latency'
  | 'throughput'
  | 'error_rate'
  | 'success_rate';

export interface CreateTaskInput {
  title: string;
  description?: string;
  requirements?: Record<string, any>;
  acceptance_criteria?: Record<string, any>;
  affected_files?: string[];
  complexity_score?: number;
  priority?: TaskPriority;
  assigned_to?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  estimated_hours?: number;
  parent_task_id?: string;
  project_id?: string;
  workflow_id?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  requirements?: Record<string, any>;
  acceptance_criteria?: Record<string, any>;
  affected_files?: string[];
  complexity_score?: number;
  status?: TaskStatus;
  priority?: TaskPriority;
  assigned_to?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  estimated_hours?: number;
  actual_hours?: number;
}

export interface TaskFilter {
  status?: TaskStatus | TaskStatus[];
  priority?: TaskPriority | TaskPriority[];
  assigned_to?: string;
  project_id?: string;
  workflow_id?: string;
  parent_task_id?: string;
  tags?: string[];
  created_after?: Date;
  created_before?: Date;
  updated_after?: Date;
  updated_before?: Date;
}

export interface TaskAnalytics {
  total_tasks: number;
  tasks_by_status: Record<TaskStatus, number>;
  tasks_by_priority: Record<TaskPriority, number>;
  average_completion_time: number;
  success_rate: number;
  most_common_tags: Array<{ tag: string; count: number }>;
  performance_trends: Array<{
    date: string;
    completed_tasks: number;
    average_time: number;
  }>;
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | object;
  pool?: {
    min?: number;
    max?: number;
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
  };
}

export interface TaskStorageOptions {
  database: DatabaseConfig;
  enableQueryLogging?: boolean;
  enableSlowQueryLogging?: boolean;
  slowQueryThresholdMs?: number;
  enableConnectionPooling?: boolean;
}

export interface ContextEngineOptions {
  enableCaching?: boolean;
  cacheTtlSeconds?: number;
  enableCompression?: boolean;
  maxContextSizeMb?: number;
}

