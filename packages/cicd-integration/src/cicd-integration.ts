import { EventEmitter } from 'events';
import { NLPRequirementsEngine } from './nlp-engine';
import { PostgreSQLTaskStorage, TaskStorageConfig } from './task-storage';
import { CodegenIntegration, CodegenConfig } from './codegen-integration';
import { ClaudeCodeValidation, CodeValidationConfig } from './code-validation';
import { WorkflowOrchestrator, WorkflowOrchestratorConfig } from './workflow-orchestration';
import { 
  NaturalLanguageRequirement, 
  PipelineContext, 
  WorkflowExecution, 
  PipelineStatus,
  ValidationResult,
  CodeGenerationResult 
} from './types';

export interface CICDIntegrationConfig {
  // Database configuration
  database: TaskStorageConfig;
  
  // AI/ML configurations
  anthropicApiKey: string;
  
  // Component configurations
  nlp: {
    confidenceThreshold: number;
    maxTokens: number;
    enableEntityExtraction: boolean;
    enableIntentClassification: boolean;
    enableComplexityAnalysis: boolean;
  };
  
  codegen: Omit<CodegenConfig, 'anthropicApiKey'>;
  validation: Omit<CodeValidationConfig, 'anthropicApiKey'>;
  
  // Workflow configuration
  workflow: {
    maxConcurrentWorkflows: number;
    stepTimeout: number;
    retryAttempts: number;
    enableMetrics: boolean;
    enableNotifications: boolean;
  };
  
  // Integration settings
  enableCyclicalImprovement: boolean;
  enableParallelExecution: boolean;
  enableRealTimeMonitoring: boolean;
}

export interface PipelineMetrics {
  totalPipelines: number;
  activePipelines: number;
  completedPipelines: number;
  failedPipelines: number;
  averageExecutionTime: number;
  successRate: number;
  taskDecompositionAccuracy: number;
  codeQualityScore: number;
  validationSuccessRate: number;
}

export interface CICDPipelineResult {
  pipeline: PipelineContext;
  execution: WorkflowExecution;
  generatedCode?: CodeGenerationResult;
  validationResult?: ValidationResult;
  metrics: {
    totalDuration: number;
    stepDurations: Record<string, number>;
    resourceUsage: Record<string, number>;
  };
}

/**
 * Main CI/CD Integration class that orchestrates the complete pipeline
 * from natural language requirements to validated, production-ready code
 */
export class CICDIntegration extends EventEmitter {
  private config: CICDIntegrationConfig;
  private storage: PostgreSQLTaskStorage;
  private nlpEngine: NLPRequirementsEngine;
  private codegenIntegration: CodegenIntegration;
  private codeValidation: ClaudeCodeValidation;
  private workflowOrchestrator: WorkflowOrchestrator;
  private isInitialized: boolean = false;

  constructor(config: CICDIntegrationConfig) {
    super();
    this.config = config;
    this.initializeComponents();
  }

