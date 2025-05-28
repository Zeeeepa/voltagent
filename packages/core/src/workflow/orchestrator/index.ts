import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { WorkflowEngine } from '../engine';
import { WorkflowStateManager } from '../state';
import type {
  Workflow,
  WorkflowStep,
  WorkflowCreateOptions,
  WorkflowOrchestratorConfig,
  WorkflowProgressEvent,
  WorkflowCompletionEvent,
  WorkflowError,
  WorkflowAnalytics,
  WorkflowStepType
} from '../types';

/**
 * Workflow Orchestrator - Main coordination layer for CI/CD workflows
 */
export class WorkflowOrchestrator extends EventEmitter {
  private workflowEngine: WorkflowEngine;
  private stateManager: WorkflowStateManager;
  private nlpEngine?: any;
  private codegenIntegration?: any;
  private validationEngine?: any;
  private taskStorage?: any;

  constructor(config: WorkflowOrchestratorConfig = {}) {
    super();
    
    this.nlpEngine = config.nlpEngine;
    this.codegenIntegration = config.codegenIntegration;
    this.validationEngine = config.validationEngine;
    this.taskStorage = config.taskStorage;

    // Initialize workflow engine and state manager
    this.workflowEngine = new WorkflowEngine(config.executionOptions);
    this.stateManager = new WorkflowStateManager();

    this.setupEventHandlers();
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(
    requirementText: string,
    projectContext: Record<string, any> = {},
    options: WorkflowCreateOptions = {}
  ): Promise<{
    workflow_id: string;
    workflow: Workflow;
    steps: WorkflowStep[];
    status: string;
  }> {
    try {
      // Step 1: Create workflow record
      const workflow = await this.createWorkflowRecord(requirementText, projectContext, options);
      
      // Step 2: Analyze requirements and create workflow steps
      const analysisResult = await this.analyzeRequirement(requirementText, options);
      const workflowSteps = await this.createWorkflowSteps(workflow.id, analysisResult);
      
      // Update workflow with steps
      workflow.steps = workflowSteps;
      this.stateManager.setWorkflow(workflow);
      
      // Step 3: Initialize workflow state
      await this.stateManager.initializeWorkflowState(workflow.id, {
        current_state: 'created',
        context: {
          requirement_text: requirementText,
          project_context: projectContext,
          analysis_result: analysisResult,
          total_steps: workflowSteps.length
        }
      });
      
      // Step 4: Emit workflow created event
      this.emit('workflow_created', {
        workflow_id: workflow.id,
        workflow: workflow,
        steps: workflowSteps
      });
      
      return {
        workflow_id: workflow.id,
        workflow: workflow,
        steps: workflowSteps,
        status: 'created'
      };
    } catch (error) {
      console.error('Failed to create workflow:', error);
      throw error;
    }
  }

  /**
   * Start workflow execution
   */
  async startWorkflow(workflowId: string): Promise<{ success: boolean; status: string }> {
    try {
      const workflow = this.stateManager.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      // Transition to running state
      await this.stateManager.transitionState(workflowId, 'created', 'running');
      
      // Start workflow execution
      await this.workflowEngine.executeWorkflow(workflow);
      
      // Emit workflow started event
      this.emit('workflow_started', {
        workflow_id: workflowId,
        started_at: new Date()
      });
      
      return { success: true, status: 'running' };
    } catch (error) {
      console.error(`Failed to start workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Get workflow status
   */
  async getWorkflowStatus(workflowId: string): Promise<{
    workflow_id: string;
    status: string;
    current_state: string;
    progress: number;
    steps: WorkflowStep[];
    analytics: any;
  }> {
    const workflow = this.stateManager.getWorkflow(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const progress = this.stateManager.getWorkflowProgress(workflowId);
    
    return {
      workflow_id: workflowId,
      status: workflow.status,
      current_state: workflow.currentState,
      progress,
      steps: workflow.steps,
      analytics: {
        total_steps: workflow.steps.length,
        completed_steps: workflow.steps.filter(s => s.status === 'completed').length,
        failed_steps: workflow.steps.filter(s => s.status === 'failed').length,
        running_steps: workflow.steps.filter(s => s.status === 'running').length
      }
    };
  }

  /**
   * Pause workflow execution
   */
  async pauseWorkflow(workflowId: string): Promise<{ success: boolean; status: string }> {
    try {
      await this.stateManager.transitionState(workflowId, 'running', 'paused');
      await this.workflowEngine.pauseWorkflow(workflowId);
      
      return { success: true, status: 'paused' };
    } catch (error) {
      console.error(`Failed to pause workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Resume workflow execution
   */
  async resumeWorkflow(workflowId: string): Promise<{ success: boolean; status: string }> {
    try {
      const workflow = this.stateManager.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      await this.stateManager.transitionState(workflowId, 'paused', 'running');
      await this.workflowEngine.resumeWorkflow(workflow);
      
      return { success: true, status: 'running' };
    } catch (error) {
      console.error(`Failed to resume workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Cancel workflow execution
   */
  async cancelWorkflow(workflowId: string, reason?: string): Promise<{ success: boolean; status: string }> {
    try {
      const workflow = this.stateManager.getWorkflow(workflowId);
      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }

      await this.stateManager.transitionState(workflow.currentState, 'cancelled', 'cancellation');
      await this.workflowEngine.cancelWorkflow(workflowId);
      
      // Update workflow metadata with cancellation reason
      workflow.metadata.cancellation_reason = reason;
      workflow.metadata.cancelled_at = new Date();
      
      return { success: true, status: 'cancelled' };
    } catch (error) {
      console.error(`Failed to cancel workflow ${workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Complete workflow step
   */
  async completeWorkflowStep(
    workflowId: string,
    stepId: string,
    result: Record<string, any>
  ): Promise<void> {
    await this.stateManager.updateStepStatus(workflowId, stepId, 'completed', result);
  }

  /**
   * Fail workflow step
   */
  async failWorkflowStep(
    workflowId: string,
    stepId: string,
    error: Record<string, any>
  ): Promise<void> {
    await this.stateManager.updateStepStatus(workflowId, stepId, 'failed', undefined, error);
  }

  /**
   * Get workflow analytics
   */
  getWorkflowAnalytics(): WorkflowAnalytics {
    const baseAnalytics = this.stateManager.getWorkflowAnalytics();
    
    return {
      totalWorkflows: baseAnalytics.totalWorkflows,
      completedWorkflows: baseAnalytics.completedWorkflows,
      failedWorkflows: baseAnalytics.failedWorkflows,
      activeWorkflows: baseAnalytics.activeWorkflows,
      averageDuration: baseAnalytics.averageDuration,
      averageStepsPerWorkflow: 8.5, // Mock value
      stepSuccessRate: 0.94, // Mock value
      componentCoordinationLatency: 85, // Mock value
      errorRecoverySuccessRate: 0.91 // Mock value
    };
  }

  /**
   * Create workflow record
   */
  private async createWorkflowRecord(
    requirementText: string,
    projectContext: Record<string, any>,
    options: WorkflowCreateOptions
  ): Promise<Workflow> {
    const workflow: Workflow = {
      id: uuidv4(),
      title: options.title || 'AI-Driven Development Workflow',
      description: options.description,
      requirementText,
      projectContext,
      currentState: 'created',
      status: 'pending',
      priority: options.priority || 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: options.createdBy,
      metadata: options.metadata || {},
      steps: []
    };

    return workflow;
  }

  /**
   * Analyze requirement using NLP engine
   */
  private async analyzeRequirement(
    requirementText: string,
    options: WorkflowCreateOptions
  ): Promise<any> {
    if (this.nlpEngine) {
      try {
        return await this.nlpEngine.analyzeRequirement(requirementText, options);
      } catch (error) {
        console.warn('NLP engine analysis failed, using fallback:', error);
      }
    }

    // Fallback analysis
    return {
      requirement_text: requirementText,
      tasks: [
        {
          id: 'task-1',
          title: 'Implement workflow orchestration',
          description: 'Implement the workflow orchestration system',
          priority: 'high',
          estimated_duration: 300000
        }
      ],
      complexity: 'medium',
      estimated_duration: 600000
    };
  }

  /**
   * Create workflow steps based on analysis
   */
  private async createWorkflowSteps(workflowId: string, analysisResult: any): Promise<WorkflowStep[]> {
    const steps: WorkflowStep[] = [];
    
    // Step 1: NLP Analysis (already completed)
    steps.push(this.createStep(workflowId, {
      stepType: 'analysis',
      stepName: 'Requirement Analysis',
      stepOrder: 1,
      status: 'completed',
      outputData: analysisResult,
      dependencies: []
    }));
    
    // Step 2: Task Creation
    steps.push(this.createStep(workflowId, {
      stepType: 'task_creation',
      stepName: 'Create Atomic Tasks',
      stepOrder: 2,
      status: 'pending',
      inputData: { analysis_result: analysisResult },
      dependencies: ['Requirement Analysis']
    }));
    
    // Step 3: Codegen (for each task)
    const tasks = analysisResult.tasks || [];
    tasks.forEach((task: any, index: number) => {
      steps.push(this.createStep(workflowId, {
        stepType: 'codegen',
        stepName: `Generate Code for Task ${index + 1}`,
        stepOrder: 3 + index,
        status: 'pending',
        inputData: { task },
        dependencies: ['Create Atomic Tasks']
      }));
    });
    
    // Step 4: Validation (for each PR)
    tasks.forEach((task: any, index: number) => {
      steps.push(this.createStep(workflowId, {
        stepType: 'validation',
        stepName: `Validate PR for Task ${index + 1}`,
        stepOrder: 3 + tasks.length + index,
        status: 'pending',
        inputData: { task_index: index },
        dependencies: [`Generate Code for Task ${index + 1}`]
      }));
    });
    
    // Step 5: Completion
    const validationSteps = steps.filter(s => s.stepType === 'validation').map(s => s.stepName);
    steps.push(this.createStep(workflowId, {
      stepType: 'completion',
      stepName: 'Workflow Completion',
      stepOrder: 3 + (tasks.length * 2),
      status: 'pending',
      dependencies: validationSteps
    }));
    
    return steps;
  }

  /**
   * Create a workflow step
   */
  private createStep(workflowId: string, stepData: {
    stepType: WorkflowStepType;
    stepName: string;
    stepOrder: number;
    status?: string;
    inputData?: Record<string, any>;
    outputData?: Record<string, any>;
    dependencies: string[];
  }): WorkflowStep {
    return {
      id: uuidv4(),
      workflowId,
      stepType: stepData.stepType,
      stepName: stepData.stepName,
      stepOrder: stepData.stepOrder,
      status: (stepData.status as any) || 'pending',
      inputData: stepData.inputData || {},
      outputData: stepData.outputData || {},
      errorData: {},
      retryCount: 0,
      maxRetries: 3,
      dependencies: stepData.dependencies,
      metadata: {}
    };
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Handle step completion
    this.workflowEngine.on('step_completed', async (data) => {
      await this.handleStepCompletion(data);
    });
    
    // Handle step failure
    this.workflowEngine.on('step_failed', async (data) => {
      await this.handleStepFailure(data);
    });
    
    // Handle workflow completion
    this.workflowEngine.on('workflow_completed', async (data) => {
      await this.handleWorkflowCompletion(data);
    });

    // Handle workflow failure
    this.workflowEngine.on('workflow_failed', async (data) => {
      await this.handleWorkflowFailure(data);
    });

    // Forward state manager events
    this.stateManager.on('workflow_state_changed', (data) => {
      this.emit('workflow_progress', {
        workflow_id: data.workflowId,
        status: data.toState,
        progress: this.stateManager.getWorkflowProgress(data.workflowId),
        message: `Workflow transitioned from ${data.fromState} to ${data.toState}`
      } as WorkflowProgressEvent);
    });

    this.stateManager.on('workflow_step_status_changed', (data) => {
      this.emit('workflow_progress', {
        workflow_id: data.workflowId,
        step_id: data.stepId,
        status: data.toStatus,
        progress: this.stateManager.getWorkflowProgress(data.workflowId),
        message: `Step ${data.step.stepName} ${data.toStatus}`
      } as WorkflowProgressEvent);
    });
  }

  /**
   * Handle step completion
   */
  private async handleStepCompletion(data: any): Promise<void> {
    const { workflow_id, step_id, result } = data;
    
    // Update step status
    await this.stateManager.updateStepStatus(workflow_id, step_id, 'completed', result);
    
    // Emit progress event
    this.emit('workflow_progress', {
      workflow_id,
      step_id,
      status: 'completed',
      progress: this.stateManager.getWorkflowProgress(workflow_id),
      data: result
    } as WorkflowProgressEvent);
    
    // Check if workflow is complete
    if (this.stateManager.areAllStepsCompleted(workflow_id)) {
      await this.completeWorkflow(workflow_id);
    }
  }

  /**
   * Handle step failure
   */
  private async handleStepFailure(data: any): Promise<void> {
    const { workflow_id, step_id, error } = data;
    
    // Update step status
    await this.stateManager.updateStepStatus(workflow_id, step_id, 'failed', undefined, error);
    
    // Emit failure event
    this.emit('workflow_step_failed', {
      workflow_id,
      step_id,
      error
    });
    
    // Determine if workflow should fail or retry
    const workflow = this.stateManager.getWorkflow(workflow_id);
    if (!workflow) return;

    const step = workflow.steps.find(s => s.id === step_id);
    if (!step) return;

    if (step.retryCount < step.maxRetries && error.recoverable) {
      // Retry step
      await this.retryWorkflowStep(step_id);
    } else {
      // Check if this causes workflow failure
      if (this.stateManager.hasFailedSteps(workflow_id)) {
        await this.failWorkflow(workflow_id, error);
      }
    }
  }

  /**
   * Handle workflow completion
   */
  private async handleWorkflowCompletion(data: any): Promise<void> {
    await this.completeWorkflow(data.workflow_id);
  }

  /**
   * Handle workflow failure
   */
  private async handleWorkflowFailure(data: any): Promise<void> {
    await this.failWorkflow(data.workflow_id, data.error);
  }

  /**
   * Complete workflow
   */
  private async completeWorkflow(workflowId: string): Promise<void> {
    // Transition to completed state
    await this.stateManager.transitionState(workflowId, 'running', 'completed');
    
    const workflow = this.stateManager.getWorkflow(workflowId);
    if (!workflow) return;

    // Emit completion event
    const completionEvent: WorkflowCompletionEvent = {
      workflowId,
      status: 'completed',
      completedAt: new Date(),
      totalSteps: workflow.steps.length,
      completedSteps: workflow.steps.filter(s => s.status === 'completed').length,
      failedSteps: workflow.steps.filter(s => s.status === 'failed').length,
      duration: workflow.startedAt && workflow.completedAt 
        ? workflow.completedAt.getTime() - workflow.startedAt.getTime()
        : 0
    };

    this.emit('workflow_completed', completionEvent);
  }

  /**
   * Fail workflow
   */
  private async failWorkflow(workflowId: string, error: any): Promise<void> {
    // Transition to failed state
    const workflow = this.stateManager.getWorkflow(workflowId);
    if (!workflow) return;

    await this.stateManager.transitionState(workflowId, workflow.currentState, 'failed');
    
    this.emit('workflow_failed', {
      workflow_id: workflowId,
      error,
      failed_at: new Date()
    });
  }

  /**
   * Retry workflow step
   */
  private async retryWorkflowStep(stepId: string): Promise<void> {
    // Implementation for retrying a failed step
    this.emit('workflow_step_retry', {
      step_id: stepId,
      retry_at: new Date()
    });
  }
}

