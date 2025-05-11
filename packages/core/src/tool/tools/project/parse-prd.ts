import { z } from "zod";
import { createTool } from "../../index";
import { ToolCategory } from "../../registry/types";

/**
 * Result of parsing a PRD
 */
export interface ParsePRDResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Parsed requirements
   */
  requirements?: Array<{
    id: string;
    title: string;
    description: string;
    priority: string;
    category: string;
    acceptance_criteria?: string[];
  }>;
  
  /**
   * Error message if the operation failed
   */
  error?: string;
  
  /**
   * Project title
   */
  projectTitle?: string;
  
  /**
   * Project description
   */
  projectDescription?: string;
  
  /**
   * Project goals
   */
  projectGoals?: string[];
  
  /**
   * Project constraints
   */
  projectConstraints?: string[];
  
  /**
   * Project timeline
   */
  projectTimeline?: string;
  
  /**
   * Project stakeholders
   */
  projectStakeholders?: string[];
}

/**
 * Tool for parsing a PRD document
 */
export const ParsePRDTool = createTool({
  name: "parse_prd",
  description: `- Parses a Product Requirements Document (PRD)
- Extracts requirements, goals, constraints, and other metadata
- Can parse from text or file
- Use this tool to extract structured information from PRD documents

Usage notes:
- Provide the PRD text or file path
- Returns structured requirements and project metadata
- Use the extracted requirements to create tasks`,
  category: ToolCategory.PROJECT_MANAGEMENT,
  source: "swarmMCP",
  parameters: z.object({
    prd: z.string().describe("PRD text content"),
    filePath: z.string().optional().describe("Path to PRD file (if not providing text directly)"),
    projectRoot: z.string().describe("The directory of the project. Must be an absolute path."),
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
      
      // Parse the PRD
      let prdContent = args.prd;
      
      // If a file path is provided, read the file
      if (args.filePath) {
        try {
          const fs = await import("fs/promises");
          prdContent = await fs.readFile(args.filePath, "utf8");
        } catch (error) {
          return {
            success: false,
            error: `Failed to read PRD file: ${(error as Error).message}`,
          };
        }
      }
      
      // In a real implementation, this would use an AI service to parse the PRD
      // For now, we'll just return a simple structure
      const result = await projectManager.parsePRD(prdContent, {
        projectRoot: args.projectRoot,
      });
      
      if (result.success) {
        return {
          success: true,
          requirements: result.requirements,
          projectTitle: result.projectTitle,
          projectDescription: result.projectDescription,
          projectGoals: result.projectGoals,
          projectConstraints: result.projectConstraints,
          projectTimeline: result.projectTimeline,
          projectStakeholders: result.projectStakeholders,
        };
      } else {
        return {
          success: false,
          error: result.error || "Failed to parse PRD",
        };
      }
    } catch (error) {
      if (context && (context as any).logger) {
        (context as any).logger.error(`Error parsing PRD: ${(error as Error).message}`);
      } else {
        console.error(`Error parsing PRD: ${(error as Error).message}`);
      }
      
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

