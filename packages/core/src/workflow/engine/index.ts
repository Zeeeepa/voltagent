import { EventEmitter } from 'events';
import type {
  Workflow,
  WorkflowStep,
  WorkflowStepExecutionContext,
  WorkflowStepExecutionResult,
  WorkflowExecutionOptions,
  WorkflowError,
  WorkflowStepStatus
} from '../types';

/**
 * Workflow execution engine - Handles workflow step execution and coordination
 */
export class WorkflowEngine extends EventEmitter {
  private executionOptions: WorkflowExecutionOptions;
  private activeExecutions: Map<string, Promise<void>> = new Map();
  private stepExecutors: Map<string, StepExecutor> = new Map();

  constructor(options: WorkflowExecutionOptions = {}) {
    super();
    this.executionOptions = {
      maxConcurrentSteps: options.maxConcurrentSteps || 10,
      stepTimeout: options.stepTimeout || 300000, // 5 minutes
      enableParallelExecution: options.enableParallelExecution !== false,
      retryDelay: options.retryDelay || 5000
    };

    // Register default step executors
    this.registerDefaultStepExecutors();
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflow: Workflow): Promise<void> {
    const workflowId = workflow.id;

    if (this.activeExecutions.has(workflowId)) {
      throw new Error(`Workflow ${workflowId} is already executing`);
    }

    const executionPromise = this.performWorkflowExecution(workflow);
    this.activeExecutions.set(workflowId, executionPromise);

    try {
      await executionPromise;
    } finally {
      this.activeExecutions.delete(workflowId);
    }
  }

  /**
   * Execute a single workflow step
   */
  async executeStep(context: WorkflowStepExecutionContext): Promise<WorkflowStepExecutionResult> {
    const { workflow, step } = context;

    this.emit('step_started', {
      workflow_id: workflow.id,
      step_id: step.id,
      step_type: step.stepType,
      step_name: step.stepName
    });

    try {
      // Check dependencies
      await this.checkStepDependencies(context);

      // Get step executor
      const executor = this.getStepExecutor(step.stepType);
      if (!executor) {
        throw new Error(`No executor found for step type: ${step.stepType}`);
      }

      // Execute step with timeout
      const result = await this.executeWithTimeout(
        () => executor.execute(context),
        this.executionOptions.stepTimeout!
      );

      this.emit('step_completed', {
        workflow_id: workflow.id,
        step_id: step.id,
        result: result.outputData
      });

      return result;
    } catch (error) {
      const workflowError: WorkflowError = {
        code: 'STEP_EXECUTION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: { stepId: step.id, stepType: step.stepType },
        recoverable: this.isRecoverableError(error),
        retryable: step.retryCount < step.maxRetries,
        timestamp: new Date()
      };

      this.emit('step_failed', {
        workflow_id: workflow.id,
        step_id: step.id,
        error: workflowError
      });

      return {
        success: false,
        errorData: { error: workflowError },
        shouldRetry: workflowError.retryable
      };
    }
  }

  /**
   * Pause workflow execution
   */
  async pauseWorkflow(workflowId: string): Promise<void> {
    // Implementation would pause active step executions
    this.emit('workflow_paused', { workflow_id: workflowId });
  }

  /**
   * Resume workflow execution
   */
  async resumeWorkflow(workflow: Workflow): Promise<void> {
    await this.executeWorkflow(workflow);
  }

  /**
   * Cancel workflow execution
   */
  async cancelWorkflow(workflowId: string): Promise<void> {
    const execution = this.activeExecutions.get(workflowId);
    if (execution) {
      // Cancel active execution
      this.activeExecutions.delete(workflowId);
    }
    
    this.emit('workflow_cancelled', { workflow_id: workflowId });
  }

  /**
   * Register a step executor
   */
  registerStepExecutor(stepType: string, executor: StepExecutor): void {
    this.stepExecutors.set(stepType, executor);
  }

  /**
   * Get step executor
   */
  private getStepExecutor(stepType: string): StepExecutor | undefined {
    return this.stepExecutors.get(stepType);
  }

