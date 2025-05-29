import { DatabaseManager } from "../database/manager";
import { 
  ProjectRepository, 
  PRRepository, 
  AnalysisResultRepository,
  TaskRepository,
  CodegenPromptRepository,
  WorkflowExecutionRepository 
} from "../database";
import { TaskQueue } from "./task-queue";
import { WorkflowEngine } from "./engine";
import { InfrastructureConfig, ModuleOutput, PR } from "../types";
import { WorkflowDefinition } from "./types";
import * as cron from "node-cron";

export class WorkflowOrchestrator {
  private db: DatabaseManager;
  private taskQueue: TaskQueue;
  private workflowEngine: WorkflowEngine;
  
  // Repositories
  private projectRepo: ProjectRepository;
  private prRepo: PRRepository;
  private analysisRepo: AnalysisResultRepository;
  private taskRepo: TaskRepository;
  private promptRepo: CodegenPromptRepository;
  private workflowRepo: WorkflowExecutionRepository;

  // Workflow definitions
  private workflows = new Map<string, WorkflowDefinition>();

  constructor(private config: InfrastructureConfig) {
    this.db = new DatabaseManager(config.database);
    this.taskQueue = new TaskQueue(config.redis);
    
    // Initialize repositories
    this.projectRepo = new ProjectRepository(this.db);
    this.prRepo = new PRRepository(this.db);
    this.analysisRepo = new AnalysisResultRepository(this.db);
    this.taskRepo = new TaskRepository(this.db);
    this.promptRepo = new CodegenPromptRepository(this.db);
    this.workflowRepo = new WorkflowExecutionRepository(this.db);

    // Initialize workflow engine
    this.workflowEngine = new WorkflowEngine(
      this.db,
      this.taskQueue,
      this.taskRepo,
      this.workflowRepo
    );
  }

  /**
   * Initialize the orchestrator
   */
  async initialize(): Promise<void> {
    try {
      // Initialize database
      await this.db.initialize();
      
      // Initialize task queue
      await this.taskQueue.initialize();

      // Register default workflows
      await this.registerDefaultWorkflows();

      // Start background tasks
      this.startBackgroundTasks();

      console.log("Workflow orchestrator initialized successfully");
    } catch (error) {
      console.error("Failed to initialize workflow orchestrator:", error);
      throw error;
    }
  }

  /**
   * Process a PR event (created, updated, etc.)
   */
  async processPREvent(
    repositoryId: string,
    prNumber: number,
    prData: {
      id: string;
      title: string;
      description?: string;
      author: string;
      status: PR["status"];
      baseBranch: string;
      headBranch: string;
    }
  ): Promise<ModuleOutput> {
    try {
      // Get or create project
      let project = await this.projectRepo.getByRepositoryId(repositoryId);
      if (!project) {
        project = await this.projectRepo.create({
          name: `Repository ${repositoryId}`,
          repository_url: `https://github.com/${repositoryId}`,
          repository_id: repositoryId,
        });
      }

      // Get or create PR
      let pr = await this.prRepo.getByProjectAndNumber(project.id, prNumber);
      if (!pr) {
        pr = await this.prRepo.create({
          project_id: project.id,
          pr_number: prNumber,
          pr_id: prData.id,
          title: prData.title,
          description: prData.description,
          author: prData.author,
          status: prData.status,
          base_branch: prData.baseBranch,
          head_branch: prData.headBranch,
          analysis_status: "pending",
        });
      } else {
        // Update existing PR
        await this.prRepo.updateStatus(pr.id, prData.status);
      }

      // Start PR analysis workflow
      const workflow = this.workflows.get("pr_analysis");
      if (workflow) {
        await this.workflowEngine.startWorkflow(
          pr.id,
          project.id,
          workflow,
          { repositoryId, prNumber, prData }
        );
      }

      // Get current analysis summary
      const summary = await this.prRepo.getAnalysisSummary(pr.id);
      const workflowExecution = await this.workflowRepo.getByPR(pr.id);

      return {
        module: "database_workflow_orchestration",
        workflow_status: workflowExecution?.status || "active",
        database: {
          pr_id: pr.id,
          analysis_complete: summary?.analysis_status === "completed",
          total_findings: summary?.total_findings || 0,
          critical_issues: summary?.critical_issues || 0,
          codegen_tasks: await this.getCodegenTasksSummary(pr.id),
        },
      };
    } catch (error) {
      console.error("Error processing PR event:", error);
      throw error;
    }
  }

  /**
   * Get codegen tasks summary for a PR
   */
  private async getCodegenTasksSummary(prId: string): Promise<ModuleOutput["database"]["codegen_tasks"]> {
    const tasks = await this.taskRepo.getByPR(prId);
    const codegenTasks = tasks.filter(task => task.task_type === "codegen");

    return codegenTasks.map(task => ({
      task_id: task.id,
      status: task.status,
      prompt: task.description,
      priority: task.priority,
    }));
  }

