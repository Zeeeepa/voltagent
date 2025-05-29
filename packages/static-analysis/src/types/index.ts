/**
 * Supported programming languages for static analysis
 */
export enum SupportedLanguage {
  TYPESCRIPT = "typescript",
  JAVASCRIPT = "javascript", 
  PYTHON = "python",
  GO = "go",
}

/**
 * Types of functions that can be detected as unused
 */
export enum FunctionType {
  PUBLIC_FUNCTION = "public_function",
  PRIVATE_METHOD = "private_method", 
  UTILITY_FUNCTION = "utility_function",
  CLASS_METHOD = "class_method",
  ARROW_FUNCTION = "arrow_function",
  ANONYMOUS_FUNCTION = "anonymous_function",
}

/**
 * Severity levels for analysis findings
 */
export enum Severity {
  LOW = "low",
  MEDIUM = "medium", 
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Represents a function definition found in the codebase
 */
export interface FunctionDefinition {
  /** Name of the function */
  name: string;
  /** File path where the function is defined */
  file: string;
  /** Line number where the function starts */
  line: number;
  /** Column number where the function starts */
  column: number;
  /** Type of function */
  type: FunctionType;
  /** Whether the function is exported */
  isExported: boolean;
  /** Whether the function is a default export */
  isDefaultExport: boolean;
  /** Function signature/parameters */
  signature?: string;
  /** JSDoc or comments associated with the function */
  documentation?: string;
  /** Scope information (class name, namespace, etc.) */
  scope?: string;
}

/**
 * Represents a function usage/call found in the codebase
 */
export interface FunctionUsage {
  /** Name of the function being called */
  functionName: string;
  /** File path where the function is called */
  file: string;
  /** Line number where the function is called */
  line: number;
  /** Column number where the function is called */
  column: number;
  /** Context of the call (e.g., within another function) */
  context?: string;
}

/**
 * Represents an import/export relationship
 */
export interface ImportExportMapping {
  /** Source file path */
  source: string;
  /** Target file path */
  target: string;
  /** Imported/exported symbols */
  symbols: string[];
  /** Whether it's a default import/export */
  isDefault: boolean;
  /** Whether it's a namespace import */
  isNamespace: boolean;
}

/**
 * Analysis finding for unused functions
 */
export interface UnusedFunctionFinding {
  /** File path where the unused function is located */
  file: string;
  /** Name of the unused function */
  function: string;
  /** Line number where the function is defined */
  line: number;
  /** Type of function */
  type: FunctionType;
  /** Confidence level (0-1) that this is truly unused */
  confidence: number;
  /** Suggested action to take */
  suggestion: string;
  /** Additional context or reasoning */
  context?: string;
}

/**
 * Complete analysis result for unused function detection
 */
export interface UnusedFunctionAnalysisResult {
  /** Module identifier */
  module: "unused_function_detection";
  /** Overall severity of findings */
  severity: Severity;
  /** List of unused function findings */
  findings: UnusedFunctionFinding[];
  /** Analysis metadata */
  metadata: {
    /** Total number of functions analyzed */
    totalFunctions: number;
    /** Number of files analyzed */
    filesAnalyzed: number;
    /** Analysis duration in milliseconds */
    analysisTime: number;
    /** Languages detected and analyzed */
    languagesAnalyzed: SupportedLanguage[];
    /** Analysis timestamp */
    timestamp: string;
  };
}

/**
 * Configuration options for unused function analysis
 */
export interface AnalysisConfig {
  /** Languages to analyze */
  languages: SupportedLanguage[];
  /** File patterns to include */
  includePatterns: string[];
  /** File patterns to exclude */
  excludePatterns: string[];
  /** Minimum confidence threshold for reporting findings */
  confidenceThreshold: number;
  /** Whether to analyze test files */
  includeTests: boolean;
  /** Whether to analyze node_modules */
  includeNodeModules: boolean;
  /** Maximum analysis time in milliseconds */
  maxAnalysisTime: number;
}

/**
 * Input for the unused function analysis
 */
export interface AnalysisInput {
  /** PR diff files (if analyzing a PR) */
  prDiffFiles?: string[];
  /** Complete codebase context */
  codebaseContext: {
    /** Root directory path */
    rootPath: string;
    /** File paths to analyze */
    filePaths: string[];
  };
  /** Import/export mappings */
  importExportMappings?: ImportExportMapping[];
  /** Analysis configuration */
  config: AnalysisConfig;
}

/**
 * AST node information for function definitions
 */
export interface ASTFunctionNode {
  /** Node type */
  type: string;
  /** Function name */
  name: string;
  /** Start position */
  start: { line: number; column: number };
  /** End position */
  end: { line: number; column: number };
  /** Function parameters */
  params: string[];
  /** Whether function is async */
  isAsync: boolean;
  /** Whether function is a generator */
  isGenerator: boolean;
  /** Parent node information */
  parent?: {
    type: string;
    name?: string;
  };
}

/**
 * Call graph node representing function relationships
 */
export interface CallGraphNode {
  /** Function name */
  name: string;
  /** File where function is defined */
  file: string;
  /** Functions this function calls */
  calls: string[];
  /** Functions that call this function */
  calledBy: string[];
  /** Whether this function is an entry point */
  isEntryPoint: boolean;
}

/**
 * Call graph representing function call relationships
 */
export interface CallGraph {
  /** Map of function name to call graph node */
  nodes: Map<string, CallGraphNode>;
  /** Entry points (functions called from outside) */
  entryPoints: Set<string>;
}

