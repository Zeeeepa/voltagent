// AgentAPI specific types

export interface AgentAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
  requestId: string;
}

export interface AgentAPIValidationRequest {
  deployment_path: string;
  validation_options: {
    enableSecurityAnalysis?: boolean;
    enablePerformanceAnalysis?: boolean;
    codeQualityWeight?: number;
    functionalityWeight?: number;
    testingWeight?: number;
    documentationWeight?: number;
    timeout?: number;
    customRules?: any[];
  };
  timeout: number;
}

export interface AgentAPIAnalysisRequest {
  deployment_path: string;
  analysis_options: {
    includeMetrics?: boolean;
    includeComplexity?: boolean;
    includeSecurity?: boolean;
    includePerformance?: boolean;
    includeTestCoverage?: boolean;
    includeDependencies?: boolean;
  };
}

export interface AgentAPIBatchRequest {
  deployments: Array<{
    path: string;
    options?: any;
  }>;
  timeout: number;
}

export interface AgentAPIProgressUpdate {
  sessionId: string;
  step: string;
  percentage: number;
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AgentAPIHealthResponse {
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

