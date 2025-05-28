-- Comprehensive CI/CD Database Schema for VoltAgent Task Storage
-- PostgreSQL Task Storage and Context Engine

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core Tasks Table (Enhanced from PR-15)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requirements JSONB DEFAULT '{}'::jsonb,
    acceptance_criteria JSONB DEFAULT '{}'::jsonb,
    affected_files TEXT[],
    complexity_score INTEGER CHECK (complexity_score >= 1 AND complexity_score <= 10),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending', 'in-progress', 'blocked', 'review', 'testing', 'completed', 'cancelled', 'failed'
    )),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_to VARCHAR(100),
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    estimated_hours DECIMAL(5,2),
    actual_hours DECIMAL(5,2),
    parent_task_id UUID REFERENCES tasks(id),
    project_id VARCHAR(100),
    workflow_id UUID
);

-- Task Dependencies (Enhanced)
CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    child_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'blocks' CHECK (dependency_type IN (
        'blocks', 'depends_on', 'related', 'subtask'
    )),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    UNIQUE(parent_task_id, child_task_id, dependency_type)
);

-- AI Interactions (Enhanced)
CREATE TABLE IF NOT EXISTS ai_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    agent_name VARCHAR(100) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL CHECK (interaction_type IN (
        'task_creation', 'task_analysis', 'code_generation', 'validation', 'review', 'deployment', 'monitoring'
    )),
    request_data JSONB,
    response_data JSONB,
    execution_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id VARCHAR(100),
    workflow_step VARCHAR(100)
);

-- Context Storage (New)
CREATE TABLE IF NOT EXISTS task_context (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    context_type VARCHAR(50) NOT NULL CHECK (context_type IN (
        'requirements', 'codebase_analysis', 'dependencies', 'test_results', 
        'deployment_config', 'performance_metrics', 'user_feedback', 'ai_analysis'
    )),
    context_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    UNIQUE(task_id, context_type, version)
);

-- Validation Results (New)
CREATE TABLE IF NOT EXISTS validation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    validation_type VARCHAR(50) NOT NULL CHECK (validation_type IN (
        'code_quality', 'security', 'performance', 'functionality', 'compliance', 'accessibility'
    )),
    validator_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL CHECK (status IN ('passed', 'failed', 'warning', 'skipped')),
    score DECIMAL(5,2),
    details JSONB DEFAULT '{}'::jsonb,
    suggestions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance Metrics (New)
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN (
        'execution_time', 'memory_usage', 'cpu_usage', 'network_latency', 
        'throughput', 'error_rate', 'success_rate'
    )),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4),
    unit VARCHAR(20),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Comprehensive Indexing Strategy
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_workflow_id ON tasks(workflow_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_tasks_metadata ON tasks USING GIN(metadata);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_parent ON task_dependencies(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_child ON task_dependencies(child_task_id);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_task_id ON ai_interactions(task_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_session ON ai_interactions(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_agent_name ON ai_interactions(agent_name);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_created_at ON ai_interactions(created_at);

CREATE INDEX IF NOT EXISTS idx_task_context_task_type ON task_context(task_id, context_type);
CREATE INDEX IF NOT EXISTS idx_task_context_updated_at ON task_context(updated_at);

CREATE INDEX IF NOT EXISTS idx_validation_results_task_id ON validation_results(task_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_type_status ON validation_results(validation_type, status);
CREATE INDEX IF NOT EXISTS idx_validation_results_created_at ON validation_results(created_at);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_task_type ON performance_metrics(task_id, metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);

-- Triggers for automatic updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_context_updated_at BEFORE UPDATE ON task_context
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW task_summary AS
SELECT 
    t.id,
    t.title,
    t.status,
    t.priority,
    t.assigned_to,
    t.created_at,
    t.updated_at,
    t.project_id,
    t.workflow_id,
    COALESCE(array_length(t.tags, 1), 0) as tag_count,
    (SELECT COUNT(*) FROM task_dependencies td WHERE td.parent_task_id = t.id) as child_count,
    (SELECT COUNT(*) FROM ai_interactions ai WHERE ai.task_id = t.id) as interaction_count,
    (SELECT COUNT(*) FROM validation_results vr WHERE vr.task_id = t.id) as validation_count
FROM tasks t;

CREATE OR REPLACE VIEW task_analytics_summary AS
SELECT 
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_tasks,
    COUNT(*) FILTER (WHERE status = 'in-progress') as in_progress_tasks,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_tasks,
    COUNT(*) FILTER (WHERE priority = 'critical') as critical_tasks,
    COUNT(*) FILTER (WHERE priority = 'high') as high_priority_tasks,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) FILTER (WHERE status = 'completed') as avg_completion_hours,
    COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / NULLIF(COUNT(*), 0) as success_rate
FROM tasks;

-- Function to get task full context
CREATE OR REPLACE FUNCTION get_task_full_context(task_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}';
    context_record RECORD;
BEGIN
    -- Get all context for the task
    FOR context_record IN 
        SELECT context_type, context_data, version, updated_at
        FROM task_context 
        WHERE task_id = task_uuid 
        ORDER BY context_type, version DESC
    LOOP
        result := result || jsonb_build_object(
            context_record.context_type, 
            jsonb_build_object(
                'data', context_record.context_data,
                'version', context_record.version,
                'updated_at', context_record.updated_at
            )
        );
    END LOOP;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

