import { 
  ValidationConfig, 
  ValidationConfigSchema,
  ParameterValidationResult,
  ParameterValidationResultSchema,
  ValidationFinding,
  ValidationSeverity,
  SupportedLanguage,
  ValidationIssueType
} from "./types";

/**
 * Create a validated parameter validation configuration
 */
export function createParameterValidationConfig(
  config: Partial<ValidationConfig>
): ValidationConfig {
  const defaultConfig: ValidationConfig = {
    language: SupportedLanguage.TYPESCRIPT,
    strictMode: true,
    checkOptionalParameters: true,
    validateApiSchemas: true,
    includeTypeCoercion: true,
    minimumConfidence: 0.7,
    excludePatterns: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/*.test.*",
      "**/*.spec.*"
    ],
    includePatterns: [
      "**/*.ts",
      "**/*.tsx",
      "**/*.js", 
      "**/*.jsx",
      "**/*.go",
      "**/*.py"
    ],
    customRules: []
  };

  const mergedConfig = { ...defaultConfig, ...config };
  return ValidationConfigSchema.parse(mergedConfig);
}

/**
 * Validate a parameter validation result
 */
export function validateParameterValidationResult(
  result: any
): ParameterValidationResult {
  return ParameterValidationResultSchema.parse(result);
}

/**
 * Filter findings by severity level
 */
export function filterFindingsBySeverity(
  findings: ValidationFinding[],
  minSeverity: ValidationSeverity
): ValidationFinding[] {
  const severityOrder = {
    [ValidationSeverity.LOW]: 0,
    [ValidationSeverity.MEDIUM]: 1,
    [ValidationSeverity.HIGH]: 2,
    [ValidationSeverity.CRITICAL]: 3
  };

  const minLevel = severityOrder[minSeverity];
  
  return findings.filter(finding => 
    severityOrder[finding.severity] >= minLevel
  );
}

/**
 * Group findings by file
 */
export function groupFindingsByFile(
  findings: ValidationFinding[]
): Record<string, ValidationFinding[]> {
  return findings.reduce((groups, finding) => {
    const file = finding.file;
    if (!groups[file]) {
      groups[file] = [];
    }
    groups[file].push(finding);
    return groups;
  }, {} as Record<string, ValidationFinding[]>);
}

/**
 * Group findings by function
 */
