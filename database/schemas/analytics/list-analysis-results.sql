-- List analysis results with filtering and pagination
-- Parameters: codebase_id (optional), analysis_type (optional), limit, offset

WITH filtered_results AS (
    SELECT 
        ar.id,
        ar.codebase_id,
        ar.analysis_session_id,
        ar.analysis_type,
        ar.scope_type,
        ar.scope_identifier,
        ar.summary,
        ar.confidence_score,
        ar.created_at,
        cb.name as codebase_name,
        cb.github_url,
        as_session.session_type,
        as_session.status as session_status,
        as_session.files_analyzed,
        as_session.functions_analyzed,
        as_session.issues_found,
        -- Count related issues
        (SELECT COUNT(*) FROM code_issues ci 
         WHERE ci.analysis_session_id = ar.analysis_session_id) as total_issues,
        -- Count high severity issues
        (SELECT COUNT(*) FROM code_issues ci 
         WHERE ci.analysis_session_id = ar.analysis_session_id 
         AND ci.severity IN ('high', 'critical')) as high_severity_issues,
        -- Get latest metrics
        (SELECT COUNT(*) FROM code_metrics cm 
         WHERE cm.analysis_session_id = ar.analysis_session_id) as metrics_count
    FROM analysis_results ar
    JOIN codebases cb ON ar.codebase_id = cb.id
    LEFT JOIN analysis_sessions as_session ON ar.analysis_session_id = as_session.id
    WHERE 
        (ar.codebase_id = $1 OR $1 IS NULL)
        AND (ar.analysis_type = $2::analysis_type_enum OR $2 IS NULL)
),
paginated_results AS (
    SELECT *
    FROM filtered_results
    ORDER BY created_at DESC
    LIMIT COALESCE($3, 50)
    OFFSET COALESCE($4, 0)
),
summary_stats AS (
    SELECT 
        COUNT(*) as total_results,
        COUNT(DISTINCT codebase_id) as unique_codebases,
        AVG(confidence_score) as avg_confidence,
        SUM(total_issues) as total_issues_found,
        SUM(high_severity_issues) as total_high_severity_issues
    FROM filtered_results
)
SELECT 
    -- Results
    json_agg(
        json_build_object(
            'id', pr.id,
            'codebase_id', pr.codebase_id,
            'codebase_name', pr.codebase_name,
            'github_url', pr.github_url,
            'analysis_session_id', pr.analysis_session_id,
            'analysis_type', pr.analysis_type,
            'scope_type', pr.scope_type,
            'scope_identifier', pr.scope_identifier,
            'summary', pr.summary,
            'confidence_score', pr.confidence_score,
            'session_type', pr.session_type,
            'session_status', pr.session_status,
            'files_analyzed', pr.files_analyzed,
            'functions_analyzed', pr.functions_analyzed,
            'total_issues', pr.total_issues,
            'high_severity_issues', pr.high_severity_issues,
            'metrics_count', pr.metrics_count,
            'created_at', pr.created_at
        )
        ORDER BY pr.created_at DESC
    ) as results,
    
    -- Summary statistics
    (SELECT json_build_object(
        'total_results', ss.total_results,
        'unique_codebases', ss.unique_codebases,
        'average_confidence', ROUND(ss.avg_confidence::numeric, 2),
        'total_issues_found', ss.total_issues_found,
        'total_high_severity_issues', ss.total_high_severity_issues,
        'query_limit', COALESCE($3, 50),
        'query_offset', COALESCE($4, 0)
    ) FROM summary_stats ss) as summary

FROM paginated_results pr
CROSS JOIN summary_stats ss
GROUP BY ss.total_results, ss.unique_codebases, ss.avg_confidence, 
         ss.total_issues_found, ss.total_high_severity_issues;

