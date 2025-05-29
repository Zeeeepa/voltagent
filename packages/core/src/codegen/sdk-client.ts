/**
 * Codegen SDK Client
 * Core SDK integration for communicating with Codegen agents
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import NodeCache from 'node-cache';
import retry from 'retry';
import CircuitBreaker from 'circuit-breaker';
import { createHash } from 'crypto';
import {
  CodegenConfig,
  CodegenTask,
  CreateTaskRequest,
  CodegenAPIResponse,
  CodegenAPIError,
  AuthenticationInfo,
  RepositoryInfo,
  PullRequestInfo,
  CodeGenerationRequest,
  CodeAnalysisResult,
  TaskStatus
} from './types';

export class CodegenSDKClient {
  private client: AxiosInstance;
  private cache: NodeCache;
  private circuitBreaker: CircuitBreaker;
  private config: Required<CodegenConfig>;

  constructor(config: CodegenConfig) {
    // Set default configuration
    this.config = {
      orgId: config.orgId,
      token: config.token,
      baseURL: config.baseURL || 'https://codegen-sh-rest-api.modal.run',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
      rateLimit: config.rateLimit || { requests: 100, window: 60000 },
      cache: config.cache || { ttl: 300000, maxSize: 1000 }
    };

    // Initialize cache
    this.cache = new NodeCache({
      stdTTL: this.config.cache.ttl / 1000,
      maxKeys: this.config.cache.maxSize
    });

    // Initialize HTTP client
    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.token}`,
        'X-Org-ID': this.config.orgId,
        'User-Agent': 'VoltAgent-Codegen-SDK/1.0.0'
      }
    });

    // Add request/response interceptors
    this.setupInterceptors();

    // Initialize circuit breaker
    this.circuitBreaker = new CircuitBreaker(this.makeRequest.bind(this), {
      timeout: this.config.timeout,
      errorThresholdPercentage: 50,
      resetTimeout: 30000
    });
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor for logging and rate limiting
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[Codegen SDK] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('[Codegen SDK] Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling and caching
    this.client.interceptors.response.use(
      (response) => {
        console.log(`[Codegen SDK] Response ${response.status} from ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('[Codegen SDK] Response error:', error.response?.data || error.message);
        return Promise.reject(this.transformError(error));
      }
    );
  }

  /**
   * Transform axios errors to CodegenAPIError
   */
  private transformError(error: any): CodegenAPIError {
    if (error.response) {
      return {
        code: error.response.data?.code || 'HTTP_ERROR',
        message: error.response.data?.message || error.message,
        status: error.response.status,
        details: error.response.data?.details,
        requestId: error.response.headers['x-request-id']
      };
    }

    return {
      code: 'NETWORK_ERROR',
      message: error.message,
      status: 0,
      details: { originalError: error }
    };
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(config: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    const operation = retry.operation({
      retries: this.config.retries,
      factor: 2,
      minTimeout: 1000,
      maxTimeout: 10000
    });

    return new Promise((resolve, reject) => {
      operation.attempt(async (currentAttempt) => {
        try {
          const response = await this.client.request<T>(config);
          resolve(response);
        } catch (error) {
          if (operation.retry(error as Error)) {
            console.log(`[Codegen SDK] Retry attempt ${currentAttempt} for ${config.url}`);
            return;
          }
          reject(operation.mainError());
        }
      });
    });
  }

  /**
   * Get cached result or execute function
   */
  private async getCached<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = this.cache.get<T>(key);
    if (cached) {
      return cached;
    }

    const result = await fn();
    this.cache.set(key, result, ttl ? ttl / 1000 : undefined);
    return result;
  }

  /**
   * Generate cache key for request
   */
  private getCacheKey(method: string, url: string, data?: any): string {
    const hash = createHash('md5');
    hash.update(`${method}:${url}:${JSON.stringify(data || {})}`);
    return hash.digest('hex');
  }

  /**
   * Validate authentication and get organization info
   */
  async validateAuth(): Promise<AuthenticationInfo> {
    const cacheKey = `auth:${this.config.orgId}`;
    
    return this.getCached(cacheKey, async () => {
      const response = await this.circuitBreaker.fire({
        method: 'GET',
        url: '/auth/validate'
      });

      return response.data;
    }, 60000); // Cache for 1 minute
  }

  /**
   * Create a new agent task
   */
  async createTask(request: CreateTaskRequest): Promise<CodegenTask> {
    const response = await this.circuitBreaker.fire({
      method: 'POST',
      url: '/agents/tasks',
      data: {
        prompt: request.prompt,
        org_id: this.config.orgId,
        repository: request.repository,
        parameters: request.parameters
      }
    });

    return this.transformTask(response.data);
  }

  /**
   * Get task status and result
   */
  async getTask(taskId: string): Promise<CodegenTask> {
    const response = await this.circuitBreaker.fire({
      method: 'GET',
      url: `/agents/tasks/${taskId}`
    });

    return this.transformTask(response.data);
  }

  /**
   * Refresh task status (polling)
   */
  async refreshTask(taskId: string): Promise<CodegenTask> {
    // Don't cache refresh requests
    const response = await this.client.get(`/agents/tasks/${taskId}`);
    return this.transformTask(response.data);
  }

  /**
   * Cancel a running task
   */
  async cancelTask(taskId: string): Promise<void> {
    await this.circuitBreaker.fire({
      method: 'POST',
      url: `/agents/tasks/${taskId}/cancel`
    });
  }

  /**
   * List repositories accessible to the organization
   */
  async listRepositories(): Promise<RepositoryInfo[]> {
    const cacheKey = `repos:${this.config.orgId}`;
    
    return this.getCached(cacheKey, async () => {
      const response = await this.circuitBreaker.fire({
        method: 'GET',
        url: '/repositories'
      });

      return response.data.repositories || [];
    }, 300000); // Cache for 5 minutes
  }

  /**
   * Get repository information
   */
  async getRepository(repoId: string): Promise<RepositoryInfo> {
    const cacheKey = `repo:${repoId}`;
    
    return this.getCached(cacheKey, async () => {
      const response = await this.circuitBreaker.fire({
        method: 'GET',
        url: `/repositories/${repoId}`
      });

      return response.data;
    }, 300000); // Cache for 5 minutes
  }

  /**
   * Create a pull request
   */
  async createPullRequest(repoId: string, data: {
    title: string;
    description: string;
    sourceBranch: string;
    targetBranch: string;
    files: Array<{ path: string; content: string; action: 'create' | 'modify' | 'delete' }>;
  }): Promise<PullRequestInfo> {
    const response = await this.circuitBreaker.fire({
      method: 'POST',
      url: `/repositories/${repoId}/pull-requests`,
      data
    });

    return response.data;
  }

  /**
   * Generate code based on natural language prompt
   */
  async generateCode(request: CodeGenerationRequest): Promise<{
    code: string;
    explanation: string;
    suggestions: string[];
  }> {
    const response = await this.circuitBreaker.fire({
      method: 'POST',
      url: '/code/generate',
      data: {
        prompt: request.prompt,
        context: request.context,
        parameters: request.parameters
      }
    });

    return response.data;
  }

  /**
   * Analyze code quality and provide suggestions
   */
  async analyzeCode(code: string, language: string): Promise<CodeAnalysisResult> {
    const cacheKey = this.getCacheKey('POST', '/code/analyze', { code, language });
    
    return this.getCached(cacheKey, async () => {
      const response = await this.circuitBreaker.fire({
        method: 'POST',
        url: '/code/analyze',
        data: { code, language }
      });

      return response.data;
    }, 600000); // Cache for 10 minutes
  }

  /**
   * Wait for task completion with polling
   */
  async waitForTask(taskId: string, options: {
    pollInterval?: number;
    timeout?: number;
    onProgress?: (task: CodegenTask) => void;
  } = {}): Promise<CodegenTask> {
    const pollInterval = options.pollInterval || 5000; // 5 seconds
    const timeout = options.timeout || 300000; // 5 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const task = await this.refreshTask(taskId);
      
      if (options.onProgress) {
        options.onProgress(task);
      }

      if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
        return task;
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`Task ${taskId} timed out after ${timeout}ms`);
  }

  /**
   * Transform API task response to CodegenTask
   */
  private transformTask(data: any): CodegenTask {
    return {
      id: data.id || data.task_id,
      status: data.status as TaskStatus,
      result: data.result,
      error: data.error,
      createdAt: data.created_at || data.createdAt,
      completedAt: data.completed_at || data.completedAt,
      prompt: data.prompt,
      metadata: data.metadata
    };
  }

  /**
   * Get client health status
   */
  getHealthStatus(): {
    circuitBreakerState: string;
    cacheStats: { keys: number; hits: number; misses: number };
    config: Omit<CodegenConfig, 'token'>;
  } {
    return {
      circuitBreakerState: this.circuitBreaker.state,
      cacheStats: this.cache.getStats(),
      config: {
        orgId: this.config.orgId,
        baseURL: this.config.baseURL,
        timeout: this.config.timeout,
        retries: this.config.retries,
        rateLimit: this.config.rateLimit,
        cache: this.config.cache
      }
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.flushAll();
  }

  /**
   * Close client and cleanup resources
   */
  close(): void {
    this.cache.close();
    this.circuitBreaker.destroy();
  }
}

