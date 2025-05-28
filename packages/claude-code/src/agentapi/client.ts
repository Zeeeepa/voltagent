import { 
  ValidationOptions, 
  ValidationResult, 
  AnalysisOptions, 
  AnalysisResult, 
  HealthStatus,
  ClaudeCodeConfig 
} from '../types/index.js';
import { AgentAPIError, AgentAPITimeoutError, AgentAPIConnectionError } from './errors.js';

export class AgentAPIClient {
  private baseUrl: string;
  private apiKey?: string;
  private timeout: number;

  constructor(config: ClaudeCodeConfig['agentapi']) {
    this.baseUrl = config.url;
    this.apiKey = config.apiKey;
    this.timeout = config.timeout;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'VoltAgent-ClaudeCode/1.0',
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
        throw new AgentAPIError(
          `Request failed: ${response.status} ${response.statusText}`,
          response.status,
          errorText
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AgentAPITimeoutError(`Request timeout after ${this.timeout}ms`);
      }
      
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new AgentAPIConnectionError(`Failed to connect to AgentAPI at ${this.baseUrl}`);
      }
      
      throw error;
    }
  }

  async validateCode(
    deploymentPath: string,
    validationOptions: ValidationOptions = {}
  ): Promise<ValidationResult> {
    try {
      const result = await this.makeRequest<ValidationResult>(
        '/api/v1/claude-code/validate',
        {
          method: 'POST',
          body: JSON.stringify({
            deployment_path: deploymentPath,
            validation_options: validationOptions,
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
          agentapi: false,
          database: false,
          wsl2: false,
        },
        metrics: {
          totalSessions: 0,
          successfulSessions: 0,
          failedSessions: 0,
          averageValidationTime: 0,
          averageScore: 0,
          activeInstances: 0,
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

  async testConnection(): Promise<boolean> {
    try {
      const health = await this.getHealthStatus();
      return health.status === 'healthy';
    } catch (error) {
      return false;
    }
  }

  updateConfig(newConfig: Partial<ClaudeCodeConfig['agentapi']>): void {
    if (newConfig.url) {
      this.baseUrl = newConfig.url;
    }
    if (newConfig.apiKey) {
      this.apiKey = newConfig.apiKey;
    }
    if (newConfig.timeout) {
      this.timeout = newConfig.timeout;
    }
  }

  // Streaming validation with WebSocket support
  async validateCodeStream(
    deploymentPath: string,
    validationOptions: ValidationOptions = {},
    onProgress?: (progress: { step: string; percentage: number; message: string }) => void
  ): Promise<ValidationResult> {
    // Implementation would use WebSocket for real-time updates
    // For now, fall back to regular validation
    return this.validateCode(deploymentPath, validationOptions);
  }

  // Batch validation for multiple files/projects
  async validateBatch(
    deployments: Array<{ path: string; options?: ValidationOptions }>
  ): Promise<ValidationResult[]> {
    try {
      const result = await this.makeRequest<ValidationResult[]>(
        '/api/v1/claude-code/validate/batch',
        {
          method: 'POST',
          body: JSON.stringify({
            deployments,
            timeout: this.timeout,
          }),
        }
      );
      return result;
    } catch (error) {
      console.error('AgentAPI batch validation failed:', error);
      throw error;
    }
  }

  // Get validation metrics and statistics
  async getValidationMetrics(timeRange?: string): Promise<{
    totalValidations: number;
    successRate: number;
    averageScore: number;
    averageDuration: number;
    topIssues: Array<{ type: string; count: number }>;
  }> {
    try {
      const params = timeRange ? `?timeRange=${timeRange}` : '';
      const result = await this.makeRequest<{
        totalValidations: number;
        successRate: number;
        averageScore: number;
        averageDuration: number;
        topIssues: Array<{ type: string; count: number }>;
      }>(`/api/v1/claude-code/metrics${params}`);
      return result;
    } catch (error) {
      console.error('AgentAPI metrics failed:', error);
      throw error;
    }
  }
}

