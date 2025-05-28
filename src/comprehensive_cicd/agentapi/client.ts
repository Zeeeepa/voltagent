import { config } from '../config/index.js';

export interface ValidationOptions {
  enableSecurityAnalysis?: boolean;
  enablePerformanceAnalysis?: boolean;
  codeQualityWeight?: number;
  functionalityWeight?: number;
  testingWeight?: number;
  documentationWeight?: number;
  timeout?: number;
}

export interface ValidationResult {
  sessionId: string;
  status: 'success' | 'failure' | 'timeout';
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
  metadata?: Record<string, any>;
}

export interface ValidationFeedback {
  type: string;
  category: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  filePath?: string;
  lineNumber?: number;
  suggestions: string[];
}

export interface AnalysisOptions {
  includeMetrics?: boolean;
  includeComplexity?: boolean;
  includeSecurity?: boolean;
  includePerformance?: boolean;
  includeTestCoverage?: boolean;
}

export interface AnalysisResult {
  metrics: {
    linesOfCode: number;
    cyclomaticComplexity: number;
    maintainabilityIndex: number;
    technicalDebt: number;
  };
  security: {
    vulnerabilities: SecurityVulnerability[];
    riskScore: number;
  };
  performance: {
    issues: PerformanceIssue[];
    score: number;
  };
  testCoverage: {
    percentage: number;
    uncoveredLines: number[];
    missingTests: string[];
  };
}

export interface SecurityVulnerability {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  filePath: string;
  lineNumber: number;
  recommendation: string;
}

export interface PerformanceIssue {
  type: string;
  description: string;
  filePath: string;
  lineNumber: number;
  impact: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  version: string;
  uptime: number;
  services: {
    claudeCode: boolean;
    database: boolean;
    wsl2: boolean;
  };
  error?: string;
}

export class AgentAPIClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;

  constructor(options: {
    agentapiUrl?: string;
    apiKey?: string;
    timeout?: number;
  } = {}) {
    this.baseUrl = options.agentapiUrl || config.claudeCode.agentapiUrl;
    this.apiKey = options.apiKey || config.claudeCode.apiKey;
    this.timeout = options.timeout || config.validation.timeout;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `AgentAPI request failed: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`AgentAPI request timeout after ${this.timeout}ms`);
      }
      console.error('AgentAPI request failed:', error);
      throw error;
    }
  }

  async validateCode(
    deploymentPath: string,
    validationOptions: ValidationOptions = {}
  ): Promise<ValidationResult> {
    try {
      const options = {
        ...config.validation,
        ...validationOptions,
      };

      const result = await this.makeRequest<ValidationResult>(
        '/api/v1/claude-code/validate',
        {
          method: 'POST',
          body: JSON.stringify({
            deployment_path: deploymentPath,
            validation_options: options,
            timeout: this.timeout,
          }),
        }
      );

      return result;
    } catch (error) {
      console.error('AgentAPI validation failed:', error);
      throw error;
    }
  }

  async analyzeCode(
    deploymentPath: string,
    analysisOptions: AnalysisOptions = {}
  ): Promise<AnalysisResult> {
    try {
      const result = await this.makeRequest<AnalysisResult>(
        '/api/v1/claude-code/analyze',
        {
          method: 'POST',
          body: JSON.stringify({
            deployment_path: deploymentPath,
            analysis_options: analysisOptions,
          }),
        }
      );

      return result;
    } catch (error) {
      console.error('AgentAPI analysis failed:', error);
      throw error;
    }
  }

  async getHealthStatus(): Promise<HealthStatus> {
    try {
      const result = await this.makeRequest<HealthStatus>('/health');
      return result;
    } catch (error) {
      console.error('AgentAPI health check failed:', error);
      return {
        status: 'unhealthy',
        version: 'unknown',
        uptime: 0,
        services: {
          claudeCode: false,
          database: false,
          wsl2: false,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async getValidationHistory(
    limit: number = 10,
    offset: number = 0
  ): Promise<ValidationResult[]> {
    try {
      const result = await this.makeRequest<ValidationResult[]>(
        `/api/v1/claude-code/validation/history?limit=${limit}&offset=${offset}`
      );
      return result;
    } catch (error) {
      console.error('AgentAPI validation history failed:', error);
      throw error;
    }
  }

  async cancelValidation(sessionId: string): Promise<boolean> {
    try {
      await this.makeRequest(`/api/v1/claude-code/validation/${sessionId}/cancel`, {
        method: 'POST',
      });
      return true;
    } catch (error) {
      console.error('AgentAPI validation cancellation failed:', error);
      return false;
    }
  }

  async getValidationStatus(sessionId: string): Promise<{
    status: string;
    progress: number;
    currentStep: string;
    estimatedTimeRemaining: number;
  }> {
    try {
      const result = await this.makeRequest<{
        status: string;
        progress: number;
        currentStep: string;
        estimatedTimeRemaining: number;
      }>(`/api/v1/claude-code/validation/${sessionId}/status`);
      return result;
    } catch (error) {
      console.error('AgentAPI validation status failed:', error);
      throw error;
    }
  }

  // Utility method to test connection
  async testConnection(): Promise<boolean> {
    try {
      const health = await this.getHealthStatus();
      return health.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  // Method to update configuration
  updateConfig(newConfig: {
    agentapiUrl?: string;
    apiKey?: string;
    timeout?: number;
  }): void {
    if (newConfig.agentapiUrl) {
      this.baseUrl = newConfig.agentapiUrl;
    }
    if (newConfig.apiKey) {
      this.apiKey = newConfig.apiKey;
    }
    if (newConfig.timeout) {
      this.timeout = newConfig.timeout;
    }
  }
}

