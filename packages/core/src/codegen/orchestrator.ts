/**
 * Codegen Orchestrator
 * Main orchestration layer that coordinates all Codegen operations and integrates with VoltAgent
 */

import { EventEmitter } from 'events';
import { CodegenSDKClient } from './sdk-client';
import { CodegenAuthManager } from './auth-manager';
import { CodegenRepositoryOps } from './repository-ops';
import { CodegenCodeGeneration } from './code-generation';
import { 
  CodegenConfig, 
  CodegenTask, 
  CreateTaskRequest, 
  TaskStatus,
  CodeGenerationRequest,
  CodeReviewRequest
} from './types';

export interface OrchestratorConfig extends CodegenConfig {
  /** Enable event emission */
  enableEvents?: boolean;
  /** Maximum concurrent tasks */
  maxConcurrentTasks?: number;
  /** Task timeout in milliseconds */
  taskTimeout?: number;
  /** Enable automatic retry for failed tasks */
  enableAutoRetry?: boolean;
  /** Retry attempts for failed tasks */
  retryAttempts?: number;
}

export interface TaskExecutionContext {
  /** Task ID */
  taskId: string;
  /** Task status */
  status: TaskStatus;
  /** Task progress (0-100) */
  progress: number;
  /** Current operation */
  currentOperation?: string;
  /** Start time */
  startTime: Date;
  /** End time */
  endTime?: Date;
  /** Error information */
  error?: Error;
  /** Task metadata */
  metadata: Record<string, any>;
}

export interface WorkflowStep {
  /** Step ID */
  id: string;
  /** Step name */
  name: string;
  /** Step type */
  type: 'code_generation' | 'code_review' | 'repository_operation' | 'custom';
  /** Step parameters */
  parameters: Record<string, any>;
  /** Dependencies (other step IDs) */
  dependencies: string[];
  /** Whether step is optional */
  optional: boolean;
  /** Retry configuration */
  retry?: {
    attempts: number;
    delay: number;
  };
}

export interface Workflow {
  /** Workflow ID */
  id: string;
  /** Workflow name */
  name: string;
  /** Workflow description */
  description: string;
  /** Workflow steps */
  steps: WorkflowStep[];
  /** Workflow metadata */
  metadata: Record<string, any>;
}

export interface WorkflowExecution {
  /** Execution ID */
  id: string;
  /** Workflow ID */
  workflowId: string;
  /** Execution status */
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  /** Current step */
  currentStep?: string;
  /** Completed steps */
  completedSteps: string[];
  /** Failed steps */
  failedSteps: string[];
  /** Step results */
  stepResults: Map<string, any>;
  /** Start time */
  startTime: Date;
  /** End time */
  endTime?: Date;
  /** Error information */
  error?: Error;
}

export class CodegenOrchestrator extends EventEmitter {
  private client: CodegenSDKClient;
  private authManager: CodegenAuthManager;
  private repositoryOps: CodegenRepositoryOps;
  private codeGeneration: CodegenCodeGeneration;
  private config: Required<OrchestratorConfig>;
  
  private activeTasks: Map<string, TaskExecutionContext> = new Map();
  private workflows: Map<string, Workflow> = new Map();
  private workflowExecutions: Map<string, WorkflowExecution> = new Map();
  private taskQueue: CreateTaskRequest[] = [];
  private isProcessingQueue = false;

  constructor(config: OrchestratorConfig) {
    super();
    
    this.config = {
      ...config,
      enableEvents: config.enableEvents !== false,
      maxConcurrentTasks: config.maxConcurrentTasks || 5,
      taskTimeout: config.taskTimeout || 600000, // 10 minutes
      enableAutoRetry: config.enableAutoRetry !== false,
      retryAttempts: config.retryAttempts || 3
    };

    // Initialize components
    this.client = new CodegenSDKClient(config);
    this.authManager = new CodegenAuthManager();
    this.repositoryOps = new CodegenRepositoryOps(this.client);
    this.codeGeneration = new CodegenCodeGeneration(this.client);

    // Setup event handlers
    this.setupEventHandlers();
  }

