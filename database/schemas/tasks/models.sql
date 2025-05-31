-- Task Management Database Schema
-- Core models for task tracking and management

-- Enums for task management
CREATE TYPE task_status_enum AS ENUM (
    'backlog',
    'todo', 
    'in_progress',
    'in_review',
    'testing',
    'done',
    'cancelled'
);

CREATE TYPE task_priority_enum AS ENUM (
    'low',
    'medium', 
    'high',
    'urgent',
    'critical'
);

CREATE TYPE dependency_type_enum AS ENUM (
    'blocks',
    'depends_on',
    'related_to',
    'subtask_of'
);

-- Core tasks table
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status_enum DEFAULT 'backlog',
    priority task_priority_enum DEFAULT 'medium',
    complexity_score FLOAT DEFAULT 0.0,
    estimated_hours INTEGER,
    actual_hours INTEGER,
    parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    codebase_id UUID REFERENCES codebases(id) ON DELETE CASCADE,
    assignee_id UUID,
    creator_id UUID NOT NULL,
    linear_issue_id VARCHAR(255),
    github_issue_id INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    due_date TIMESTAMP,
    completed_at TIMESTAMP
);

-- Subtasks table for task decomposition
CREATE TABLE subtasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status task_status_enum DEFAULT 'todo',
    order_index INTEGER NOT NULL,
    estimated_hours INTEGER,
    actual_hours INTEGER,
    assignee_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Task dependencies for complex workflows
CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    dependency_type dependency_type_enum DEFAULT 'depends_on',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(task_id, depends_on_task_id)
);

-- Task files for tracking generated artifacts
CREATE TABLE task_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    file_path VARCHAR(1000) NOT NULL,
    file_type VARCHAR(50),
    file_size INTEGER,
    content_hash VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Task comments and updates
CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    comment TEXT NOT NULL,
    comment_type VARCHAR(50) DEFAULT 'comment',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_codebase ON tasks(codebase_id);
CREATE INDEX idx_tasks_parent ON tasks(parent_task_id);
CREATE INDEX idx_tasks_created_at ON tasks(created_at);
CREATE INDEX idx_subtasks_parent ON subtasks(parent_task_id);
CREATE INDEX idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends ON task_dependencies(depends_on_task_id);

