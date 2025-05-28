import type { Agent } from "../agent";
import type {
  WorkflowDefinition,
  WorkflowTask,
  TaskCondition,
  RetryPolicy,
  ErrorHandlingStrategy,
} from "./types";

/**
 * Validation result for workflows and tasks
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Workflow Validator for ensuring workflow definitions are correct
 */
export class WorkflowValidator {
  /**
   * Validate a complete workflow definition
   */
  public async validateWorkflow(
    workflow: WorkflowDefinition,
    availableAgents: Map<string, Agent<any>>
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic workflow validation
    this.validateBasicWorkflowStructure(workflow, errors);

    // Task validation
    this.validateTasks(workflow.tasks, availableAgents, errors, warnings);

    // Dependency validation
    this.validateDependencies(workflow.tasks, errors);

    // Execution mode specific validation
    this.validateExecutionMode(workflow, errors, warnings);

    // Retry policy validation
    if (workflow.retryPolicy) {
      this.validateRetryPolicy(workflow.retryPolicy, errors, warnings);
    }

    // Error handling validation
    if (workflow.errorHandling) {
      this.validateErrorHandling(workflow.errorHandling, errors, warnings);
    }

    // Performance and resource validation
    this.validatePerformanceConstraints(workflow, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate basic workflow structure
   */
  private validateBasicWorkflowStructure(workflow: WorkflowDefinition, errors: string[]): void {
    if (!workflow.id || typeof workflow.id !== "string" || workflow.id.trim() === "") {
      errors.push("Workflow ID is required and must be a non-empty string");
    }

    if (!workflow.name || typeof workflow.name !== "string" || workflow.name.trim() === "") {
      errors.push("Workflow name is required and must be a non-empty string");
    }

    if (!workflow.version || typeof workflow.version !== "string") {
      errors.push("Workflow version is required and must be a string");
    }

    if (!workflow.mode || !["sequential", "parallel", "conditional", "pipeline", "graph"].includes(workflow.mode)) {
      errors.push("Workflow mode must be one of: sequential, parallel, conditional, pipeline, graph");
    }

    if (!workflow.tasks || !Array.isArray(workflow.tasks) || workflow.tasks.length === 0) {
      errors.push("Workflow must have at least one task");
    }

    if (workflow.globalTimeout && (typeof workflow.globalTimeout !== "number" || workflow.globalTimeout <= 0)) {
      errors.push("Global timeout must be a positive number");
    }
  }

  /**
   * Validate workflow tasks
   */
  private validateTasks(
    tasks: WorkflowTask[],
    availableAgents: Map<string, Agent<any>>,
    errors: string[],
    warnings: string[]
  ): void {
    const taskIds = new Set<string>();

    for (const task of tasks) {
      // Check for duplicate task IDs
      if (taskIds.has(task.id)) {
        errors.push(`Duplicate task ID: ${task.id}`);
      } else {
        taskIds.add(task.id);
      }

      // Validate individual task
      this.validateTask(task, availableAgents, errors, warnings);
    }
  }

  /**
   * Validate a single task
   */
  private validateTask(
    task: WorkflowTask,
    availableAgents: Map<string, Agent<any>>,
    errors: string[],
    warnings: string[]
  ): void {
    if (!task.id || typeof task.id !== "string" || task.id.trim() === "") {
      errors.push("Task ID is required and must be a non-empty string");
    }

    if (!task.name || typeof task.name !== "string" || task.name.trim() === "") {
      errors.push(`Task ${task.id}: name is required and must be a non-empty string`);
    }

    if (!task.agentName || typeof task.agentName !== "string" || task.agentName.trim() === "") {
      errors.push(`Task ${task.id}: agentName is required and must be a non-empty string`);
    } else if (!availableAgents.has(task.agentName)) {
      errors.push(`Task ${task.id}: agent '${task.agentName}' is not available. Available agents: ${Array.from(availableAgents.keys()).join(", ")}`);
    }

    if (task.input === undefined || task.input === null) {
      errors.push(`Task ${task.id}: input is required`);
    }

    if (task.timeout && (typeof task.timeout !== "number" || task.timeout <= 0)) {
      errors.push(`Task ${task.id}: timeout must be a positive number`);
    }

    if (task.retries && (typeof task.retries !== "number" || task.retries < 0)) {
      errors.push(`Task ${task.id}: retries must be a non-negative number`);
    }

    // Validate task conditions
    if (task.conditions) {
      this.validateTaskConditions(task, errors, warnings);
    }

    // Performance warnings
    if (task.timeout && task.timeout > 300000) { // 5 minutes
      warnings.push(`Task ${task.id}: timeout is very long (${task.timeout}ms), consider breaking into smaller tasks`);
    }

    if (task.retries && task.retries > 5) {
      warnings.push(`Task ${task.id}: high retry count (${task.retries}), consider reviewing task reliability`);
    }
  }

  /**
   * Validate task conditions
   */
  private validateTaskConditions(task: WorkflowTask, errors: string[], warnings: string[]): void {
    if (!task.conditions || !Array.isArray(task.conditions)) {
      return;
    }

    for (const condition of task.conditions) {
      this.validateTaskCondition(task.id, condition, errors, warnings);
    }
  }

  /**
   * Validate a single task condition
   */
  private validateTaskCondition(
    taskId: string,
    condition: TaskCondition,
    errors: string[],
    warnings: string[]
  ): void {
    if (!["result", "status", "custom"].includes(condition.type)) {
      errors.push(`Task ${taskId}: condition type must be 'result', 'status', or 'custom'`);
    }

    if (!["equals", "not_equals", "contains", "greater_than", "less_than", "exists"].includes(condition.operator)) {
      errors.push(`Task ${taskId}: condition operator must be one of: equals, not_equals, contains, greater_than, less_than, exists`);
    }

    if (condition.type === "custom") {
      if (!condition.customEvaluator || typeof condition.customEvaluator !== "function") {
        errors.push(`Task ${taskId}: custom condition must have a customEvaluator function`);
      }
    } else {
      if (!condition.taskId || typeof condition.taskId !== "string") {
        errors.push(`Task ${taskId}: result/status conditions must specify a taskId`);
      }
    }

    if (condition.value === undefined && condition.operator !== "exists") {
      warnings.push(`Task ${taskId}: condition value is undefined, this may cause unexpected behavior`);
    }
  }

  /**
   * Validate task dependencies
   */
  private validateDependencies(tasks: WorkflowTask[], errors: string[]): void {
    const taskIds = new Set(tasks.map(task => task.id));

    for (const task of tasks) {
      if (task.dependencies) {
        for (const depId of task.dependencies) {
          if (!taskIds.has(depId)) {
            errors.push(`Task ${task.id}: dependency '${depId}' does not exist`);
          }

          if (depId === task.id) {
            errors.push(`Task ${task.id}: cannot depend on itself`);
          }
        }
      }
    }

    // Check for circular dependencies
    this.validateCircularDependencies(tasks, errors);
  }

  /**
   * Validate circular dependencies using DFS
   */
  private validateCircularDependencies(tasks: WorkflowTask[], errors: string[]): void {
    const taskMap = new Map(tasks.map(task => [task.id, task]));
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (taskId: string, path: string[]): boolean => {
      if (recursionStack.has(taskId)) {
        errors.push(`Circular dependency detected: ${path.join(" -> ")} -> ${taskId}`);
        return true;
      }

      if (visited.has(taskId)) {
        return false;
      }

      visited.add(taskId);
      recursionStack.add(taskId);

      const task = taskMap.get(taskId);
      if (task && task.dependencies) {
        for (const depId of task.dependencies) {
          if (hasCycle(depId, [...path, taskId])) {
            return true;
          }
        }
      }

      recursionStack.delete(taskId);
      return false;
    };

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        hasCycle(task.id, []);
      }
    }
  }

