import { 
  ClaudeCodeConfig,
  ClaudeCodeIntegrationOptions,
  PRInfo,
  TaskContext,
  ValidationOptions,
  ValidationSession,
  ValidationResult,
  AnalysisOptions,
  AnalysisResult,
  HealthStatus,
  ClaudeCodeEvent,
  ClaudeCodeEventHandler
} from '../types/index.js';
import { createConfig } from '../config/index.js';
import { ClaudeCodeValidator } from '../validation/validator.js';
import { AgentAPIClient } from '../agentapi/client.js';
import { WSL2Manager } from '../deployment/wsl2-manager.js';

/**
 * Main Claude Code Integration class
 * Provides a unified interface for all Claude Code functionality
 */
export class ClaudeCodeIntegration {
  private config: ClaudeCodeConfig;
  private validator: ClaudeCodeValidator;
  private agentApiClient: AgentAPIClient;
  private wsl2Manager: WSL2Manager;
  private eventHandlers: Map<string, ClaudeCodeEventHandler[]> = new Map();

  constructor(options: ClaudeCodeIntegrationOptions = {}) {
    this.config = createConfig(options.config);
    
    // Initialize core components
    this.validator = new ClaudeCodeValidator(this.config);
    this.agentApiClient = new AgentAPIClient(this.config.agentapi);
    this.wsl2Manager = new WSL2Manager(this.config.deployment);

    // Set up event handlers
    if (options.eventHandlers) {
      Object.entries(options.eventHandlers).forEach(([eventType, handler]) => {
        if (handler) {
          this.addEventListener(eventType, handler);
        }
      });
    }

    // Forward events from validator
    this.setupEventForwarding();
  }

  /**
   * Validate a Pull Request using Claude Code
   */
  async validatePR(
    prInfo: PRInfo,
    taskContext: TaskContext,
    options: ValidationOptions = {}
  ): Promise<ValidationSession> {
    return this.validator.validatePR(prInfo, taskContext, options);
  }

  /**
   * Analyze code in a deployment path
   */
  async analyzeCode(
    deploymentPath: string,
    options: AnalysisOptions = {}
  ): Promise<AnalysisResult> {
    return this.agentApiClient.analyzeCode(deploymentPath, options);
  }

  /**
   * Deploy a PR to a validation environment
   */
  async deployPR(
    prUrl: string,
    branchName: string,
    options: { projectId?: string; instanceName?: string } = {}
  ) {
    return this.wsl2Manager.deployPR(prUrl, branchName, options);
  }

  /**
   * Get validation session details
   */
  async getValidationSession(sessionId: string): Promise<ValidationSession | null> {
    return this.validator.getValidationSession(sessionId);
  }

  /**
   * Cancel an ongoing validation
   */
  async cancelValidation(sessionId: string): Promise<boolean> {
    return this.validator.cancelValidation(sessionId);
  }

  /**
   * Get validation history
   */
  async getValidationHistory(limit: number = 10): Promise<ValidationResult[]> {
    return this.validator.getValidationHistory(limit);
  }

  /**
   * Get validation metrics
   */
  async getValidationMetrics(timeRange?: string) {
    return this.validator.getValidationMetrics(timeRange);
  }

  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const validatorHealth = await this.validator.healthCheck();
    const agentApiHealth = await this.agentApiClient.getHealthStatus();
    
