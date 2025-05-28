// Consolidated types for Claude Code integration

export interface ClaudeCodeConfig {
  agentapi: {
    url: string;
    apiKey?: string;
    timeout: number;
  };
  validation: {
    enableSecurityAnalysis: boolean;
    enablePerformanceAnalysis: boolean;
    codeQualityWeight: number;
    functionalityWeight: number;
    testingWeight: number;
    documentationWeight: number;
    timeout: number;
  };
  deployment: {
    strategy: 'wsl2' | 'docker' | 'local';
    wsl2: {
      distro: string;
      basePath: string;
      maxInstances: number;
      memory: string;
      processors: number;
      swap: string;
    };
    docker: {
      registry: string;
      namespace: string;
    };
  };
  monitoring: {
    enableMetrics: boolean;
    enableHealthChecks: boolean;
    metricsPort: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}

export interface PRInfo {
  url: string;
  number: number;
  branchName: string;
  repository: string;
  owner: string;
  title?: string;
  description?: string;
}

export interface TaskContext {
  taskId: string;
  title: string;
  description?: string;
  priority: number;
  metadata?: Record<string, any>;
}

export interface ValidationOptions {
  enableSecurityAnalysis?: boolean;
  enablePerformanceAnalysis?: boolean;
  codeQualityWeight?: number;
  functionalityWeight?: number;
  testingWeight?: number;
  documentationWeight?: number;
  timeout?: number;
  customRules?: ValidationRule[];
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  enabled: boolean;
}

export interface ValidationResult {
  sessionId: string;
  status: 'success' | 'failure' | 'timeout' | 'cancelled';
  overallScore: number;
  grade: string;
  scores: {
    codeQuality: number;
    functionality: number;
    testing: number;
    documentation: number;
  };
  strengths: string[];
  weaknesses: string[];
  feedback: ValidationFeedback[];
  duration: number;
  metadata: Record<string, any>;
  timestamp: string;
}

export interface ValidationFeedback {
  type: string;
  category: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
  suggestions: string[];
  codeSnippet?: string;
  fixable: boolean;
}

export interface ValidationSession {
  id: string;
  prInfo: PRInfo;
  taskContext: TaskContext;
  options: ValidationOptions;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep: string;
  estimatedTimeRemaining: number;
  startTime: string;
  endTime?: string;
  result?: ValidationResult;
  deploymentInfo?: DeploymentInfo;
}

export interface DeploymentInfo {
  instanceName: string;
  deploymentPath: string;
  status: 'deploying' | 'deployed' | 'failed' | 'destroyed';
  url?: string;
  logs: string[];
  metadata: Record<string, any>;
}

export interface AnalysisOptions {
  includeMetrics?: boolean;
  includeComplexity?: boolean;
  includeSecurity?: boolean;
  includePerformance?: boolean;
  includeTestCoverage?: boolean;
  includeDependencies?: boolean;
}

export interface AnalysisResult {
  metrics: CodeMetrics;
  security: SecurityAnalysis;
  performance: PerformanceAnalysis;
  testCoverage: TestCoverageAnalysis;
  dependencies: DependencyAnalysis;
  complexity: ComplexityAnalysis;
}

export interface CodeMetrics {
  linesOfCode: number;
  linesOfComments: number;
  linesBlank: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: number;
  duplicatedLines: number;
  duplicatedBlocks: number;
}

export interface SecurityAnalysis {
  vulnerabilities: SecurityVulnerability[];
  riskScore: number;
  securityGrade: string;
  recommendations: string[];
}

export interface SecurityVulnerability {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  filePath: string;
  lineNumber: number;
  columnNumber?: number;
  recommendation: string;
  cweId?: string;
  cvssScore?: number;
}

export interface PerformanceAnalysis {
  issues: PerformanceIssue[];
  score: number;
  grade: string;
  recommendations: string[];
}

export interface PerformanceIssue {
  id: string;
  type: string;
  description: string;
  filePath: string;
  lineNumber: number;
  columnNumber?: number;
  impact: 'low' | 'medium' | 'high';
  suggestion: string;
  estimatedImprovement?: string;
}

export interface TestCoverageAnalysis {
  percentage: number;
  linesTotal: number;
  linesCovered: number;
  linesUncovered: number;
  branchesTotal: number;
  branchesCovered: number;
  functionsTotal: number;
  functionsCovered: number;
  uncoveredLines: number[];
  missingTests: string[];
  recommendations: string[];
}

export interface DependencyAnalysis {
  total: number;
  outdated: number;
  vulnerable: number;
  dependencies: DependencyInfo[];
  recommendations: string[];
}

export interface DependencyInfo {
  name: string;
  currentVersion: string;
  latestVersion: string;
  isOutdated: boolean;
  hasVulnerabilities: boolean;
  vulnerabilities: SecurityVulnerability[];
  license: string;
  size: number;
}

export interface ComplexityAnalysis {
  averageComplexity: number;
  maxComplexity: number;
  complexFunctions: ComplexFunction[];
  recommendations: string[];
}

export interface ComplexFunction {
  name: string;
  filePath: string;
  lineNumber: number;
  complexity: number;
  recommendation: string;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version: string;
  uptime: number;
  services: {
    claudeCode: boolean;
    agentapi: boolean;
    database: boolean;
    wsl2: boolean;
  };
  metrics: {
    totalSessions: number;
    successfulSessions: number;
    failedSessions: number;
    averageValidationTime: number;
    averageScore: number;
    activeInstances: number;
  };
  error?: string;
}

export interface WSL2Instance {
  instanceName: string;
  projectId: string;
  status: 'creating' | 'running' | 'stopped' | 'destroying';
  configuration: WSL2Configuration;
  deployments: DeploymentInfo[];
  createdAt: string;
  lastUsed: string;
  resourceUsage: {
    memory: string;
    cpu: number;
    disk: string;
  };
}

export interface WSL2Configuration {
  memory: string;
  processors: number;
  swap: string;
  enableGUI: boolean;
  enableSystemd: boolean;
  customPackages: string[];
  environmentVariables: Record<string, string>;
}

export interface ClaudeCodeEvent {
  type: 'validation_started' | 'validation_progress' | 'validation_completed' | 'validation_failed' | 'deployment_started' | 'deployment_completed' | 'deployment_failed';
  sessionId: string;
  timestamp: string;
  data: any;
}

export interface ClaudeCodeEventHandler {
  (event: ClaudeCodeEvent): void | Promise<void>;
}

export interface ClaudeCodeIntegrationOptions {
  config?: Partial<ClaudeCodeConfig>;
  eventHandlers?: {
    onValidationStarted?: ClaudeCodeEventHandler;
    onValidationProgress?: ClaudeCodeEventHandler;
    onValidationCompleted?: ClaudeCodeEventHandler;
    onValidationFailed?: ClaudeCodeEventHandler;
    onDeploymentStarted?: ClaudeCodeEventHandler;
    onDeploymentCompleted?: ClaudeCodeEventHandler;
    onDeploymentFailed?: ClaudeCodeEventHandler;
  };
}

