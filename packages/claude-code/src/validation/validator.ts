import { 
  PRInfo, 
  TaskContext, 
  ValidationOptions, 
  ValidationSession, 
  ValidationResult,
  ClaudeCodeConfig,
  ClaudeCodeEvent,
  ClaudeCodeEventHandler
} from '../types/index.js';
import { AgentAPIClient } from '../agentapi/client.js';
import { WSL2Manager } from '../deployment/wsl2-manager.js';
import { ValidationService } from './service.js';
import { v4 as uuidv4 } from 'uuid';

export class ClaudeCodeValidator {
  private agentApiClient: AgentAPIClient;
  private wsl2Manager: WSL2Manager;
  private validationService: ValidationService;
  private config: ClaudeCodeConfig;
  private eventHandlers: Map<string, ClaudeCodeEventHandler[]> = new Map();

  constructor(config: ClaudeCodeConfig) {
    this.config = config;
    this.agentApiClient = new AgentAPIClient(config.agentapi);
    this.wsl2Manager = new WSL2Manager(config.deployment);
    this.validationService = new ValidationService(config.validation);
  }

  async validatePR(
    prInfo: PRInfo,
    taskContext: TaskContext,
    options: ValidationOptions = {}
  ): Promise<ValidationSession> {
    const sessionId = uuidv4();
    const session: ValidationSession = {
      id: sessionId,
      prInfo,
      taskContext,
      options: { ...this.config.validation, ...options },
      status: 'pending',
      progress: 0,
      currentStep: 'Initializing validation',
      estimatedTimeRemaining: this.config.validation.timeout,
      startTime: new Date().toISOString(),
    };

    // Emit validation started event
    await this.emitEvent({
      type: 'validation_started',
      sessionId,
      timestamp: new Date().toISOString(),
      data: { prInfo, taskContext, options },
    });

    // Start validation process asynchronously
    this.runValidation(session).catch(error => {
      console.error('Validation failed:', error);
      session.status = 'failed';
      this.emitEvent({
        type: 'validation_failed',
        sessionId,
        timestamp: new Date().toISOString(),
        data: { error: error.message },
      });
    });

    return session;
  }

  private async runValidation(session: ValidationSession): Promise<void> {
    try {
      session.status = 'running';
      session.currentStep = 'Deploying PR to validation environment';
      session.progress = 10;

      // Deploy PR to WSL2 instance
      const deploymentInfo = await this.wsl2Manager.deployPR(
        session.prInfo.url,
        session.prInfo.branchName,
        {
          projectId: session.taskContext.taskId,
        }
      );

      session.deploymentInfo = deploymentInfo;
      session.currentStep = 'Running Claude Code validation';
      session.progress = 30;

      await this.emitEvent({
        type: 'validation_progress',
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        data: { progress: session.progress, step: session.currentStep },
      });

      // Run validation through AgentAPI
      const validationResult = await this.agentApiClient.validateCode(
        deploymentInfo.deploymentPath,
        session.options
      );

      session.currentStep = 'Processing validation results';
      session.progress = 80;

      // Process and enhance results
      const enhancedResult = await this.validationService.processResults(
        validationResult,
        session
      );

      session.result = enhancedResult;
      session.status = 'completed';
      session.progress = 100;
      session.endTime = new Date().toISOString();
      session.currentStep = 'Validation completed';

      await this.emitEvent({
        type: 'validation_completed',
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        data: { result: enhancedResult },
      });

    } catch (error) {
      session.status = 'failed';
      session.endTime = new Date().toISOString();
      
      await this.emitEvent({
        type: 'validation_failed',
        sessionId: session.id,
        timestamp: new Date().toISOString(),
        data: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      
      throw error;
    }
  }

  async getValidationSession(sessionId: string): Promise<ValidationSession | null> {
    // In a real implementation, this would fetch from a database
    // For now, return null as sessions are managed in memory
    return null;
  }

  async cancelValidation(sessionId: string): Promise<boolean> {
    try {
      const cancelled = await this.agentApiClient.cancelValidation(sessionId);
      
      if (cancelled) {
        await this.emitEvent({
          type: 'validation_failed',
          sessionId,
          timestamp: new Date().toISOString(),
          data: { error: 'Validation cancelled by user' },
        });
      }
      
      return cancelled;
    } catch (error) {
      console.error('Failed to cancel validation:', error);
      return false;
    }
  }

  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    components: Record<string, boolean>;
    metrics: Record<string, number>;
  }> {
    const agentApiHealth = await this.agentApiClient.testConnection();
    const wsl2Health = await this.wsl2Manager.healthCheck();
    
    const components = {
      agentapi: agentApiHealth,
      wsl2: wsl2Health,
      validator: true, // Self-check
    };

    const allHealthy = Object.values(components).every(Boolean);
    const someHealthy = Object.values(components).some(Boolean);

    return {
      status: allHealthy ? 'healthy' : someHealthy ? 'degraded' : 'unhealthy',
      components,
      metrics: {
        // These would be real metrics in production
        totalSessions: 0,
        successfulSessions: 0,
        failedSessions: 0,
        averageValidationTime: 0,
        averageScore: 0,
        activeInstances: 0,
      },
    };
  }

  // Event handling
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

  // Configuration updates
  updateConfig(newConfig: Partial<ClaudeCodeConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (newConfig.agentapi) {
      this.agentApiClient.updateConfig(newConfig.agentapi);
    }
    
    if (newConfig.deployment) {
      this.wsl2Manager.updateConfig(newConfig.deployment);
    }
    
    if (newConfig.validation) {
      this.validationService.updateConfig(newConfig.validation);
    }
  }

  // Utility methods
  async getValidationHistory(limit: number = 10): Promise<ValidationResult[]> {
    return this.agentApiClient.getValidationHistory(limit);
  }

  async getValidationMetrics(timeRange?: string): Promise<any> {
    return this.agentApiClient.getValidationMetrics(timeRange);
  }
}

