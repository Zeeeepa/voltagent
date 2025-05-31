-- Prompts Management Database Schema
-- Models for storing and managing AI prompts and templates

-- Enums for prompt management
CREATE TYPE prompt_type_enum AS ENUM (
    'analysis',
    'improvement',
    'generation',
    'review',
    'documentation',
    'testing',
    'refactoring',
    'debugging'
);

CREATE TYPE prompt_status_enum AS ENUM (
    'draft',
    'active',
    'deprecated',
    'archived'
);

CREATE TYPE prompt_category_enum AS ENUM (
    'code_analysis',
    'code_generation',
    'code_review',
    'documentation',
    'testing',
    'refactoring',
    'architecture',
    'security',
    'performance'
);

-- Core prompts table
CREATE TABLE prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    prompt_text TEXT NOT NULL,
    prompt_type prompt_type_enum NOT NULL,
    category prompt_category_enum NOT NULL,
    status prompt_status_enum DEFAULT 'draft',
    version INTEGER DEFAULT 1,
    parent_prompt_id UUID REFERENCES prompts(id),
    language_specific VARCHAR(50), -- programming language if applicable
    complexity_level INTEGER DEFAULT 1, -- 1-5 scale
    expected_output_format VARCHAR(100), -- json, markdown, code, etc.
    usage_count INTEGER DEFAULT 0,
    success_rate FLOAT DEFAULT 0.0,
    average_execution_time INTEGER, -- in milliseconds
    created_by UUID NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deprecated_at TIMESTAMP
);

-- Prompt templates with variables
CREATE TABLE prompt_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    template_name VARCHAR(255) NOT NULL,
    template_text TEXT NOT NULL,
    variables JSONB, -- {variable_name: {type, description, default_value}}
    example_values JSONB, -- example variable values
    created_at TIMESTAMP DEFAULT NOW()
);

-- Prompt variables for dynamic content
CREATE TABLE prompt_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    variable_name VARCHAR(100) NOT NULL,
    variable_type VARCHAR(50) NOT NULL, -- string, number, boolean, array, object
    description TEXT,
    default_value TEXT,
    is_required BOOLEAN DEFAULT TRUE,
    validation_rules JSONB, -- regex, min/max values, etc.
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(prompt_id, variable_name)
);

-- Prompt execution history
CREATE TABLE prompt_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    codebase_id UUID REFERENCES codebases(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    input_variables JSONB,
    rendered_prompt TEXT,
    execution_context JSONB, -- additional context like file paths, function names
    output_result TEXT,
    execution_time INTEGER, -- in milliseconds
    success BOOLEAN DEFAULT FALSE,
    error_message TEXT,
    model_used VARCHAR(100),
    tokens_used INTEGER,
    cost_estimate DECIMAL(10,4),
    executed_by UUID,
    executed_at TIMESTAMP DEFAULT NOW()
);

-- Prompt performance metrics
CREATE TABLE prompt_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL,
    execution_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    average_execution_time INTEGER,
    total_tokens_used INTEGER,
    total_cost DECIMAL(10,4),
    user_satisfaction_score FLOAT, -- 1-5 rating
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(prompt_id, metric_date)
);

-- Prompt tags for categorization
CREATE TABLE prompt_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7), -- hex color code
    created_at TIMESTAMP DEFAULT NOW()
);

-- Many-to-many relationship between prompts and tags
CREATE TABLE prompt_tag_assignments (
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES prompt_tags(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (prompt_id, tag_id)
);

-- Prompt feedback for continuous improvement
CREATE TABLE prompt_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES prompt_executions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    improvement_suggestions TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_prompts_type ON prompts(prompt_type);
CREATE INDEX idx_prompts_category ON prompts(category);
CREATE INDEX idx_prompts_status ON prompts(status);
CREATE INDEX idx_prompts_language ON prompts(language_specific);
CREATE INDEX idx_prompts_created_by ON prompts(created_by);
CREATE INDEX idx_prompt_executions_prompt ON prompt_executions(prompt_id);
CREATE INDEX idx_prompt_executions_codebase ON prompt_executions(codebase_id);
CREATE INDEX idx_prompt_executions_executed_at ON prompt_executions(executed_at);
CREATE INDEX idx_prompt_executions_success ON prompt_executions(success);
CREATE INDEX idx_prompt_metrics_prompt ON prompt_metrics(prompt_id);
CREATE INDEX idx_prompt_metrics_date ON prompt_metrics(metric_date);
CREATE INDEX idx_prompt_feedback_execution ON prompt_feedback(execution_id);
CREATE INDEX idx_prompt_feedback_rating ON prompt_feedback(rating);

