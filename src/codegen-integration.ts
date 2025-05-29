/**
 * Codegen SDK Integration
 * 
 * Main integration module for Phase 2.2: Codegen SDK Integration
 * Provides unified interface for all Codegen SDK functionality
 */

import {
  CodegenSDKClient,
  CodegenAuthManager,
  CodegenRepositoryOps,
  CodegenPRManager,
  type CodegenConfig,
  type AuthCredentials
} from './middleware/codegen/index.js';

import {
  TaskRouter,
  DualAgentManager,
  type TaskRequest,
  type RoutingDecision,
  TaskType,
  TaskPriority,
  AgentType
} from './ai/coordination/index.js';

import {
  CodeGenerationService,
  ReviewAnalysisService,
  DebuggingAssistantService,
  type CodeGenerationOptions,
  type ReviewCriteria,
  type DebugRequest
} from './ai/services/index.js';

export interface CodegenIntegrationConfig {
  credentials: AuthCredentials;
  baseUrl?: string;
  enableLogging?: boolean;
  maxConcurrentTasks?: number;
}

export interface CodegenCapabilities {
  codeGeneration: boolean;
  codeReview: boolean;
  debugging: boolean;
  repositoryOps: boolean;
  pullRequestManagement: boolean;
  taskRouting: boolean;
  dualAgentCoordination: boolean;
}

/**
 * Main Codegen Integration Class
 * 
 * Provides unified access to all Codegen SDK functionality
 */
export class CodegenIntegration {
  private client: CodegenSDKClient;
  private authManager: CodegenAuthManager;
  private repositoryOps: CodegenRepositoryOps;
  private prManager: CodegenPRManager;
  private taskRouter: TaskRouter;
  private agentManager: DualAgentManager;
  private codeGenService: CodeGenerationService;
  private reviewService: ReviewAnalysisService;
  private debugService: DebuggingAssistantService;
  private config: CodegenIntegrationConfig;

  constructor(config: CodegenIntegrationConfig) {
    this.config = config;
    this.initializeServices();
  }

  /**
   * Initialize all services
   */
  private initializeServices(): void {
    // Initialize authentication
    this.authManager = new CodegenAuthManager();
    this.authManager.setCredentials(this.config.credentials);

    // Initialize SDK client
    this.client = new CodegenSDKClient({
      orgId: this.config.credentials.orgId,
      token: this.config.credentials.token,
      baseUrl: this.config.baseUrl
    });

    // Initialize middleware services
    this.repositoryOps = new CodegenRepositoryOps(this.client);
    this.prManager = new CodegenPRManager(this.client);

    // Initialize AI coordination
    this.taskRouter = new TaskRouter();
    this.agentManager = new DualAgentManager(this.taskRouter, this.client);

    // Initialize AI services
    this.codeGenService = new CodeGenerationService(this.client, this.taskRouter);
    this.reviewService = new ReviewAnalysisService(this.client);
    this.debugService = new DebuggingAssistantService(this.client);

    if (this.config.enableLogging) {
      console.log('Codegen Integration initialized successfully');
    }
  }

  /**
   * Validate authentication and connectivity
   */
  async validateConnection(): Promise<boolean> {
    try {
      const validation = await this.authManager.validateCredentials(this.config.baseUrl);
      return validation.valid;
    } catch (error) {
      if (this.config.enableLogging) {
        console.error('Codegen connection validation failed:', error);
      }
      return false;
    }
  }

  /**
   * Get current capabilities
   */
  getCapabilities(): CodegenCapabilities {
    return {
      codeGeneration: true,
      codeReview: true,
      debugging: true,
      repositoryOps: true,
      pullRequestManagement: true,
      taskRouting: true,
      dualAgentCoordination: true
    };
  }

  /**
   * Submit a high-level task for processing
   */
  async submitTask(
    description: string,
    type: TaskType,
    priority: TaskPriority = TaskPriority.MEDIUM,
    context?: any
  ): Promise<string> {
    const task: TaskRequest = {
      id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      description,
      priority,
      context,
      metadata: {
        submittedAt: new Date().toISOString(),
        source: 'codegen-integration'
      }
    };

    return this.agentManager.submitTask(task);
  }

  /**
   * Generate code using AI
   */
  async generateCode(
    description: string,
    options?: CodeGenerationOptions,
    context?: any
  ) {
    return this.codeGenService.generateCode(description, options, context);
  }

  /**
   * Review code for quality and issues
   */
  async reviewCode(
    filePath: string,
    criteria?: ReviewCriteria,
    context?: any
  ) {
    return this.reviewService.reviewCode(filePath, criteria, context);
  }

  /**
   * Debug errors and provide solutions
   */
  async debugError(request: DebugRequest) {
    return this.debugService.debugError(request);
  }

  /**
   * Create a new branch
   */
  async createBranch(repoUrl: string, branchName: string, baseBranch: string = 'main') {
    return this.repositoryOps.createBranch({
      name: branchName,
      baseBranch,
      repoUrl
    });
  }

  /**
   * Create a pull request
   */
  async createPullRequest(
    repoUrl: string,
    title: string,
    description: string,
    headBranch: string,
    baseBranch: string = 'main'
  ) {
    return this.prManager.createPullRequest(repoUrl, headBranch, baseBranch, {
      title,
      description
    });
  }

  /**
   * Get agent status and metrics
   */
  getAgentStatus() {
    return {
      agents: this.agentManager.getAgentStatus(),
      metrics: this.agentManager.getMetrics(),
      routingStats: this.taskRouter.getRoutingStats()
    };
  }

  /**
   * Update agent health
   */
  updateAgentHealth(agentType: AgentType, status: any) {
    this.agentManager.updateAgentHealth(agentType, status);
  }

  /**
   * Shutdown integration
   */
  async shutdown(): Promise<void> {
    if (this.config.enableLogging) {
      console.log('Shutting down Codegen Integration...');
    }

    await this.agentManager.shutdown();
    this.authManager.clearCredentials();

    if (this.config.enableLogging) {
      console.log('Codegen Integration shutdown complete');
    }
  }

  // Getters for direct access to services
  get sdk() { return this.client; }
  get auth() { return this.authManager; }
  get repository() { return this.repositoryOps; }
  get pullRequests() { return this.prManager; }
  get router() { return this.taskRouter; }
  get agents() { return this.agentManager; }
  get codeGeneration() { return this.codeGenService; }
  get codeReview() { return this.reviewService; }
  get debugging() { return this.debugService; }
}

/**
 * Factory function to create Codegen Integration instance
 */
export function createCodegenIntegration(config: CodegenIntegrationConfig): CodegenIntegration {
  return new CodegenIntegration(config);
}

/**
 * Factory function to create integration from environment variables
 */
export function createCodegenIntegrationFromEnv(
  overrides: Partial<CodegenIntegrationConfig> = {}
): CodegenIntegration {
  const authManager = new CodegenAuthManager();
  const credentials = authManager.loadFromEnvironment();

  const config: CodegenIntegrationConfig = {
    credentials,
    enableLogging: process.env.NODE_ENV !== 'production',
    maxConcurrentTasks: 5,
    ...overrides
  };

  return new CodegenIntegration(config);
}

// Re-export all types and enums for convenience
export * from './middleware/codegen/index.js';
export * from './ai/coordination/index.js';
export * from './ai/services/index.js';

