-- Analytics Database Schema
-- Comprehensive code analysis and metrics storage

-- Enums for analytics
CREATE TYPE metric_type_enum AS ENUM (
    'lines_of_code',
    'logical_lines_of_code',
    'source_lines_of_code',
    'cyclomatic_complexity',
    'halstead_volume',
    'maintainability_index',
    'depth_of_inheritance',
    'coupling_between_objects',
    'lack_of_cohesion',
    'code_coverage',
    'technical_debt_ratio',
    'duplication_ratio'
);

CREATE TYPE dependency_type_enum AS ENUM (
    'imports',
    'function_call',
    'class_inheritance',
    'interface_implementation',
    'composition',
    'aggregation',
    'uses',
    'extends'
);

CREATE TYPE analysis_type_enum AS ENUM (
    'full_codebase',
    'file_analysis',
    'function_analysis',
    'class_analysis',
    'dependency_analysis',
    'dead_code_analysis',
    'security_analysis',
    'performance_analysis',
    'architecture_analysis'
);

CREATE TYPE issue_severity_enum AS ENUM (
    'info',
    'low',
    'medium',
    'high',
    'critical'
);

-- Core code metrics table
CREATE TABLE code_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codebase_id UUID NOT NULL REFERENCES codebases(id) ON DELETE CASCADE,
    analysis_session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    metric_type metric_type_enum NOT NULL,
    metric_value FLOAT NOT NULL,
    metric_unit VARCHAR(50), -- lines, percentage, ratio, etc.
    scope_type VARCHAR(50), -- file, function, class, module, codebase
    scope_identifier VARCHAR(500), -- file path, function name, class name
    file_path VARCHAR(1000),
    function_name VARCHAR(255),
    class_name VARCHAR(255),
    line_number INTEGER,
    threshold_value FLOAT, -- expected/target value
    is_within_threshold BOOLEAN,
    calculated_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB -- additional context and details
);

-- Dependency graph for code relationships
CREATE TABLE dependency_graph (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codebase_id UUID NOT NULL REFERENCES codebases(id) ON DELETE CASCADE,
    analysis_session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL, -- file, function, class, module
    source_identifier VARCHAR(500) NOT NULL,
    source_file_path VARCHAR(1000),
    target_type VARCHAR(50) NOT NULL,
    target_identifier VARCHAR(500) NOT NULL,
    target_file_path VARCHAR(1000),
    dependency_type dependency_type_enum NOT NULL,
    dependency_strength FLOAT DEFAULT 1.0, -- how strong the dependency is
    is_circular BOOLEAN DEFAULT FALSE,
    is_external BOOLEAN DEFAULT FALSE, -- external library dependency
    line_number INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Comprehensive analysis results storage
CREATE TABLE analysis_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codebase_id UUID NOT NULL REFERENCES codebases(id) ON DELETE CASCADE,
    analysis_session_id UUID NOT NULL REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    analysis_type analysis_type_enum NOT NULL,
    scope_type VARCHAR(50), -- file, function, class, module, codebase
    scope_identifier VARCHAR(500),
    results JSONB NOT NULL, -- detailed analysis results
    summary JSONB, -- high-level summary
    recommendations TEXT[], -- array of improvement recommendations
    impact_radius JSONB, -- what would be affected by changes
    confidence_score FLOAT DEFAULT 0.0, -- 0-1 confidence in analysis
    processing_time INTEGER, -- milliseconds
    created_at TIMESTAMP DEFAULT NOW()
);

-- Code issues and problems detection
CREATE TABLE code_issues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codebase_id UUID NOT NULL REFERENCES codebases(id) ON DELETE CASCADE,
    analysis_session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    issue_type VARCHAR(100) NOT NULL, -- dead_code, high_complexity, security_vulnerability, etc.
    severity issue_severity_enum DEFAULT 'medium',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(1000),
    start_line INTEGER,
    end_line INTEGER,
    function_name VARCHAR(255),
    class_name VARCHAR(255),
    rule_id VARCHAR(100), -- reference to the rule that detected this issue
    fix_suggestion TEXT,
    fix_effort_estimate INTEGER, -- estimated hours to fix
    impact_assessment TEXT,
    is_false_positive BOOLEAN DEFAULT FALSE,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP,
    resolved_by UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    metadata JSONB
);

