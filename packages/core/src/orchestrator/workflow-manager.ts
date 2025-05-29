import { EventEmitter } from "events";
import type {
  WorkflowDefinition,
  WorkflowExecution,
  WorkflowStep,
  WorkflowStatus,
  WorkflowStepType,
  RetryPolicy,
  OrchestratorConfig,
} from "./types";
import type { EventDispatcher } from "./event-dispatcher";
import type { CoordinationEngine } from "./coordination-engine";

/**
 * Step execution result
 */
interface StepExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  duration: number;
  metadata?: Record<string, any>;
}

/**
 * Workflow context
 */
interface WorkflowContext {
  workflowId: string;
  executionId: string;
  input: Record<string, any>;
  stepResults: Record<string, any>;
  variables: Record<string, any>;
  metadata: Record<string, any>;
}

/**
 * Workflow Manager for managing complete development pipeline workflows
 */
export class WorkflowManager extends EventEmitter {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();
  private stepExecutors: Map<WorkflowStepType, (step: WorkflowStep, context: WorkflowContext) => Promise<StepExecutionResult>> = new Map();
  private eventDispatcher: EventDispatcher;
  private coordinationEngine: CoordinationEngine;
  private config: OrchestratorConfig;
  private isRunning = false;
  private executionInterval?: NodeJS.Timeout;

  constructor(
    eventDispatcher: EventDispatcher,
    coordinationEngine: CoordinationEngine,
    config: OrchestratorConfig
  ) {
    super();
    this.eventDispatcher = eventDispatcher;
    this.coordinationEngine = coordinationEngine;
    this.config = config;
    this.setupStepExecutors();
  }

