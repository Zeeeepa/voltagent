-- Migration: Create event storage tables
-- Version: 001
-- Description: Initial event storage schema with proper indexing

-- Create events table for general system events
CREATE TABLE IF NOT EXISTS voltagent_events_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    agent_id VARCHAR(255),
    session_id VARCHAR(255),
    user_id VARCHAR(255),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    data JSONB NOT NULL DEFAULT '{}',
    metadata JSONB NOT NULL DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'completed',
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create task_events table for task-specific tracking
CREATE TABLE IF NOT EXISTS voltagent_events_task_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id VARCHAR(255) NOT NULL,
    task_name VARCHAR(255) NOT NULL,
    agent_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'started',
    input_data JSONB,
    output_data JSONB,
    error_data JSONB,
    metadata JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create agent_events table for agent activity tracking
CREATE TABLE IF NOT EXISTS voltagent_events_agent_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id VARCHAR(255) NOT NULL,
    agent_name VARCHAR(255),
    parent_agent_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    action VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    context JSONB,
    result JSONB,
    error_data JSONB,
    metadata JSONB NOT NULL DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create deployment_events table for WSL2 tracking
CREATE TABLE IF NOT EXISTS voltagent_events_deployment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id VARCHAR(255) NOT NULL,
    environment VARCHAR(100) NOT NULL DEFAULT 'wsl2',
    event_type VARCHAR(100) NOT NULL,
    event_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    branch_name VARCHAR(255),
    commit_hash VARCHAR(255),
    pr_number INTEGER,
    deployment_config JSONB,
    logs JSONB,
    error_data JSONB,
    metadata JSONB NOT NULL DEFAULT '{}',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create event_batches table for batch processing
CREATE TABLE IF NOT EXISTS voltagent_events_event_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id VARCHAR(255) NOT NULL UNIQUE,
    event_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_data JSONB,
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance optimization

-- Events table indexes
CREATE INDEX IF NOT EXISTS idx_events_event_type ON voltagent_events_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_agent_id ON voltagent_events_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON voltagent_events_events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON voltagent_events_events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON voltagent_events_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_events_status ON voltagent_events_events(status);
CREATE INDEX IF NOT EXISTS idx_events_composite ON voltagent_events_events(agent_id, event_type, timestamp DESC);

-- Task events table indexes
CREATE INDEX IF NOT EXISTS idx_task_events_task_id ON voltagent_events_task_events(task_id);
CREATE INDEX IF NOT EXISTS idx_task_events_agent_id ON voltagent_events_task_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_task_events_event_type ON voltagent_events_task_events(event_type);
CREATE INDEX IF NOT EXISTS idx_task_events_status ON voltagent_events_task_events(status);
CREATE INDEX IF NOT EXISTS idx_task_events_started_at ON voltagent_events_task_events(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_events_composite ON voltagent_events_task_events(task_id, agent_id, started_at DESC);

-- Agent events table indexes
CREATE INDEX IF NOT EXISTS idx_agent_events_agent_id ON voltagent_events_agent_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_parent_agent_id ON voltagent_events_agent_events(parent_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_event_type ON voltagent_events_agent_events(event_type);
CREATE INDEX IF NOT EXISTS idx_agent_events_status ON voltagent_events_agent_events(status);
CREATE INDEX IF NOT EXISTS idx_agent_events_timestamp ON voltagent_events_agent_events(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_agent_events_composite ON voltagent_events_agent_events(agent_id, event_type, timestamp DESC);

-- Deployment events table indexes
CREATE INDEX IF NOT EXISTS idx_deployment_events_deployment_id ON voltagent_events_deployment_events(deployment_id);
CREATE INDEX IF NOT EXISTS idx_deployment_events_environment ON voltagent_events_deployment_events(environment);
CREATE INDEX IF NOT EXISTS idx_deployment_events_event_type ON voltagent_events_deployment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_deployment_events_status ON voltagent_events_deployment_events(status);
CREATE INDEX IF NOT EXISTS idx_deployment_events_branch_name ON voltagent_events_deployment_events(branch_name);
CREATE INDEX IF NOT EXISTS idx_deployment_events_pr_number ON voltagent_events_deployment_events(pr_number);
CREATE INDEX IF NOT EXISTS idx_deployment_events_started_at ON voltagent_events_deployment_events(started_at DESC);

-- Event batches table indexes
CREATE INDEX IF NOT EXISTS idx_event_batches_batch_id ON voltagent_events_event_batches(batch_id);
CREATE INDEX IF NOT EXISTS idx_event_batches_status ON voltagent_events_event_batches(status);
CREATE INDEX IF NOT EXISTS idx_event_batches_started_at ON voltagent_events_event_batches(started_at DESC);

-- Create triggers for automatic updated_at timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all event tables
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON voltagent_events_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_events_updated_at BEFORE UPDATE ON voltagent_events_task_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agent_events_updated_at BEFORE UPDATE ON voltagent_events_agent_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deployment_events_updated_at BEFORE UPDATE ON voltagent_events_deployment_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_batches_updated_at BEFORE UPDATE ON voltagent_events_event_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