  /**
   * Validate execution mode specific requirements
   */
  private validateExecutionMode(workflow: WorkflowDefinition, errors: string[], warnings: string[]): void {
    switch (workflow.mode) {
      case "sequential":
        this.validateSequentialMode(workflow, warnings);
        break;
      case "parallel":
        this.validateParallelMode(workflow, warnings);
        break;
      case "conditional":
        this.validateConditionalMode(workflow, errors, warnings);
        break;
      case "pipeline":
        this.validatePipelineMode(workflow, errors, warnings);
        break;
      case "graph":
        this.validateGraphMode(workflow, errors, warnings);
        break;
    }
  }

  /**
   * Validate sequential execution mode
   */
  private validateSequentialMode(workflow: WorkflowDefinition, warnings: string[]): void {
    if (workflow.tasks.length > 20) {
      warnings.push("Sequential workflow has many tasks, consider breaking into smaller workflows or using parallel execution");
    }

    // Check if any tasks have dependencies (not needed in sequential mode)
    const tasksWithDeps = workflow.tasks.filter(task => task.dependencies && task.dependencies.length > 0);
    if (tasksWithDeps.length > 0) {
      warnings.push("Sequential mode ignores task dependencies, consider using graph mode if dependencies are important");
    }
  }

  /**
   * Validate parallel execution mode
   */
  private validateParallelMode(workflow: WorkflowDefinition, warnings: string[]): void {
    if (workflow.tasks.length > 50) {
      warnings.push("Parallel workflow has many tasks, this may overwhelm system resources");
    }

    // Check if any tasks have dependencies (not ideal for parallel mode)
    const tasksWithDeps = workflow.tasks.filter(task => task.dependencies && task.dependencies.length > 0);
    if (tasksWithDeps.length > 0) {
      warnings.push("Parallel mode ignores task dependencies, consider using graph mode for dependent tasks");
    }
  }

