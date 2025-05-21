import { Agent } from "../agent";
import { SubAgentManager } from "../agent/subagent";
import { DependencyManager, DependencyManagerEvent } from "./manager";
import { CreateDependencyOptions, CreateTaskOptions, DependencyType, Task, TaskStatus } from "./types";
import { EventEmitter } from "events";

/**
 * Events emitted by the DependencyWorkflowManager
 */
export enum DependencyWorkflowEvent {
  /**
   * Emitted when a task is started
   */
  TASK_STARTED = "task_started",

  /**
   * Emitted when a task is completed
   */
  TASK_COMPLETED = "task_completed",

  /**
   * Emitted when a task fails
   */
  TASK_FAILED = "task_failed",

  /**
   * Emitted when a workflow is started
   */
  WORKFLOW_STARTED = "workflow_started",

  /**
   * Emitted when a workflow is completed
   */
  WORKFLOW_COMPLETED = "workflow_completed",

  /**
   * Emitted when a workflow fails
   */
  WORKFLOW_FAILED = "workflow_failed",
}

/**
 * Options for creating a workflow
 */
export interface CreateWorkflowOptions {
  /**
   * Name of the workflow
   */
  name: string;

  /**
   * Description of the workflow
   */
  description?: string;

  /**
   * Tasks in the workflow
   */
  tasks: CreateTaskOptions[];

  /**
   * Dependencies between tasks
   */
  dependencies: CreateDependencyOptions[];
}

/**
 * Result of a task execution
 */
export interface TaskExecutionResult {
  /**
   * Task that was executed
   */
  task: Task;

  /**
   * Result of the execution
   */
  result: any;

  /**
   * Status of the execution
   */
  status: TaskStatus;

  /**
   * Error if the execution failed
   */
  error?: Error;
}

/**
 * Result of a workflow execution
 */
export interface WorkflowExecutionResult {
  /**
   * Name of the workflow
   */
  name: string;

  /**
   * Tasks that were executed
   */
  tasks: TaskExecutionResult[];

  /**
   * Status of the workflow
   */
  status: "completed" | "failed";

  /**
   * Error if the workflow failed
   */
  error?: Error;
}

/**
 * DependencyWorkflowManager - Integrates dependency management with agent workflows
 */
export class DependencyWorkflowManager extends EventEmitter {
  /**
   * The dependency manager
   */
  private dependencyManager: DependencyManager;

  /**
   * The supervisor agent
   */
  private supervisorAgent: Agent<any>;

  /**
   * The sub-agent manager
   */
  private subAgentManager: SubAgentManager;

  /**
   * Map of task IDs to agent IDs
   */
  private taskAgentMap: Map<string, string> = new Map();

  /**
   * Map of agent IDs to task IDs
   */
  private agentTaskMap: Map<string, string> = new Map();

  /**
   * Map of workflow names to task IDs
   */
  private workflowTasks: Map<string, string[]> = new Map();

  /**
   * Map of task IDs to execution results
   */
  private taskResults: Map<string, any> = new Map();