export function groupFindingsByFunction(
  findings: ValidationFinding[]
): Record<string, ValidationFinding[]> {
  return findings.reduce((groups, finding) => {
    const key = `${finding.file}:${finding.function}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(finding);
    return groups;
  }, {} as Record<string, ValidationFinding[]>);
}

/**
 * Get auto-fixable findings
 */
export function getAutoFixableFindings(
  findings: ValidationFinding[]
): ValidationFinding[] {
  return findings.filter(finding => finding.autoFixable);
}

/**
 * Calculate analysis metrics
 */
export function calculateAnalysisMetrics(result: ParameterValidationResult) {
  const { findings, summary, metrics } = result;
  
  return {
    // Coverage metrics
    functionCoverage: result.totalFunctions > 0 ? 
      (findings.length / result.totalFunctions) * 100 : 0,
    parameterCoverage: result.totalParameters > 0 ?
      (findings.length / result.totalParameters) * 100 : 0,
    
    // Quality metrics  
    criticalIssueRate: result.totalFunctions > 0 ?
      (summary.criticalIssues / result.totalFunctions) * 100 : 0,
    autoFixRate: findings.length > 0 ?
      (summary.autoFixableCount / findings.length) * 100 : 0,
    
    // Performance metrics
    analysisSpeed: metrics.linesOfCode > 0 ?
      metrics.linesOfCode / (metrics.analysisTimeMs / 1000) : 0, // lines per second
    averageTimePerFile: metrics.filesAnalyzed > 0 ?
      metrics.analysisTimeMs / metrics.filesAnalyzed : 0,
    
    // Distribution metrics
    severityDistribution: {
      critical: (summary.criticalIssues / findings.length) * 100,
      high: (summary.highIssues / findings.length) * 100,
      medium: (summary.mediumIssues / findings.length) * 100,
      low: (summary.lowIssues / findings.length) * 100
    }
  };
}

/**
 * Generate human-readable summary report
 */
export function generateSummaryReport(result: ParameterValidationResult): string {
  const metrics = calculateAnalysisMetrics(result);
  
  return `
Parameter Validation Analysis Report
===================================

Overview:
- Module: ${result.module}
- Language: ${result.language}
- Analysis Time: ${new Date(result.analysisTimestamp).toLocaleString()}
- Overall Severity: ${result.severity.toUpperCase()}

Scope:
- Files Analyzed: ${result.metrics.filesAnalyzed}
- Functions Analyzed: ${result.totalFunctions}
- Parameters Analyzed: ${result.totalParameters}
- Lines of Code: ${result.metrics.linesOfCode}

Findings Summary:
- Total Issues: ${result.findings.length}
- Critical Issues: ${result.summary.criticalIssues}
- High Priority Issues: ${result.summary.highIssues}
- Medium Priority Issues: ${result.summary.mediumIssues}
- Low Priority Issues: ${result.summary.lowIssues}
- Auto-fixable Issues: ${result.summary.autoFixableCount}

Performance:
- Analysis Time: ${result.metrics.analysisTimeMs}ms
- Analysis Speed: ${metrics.analysisSpeed.toFixed(2)} lines/second
- Auto-fix Rate: ${metrics.autoFixRate.toFixed(1)}%

Top Issues by Type:
${getTopIssueTypes(result.findings).map(([type, count]) => 
  `- ${type}: ${count} occurrences`
).join('\n')}

Recommendations:
${generateRecommendations(result)}
`.trim();
}

/**
 * Get top issue types by frequency
 */
function getTopIssueTypes(findings: ValidationFinding[]): [string, number][] {
  const typeCounts = findings.reduce((counts, finding) => {
    counts[finding.issue] = (counts[finding.issue] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);

  return Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
}

/**
 * Generate recommendations based on analysis results
 */
function generateRecommendations(result: ParameterValidationResult): string {
  const recommendations: string[] = [];
  
  if (result.summary.criticalIssues > 0) {
    recommendations.push("🚨 Address critical issues immediately - these may cause runtime errors");
  }
  
  if (result.summary.autoFixableCount > 0) {
    recommendations.push(`🔧 ${result.summary.autoFixableCount} issues can be auto-fixed`);
  }
  
  const highIssueRate = (result.summary.highIssues / result.totalFunctions) * 100;
  if (highIssueRate > 20) {
    recommendations.push("📈 High issue rate detected - consider implementing stricter validation patterns");
  }
  
  if (result.language === SupportedLanguage.JAVASCRIPT) {
    recommendations.push("💡 Consider migrating to TypeScript for better type safety");
  }
  
  if (result.summary.criticalIssues === 0 && result.summary.highIssues === 0) {
    recommendations.push("✅ Excellent parameter validation practices!");
  }
  
  return recommendations.length > 0 ? recommendations.join('\n') : "No specific recommendations at this time.";
}

/**
 * Convert findings to JSON format for external tools
 */
export function exportFindingsAsJson(
  result: ParameterValidationResult,
  pretty: boolean = false
): string {
  const exportData = {
    metadata: {
      module: result.module,
      language: result.language,
      timestamp: result.analysisTimestamp,
      version: "1.0.0"
    },
    summary: result.summary,
    metrics: result.metrics,
    findings: result.findings.map(finding => ({
      ...finding,
      // Add additional context for external tools
      ruleId: `param-validation-${finding.issue}`,
      category: "parameter-validation",
      fixable: finding.autoFixable
    }))
  };
  
  return JSON.stringify(exportData, null, pretty ? 2 : 0);
}

/**
 * Convert findings to CSV format
 */
export function exportFindingsAsCsv(result: ParameterValidationResult): string {
  const headers = [
    "File",
    "Function", 
    "Line",
    "Parameter",
    "Issue Type",
    "Severity",
    "Suggestion",
    "Confidence",
    "Auto-fixable"
  ];
  
  const rows = result.findings.map(finding => [
    finding.file,
    finding.function,
    finding.line.toString(),
    finding.parameter,
    finding.issue,
    finding.severity,
    finding.suggestion.replace(/"/g, '""'), // Escape quotes
    finding.confidence.toString(),
    finding.autoFixable.toString()
  ]);
  
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
  ].join("\n");
  
  return csvContent;
}

/**
 * Merge multiple analysis results
 */
export function mergeAnalysisResults(
  results: ParameterValidationResult[]
): ParameterValidationResult {
  if (results.length === 0) {
    throw new Error("Cannot merge empty results array");
  }
  
  if (results.length === 1) {
    return results[0];
  }
  
  const merged: ParameterValidationResult = {
    module: "parameter_validation",
    severity: ValidationSeverity.LOW,
    language: results[0].language,
    analysisTimestamp: new Date().toISOString(),
    totalFunctions: 0,
    totalParameters: 0,
    findings: [],
    summary: {
      criticalIssues: 0,
      highIssues: 0,
      mediumIssues: 0,
      lowIssues: 0,
      autoFixableCount: 0,
      coveragePercentage: 0
    },
    metrics: {
      analysisTimeMs: 0,
      filesAnalyzed: 0,
      linesOfCode: 0
    }
  };
  
  // Merge all results
  for (const result of results) {
    merged.totalFunctions += result.totalFunctions;
    merged.totalParameters += result.totalParameters;
    merged.findings.push(...result.findings);
    merged.summary.criticalIssues += result.summary.criticalIssues;
    merged.summary.highIssues += result.summary.highIssues;
    merged.summary.mediumIssues += result.summary.mediumIssues;
    merged.summary.lowIssues += result.summary.lowIssues;
    merged.summary.autoFixableCount += result.summary.autoFixableCount;
    merged.metrics.analysisTimeMs += result.metrics.analysisTimeMs;
    merged.metrics.filesAnalyzed += result.metrics.filesAnalyzed;
    merged.metrics.linesOfCode += result.metrics.linesOfCode;
  }
  
  // Calculate overall severity
  if (merged.summary.criticalIssues > 0) {
    merged.severity = ValidationSeverity.CRITICAL;
  } else if (merged.summary.highIssues > 0) {
    merged.severity = ValidationSeverity.HIGH;
  } else if (merged.summary.mediumIssues > 0) {
    merged.severity = ValidationSeverity.MEDIUM;
  }
  
  // Calculate coverage percentage
  merged.summary.coveragePercentage = merged.findings.length > 0 ?
    Math.round((merged.summary.autoFixableCount / merged.findings.length) * 100) : 100;
  
  return merged;
}

