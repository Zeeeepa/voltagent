import { readFileSync, existsSync, readdirSync, statSync } from "fs";
import { join, extname } from "path";
import { ComplexityCalculator } from "./calculator";
import { CodeParser } from "./parser";
import type {
  ComplexityAnalysisResult,
  ComplexityAnalysisConfig,
  ComplexityFinding,
  ThresholdLevels,
  Severity,
  RefactorPriority,
  FunctionInfo,
  ComplexityMetrics,
} from "./types";

/**
 * Main complexity analyzer that orchestrates the analysis process
 */
export class ComplexityAnalyzer {
  private config: Required<ComplexityAnalysisConfig>;
  private defaultThresholds: ThresholdLevels = {
    cyclomatic: { warning: 10, critical: 15 },
    cognitive: { warning: 15, critical: 25 },
    lines_of_code: { warning: 50, critical: 100 },
    nesting_depth: { warning: 4, critical: 6 },
    parameter_count: { warning: 5, critical: 8 },
  };

  constructor(config: ComplexityAnalysisConfig = {}) {
    this.config = {
      thresholds: config.thresholds || this.defaultThresholds,
      include_patterns: config.include_patterns || ["**/*.ts", "**/*.js", "**/*.tsx", "**/*.jsx"],
      exclude_patterns: config.exclude_patterns || [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/*.test.*",
        "**/*.spec.*",
      ],
      calculate_halstead: config.calculate_halstead ?? true,
      track_trends: config.track_trends ?? true,
    };
  }

