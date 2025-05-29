import { createToolkit } from "../tool";
import {
  createDataFlowAnalysisTool,
  createSingleFileDataFlowTool,
  createDataFlowConfigValidationTool
} from "./data-flow-tool";

/**
 * Create a complete toolkit for data flow and variable tracking analysis
 * 
 * This toolkit includes all the tools needed for comprehensive data flow analysis:
 * - Main data flow analysis tool for multiple files
 * - Single file analysis tool for convenience
 * - Configuration validation tool
 * 
 * @returns Toolkit containing all data flow analysis tools
 */
export const createDataFlowAnalysisToolkit = () => {
  return createToolkit({
    name: "data-flow-analysis-toolkit",
    description: "Complete toolkit for data flow and variable tracking analysis",
    tools: [
      createDataFlowAnalysisTool(),
      createSingleFileDataFlowTool(),
      createDataFlowConfigValidationTool()
    ]
  });
};

