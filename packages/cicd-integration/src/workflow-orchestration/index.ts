import { EventEmitter } from 'events';
import { 
  WorkflowDefinition, 
  WorkflowExecution, 
  WorkflowStep, 
  WorkflowStepExecution, 
  WorkflowStepType, 
  WorkflowExecutionStatus, 
  PipelineContext, 
  Task, 
  TaskStatus,
  NaturalLanguageRequirement 
} from '../types';
import { NLPRequirementsEngine } from '../nlp-engine';
import { PostgreSQLTaskStorage } from '../task-storage';
import { CodegenIntegration } from '../codegen-integration';
import { ClaudeCodeValidation } from '../code-validation';

export interface WorkflowOrchestratorConfig {
  maxConcurrentWorkflows: number;
  stepTimeout: number;
  retryAttempts: number;
  enableMetrics: boolean;
  enableNotifications: boolean;
  storage: PostgreSQLTaskStorage;
  nlpEngine: NLPRequirementsEngine;
  codegenIntegration: CodegenIntegration;
  codeValidation: ClaudeCodeValidation;
}

export interface WorkflowContext {
  execution: WorkflowExecution;
  pipeline: PipelineContext;
  variables: Map<string, any>;
  artifacts: Map<string, any>;
}

export interface StepResult {
  success: boolean;
  output?: any;
  error?: string;
  artifacts?: any[];
}

export class WorkflowOrchestrator extends EventEmitter {
  private config: WorkflowOrchestratorConfig;
  private workflows: Map<string, WorkflowDefinition>;
  private executions: Map<string, WorkflowContext>;
  private stepHandlers: Map<WorkflowStepType, StepHandler>;

  constructor(config: WorkflowOrchestratorConfig) {
    super();
    this.config = config;
    this.workflows = new Map();
    this.executions = new Map();
    this.stepHandlers = new Map();
    
    this.initializeStepHandlers();
    this.initializeDefaultWorkflows();
  }

  /**
   * Register a workflow definition
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
    this.emit('workflow-registered', workflow);
  }

  /**
   * Start a workflow execution
   */
  async startWorkflow(
    workflowId: string, 
    pipelineId: string, 
    initialContext: Record<string, any> = {}
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const pipeline = await this.config.storage.getPipeline(pipelineId);
    if (!pipeline) {
      throw new Error(`Pipeline ${pipelineId} not found`);
    }

    const execution: WorkflowExecution = {
      id: this.generateExecutionId(),
      workflowId,
      pipelineId,
      status: WorkflowExecutionStatus.PENDING,
      startedAt: new Date(),
      steps: workflow.steps.map(step => ({
        stepId: step.id,
        status: WorkflowExecutionStatus.PENDING,
        startedAt: new Date(),
        retryCount: 0
      })),
      context: initialContext
    };

    const workflowContext: WorkflowContext = {
      execution,
      pipeline,
      variables: new Map(Object.entries(initialContext)),
      artifacts: new Map()
    };

    this.executions.set(execution.id, workflowContext);
    
    // Start execution asynchronously
    this.executeWorkflow(workflowContext).catch(error => {
      this.handleWorkflowError(execution.id, error);
    });

    this.emit('workflow-started', execution);
    return execution;
  }

  /**
   * Get workflow execution status
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    const context = this.executions.get(executionId);
    return context?.execution;
  }

  /**
   * Cancel a workflow execution
   */
  async cancelWorkflow(executionId: string): Promise<void> {
    const context = this.executions.get(executionId);
    if (!context) {
      throw new Error(`Execution ${executionId} not found`);
    }

    context.execution.status = WorkflowExecutionStatus.CANCELLED;
    context.execution.completedAt = new Date();
    
    this.emit('workflow-cancelled', context.execution);
  }

  /**
   * Execute the complete CI/CD pipeline workflow
   */
  async executeCICDPipeline(requirements: NaturalLanguageRequirement): Promise<WorkflowExecution> {
    // Create pipeline context
    const pipeline: PipelineContext = {
      id: this.generatePipelineId(),
      userId: 'system', // This would come from authentication
      projectId: 'default', // This would come from context
      requirements,
      status: 'pending' as any,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {}
    };

    // Save pipeline
    await this.config.storage.createPipeline(pipeline);

    // Start the CI/CD workflow
    return this.startWorkflow('cicd-pipeline', pipeline.id, {
      requirements,
      pipeline
    });
  }

