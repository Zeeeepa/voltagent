-- Performance indexes for VoltAgent database
-- Phase 1.3: Setup Database Event Storage System

-- Events table indexes
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_correlation_id ON events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_events_agent_id ON events(agent_id);
CREATE INDEX IF NOT EXISTS idx_events_history_id ON events(history_id);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);

-- JSONB indexes for events data
CREATE INDEX IF NOT EXISTS idx_events_data_gin ON events USING GIN(data);

-- Requirements table indexes
CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);
CREATE INDEX IF NOT EXISTS idx_requirements_complexity_score ON requirements(complexity_score);
CREATE INDEX IF NOT EXISTS idx_requirements_created_at ON requirements(created_at);

-- JSONB indexes for requirements
CREATE INDEX IF NOT EXISTS idx_requirements_dependencies_gin ON requirements USING GIN(dependencies);
CREATE INDEX IF NOT EXISTS idx_requirements_metadata_gin ON requirements USING GIN(metadata);

-- Tasks table indexes
CREATE INDEX IF NOT EXISTS idx_tasks_requirement_id ON tasks(requirement_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_agent ON tasks(assigned_agent);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);

-- JSONB indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_metadata_gin ON tasks USING GIN(metadata);

-- Correlations table indexes
CREATE INDEX IF NOT EXISTS idx_correlations_task_id ON correlations(task_id);
CREATE INDEX IF NOT EXISTS idx_correlations_linear_issue_id ON correlations(linear_issue_id);
CREATE INDEX IF NOT EXISTS idx_correlations_github_pr_number ON correlations(github_pr_number);
CREATE INDEX IF NOT EXISTS idx_correlations_correlation_type ON correlations(correlation_type);
CREATE INDEX IF NOT EXISTS idx_correlations_created_at ON correlations(created_at);

-- JSONB indexes for correlations
CREATE INDEX IF NOT EXISTS idx_correlations_metadata_gin ON correlations USING GIN(metadata);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_events_agent_timestamp ON events(agent_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_events_type_source ON events(event_type, source);
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX IF NOT EXISTS idx_tasks_agent_status ON tasks(assigned_agent, status);

