/**
 * Core types and interfaces for the Codegen Development Engine
 */

// ===== Configuration Types =====

export interface DevelopmentEngineOptions {
  database?: DatabaseOptions;
  github?: GitHubOptions;
  linear?: LinearOptions;
  generation?: CodeGenerationOptions;
  quality?: QualityAssuranceOptions;
  testing?: TestingOptions;
}

export interface DatabaseOptions {
  connectionString?: string;
  storeLearningData?: (data: LearningData) => Promise<void>;
  retrieveContext?: (taskId: string) => Promise<TaskContext>;
}

export interface GitHubOptions {
  token?: string;
  owner?: string;
  repo?: string;
  baseUrl?: string;
}

export interface LinearOptions {
  apiKey?: string;
  teamId?: string;
  webhookUrl?: string;
}

export interface CodeGenerationOptions {
  temperature?: number;
  maxTokens?: number;
  codeStyle?: CodeStyle;
  frameworks?: string[];
}

export interface QualityAssuranceOptions {
  enableLinting?: boolean;
  enableSecurity?: boolean;
  enablePerformance?: boolean;
  qualityThreshold?: number;
}

export interface TestingOptions {
  framework?: string;
  coverage?: number;
  generateIntegrationTests?: boolean;
  generateE2ETests?: boolean;
}

// ===== Task and Context Types =====

