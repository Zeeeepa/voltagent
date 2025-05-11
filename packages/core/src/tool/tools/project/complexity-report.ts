import { z } from "zod";
import { createTool } from "../../index";
import { ToolCategory } from "../../registry/types";

/**
 * Result of generating a complexity report
 */
export interface ComplexityReportResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Complexity report
   */
  report?: {
    /**
     * Overall complexity score
     */
    overallScore: number;
    
    /**
     * Complexity by file
     */
    fileComplexity: Array<{
      file: string;
      score: number;
      lines: number;
      functions: number;
      classes: number;
      complexity: number;
      maintainability: number;
    }>;
    
    /**
     * Most complex functions
     */
    complexFunctions: Array<{
      file: string;
      function: string;
      complexity: number;
      lines: number;
    }>;
    
    /**
     * Most complex files
     */
    complexFiles: Array<{
      file: string;
      complexity: number;
      lines: number;
    }>;
    
    /**
     * Recommendations for improvement
     */
    recommendations: string[];
  };
  
  /**
   * Error message if the operation failed
   */
  error?: string;
}

/**
 * Tool for generating a complexity report
 */
export const ComplexityReportTool = createTool({
  name: "complexity_report",
  description: `- Generates a complexity report for a project
- Analyzes code complexity, maintainability, and technical debt
- Identifies complex functions and files
- Provides recommendations for improvement
- Use this tool to identify areas for refactoring

Usage notes:
- Provide the project root directory
- Use filePattern to limit analysis to specific files
- Use threshold to set the complexity threshold
- Returns detailed complexity metrics and recommendations`,
  category: ToolCategory.PROJECT_MANAGEMENT,
  source: "swarmMCP",
  parameters: z.object({
    projectRoot: z.string().describe("The directory of the project to analyze. Must be an absolute path."),
    filePattern: z.string().optional().describe("Glob pattern to match files to analyze. Default: '**/*.{js,ts,jsx,tsx}'"),
    threshold: z.number().optional().describe("Complexity threshold for highlighting. Default: 10"),
    excludePatterns: z.string().optional().describe("Comma-separated list of glob patterns to exclude. Default: 'node_modules,dist,build,coverage'"),
  }),
  execute: async (args, context) => {
    try {
      // Get the project manager from context
      const projectManager = (context && (context as any).projectManager) || null;
      
      if (!projectManager) {
        return {
          success: false,
          error: "Project manager not available in context",
        };
      }
      
      // Parse exclude patterns
      const excludePatterns = args.excludePatterns
        ? args.excludePatterns.split(",").map(p => p.trim())
        : ["node_modules", "dist", "build", "coverage"];
      
      // Generate complexity report
      const result = await projectManager.generateComplexityReport({
        projectRoot: args.projectRoot,
        filePattern: args.filePattern || "**/*.{js,ts,jsx,tsx}",
        threshold: args.threshold || 10,
        excludePatterns,
      });
      
      if (result.success) {
        return {
          success: true,
          report: result.report,
        };
      } else {
        return {
          success: false,
          error: result.error || "Failed to generate complexity report",
        };
      }
    } catch (error) {
      if (context && (context as any).logger) {
        (context as any).logger.error(`Error generating complexity report: ${(error as Error).message}`);
      } else {
        console.error(`Error generating complexity report: ${(error as Error).message}`);
      }
      
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

