-- Comprehensive CI/CD Database Initialization Script
-- This script sets up the initial database schema and configuration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    requirements JSONB DEFAULT '[]',
    acceptance_criteria JSONB DEFAULT '[]',
    dependencies JSONB DEFAULT '[]',
    codebase_context JSONB,
    validation_requirements JSONB,
    priority VARCHAR(20) DEFAULT 'medium',
    estimated_complexity VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    tags JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    assigned_to VARCHAR(255)
);

-- Create codegen_requests table
CREATE TABLE IF NOT EXISTS codegen_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    request_id VARCHAR(255),
    prompt_data JSONB NOT NULL,
    response_data JSONB,
    pr_url VARCHAR(255),
    pr_number INTEGER,
    branch_name VARCHAR(255),
    commit_sha VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    generation_time_ms INTEGER,
    creation_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workflow_executions table
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    codegen_request_id UUID REFERENCES codegen_requests(id) ON DELETE CASCADE,
    workflow_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    input_data JSONB,
    output_data JSONB,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);

CREATE INDEX IF NOT EXISTS idx_codegen_requests_task_id ON codegen_requests(task_id);
CREATE INDEX IF NOT EXISTS idx_codegen_requests_status ON codegen_requests(status);
CREATE INDEX IF NOT EXISTS idx_codegen_requests_created_at ON codegen_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_codegen_requests_pr_number ON codegen_requests(pr_number);

CREATE INDEX IF NOT EXISTS idx_workflow_executions_task_id ON workflow_executions(task_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_type ON workflow_executions(workflow_type);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at 
    BEFORE UPDATE ON tasks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_codegen_requests_updated_at ON codegen_requests;
CREATE TRIGGER update_codegen_requests_updated_at 
    BEFORE UPDATE ON codegen_requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional)
INSERT INTO tasks (
    title, 
    description, 
    requirements, 
    acceptance_criteria, 
    priority, 
    estimated_complexity,
    tags,
    created_by
) VALUES (
    'Sample Task: User Authentication',
    'Implement a comprehensive user authentication system with JWT tokens',
    '["Support email/password login", "Include password reset functionality", "Implement role-based access control"]',
    '["Users can register with email/password", "Login returns valid JWT token", "Protected routes require authentication"]',
    'high',
    'medium',
    '["authentication", "security", "backend"]',
    'system'
) ON CONFLICT DO NOTHING;

-- Create a view for task statistics
CREATE OR REPLACE VIEW task_statistics AS
SELECT 
    status,
    priority,
    estimated_complexity,
    COUNT(*) as count,
    AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration_seconds
FROM tasks 
GROUP BY status, priority, estimated_complexity;

-- Create a view for codegen request metrics
CREATE OR REPLACE VIEW codegen_metrics AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    status,
    COUNT(*) as request_count,
    AVG(generation_time_ms) as avg_generation_time_ms,
    AVG(creation_time_ms) as avg_creation_time_ms,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_requests,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_requests
FROM codegen_requests 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at), status
ORDER BY hour DESC;

-- Grant permissions to the codegen user
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO codegen_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO codegen_user;
GRANT SELECT ON ALL VIEWS IN SCHEMA public TO codegen_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO codegen_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO codegen_user;

COMMIT;

