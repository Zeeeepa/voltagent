/**
 * VoltAgent CI/CD Integration Module
 * 
 * This module provides comprehensive CI/CD capabilities integrated with the workflow orchestration system.
 * It includes API server, database integration, and component coordination for AI-driven development pipelines.
 */

export { CICDApiServer, createCICDServer } from './api-server';

// Re-export workflow components for convenience
export {
  VoltAgentWorkflowIntegration,
  WorkflowOrchestrator,
  WorkflowEngine,
  WorkflowStateManager,
  WorkflowEventBus,
  WorkflowEventCoordinator,
  WorkflowMonitor,
  createWorkflowOrchestrator,
  createWorkflowEventBus
} from '../workflow';

export type {
  Workflow,
  WorkflowStep,
  WorkflowStatus,
  WorkflowState,
  WorkflowStepStatus,
  WorkflowStepType,
  WorkflowPriority,
  WorkflowCreateOptions,
  WorkflowExecutionOptions,
  WorkflowProgressEvent,
  WorkflowCompletionEvent,
  WorkflowAnalytics
} from '../workflow/types';

/**
 * Environment configuration for CI/CD system
 */
export interface CICDConfig {
  // Workflow Orchestration Configuration
  WORKFLOW_MAX_CONCURRENT_STEPS?: number;
  WORKFLOW_STEP_TIMEOUT?: number;
  WORKFLOW_ENABLE_PARALLEL_EXECUTION?: boolean;
  WORKFLOW_DEFAULT_MAX_RETRIES?: number;
  WORKFLOW_RETRY_DELAY_MS?: number;

  // Event System Configuration
  EVENT_SYSTEM_ENABLED?: boolean;
  EVENT_QUEUE_SIZE?: number;
  EVENT_PROCESSING_BATCH_SIZE?: number;
  EVENT_RETENTION_DAYS?: number;

  // State Management Configuration
  STATE_MANAGER_MAX_HISTORY_ENTRIES?: number;
  STATE_MANAGER_ENABLE_SNAPSHOTS?: boolean;
  STATE_MANAGER_SNAPSHOT_INTERVAL?: number;

  // Monitoring Configuration
  WORKFLOW_METRICS_ENABLED?: boolean;
  WORKFLOW_ANALYTICS_ENABLED?: boolean;
  WORKFLOW_REAL_TIME_UPDATES?: boolean;

  // API Server Configuration
  API_SERVER_PORT?: number;
  API_SERVER_CORS_ENABLED?: boolean;
  API_SERVER_REQUEST_LIMIT?: string;

  // Integration Configuration
  NLP_ENGINE_ENABLED?: boolean;
  CODEGEN_INTEGRATION_ENABLED?: boolean;
  VALIDATION_ENGINE_ENABLED?: boolean;
  TASK_STORAGE_ENABLED?: boolean;
}

/**
 * Load CI/CD configuration from environment variables
 */