  /**
   * Perform workflow execution
   */
  private async performWorkflowExecution(workflow: Workflow): Promise<void> {
    try {
      // Get executable steps (steps with satisfied dependencies)
      let executableSteps = this.getExecutableSteps(workflow);

      while (executableSteps.length > 0) {
        if (this.executionOptions.enableParallelExecution) {
          // Execute steps in parallel (up to maxConcurrentSteps)
          await this.executeStepsInParallel(workflow, executableSteps);
        } else {
          // Execute steps sequentially
          await this.executeStepsSequentially(workflow, executableSteps);
        }

        // Get next batch of executable steps
        executableSteps = this.getExecutableSteps(workflow);
      }

      // Check if workflow is complete
      const allStepsCompleted = workflow.steps.every(step => 
        ['completed', 'skipped'].includes(step.status)
      );

      if (allStepsCompleted) {
        this.emit('workflow_completed', {
          workflow_id: workflow.id,
          completed_at: new Date()
        });
      } else {
        // Check for failed steps that can't be retried
        const failedSteps = workflow.steps.filter(step => 
          step.status === 'failed' && step.retryCount >= step.maxRetries
        );

        if (failedSteps.length > 0) {
          this.emit('workflow_failed', {
            workflow_id: workflow.id,
            failed_steps: failedSteps.map(s => s.id),
            error: 'Workflow failed due to unrecoverable step failures'
          });
        }
      }
    } catch (error) {
      this.emit('workflow_failed', {
        workflow_id: workflow.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Execute steps in parallel
   */
  private async executeStepsInParallel(workflow: Workflow, steps: WorkflowStep[]): Promise<void> {
    const maxConcurrent = Math.min(steps.length, this.executionOptions.maxConcurrentSteps!);
    const batches = this.chunkArray(steps, maxConcurrent);

    for (const batch of batches) {
      const promises = batch.map(step => {
        const context: WorkflowStepExecutionContext = {
          workflow,
          step,
          previousSteps: this.getPreviousSteps(workflow, step),
          dependencies: this.getStepDependencies(workflow, step),
          executionOptions: this.executionOptions
        };

        return this.executeStep(context);
      });

      await Promise.allSettled(promises);
    }
  }

  /**
   * Execute steps sequentially
   */
  private async executeStepsSequentially(workflow: Workflow, steps: WorkflowStep[]): Promise<void> {
    for (const step of steps) {
      const context: WorkflowStepExecutionContext = {
        workflow,
        step,
        previousSteps: this.getPreviousSteps(workflow, step),
        dependencies: this.getStepDependencies(workflow, step),
        executionOptions: this.executionOptions
      };

      await this.executeStep(context);
    }
  }

  /**
   * Get executable steps (steps with satisfied dependencies)
   */
  private getExecutableSteps(workflow: Workflow): WorkflowStep[] {
    return workflow.steps.filter(step => {
      // Skip already completed, failed, or running steps
      if (['completed', 'failed', 'running', 'skipped'].includes(step.status)) {
        return false;
      }

      // Check if all dependencies are satisfied
      return this.areDependenciesSatisfied(workflow, step);
    });
  }

  /**
   * Check if step dependencies are satisfied
   */
  private areDependenciesSatisfied(workflow: Workflow, step: WorkflowStep): boolean {
    if (step.dependencies.length === 0) {
      return true;
    }

    return step.dependencies.every(depName => {
      const depStep = workflow.steps.find(s => s.stepName === depName);
      return depStep && ['completed', 'skipped'].includes(depStep.status);
    });
  }

  /**
   * Check step dependencies before execution
   */
  private async checkStepDependencies(context: WorkflowStepExecutionContext): Promise<void> {
    const { workflow, step } = context;

    if (!this.areDependenciesSatisfied(workflow, step)) {
      throw new Error(`Step dependencies not satisfied for step: ${step.stepName}`);
    }
  }

  /**
   * Get previous steps
   */
  private getPreviousSteps(workflow: Workflow, currentStep: WorkflowStep): WorkflowStep[] {
    return workflow.steps.filter(step => step.stepOrder < currentStep.stepOrder);
  }

  /**
   * Get step dependencies
   */
  private getStepDependencies(workflow: Workflow, step: WorkflowStep): WorkflowStep[] {
    return workflow.steps.filter(s => step.dependencies.includes(s.stepName));
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeout}ms`));
      }, timeout);

      operation()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Check if error is recoverable
   */
  private isRecoverableError(error: any): boolean {
    // Define recoverable error patterns
    const recoverablePatterns = [
      /network/i,
      /timeout/i,
      /rate limit/i,
      /temporary/i,
      /service unavailable/i
    ];

    const errorMessage = error instanceof Error ? error.message : String(error);
    return recoverablePatterns.some(pattern => pattern.test(errorMessage));
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Register default step executors
   */
  private registerDefaultStepExecutors(): void {
    // Analysis step executor
    this.registerStepExecutor('analysis', new AnalysisStepExecutor());
    
    // Task creation step executor
    this.registerStepExecutor('task_creation', new TaskCreationStepExecutor());
    
    // Codegen step executor
    this.registerStepExecutor('codegen', new CodegenStepExecutor());
    
    // Validation step executor
    this.registerStepExecutor('validation', new ValidationStepExecutor());
    
    // Completion step executor
    this.registerStepExecutor('completion', new CompletionStepExecutor());
  }
}

/**
 * Base step executor interface
 */
export interface StepExecutor {
  execute(context: WorkflowStepExecutionContext): Promise<WorkflowStepExecutionResult>;
}

/**
 * Analysis step executor
 */
class AnalysisStepExecutor implements StepExecutor {
  async execute(context: WorkflowStepExecutionContext): Promise<WorkflowStepExecutionResult> {
    const { workflow } = context;
    
    // Mock NLP analysis - in real implementation, this would call the NLP engine
    const analysisResult = {
      requirement_text: workflow.requirementText,
      tasks: [
        {
          id: 'task-1',
          title: 'Implement core functionality',
          description: 'Core implementation based on requirements',
          priority: 'high'
        }
      ],
      complexity: 'medium',
      estimated_duration: 300000 // 5 minutes
    };

    return {
      success: true,
      outputData: { analysis_result: analysisResult }
    };
  }
}

/**
 * Task creation step executor
 */
class TaskCreationStepExecutor implements StepExecutor {
  async execute(context: WorkflowStepExecutionContext): Promise<WorkflowStepExecutionResult> {
    const { step } = context;
    const analysisResult = step.inputData.analysis_result;

    // Create atomic tasks based on analysis
    const tasks = analysisResult?.tasks || [];
    
    return {
      success: true,
      outputData: { 
        created_tasks: tasks,
        task_count: tasks.length
      }
    };
  }
}

/**
 * Codegen step executor
 */
class CodegenStepExecutor implements StepExecutor {
  async execute(context: WorkflowStepExecutionContext): Promise<WorkflowStepExecutionResult> {
    const { step } = context;
    const task = step.inputData.task;

    // Mock codegen - in real implementation, this would call the codegen service
    const codegenResult = {
      task_id: task?.id,
      generated_files: ['src/main.ts', 'src/utils.ts'],
      pr_url: `https://github.com/example/repo/pull/${Math.floor(Math.random() * 1000)}`,
      branch_name: `feature/${task?.id || 'generated'}`
    };

    return {
      success: true,
      outputData: { codegen_result: codegenResult }
    };
  }
}

/**
 * Validation step executor
 */
class ValidationStepExecutor implements StepExecutor {
  async execute(context: WorkflowStepExecutionContext): Promise<WorkflowStepExecutionResult> {
    const { step } = context;
    const taskIndex = step.inputData.task_index;

    // Mock validation - in real implementation, this would call Claude Code validation
    const validationResult = {
      task_index: taskIndex,
      validation_passed: true,
      issues_found: [],
      suggestions: ['Consider adding error handling', 'Add unit tests'],
      score: 85
    };

    return {
      success: true,
      outputData: { validation_result: validationResult }
    };
  }
}

/**
 * Completion step executor
 */
class CompletionStepExecutor implements StepExecutor {
  async execute(context: WorkflowStepExecutionContext): Promise<WorkflowStepExecutionResult> {
    const { workflow } = context;

    // Gather results from all previous steps
    const completedSteps = workflow.steps.filter(s => s.status === 'completed');
    const results = completedSteps.map(s => s.outputData);

    const completionResult = {
      workflow_id: workflow.id,
      total_steps: workflow.steps.length,
      completed_steps: completedSteps.length,
      results: results,
      summary: 'Workflow completed successfully'
    };

    return {
      success: true,
      outputData: { completion_result: completionResult }
    };
  }
}