    return {
      status: validatorHealth.status,
      version: '1.0.0',
      uptime: process.uptime(),
      services: {
        ...agentApiHealth.services,
        claudeCode: validatorHealth.status === 'healthy',
      },
      metrics: {
        ...agentApiHealth.metrics,
        ...validatorHealth.metrics,
      },
    };
  }

  /**
   * List WSL2 instances
   */
  async listInstances() {
    return this.wsl2Manager.listInstances();
  }

  /**
   * Create a new WSL2 instance
   */
  async createInstance(projectId: string, configuration = {}) {
    return this.wsl2Manager.createInstance(projectId, configuration);
  }

  /**
   * Destroy a WSL2 instance
   */
  async destroyInstance(instanceName: string): Promise<boolean> {
    return this.wsl2Manager.destroyInstance(instanceName);
  }

  /**
   * Test connection to AgentAPI
   */
  async testConnection(): Promise<boolean> {
    return this.agentApiClient.testConnection();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ClaudeCodeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.validator.updateConfig(newConfig);
    
    if (newConfig.agentapi) {
      this.agentApiClient.updateConfig(newConfig.agentapi);
    }
    
    if (newConfig.deployment) {
      this.wsl2Manager.updateConfig(newConfig.deployment);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): ClaudeCodeConfig {
    return { ...this.config };
  }

  /**
   * Event handling
   */
  addEventListener(eventType: string, handler: ClaudeCodeEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  removeEventListener(eventType: string, handler: ClaudeCodeEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private async emitEvent(event: ClaudeCodeEvent): Promise<void> {
    const handlers = this.eventHandlers.get(event.type) || [];
    
    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Error in event handler for ${event.type}:`, error);
      }
    }
  }

  private setupEventForwarding(): void {
    // Forward events from validator to integration event handlers
    const eventTypes = [
      'validation_started',
      'validation_progress', 
      'validation_completed',
      'validation_failed',
      'deployment_started',
      'deployment_completed',
      'deployment_failed'
    ];

    eventTypes.forEach(eventType => {
      this.validator.addEventListener(eventType, (event) => {
        this.emitEvent(event);
      });
    });
  }

  /**
   * Batch operations
   */
  async validateBatch(
    deployments: Array<{ path: string; options?: ValidationOptions }>
  ): Promise<ValidationResult[]> {
    return this.agentApiClient.validateBatch(deployments);
  }

  /**
   * Stream validation with real-time updates
   */
  async validateCodeStream(
    deploymentPath: string,
    validationOptions: ValidationOptions = {},
    onProgress?: (progress: { step: string; percentage: number; message: string }) => void
  ): Promise<ValidationResult> {
    return this.agentApiClient.validateCodeStream(deploymentPath, validationOptions, onProgress);
  }

  /**
   * Cleanup old instances
   */
  async cleanupOldInstances(maxAge?: number): Promise<number> {
    return this.wsl2Manager.cleanupOldInstances(maxAge);
  }

  /**
   * Get instance metrics
   */
  async getInstanceMetrics() {
    return this.wsl2Manager.getInstanceMetrics();
  }

  /**
   * Utility method to create a complete validation workflow
   */
  async runCompleteValidation(
    prInfo: PRInfo,
    taskContext: TaskContext,
    options: ValidationOptions = {}
  ): Promise<{
    session: ValidationSession;
    deployment: any;
    result?: ValidationResult;
  }> {
    // Start validation
    const session = await this.validatePR(prInfo, taskContext, options);
    
    // Deploy PR
    const deployment = await this.deployPR(
      prInfo.url,
      prInfo.branchName,
      { projectId: taskContext.taskId }
    );

    // Wait for validation to complete (in a real implementation, this would use events)
    // For now, return the session and deployment info
    return {
      session,
      deployment,
    };
  }

  /**
   * Generate a comprehensive validation report
   */
  async generateValidationReport(sessionId: string): Promise<string> {
    const session = await this.getValidationSession(sessionId);
    if (!session?.result) {
      throw new Error('Validation session not found or not completed');
    }

    // This would use the ValidationService to generate a report
    // For now, return a basic report
    return `
# Claude Code Validation Report

**Session ID:** ${sessionId}
**Overall Score:** ${session.result.overallScore}/100
**Grade:** ${session.result.grade}
**Duration:** ${session.result.duration}ms

## Summary
${session.result.strengths.join('\n')}

## Issues Found
${session.result.feedback.length} issues detected

## Recommendations
${session.result.weaknesses.join('\n')}
`;
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    // Clean up resources
    this.eventHandlers.clear();
    
    // In a real implementation, this would close connections, stop services, etc.
    console.log('Claude Code Integration disposed');
  }
}

