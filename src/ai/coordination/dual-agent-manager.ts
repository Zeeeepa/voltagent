/**
 * Dual Agent Manager
 * 
 * Coordination between Codegen SDK and Claude Code agents
 */

import { TaskRouter, TaskRequest, TaskType, TaskPriority, AgentType, RoutingDecision } from './task-router.js';
import { CodegenSDKClient } from '../../middleware/codegen/sdk-client.js';

export interface AgentSession {
  id: string;
  agentType: AgentType;
  status: AgentStatus;
  currentTask?: TaskRequest;
  startTime: Date;
  lastActivity: Date;
  capabilities: string[];
}

export enum AgentStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  ERROR = 'error',
  OFFLINE = 'offline'
}

export interface HandoffRequest {
  fromAgent: AgentType;
  toAgent: AgentType;
  taskId: string;
  reason: string;
  context: any;
  priority: TaskPriority;
}

export interface AgentResponse {
  taskId: string;
  agentType: AgentType;
  status: 'success' | 'failure' | 'partial';
  result?: any;
  error?: string;
  duration: number;
  requiresHandoff?: boolean;
  handoffReason?: string;
}

export interface CoordinationMetrics {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  handoffs: number;
  averageTaskDuration: number;
  agentUtilization: Record<string, number>;
}

export class DualAgentManager {
  private taskRouter: TaskRouter;
  private codegenClient?: CodegenSDKClient;
  private sessions: Map<string, AgentSession> = new Map();
  private taskQueue: TaskRequest[] = [];
  private activeHandoffs: Map<string, HandoffRequest> = new Map();
  private metrics: CoordinationMetrics = {
    totalTasks: 0,
    completedTasks: 0,
    failedTasks: 0,
    handoffs: 0,
    averageTaskDuration: 0,
    agentUtilization: {}
  };

  constructor(taskRouter: TaskRouter, codegenClient?: CodegenSDKClient) {
    this.taskRouter = taskRouter;
    this.codegenClient = codegenClient;
    this.initializeSessions();
  }

  /**
   * Initialize agent sessions
   */
  private initializeSessions(): void {
    // Initialize Codegen SDK session
    this.sessions.set('codegen-sdk', {
      id: 'codegen-sdk',
      agentType: AgentType.CODEGEN_SDK,
      status: this.codegenClient ? AgentStatus.IDLE : AgentStatus.OFFLINE,
      startTime: new Date(),
      lastActivity: new Date(),
      capabilities: [
        'code_generation',
        'repository_operations',
        'pull_request_management',
        'large_scale_refactoring'
      ]
    });

    // Initialize Claude Code session
    this.sessions.set('claude-code', {
      id: 'claude-code',
      agentType: AgentType.CLAUDE_CODE,
      status: AgentStatus.IDLE,
      startTime: new Date(),
      lastActivity: new Date(),
      capabilities: [
        'interactive_coding',
        'code_explanation',
        'debugging',
        'documentation'
      ]
    });
  }

  /**
   * Submit task for processing
   */
  async submitTask(task: TaskRequest): Promise<string> {
    this.metrics.totalTasks++;
    
    // Route task to appropriate agent
    const routing = await this.taskRouter.routeTask(task);
    
    // Add to queue if agent is busy
    const session = this.getSessionByAgentType(routing.selectedAgent);
    if (!session || session.status !== AgentStatus.IDLE) {
      this.taskQueue.push(task);
      return `Task ${task.id} queued for ${routing.selectedAgent}`;
    }

    // Execute task immediately
    return this.executeTask(task, routing);
  }