-- Function call hierarchy and flow analysis
CREATE TABLE function_call_hierarchy (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codebase_id UUID NOT NULL REFERENCES codebases(id) ON DELETE CASCADE,
    analysis_session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    caller_function VARCHAR(255) NOT NULL,
    caller_file_path VARCHAR(1000) NOT NULL,
    caller_line_number INTEGER,
    called_function VARCHAR(255) NOT NULL,
    called_file_path VARCHAR(1000),
    call_type VARCHAR(50), -- direct, indirect, recursive
    call_depth INTEGER DEFAULT 1, -- depth in call stack
    execution_frequency FLOAT, -- estimated call frequency
    is_recursive_call BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Dead code detection results
CREATE TABLE dead_code_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codebase_id UUID NOT NULL REFERENCES codebases(id) ON DELETE CASCADE,
    analysis_session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    element_type VARCHAR(50) NOT NULL, -- function, class, variable, import
    element_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    start_line INTEGER,
    end_line INTEGER,
    reason TEXT, -- why it's considered dead code
    confidence_score FLOAT DEFAULT 0.0,
    last_used_commit VARCHAR(40), -- last commit where it was used
    removal_impact JSONB, -- what would break if removed
    removal_recommendation TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Code duplication analysis
CREATE TABLE code_duplication (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codebase_id UUID NOT NULL REFERENCES codebases(id) ON DELETE CASCADE,
    analysis_session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    duplicate_group_id UUID NOT NULL, -- groups related duplicates
    file_path VARCHAR(1000) NOT NULL,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    duplicate_content TEXT,
    similarity_score FLOAT NOT NULL, -- 0-1 similarity
    lines_count INTEGER,
    tokens_count INTEGER,
    refactoring_suggestion TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Architecture analysis and patterns
CREATE TABLE architecture_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codebase_id UUID NOT NULL REFERENCES codebases(id) ON DELETE CASCADE,
    analysis_session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    pattern_type VARCHAR(100) NOT NULL, -- mvc, singleton, factory, etc.
    pattern_confidence FLOAT DEFAULT 0.0,
    components JSONB, -- components that make up the pattern
    violations JSONB, -- violations of the pattern
    suggestions TEXT[],
    quality_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Performance analysis results
CREATE TABLE performance_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codebase_id UUID NOT NULL REFERENCES codebases(id) ON DELETE CASCADE,
    analysis_session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    analysis_type VARCHAR(100) NOT NULL, -- algorithmic_complexity, memory_usage, etc.
    file_path VARCHAR(1000),
    function_name VARCHAR(255),
    performance_metric VARCHAR(100),
    metric_value FLOAT,
    benchmark_value FLOAT, -- expected/baseline value
    performance_impact VARCHAR(50), -- low, medium, high
    optimization_suggestions TEXT[],
    created_at TIMESTAMP DEFAULT NOW()
);

-- Security vulnerability analysis
CREATE TABLE security_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codebase_id UUID NOT NULL REFERENCES codebases(id) ON DELETE CASCADE,
    analysis_session_id UUID REFERENCES analysis_sessions(id) ON DELETE CASCADE,
    vulnerability_type VARCHAR(100) NOT NULL,
    severity issue_severity_enum DEFAULT 'medium',
    cwe_id VARCHAR(20), -- Common Weakness Enumeration ID
    file_path VARCHAR(1000),
    start_line INTEGER,
    end_line INTEGER,
    vulnerable_code TEXT,
    description TEXT,
    remediation_advice TEXT,
    false_positive_likelihood FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Comprehensive indexes for performance
CREATE INDEX idx_code_metrics_codebase ON code_metrics(codebase_id);
CREATE INDEX idx_code_metrics_type ON code_metrics(metric_type);
CREATE INDEX idx_code_metrics_scope ON code_metrics(scope_type, scope_identifier);
CREATE INDEX idx_code_metrics_calculated_at ON code_metrics(calculated_at);
CREATE INDEX idx_dependency_graph_codebase ON dependency_graph(codebase_id);
CREATE INDEX idx_dependency_graph_source ON dependency_graph(source_type, source_identifier);
CREATE INDEX idx_dependency_graph_target ON dependency_graph(target_type, target_identifier);
CREATE INDEX idx_dependency_graph_circular ON dependency_graph(is_circular);
CREATE INDEX idx_analysis_results_codebase ON analysis_results(codebase_id);
CREATE INDEX idx_analysis_results_type ON analysis_results(analysis_type);
CREATE INDEX idx_analysis_results_session ON analysis_results(analysis_session_id);
CREATE INDEX idx_code_issues_codebase ON code_issues(codebase_id);
CREATE INDEX idx_code_issues_type ON code_issues(issue_type);
CREATE INDEX idx_code_issues_severity ON code_issues(severity);
CREATE INDEX idx_code_issues_resolved ON code_issues(is_resolved);
CREATE INDEX idx_function_call_hierarchy_codebase ON function_call_hierarchy(codebase_id);
CREATE INDEX idx_function_call_hierarchy_caller ON function_call_hierarchy(caller_function);
CREATE INDEX idx_dead_code_analysis_codebase ON dead_code_analysis(codebase_id);
CREATE INDEX idx_code_duplication_codebase ON code_duplication(codebase_id);
CREATE INDEX idx_code_duplication_group ON code_duplication(duplicate_group_id);
CREATE INDEX idx_architecture_analysis_codebase ON architecture_analysis(codebase_id);
CREATE INDEX idx_performance_analysis_codebase ON performance_analysis(codebase_id);
CREATE INDEX idx_security_analysis_codebase ON security_analysis(codebase_id);
CREATE INDEX idx_security_analysis_severity ON security_analysis(severity);

