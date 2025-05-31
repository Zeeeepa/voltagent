-- Add a new task to the system
-- Parameters: title, description, priority, codebase_id, creator_id, parent_task_id (optional)

INSERT INTO tasks (
    title,
    description,
    status,
    priority,
    complexity_score,
    parent_task_id,
    codebase_id,
    creator_id,
    linear_issue_id,
    github_issue_id,
    estimated_hours
) VALUES (
    $1, -- title
    $2, -- description
    COALESCE($3, 'backlog')::task_status_enum, -- status (default: backlog)
    COALESCE($4, 'medium')::task_priority_enum, -- priority (default: medium)
    COALESCE($5, 0.0), -- complexity_score
    $6, -- parent_task_id (nullable)
    $7, -- codebase_id
    $8, -- creator_id
    $9, -- linear_issue_id (nullable)
    $10, -- github_issue_id (nullable)
    $11 -- estimated_hours (nullable)
)
RETURNING 
    id,
    title,
    status,
    priority,
    created_at;