export interface TaskContext {
  id: string;
  title: string;
  description: string;
  requirements: Requirements;
  repoUrl: string;
  branch?: string;
  assignee?: string;
  priority: number;
  labels: string[];
  parentTask?: string;
  subTasks?: string[];
  dependencies?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Requirements {
  naturalLanguage: string;
  technicalSpecs?: TechnicalSpecification[];
  acceptanceCriteria?: string[];
  constraints?: Constraint[];
  integrationPoints?: IntegrationPoint[];
}

export interface TechnicalSpecification {
  type: 'api' | 'database' | 'ui' | 'service' | 'config' | 'test';
  description: string;
  details: Record<string, any>;
}

export interface Constraint {
  type: 'performance' | 'security' | 'compatibility' | 'resource';
  description: string;
  value?: string | number;
}

export interface IntegrationPoint {
  type: 'api' | 'database' | 'service' | 'library';
  name: string;
  description: string;
  dependencies?: string[];
}

// ===== Analysis and Generation Types =====

export interface CodebaseAnalysisResult {
  architecture: ArchitecturalPattern[];
  components: ComponentMap;
  dependencies: DependencyGraph;
  patterns: DesignPattern[];
  standards: CodingStandards;
  testingFramework: TestingFramework;
  integrationPoints: IntegrationPoint[];
  metrics: CodebaseMetrics;
}

export interface ArchitecturalPattern {
  name: string;
  type: 'mvc' | 'mvvm' | 'microservices' | 'layered' | 'hexagonal' | 'other';
  description: string;
  components: string[];
}

export interface ComponentMap {
  [componentName: string]: {
    path: string;
    type: 'service' | 'controller' | 'model' | 'view' | 'utility' | 'config';
    dependencies: string[];
    exports: string[];
    description?: string;
  };
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface DependencyNode {
  id: string;
  name: string;
  type: 'internal' | 'external' | 'system';
  version?: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'imports' | 'extends' | 'implements' | 'uses';
}

export interface DesignPattern {
  name: string;
  type: string;
  usage: string[];
  examples: string[];
}

export interface CodingStandards {
  language: string;
  style: CodeStyle;
  conventions: NamingConvention[];
  rules: LintingRule[];
}

export interface CodeStyle {
  indentation: 'spaces' | 'tabs';
  indentSize: number;
  quotes: 'single' | 'double';
  semicolons: boolean;
  trailingCommas: boolean;
  lineLength: number;
}

export interface NamingConvention {
  type: 'variable' | 'function' | 'class' | 'constant' | 'file';
  pattern: 'camelCase' | 'PascalCase' | 'snake_case' | 'SCREAMING_SNAKE_CASE' | 'kebab-case';
  prefix?: string;
  suffix?: string;
}

export interface LintingRule {
  name: string;
  severity: 'error' | 'warning' | 'info';
  description: string;
}

export interface TestingFramework {
  name: string;
  version: string;
  testPattern: string;
  mockingLibrary?: string;
  coverageThreshold?: number;
}

export interface CodebaseMetrics {
  linesOfCode: number;
  complexity: number;
  maintainabilityIndex: number;
  testCoverage: number;
  technicalDebt: number;
}

// ===== Implementation Types =====

export interface ImplementationResult {
  files: GeneratedFile[];
  structure: ProjectStructure;
  patterns: DesignPattern[];
  practices: BestPractice[];
  optimizations: Optimization[];
  tests?: TestSuite[];
  documentation?: Documentation[];
  migrations?: Migration[];
  configurations?: Configuration[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'source' | 'test' | 'config' | 'documentation' | 'migration';
  language: string;
  dependencies?: string[];
  exports?: string[];
  description?: string;
}

export interface ProjectStructure {
  directories: Directory[];
  files: FileStructure[];
  conventions: StructuralConvention[];
}

export interface Directory {
  path: string;
  purpose: string;
  conventions?: string[];
}

export interface FileStructure {
  path: string;
  type: string;
  purpose: string;
  relationships?: string[];
}

export interface StructuralConvention {
  type: 'directory' | 'file' | 'module';
  pattern: string;
  description: string;
}

export interface BestPractice {
  category: 'security' | 'performance' | 'maintainability' | 'testing' | 'documentation';
  description: string;
  implementation: string;
  rationale: string;
}

export interface Optimization {
  type: 'performance' | 'memory' | 'network' | 'database' | 'bundle';
  description: string;
  implementation: string;
  impact: 'low' | 'medium' | 'high';
  metrics?: Record<string, number>;
}

// ===== Quality Assurance Types =====

export interface QualityAssuranceResult {
  overallScore: number;
  codeQuality: CodeQualityMetrics;
  security: SecurityAnalysis;
  performance: PerformanceAnalysis;
  maintainability: MaintainabilityAnalysis;
  testCoverage: TestCoverageAnalysis;
  needsOptimization: boolean;
  optimizationSuggestions?: OptimizationSuggestion[];
  issues: QualityIssue[];
}

export interface CodeQualityMetrics {
  complexity: number;
  duplication: number;
  maintainabilityIndex: number;
  technicalDebt: number;
  codeSmells: CodeSmell[];
}

export interface CodeSmell {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: string;
  suggestion: string;
}

export interface SecurityAnalysis {
  vulnerabilities: SecurityVulnerability[];
  score: number;
  recommendations: SecurityRecommendation[];
}

export interface SecurityVulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: string;
  cwe?: string;
  fix: string;
}

export interface SecurityRecommendation {
  category: string;
  description: string;
  implementation: string;
  priority: 'low' | 'medium' | 'high';
}

export interface PerformanceAnalysis {
  bottlenecks: PerformanceBottleneck[];
  score: number;
  optimizations: PerformanceOptimization[];
}

export interface PerformanceBottleneck {
  type: 'cpu' | 'memory' | 'io' | 'network' | 'database';
  description: string;
  location: string;
  impact: 'low' | 'medium' | 'high';
  solution: string;
}

export interface PerformanceOptimization {
  type: string;
  description: string;
  implementation: string;
  expectedImprovement: string;
}

export interface MaintainabilityAnalysis {
  score: number;
  factors: MaintainabilityFactor[];
  improvements: MaintainabilityImprovement[];
}

export interface MaintainabilityFactor {
  name: string;
  score: number;
  description: string;
  impact: 'positive' | 'negative';
}

export interface MaintainabilityImprovement {
  description: string;
  implementation: string;
  impact: 'low' | 'medium' | 'high';
}

export interface TestCoverageAnalysis {
  overall: number;
  byType: Record<string, number>;
  uncoveredAreas: UncoveredArea[];
  recommendations: TestingRecommendation[];
}

export interface UncoveredArea {
  file: string;
  lines: number[];
  functions: string[];
  importance: 'low' | 'medium' | 'high';
}

export interface TestingRecommendation {
  type: 'unit' | 'integration' | 'e2e' | 'performance';
  description: string;
  priority: 'low' | 'medium' | 'high';
}

export interface OptimizationSuggestion {
  category: string;
  description: string;
  implementation: string;
  priority: 'low' | 'medium' | 'high';
  estimatedImpact: string;
}

export interface QualityIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  description: string;
  location: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  fix?: string;
}

// ===== Testing Types =====

export interface TestSuite {
  name: string;
  type: 'unit' | 'integration' | 'e2e' | 'performance' | 'security';
  files: GeneratedFile[];
  coverage: TestCoverage;
  framework: string;
}

export interface TestCoverage {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
}

// ===== Documentation Types =====

export interface Documentation {
  type: 'api' | 'user' | 'developer' | 'deployment' | 'architecture';
  title: string;
  content: string;
  format: 'markdown' | 'html' | 'pdf' | 'json';
  sections: DocumentationSection[];
}

export interface DocumentationSection {
  title: string;
  content: string;
  subsections?: DocumentationSection[];
}

// ===== Migration Types =====

export interface Migration {
  type: 'database' | 'config' | 'dependency' | 'structure';
  version: string;
  description: string;
  up: string;
  down: string;
  dependencies?: string[];
}

// ===== Configuration Types =====

export interface Configuration {
  type: 'environment' | 'build' | 'deployment' | 'testing' | 'linting';
  name: string;
  content: string;
  format: 'json' | 'yaml' | 'toml' | 'ini' | 'js' | 'ts';
  description: string;
}

// ===== PR and Git Types =====

export interface PRCreationResult {
  prUrl: string;
  prNumber: number;
  branch: string;
  title: string;
  description: string;
  files: string[];
  status: 'created' | 'updated' | 'failed';
  checks?: PRCheck[];
}

export interface PRCheck {
  name: string;
  status: 'pending' | 'success' | 'failure' | 'error';
  description?: string;
  url?: string;
}

// ===== Learning and Feedback Types =====

export interface ValidationResults {
  success: boolean;
  feedback: Feedback[];
  successfulCode?: ImplementationResult;
  errors?: ValidationError[];
  metrics?: ValidationMetrics;
}

export interface Feedback {
  type: 'positive' | 'negative' | 'suggestion';
  category: string;
  description: string;
  code?: string;
  suggestion?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ValidationError {
  type: 'syntax' | 'logic' | 'performance' | 'security' | 'style';
  description: string;
  location: string;
  severity: 'error' | 'warning';
  fix?: string;
}

export interface ValidationMetrics {
  codeQuality: number;
  performance: number;
  security: number;
  maintainability: number;
  testCoverage: number;
}

export interface LearningData {
  prUrl: string;
  validationResults: ValidationResults;
  timestamp: Date;
  success: boolean;
  feedback: Feedback[];
  patterns?: ImplementationPatterns;
}

export interface ImplementationPatterns {
  codeStructure: ProjectStructure;
  designPatterns: DesignPattern[];
  bestPractices: BestPractice[];
  performanceOptimizations: Optimization[];
}

// ===== Event Types =====

export interface DevelopmentEngineEvent {
  type: 'task_started' | 'task_completed' | 'task_failed' | 'pr_created' | 'feedback_received';
  taskId: string;
  timestamp: Date;
  data: Record<string, any>;
}

// ===== Error Types =====

export interface DevelopmentEngineError extends Error {
  code: string;
  category: 'context' | 'analysis' | 'generation' | 'quality' | 'pr' | 'learning';
  details?: Record<string, any>;
}