  private async executeWorkflow(context: WorkflowContext): Promise<void> {
    const { execution } = context;
    const workflow = this.workflows.get(execution.workflowId)!;

    try {
      execution.status = WorkflowExecutionStatus.RUNNING;
      this.emit('workflow-running', execution);

      // Execute steps based on dependencies
      const executionOrder = this.calculateExecutionOrder(workflow.steps);
      
      for (const stepGroup of executionOrder) {
        // Execute steps in parallel within each group
        const stepPromises = stepGroup.map(step => 
          this.executeStep(context, step)
        );
        
        await Promise.all(stepPromises);
        
        // Check if any step failed
        const failedSteps = stepGroup.filter(step => {
          const stepExecution = execution.steps.find(s => s.stepId === step.id);
          return stepExecution?.status === WorkflowExecutionStatus.FAILED;
        });
        
        if (failedSteps.length > 0) {
          throw new Error(`Steps failed: ${failedSteps.map(s => s.id).join(', ')}`);
        }
      }

      execution.status = WorkflowExecutionStatus.COMPLETED;
      execution.completedAt = new Date();
      
      this.emit('workflow-completed', execution);
    } catch (error) {
      execution.status = WorkflowExecutionStatus.FAILED;
      execution.completedAt = new Date();
      execution.error = error.message;
      
      this.emit('workflow-failed', execution, error);
    }
  }

  private async executeStep(context: WorkflowContext, step: WorkflowStep): Promise<void> {
    const { execution } = context;
    const stepExecution = execution.steps.find(s => s.stepId === step.id)!;
    
    try {
      stepExecution.status = WorkflowExecutionStatus.RUNNING;
      stepExecution.startedAt = new Date();
      
      this.emit('step-started', execution, step);

      // Get step handler
      const handler = this.stepHandlers.get(step.type);
      if (!handler) {
        throw new Error(`No handler found for step type: ${step.type}`);
      }

      // Execute step with timeout
      const result = await this.executeWithTimeout(
        () => handler.execute(context, step),
        step.timeout || this.config.stepTimeout
      );

      if (result.success) {
        stepExecution.status = WorkflowExecutionStatus.COMPLETED;
        stepExecution.output = result.output;
        stepExecution.completedAt = new Date();
        
        // Store artifacts
        if (result.artifacts) {
          result.artifacts.forEach((artifact, index) => {
            context.artifacts.set(`${step.id}_artifact_${index}`, artifact);
          });
        }
        
        this.emit('step-completed', execution, step, result);
      } else {
        throw new Error(result.error || 'Step execution failed');
      }
    } catch (error) {
      stepExecution.status = WorkflowExecutionStatus.FAILED;
      stepExecution.error = error.message;
      stepExecution.completedAt = new Date();
      
      // Retry logic
      if (stepExecution.retryCount < (step.retries || this.config.retryAttempts)) {
        stepExecution.retryCount++;
        stepExecution.status = WorkflowExecutionStatus.PENDING;
        
        // Wait before retry
        await this.delay(1000 * Math.pow(2, stepExecution.retryCount));
        
        // Retry the step
        return this.executeStep(context, step);
      }
      
      this.emit('step-failed', execution, step, error);
      throw error;
    }
  }

