import { z } from "zod";
import { createTool } from "../../tool";
import { DependencyAnalyzer } from "./analyzer";
import type { AnalysisOptions, DependencyValidationResult } from "./types";

/**
 * Schema for dependency analysis tool parameters
 */
const DependencyAnalysisSchema = z.object({
  rootDir: z.string().describe("Root directory to analyze"),
  include: z.array(z.string()).optional().describe("File patterns to include"),
  exclude: z.array(z.string()).optional().describe("File patterns to exclude"),
  analyzeExternalDeps: z.boolean().optional().default(true).describe("Whether to analyze external dependencies"),
  checkDeprecated: z.boolean().optional().default(true).describe("Whether to check for deprecated packages"),
  checkVersions: z.boolean().optional().default(true).describe("Whether to validate version compatibility"),
  maxCircularDepth: z.number().optional().default(10).describe("Maximum depth for circular dependency detection"),
  autoFix: z.boolean().optional().default(false).describe("Whether to auto-fix simple issues"),
  severityThresholds: z.object({
    unusedImports: z.enum(["low", "medium", "high"]).optional(),
    circularDependencies: z.enum(["low", "medium", "high"]).optional(),
    versionConflicts: z.enum(["low", "medium", "high"]).optional(),
    deprecatedPackages: z.enum(["low", "medium", "high"]).optional(),
  }).optional().describe("Custom severity thresholds"),
});

/**
 * Dependency validation tool for VoltAgent
 */
export const dependencyValidationTool = createTool({
  name: "analyze_dependencies",
  description: `
    Perform comprehensive dependency and import analysis on a codebase.
    
    This tool analyzes:
    - Unused imports and dependencies
    - Circular dependencies
    - Version conflicts
    - Deprecated packages
    - Import organization issues
    
    Returns detailed findings with suggestions and auto-fix capabilities.
  `,
  parameters: DependencyAnalysisSchema,
  execute: async (args): Promise<DependencyValidationResult> => {
    const options: AnalysisOptions = {
      rootDir: args.rootDir,
      include: args.include,
      exclude: args.exclude,
      analyzeExternalDeps: args.analyzeExternalDeps,
      checkDeprecated: args.checkDeprecated,
      checkVersions: args.checkVersions,
      maxCircularDepth: args.maxCircularDepth,
      autoFix: args.autoFix,
      severityThresholds: args.severityThresholds,
    };

    const analyzer = new DependencyAnalyzer(options);
    return analyzer.analyze();
  },
});

/**
 * Quick dependency check tool (simplified version)
 */
export const quickDependencyCheckTool = createTool({
  name: "quick_dependency_check",
  description: `
    Perform a quick dependency check focusing on critical issues only.
    
    This is a faster version that checks for:
    - Critical circular dependencies
    - High-severity deprecated packages
    - Major version conflicts
  `,
  parameters: z.object({
    rootDir: z.string().describe("Root directory to analyze"),
    autoFix: z.boolean().optional().default(false).describe("Whether to auto-fix simple issues"),
  }),
  execute: async (args): Promise<DependencyValidationResult> => {
    const options: AnalysisOptions = {
      rootDir: args.rootDir,
      autoFix: args.autoFix,
      // Quick check settings
      analyzeExternalDeps: true,
      checkDeprecated: true,
      checkVersions: true,
      maxCircularDepth: 5, // Reduced depth for speed
      severityThresholds: {
        unusedImports: "medium", // Only report medium+ unused imports
        circularDependencies: "high",
        versionConflicts: "high",
        deprecatedPackages: "high",
      },
    };

    const analyzer = new DependencyAnalyzer(options);
    const result = await analyzer.analyze();
    
    // Filter to only critical and high-severity issues for quick check
    const criticalFindings = result.findings.filter(
      finding => finding.severity === "high"
    );
    
    return {
      ...result,
      findings: criticalFindings,
      summary: {
        ...result.summary,
        totalIssues: criticalFindings.length,
        criticalIssues: criticalFindings.length,
        autoFixableIssues: criticalFindings.filter(f => 
          "auto_fixable" in f && f.auto_fixable
        ).length,
      },
    };
  },
});

/**
 * Import organization tool
 */
export const organizeImportsTool = createTool({
  name: "organize_imports",
  description: `
    Organize and sort import statements in TypeScript/JavaScript files.
    
    This tool:
    - Sorts imports alphabetically
    - Groups external and internal imports
    - Removes duplicate imports
    - Fixes basic import path issues
  `,
  parameters: z.object({
    rootDir: z.string().describe("Root directory to process"),
    include: z.array(z.string()).optional().describe("File patterns to include"),
    exclude: z.array(z.string()).optional().describe("File patterns to exclude"),
  }),
  execute: async (args): Promise<{ 
    processedFiles: number; 
    fixedFiles: string[]; 
    errors: string[] 
  }> => {
    const options: AnalysisOptions = {
      rootDir: args.rootDir,
      include: args.include || ["**/*.{ts,tsx,js,jsx}"],
      exclude: args.exclude,
      autoFix: true,
      // Focus only on import organization
      analyzeExternalDeps: false,
      checkDeprecated: false,
      checkVersions: false,
      maxCircularDepth: 0,
    };

    const analyzer = new DependencyAnalyzer(options);
    
    try {
      const result = await analyzer.analyze();
      
      // Extract auto-fix results
      const fixedFiles = result.findings
        .filter(f => "file" in f)
        .map(f => (f as any).file)
        .filter((file, index, arr) => arr.indexOf(file) === index); // Remove duplicates
      
      return {
        processedFiles: result.summary.filesAnalyzed,
        fixedFiles,
        errors: [],
      };
    } catch (error) {
      return {
        processedFiles: 0,
        fixedFiles: [],
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  },
});

/**
 * Export all dependency validation tools
 */
export const dependencyValidationTools = [
  dependencyValidationTool,
  quickDependencyCheckTool,
  organizeImportsTool,
];