  /**
   * Validate conditional execution mode
   */
  private validateConditionalMode(workflow: WorkflowDefinition, errors: string[], warnings: string[]): void {
    const tasksWithoutConditions = workflow.tasks.filter(task => !task.conditions || task.conditions.length === 0);
    
    if (tasksWithoutConditions.length === workflow.tasks.length) {
      warnings.push("Conditional workflow has no tasks with conditions, consider using sequential mode");
    }

    if (tasksWithoutConditions.length > 0) {
      warnings.push(`${tasksWithoutConditions.length} tasks have no conditions and will always execute`);
    }
  }

  /**
   * Validate pipeline execution mode
   */
  private validatePipelineMode(workflow: WorkflowDefinition, errors: string[], warnings: string[]): void {
    if (workflow.tasks.length < 2) {
      warnings.push("Pipeline mode is most effective with multiple tasks that process data sequentially");
    }

    // Check if tasks are designed for data flow
    const tasksWithObjectInput = workflow.tasks.filter(task => typeof task.input === "object");
    if (tasksWithObjectInput.length === 0) {
      warnings.push("Pipeline mode works best when tasks can accept structured data input");
    }
  }

  /**
   * Validate graph execution mode
   */
  private validateGraphMode(workflow: WorkflowDefinition, errors: string[], warnings: string[]): void {
    const tasksWithDeps = workflow.tasks.filter(task => task.dependencies && task.dependencies.length > 0);
    
    if (tasksWithDeps.length === 0) {
      warnings.push("Graph mode is most effective when tasks have dependencies, consider using parallel mode");
    }

    // Check for isolated tasks (no dependencies and no dependents)
    const dependentTasks = new Set<string>();
    workflow.tasks.forEach(task => {
      if (task.dependencies) {
        task.dependencies.forEach(depId => dependentTasks.add(depId));
      }
    });

    const isolatedTasks = workflow.tasks.filter(task => 
      (!task.dependencies || task.dependencies.length === 0) && 
      !dependentTasks.has(task.id)
    );

    if (isolatedTasks.length > 0) {
      warnings.push(`${isolatedTasks.length} tasks are isolated (no dependencies or dependents): ${isolatedTasks.map(t => t.id).join(", ")}`);
    }
  }

