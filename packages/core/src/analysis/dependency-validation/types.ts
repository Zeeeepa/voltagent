/**
 * Types for the Import & Dependency Validation Module
 */

export type Severity = "low" | "medium" | "high";

export type IssueType = 
  | "unused_import"
  | "missing_import" 
  | "circular_dependency"
  | "version_conflict"
  | "deprecated_package"
  | "incorrect_import"
  | "duplicate_import"
  | "unused_dependency"
  | "missing_dependency";

export interface ImportIssue {
  file: string;
  line: number;
  import: string;
  issue: IssueType;
  suggestion: string;
  auto_fixable: boolean;
  severity?: Severity;
}

export interface CircularDependencyIssue {
  type: "circular_dependency";
  cycle: string[];
  suggestion: string;
  severity: Severity;
  files?: string[];
}

export interface VersionConflictIssue {
  type: "version_conflict";
  package: string;
  versions: string[];
  suggestion: string;
  severity: Severity;
  files: string[];
}

export interface DeprecatedPackageIssue {
  type: "deprecated_package";
  package: string;
  version: string;
  deprecationReason?: string;
  alternative?: string;
  suggestion: string;
  severity: Severity;
  files: string[];
}

export type Finding = ImportIssue | CircularDependencyIssue | VersionConflictIssue | DeprecatedPackageIssue;

export interface DependencyValidationResult {
  module: "dependency_validation";
  severity: Severity;
  findings: Finding[];
  summary: {
    totalIssues: number;
    autoFixableIssues: number;
    criticalIssues: number;
    filesAnalyzed: number;
    dependenciesAnalyzed: number;
  };
  metadata: {
    analysisTimestamp: string;
    analysisVersion: string;
    projectType: "typescript" | "javascript" | "go" | "python" | "unknown";
    packageManager?: "npm" | "yarn" | "pnpm" | "go" | "pip";
  };
}

export interface PackageInfo {
  name: string;
  version: string;
  isDevDependency: boolean;
  isOptionalDependency: boolean;
  isDirect: boolean;
  location?: string;
}

export interface ImportStatement {
  file: string;
  line: number;
  column: number;
  raw: string;
  module: string;
  imports: string[];
  isDefault: boolean;
  isNamespace: boolean;
  isDynamic: boolean;
  isTypeOnly: boolean;
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: Map<string, Set<string>>;
}

export interface DependencyNode {
  id: string;
  type: "file" | "package" | "module";
  path: string;
  dependencies: Set<string>;
  dependents: Set<string>;
  isExternal: boolean;
}

export interface AnalysisOptions {
  /**
   * Root directory to analyze
   */
  rootDir: string;
  
  /**
   * File patterns to include
   */
  include?: string[];
  
  /**
   * File patterns to exclude
   */
  exclude?: string[];
  
  /**
   * Whether to analyze external dependencies
   */
  analyzeExternalDeps?: boolean;
  
  /**
   * Whether to check for deprecated packages
   */
  checkDeprecated?: boolean;
  
  /**
   * Whether to validate version compatibility
   */
  checkVersions?: boolean;
  
  /**
   * Maximum depth for circular dependency detection
   */
  maxCircularDepth?: number;
  
  /**
   * Whether to auto-fix simple issues
   */
  autoFix?: boolean;
  
  /**
   * Custom severity thresholds
   */
  severityThresholds?: {
    unusedImports?: Severity;
    circularDependencies?: Severity;
    versionConflicts?: Severity;
    deprecatedPackages?: Severity;
  };
}

export interface PackageManagerConfig {
  type: "npm" | "yarn" | "pnpm" | "go" | "pip";
  lockFile?: string;
  manifestFile: string;
  nodeModulesPath?: string;
}

export interface AutoFixResult {
  file: string;
  originalContent: string;
  fixedContent: string;
  appliedFixes: {
    line: number;
    type: IssueType;
    description: string;
  }[];
}

