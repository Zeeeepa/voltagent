-- Data integrity constraints for VoltAgent database
-- Phase 1.3: Setup Database Event Storage System

-- Events table constraints
ALTER TABLE events 
ADD CONSTRAINT chk_events_event_type_not_empty 
CHECK (event_type != '');

ALTER TABLE events 
ADD CONSTRAINT chk_events_source_not_empty 
CHECK (source != '');

ALTER TABLE events 
ADD CONSTRAINT chk_events_valid_timestamp 
CHECK (timestamp <= NOW() + INTERVAL '1 hour'); -- Allow small clock skew

-- Requirements table constraints
ALTER TABLE requirements 
ADD CONSTRAINT chk_requirements_title_not_empty 
CHECK (title != '');

ALTER TABLE requirements 
ADD CONSTRAINT chk_requirements_valid_status 
CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'blocked'));

ALTER TABLE requirements 
ADD CONSTRAINT chk_requirements_complexity_score_range 
CHECK (complexity_score >= 0 AND complexity_score <= 100);

-- Tasks table constraints
ALTER TABLE tasks 
ADD CONSTRAINT chk_tasks_title_not_empty 
CHECK (title != '');

ALTER TABLE tasks 
ADD CONSTRAINT chk_tasks_valid_status 
CHECK (status IN ('todo', 'in_progress', 'completed', 'cancelled', 'blocked'));

ALTER TABLE tasks 
ADD CONSTRAINT chk_tasks_priority_range 
CHECK (priority >= 0 AND priority <= 10);

-- Prevent self-referencing parent tasks
ALTER TABLE tasks 
ADD CONSTRAINT chk_tasks_no_self_reference 
CHECK (id != parent_task_id);

-- Correlations table constraints
ALTER TABLE correlations 
ADD CONSTRAINT chk_correlations_type_not_empty 
CHECK (correlation_type != '');

ALTER TABLE correlations 
ADD CONSTRAINT chk_correlations_valid_type 
CHECK (correlation_type IN ('linear_issue', 'github_pr', 'task_dependency', 'event_correlation'));

-- Ensure at least one correlation identifier is provided
ALTER TABLE correlations 
ADD CONSTRAINT chk_correlations_has_identifier 
CHECK (
    linear_issue_id IS NOT NULL OR 
    github_pr_number IS NOT NULL OR 
    task_id IS NOT NULL
);

-- Unique constraints for preventing duplicates
ALTER TABLE correlations 
ADD CONSTRAINT uq_correlations_linear_task 
UNIQUE (task_id, linear_issue_id) 
WHERE linear_issue_id IS NOT NULL;

ALTER TABLE correlations 
ADD CONSTRAINT uq_correlations_github_task 
UNIQUE (task_id, github_pr_number) 
WHERE github_pr_number IS NOT NULL;

