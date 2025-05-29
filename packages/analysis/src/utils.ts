import { AnalysisContext, AnalysisResult } from './types';

/**
 * Utility functions for analysis operations
 */

/**
 * Create analysis context from file content
 */
export function createAnalysisContext(
  filePath: string,
  content: string,
  options?: {
    language?: string;
    framework?: string;
    dependencies?: string[];
  }
): AnalysisContext {
  return {
    filePath,
    content,
    language: options?.language || detectLanguage(filePath),
    framework: options?.framework,
    dependencies: options?.dependencies,
  };
}

/**
 * Detect programming language from file extension
 */
export function detectLanguage(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase();
  
  const languageMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'go': 'go',
    'java': 'java',
    'php': 'php',
    'rb': 'ruby',
    'cs': 'csharp',
    'cpp': 'cpp',
    'c': 'c',
    'h': 'c',
    'rs': 'rust',
    'kt': 'kotlin',
    'swift': 'swift',
  };

  return languageMap[extension || ''] || 'unknown';
}

/**
 * Merge multiple analysis results
 */
export function mergeAnalysisResults(results: AnalysisResult[]): AnalysisResult {
  if (results.length === 0) {
    return {
      module: 'merged_analysis',
      severity: 'low',
      findings: [],
    };
  }

  if (results.length === 1) {
    return results[0];
  }

  const allFindings = results.flatMap(result => result.findings);
  const overallSeverity = getHighestSeverity(results.map(r => r.severity));
  
  const totalMetadata = results.reduce((acc, result) => {
    if (result.metadata) {
      acc.analysisTime += result.metadata.analysisTime || 0;
      acc.filesAnalyzed += result.metadata.filesAnalyzed || 0;
      acc.totalLines += result.metadata.totalLines || 0;
    }
    return acc;
  }, {
    analysisTime: 0,
    filesAnalyzed: 0,
    totalLines: 0,
  });

  return {
    module: 'merged_analysis',
    severity: overallSeverity,
    findings: allFindings,
    metadata: {
      ...totalMetadata,
      coverage: calculateOverallCoverage(results),
    },
  };
}

/**
 * Get the highest severity from a list of severities
 */
export function getHighestSeverity(severities: AnalysisResult['severity'][]): AnalysisResult['severity'] {
  const severityOrder = ['low', 'medium', 'high', 'critical'];
  
  return severities.reduce((highest, current) => {
    const currentIndex = severityOrder.indexOf(current);
    const highestIndex = severityOrder.indexOf(highest);
    return currentIndex > highestIndex ? current : highest;
  }, 'low');
}

/**
 * Calculate overall coverage from multiple results
 */
function calculateOverallCoverage(results: AnalysisResult[]): number {
  const coverages = results
    .map(r => r.metadata?.coverage)
    .filter((coverage): coverage is number => coverage !== undefined);
  
  if (coverages.length === 0) return 0;
  
  return Math.round(coverages.reduce((sum, coverage) => sum + coverage, 0) / coverages.length);
}

/**
 * Filter analysis contexts by file type
 */
export function filterContextsByLanguage(
  contexts: AnalysisContext[],
  languages: string[]
): AnalysisContext[] {
  return contexts.filter(context => 
    languages.includes(context.language.toLowerCase())
  );
}

/**
 * Group analysis contexts by framework
 */
export function groupContextsByFramework(
  contexts: AnalysisContext[]
): Record<string, AnalysisContext[]> {
  return contexts.reduce((groups, context) => {
    const framework = context.framework || 'unknown';
    if (!groups[framework]) {
      groups[framework] = [];
    }
    groups[framework].push(context);
    return groups;
  }, {} as Record<string, AnalysisContext[]>);
}

/**
 * Create a summary report from analysis results
 */
export function createSummaryReport(results: AnalysisResult[]): {
  totalFindings: number;
  severityBreakdown: Record<string, number>;
  moduleBreakdown: Record<string, number>;
  topRisks: string[];
  recommendations: string[];
} {
  const allFindings = results.flatMap(r => r.findings);
  
  const severityBreakdown = allFindings.reduce((acc, finding) => {
    const severity = finding.severity || 'medium';
    acc[severity] = (acc[severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const moduleBreakdown = results.reduce((acc, result) => {
    acc[result.module] = result.findings.length;
    return acc;
  }, {} as Record<string, number>);

  const riskCounts = allFindings.reduce((acc, finding) => {
    acc[finding.risk] = (acc[finding.risk] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topRisks = Object.entries(riskCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([risk]) => risk);

  const recommendations = Array.from(
    new Set(allFindings.map(f => f.suggestion))
  ).slice(0, 10);

  return {
    totalFindings: allFindings.length,
    severityBreakdown,
    moduleBreakdown,
    topRisks,
    recommendations,
  };
}

/**
 * Export analysis results to JSON
 */
export function exportToJson(results: AnalysisResult | AnalysisResult[]): string {
  return JSON.stringify(results, null, 2);
}

/**
 * Validate analysis result structure
 */
export function validateAnalysisResult(result: any): result is AnalysisResult {
  return (
    typeof result === 'object' &&
    typeof result.module === 'string' &&
    ['low', 'medium', 'high', 'critical'].includes(result.severity) &&
    Array.isArray(result.findings) &&
    result.findings.every((finding: any) => 
      typeof finding.type === 'string' &&
      typeof finding.file === 'string' &&
      typeof finding.risk === 'string' &&
      typeof finding.suggestion === 'string'
    )
  );
}

