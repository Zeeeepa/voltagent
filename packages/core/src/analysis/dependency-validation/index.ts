/**
 * Import & Dependency Validation Module
 * 
 * This module provides comprehensive analysis of import statements and dependencies
 * to detect issues like unused imports, circular dependencies, version conflicts,
 * and deprecated packages.
 */

export { DependencyAnalyzer } from "./analyzer";
export { ImportParser } from "./parsers/import-parser";
export { CircularDependencyDetector } from "./detectors/circular-dependency-detector";
export { VersionAnalyzer } from "./analyzers/version-analyzer";
export { DeprecationChecker } from "./analyzers/deprecation-checker";
export { AutoFixer } from "./fixers/auto-fixer";

export type {
  AnalysisOptions,
  DependencyValidationResult,
  Finding,
  ImportIssue,
  CircularDependencyIssue,
  VersionConflictIssue,
  DeprecatedPackageIssue,
  ImportStatement,
  DependencyGraph,
  DependencyNode,
  PackageInfo,
  PackageManagerConfig,
  AutoFixResult,
  Severity,
  IssueType,
} from "./types";

/**
 * Create a dependency analyzer with default options
 */
export function createDependencyAnalyzer(rootDir: string, options?: Partial<AnalysisOptions>) {
  return new DependencyAnalyzer({
    rootDir,
    ...options,
  });
}

/**
 * Quick analysis function for simple use cases
 */
export async function analyzeDependencies(
  rootDir: string,
  options?: Partial<AnalysisOptions>
): Promise<DependencyValidationResult> {
  const analyzer = createDependencyAnalyzer(rootDir, options);
  return analyzer.analyze();
}

/**
 * Utility function to check if a finding is auto-fixable
 */
export function isAutoFixable(finding: Finding): boolean {
  return "auto_fixable" in finding && finding.auto_fixable === true;
}

/**
 * Utility function to filter findings by severity
 */
export function filterBySeverity(findings: Finding[], severity: Severity): Finding[] {
  return findings.filter(finding => finding.severity === severity);
}

/**
 * Utility function to get critical findings (high severity)
 */
export function getCriticalFindings(findings: Finding[]): Finding[] {
  return filterBySeverity(findings, "high");
}

/**
 * Utility function to count findings by type
 */
export function countFindingsByType(findings: Finding[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  for (const finding of findings) {
    const type = "issue" in finding ? finding.issue : finding.type;
    counts[type] = (counts[type] || 0) + 1;
  }
  
  return counts;
}

/**
 * Utility function to generate a summary report
 */
export function generateSummaryReport(result: DependencyValidationResult): string {
  const { findings, summary, metadata } = result;
  
  const lines = [
    "# Dependency Validation Report",
    "",
    `**Analysis Date:** ${metadata.analysisTimestamp}`,
    `**Project Type:** ${metadata.projectType}`,
    `**Package Manager:** ${metadata.packageManager || "Unknown"}`,
    "",
    "## Summary",
    "",
    `- **Total Issues:** ${summary.totalIssues}`,
    `- **Critical Issues:** ${summary.criticalIssues}`,
    `- **Auto-fixable Issues:** ${summary.autoFixableIssues}`,
    `- **Files Analyzed:** ${summary.filesAnalyzed}`,
    `- **Dependencies Analyzed:** ${summary.dependenciesAnalyzed}`,
    `- **Overall Severity:** ${result.severity}`,
    "",
  ];
  
  if (findings.length > 0) {
    lines.push("## Issues by Type", "");
    
    const countsByType = countFindingsByType(findings);
    for (const [type, count] of Object.entries(countsByType)) {
      lines.push(`- **${type}:** ${count}`);
    }
    
    lines.push("", "## Critical Issues", "");
    
    const criticalFindings = getCriticalFindings(findings);
    if (criticalFindings.length > 0) {
      for (const finding of criticalFindings) {
        if ("file" in finding) {
          lines.push(`- **${finding.file}:${finding.line}** - ${finding.suggestion}`);
        } else {
          lines.push(`- **${finding.type}** - ${finding.suggestion}`);
        }
      }
    } else {
      lines.push("No critical issues found.");
    }
  } else {
    lines.push("## Results", "", "✅ No dependency issues found!");
  }
  
  return lines.join("\n");
}

