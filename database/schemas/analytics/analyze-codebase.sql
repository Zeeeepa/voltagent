-- Comprehensive codebase analysis query
-- This query performs extensive analysis and saves results to the analytics database
-- Parameters: codebase_id, analysis_session_id

WITH codebase_overview AS (
    SELECT 
        cb.id as codebase_id,
        cb.name,
        cb.total_files,
        cb.total_lines,
        COUNT(DISTINCT cf.id) as analyzed_files,
        COUNT(DISTINCT cfn.id) as total_functions,
        COUNT(DISTINCT cc.id) as total_classes,
        COUNT(DISTINCT ci.id) as total_imports
    FROM codebases cb
    LEFT JOIN codebase_files cf ON cb.id = cf.codebase_id
    LEFT JOIN codebase_functions cfn ON cb.id = cfn.codebase_id
    LEFT JOIN codebase_classes cc ON cb.id = cc.codebase_id
    LEFT JOIN codebase_imports ci ON cb.id = ci.codebase_id
    WHERE cb.id = $1
    GROUP BY cb.id, cb.name, cb.total_files, cb.total_lines
),
complexity_analysis AS (
    SELECT 
        codebase_id,
        AVG(cyclomatic_complexity) as avg_complexity,
        MAX(cyclomatic_complexity) as max_complexity,
        COUNT(CASE WHEN cyclomatic_complexity > 10 THEN 1 END) as high_complexity_functions,
        COUNT(CASE WHEN is_dead_code THEN 1 END) as dead_code_functions,
        COUNT(CASE WHEN is_recursive THEN 1 END) as recursive_functions
    FROM codebase_functions
    WHERE codebase_id = $1
    GROUP BY codebase_id
),
file_analysis AS (
    SELECT 
        codebase_id,
        AVG(lines_of_code) as avg_file_size,
        MAX(lines_of_code) as max_file_size,
        COUNT(CASE WHEN file_type = 'test' THEN 1 END) as test_files,
        COUNT(CASE WHEN file_type = 'source' THEN 1 END) as source_files
    FROM codebase_files
    WHERE codebase_id = $1
    GROUP BY codebase_id
),
dependency_analysis AS (
    SELECT 
        codebase_id,
        COUNT(*) as total_dependencies,
        COUNT(CASE WHEN is_circular THEN 1 END) as circular_dependencies,
        COUNT(CASE WHEN is_external THEN 1 END) as external_dependencies
    FROM codebase_imports
    WHERE codebase_id = $1
    GROUP BY codebase_id
),
-- Insert comprehensive analysis results
analysis_insert AS (
    INSERT INTO analysis_results (
        codebase_id,
        analysis_session_id,
        analysis_type,
        scope_type,
        scope_identifier,
        results,
        summary,
        recommendations,
        impact_radius,
        confidence_score
    )
    SELECT 
        co.codebase_id,
        $2, -- analysis_session_id
        'full_codebase'::analysis_type_enum,
        'codebase',
        co.name,
        jsonb_build_object(
            'overview', jsonb_build_object(
                'total_files', co.total_files,
                'analyzed_files', co.analyzed_files,
                'total_functions', co.total_functions,
                'total_classes', co.total_classes,
                'total_imports', co.total_imports
            ),
            'complexity', jsonb_build_object(
                'average_complexity', ca.avg_complexity,
                'max_complexity', ca.max_complexity,
                'high_complexity_functions', ca.high_complexity_functions,
                'dead_code_functions', ca.dead_code_functions,
                'recursive_functions', ca.recursive_functions
            ),
            'files', jsonb_build_object(
                'average_file_size', fa.avg_file_size,
                'max_file_size', fa.max_file_size,
                'test_files', fa.test_files,
                'source_files', fa.source_files,
                'test_coverage_ratio', CASE 
                    WHEN fa.source_files > 0 THEN fa.test_files::float / fa.source_files 
                    ELSE 0 
                END
            ),
            'dependencies', jsonb_build_object(
                'total_dependencies', da.total_dependencies,
                'circular_dependencies', da.circular_dependencies,
                'external_dependencies', da.external_dependencies,
                'dependency_ratio', CASE 
                    WHEN co.total_functions > 0 THEN da.total_dependencies::float / co.total_functions 
                    ELSE 0 
                END
            )
        ),
        jsonb_build_object(
            'health_score', CASE 
                WHEN ca.avg_complexity <= 5 AND ca.dead_code_functions = 0 AND da.circular_dependencies = 0 THEN 'excellent'
                WHEN ca.avg_complexity <= 8 AND ca.dead_code_functions <= 5 AND da.circular_dependencies <= 2 THEN 'good'
                WHEN ca.avg_complexity <= 12 AND ca.dead_code_functions <= 15 AND da.circular_dependencies <= 5 THEN 'fair'
                ELSE 'poor'
            END,
            'maintainability_score', LEAST(100, GREATEST(0, 
                100 - (ca.avg_complexity * 5) - (ca.dead_code_functions * 2) - (da.circular_dependencies * 10)
            )),
            'technical_debt_indicators', ca.high_complexity_functions + ca.dead_code_functions + da.circular_dependencies
        ),
        ARRAY[
            CASE WHEN ca.dead_code_functions > 0 THEN 'Remove ' || ca.dead_code_functions || ' dead code functions' END,
            CASE WHEN ca.high_complexity_functions > 0 THEN 'Refactor ' || ca.high_complexity_functions || ' high complexity functions' END,
            CASE WHEN da.circular_dependencies > 0 THEN 'Fix ' || da.circular_dependencies || ' circular dependencies' END,
            CASE WHEN fa.test_files::float / NULLIF(fa.source_files, 0) < 0.5 THEN 'Increase test coverage (currently ' || ROUND((fa.test_files::float / NULLIF(fa.source_files, 0) * 100)::numeric, 1) || '%)' END
        ]::text[],
        jsonb_build_object(
            'affected_files', co.analyzed_files,
            'affected_functions', co.total_functions,
            'risk_level', CASE 
                WHEN ca.avg_complexity > 10 OR da.circular_dependencies > 5 THEN 'high'
                WHEN ca.avg_complexity > 7 OR da.circular_dependencies > 2 THEN 'medium'
                ELSE 'low'
            END
        ),
        0.95 -- confidence_score
    FROM codebase_overview co
    LEFT JOIN complexity_analysis ca ON co.codebase_id = ca.codebase_id
    LEFT JOIN file_analysis fa ON co.codebase_id = fa.codebase_id
    LEFT JOIN dependency_analysis da ON co.codebase_id = da.codebase_id
    RETURNING id
)
-- Return the analysis results
SELECT 
    ar.id as analysis_id,
    ar.codebase_id,
    ar.analysis_type,
    ar.results,
    ar.summary,
    ar.recommendations,
    ar.confidence_score,
    ar.created_at
FROM analysis_results ar
WHERE ar.id = (SELECT id FROM analysis_insert);

