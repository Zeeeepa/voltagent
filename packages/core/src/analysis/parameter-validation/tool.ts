import { z } from "zod";
import { Tool } from "../../tool";
import { ParameterValidationEngine } from "./engine";
import { 
  ValidationConfigSchema, 
  ParameterValidationResultSchema,
  SupportedLanguage,
  ValidationSeverity 
} from "./types";

/**
 * Parameter validation analysis tool for VoltAgent
 */
export const parameterValidationTool = new Tool({
  name: "parameter_validation_analysis",
  description: "Analyze code for parameter validation issues, type mismatches, and missing validations across multiple programming languages",
  parameters: z.object({
    sourceCode: z.string().describe("Source code to analyze"),
    filePath: z.string().describe("Path to the source file"),
    config: ValidationConfigSchema.optional().describe("Analysis configuration options")
  }),
  execute: async (args, options) => {
    const { sourceCode, filePath, config } = args;
    
    // Create default config if not provided
    const defaultConfig = {
      language: detectLanguageFromPath(filePath),
      strictMode: true,
      checkOptionalParameters: true,
      validateApiSchemas: true,
      includeTypeCoercion: true,
      minimumConfidence: 0.7,
      excludePatterns: [],
      includePatterns: ["**/*.ts", "**/*.js", "**/*.go", "**/*.py"],
      customRules: []
    };

    const analysisConfig = config ? { ...defaultConfig, ...config } : defaultConfig;
    
    try {
      // Initialize the analysis engine
      const engine = new ParameterValidationEngine(analysisConfig);
      
      // Perform the analysis
      const result = await engine.analyzeCode(sourceCode, filePath);
      
      // Log analysis summary for debugging
      console.log(`Parameter validation analysis completed for ${filePath}:`);
      console.log(`- Functions analyzed: ${result.totalFunctions}`);
      console.log(`- Parameters analyzed: ${result.totalParameters}`);
      console.log(`- Issues found: ${result.findings.length}`);
      console.log(`- Overall severity: ${result.severity}`);
      
      return {
        success: true,
        result,
        summary: {
          filesAnalyzed: 1,
          functionsAnalyzed: result.totalFunctions,
          parametersAnalyzed: result.totalParameters,
          issuesFound: result.findings.length,
          criticalIssues: result.summary.criticalIssues,
          highIssues: result.summary.highIssues,
          autoFixableIssues: result.summary.autoFixableCount,
          analysisTimeMs: result.metrics.analysisTimeMs
        }
      };
      
    } catch (error) {
      console.error("Parameter validation analysis failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        result: null
      };
    }
  }
});

/**
 * Batch parameter validation analysis tool for multiple files
 */
export const batchParameterValidationTool = new Tool({
  name: "batch_parameter_validation_analysis", 
  description: "Analyze multiple files for parameter validation issues in batch",
  parameters: z.object({
    files: z.array(z.object({
      content: z.string().describe("File content"),
      path: z.string().describe("File path")
    })).describe("Array of files to analyze"),
    config: ValidationConfigSchema.optional().describe("Analysis configuration options")
  }),
  execute: async (args, options) => {
    const { files, config } = args;
    
    if (files.length === 0) {
      return {
        success: false,
        error: "No files provided for analysis",
        result: null
      };
    }

    // Create default config
    const defaultConfig = {
      language: SupportedLanguage.TYPESCRIPT, // Will be overridden per file
      strictMode: true,
      checkOptionalParameters: true,
      validateApiSchemas: true,
      includeTypeCoercion: true,
      minimumConfidence: 0.7,
      excludePatterns: [],
      includePatterns: ["**/*.ts", "**/*.js", "**/*.go", "**/*.py"],
      customRules: []
    };

    const analysisConfig = config ? { ...defaultConfig, ...config } : defaultConfig;
    
    try {
      // Initialize the analysis engine
      const engine = new ParameterValidationEngine(analysisConfig);
      
      // Perform batch analysis
      const result = await engine.analyzeFiles(files);
      
      // Log batch analysis summary
      console.log(`Batch parameter validation analysis completed:`);
      console.log(`- Files analyzed: ${files.length}`);
      console.log(`- Functions analyzed: ${result.totalFunctions}`);
      console.log(`- Parameters analyzed: ${result.totalParameters}`);
      console.log(`- Total issues found: ${result.findings.length}`);
      console.log(`- Overall severity: ${result.severity}`);
      
      return {
        success: true,
        result,
        summary: {
          filesAnalyzed: files.length,
          functionsAnalyzed: result.totalFunctions,
          parametersAnalyzed: result.totalParameters,
          issuesFound: result.findings.length,
          criticalIssues: result.summary.criticalIssues,
          highIssues: result.summary.highIssues,
          autoFixableIssues: result.summary.autoFixableCount,
          analysisTimeMs: result.metrics.analysisTimeMs
        }
      };
      
    } catch (error) {
      console.error("Batch parameter validation analysis failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        result: null
      };
    }
  }
});

/**
 * Parameter validation configuration tool
 */
export const parameterValidationConfigTool = new Tool({
  name: "configure_parameter_validation",
  description: "Configure parameter validation analysis settings",
  parameters: z.object({
    language: z.nativeEnum(SupportedLanguage).optional().describe("Primary language to analyze"),
    strictMode: z.boolean().optional().describe("Enable strict type checking"),
    checkOptionalParameters: z.boolean().optional().describe("Check optional parameter usage"),
    validateApiSchemas: z.boolean().optional().describe("Validate API parameter schemas"),
    minimumConfidence: z.number().min(0).max(1).optional().describe("Minimum confidence threshold for findings"),
    customRules: z.array(z.object({
      name: z.string(),
      pattern: z.string(),
      severity: z.nativeEnum(ValidationSeverity),
      message: z.string()
    })).optional().describe("Custom validation rules")
  }),
  execute: async (args, options) => {
    try {
      // Validate the configuration
      const config = ValidationConfigSchema.parse({
        language: args.language || SupportedLanguage.TYPESCRIPT,
        strictMode: args.strictMode ?? true,
        checkOptionalParameters: args.checkOptionalParameters ?? true,
        validateApiSchemas: args.validateApiSchemas ?? true,
        includeTypeCoercion: true,
        minimumConfidence: args.minimumConfidence ?? 0.7,
        excludePatterns: [],
        includePatterns: ["**/*.ts", "**/*.js", "**/*.go", "**/*.py"],
        customRules: args.customRules || []
      });
      
      return {
        success: true,
        config,
        message: "Parameter validation configuration updated successfully"
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Configuration validation failed",
        config: null
      };
    }
  }
});

/**
 * Helper function to detect language from file path
 */
function detectLanguageFromPath(filePath: string): SupportedLanguage {
  const extension = filePath.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'ts':
    case 'tsx':
      return SupportedLanguage.TYPESCRIPT;
    case 'js':
    case 'jsx':
      return SupportedLanguage.JAVASCRIPT;
    case 'go':
      return SupportedLanguage.GO;
    case 'py':
      return SupportedLanguage.PYTHON;
    case 'java':
      return SupportedLanguage.JAVA;
    case 'rs':
      return SupportedLanguage.RUST;
    default:
      return SupportedLanguage.TYPESCRIPT; // Default fallback
  }
}

/**
 * Export all parameter validation tools
 */
export const parameterValidationTools = [
  parameterValidationTool,
  batchParameterValidationTool,
  parameterValidationConfigTool
];

// Export types and engine for external use
export * from "./types";
export { ParameterValidationEngine } from "./engine";

