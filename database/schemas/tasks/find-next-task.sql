-- Find the next task to work on based on priority, dependencies, and complexity
-- Parameters: assignee_id (optional), codebase_id (optional)

WITH available_tasks AS (
    SELECT 
        t.id,
        t.title,
        t.description,
        t.status,
        t.priority,
        t.complexity_score,
        t.estimated_hours,
        t.codebase_id,
        t.created_at,
        -- Check if all dependencies are completed
        CASE 
            WHEN NOT EXISTS (
                SELECT 1 FROM task_dependencies td 
                JOIN tasks dt ON td.depends_on_task_id = dt.id 
                WHERE td.task_id = t.id AND dt.status != 'done'
            ) THEN true 
            ELSE false 
        END as dependencies_met,
        -- Count blocking dependencies
        (SELECT COUNT(*) FROM task_dependencies td 
         JOIN tasks dt ON td.depends_on_task_id = dt.id 
         WHERE td.task_id = t.id AND dt.status != 'done') as blocking_dependencies,
        -- Priority score calculation
        CASE t.priority
            WHEN 'critical' THEN 100
            WHEN 'urgent' THEN 80
            WHEN 'high' THEN 60
            WHEN 'medium' THEN 40
            WHEN 'low' THEN 20
        END as priority_score,
        -- Age factor (older tasks get higher priority)
        EXTRACT(EPOCH FROM (NOW() - t.created_at)) / 86400 as age_days
    FROM tasks t
    WHERE t.status IN ('backlog', 'todo')
    AND (t.assignee_id = $1 OR $1 IS NULL)
    AND (t.codebase_id = $2 OR $2 IS NULL)
),
scored_tasks AS (
    SELECT 
        *,
        -- Calculate overall score
        (priority_score + 
         (age_days * 2) + 
         (CASE WHEN complexity_score <= 3 THEN 10 ELSE 0 END) + -- Bonus for simple tasks
         (CASE WHEN dependencies_met THEN 20 ELSE -50 END) -- Heavy penalty for blocked tasks
        ) as task_score
    FROM available_tasks
    WHERE dependencies_met = true -- Only show tasks that can actually be worked on
)
SELECT 
    id,
    title,
    description,
    status,
    priority,
    complexity_score,
    estimated_hours,
    codebase_id,
    task_score,
    age_days,
    blocking_dependencies,
    created_at
FROM scored_tasks
ORDER BY task_score DESC, created_at ASC
LIMIT 1;