  /**
   * Initialize all components and establish connections
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize database
      await this.storage.initialize();
      
      this.isInitialized = true;
      this.emit('initialized');
      
      console.log('🚀 CI/CD Integration system initialized successfully');
    } catch (error) {
      this.emit('initialization-error', error);
      throw new Error(`Failed to initialize CI/CD Integration: ${error.message}`);
    }
  }

  /**
   * Process natural language requirements through the complete CI/CD pipeline
   */
  async processRequirements(requirementsText: string, projectContext?: any): Promise<CICDPipelineResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    
    try {
      // Step 1: Process natural language requirements
      this.emit('pipeline-started', { requirementsText, projectContext });
      
      const requirements = await this.nlpEngine.processRequirement(requirementsText);
      this.emit('requirements-processed', requirements);

      // Step 2: Execute the complete workflow
      const execution = await this.workflowOrchestrator.executeCICDPipeline(requirements);
      this.emit('workflow-started', execution);

      // Step 3: Monitor execution and collect results
      const result = await this.monitorExecution(execution.id, startTime);
      
      this.emit('pipeline-completed', result);
      return result;
      
    } catch (error) {
      this.emit('pipeline-failed', error);
      throw error;
    }
  }

  /**
   * Process requirements with cyclical improvement
   */
  async processWithImprovement(
    requirementsText: string, 
    maxIterations: number = 3,
    projectContext?: any
  ): Promise<CICDPipelineResult> {
    let currentResult: CICDPipelineResult;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      this.emit('improvement-iteration-started', { iteration, maxIterations });

      currentResult = await this.processRequirements(requirementsText, projectContext);

      // Check if improvement is needed
      if (this.shouldImprove(currentResult)) {
        const feedback = this.generateImprovementFeedback(currentResult);
        requirementsText = this.enhanceRequirements(requirementsText, feedback);
        
        this.emit('improvement-feedback-generated', { iteration, feedback });
      } else {
        this.emit('improvement-completed', { iteration, result: currentResult });
        break;
      }
    }

    return currentResult!;
  }

  /**
   * Get pipeline metrics and analytics
   */
  async getMetrics(): Promise<PipelineMetrics> {
    // Query database for metrics
    const { tasks: allTasks } = await this.storage.queryTasks({});
    const { tasks: completedTasks } = await this.storage.queryTasks({ 
      status: ['completed'] as any 
    });
    const { tasks: failedTasks } = await this.storage.queryTasks({ 
      status: ['failed'] as any 
    });

    // Calculate metrics
    const totalPipelines = allTasks.length;
    const completedPipelines = completedTasks.length;
    const failedPipelines = failedTasks.length;
    const activePipelines = totalPipelines - completedPipelines - failedPipelines;

    const averageExecutionTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, task) => {
          if (task.completedAt && task.createdAt) {
            return sum + (task.completedAt.getTime() - task.createdAt.getTime());
          }
          return sum;
        }, 0) / completedTasks.length
      : 0;

    const successRate = totalPipelines > 0 ? (completedPipelines / totalPipelines) * 100 : 0;

    return {
      totalPipelines,
      activePipelines,
      completedPipelines,
      failedPipelines,
      averageExecutionTime,
      successRate,
      taskDecompositionAccuracy: 85, // This would be calculated from actual data
      codeQualityScore: 78, // This would be calculated from validation results
      validationSuccessRate: 82 // This would be calculated from validation results
    };
  }

  /**
   * Get real-time status of all active pipelines
   */
  async getActivePipelines(): Promise<WorkflowExecution[]> {
    // This would query active executions from the orchestrator
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Cancel a running pipeline
   */
  async cancelPipeline(executionId: string): Promise<void> {
    await this.workflowOrchestrator.cancelWorkflow(executionId);
    this.emit('pipeline-cancelled', executionId);
  }

  /**
   * Shutdown the CI/CD integration system
   */
  async shutdown(): Promise<void> {
    try {
      await this.storage.close();
      this.isInitialized = false;
      this.emit('shutdown');
      
      console.log('🛑 CI/CD Integration system shutdown completed');
    } catch (error) {
      this.emit('shutdown-error', error);
      throw error;
    }
  }

  private initializeComponents(): void {
    // Initialize storage
    this.storage = new PostgreSQLTaskStorage(this.config.database);

    // Initialize NLP engine
    this.nlpEngine = new NLPRequirementsEngine(this.config.nlp);

    // Initialize codegen integration
    this.codegenIntegration = new CodegenIntegration({
      ...this.config.codegen,
      anthropicApiKey: this.config.anthropicApiKey
    });

    // Initialize code validation
    this.codeValidation = new ClaudeCodeValidation({
      ...this.config.validation,
      anthropicApiKey: this.config.anthropicApiKey
    });

    // Initialize workflow orchestrator
    const orchestratorConfig: WorkflowOrchestratorConfig = {
      ...this.config.workflow,
      storage: this.storage,
      nlpEngine: this.nlpEngine,
      codegenIntegration: this.codegenIntegration,
      codeValidation: this.codeValidation
    };

    this.workflowOrchestrator = new WorkflowOrchestrator(orchestratorConfig);

    // Set up event forwarding
    this.setupEventForwarding();
  }

  private setupEventForwarding(): void {
    // Forward important events from components
    this.workflowOrchestrator.on('workflow-started', (execution) => {
      this.emit('workflow-started', execution);
    });

    this.workflowOrchestrator.on('workflow-completed', (execution) => {
      this.emit('workflow-completed', execution);
    });

    this.workflowOrchestrator.on('workflow-failed', (execution, error) => {
      this.emit('workflow-failed', execution, error);
    });

    this.workflowOrchestrator.on('step-started', (execution, step) => {
      this.emit('step-started', execution, step);
    });

    this.workflowOrchestrator.on('step-completed', (execution, step, result) => {
      this.emit('step-completed', execution, step, result);
    });

    this.workflowOrchestrator.on('step-failed', (execution, step, error) => {
      this.emit('step-failed', execution, step, error);
    });
  }

  private async monitorExecution(executionId: string, startTime: number): Promise<CICDPipelineResult> {
    return new Promise((resolve, reject) => {
      const checkExecution = async () => {
        try {
          const execution = this.workflowOrchestrator.getExecution(executionId);
          
          if (!execution) {
            reject(new Error(`Execution ${executionId} not found`));
            return;
          }

          if (execution.status === 'completed') {
            const pipeline = await this.storage.getPipeline(execution.pipelineId);
            if (!pipeline) {
              reject(new Error(`Pipeline ${execution.pipelineId} not found`));
              return;
            }

            const totalDuration = Date.now() - startTime;
            const stepDurations: Record<string, number> = {};
            
            execution.steps.forEach(step => {
              if (step.startedAt && step.completedAt) {
                stepDurations[step.stepId] = step.completedAt.getTime() - step.startedAt.getTime();
              }
            });

            const result: CICDPipelineResult = {
              pipeline,
              execution,
              metrics: {
                totalDuration,
                stepDurations,
                resourceUsage: {} // This would be populated with actual resource metrics
              }
            };

            resolve(result);
          } else if (execution.status === 'failed') {
            reject(new Error(`Execution failed: ${execution.error}`));
          } else {
            // Still running, check again in 1 second
            setTimeout(checkExecution, 1000);
          }
        } catch (error) {
          reject(error);
        }
      };

      checkExecution();
    });
  }

  private shouldImprove(result: CICDPipelineResult): boolean {
    if (!this.config.enableCyclicalImprovement) {
      return false;
    }

    // Check if validation failed or has many issues
    if (result.validationResult) {
      const errorCount = result.validationResult.metrics.errorCount;
      const warningCount = result.validationResult.metrics.warningCount;
      
      if (errorCount > 0 || warningCount > 5) {
        return true;
      }
    }

    // Check if code quality is below threshold
    if (result.validationResult?.metrics.codeQualityScore < 70) {
      return true;
    }

    return false;
  }

  private generateImprovementFeedback(result: CICDPipelineResult): string {
    const feedback: string[] = [];

    if (result.validationResult) {
      const issues = result.validationResult.issues;
      const errorIssues = issues.filter(i => i.severity === 'error');
      const warningIssues = issues.filter(i => i.severity === 'warning');

      if (errorIssues.length > 0) {
        feedback.push(`Address ${errorIssues.length} critical errors: ${errorIssues.slice(0, 3).map(i => i.message).join(', ')}`);
      }

      if (warningIssues.length > 5) {
        feedback.push(`Improve code quality by addressing ${warningIssues.length} warnings`);
      }

      if (result.validationResult.suggestions.length > 0) {
        feedback.push(`Consider these improvements: ${result.validationResult.suggestions.slice(0, 2).map(s => s.description).join(', ')}`);
      }
    }

    return feedback.join('. ');
  }

  private enhanceRequirements(originalRequirements: string, feedback: string): string {
    return `${originalRequirements}\n\nAdditional requirements based on feedback: ${feedback}`;
  }
}

export { CICDIntegrationConfig, PipelineMetrics, CICDPipelineResult };

