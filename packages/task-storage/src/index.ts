/**
 * @voltagent/task-storage
 * 
 * PostgreSQL-based task storage and context engine for comprehensive CI/CD workflows
 */

export { TaskStorageManager } from './task-storage-manager';
export { ContextEngine } from './context-engine';
export { DatabaseConnection } from './database/connection';

export type {
  Task,
  TaskStatus,
  TaskPriority,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter,
  TaskDependency,
  DependencyType,
  AIInteraction,
  InteractionType,
  TaskContext,
  ContextType,
  ValidationResult,
  ValidationType,
  ValidationStatus,
  PerformanceMetric,
  MetricType,
  TaskAnalytics,
  DatabaseConfig,
  TaskStorageOptions,
  ContextEngineOptions,
} from './types';

// Re-export for convenience
export * from './types';

