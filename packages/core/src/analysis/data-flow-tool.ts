import { z } from "zod";
import { Tool } from "../tool";
import { DataFlowTracker } from "./data-flow-tracker";
import {
  DataFlowAnalysisInputSchema,
  DataFlowAnalysisResultSchema,
  DataFlowAnalysisConfigSchema
} from "./types";

/**
 * Tool for performing data flow and variable tracking analysis
 */
export const createDataFlowAnalysisTool = () => {
  return new Tool({
    name: "data_flow_analysis",
    description: `
Analyze code for data flow issues, variable tracking, and related problems.

This tool performs comprehensive analysis including:
- Uninitialized variable usage detection
- Unused variable detection  
- Data race condition identification
- Memory leak pattern detection
- Variable scope violation checking
- Null/undefined pointer access detection

The analysis supports TypeScript and JavaScript files and provides detailed
findings with specific suggestions for fixing identified issues.
    `.trim(),
    parameters: z.object({
      files: z.array(z.object({
        path: z.string().describe("File path to analyze"),
        content: z.string().describe("File content to analyze")
      })).describe("Array of files to analyze for data flow issues"),
      config: DataFlowAnalysisConfigSchema.optional().describe("Optional configuration for the analysis")
    }),
    execute: async (args) => {
      const tracker = new DataFlowTracker(args.config);
      
      const input = {
        files: args.files,
        config: args.config
      };

      try {
        const result = await tracker.analyze(input);
        return result;
      } catch (error) {
        throw new Error(`Data flow analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
};

/**
 * Tool for analyzing data flow in a single file
 */
export const createSingleFileDataFlowTool = () => {
  return new Tool({
    name: "analyze_file_data_flow",
    description: `
Analyze a single file for data flow and variable tracking issues.

This is a convenience tool for analyzing individual files without needing
to provide a full file array. It performs the same comprehensive analysis
as the main data flow tool but for a single file.
    `.trim(),
    parameters: z.object({
      filePath: z.string().describe("Path of the file to analyze"),
      content: z.string().describe("Content of the file to analyze"),
      config: DataFlowAnalysisConfigSchema.optional().describe("Optional configuration for the analysis")
    }),
    execute: async (args) => {
      const tracker = new DataFlowTracker(args.config);
      
      const input = {
        files: [{
          path: args.filePath,
          content: args.content
        }],
        config: args.config
      };

      try {
        const result = await tracker.analyze(input);
        return result;
      } catch (error) {
        throw new Error(`Single file data flow analysis failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
};

/**
 * Tool for validating data flow analysis configuration
 */
export const createDataFlowConfigValidationTool = () => {
  return new Tool({
    name: "validate_data_flow_config",
    description: `
Validate and normalize data flow analysis configuration.

This tool helps ensure that the configuration for data flow analysis
is valid and provides normalized configuration with defaults applied.
    `.trim(),
    parameters: z.object({
      config: z.record(z.any()).describe("Configuration object to validate")
    }),
    execute: async (args) => {
      try {
        const validatedConfig = DataFlowAnalysisConfigSchema.parse(args.config);
        return {
          valid: true,
          config: validatedConfig,
          message: "Configuration is valid"
        };
      } catch (error) {
        return {
          valid: false,
          config: null,
          message: `Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`,
          errors: error instanceof z.ZodError ? error.errors : []
        };
      }
    }
  });
};

