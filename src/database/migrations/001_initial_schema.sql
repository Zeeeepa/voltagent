-- Task Master Database Schema
-- Phase 4.1: Comprehensive Database & Event Storage Implementation

-- Requirements table for granular requirement definitions
CREATE TABLE IF NOT EXISTS requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  complexity_score INTEGER CHECK (complexity_score >= 1 AND complexity_score <= 10),
  estimated_hours INTEGER CHECK (estimated_hours > 0),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')),
  parent_id UUID REFERENCES requirements(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Tasks table for hierarchical task management
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_id UUID REFERENCES requirements(id) ON DELETE CASCADE,
  linear_issue_id VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked', 'cancelled')),
  priority INTEGER DEFAULT 3 CHECK (priority >= 1 AND priority <= 5),
  assigned_to VARCHAR(100),
  estimated_hours INTEGER CHECK (estimated_hours > 0),
  actual_hours INTEGER CHECK (actual_hours >= 0),
  parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Events table for comprehensive system logging
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  source VARCHAR(100) NOT NULL,
  actor VARCHAR(100),
  target_type VARCHAR(100),
  target_id VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP DEFAULT NOW(),
  correlation_id UUID,
  session_id VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Correlations table for cross-system tracking
CREATE TABLE IF NOT EXISTS correlations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_master_id UUID,
  linear_issue_id VARCHAR(100),
  github_pr_id VARCHAR(100),
  codegen_request_id VARCHAR(100),
  claude_session_id VARCHAR(100),
  wsl2_deployment_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed', 'failed')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for performance optimization

-- Requirements indexes
CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);
CREATE INDEX IF NOT EXISTS idx_requirements_priority ON requirements(priority);
CREATE INDEX IF NOT EXISTS idx_requirements_parent_id ON requirements(parent_id);
CREATE INDEX IF NOT EXISTS idx_requirements_created_at ON requirements(created_at);
CREATE INDEX IF NOT EXISTS idx_requirements_updated_at ON requirements(updated_at);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_requirement_id ON tasks(requirement_id);
CREATE INDEX IF NOT EXISTS idx_tasks_linear_issue_id ON tasks(linear_issue_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
CREATE INDEX IF NOT EXISTS idx_events_actor ON events(actor);
CREATE INDEX IF NOT EXISTS idx_events_target_type ON events(target_type);
CREATE INDEX IF NOT EXISTS idx_events_target_id ON events(target_id);
CREATE INDEX IF NOT EXISTS idx_events_action ON events(action);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_correlation_id ON events(correlation_id);
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);

-- Correlations indexes
CREATE INDEX IF NOT EXISTS idx_correlations_task_master_id ON correlations(task_master_id);
CREATE INDEX IF NOT EXISTS idx_correlations_linear_issue_id ON correlations(linear_issue_id);
CREATE INDEX IF NOT EXISTS idx_correlations_github_pr_id ON correlations(github_pr_id);
CREATE INDEX IF NOT EXISTS idx_correlations_codegen_request_id ON correlations(codegen_request_id);
CREATE INDEX IF NOT EXISTS idx_correlations_claude_session_id ON correlations(claude_session_id);
CREATE INDEX IF NOT EXISTS idx_correlations_wsl2_deployment_id ON correlations(wsl2_deployment_id);
CREATE INDEX IF NOT EXISTS idx_correlations_status ON correlations(status);
CREATE INDEX IF NOT EXISTS idx_correlations_created_at ON correlations(created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX IF NOT EXISTS idx_events_type_timestamp ON events(event_type, timestamp);
CREATE INDEX IF NOT EXISTS idx_requirements_status_priority ON requirements(status, priority);

-- Triggers for automatic updated_at timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_requirements_updated_at BEFORE UPDATE ON requirements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_correlations_updated_at BEFORE UPDATE ON correlations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