  /**
   * Execute task with selected agent
   */
  private async executeTask(task: TaskRequest, routing: RoutingDecision): Promise<string> {
    const session = this.getSessionByAgentType(routing.selectedAgent);
    if (!session) {
      throw new Error(`No session found for agent type: ${routing.selectedAgent}`);
    }

    // Update session status
    session.status = AgentStatus.BUSY;
    session.currentTask = task;
    session.lastActivity = new Date();

    try {
      const startTime = Date.now();
      let response: AgentResponse;

      // Execute based on agent type
      if (routing.selectedAgent === AgentType.CODEGEN_SDK) {
        response = await this.executeCodegenTask(task);
      } else {
        response = await this.executeClaudeTask(task);
      }

      const duration = Date.now() - startTime;
      response.duration = duration;

      // Update metrics
      this.updateMetrics(response);

      // Handle handoff if required
      if (response.requiresHandoff && routing.fallbackAgent) {
        return this.initiateHandoff(task, routing.selectedAgent, routing.fallbackAgent, response.handoffReason || 'Task requires different capabilities');
      }

      // Mark session as idle
      session.status = AgentStatus.IDLE;
      session.currentTask = undefined;

      // Process next task in queue
      this.processQueue();

      return `Task ${task.id} completed by ${routing.selectedAgent}`;
    } catch (error) {
      session.status = AgentStatus.ERROR;
      this.metrics.failedTasks++;
      
      // Try fallback agent if available
      if (routing.fallbackAgent) {
        return this.initiateHandoff(task, routing.selectedAgent, routing.fallbackAgent, `Primary agent failed: ${error}`);
      }
      
      throw error;
    }
  }

  /**
   * Execute task with Codegen SDK
   */
  private async executeCodegenTask(task: TaskRequest): Promise<AgentResponse> {
    if (!this.codegenClient) {
      throw new Error('Codegen SDK client not available');
    }

    try {
      let result: any;

      switch (task.type) {
        case TaskType.CODE_GENERATION:
          result = await this.codegenClient.generateCode({
            prompt: task.description,
            context: task.context?.codeContext,
            options: task.context?.options
          });
          break;

        case TaskType.CODE_MODIFICATION:
          result = await this.codegenClient.modifyCode(
            task.context?.filePath,
            task.description,
            task.context?.codeContext
          );
          break;

        case TaskType.CODE_REVIEW:
          result = await this.codegenClient.reviewCode(
            task.context?.filePath,
            task.description
          );
          break;

        case TaskType.REPOSITORY_OPERATION:
          // Handle repository operations
          result = await this.handleRepositoryOperation(task);
          break;

        default:
          throw new Error(`Unsupported task type for Codegen SDK: ${task.type}`);
      }

      return {
        taskId: task.id,
        agentType: AgentType.CODEGEN_SDK,
        status: 'success',
        result,
        duration: 0 // Will be set by caller
      };
    } catch (error) {
      return {
        taskId: task.id,
        agentType: AgentType.CODEGEN_SDK,
        status: 'failure',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: 0,
        requiresHandoff: true,
        handoffReason: 'Codegen SDK execution failed'
      };
    }
  }

  /**
   * Execute task with Claude Code
   */
  private async executeClaudeTask(task: TaskRequest): Promise<AgentResponse> {
    // This would integrate with Claude Code API or local instance
    // For now, we'll simulate the response
    
    try {
      // Simulate Claude Code processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if task requires repository access
      if (task.type === TaskType.REPOSITORY_OPERATION || 
          task.type === TaskType.PULL_REQUEST_MANAGEMENT) {
        return {
          taskId: task.id,
          agentType: AgentType.CLAUDE_CODE,
          status: 'partial',
          result: 'Task analysis completed, but requires repository access',
          duration: 0,
          requiresHandoff: true,
          handoffReason: 'Repository operations require Codegen SDK'
        };
      }

      return {
        taskId: task.id,
        agentType: AgentType.CLAUDE_CODE,
        status: 'success',
        result: `Claude Code completed ${task.type} task: ${task.description}`,
        duration: 0
      };
    } catch (error) {
      return {
        taskId: task.id,
        agentType: AgentType.CLAUDE_CODE,
        status: 'failure',
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: 0
      };
    }
  }

  /**
   * Handle repository operations
   */
  private async handleRepositoryOperation(task: TaskRequest): Promise<any> {
    if (!this.codegenClient) {
      throw new Error('Codegen SDK client required for repository operations');
    }

    const { operation, repoUrl, branchName, ...params } = task.context || {};

    switch (operation) {
      case 'create_branch':
        return this.codegenClient.createBranch(repoUrl, branchName, params.baseBranch);
      
      case 'create_pr':
        return this.codegenClient.createPullRequest({
          repoUrl,
          title: params.title,
          description: params.description,
          headBranch: params.headBranch,
          baseBranch: params.baseBranch
        });
      
      case 'create_issue':
        return this.codegenClient.createIssue({
          repoUrl,
          title: params.title,
          description: params.description,
          labels: params.labels
        });
      
      default:
        throw new Error(`Unsupported repository operation: ${operation}`);
    }
  }