export function loadCICDConfig(): CICDConfig {
  return {
    // Workflow Orchestration Configuration
    WORKFLOW_MAX_CONCURRENT_STEPS: parseInt(process.env.WORKFLOW_MAX_CONCURRENT_STEPS || '10'),
    WORKFLOW_STEP_TIMEOUT: parseInt(process.env.WORKFLOW_STEP_TIMEOUT || '300000'),
    WORKFLOW_ENABLE_PARALLEL_EXECUTION: process.env.WORKFLOW_ENABLE_PARALLEL_EXECUTION !== 'false',
    WORKFLOW_DEFAULT_MAX_RETRIES: parseInt(process.env.WORKFLOW_DEFAULT_MAX_RETRIES || '3'),
    WORKFLOW_RETRY_DELAY_MS: parseInt(process.env.WORKFLOW_RETRY_DELAY_MS || '5000'),

    // Event System Configuration
    EVENT_SYSTEM_ENABLED: process.env.EVENT_SYSTEM_ENABLED !== 'false',
    EVENT_QUEUE_SIZE: parseInt(process.env.EVENT_QUEUE_SIZE || '1000'),
    EVENT_PROCESSING_BATCH_SIZE: parseInt(process.env.EVENT_PROCESSING_BATCH_SIZE || '10'),
    EVENT_RETENTION_DAYS: parseInt(process.env.EVENT_RETENTION_DAYS || '30'),

    // State Management Configuration
    STATE_MANAGER_MAX_HISTORY_ENTRIES: parseInt(process.env.STATE_MANAGER_MAX_HISTORY_ENTRIES || '1000'),
    STATE_MANAGER_ENABLE_SNAPSHOTS: process.env.STATE_MANAGER_ENABLE_SNAPSHOTS !== 'false',
    STATE_MANAGER_SNAPSHOT_INTERVAL: parseInt(process.env.STATE_MANAGER_SNAPSHOT_INTERVAL || '3600'),

    // Monitoring Configuration
    WORKFLOW_METRICS_ENABLED: process.env.WORKFLOW_METRICS_ENABLED !== 'false',
    WORKFLOW_ANALYTICS_ENABLED: process.env.WORKFLOW_ANALYTICS_ENABLED !== 'false',
    WORKFLOW_REAL_TIME_UPDATES: process.env.WORKFLOW_REAL_TIME_UPDATES !== 'false',

    // API Server Configuration
    API_SERVER_PORT: parseInt(process.env.API_SERVER_PORT || '3000'),
    API_SERVER_CORS_ENABLED: process.env.API_SERVER_CORS_ENABLED !== 'false',
    API_SERVER_REQUEST_LIMIT: process.env.API_SERVER_REQUEST_LIMIT || '10mb',

    // Integration Configuration
    NLP_ENGINE_ENABLED: process.env.NLP_ENGINE_ENABLED === 'true',
    CODEGEN_INTEGRATION_ENABLED: process.env.CODEGEN_INTEGRATION_ENABLED === 'true',
    VALIDATION_ENGINE_ENABLED: process.env.VALIDATION_ENGINE_ENABLED === 'true',
    TASK_STORAGE_ENABLED: process.env.TASK_STORAGE_ENABLED === 'true'
  };
}

/**
 * Create a complete CI/CD system with all components
 */
export async function createCompleteCICDSystem(options?: {
  config?: Partial<CICDConfig>;
  nlpEngine?: any;
  codegenIntegration?: any;
  validationEngine?: any;
  taskStorage?: any;
  autoStart?: boolean;
}): Promise<{
  server: CICDApiServer;
  workflow: VoltAgentWorkflowIntegration;
  config: CICDConfig;
}> {
  // Load configuration
  const defaultConfig = loadCICDConfig();
  const config = { ...defaultConfig, ...options?.config };

  // Create workflow integration
  const workflow = new VoltAgentWorkflowIntegration({
    nlpEngine: options?.nlpEngine,
    codegenIntegration: options?.codegenIntegration,
    validationEngine: options?.validationEngine,
    taskStorage: options?.taskStorage,
    executionOptions: {
      maxConcurrentSteps: config.WORKFLOW_MAX_CONCURRENT_STEPS,
      stepTimeout: config.WORKFLOW_STEP_TIMEOUT,
      enableParallelExecution: config.WORKFLOW_ENABLE_PARALLEL_EXECUTION,
      retryDelay: config.WORKFLOW_RETRY_DELAY_MS
    }
  });

  // Create API server
  const server = new CICDApiServer({
    port: config.API_SERVER_PORT,
    nlpEngine: options?.nlpEngine,
    codegenIntegration: options?.codegenIntegration,
    validationEngine: options?.validationEngine,
    taskStorage: options?.taskStorage
  });

  // Start server if auto-start is enabled
  if (options?.autoStart !== false) {
    await server.start();
  }

  return { server, workflow, config };
}

