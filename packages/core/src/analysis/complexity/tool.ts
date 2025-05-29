import { z } from "zod";
import { createTool } from "../../tool";
import { ComplexityAnalyzer } from "./analyzer";
import type { ComplexityAnalysisConfig } from "./types";

/**
 * Tool schema for complexity analysis
 */
const ComplexityAnalysisToolSchema = z.object({
  target: z.string().describe("File path or directory to analyze"),
  config: z.object({
    thresholds: z.object({
      cyclomatic_warning: z.number().default(10),
      cyclomatic_critical: z.number().default(15),
      cognitive_warning: z.number().default(15),
      cognitive_critical: z.number().default(25),
      lines_warning: z.number().default(50),
      lines_critical: z.number().default(100),
    }).optional(),
    include_halstead: z.boolean().default(true),
    exclude_tests: z.boolean().default(true),
  }).optional().default({}),
});

/**
 * VoltAgent tool for code complexity analysis
 */
export const complexityAnalysisTool = createTool({
  name: "analyze_code_complexity",
  description: "Analyze code complexity and maintainability metrics for files or projects",
  parameters: ComplexityAnalysisToolSchema,
  execute: async (args) => {
    const { target, config = {} } = args;
    
    // Convert tool config to analyzer config
    const analyzerConfig: ComplexityAnalysisConfig = {
      thresholds: config.thresholds ? {
        cyclomatic: {
          warning: config.thresholds.cyclomatic_warning,
          critical: config.thresholds.cyclomatic_critical,
        },
        cognitive: {
          warning: config.thresholds.cognitive_warning,
          critical: config.thresholds.cognitive_critical,
        },
        lines_of_code: {
          warning: config.thresholds.lines_warning,
          critical: config.thresholds.lines_critical,
        },
        nesting_depth: { warning: 4, critical: 6 },
        parameter_count: { warning: 5, critical: 8 },
      } : undefined,
      calculate_halstead: config.include_halstead,
      exclude_patterns: config.exclude_tests ? [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/*.test.*",
        "**/*.spec.*",
        "**/__tests__/**",
        "**/__mocks__/**",
      ] : [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
      ],
    };

    const analyzer = new ComplexityAnalyzer(analyzerConfig);

    try {
      // Determine if target is a file or directory
      const fs = await import("fs");
      const path = await import("path");
      
      if (fs.existsSync(target)) {
        const stat = fs.statSync(target);
        
        if (stat.isFile()) {
          // Analyze single file
          const findings = await analyzer.analyzeFile(target);
          return {
            type: "file_analysis",
            target,
            findings,
            summary: {
              total_functions: findings.length,
              functions_with_issues: findings.filter(f => f.thresholds_exceeded.length > 0).length,
            },
          };
        } else if (stat.isDirectory()) {
          // Analyze entire project/directory
          const result = await analyzer.analyzeProject(target);
          return {
            type: "project_analysis",
            target,
            ...result,
          };
        }
      }
      
      throw new Error(`Target not found or invalid: ${target}`);
      
    } catch (error) {
      return {
        error: true,
        message: error instanceof Error ? error.message : "Unknown error occurred",
        target,
      };
    }
  },
});

/**
 * Tool for getting complexity analysis recommendations
 */
export const complexityRecommendationsTool = createTool({
  name: "get_complexity_recommendations",
  description: "Get specific refactoring recommendations based on complexity analysis results",
  parameters: z.object({
    findings: z.array(z.any()).describe("Array of complexity findings from analysis"),
    priority_filter: z.enum(["all", "high", "critical"]).default("all").describe("Filter by priority level"),
  }),
  execute: async (args) => {
    const { findings, priority_filter } = args;
    
    // Filter findings based on priority
    const filteredFindings = findings.filter((finding: any) => {
      if (priority_filter === "all") return true;
      if (priority_filter === "high") return ["high", "critical"].includes(finding.refactor_priority);
      if (priority_filter === "critical") return finding.refactor_priority === "critical";
      return false;
    });

    // Generate recommendations
    const recommendations = filteredFindings.map((finding: any) => ({
      file: finding.file,
      function: finding.function,
      line_range: `${finding.line_start}-${finding.line_end}`,
      priority: finding.refactor_priority,
      issues: finding.thresholds_exceeded,
      suggestion: finding.suggestion,
      metrics: {
        cyclomatic_complexity: finding.metrics.cyclomatic_complexity,
        cognitive_complexity: finding.metrics.cognitive_complexity,
        maintainability_index: finding.metrics.maintainability_index,
        technical_debt_score: finding.technical_debt_score,
      },
    }));

    // Sort by priority and technical debt score
    recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      return b.metrics.technical_debt_score - a.metrics.technical_debt_score; // Higher debt first
    });

    return {
      total_recommendations: recommendations.length,
      priority_breakdown: {
        critical: recommendations.filter(r => r.priority === "critical").length,
        high: recommendations.filter(r => r.priority === "high").length,
        medium: recommendations.filter(r => r.priority === "medium").length,
        low: recommendations.filter(r => r.priority === "low").length,
      },
      recommendations,
    };
  },
});

/**
 * Export all complexity analysis tools
 */
export const complexityAnalysisTools = [
  complexityAnalysisTool,
  complexityRecommendationsTool,
];