  /**
   * Start the workflow manager
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.startExecutionLoop();
    
    await this.eventDispatcher.createEvent(
      "workflow_manager:started",
      "workflow-manager",
      { timestamp: new Date() }
    );
  }

  /**
   * Stop the workflow manager
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.executionInterval) {
      clearInterval(this.executionInterval);
      this.executionInterval = undefined;
    }

    // Cancel all running executions
    for (const execution of this.executions.values()) {
      if (execution.status === "running") {
        await this.cancelExecution(execution.id, "System shutdown");
      }
    }

    await this.eventDispatcher.createEvent(
      "workflow_manager:stopped",
      "workflow-manager",
      { timestamp: new Date() }
    );
  }

  /**
   * Register a workflow definition
   */
  public registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
    this.emit("workflow:registered", workflow);
  }

  /**
   * Unregister a workflow definition
   */
  public unregisterWorkflow(workflowId: string): void {
    const workflow = this.workflows.get(workflowId);
    if (workflow) {
      this.workflows.delete(workflowId);
      this.emit("workflow:unregistered", workflow);
    }
  }

  /**
   * Execute a workflow
   */
  public async executeWorkflow(
    workflowId: string,
    input: Record<string, any> = {},
    metadata: Record<string, any> = {}
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Check concurrent execution limit
    const runningExecutions = Array.from(this.executions.values()).filter(e => e.status === "running");
    if (runningExecutions.length >= this.config.maxConcurrentWorkflows) {
      throw new Error("Maximum concurrent workflows limit reached");
    }

    const execution: WorkflowExecution = {
      id: this.generateExecutionId(),
      workflowId,
      status: "pending",
      startTime: new Date(),
      currentStep: undefined,
      completedSteps: [],
      failedSteps: [],
      results: {},
      metadata: { ...metadata, input },
    };

    this.executions.set(execution.id, execution);
    
    await this.eventDispatcher.createEvent(
      "workflow:execution_started",
      "workflow-manager",
      {
        executionId: execution.id,
        workflowId,
        input,
        metadata,
      }
    );

    // Start execution asynchronously
    this.startExecution(execution, workflow, input).catch(async (error) => {
      execution.status = "failed";
      execution.error = error;
      execution.endTime = new Date();
      
      await this.eventDispatcher.createEvent(
        "workflow:execution_failed",
        "workflow-manager",
        {
          executionId: execution.id,
          error: error.message,
          duration: execution.endTime.getTime() - execution.startTime.getTime(),
        }
      );
    });

    return execution;
  }

  /**
   * Get workflow execution status
   */
  public getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Cancel a workflow execution
   */
  public async cancelExecution(executionId: string, reason: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== "running") {
      return false;
    }

    execution.status = "cancelled";
    execution.endTime = new Date();
    execution.metadata = {
      ...execution.metadata,
      cancellationReason: reason,
    };

    await this.eventDispatcher.createEvent(
      "workflow:execution_cancelled",
      "workflow-manager",
      {
        executionId,
        reason,
        duration: execution.endTime.getTime() - execution.startTime.getTime(),
      }
    );

    return true;
  }

  /**
   * Get all workflow definitions
   */
  public getWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Get all executions
   */
  public getExecutions(filter?: { status?: WorkflowStatus; workflowId?: string }): WorkflowExecution[] {
    let executions = Array.from(this.executions.values());
    
    if (filter) {
      if (filter.status) {
        executions = executions.filter(e => e.status === filter.status);
      }
      if (filter.workflowId) {
        executions = executions.filter(e => e.workflowId === filter.workflowId);
      }
    }
    
    return executions.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  /**
   * Create a complete workflow pipeline
   */
  public createCompleteWorkflowPipeline(): WorkflowDefinition {
    return {
      id: "complete_development_pipeline",
      name: "Complete Development Pipeline",
      description: "End-to-end workflow from requirement to deployment",
      steps: [
        {
          id: "requirement_analysis",
          name: "Requirement Analysis",
          type: "requirement_analysis",
          timeout: 300000, // 5 minutes
          parameters: {
            analysisDepth: "detailed",
            generatePRD: true,
          },
        },
        {
          id: "task_generation",
          name: "Task Generation",
          type: "task_generation",
          dependencies: ["requirement_analysis"],
          timeout: 600000, // 10 minutes
          parameters: {
            taskBreakdown: "granular",
            prioritization: true,
          },
        },
        {
          id: "agent_assignment",
          name: "Agent Assignment",
          type: "agent_assignment",
          dependencies: ["task_generation"],
          timeout: 120000, // 2 minutes
          parameters: {
            loadBalancing: true,
            skillMatching: true,
          },
        },
        {
          id: "execution",
          name: "Task Execution",
          type: "execution",
          dependencies: ["agent_assignment"],
          timeout: 1800000, // 30 minutes
          parameters: {
            parallelExecution: true,
            progressTracking: true,
          },
        },
        {
          id: "validation",
          name: "Validation",
          type: "validation",
          dependencies: ["execution"],
          timeout: 600000, // 10 minutes
          parameters: {
            testExecution: true,
            qualityChecks: true,
          },
        },
        {
          id: "deployment",
          name: "Deployment",
          type: "deployment",
          dependencies: ["validation"],
          timeout: 900000, // 15 minutes
          parameters: {
            environment: "staging",
            rollbackEnabled: true,
          },
        },
      ],
      timeout: 3600000, // 1 hour total
      retryPolicy: {
        maxAttempts: 3,
        backoffStrategy: "exponential",
        baseDelay: 5000,
        maxDelay: 60000,
      },
    };
  }

  /**
   * Start workflow execution
   */
  private async startExecution(
    execution: WorkflowExecution,
    workflow: WorkflowDefinition,
    input: Record<string, any>
  ): Promise<void> {
    execution.status = "running";
    
    const context: WorkflowContext = {
      workflowId: workflow.id,
      executionId: execution.id,
      input,
      stepResults: {},
      variables: {},
      metadata: execution.metadata || {},
    };

    try {
      await this.coordinationEngine.startWorkflow(execution);
      
      // Execute steps in dependency order
      const executionOrder = this.calculateExecutionOrder(workflow.steps);
      
      for (const stepId of executionOrder) {
        if (execution.status !== "running") {
          break; // Execution was cancelled
        }
        
        const step = workflow.steps.find(s => s.id === stepId);
        if (!step) {
          continue;
        }
        
        execution.currentStep = stepId;
        
        await this.eventDispatcher.createEvent(
          "workflow:step_started",
          "workflow-manager",
          {
            executionId: execution.id,
            stepId,
            stepName: step.name,
            stepType: step.type,
          }
        );
        
        const stepResult = await this.executeStep(step, context);
        
        if (stepResult.success) {
          execution.completedSteps.push(stepId);
          context.stepResults[stepId] = stepResult.output;
          
          await this.eventDispatcher.createEvent(
            "workflow:step_completed",
            "workflow-manager",
            {
              executionId: execution.id,
              stepId,
              output: stepResult.output,
              duration: stepResult.duration,
            }
          );
        } else {
          execution.failedSteps.push(stepId);
          
          await this.eventDispatcher.createEvent(
            "workflow:step_failed",
            "workflow-manager",
            {
              executionId: execution.id,
              stepId,
              error: stepResult.error,
              duration: stepResult.duration,
            }
          );
          
          // Handle step failure based on retry policy
          const shouldRetry = await this.handleStepFailure(step, stepResult, context);
          if (!shouldRetry) {
            throw new Error(`Step ${stepId} failed: ${stepResult.error}`);
          }
        }
      }
      
      // Workflow completed successfully
      execution.status = "completed";
      execution.endTime = new Date();
      execution.results = context.stepResults;
      
      await this.coordinationEngine.updateWorkflowStatus(
        execution.id,
        "completed",
        undefined,
        execution.results
      );
      
      await this.eventDispatcher.createEvent(
        "workflow:execution_completed",
        "workflow-manager",
        {
          executionId: execution.id,
          results: execution.results,
          duration: execution.endTime.getTime() - execution.startTime.getTime(),
        }
      );
      
    } catch (error) {
      execution.status = "failed";
      execution.endTime = new Date();
      execution.error = error as Error;
      
      await this.coordinationEngine.updateWorkflowStatus(
        execution.id,
        "failed",
        execution.currentStep,
        { error: error instanceof Error ? error.message : "Unknown error" }
      );
      
      throw error;
    }
  }

  /**
   * Execute a workflow step
   */
  private async executeStep(step: WorkflowStep, context: WorkflowContext): Promise<StepExecutionResult> {
    const startTime = Date.now();
    
    try {
      const executor = this.stepExecutors.get(step.type);
      if (!executor) {
        throw new Error(`No executor found for step type: ${step.type}`);
      }
      
      // Apply timeout if specified
      const timeout = step.timeout || this.config.workflowTimeout;
      const timeoutPromise = new Promise<StepExecutionResult>((_, reject) => {
        setTimeout(() => reject(new Error("Step timeout")), timeout);
      });
      
      const executionPromise = executor(step, context);
      const result = await Promise.race([executionPromise, timeoutPromise]);
      
      result.duration = Date.now() - startTime;
      return result;
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Handle step failure and determine if retry should be attempted
   */
  private async handleStepFailure(
    step: WorkflowStep,
    result: StepExecutionResult,
    context: WorkflowContext
  ): Promise<boolean> {
    const retryPolicy = step.retryPolicy || this.config.retryPolicy;
    
    // Check if error is retryable
    if (retryPolicy.retryableErrors && result.error) {
      const isRetryable = retryPolicy.retryableErrors.some(pattern => 
        result.error!.includes(pattern)
      );
      if (!isRetryable) {
        return false;
      }
    }
    
    // Check retry attempts
    const attemptKey = `${step.id}_attempts`;
    const attempts = (context.variables[attemptKey] as number) || 0;
    
    if (attempts >= retryPolicy.maxAttempts) {
      return false;
    }
    
    // Calculate delay
    let delay = retryPolicy.baseDelay;
    if (retryPolicy.backoffStrategy === "exponential") {
      delay = Math.min(delay * Math.pow(2, attempts), retryPolicy.maxDelay || delay * 10);
    } else if (retryPolicy.backoffStrategy === "linear") {
      delay = delay * (attempts + 1);
    }
    
    // Wait before retry
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Update attempt count
    context.variables[attemptKey] = attempts + 1;
    
    return true;
  }

  /**
   * Calculate execution order based on dependencies
   */
  private calculateExecutionOrder(steps: WorkflowStep[]): string[] {
    const order: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (stepId: string) => {
      if (visiting.has(stepId)) {
        throw new Error(`Circular dependency detected involving step: ${stepId}`);
      }
      
      if (visited.has(stepId)) {
        return;
      }
      
      visiting.add(stepId);
      
      const step = steps.find(s => s.id === stepId);
      if (step && step.dependencies) {
        for (const depId of step.dependencies) {
          visit(depId);
        }
      }
      
      visiting.delete(stepId);
      visited.add(stepId);
      order.push(stepId);
    };
    
    for (const step of steps) {
      visit(step.id);
    }
    
    return order;
  }

  /**
   * Setup step executors
   */
  private setupStepExecutors(): void {
    this.stepExecutors.set("requirement_analysis", this.executeRequirementAnalysis.bind(this));
    this.stepExecutors.set("task_generation", this.executeTaskGeneration.bind(this));
    this.stepExecutors.set("agent_assignment", this.executeAgentAssignment.bind(this));
    this.stepExecutors.set("execution", this.executeTaskExecution.bind(this));
    this.stepExecutors.set("validation", this.executeValidation.bind(this));
    this.stepExecutors.set("deployment", this.executeDeployment.bind(this));
  }

  /**
   * Execute requirement analysis step
   */
  private async executeRequirementAnalysis(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepExecutionResult> {
    // Implementation for requirement analysis
    // This would integrate with PRD analysis tools
    
    const analysisResult = {
      requirements: context.input.requirements || "No requirements provided",
      prd: {
        title: "Generated PRD",
        description: "Detailed product requirements document",
        features: ["Feature 1", "Feature 2", "Feature 3"],
        acceptance_criteria: ["Criteria 1", "Criteria 2"],
      },
      complexity: "medium",
      estimatedDuration: "2-3 days",
    };
    
    return {
      success: true,
      output: analysisResult,
      duration: 0, // Will be set by caller
    };
  }

  /**
   * Execute task generation step
   */
  private async executeTaskGeneration(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepExecutionResult> {
    // Implementation for task generation
    // This would use Codegen SDK to generate tasks
    
    const requirements = context.stepResults.requirement_analysis;
    const tasks = [
      {
        id: "task_1",
        title: "Implement core functionality",
        description: "Based on requirements analysis",
        priority: "high",
        estimatedHours: 8,
      },
      {
        id: "task_2",
        title: "Add validation logic",
        description: "Implement input validation",
        priority: "medium",
        estimatedHours: 4,
      },
      {
        id: "task_3",
        title: "Write tests",
        description: "Unit and integration tests",
        priority: "medium",
        estimatedHours: 6,
      },
    ];
    
    return {
      success: true,
      output: { tasks, totalEstimatedHours: 18 },
      duration: 0,
    };
  }

  /**
   * Execute agent assignment step
   */
  private async executeAgentAssignment(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepExecutionResult> {
    // Implementation for agent assignment
    // This would use the coordination engine to assign tasks
    
    const tasks = context.stepResults.task_generation.tasks;
    const assignments = [];
    
    for (const task of tasks) {
      const assignment = await this.coordinationEngine.assignTask({
        agentId: "", // Will be selected by coordination engine
        taskId: task.id,
        priority: task.priority === "high" ? 3 : task.priority === "medium" ? 2 : 1,
        estimatedDuration: task.estimatedHours * 3600000, // Convert to milliseconds
        requirements: ["coding", "testing"],
      });
      
      assignments.push({
        taskId: task.id,
        agentId: assignment.agentId,
        success: assignment.success,
      });
    }
    
    return {
      success: assignments.every(a => a.success),
      output: { assignments },
      duration: 0,
    };
  }

  /**
   * Execute task execution step
   */
  private async executeTaskExecution(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepExecutionResult> {
    // Implementation for task execution
    // This would monitor agent task execution via AgentAPI
    
    const assignments = context.stepResults.agent_assignment.assignments;
    const results = [];
    
    for (const assignment of assignments) {
      // Simulate task execution
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      results.push({
        taskId: assignment.taskId,
        agentId: assignment.agentId,
        status: "completed",
        output: `Task ${assignment.taskId} completed successfully`,
      });
    }
    
    return {
      success: true,
      output: { results },
      duration: 0,
    };
  }

  /**
   * Execute validation step
   */
  private async executeValidation(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepExecutionResult> {
    // Implementation for validation
    // This would run tests and quality checks
    
    const executionResults = context.stepResults.execution.results;
    const validationResults = {
      testsRun: 15,
      testsPassed: 14,
      testsFailed: 1,
      codeQuality: "good",
      coverage: 85,
      issues: [
        {
          type: "warning",
          message: "Minor code style issue",
          severity: "low",
        },
      ],
    };
    
    return {
      success: validationResults.testsFailed === 0,
      output: validationResults,
      duration: 0,
    };
  }

  /**
   * Execute deployment step
   */
  private async executeDeployment(
    step: WorkflowStep,
    context: WorkflowContext
  ): Promise<StepExecutionResult> {
    // Implementation for deployment
    // This would integrate with WSL2 deployment pipeline
    
    const validationResults = context.stepResults.validation;
    
    if (!validationResults.success) {
      return {
        success: false,
        error: "Validation failed, deployment aborted",
        duration: 0,
      };
    }
    
    const deploymentResult = {
      environment: step.parameters?.environment || "staging",
      deploymentId: `deploy_${Date.now()}`,
      url: "https://staging.example.com",
      status: "deployed",
      rollbackEnabled: step.parameters?.rollbackEnabled || false,
    };
    
    return {
      success: true,
      output: deploymentResult,
      duration: 0,
    };
  }

  /**
   * Start execution monitoring loop
   */
  private startExecutionLoop(): void {
    this.executionInterval = setInterval(async () => {
      await this.monitorExecutions();
    }, 10000); // Check every 10 seconds
  }

  /**
   * Monitor running executions
   */
  private async monitorExecutions(): Promise<void> {
    const runningExecutions = Array.from(this.executions.values()).filter(e => e.status === "running");
    
    for (const execution of runningExecutions) {
      // Check for timeout
      const elapsed = Date.now() - execution.startTime.getTime();
      const workflow = this.workflows.get(execution.workflowId);
      const timeout = workflow?.timeout || this.config.workflowTimeout;
      
      if (elapsed > timeout) {
        await this.cancelExecution(execution.id, "Workflow timeout");
      }
    }
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

