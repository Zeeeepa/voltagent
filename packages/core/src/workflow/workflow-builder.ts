import {
  RetryPolicy,
  ResourceRequirements,
  TaskDefinition,
  TaskId,
  TaskPriority,
  WorkflowDefinition,
} from "./types";

/**
 * WorkflowBuilder provides a fluent API for creating workflow definitions.
 */
export class WorkflowBuilder {
  private id: string;
  private name: string;
  private description?: string;
  private tasks: TaskDefinition[] = [];
  private concurrencyLimit?: number;
  private failFast: boolean = true;
  private tags?: string[];
  
  /**
   * Creates a new WorkflowBuilder
   * @param id Workflow ID
   * @param name Workflow name
   */
  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }
  
  /**
   * Sets the workflow description
   * @param description Workflow description
   * @returns This builder instance
   */
  public withDescription(description: string): WorkflowBuilder {
    this.description = description;
    return this;
  }
  
  /**
   * Adds a task to the workflow
   * @param task Task definition
   * @returns This builder instance
   */
  public addTask<TInput = any, TOutput = any>(task: TaskDefinition<TInput, TOutput>): WorkflowBuilder {
    this.tasks.push(task);
    return this;
  }
  
  /**
   * Sets the concurrency limit for the workflow
   * @param limit Maximum number of concurrent tasks
   * @returns This builder instance
   */
  public withConcurrencyLimit(limit: number): WorkflowBuilder {
    this.concurrencyLimit = limit;
    return this;
  }
  
  /**
   * Sets whether the workflow should fail fast
   * @param failFast Whether to fail the workflow on first task failure
   * @returns This builder instance
   */
  public withFailFast(failFast: boolean): WorkflowBuilder {
    this.failFast = failFast;
    return this;
  }
  
  /**
   * Sets tags for the workflow
   * @param tags Workflow tags
   * @returns This builder instance
   */
  public withTags(tags: string[]): WorkflowBuilder {
    this.tags = tags;
    return this;
  }
  
  /**
   * Builds the workflow definition
   * @returns Workflow definition
   */
  public build(): WorkflowDefinition {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      tasks: this.tasks,
      concurrencyLimit: this.concurrencyLimit,
      failFast: this.failFast,
      tags: this.tags,
    };
  }
}

/**
 * TaskBuilder provides a fluent API for creating task definitions.
 */
export class TaskBuilder<TInput = any, TOutput = any> {
  private id: TaskId;
  private name: string;
  private description?: string;
  private dependencies?: TaskId[];
  private execute: (input: TInput, options?: any) => Promise<TOutput>;
  private input?: TInput | ((results: Record<TaskId, any>) => TInput);
  private priority?: TaskPriority;
  private resources?: ResourceRequirements;
  private retryPolicy?: RetryPolicy;
  private timeout?: number;
  private failureMode?: "fail-workflow" | "continue-workflow";
  private isolationLevel?: "none" | "process" | "container";
  private tags?: string[];
  
  /**
   * Creates a new TaskBuilder
   * @param id Task ID
   * @param name Task name
   * @param execute Function to execute the task
   */
  constructor(id: TaskId, name: string, execute: (input: TInput, options?: any) => Promise<TOutput>) {
    this.id = id;
    this.name = name;
    this.execute = execute;
  }
  
  /**
   * Sets the task description
   * @param description Task description
   * @returns This builder instance
   */
  public withDescription(description: string): TaskBuilder<TInput, TOutput> {
    this.description = description;
    return this;
  }
  
  /**
   * Sets the task dependencies
   * @param dependencies Task IDs that this task depends on
   * @returns This builder instance
   */
  public withDependencies(dependencies: TaskId[]): TaskBuilder<TInput, TOutput> {
    this.dependencies = dependencies;
    return this;
  }
  
  /**
   * Sets the static input for the task
   * @param input Static input data
   * @returns This builder instance
   */
  public withInput(input: TInput): TaskBuilder<TInput, TOutput> {
    this.input = input;
    return this;
  }
  
  /**
   * Sets a function to derive input from previous results
   * @param inputFn Function to derive input
   * @returns This builder instance
   */
  public withInputFunction(inputFn: (results: Record<TaskId, any>) => TInput): TaskBuilder<TInput, TOutput> {
    this.input = inputFn;
    return this;
  }
  
  /**
   * Sets the task priority
   * @param priority Task priority
   * @returns This builder instance
   */
  public withPriority(priority: TaskPriority): TaskBuilder<TInput, TOutput> {
    this.priority = priority;
    return this;
  }
  
  /**
   * Sets the resource requirements for the task
   * @param resources Resource requirements
   * @returns This builder instance
   */
  public withResources(resources: ResourceRequirements): TaskBuilder<TInput, TOutput> {
    this.resources = resources;
    return this;
  }
  
  /**
   * Sets the retry policy for the task
   * @param retryPolicy Retry policy
   * @returns This builder instance
   */
  public withRetryPolicy(retryPolicy: RetryPolicy): TaskBuilder<TInput, TOutput> {
    this.retryPolicy = retryPolicy;
    return this;
  }
  
  /**
   * Sets the timeout for the task
   * @param timeout Timeout in milliseconds
   * @returns This builder instance
   */
  public withTimeout(timeout: number): TaskBuilder<TInput, TOutput> {
    this.timeout = timeout;
    return this;
  }
  
  /**
   * Sets the failure mode for the task
   * @param failureMode What to do if this task fails
   * @returns This builder instance
   */
  public withFailureMode(failureMode: "fail-workflow" | "continue-workflow"): TaskBuilder<TInput, TOutput> {
    this.failureMode = failureMode;
    return this;
  }
  
  /**
   * Sets the isolation level for the task
   * @param isolationLevel Level of isolation
   * @returns This builder instance
   */
  public withIsolationLevel(isolationLevel: "none" | "process" | "container"): TaskBuilder<TInput, TOutput> {
    this.isolationLevel = isolationLevel;
    return this;
  }
  
  /**
   * Sets tags for the task
   * @param tags Task tags
   * @returns This builder instance
   */
  public withTags(tags: string[]): TaskBuilder<TInput, TOutput> {
    this.tags = tags;
    return this;
  }
  
  /**
   * Builds the task definition
   * @returns Task definition
   */
  public build(): TaskDefinition<TInput, TOutput> {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      dependencies: this.dependencies,
      execute: this.execute,
      input: this.input,
      priority: this.priority,
      resources: this.resources,
      retryPolicy: this.retryPolicy,
      timeout: this.timeout,
      failureMode: this.failureMode,
      isolationLevel: this.isolationLevel,
      tags: this.tags,
    };
  }
}