  /**
   * Validate retry policy
   */
  private validateRetryPolicy(policy: RetryPolicy, errors: string[], warnings: string[]): void {
    if (typeof policy.maxRetries !== "number" || policy.maxRetries < 0) {
      errors.push("Retry policy maxRetries must be a non-negative number");
    }

    if (!["linear", "exponential", "fixed"].includes(policy.backoffStrategy)) {
      errors.push("Retry policy backoffStrategy must be 'linear', 'exponential', or 'fixed'");
    }

    if (typeof policy.baseDelay !== "number" || policy.baseDelay <= 0) {
      errors.push("Retry policy baseDelay must be a positive number");
    }

    if (policy.maxDelay && (typeof policy.maxDelay !== "number" || policy.maxDelay <= policy.baseDelay)) {
      errors.push("Retry policy maxDelay must be greater than baseDelay");
    }

    if (policy.maxRetries > 10) {
      warnings.push("High retry count may indicate underlying issues with task reliability");
    }

    if (policy.baseDelay > 60000) { // 1 minute
      warnings.push("Long base delay may significantly impact workflow execution time");
    }
  }

  /**
   * Validate error handling strategy
   */
  private validateErrorHandling(strategy: ErrorHandlingStrategy, errors: string[], warnings: string[]): void {
    if (!["stop", "continue", "retry", "skip_dependents"].includes(strategy.onTaskFailure)) {
      errors.push("Error handling onTaskFailure must be 'stop', 'continue', 'retry', or 'skip_dependents'");
    }

    if (!["stop", "rollback", "partial_complete"].includes(strategy.onWorkflowFailure)) {
      errors.push("Error handling onWorkflowFailure must be 'stop', 'rollback', or 'partial_complete'");
    }

    if (strategy.customErrorHandler && typeof strategy.customErrorHandler !== "function") {
      errors.push("Custom error handler must be a function");
    }

    if (strategy.onTaskFailure === "continue" && strategy.onWorkflowFailure === "stop") {
      warnings.push("Inconsistent error handling: tasks continue on failure but workflow stops on failure");
    }
  }

  /**
   * Validate performance constraints
   */
  private validatePerformanceConstraints(workflow: WorkflowDefinition, warnings: string[]): void {
    const totalTasks = workflow.tasks.length;
    const tasksWithTimeout = workflow.tasks.filter(task => task.timeout).length;
    const avgTimeout = workflow.tasks
      .filter(task => task.timeout)
      .reduce((sum, task) => sum + (task.timeout || 0), 0) / (tasksWithTimeout || 1);

    if (totalTasks > 100) {
      warnings.push(`Workflow has ${totalTasks} tasks, consider breaking into smaller workflows for better maintainability`);
    }

    if (workflow.mode === "sequential" && avgTimeout > 30000) { // 30 seconds
      warnings.push("Sequential workflow with long-running tasks may have poor user experience");
    }

    if (workflow.mode === "parallel" && totalTasks > 20) {
      warnings.push("Large parallel workflows may overwhelm system resources");
    }

    // Check for potential memory issues
    const tasksWithLargeInput = workflow.tasks.filter(task => 
      typeof task.input === "object" && JSON.stringify(task.input).length > 10000
    );

    if (tasksWithLargeInput.length > 0) {
      warnings.push(`${tasksWithLargeInput.length} tasks have large input data, monitor memory usage`);
    }
  }

  /**
   * Validate workflow for specific agent capabilities
   */
  public validateAgentCompatibility(
    workflow: WorkflowDefinition,
    agent: Agent<any>
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const agentTasks = workflow.tasks.filter(task => task.agentName === agent.name);

    if (agentTasks.length === 0) {
      warnings.push(`Agent ${agent.name} is not used in this workflow`);
      return { isValid: true, errors, warnings };
    }

    // Check if agent has required tools for complex tasks
    const complexTasks = agentTasks.filter(task => 
      typeof task.input === "object" || 
      (task.conditions && task.conditions.length > 0)
    );

    if (complexTasks.length > 0 && (!agent.tools || agent.tools.length === 0)) {
      warnings.push(`Agent ${agent.name} handles complex tasks but has no tools configured`);
    }

    // Check agent memory configuration for workflows with context sharing
    if (workflow.mode === "pipeline" || workflow.mode === "graph") {
      if (!agent.memory) {
        warnings.push(`Agent ${agent.name} should have memory configured for context-aware workflows`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

