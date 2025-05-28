import { z } from 'zod';

// Core pipeline types
export interface PipelineContext {
  id: string;
  userId: string;
  projectId: string;
  requirements: NaturalLanguageRequirement;
  status: PipelineStatus;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, any>;
}

export enum PipelineStatus {
  PENDING = 'pending',
  ANALYZING = 'analyzing',
  GENERATING = 'generating',
  VALIDATING = 'validating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Natural Language Requirements
export interface NaturalLanguageRequirement {
  id: string;
  text: string;
  intent: RequirementIntent;
  entities: ExtractedEntity[];
  confidence: number;
  complexity: ComplexityLevel;
  estimatedEffort: EffortEstimate;
}

export enum RequirementIntent {
  CREATE_FEATURE = 'create_feature',
  FIX_BUG = 'fix_bug',
  REFACTOR_CODE = 'refactor_code',
  ADD_TESTS = 'add_tests',
  UPDATE_DOCUMENTATION = 'update_documentation',
  OPTIMIZE_PERFORMANCE = 'optimize_performance',
  ADD_INTEGRATION = 'add_integration'
}

export interface ExtractedEntity {
  type: EntityType;
  value: string;
  confidence: number;
  position: [number, number];
}

export enum EntityType {
  COMPONENT = 'component',
  FUNCTION = 'function',
  FILE_PATH = 'file_path',
  TECHNOLOGY = 'technology',
  FRAMEWORK = 'framework',
  API_ENDPOINT = 'api_endpoint',
  DATABASE_TABLE = 'database_table',
  BUSINESS_LOGIC = 'business_logic'
}

export enum ComplexityLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export interface EffortEstimate {
  hours: number;
  confidence: number;
  factors: string[];
}

// Task Storage
export interface Task {
  id: string;
  pipelineId: string;
  parentTaskId?: string;
  type: TaskType;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;
  dependencies: string[];
  artifacts: TaskArtifact[];
  context: TaskContext;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export enum TaskType {
  ANALYSIS = 'analysis',
  CODE_GENERATION = 'code_generation',
  TESTING = 'testing',
  VALIDATION = 'validation',
  DEPLOYMENT = 'deployment',
  DOCUMENTATION = 'documentation'
}

export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  BLOCKED = 'blocked',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface TaskArtifact {
  id: string;
  type: ArtifactType;
  name: string;
  content: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export enum ArtifactType {
  CODE_FILE = 'code_file',
  TEST_FILE = 'test_file',
  DOCUMENTATION = 'documentation',
  CONFIGURATION = 'configuration',
  SCHEMA = 'schema',
  ANALYSIS_REPORT = 'analysis_report'
}

export interface TaskContext {
  codebase: CodebaseContext;
  requirements: NaturalLanguageRequirement;
  constraints: Constraint[];
  preferences: UserPreferences;
}

export interface CodebaseContext {
  repositoryUrl: string;
  branch: string;
  language: string;
  framework: string;
  dependencies: string[];
  structure: FileStructure[];
}

export interface FileStructure {
  path: string;
  type: 'file' | 'directory';
  size?: number;
  lastModified?: Date;
}

export interface Constraint {
  type: ConstraintType;
  description: string;
  severity: 'error' | 'warning' | 'info';
}

export enum ConstraintType {
  CODING_STANDARD = 'coding_standard',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  COMPATIBILITY = 'compatibility',
  BUSINESS_RULE = 'business_rule'
}

export interface UserPreferences {
  codingStyle: string;
  testingFramework: string;
  documentationLevel: 'minimal' | 'standard' | 'comprehensive';
  reviewLevel: 'basic' | 'thorough' | 'strict';
}

// Code Generation and Validation
export interface CodeGenerationRequest {
  taskId: string;
  context: TaskContext;
  template?: string;
  parameters: Record<string, any>;
}

export interface CodeGenerationResult {
  taskId: string;
  files: GeneratedFile[];
  tests: GeneratedFile[];
  documentation: GeneratedFile[];
  metadata: GenerationMetadata;
}

export interface GeneratedFile {
  path: string;
  content: string;
  language: string;
  type: ArtifactType;
  dependencies: string[];
}

export interface GenerationMetadata {
  model: string;
  tokens: number;
  duration: number;
  confidence: number;
  warnings: string[];
}

export interface ValidationRequest {
  files: GeneratedFile[];
  context: TaskContext;
  rules: ValidationRule[];
}

export interface ValidationRule {
  id: string;
  name: string;
  type: ValidationRuleType;
  severity: 'error' | 'warning' | 'info';
  description: string;
  pattern?: string;
  function?: string;
}

export enum ValidationRuleType {
  SYNTAX = 'syntax',
  STYLE = 'style',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  BEST_PRACTICE = 'best_practice',
  BUSINESS_LOGIC = 'business_logic'
}

export interface ValidationResult {
  taskId: string;
  overall: ValidationStatus;
  issues: ValidationIssue[];
  metrics: ValidationMetrics;
  suggestions: ValidationSuggestion[];
}

export enum ValidationStatus {
  PASSED = 'passed',
  PASSED_WITH_WARNINGS = 'passed_with_warnings',
  FAILED = 'failed'
}

export interface ValidationIssue {
  id: string;
  rule: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  file: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface ValidationMetrics {
  totalIssues: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  codeQualityScore: number;
  securityScore: number;
  performanceScore: number;
}

export interface ValidationSuggestion {
  type: 'improvement' | 'optimization' | 'refactoring';
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
}

// Workflow Orchestration
export interface WorkflowDefinition {
  id: string;
  name: string;
  version: string;
  description: string;
  steps: WorkflowStep[];
  triggers: WorkflowTrigger[];
  configuration: WorkflowConfiguration;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: WorkflowStepType;
  dependencies: string[];
  configuration: Record<string, any>;
  timeout?: number;
  retries?: number;
  condition?: string;
}

export enum WorkflowStepType {
  NLP_ANALYSIS = 'nlp_analysis',
  TASK_DECOMPOSITION = 'task_decomposition',
  CODE_GENERATION = 'code_generation',
  CODE_VALIDATION = 'code_validation',
  TESTING = 'testing',
  DEPLOYMENT = 'deployment',
  NOTIFICATION = 'notification'
}

export interface WorkflowTrigger {
  type: TriggerType;
  configuration: Record<string, any>;
}

export enum TriggerType {
  MANUAL = 'manual',
  SCHEDULE = 'schedule',
  WEBHOOK = 'webhook',
  FILE_CHANGE = 'file_change',
  PR_CREATED = 'pr_created',
  ISSUE_CREATED = 'issue_created'
}

export interface WorkflowConfiguration {
  maxConcurrency: number;
  timeout: number;
  retryPolicy: RetryPolicy;
  notifications: NotificationConfiguration[];
}

export interface RetryPolicy {
  maxRetries: number;
  backoffStrategy: 'linear' | 'exponential';
  baseDelay: number;
  maxDelay: number;
}

export interface NotificationConfiguration {
  type: 'email' | 'slack' | 'webhook';
  events: string[];
  configuration: Record<string, any>;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  pipelineId: string;
  status: WorkflowExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  steps: WorkflowStepExecution[];
  context: Record<string, any>;
  error?: string;
}

export enum WorkflowExecutionStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface WorkflowStepExecution {
  stepId: string;
  status: WorkflowExecutionStatus;
  startedAt: Date;
  completedAt?: Date;
  output?: any;
  error?: string;
  retryCount: number;
}

// Zod schemas for validation
export const PipelineContextSchema = z.object({
  id: z.string(),
  userId: z.string(),
  projectId: z.string(),
  requirements: z.any(), // Will be defined separately
  status: z.nativeEnum(PipelineStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
  metadata: z.record(z.any())
});

export const TaskSchema = z.object({
  id: z.string(),
  pipelineId: z.string(),
  parentTaskId: z.string().optional(),
  type: z.nativeEnum(TaskType),
  title: z.string(),
  description: z.string(),
  status: z.nativeEnum(TaskStatus),
  priority: z.nativeEnum(TaskPriority),
  assignee: z.string().optional(),
  dependencies: z.array(z.string()),
  artifacts: z.array(z.any()), // Will be defined separately
  context: z.any(), // Will be defined separately
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional()
});

export const ValidationResultSchema = z.object({
  taskId: z.string(),
  overall: z.nativeEnum(ValidationStatus),
  issues: z.array(z.any()), // Will be defined separately
  metrics: z.any(), // Will be defined separately
  suggestions: z.array(z.any()) // Will be defined separately
});

