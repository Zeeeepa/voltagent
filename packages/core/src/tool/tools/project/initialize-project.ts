import { z } from "zod";
import { createTool } from "../../index";
import { ToolCategory } from "../../registry/types";

/**
 * Result of initializing a project
 */
export interface InitializeProjectResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Project ID
   */
  projectId?: string;
  
  /**
   * Error message if the operation failed
   */
  error?: string;
  
  /**
   * Project structure
   */
  structure?: {
    directories: string[];
    files: string[];
  };
  
  /**
   * Project configuration
   */
  config?: any;
}

/**
 * Tool for initializing a new project
 */
export const InitializeProjectTool = createTool({
  name: "initialize_project",
  description: `- Initializes a new project
- Creates project directory structure
- Sets up configuration files
- Can initialize from templates or requirements
- Use this tool to set up a new project

Usage notes:
- Provide project name and type
- Use template to specify a project template
- Use requirements to initialize from parsed requirements
- Returns project ID and structure`,
  category: ToolCategory.PROJECT_MANAGEMENT,
  source: "swarmMCP",
  requiresPermission: true,
  parameters: z.object({
    name: z.string().describe("Project name"),
    type: z.string().describe("Project type (e.g., 'web', 'mobile', 'api', 'library')"),
    template: z.string().optional().describe("Template to use for initialization"),
    requirements: z.string().optional().describe("Requirements JSON string (from parse_prd)"),
    description: z.string().optional().describe("Project description"),
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
      
      // Parse requirements if provided
      let parsedRequirements;
      if (args.requirements) {
        try {
          parsedRequirements = JSON.parse(args.requirements);
        } catch (error) {
          return {
            success: false,
            error: `Failed to parse requirements JSON: ${(error as Error).message}`,
          };
        }
      }
      
      // Initialize the project
      const result = await projectManager.initializeProject({
        name: args.name,
        type: args.type,
        template: args.template,
        requirements: parsedRequirements,
        description: args.description,
        projectRoot: args.projectRoot,
      });
      
      if (result.success) {
        return {
          success: true,
          projectId: result.projectId,
          structure: result.structure,
          config: result.config,
        };
      } else {
        return {
          success: false,
          error: result.error || "Failed to initialize project",
        };
      }
    } catch (error) {
      if (context && (context as any).logger) {
        (context as any).logger.error(`Error initializing project: ${(error as Error).message}`);
      } else {
        console.error(`Error initializing project: ${(error as Error).message}`);
      }
      
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
});

