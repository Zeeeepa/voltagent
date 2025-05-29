import { z } from "zod";

/**
 * Severity levels for parameter validation findings
 */
export enum ValidationSeverity {
  LOW = "low",
  MEDIUM = "medium", 
  HIGH = "high",
  CRITICAL = "critical"
}

/**
 * Types of parameter validation issues
 */
export enum ValidationIssueType {
  TYPE_MISMATCH = "type_mismatch",
  MISSING_VALIDATION = "missing_validation", 
  INCORRECT_DEFAULT = "incorrect_default",
  OPTIONAL_REQUIRED_MISMATCH = "optional_required_mismatch",
  API_SCHEMA_VIOLATION = "api_schema_violation",
  UNSAFE_TYPE_COERCION = "unsafe_type_coercion",
  MISSING_NULL_CHECK = "missing_null_check",
  INVALID_TYPE_ANNOTATION = "invalid_type_annotation"
}

/**
 * Supported programming languages for analysis
 */
export enum SupportedLanguage {
  TYPESCRIPT = "typescript",
  JAVASCRIPT = "javascript", 
  GO = "go",
  PYTHON = "python",
  JAVA = "java",
  RUST = "rust"
}

/**
 * Parameter information extracted from code
 */
export const ParameterInfoSchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  isOptional: z.boolean(),
  defaultValue: z.string().optional(),
  annotations: z.array(z.string()).default([]),
  position: z.number(),
  line: z.number(),
  column: z.number()
});

export type ParameterInfo = z.infer<typeof ParameterInfoSchema>;

/**
 * Function signature information
 */
export const FunctionSignatureSchema = z.object({
  name: z.string(),
  parameters: z.array(ParameterInfoSchema),
  returnType: z.string().optional(),
  isAsync: z.boolean().default(false),
  isExported: z.boolean().default(false),
  startLine: z.number(),
  endLine: z.number(),
  filePath: z.string()
});

export type FunctionSignature = z.infer<typeof FunctionSignatureSchema>;

/**
 * Validation finding result
 */
export const ValidationFindingSchema = z.object({
  file: z.string(),
  function: z.string(),
  line: z.number(),
  column: z.number().optional(),
  parameter: z.string(),
  issue: z.nativeEnum(ValidationIssueType),
  severity: z.nativeEnum(ValidationSeverity),
  expectedType: z.string().optional(),
  actualUsage: z.string().optional(),
  suggestion: z.string(),
  confidence: z.number().min(0).max(1).default(0.8),
  autoFixable: z.boolean().default(false),
  context: z.object({
    functionSignature: z.string().optional(),
    surroundingCode: z.string().optional(),
    relatedFindings: z.array(z.string()).default([])
  }).optional()
});

export type ValidationFinding = z.infer<typeof ValidationFindingSchema>;

/**
 * Analysis result for parameter validation module
 */
export const ParameterValidationResultSchema = z.object({
  module: z.literal("parameter_validation"),
  severity: z.nativeEnum(ValidationSeverity),
  language: z.nativeEnum(SupportedLanguage),
  analysisTimestamp: z.string(),
  totalFunctions: z.number(),
  totalParameters: z.number(),
  findings: z.array(ValidationFindingSchema),
  summary: z.object({
    criticalIssues: z.number(),
    highIssues: z.number(), 
    mediumIssues: z.number(),
    lowIssues: z.number(),
    autoFixableCount: z.number(),
    coveragePercentage: z.number()
  }),
  metrics: z.object({
    analysisTimeMs: z.number(),
    filesAnalyzed: z.number(),
    linesOfCode: z.number()
  })
});

export type ParameterValidationResult = z.infer<typeof ParameterValidationResultSchema>;

/**
 * Configuration for parameter validation analysis
 */
export const ValidationConfigSchema = z.object({
  language: z.nativeEnum(SupportedLanguage),
  strictMode: z.boolean().default(true),
  checkOptionalParameters: z.boolean().default(true),
  validateApiSchemas: z.boolean().default(true),
  includeTypeCoercion: z.boolean().default(true),
  minimumConfidence: z.number().min(0).max(1).default(0.7),
  excludePatterns: z.array(z.string()).default([]),
  includePatterns: z.array(z.string()).default(["**/*.ts", "**/*.js", "**/*.go", "**/*.py"]),
  customRules: z.array(z.object({
    name: z.string(),
    pattern: z.string(),
    severity: z.nativeEnum(ValidationSeverity),
    message: z.string()
  })).default([])
});

export type ValidationConfig = z.infer<typeof ValidationConfigSchema>;

/**
 * Language-specific parser interface
 */
export interface LanguageParser {
  readonly language: SupportedLanguage;
  
  /**
   * Parse source code and extract function signatures
   */
  extractFunctions(sourceCode: string, filePath: string): Promise<FunctionSignature[]>;
  
  /**
   * Analyze parameter usage within function body
   */
  analyzeParameterUsage(functionSignature: FunctionSignature, sourceCode: string): Promise<ParameterUsageInfo[]>;
  
  /**
   * Validate type annotations and hints
   */
  validateTypeAnnotations(functionSignature: FunctionSignature): Promise<ValidationFinding[]>;
  
  /**
   * Check for missing parameter validation
   */
  checkMissingValidation(functionSignature: FunctionSignature, sourceCode: string): Promise<ValidationFinding[]>;
}

/**
 * Parameter usage information within function body
 */
export const ParameterUsageInfoSchema = z.object({
  parameter: z.string(),
  usages: z.array(z.object({
    line: z.number(),
    column: z.number(),
    context: z.string(),
    operation: z.string(), // assignment, comparison, method_call, etc.
    inferredType: z.string().optional()
  })),
  isValidated: z.boolean(),
  validationMethods: z.array(z.string()).default([])
});

export type ParameterUsageInfo = z.infer<typeof ParameterUsageInfoSchema>;

/**
 * API schema validation context
 */
export const ApiSchemaContextSchema = z.object({
  endpoint: z.string(),
  method: z.string(),
  parameters: z.array(z.object({
    name: z.string(),
    type: z.string(),
    required: z.boolean(),
    schema: z.record(z.any()).optional()
  })),
  responseSchema: z.record(z.any()).optional()
});

export type ApiSchemaContext = z.infer<typeof ApiSchemaContextSchema>;

