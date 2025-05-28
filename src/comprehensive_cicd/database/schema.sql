-- Comprehensive CI/CD System Database Schema
-- Claude Code Validation Integration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tasks table (main CI/CD tasks)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Validation sessions table
CREATE TABLE IF NOT EXISTS validation_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    pr_url VARCHAR(255) NOT NULL,
    pr_number INTEGER,
    branch_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    wsl2_instance_id VARCHAR(100),
    deployment_path VARCHAR(500),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    validation_duration_ms INTEGER,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Validation scores table
CREATE TABLE IF NOT EXISTS validation_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    validation_session_id UUID REFERENCES validation_sessions(id) ON DELETE CASCADE,
    overall_score DECIMAL(5,2) NOT NULL,
    code_quality_score DECIMAL(5,2),
    functionality_score DECIMAL(5,2),
    testing_score DECIMAL(5,2),
    documentation_score DECIMAL(5,2),
    grade VARCHAR(5),
    strengths TEXT[],
    weaknesses TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Validation feedback table
CREATE TABLE IF NOT EXISTS validation_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    validation_session_id UUID REFERENCES validation_sessions(id) ON DELETE CASCADE,
    feedback_type VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL,
    file_path VARCHAR(500),
    line_number INTEGER,
    suggestions TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WSL2 instances table
CREATE TABLE IF NOT EXISTS wsl2_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    instance_name VARCHAR(100) UNIQUE NOT NULL,
    project_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'creating',
    distro VARCHAR(50) DEFAULT 'Ubuntu-22.04',
    base_path VARCHAR(500),
    resource_limits JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- AgentAPI requests table
CREATE TABLE IF NOT EXISTS agentapi_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    validation_session_id UUID REFERENCES validation_sessions(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL,
    request_payload JSONB NOT NULL,
    response_payload JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    error_message TEXT
);

-- System metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    metric_unit VARCHAR(20),
    tags JSONB DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_validation_sessions_task_id ON validation_sessions(task_id);
CREATE INDEX IF NOT EXISTS idx_validation_sessions_status ON validation_sessions(status);
CREATE INDEX IF NOT EXISTS idx_validation_sessions_pr_number ON validation_sessions(pr_number);
CREATE INDEX IF NOT EXISTS idx_validation_scores_session_id ON validation_scores(validation_session_id);
CREATE INDEX IF NOT EXISTS idx_validation_feedback_session_id ON validation_feedback(validation_session_id);
CREATE INDEX IF NOT EXISTS idx_validation_feedback_severity ON validation_feedback(severity);
CREATE INDEX IF NOT EXISTS idx_wsl2_instances_status ON wsl2_instances(status);
CREATE INDEX IF NOT EXISTS idx_wsl2_instances_project_id ON wsl2_instances(project_id);
CREATE INDEX IF NOT EXISTS idx_agentapi_requests_session_id ON agentapi_requests(validation_session_id);
CREATE INDEX IF NOT EXISTS idx_agentapi_requests_status ON agentapi_requests(status);
CREATE INDEX IF NOT EXISTS idx_system_metrics_name_time ON system_metrics(metric_name, recorded_at);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE OR REPLACE VIEW validation_session_summary AS
SELECT 
    vs.id,
    vs.task_id,
    vs.pr_url,
    vs.pr_number,
    vs.branch_name,
    vs.status,
    vs.started_at,
    vs.completed_at,
    vs.validation_duration_ms,
    vsc.overall_score,
    vsc.grade,
    COUNT(vf.id) as feedback_count,
    wi.instance_name as wsl2_instance_name,
    wi.status as wsl2_status
FROM validation_sessions vs
LEFT JOIN validation_scores vsc ON vs.id = vsc.validation_session_id
LEFT JOIN validation_feedback vf ON vs.id = vf.validation_session_id
LEFT JOIN wsl2_instances wi ON vs.wsl2_instance_id = wi.instance_name
GROUP BY vs.id, vsc.overall_score, vsc.grade, wi.instance_name, wi.status;

-- Performance monitoring view
CREATE OR REPLACE VIEW system_performance_summary AS
SELECT 
    DATE_TRUNC('hour', recorded_at) as hour,
    metric_name,
    AVG(metric_value) as avg_value,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value,
    COUNT(*) as sample_count
FROM system_metrics
WHERE recorded_at >= NOW() - INTERVAL '24 hours'
GROUP BY DATE_TRUNC('hour', recorded_at), metric_name
ORDER BY hour DESC, metric_name;

