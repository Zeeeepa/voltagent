-- Expand a prompt with full context including templates, variables, and execution history
-- Parameters: prompt_id

WITH prompt_details AS (
    SELECT 
        p.id,
        p.title,
        p.description,
        p.prompt_text,
        p.prompt_type,
        p.category,
        p.status,
        p.version,
        p.language_specific,
        p.complexity_level,
        p.expected_output_format,
        p.usage_count,
        p.success_rate,
        p.average_execution_time,
        p.created_at,
        p.updated_at
    FROM prompts p
    WHERE p.id = $1
),
prompt_templates AS (
    SELECT 
        pt.template_name,
        pt.template_text,
        pt.variables,
        pt.example_values
    FROM prompt_templates pt
    WHERE pt.prompt_id = $1
),
prompt_variables AS (
    SELECT 
        pv.variable_name,
        pv.variable_type,
        pv.description,
        pv.default_value,
        pv.is_required,
        pv.validation_rules
    FROM prompt_variables pv
    WHERE pv.prompt_id = $1
    ORDER BY pv.variable_name
),
recent_executions AS (
    SELECT 
        pe.id,
        pe.input_variables,
        pe.rendered_prompt,
        pe.output_result,
        pe.execution_time,
        pe.success,
        pe.error_message,
        pe.model_used,
        pe.tokens_used,
        pe.executed_at
    FROM prompt_executions pe
    WHERE pe.prompt_id = $1
    ORDER BY pe.executed_at DESC
    LIMIT 10
),
performance_metrics AS (
    SELECT 
        pm.metric_date,
        pm.execution_count,
        pm.success_count,
        pm.failure_count,
        pm.average_execution_time,
        pm.total_tokens_used,
        pm.total_cost,
        pm.user_satisfaction_score
    FROM prompt_metrics pm
    WHERE pm.prompt_id = $1
    ORDER BY pm.metric_date DESC
    LIMIT 30
),
prompt_tags AS (
    SELECT 
        pt.name as tag_name,
        pt.description as tag_description,
        pt.color as tag_color
    FROM prompt_tag_assignments pta
    JOIN prompt_tags pt ON pta.tag_id = pt.id
    WHERE pta.prompt_id = $1
),
feedback_summary AS (
    SELECT 
        AVG(pf.rating) as average_rating,
        COUNT(*) as feedback_count,
        STRING_AGG(pf.improvement_suggestions, '; ') as improvement_suggestions
    FROM prompt_feedback pf
    JOIN prompt_executions pe ON pf.execution_id = pe.id
    WHERE pe.prompt_id = $1
)
SELECT 
    -- Main prompt details
    pd.id,
    pd.title,
    pd.description,
    pd.prompt_text,
    pd.prompt_type,
    pd.category,
    pd.status,
    pd.version,
    pd.language_specific,
    pd.complexity_level,
    pd.expected_output_format,
    pd.usage_count,
    pd.success_rate,
    pd.average_execution_time,
    pd.created_at,
    pd.updated_at,
    
    -- Templates
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'template_name', pt.template_name,
                'template_text', pt.template_text,
                'variables', pt.variables,
                'example_values', pt.example_values
            )
        ) FILTER (WHERE pt.template_name IS NOT NULL),
        '[]'::json
    ) as templates,
    
    -- Variables
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'variable_name', pv.variable_name,
                'variable_type', pv.variable_type,
                'description', pv.description,
                'default_value', pv.default_value,
                'is_required', pv.is_required,
                'validation_rules', pv.validation_rules
            )
        ) FILTER (WHERE pv.variable_name IS NOT NULL),
        '[]'::json
    ) as variables,
    
    -- Recent executions
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'execution_id', re.id,
                'input_variables', re.input_variables,
                'rendered_prompt', re.rendered_prompt,
                'output_result', re.output_result,
                'execution_time', re.execution_time,
                'success', re.success,
                'error_message', re.error_message,
                'model_used', re.model_used,
                'tokens_used', re.tokens_used,
                'executed_at', re.executed_at
            )
        ) FILTER (WHERE re.id IS NOT NULL),
        '[]'::json
    ) as recent_executions,
    
    -- Performance metrics
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'date', pm.metric_date,
                'execution_count', pm.execution_count,
                'success_count', pm.success_count,
                'failure_count', pm.failure_count,
                'average_execution_time', pm.average_execution_time,
                'total_tokens_used', pm.total_tokens_used,
                'total_cost', pm.total_cost,
                'user_satisfaction_score', pm.user_satisfaction_score
            )
        ) FILTER (WHERE pm.metric_date IS NOT NULL),
        '[]'::json
    ) as performance_metrics,
    
    -- Tags
    COALESCE(
        json_agg(
            DISTINCT jsonb_build_object(
                'name', ptags.tag_name,
                'description', ptags.tag_description,
                'color', ptags.tag_color
            )
        ) FILTER (WHERE ptags.tag_name IS NOT NULL),
        '[]'::json
    ) as tags,
    
    -- Feedback summary
    fs.average_rating,
    fs.feedback_count,
    fs.improvement_suggestions

FROM prompt_details pd
LEFT JOIN prompt_templates pt ON true
LEFT JOIN prompt_variables pv ON true
LEFT JOIN recent_executions re ON true
LEFT JOIN performance_metrics pm ON true
LEFT JOIN prompt_tags ptags ON true
LEFT JOIN feedback_summary fs ON true
GROUP BY 
    pd.id, pd.title, pd.description, pd.prompt_text, pd.prompt_type, 
    pd.category, pd.status, pd.version, pd.language_specific, 
    pd.complexity_level, pd.expected_output_format, pd.usage_count, 
    pd.success_rate, pd.average_execution_time, pd.created_at, pd.updated_at,
    fs.average_rating, fs.feedback_count, fs.improvement_suggestions;