  /**
   * Analyze complexity for a single file
   */
  async analyzeFile(filePath: string): Promise<ComplexityFinding[]> {
    if (!existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const content = readFileSync(filePath, "utf-8");
    const functions = CodeParser.extractFunctions(content, filePath);
    
    return this.analyzeFunctions(functions);
  }

  /**
   * Analyze complexity for multiple files matching patterns
   */
  async analyzeProject(rootPath: string = process.cwd()): Promise<ComplexityAnalysisResult> {
    const files = await this.findSourceFiles(rootPath);
    const allFindings: ComplexityFinding[] = [];

    for (const file of files) {
      try {
        const findings = await this.analyzeFile(file);
        allFindings.push(...findings);
      } catch (error) {
        console.warn(`Failed to analyze file ${file}:`, error);
      }
    }

    return this.generateReport(allFindings);
  }

  /**
   * Analyze complexity for a list of functions
   */
  private analyzeFunctions(functions: FunctionInfo[]): ComplexityFinding[] {
    const findings: ComplexityFinding[] = [];

    for (const functionInfo of functions) {
      const metrics = ComplexityCalculator.calculateAllMetrics(functionInfo);
      const thresholdsExceeded = this.checkThresholds(metrics);
      
      if (thresholdsExceeded.length > 0) {
        const finding: ComplexityFinding = {
          file: functionInfo.file,
          function: functionInfo.name,
          line_start: functionInfo.lineStart,
          line_end: functionInfo.lineEnd,
          metrics,
          thresholds_exceeded: thresholdsExceeded,
          suggestion: this.generateSuggestion(metrics, thresholdsExceeded),
          refactor_priority: this.calculateRefactorPriority(metrics, thresholdsExceeded),
          technical_debt_score: this.calculateTechnicalDebtScore(metrics),
        };

        findings.push(finding);
      }
    }

    return findings;
  }

  /**
   * Check which thresholds are exceeded for given metrics
   */
  private checkThresholds(metrics: ComplexityMetrics): string[] {
    const exceeded: string[] = [];
    const thresholds = this.config.thresholds;

    if (metrics.cyclomatic_complexity >= thresholds.cyclomatic.warning) {
      exceeded.push("cyclomatic");
    }

    if (metrics.cognitive_complexity >= thresholds.cognitive.warning) {
      exceeded.push("cognitive");
    }

    if (metrics.lines_of_code >= thresholds.lines_of_code.warning) {
      exceeded.push("lines_of_code");
    }

    if (metrics.nesting_depth >= thresholds.nesting_depth.warning) {
      exceeded.push("nesting_depth");
    }

    if (metrics.parameter_count >= thresholds.parameter_count.warning) {
      exceeded.push("parameter_count");
    }

    return exceeded;
  }

  /**
   * Generate specific refactoring suggestions based on metrics
   */
  private generateSuggestion(metrics: ComplexityMetrics, thresholdsExceeded: string[]): string {
    const suggestions: string[] = [];

    if (thresholdsExceeded.includes("cyclomatic") || thresholdsExceeded.includes("cognitive")) {
      suggestions.push("Break function into smaller, more focused methods");
    }

    if (thresholdsExceeded.includes("lines_of_code")) {
      suggestions.push("Reduce function length by extracting helper methods");
    }

    if (thresholdsExceeded.includes("nesting_depth")) {
      suggestions.push("Reduce nesting by using early returns or guard clauses");
    }

    if (thresholdsExceeded.includes("parameter_count")) {
      suggestions.push("Consider using parameter objects or configuration objects");
    }

    if (metrics.maintainability_index < 20) {
      suggestions.push("Improve code readability and documentation");
    }

    return suggestions.length > 0 
      ? suggestions.join("; ") 
      : "Consider refactoring to improve maintainability";
  }

  /**
   * Calculate refactor priority based on metrics and thresholds
   */
  private calculateRefactorPriority(
    metrics: ComplexityMetrics,
    thresholdsExceeded: string[]
  ): RefactorPriority {
    const thresholds = this.config.thresholds;
    let criticalCount = 0;

    // Check for critical threshold violations
    if (metrics.cyclomatic_complexity >= thresholds.cyclomatic.critical) criticalCount++;
    if (metrics.cognitive_complexity >= thresholds.cognitive.critical) criticalCount++;
    if (metrics.lines_of_code >= thresholds.lines_of_code.critical) criticalCount++;
    if (metrics.nesting_depth >= thresholds.nesting_depth.critical) criticalCount++;
    if (metrics.parameter_count >= thresholds.parameter_count.critical) criticalCount++;

    if (criticalCount >= 2 || metrics.maintainability_index < 10) {
      return "critical";
    }

    if (criticalCount >= 1 || thresholdsExceeded.length >= 3) {
      return "high";
    }

    if (thresholdsExceeded.length >= 2) {
      return "medium";
    }

    return "low";
  }

  /**
   * Calculate technical debt score (0-100, higher is worse)
   */
  private calculateTechnicalDebtScore(metrics: ComplexityMetrics): number {
    const weights = {
      cyclomatic: 0.25,
      cognitive: 0.25,
      maintainability: 0.3,
      lines_of_code: 0.1,
      nesting: 0.1,
    };

    // Normalize metrics to 0-100 scale
    const normalizedCyclomatic = Math.min(100, (metrics.cyclomatic_complexity / 20) * 100);
    const normalizedCognitive = Math.min(100, (metrics.cognitive_complexity / 30) * 100);
    const normalizedMaintainability = 100 - metrics.maintainability_index; // Invert since higher MI is better
    const normalizedLoc = Math.min(100, (metrics.lines_of_code / 200) * 100);
    const normalizedNesting = Math.min(100, (metrics.nesting_depth / 8) * 100);

    const score = 
      normalizedCyclomatic * weights.cyclomatic +
      normalizedCognitive * weights.cognitive +
      normalizedMaintainability * weights.maintainability +
      normalizedLoc * weights.lines_of_code +
      normalizedNesting * weights.nesting;

    return Math.round(score * 100) / 100;
  }

  /**
   * Generate comprehensive analysis report
   */
  private generateReport(findings: ComplexityFinding[]): ComplexityAnalysisResult {
    const totalFunctions = findings.length;
    const functionsWithIssues = findings.filter(f => f.thresholds_exceeded.length > 0).length;
    
    const complexities = findings.map(f => f.metrics.cyclomatic_complexity);
    const averageComplexity = complexities.length > 0 
      ? complexities.reduce((a, b) => a + b, 0) / complexities.length 
      : 0;
    const highestComplexity = complexities.length > 0 ? Math.max(...complexities) : 0;
    
    const totalTechnicalDebt = findings.reduce((sum, f) => sum + f.technical_debt_score, 0);

    // Determine overall severity
    const severity = this.calculateOverallSeverity(findings);

    return {
      module: "complexity_analysis",
      severity,
      timestamp: new Date().toISOString(),
      summary: {
        total_functions: totalFunctions,
        functions_with_issues: functionsWithIssues,
        average_complexity: Math.round(averageComplexity * 100) / 100,
        highest_complexity: highestComplexity,
        total_technical_debt: Math.round(totalTechnicalDebt * 100) / 100,
      },
      findings,
      thresholds: this.config.thresholds,
    };
  }

  /**
   * Calculate overall severity based on findings
   */
  private calculateOverallSeverity(findings: ComplexityFinding[]): Severity {
    const criticalCount = findings.filter(f => f.refactor_priority === "critical").length;
    const highCount = findings.filter(f => f.refactor_priority === "high").length;
    const mediumCount = findings.filter(f => f.refactor_priority === "medium").length;

    if (criticalCount > 0) return "critical";
    if (highCount >= 3) return "high";
    if (highCount > 0 || mediumCount >= 5) return "medium";
    return "low";
  }

  /**
   * Find source files matching include/exclude patterns
   */
  private async findSourceFiles(rootPath: string): Promise<string[]> {
    const allFiles: string[] = [];
    const supportedExtensions = ['.ts', '.js', '.tsx', '.jsx'];
    
    const walkDirectory = (dir: string): void => {
      try {
        const items = readdirSync(dir);
        
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory()) {
            // Skip excluded directories
            if (this.shouldExcludePath(fullPath)) {
              continue;
            }
            walkDirectory(fullPath);
          } else if (stat.isFile()) {
            // Check if file should be included
            if (this.shouldIncludeFile(fullPath, supportedExtensions)) {
              allFiles.push(fullPath);
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to read directory ${dir}:`, error);
      }
    };

    walkDirectory(rootPath);
    return allFiles;
  }

  /**
   * Check if a file should be included based on extension and exclude patterns
   */
  private shouldIncludeFile(filePath: string, supportedExtensions: string[]): boolean {
    const ext = extname(filePath);
    
    // Check if extension is supported
    if (!supportedExtensions.includes(ext)) {
      return false;
    }

    // Check exclude patterns
    return !this.shouldExcludePath(filePath);
  }

  /**
   * Check if a path should be excluded based on exclude patterns
   */
  private shouldExcludePath(path: string): boolean {
    const excludePatterns = [
      'node_modules',
      'dist',
      'build',
      '.git',
      'coverage',
      '.nyc_output',
    ];

    const testPatterns = [
      '.test.',
      '.spec.',
      '__tests__',
      '__mocks__',
    ];

    // Check directory exclusions
    for (const pattern of excludePatterns) {
      if (path.includes(pattern)) {
        return true;
      }
    }

    // Check test file exclusions
    for (const pattern of testPatterns) {
      if (path.includes(pattern)) {
        return true;
      }
    }

    return false;
  }
}

