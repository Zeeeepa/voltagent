-- Analyze and calculate task complexity based on various factors
-- Parameters: task_id

WITH task_analysis AS (
    SELECT 
        t.id,
        t.title,
        t.description,
        t.complexity_score as current_complexity,
        -- Count subtasks
        (SELECT COUNT(*) FROM subtasks WHERE parent_task_id = t.id) as subtask_count,
        -- Count dependencies
        (SELECT COUNT(*) FROM task_dependencies WHERE task_id = t.id) as dependency_count,
        -- Estimate based on description length
        CASE 
            WHEN LENGTH(t.description) > 1000 THEN 3.0
            WHEN LENGTH(t.description) > 500 THEN 2.0
            WHEN LENGTH(t.description) > 100 THEN 1.0
            ELSE 0.5
        END as description_complexity,
        -- Codebase complexity factor
        COALESCE(cb.total_files / 100.0, 1.0) as codebase_complexity_factor
    FROM tasks t
    LEFT JOIN codebases cb ON t.codebase_id = cb.id
    WHERE t.id = $1
),
complexity_calculation AS (
    SELECT 
        *,
        -- Calculate new complexity score
        LEAST(10.0, GREATEST(1.0, 
            description_complexity + 
            (subtask_count * 0.5) + 
            (dependency_count * 0.3) + 
            (codebase_complexity_factor * 0.2)
        )) as calculated_complexity
    FROM task_analysis
)
UPDATE tasks 
SET 
    complexity_score = cc.calculated_complexity,
    updated_at = NOW()
FROM complexity_calculation cc
WHERE tasks.id = cc.id
RETURNING 
    tasks.id,
    tasks.title,
    tasks.complexity_score,
    (SELECT subtask_count FROM complexity_calculation) as subtask_count,
    (SELECT dependency_count FROM complexity_calculation) as dependency_count,
    (SELECT description_complexity FROM complexity_calculation) as description_complexity;