  /**
   * Initialize the orchestrator
   */
  async initialize(): Promise<void> {
    try {
      // Validate authentication
      const authInfo = await this.client.validateAuth();
      if (!authInfo.valid) {
        throw new Error('Invalid authentication credentials');
      }

      this.emit('initialized', { authInfo });
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  /**
   * Create and execute a task
   */
  async executeTask(request: CreateTaskRequest): Promise<CodegenTask> {
    // Check concurrent task limit
    if (this.activeTasks.size >= this.config.maxConcurrentTasks) {
      this.taskQueue.push(request);
      this.emit('task_queued', { request, queueSize: this.taskQueue.length });
      
      // Process queue if not already processing
      if (!this.isProcessingQueue) {
        this.processTaskQueue();
      }
      
      // Return a pending task
      return {
        id: 'queued-' + Date.now(),
        status: 'pending',
        prompt: request.prompt,
        createdAt: new Date().toISOString()
      };
    }

    return this.executeTaskInternal(request);
  }

  /**
   * Internal task execution
   */
  private async executeTaskInternal(request: CreateTaskRequest): Promise<CodegenTask> {
    const task = await this.client.createTask(request);
    
    const context: TaskExecutionContext = {
      taskId: task.id,
      status: task.status,
      progress: 0,
      startTime: new Date(),
      metadata: { request }
    };

    this.activeTasks.set(task.id, context);
    this.emit('task_started', { task, context });

    // Start monitoring task progress
    this.monitorTask(task.id);

    return task;
  }

  /**
   * Monitor task progress
   */
  private async monitorTask(taskId: string): Promise<void> {
    const context = this.activeTasks.get(taskId);
    if (!context) return;

    try {
      const task = await this.client.waitForTask(taskId, {
        pollInterval: 5000,
        timeout: this.config.taskTimeout,
        onProgress: (updatedTask) => {
          this.updateTaskContext(taskId, updatedTask);
        }
      });

      context.status = task.status;
      context.endTime = new Date();
      
      if (task.status === 'completed') {
        this.emit('task_completed', { task, context });
      } else if (task.status === 'failed') {
        context.error = new Error(task.error?.message || 'Task failed');
        
        if (this.config.enableAutoRetry && !context.metadata.retryCount) {
          await this.retryTask(taskId);
        } else {
          this.emit('task_failed', { task, context });
        }
      }
    } catch (error) {
      context.error = error as Error;
      context.endTime = new Date();
      this.emit('task_error', { taskId, context, error });
    } finally {
      this.activeTasks.delete(taskId);
      this.processTaskQueue();
    }
  }

  /**
   * Update task context with progress
   */
  private updateTaskContext(taskId: string, task: CodegenTask): void {
    const context = this.activeTasks.get(taskId);
    if (!context) return;

    context.status = task.status;
    
    // Estimate progress based on status
    switch (task.status) {
      case 'pending': context.progress = 0; break;
      case 'running': context.progress = 50; break;
      case 'completed': context.progress = 100; break;
      case 'failed': context.progress = 0; break;
    }

    this.emit('task_progress', { task, context });
  }

  /**
   * Retry a failed task
   */
  private async retryTask(taskId: string): Promise<void> {
    const context = this.activeTasks.get(taskId);
    if (!context) return;

    const retryCount = (context.metadata.retryCount || 0) + 1;
    
    if (retryCount <= this.config.retryAttempts) {
      context.metadata.retryCount = retryCount;
      
      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      this.emit('task_retry', { taskId, retryCount, context });
      
      // Restart monitoring
      this.monitorTask(taskId);
    } else {
      this.emit('task_retry_exhausted', { taskId, context });
    }
  }

  /**
   * Process queued tasks
   */
  private async processTaskQueue(): Promise<void> {
    if (this.isProcessingQueue || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.taskQueue.length > 0 && this.activeTasks.size < this.config.maxConcurrentTasks) {
      const request = this.taskQueue.shift();
      if (request) {
        try {
          await this.executeTaskInternal(request);
        } catch (error) {
          this.emit('queue_error', { request, error });
        }
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<void> {
    try {
      await this.client.cancelTask(taskId);
      
      const context = this.activeTasks.get(taskId);
      if (context) {
        context.status = 'cancelled';
        context.endTime = new Date();
        this.emit('task_cancelled', { taskId, context });
        this.activeTasks.delete(taskId);
      }
    } catch (error) {
      this.emit('error', { type: 'cancel_task', taskId, error });
      throw error;
    }
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<CodegenTask> {
    return this.client.getTask(taskId);
  }

  /**
   * Generate code using the code generation service
   */
  async generateCode(request: CodeGenerationRequest): Promise<any> {
    this.emit('code_generation_started', { request });
    
    try {
      const result = await this.codeGeneration.generateCode(request);
      this.emit('code_generation_completed', { request, result });
      return result;
    } catch (error) {
      this.emit('code_generation_failed', { request, error });
      throw error;
    }
  }

  /**
   * Review code using the code generation service
   */
  async reviewCode(request: CodeReviewRequest): Promise<any> {
    this.emit('code_review_started', { request });
    
    try {
      const result = await this.codeGeneration.reviewCode(request);
      this.emit('code_review_completed', { request, result });
      return result;
    } catch (error) {
      this.emit('code_review_failed', { request, error });
      throw error;
    }
  }

  /**
   * Create a workflow
   */
  createWorkflow(workflow: Omit<Workflow, 'id'>): Workflow {
    const id = this.generateWorkflowId(workflow.name);
    const fullWorkflow: Workflow = { ...workflow, id };
    
    this.workflows.set(id, fullWorkflow);
    this.emit('workflow_created', { workflow: fullWorkflow });
    
    return fullWorkflow;
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId: string, parameters: Record<string, any> = {}): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const execution: WorkflowExecution = {
      id: this.generateExecutionId(),
      workflowId,
      status: 'pending',
      completedSteps: [],
      failedSteps: [],
      stepResults: new Map(),
      startTime: new Date()
    };

    this.workflowExecutions.set(execution.id, execution);
    this.emit('workflow_execution_started', { workflow, execution });

    // Execute workflow steps
    this.executeWorkflowSteps(execution, workflow, parameters);

    return execution;
  }

  /**
   * Execute workflow steps
   */
  private async executeWorkflowSteps(
    execution: WorkflowExecution, 
    workflow: Workflow, 
    parameters: Record<string, any>
  ): Promise<void> {
    execution.status = 'running';
    
    try {
      // Build dependency graph
      const dependencyGraph = this.buildDependencyGraph(workflow.steps);
      
      // Execute steps in dependency order
      for (const stepId of dependencyGraph) {
        const step = workflow.steps.find(s => s.id === stepId);
        if (!step) continue;

        execution.currentStep = stepId;
        this.emit('workflow_step_started', { execution, step });

        try {
          const result = await this.executeWorkflowStep(step, parameters, execution.stepResults);
          execution.stepResults.set(stepId, result);
          execution.completedSteps.push(stepId);
          
          this.emit('workflow_step_completed', { execution, step, result });
        } catch (error) {
          execution.failedSteps.push(stepId);
          
          if (!step.optional) {
            execution.status = 'failed';
            execution.error = error as Error;
            execution.endTime = new Date();
            
            this.emit('workflow_execution_failed', { execution, step, error });
            return;
          }
          
          this.emit('workflow_step_failed', { execution, step, error });
        }
      }

      execution.status = 'completed';
      execution.endTime = new Date();
      this.emit('workflow_execution_completed', { execution });
      
    } catch (error) {
      execution.status = 'failed';
      execution.error = error as Error;
      execution.endTime = new Date();
      
      this.emit('workflow_execution_failed', { execution, error });
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeWorkflowStep(
    step: WorkflowStep, 
    parameters: Record<string, any>,
    stepResults: Map<string, any>
  ): Promise<any> {
    const stepParams = { ...parameters, ...step.parameters };
    
    switch (step.type) {
      case 'code_generation':
        return this.codeGeneration.generateCode(stepParams);
      
      case 'code_review':
        return this.codeGeneration.reviewCode(stepParams);
      
      case 'repository_operation':
        return this.executeRepositoryOperation(stepParams);
      
      case 'custom':
        return this.executeCustomStep(step, stepParams, stepResults);
      
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  /**
   * Execute repository operation
   */
  private async executeRepositoryOperation(parameters: Record<string, any>): Promise<any> {
    const { operation, ...params } = parameters;
    
    switch (operation) {
      case 'list_repositories':
        return this.repositoryOps.listRepositories();
      
      case 'create_branch':
        return this.repositoryOps.createBranch(params.repoId, params.branchName, params.options);
      
      case 'create_pull_request':
        return this.repositoryOps.createPullRequest(params.repoId, params.options);
      
      default:
        throw new Error(`Unknown repository operation: ${operation}`);
    }
  }

  /**
   * Execute custom step (extensibility point)
   */
  private async executeCustomStep(
    step: WorkflowStep, 
    parameters: Record<string, any>,
    stepResults: Map<string, any>
  ): Promise<any> {
    // This is an extensibility point where custom step handlers can be registered
    this.emit('custom_step_execution', { step, parameters, stepResults });
    
    // Default implementation - just return the parameters
    return parameters;
  }

  /**
   * Build dependency graph for workflow steps
   */
  private buildDependencyGraph(steps: WorkflowStep[]): string[] {
    const graph = new Map<string, string[]>();
    const visited = new Set<string>();
    const result: string[] = [];

    // Build adjacency list
    for (const step of steps) {
      graph.set(step.id, step.dependencies);
    }

    // Topological sort
    const visit = (stepId: string) => {
      if (visited.has(stepId)) return;
      visited.add(stepId);

      const dependencies = graph.get(stepId) || [];
      for (const dep of dependencies) {
        visit(dep);
      }

      result.push(stepId);
    };

    for (const step of steps) {
      visit(step.id);
    }

    return result;
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    if (!this.config.enableEvents) return;

    // Forward client events
    this.client.on?.('error', (error) => {
      this.emit('client_error', error);
    });

    // Log all events in development
    if (process.env.NODE_ENV === 'development') {
      this.on('*', (eventName, data) => {
        console.log(`[Orchestrator] ${eventName}:`, data);
      });
    }
  }

  /**
   * Get orchestrator status
   */
  getStatus(): {
    activeTasks: number;
    queuedTasks: number;
    activeWorkflows: number;
    health: {
      client: any;
      auth: any;
      repository: any;
    };
  } {
    return {
      activeTasks: this.activeTasks.size,
      queuedTasks: this.taskQueue.length,
      activeWorkflows: this.workflowExecutions.size,
      health: {
        client: this.client.getHealthStatus(),
        auth: this.authManager.getHealthStatus(),
        repository: this.repositoryOps.getHealthStatus()
      }
    };
  }

  /**
   * Utility methods
   */
  private generateWorkflowId(name: string): string {
    return `workflow-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
  }

  private generateExecutionId(): string {
    return `execution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    // Cancel all active tasks
    for (const taskId of this.activeTasks.keys()) {
      try {
        await this.cancelTask(taskId);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    // Cleanup components
    this.client.close();
    this.authManager.destroy();
    this.repositoryOps.destroy();

    // Clear collections
    this.activeTasks.clear();
    this.workflows.clear();
    this.workflowExecutions.clear();
    this.taskQueue.length = 0;

    this.emit('destroyed');
  }
}