  /**
   * Creates a new DependencyWorkflowManager instance
   * @param supervisorAgent - The supervisor agent
   */
  constructor(supervisorAgent: Agent<any>) {
    super();
    this.dependencyManager = new DependencyManager();
    this.supervisorAgent = supervisorAgent;
    this.subAgentManager = new SubAgentManager(supervisorAgent.name);

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Set up event listeners for the dependency manager
   */
  private setupEventListeners(): void {
    // Listen for task status changes
    this.dependencyManager.on(DependencyManagerEvent.TASK_STATUS_CHANGED, (oldTask: Task, newTask: Task) => {
      if (newTask.status === TaskStatus.READY && oldTask.status === TaskStatus.PENDING) {
        // Task is now ready to be executed
        this.executeTask(newTask.id).catch(error => {
          console.error(`Error executing task ${newTask.id}:`, error);
          this.dependencyManager.updateTaskStatus(newTask.id, TaskStatus.FAILED);
        });
      }
    });

    // Listen for task completion
    this.dependencyManager.on(DependencyManagerEvent.TASK_COMPLETED, (task: Task) => {
      this.emit(DependencyWorkflowEvent.TASK_COMPLETED, task, this.taskResults.get(task.id));
      this.checkWorkflowCompletion(task);
    });

    // Listen for task failure
    this.dependencyManager.on(DependencyManagerEvent.TASK_FAILED, (task: Task) => {
      this.emit(DependencyWorkflowEvent.TASK_FAILED, task);
      this.checkWorkflowCompletion(task);
    });
  }

  /**
   * Check if a workflow is completed
   * @param task - The task that was completed or failed
   */
  private checkWorkflowCompletion(task: Task): void {
    // Find the workflow that contains this task
    for (const [workflowName, taskIds] of this.workflowTasks.entries()) {
      if (taskIds.includes(task.id)) {
        // Check if all tasks in the workflow are completed or failed
        const allTasksCompleted = taskIds.every(taskId => {
          const task = this.dependencyManager.getTask(taskId);
          return task && (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.FAILED);
        });

        if (allTasksCompleted) {
          // Check if any tasks failed
          const failedTasks = taskIds
            .map(taskId => this.dependencyManager.getTask(taskId))
            .filter(task => task && task.status === TaskStatus.FAILED);

          if (failedTasks.length > 0) {
            // Workflow failed
            this.emit(DependencyWorkflowEvent.WORKFLOW_FAILED, {
              name: workflowName,
              tasks: taskIds.map(taskId => {
                const task = this.dependencyManager.getTask(taskId)!;
                return {
                  task,
                  result: this.taskResults.get(taskId),
                  status: task.status,
                  error: task.status === TaskStatus.FAILED ? new Error("Task failed") : undefined,
                };
              }),
              status: "failed" as const,
              error: new Error(`Workflow failed: ${failedTasks.length} tasks failed`),
            });
          } else {
            // Workflow completed successfully
            this.emit(DependencyWorkflowEvent.WORKFLOW_COMPLETED, {
              name: workflowName,
              tasks: taskIds.map(taskId => {
                const task = this.dependencyManager.getTask(taskId)!;
                return {
                  task,
                  result: this.taskResults.get(taskId),
                  status: task.status,
                };
              }),
              status: "completed" as const,
            });
          }
        }
      }
    }
  }

  /**
   * Create a new workflow
   * @param options - Workflow creation options
   * @returns Array of created task IDs
   */
  public createWorkflow(options: CreateWorkflowOptions): string[] {
    const taskIds: string[] = [];

    // Create tasks
    for (const taskOptions of options.tasks) {
      const task = this.dependencyManager.createTask(taskOptions);
      taskIds.push(task.id);

      // Map task to agent if specified
      if (taskOptions.agentId) {
        this.taskAgentMap.set(task.id, taskOptions.agentId);
        this.agentTaskMap.set(taskOptions.agentId, task.id);
      }
    }

    // Create dependencies
    for (const dependencyOptions of options.dependencies) {
      this.dependencyManager.createDependency(dependencyOptions);
    }

    // Store workflow tasks
    this.workflowTasks.set(options.name, taskIds);

    return taskIds;
  }

  /**
   * Execute a task
   * @param taskId - Task ID
   * @returns Task execution result
   */
  public async executeTask(taskId: string): Promise<TaskExecutionResult> {
    const task = this.dependencyManager.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Check if the task is ready to be executed
    if (task.status !== TaskStatus.READY && task.status !== TaskStatus.PENDING) {
      throw new Error(`Task ${taskId} is not ready to be executed (status: ${task.status})`);
    }

    // Update task status to in-progress
    this.dependencyManager.updateTaskStatus(taskId, TaskStatus.IN_PROGRESS);
    this.emit(DependencyWorkflowEvent.TASK_STARTED, task);

    try {
      // Get the agent for this task
      const agentId = this.taskAgentMap.get(taskId) || task.agentId;
      if (!agentId) {
        throw new Error(`No agent assigned to task ${taskId}`);
      }

      // Find the agent in the sub-agents
      const agent = this.supervisorAgent.getSubAgents().find(a => a.id === agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found in sub-agents`);
      }

      // Execute the task using the agent
      const result = await agent.generateText([
        {
          role: "system",
          content: `Execute the following task: ${task.name}\n\n${task.description || ""}`,
        },
      ]);

      // Store the result
      this.taskResults.set(taskId, result.text);

      // Update task status to completed
      this.dependencyManager.updateTaskStatus(taskId, TaskStatus.COMPLETED);

      return {
        task,
        result: result.text,
        status: TaskStatus.COMPLETED,
      };
    } catch (error) {
      // Update task status to failed
      this.dependencyManager.updateTaskStatus(taskId, TaskStatus.FAILED);

      return {
        task,
        result: null,
        status: TaskStatus.FAILED,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }

  /**
   * Start a workflow
   * @param workflowName - Name of the workflow to start
   * @returns Promise that resolves when the workflow is completed
   */
  public async startWorkflow(workflowName: string): Promise<WorkflowExecutionResult> {
    const taskIds = this.workflowTasks.get(workflowName);
    if (!taskIds) {
      throw new Error(`Workflow ${workflowName} not found`);
    }

    // Emit workflow started event
    this.emit(DependencyWorkflowEvent.WORKFLOW_STARTED, { name: workflowName, taskIds });

    // Find tasks with no dependencies (entry points)
    const entryTasks = taskIds
      .map(id => this.dependencyManager.getTask(id))
      .filter(task => {
        if (!task) return false;
        const dependencies = this.dependencyManager.getDependenciesForTask(task.id);
        return dependencies.length === 0;
      }) as Task[];

    // Set entry tasks to ready
    for (const task of entryTasks) {
      this.dependencyManager.updateTaskStatus(task.id, TaskStatus.READY);
    }

    // Create a promise that resolves when the workflow is completed
    return new Promise((resolve, reject) => {
      const onWorkflowCompleted = (result: WorkflowExecutionResult) => {
        if (result.name === workflowName) {
          this.removeListener(DependencyWorkflowEvent.WORKFLOW_COMPLETED, onWorkflowCompleted);
          this.removeListener(DependencyWorkflowEvent.WORKFLOW_FAILED, onWorkflowFailed);
          resolve(result);
        }
      };

      const onWorkflowFailed = (result: WorkflowExecutionResult) => {
        if (result.name === workflowName) {
          this.removeListener(DependencyWorkflowEvent.WORKFLOW_COMPLETED, onWorkflowCompleted);
          this.removeListener(DependencyWorkflowEvent.WORKFLOW_FAILED, onWorkflowFailed);
          resolve(result); // Resolve with the failed result
        }
      };

      this.on(DependencyWorkflowEvent.WORKFLOW_COMPLETED, onWorkflowCompleted);
      this.on(DependencyWorkflowEvent.WORKFLOW_FAILED, onWorkflowFailed);

      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        this.removeListener(DependencyWorkflowEvent.WORKFLOW_COMPLETED, onWorkflowCompleted);
        this.removeListener(DependencyWorkflowEvent.WORKFLOW_FAILED, onWorkflowFailed);
        reject(new Error(`Workflow ${workflowName} timed out`));
      }, 30 * 60 * 1000); // 30 minutes timeout

      // Clear the timeout when the workflow completes
      this.once(DependencyWorkflowEvent.WORKFLOW_COMPLETED, () => clearTimeout(timeout));
      this.once(DependencyWorkflowEvent.WORKFLOW_FAILED, () => clearTimeout(timeout));
    });
  }

  /**
   * Get the dependency manager
   * @returns The dependency manager
   */
  public getDependencyManager(): DependencyManager {
    return this.dependencyManager;
  }

  /**
   * Add a sub-agent to the workflow manager
   * @param agent - The agent to add
   */
  public addAgent(agent: Agent<any>): void {
    this.supervisorAgent.addSubAgent(agent);
  }

  /**
   * Remove a sub-agent from the workflow manager
   * @param agentId - The ID of the agent to remove
   */
  public removeAgent(agentId: string): void {
    this.supervisorAgent.removeSubAgent(agentId);

    // Remove agent from task mappings
    const taskId = this.agentTaskMap.get(agentId);
    if (taskId) {
      this.taskAgentMap.delete(taskId);
      this.agentTaskMap.delete(agentId);
    }
  }

  /**
   * Assign an agent to a task
   * @param taskId - Task ID
   * @param agentId - Agent ID
   */
  public assignAgentToTask(taskId: string, agentId: string): void {
    const task = this.dependencyManager.getTask(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    const agent = this.supervisorAgent.getSubAgents().find(a => a.id === agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found in sub-agents`);
    }

    // Update task agent
    this.dependencyManager.updateTask(taskId, { agentId });

    // Update mappings
    this.taskAgentMap.set(taskId, agentId);
    this.agentTaskMap.set(agentId, taskId);
  }
}

