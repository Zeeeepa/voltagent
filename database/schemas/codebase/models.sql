-- Codebase Management Database Schema
-- Models for tracking and analyzing codebases

-- Enums for codebase management
CREATE TYPE codebase_status_enum AS ENUM (
    'active',
    'archived',
    'analyzing',
    'error'
);

CREATE TYPE file_type_enum AS ENUM (
    'source',
    'test',
    'config',
    'documentation',
    'build',
    'other'
);

CREATE TYPE analysis_status_enum AS ENUM (
    'pending',
    'in_progress',
    'completed',
    'failed'
);

-- Core codebases table
CREATE TABLE codebases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    github_url VARCHAR(500),
    github_owner VARCHAR(255),
    github_repo VARCHAR(255),
    default_branch VARCHAR(100) DEFAULT 'main',
    linear_project_id VARCHAR(255),
    requirements_md TEXT,
    webhook_secret VARCHAR(255),
    webhook_url VARCHAR(500),
    status codebase_status_enum DEFAULT 'active',
    last_analyzed_at TIMESTAMP,
    last_commit_sha VARCHAR(40),
    total_files INTEGER DEFAULT 0,
    total_lines INTEGER DEFAULT 0,
    programming_languages JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Codebase files tracking
CREATE TABLE codebase_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codebase_id UUID NOT NULL REFERENCES codebases(id) ON DELETE CASCADE,
    file_path VARCHAR(1000) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_extension VARCHAR(50),
    file_type file_type_enum DEFAULT 'source',
    file_size INTEGER,
    lines_of_code INTEGER,
    logical_lines_of_code INTEGER,
    source_lines_of_code INTEGER,
    complexity_score FLOAT DEFAULT 0.0,
    maintainability_index FLOAT DEFAULT 0.0,
    content_hash VARCHAR(64),
    last_modified TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(codebase_id, file_path)
);

-- Functions and methods tracking
CREATE TABLE codebase_functions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codebase_id UUID NOT NULL REFERENCES codebases(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES codebase_files(id) ON DELETE CASCADE,
    function_name VARCHAR(255) NOT NULL,
    function_signature TEXT,
    function_type VARCHAR(50), -- function, method, constructor, etc.
    class_name VARCHAR(255),
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    lines_of_code INTEGER,
    cyclomatic_complexity FLOAT DEFAULT 0.0,
    halstead_volume FLOAT DEFAULT 0.0,
    maintainability_index FLOAT DEFAULT 0.0,
    parameter_count INTEGER DEFAULT 0,
    return_type VARCHAR(255),
    call_count INTEGER DEFAULT 0,
    is_recursive BOOLEAN DEFAULT FALSE,
    is_dead_code BOOLEAN DEFAULT FALSE,
    is_test_function BOOLEAN DEFAULT FALSE,
    docstring TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Classes and interfaces tracking
CREATE TABLE codebase_classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codebase_id UUID NOT NULL REFERENCES codebases(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES codebase_files(id) ON DELETE CASCADE,
    class_name VARCHAR(255) NOT NULL,
    class_type VARCHAR(50), -- class, interface, enum, etc.
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    method_count INTEGER DEFAULT 0,
    property_count INTEGER DEFAULT 0,
    inheritance_depth INTEGER DEFAULT 0,
    is_abstract BOOLEAN DEFAULT FALSE,
    is_test_class BOOLEAN DEFAULT FALSE,
    docstring TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Import and dependency tracking
CREATE TABLE codebase_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codebase_id UUID NOT NULL REFERENCES codebases(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES codebase_files(id) ON DELETE CASCADE,
    import_statement TEXT NOT NULL,
    imported_module VARCHAR(255),
    imported_symbols TEXT[],
    import_type VARCHAR(50), -- relative, absolute, external
    is_external BOOLEAN DEFAULT FALSE,
    is_circular BOOLEAN DEFAULT FALSE,
    line_number INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Analysis sessions tracking
CREATE TABLE analysis_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codebase_id UUID NOT NULL REFERENCES codebases(id) ON DELETE CASCADE,
    session_type VARCHAR(100) NOT NULL, -- full, incremental, targeted
    status analysis_status_enum DEFAULT 'pending',
    commit_sha VARCHAR(40),
    files_analyzed INTEGER DEFAULT 0,
    functions_analyzed INTEGER DEFAULT 0,
    issues_found INTEGER DEFAULT 0,
    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    error_message TEXT,
    analysis_config JSONB,
    results_summary JSONB
);

-- Indexes for performance
CREATE INDEX idx_codebases_github ON codebases(github_owner, github_repo);
CREATE INDEX idx_codebases_status ON codebases(status);
CREATE INDEX idx_codebase_files_codebase ON codebase_files(codebase_id);
CREATE INDEX idx_codebase_files_type ON codebase_files(file_type);
CREATE INDEX idx_codebase_files_path ON codebase_files(file_path);
CREATE INDEX idx_codebase_functions_codebase ON codebase_functions(codebase_id);
CREATE INDEX idx_codebase_functions_file ON codebase_functions(file_id);
CREATE INDEX idx_codebase_functions_name ON codebase_functions(function_name);
CREATE INDEX idx_codebase_functions_dead_code ON codebase_functions(is_dead_code);
CREATE INDEX idx_codebase_classes_codebase ON codebase_classes(codebase_id);
CREATE INDEX idx_codebase_classes_file ON codebase_classes(file_id);
CREATE INDEX idx_codebase_imports_codebase ON codebase_imports(codebase_id);
CREATE INDEX idx_codebase_imports_circular ON codebase_imports(is_circular);
CREATE INDEX idx_analysis_sessions_codebase ON analysis_sessions(codebase_id);
CREATE INDEX idx_analysis_sessions_status ON analysis_sessions(status);