/**
 * Database schema for PostgreSQL integration
 */
export const DATABASE_SCHEMA = `
-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requirement_text TEXT,
    project_context JSONB DEFAULT '{}'::jsonb,
    current_state VARCHAR(50) DEFAULT 'created',
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by VARCHAR(100),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Workflow steps table
CREATE TABLE IF NOT EXISTS workflow_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    step_type VARCHAR(50) NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    step_order INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    input_data JSONB DEFAULT '{}'::jsonb,
    output_data JSONB DEFAULT '{}'::jsonb,
    error_data JSONB DEFAULT '{}'::jsonb,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    dependencies TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Workflow state transitions table
CREATE TABLE IF NOT EXISTS workflow_state_transitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    from_state VARCHAR(50),
    to_state VARCHAR(50) NOT NULL,
    trigger VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Workflow events table
CREATE TABLE IF NOT EXISTS workflow_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_name VARCHAR(100) NOT NULL,
    event_data JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    source_component VARCHAR(100),
    target_component VARCHAR(100)
);

-- Workflow metrics table
CREATE TABLE IF NOT EXISTS workflow_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4),
    unit VARCHAR(20),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    step_id UUID REFERENCES workflow_steps(id),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflows_status ON workflows(status);
CREATE INDEX IF NOT EXISTS idx_workflows_current_state ON workflows(current_state);
CREATE INDEX IF NOT EXISTS idx_workflows_created_at ON workflows(created_at);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_status ON workflow_steps(status);
CREATE INDEX IF NOT EXISTS idx_workflow_steps_type ON workflow_steps(step_type);
CREATE INDEX IF NOT EXISTS idx_workflow_state_transitions_workflow_id ON workflow_state_transitions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_events_workflow_id ON workflow_events(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_events_type ON workflow_events(event_type);
CREATE INDEX IF NOT EXISTS idx_workflow_metrics_workflow_id ON workflow_metrics(workflow_id);
`;

/**
 * Example environment configuration file
 */
export const EXAMPLE_ENV_CONFIG = `
# VoltAgent CI/CD Workflow Orchestration Configuration

# Workflow Orchestration Configuration
WORKFLOW_MAX_CONCURRENT_STEPS=10
WORKFLOW_STEP_TIMEOUT=300000
WORKFLOW_ENABLE_PARALLEL_EXECUTION=true
WORKFLOW_DEFAULT_MAX_RETRIES=3
WORKFLOW_RETRY_DELAY_MS=5000

# Event System Configuration
EVENT_SYSTEM_ENABLED=true
EVENT_QUEUE_SIZE=1000
EVENT_PROCESSING_BATCH_SIZE=10
EVENT_RETENTION_DAYS=30

# State Management Configuration
STATE_MANAGER_MAX_HISTORY_ENTRIES=1000
STATE_MANAGER_ENABLE_SNAPSHOTS=true
STATE_MANAGER_SNAPSHOT_INTERVAL=3600

# Monitoring Configuration
WORKFLOW_METRICS_ENABLED=true
WORKFLOW_ANALYTICS_ENABLED=true
WORKFLOW_REAL_TIME_UPDATES=true

# API Server Configuration
API_SERVER_PORT=3000
API_SERVER_CORS_ENABLED=true
API_SERVER_REQUEST_LIMIT=10mb

# Integration Configuration
NLP_ENGINE_ENABLED=false
CODEGEN_INTEGRATION_ENABLED=false
VALIDATION_ENGINE_ENABLED=false
TASK_STORAGE_ENABLED=false

# Database Configuration (if using PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/voltagent_cicd
DATABASE_POOL_SIZE=10
DATABASE_TIMEOUT=30000
`;

export default {
  CICDApiServer,
  createCICDServer,
  createCompleteCICDSystem,
  loadCICDConfig,
  DATABASE_SCHEMA,
  EXAMPLE_ENV_CONFIG
};

