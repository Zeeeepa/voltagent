-- Add a subtask to an existing task
-- Parameters: parent_task_id, title, description, order_index, assignee_id (optional)

INSERT INTO subtasks (
    parent_task_id,
    title,
    description,
    status,
    order_index,
    estimated_hours,
    assignee_id
) VALUES (
    $1, -- parent_task_id
    $2, -- title
    $3, -- description
    COALESCE($4, 'todo')::task_status_enum, -- status (default: todo)
    COALESCE($5, (
        SELECT COALESCE(MAX(order_index), 0) + 1 
        FROM subtasks 
        WHERE parent_task_id = $1
    )), -- order_index (auto-increment if not provided)
    $6, -- estimated_hours (nullable)
    $7  -- assignee_id (nullable)
)
RETURNING 
    id,
    parent_task_id,
    title,
    status,
    order_index,
    created_at;