  /**
   * Initiate handoff between agents
   */
  private async initiateHandoff(
    task: TaskRequest,
    fromAgent: AgentType,
    toAgent: AgentType,
    reason: string
  ): Promise<string> {
    const handoffRequest: HandoffRequest = {
      fromAgent,
      toAgent,
      taskId: task.id,
      reason,
      context: task.context,
      priority: task.priority
    };

    this.activeHandoffs.set(task.id, handoffRequest);
    this.metrics.handoffs++;

    // Update task context with handoff information
    task.context = {
      ...task.context,
      handoffFrom: fromAgent,
      handoffReason: reason
    };

    // Route to new agent
    const newRouting: RoutingDecision = {
      selectedAgent: toAgent,
      confidence: 0.8,
      reasoning: `Handoff from ${fromAgent}: ${reason}`,
      estimatedDuration: 30
    };

    return this.executeTask(task, newRouting);
  }

  /**
   * Process task queue
   */
  private processQueue(): void {
    if (this.taskQueue.length === 0) return;

    // Find idle agents
    const idleSessions = Array.from(this.sessions.values())
      .filter(session => session.status === AgentStatus.IDLE);

    if (idleSessions.length === 0) return;

    // Process tasks for idle agents
    for (const session of idleSessions) {
      if (this.taskQueue.length === 0) break;

      const task = this.taskQueue.shift();
      if (task) {
        this.taskRouter.routeTask(task).then(routing => {
          if (routing.selectedAgent === session.agentType) {
            this.executeTask(task, routing);
          } else {
            // Re-queue if not for this agent
            this.taskQueue.unshift(task);
          }
        });
      }
    }
  }

  /**
   * Update coordination metrics
   */
  private updateMetrics(response: AgentResponse): void {
    if (response.status === 'success') {
      this.metrics.completedTasks++;
    } else if (response.status === 'failure') {
      this.metrics.failedTasks++;
    }

    // Update average duration
    const totalCompleted = this.metrics.completedTasks + this.metrics.failedTasks;
    this.metrics.averageTaskDuration = 
      (this.metrics.averageTaskDuration * (totalCompleted - 1) + response.duration) / totalCompleted;

    // Update agent utilization
    const agentKey = response.agentType;
    this.metrics.agentUtilization[agentKey] = 
      (this.metrics.agentUtilization[agentKey] || 0) + 1;
  }

  /**
   * Get session by agent type
   */
  private getSessionByAgentType(agentType: AgentType): AgentSession | undefined {
    return Array.from(this.sessions.values())
      .find(session => session.agentType === agentType);
  }

  /**
   * Get current status of all agents
   */
  getAgentStatus(): AgentSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get coordination metrics
   */
  getMetrics(): CoordinationMetrics {
    return { ...this.metrics };
  }

  /**
   * Get active handoffs
   */
  getActiveHandoffs(): HandoffRequest[] {
    return Array.from(this.activeHandoffs.values());
  }

  /**
   * Update agent health status
   */
  updateAgentHealth(agentType: AgentType, status: AgentStatus): void {
    const session = this.getSessionByAgentType(agentType);
    if (session) {
      session.status = status;
      session.lastActivity = new Date();
      
      // Update task router
      this.taskRouter.updateAgentAvailability(
        agentType, 
        status === AgentStatus.IDLE || status === AgentStatus.BUSY
      );
    }
  }

  /**
   * Shutdown coordination
   */
  async shutdown(): Promise<void> {
    // Wait for active tasks to complete
    const activeSessions = Array.from(this.sessions.values())
      .filter(session => session.status === AgentStatus.BUSY);

    if (activeSessions.length > 0) {
      console.log(`Waiting for ${activeSessions.length} active tasks to complete...`);
      
      // Wait up to 30 seconds for tasks to complete
      const timeout = 30000;
      const startTime = Date.now();
      
      while (activeSessions.some(s => s.status === AgentStatus.BUSY) && 
             Date.now() - startTime < timeout) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Mark all sessions as offline
    for (const session of this.sessions.values()) {
      session.status = AgentStatus.OFFLINE;
    }

    console.log('Dual Agent Manager shutdown complete');
  }
}
