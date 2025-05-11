import { z } from "zod";
import { createTool } from "../../index";
import { ToolCategory } from "../../registry/types";

/**
 * Result of analyzing a project
 */
export interface AnalyzeResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Analysis results
   */
  analysis?: {
    /**
     * Project structure
     */
    structure: {
      directories: string[];
      files: string[];
      fileTypes: Record<string, number>;
    };
    
    /**
     * Code metrics
     */
    metrics: {
      totalFiles: number;
      totalLines: number;
      totalSize: number;
      averageLinesPerFile: number;
      averageFileSize: number;
    };
    
    /**
     * Dependencies
     */
    dependencies?: Record<string, string>;
    
    /**
     * Technologies used
     */
    technologies?: string[];
    
    /**
     * Architecture overview
     */
    architecture?: string;
    
    /**
     * Potential issues
     */
    issues?: Array<{
      type: string;
      severity: "low" | "medium" | "high";
      description: string;
      location?: string;
    }>;
  };
  
  /**
   * Error message if the operation failed
   */
  error?: string;
}

/**
 * Tool for analyzing a project
 */
export const AnalyzeTool = createTool({
  name: "analyze",
  description: `- Analyzes a project's structure, code, and dependencies
- Provides metrics and insights about the codebase
- Identifies potential issues and areas for improvement
- Use this tool to understand a project's architecture and complexity

Usage notes:
- Provide the project root directory
- Use includeMetrics to include code metrics
- Use includeDependencies to include dependency analysis
- Returns detailed analysis of the project`,
  category: ToolCategory.PROJECT_MANAGEMENT,
  source: "swarmMCP",
  parameters: z.object({
    projectRoot: z.string().describe("The directory of the project to analyze. Must be an absolute path."),
    includeMetrics: z.boolean().optional().describe("Whether to include code metrics. Default: true"),
    includeDependencies: z.boolean().optional().describe("Whether to include dependency analysis. Default: true"),
    includeIssues: z.boolean().optional().describe("Whether to include potential issues. Default: true"),
    maxDepth: z.number().optional().describe("Maximum directory depth to analyze. Default: 5"),
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
      
      // Analyze the project
      const result = await projectManager.analyzeProject({
        projectRoot: args.projectRoot,
        includeMetrics: args.includeMetrics !== false,
        includeDependencies: args.includeDependencies !== false,
        includeIssues: args.includeIssues !== false,
        maxDepth: args.maxDepth || 5,
        excludePatterns,
      });
      
      if (result.success) {
        return {
          success: true,
          analysis: result.analysis,
        };
      } else {
        return {
          success: false,
          error: result.error || "Failed to analyze project",
        };
      }
    } catch (error) {
      if (context && (context as any).logger) {
        (context as any).logger.error(`Error analyzing project: ${(error as Error).message}`);
      } else {
        console.error(`Error analyzing project: ${(error as Error).message}`);
      }
      
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