  private calculateExecutionOrder(steps: WorkflowStep[]): WorkflowStep[][] {
    const stepMap = new Map(steps.map(step => [step.id, step]));
    const visited = new Set<string>();
    const order: WorkflowStep[][] = [];
    
    while (visited.size < steps.length) {
      const currentLevel: WorkflowStep[] = [];
      
      for (const step of steps) {
        if (visited.has(step.id)) continue;
        
        // Check if all dependencies are satisfied
        const dependenciesSatisfied = step.dependencies.every(dep => visited.has(dep));
        
        if (dependenciesSatisfied) {
          currentLevel.push(step);
        }
      }
      
      if (currentLevel.length === 0) {
        throw new Error('Circular dependency detected in workflow steps');
      }
      
      currentLevel.forEach(step => visited.add(step.id));
      order.push(currentLevel);
    }
    
    return order;
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>, 
    timeoutMs: number
  ): Promise<T> {
    return Promise.race([
      operation(),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
      )
    ]);
  }

  private handleWorkflowError(executionId: string, error: Error): void {
    const context = this.executions.get(executionId);
    if (context) {
      context.execution.status = WorkflowExecutionStatus.FAILED;
      context.execution.error = error.message;
      context.execution.completedAt = new Date();
    }
    
    this.emit('workflow-error', executionId, error);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePipelineId(): string {
    return `pipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeStepHandlers(): void {
    this.stepHandlers.set(WorkflowStepType.NLP_ANALYSIS, new NLPAnalysisHandler(this.config));
    this.stepHandlers.set(WorkflowStepType.TASK_DECOMPOSITION, new TaskDecompositionHandler(this.config));
    this.stepHandlers.set(WorkflowStepType.CODE_GENERATION, new CodeGenerationHandler(this.config));
    this.stepHandlers.set(WorkflowStepType.CODE_VALIDATION, new CodeValidationHandler(this.config));
    this.stepHandlers.set(WorkflowStepType.TESTING, new TestingHandler(this.config));
    this.stepHandlers.set(WorkflowStepType.DEPLOYMENT, new DeploymentHandler(this.config));
    this.stepHandlers.set(WorkflowStepType.NOTIFICATION, new NotificationHandler(this.config));
  }

  private initializeDefaultWorkflows(): void {
    // Define the main CI/CD pipeline workflow
    const cicdWorkflow: WorkflowDefinition = {
      id: 'cicd-pipeline',
      name: 'CI/CD Pipeline',
      version: '1.0.0',
      description: 'Complete AI-driven CI/CD pipeline from requirements to deployment',
      steps: [
        {
          id: 'nlp-analysis',
          name: 'NLP Analysis',
          type: WorkflowStepType.NLP_ANALYSIS,
          dependencies: [],
          configuration: {},
          timeout: 30000
        },
        {
          id: 'task-decomposition',
          name: 'Task Decomposition',
          type: WorkflowStepType.TASK_DECOMPOSITION,
          dependencies: ['nlp-analysis'],
          configuration: {},
          timeout: 60000
        },
        {
          id: 'code-generation',
          name: 'Code Generation',
          type: WorkflowStepType.CODE_GENERATION,
          dependencies: ['task-decomposition'],
          configuration: {},
          timeout: 120000
        },
        {
          id: 'code-validation',
          name: 'Code Validation',
          type: WorkflowStepType.CODE_VALIDATION,
          dependencies: ['code-generation'],
          configuration: {},
          timeout: 60000
        },
        {
          id: 'testing',
          name: 'Testing',
          type: WorkflowStepType.TESTING,
          dependencies: ['code-validation'],
          configuration: {},
          timeout: 180000
        },
        {
          id: 'deployment',
          name: 'Deployment',
          type: WorkflowStepType.DEPLOYMENT,
          dependencies: ['testing'],
          configuration: {},
          timeout: 300000
        },
        {
          id: 'notification',
          name: 'Notification',
          type: WorkflowStepType.NOTIFICATION,
          dependencies: ['deployment'],
          configuration: {},
          timeout: 10000
        }
      ],
      triggers: [],
      configuration: {
        maxConcurrency: 1,
        timeout: 900000, // 15 minutes
        retryPolicy: {
          maxRetries: 3,
          backoffStrategy: 'exponential',
          baseDelay: 1000,
          maxDelay: 30000
        },
        notifications: []
      }
    };

    this.registerWorkflow(cicdWorkflow);
  }
}

// Step handler interface and implementations
interface StepHandler {
  execute(context: WorkflowContext, step: WorkflowStep): Promise<StepResult>;
}

class NLPAnalysisHandler implements StepHandler {
  constructor(private config: WorkflowOrchestratorConfig) {}

  async execute(context: WorkflowContext, step: WorkflowStep): Promise<StepResult> {
    try {
      const requirements = context.variables.get('requirements') as NaturalLanguageRequirement;
      
      // Re-analyze requirements for additional insights
      const enhancedRequirements = await this.config.nlpEngine.processRequirement(requirements.text);
      
      context.variables.set('enhancedRequirements', enhancedRequirements);
      
      return {
        success: true,
        output: enhancedRequirements,
        artifacts: [enhancedRequirements]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

class TaskDecompositionHandler implements StepHandler {
  constructor(private config: WorkflowOrchestratorConfig) {}

  async execute(context: WorkflowContext, step: WorkflowStep): Promise<StepResult> {
    try {
      const requirements = context.variables.get('enhancedRequirements') as NaturalLanguageRequirement;
      
      // Create main task
      const mainTask: Omit<Task, 'createdAt' | 'updatedAt'> = {
        id: `task_${Date.now()}`,
        pipelineId: context.pipeline.id,
        type: 'code_generation' as any,
        title: `Implement: ${requirements.text.substring(0, 100)}`,
        description: requirements.text,
        status: TaskStatus.PENDING,
        priority: 'medium' as any,
        dependencies: [],
        artifacts: [],
        context: {
          codebase: {
            repositoryUrl: '',
            branch: 'main',
            language: 'typescript',
            framework: 'react',
            dependencies: [],
            structure: []
          },
          requirements,
          constraints: [],
          preferences: {
            codingStyle: 'typescript',
            testingFramework: 'jest',
            documentationLevel: 'standard',
            reviewLevel: 'thorough'
          }
        }
      };

      const createdTask = await this.config.storage.createTask(mainTask);
      context.variables.set('mainTask', createdTask);
      
      return {
        success: true,
        output: createdTask,
        artifacts: [createdTask]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

class CodeGenerationHandler implements StepHandler {
  constructor(private config: WorkflowOrchestratorConfig) {}

  async execute(context: WorkflowContext, step: WorkflowStep): Promise<StepResult> {
    try {
      const task = context.variables.get('mainTask') as Task;
      const requirements = context.variables.get('enhancedRequirements') as NaturalLanguageRequirement;
      
      const generationResult = await this.config.codegenIntegration.generateFromRequirements(
        requirements,
        task.context
      );
      
      context.variables.set('generatedCode', generationResult);
      
      // Update task status
      await this.config.storage.updateTask(task.id, {
        status: TaskStatus.COMPLETED
      });
      
      return {
        success: true,
        output: generationResult,
        artifacts: [generationResult]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

class CodeValidationHandler implements StepHandler {
  constructor(private config: WorkflowOrchestratorConfig) {}

  async execute(context: WorkflowContext, step: WorkflowStep): Promise<StepResult> {
    try {
      const generationResult = context.variables.get('generatedCode');
      const task = context.variables.get('mainTask') as Task;
      
      const validationRequest = {
        files: generationResult.files,
        context: task.context,
        rules: []
      };
      
      const validationResult = await this.config.codeValidation.validateCode(validationRequest);
      context.variables.set('validationResult', validationResult);
      
      return {
        success: validationResult.overall !== 'failed',
        output: validationResult,
        artifacts: [validationResult]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

class TestingHandler implements StepHandler {
  constructor(private config: WorkflowOrchestratorConfig) {}

  async execute(context: WorkflowContext, step: WorkflowStep): Promise<StepResult> {
    try {
      // Simulate test execution
      const testResults = {
        passed: true,
        coverage: 85,
        tests: {
          total: 10,
          passed: 10,
          failed: 0,
          skipped: 0
        }
      };
      
      context.variables.set('testResults', testResults);
      
      return {
        success: testResults.passed,
        output: testResults,
        artifacts: [testResults]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

class DeploymentHandler implements StepHandler {
  constructor(private config: WorkflowOrchestratorConfig) {}

  async execute(context: WorkflowContext, step: WorkflowStep): Promise<StepResult> {
    try {
      // Simulate deployment
      const deploymentResult = {
        success: true,
        environment: 'staging',
        url: 'https://staging.example.com',
        deployedAt: new Date()
      };
      
      context.variables.set('deploymentResult', deploymentResult);
      
      return {
        success: true,
        output: deploymentResult,
        artifacts: [deploymentResult]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

class NotificationHandler implements StepHandler {
  constructor(private config: WorkflowOrchestratorConfig) {}

  async execute(context: WorkflowContext, step: WorkflowStep): Promise<StepResult> {
    try {
      // Send notifications about pipeline completion
      const notification = {
        type: 'pipeline-completed',
        pipelineId: context.pipeline.id,
        executionId: context.execution.id,
        status: context.execution.status,
        sentAt: new Date()
      };
      
      // In a real implementation, this would send actual notifications
      console.log('Notification sent:', notification);
      
      return {
        success: true,
        output: notification,
        artifacts: [notification]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export { WorkflowOrchestratorConfig, WorkflowContext, StepResult };

