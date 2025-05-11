import { ParsePRDTool } from "./parse-prd";
import { InitializeProjectTool } from "./initialize-project";
import { AnalyzeTool } from "./analyze";
import { ComplexityReportTool } from "./complexity-report";
import type { Toolkit } from "../../toolkit";

/**
 * Create a toolkit with all project management tools
 * @returns A toolkit with all project management tools
 */
export function createProjectManagementToolkit(): Toolkit {
  return {
    name: "project-management",
    description: "Tools for managing projects and requirements",
    tools: [
      ParsePRDTool,
      InitializeProjectTool,
      AnalyzeTool,
      ComplexityReportTool,
    ],
  };
}

export {
  ParsePRDTool,
  InitializeProjectTool,
  AnalyzeTool,
  ComplexityReportTool,
};