  /**
   * Register a workflow definition
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.name, workflow);
    console.log(`Registered workflow: ${workflow.name}`);
  }

  /**
   * Get workflow status for a PR
   */
  async getWorkflowStatus(prId: string): Promise<ModuleOutput> {
    const pr = await this.prRepo.getById(prId);
    if (!pr) {
      throw new Error(`PR ${prId} not found`);
    }

    const summary = await this.prRepo.getAnalysisSummary(prId);
    const workflowExecution = await this.workflowRepo.getByPR(prId);

    return {
      module: "database_workflow_orchestration",
      workflow_status: workflowExecution?.status || "active",
      database: {
        pr_id: prId,
        analysis_complete: summary?.analysis_status === "completed",
        total_findings: summary?.total_findings || 0,
        critical_issues: summary?.critical_issues || 0,
        codegen_tasks: await this.getCodegenTasksSummary(prId),
      },
    };
  }

  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<{
    database: boolean;
    taskQueue: boolean;
    workflows: number;
    activeExecutions: number;
  }> {
    const [dbHealth, queueHealth, activeExecutions] = await Promise.all([
      this.db.healthCheck(),
      this.taskQueue.healthCheck(),
      this.workflowRepo.getActiveWorkflows(),
    ]);

    return {
      database: dbHealth,
      taskQueue: queueHealth,
      workflows: this.workflows.size,
      activeExecutions: activeExecutions.length,
    };
  }

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<{
    database: any;
    taskQueue: any;
    workflows: any;
  }> {
    const [dbStats, queueStats, workflowStats] = await Promise.all([
      this.db.getStats(),
      this.taskQueue.getStats(),
      this.workflowRepo.getWorkflowStats(),
    ]);

    return {
      database: dbStats,
      taskQueue: queueStats,
      workflows: workflowStats,
    };
  }

  /**
   * Register default workflows
   */
  private async registerDefaultWorkflows(): Promise<void> {
    // PR Analysis Workflow
    const prAnalysisWorkflow: WorkflowDefinition = {
      name: "pr_analysis",
      description: "Comprehensive PR analysis workflow",
      version: "1.0.0",
      steps: [
        {
          id: "static_analysis",
          name: "Static Code Analysis",
          description: "Perform static code analysis",
          type: "analysis",
          timeout: 300000, // 5 minutes
        },
        {
          id: "security_scan",
          name: "Security Scan",
          description: "Scan for security vulnerabilities",
          type: "analysis",
          dependencies: ["static_analysis"],
        },
        {
          id: "performance_analysis",
          name: "Performance Analysis",
          description: "Analyze performance implications",
          type: "analysis",
          dependencies: ["static_analysis"],
        },
        {
          id: "generate_fixes",
          name: "Generate Code Fixes",
          description: "Generate automated fixes for issues",
          type: "codegen",
          dependencies: ["security_scan", "performance_analysis"],
        },
        {
          id: "validate_fixes",
          name: "Validate Fixes",
          description: "Validate generated fixes",
          type: "validation",
          dependencies: ["generate_fixes"],
        },
        {
          id: "notify_completion",
          name: "Notify Completion",
          description: "Send completion notification",
          type: "notification",
          dependencies: ["validate_fixes"],
        },
      ],
      triggers: [
        { type: "pr_created" },
        { type: "pr_updated" },
      ],
    };

    this.registerWorkflow(prAnalysisWorkflow);
  }

  /**
   * Start background tasks
   */
  private startBackgroundTasks(): void {
    // Task processor
    this.startTaskProcessor();

    // Cleanup tasks (every hour)
    cron.schedule("0 * * * *", async () => {
      await this.cleanupOldData();
    });

    // Health check (every 5 minutes)
    cron.schedule("*/5 * * * *", async () => {
      await this.performHealthCheck();
    });

    // Recover stale tasks (every 10 minutes)
    cron.schedule("*/10 * * * *", async () => {
      await this.taskQueue.recoverStaleTasks();
    });
  }

  /**
   * Start task processor
   */
  private startTaskProcessor(): void {
    const processTask = async () => {
      try {
        const queuedTask = await this.taskQueue.dequeue();
        if (queuedTask) {
          const result = await this.workflowEngine.executeTask(queuedTask.taskId);
          
          if (result.success) {
            await this.taskQueue.complete(queuedTask.id);
          } else {
            await this.taskQueue.fail(queuedTask.id, result.error || "Unknown error");
          }
        }
      } catch (error) {
        console.error("Error processing task:", error);
      }

      // Continue processing
      setTimeout(processTask, 1000); // 1 second delay
    };

    // Start multiple processors for concurrency
    const maxConcurrentTasks = this.config.workflow?.maxConcurrentTasks || 5;
    for (let i = 0; i < maxConcurrentTasks; i++) {
      processTask();
    }
  }

  /**
   * Cleanup old data
   */
  private async cleanupOldData(): Promise<void> {
    try {
      // TODO: Implement data retention policies
      console.log("Running data cleanup...");
    } catch (error) {
      console.error("Error during data cleanup:", error);
    }
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const health = await this.getHealthStatus();
      if (!health.database || !health.taskQueue) {
        console.warn("System health check failed:", health);
      }
    } catch (error) {
      console.error("Error during health check:", error);
    }
  }

  /**
   * Shutdown the orchestrator
   */
  async shutdown(): Promise<void> {
    try {
      await this.taskQueue.close();
      await this.db.close();
      console.log("Workflow orchestrator shutdown complete");
    } catch (error) {
      console.error("Error during shutdown:", error);
    }
  }
}

