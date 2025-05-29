import { EventEmitter } from "events";
import type { Agent } from "../agent";
import type {
  AgentAssignment,
  WorkflowExecution,
  WorkflowStep,
  WorkflowStatus,
  SystemEvent,
  OrchestratorConfig,
  LoadBalancingStrategy,
} from "./types";
import type { EventDispatcher } from "./event-dispatcher";

/**
 * Agent state interface
 */
interface AgentState {
  id: string;
  agent: Agent<any>;
  isAvailable: boolean;
  currentTasks: string[];
  performance: {
    averageResponseTime: number;
    successRate: number;
    totalTasks: number;
    completedTasks: number;
  };
  lastActivity: Date;
  capabilities: string[];
  metadata?: Record<string, any>;
}

/**
 * Task assignment result
 */
interface TaskAssignmentResult {
  success: boolean;
  agentId?: string;
  reason?: string;
  estimatedDuration?: number;
}

/**
 * Coordination Engine for managing dual AI agent coordination
 */
export class CoordinationEngine extends EventEmitter {
  private agents: Map<string, AgentState> = new Map();
  private activeWorkflows: Map<string, WorkflowExecution> = new Map();
  private taskQueue: AgentAssignment[] = [];
  private eventDispatcher: EventDispatcher;
  private config: OrchestratorConfig;
  private isRunning = false;
  private coordinationInterval?: NodeJS.Timeout;

  constructor(eventDispatcher: EventDispatcher, config: OrchestratorConfig) {
    super();
    this.eventDispatcher = eventDispatcher;
    this.config = config;
    this.setupEventHandlers();
  }

  /**
   * Start the coordination engine
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.startCoordinationLoop();
    
    await this.eventDispatcher.createEvent(
      "coordination:started",
      "coordination-engine",
      { timestamp: new Date() }
    );
  }

  /**
   * Stop the coordination engine
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.coordinationInterval) {
      clearInterval(this.coordinationInterval);
      this.coordinationInterval = undefined;
    }

    // Cancel all active workflows
    for (const workflow of this.activeWorkflows.values()) {
      await this.cancelWorkflow(workflow.id, "System shutdown");
    }

    await this.eventDispatcher.createEvent(
      "coordination:stopped",
      "coordination-engine",
      { timestamp: new Date() }
    );
  }

  /**
   * Register an agent with the coordination engine
   */
  public async registerAgent(agent: Agent<any>): Promise<void> {
    const agentState: AgentState = {
      id: agent.id,
      agent,
      isAvailable: true,
      currentTasks: [],
      performance: {
        averageResponseTime: 0,
        successRate: 1.0,
        totalTasks: 0,
        completedTasks: 0,
      },
      lastActivity: new Date(),
      capabilities: this.extractAgentCapabilities(agent),
    };

    this.agents.set(agent.id, agentState);
    
    await this.eventDispatcher.createEvent(
      "agent:registered",
      "coordination-engine",
      { agentId: agent.id, capabilities: agentState.capabilities }
    );
  }

  /**
   * Unregister an agent from the coordination engine
   */
  public async unregisterAgent(agentId: string): Promise<void> {
    const agentState = this.agents.get(agentId);
    if (!agentState) {
      return;
    }

    // Cancel any tasks assigned to this agent
    for (const taskId of agentState.currentTasks) {
      await this.cancelTask(taskId, "Agent unregistered");
    }

    this.agents.delete(agentId);
    
    await this.eventDispatcher.createEvent(
      "agent:unregistered",
      "coordination-engine",
      { agentId }
    );
  }

  /**
   * Assign a task to an appropriate agent
   */
  public async assignTask(assignment: AgentAssignment): Promise<TaskAssignmentResult> {
    try {
      // Find the best agent for this task
      const selectedAgent = await this.selectAgent(assignment);
      
      if (!selectedAgent) {
        // Add to queue if no agent is available
        this.taskQueue.push(assignment);
        
        await this.eventDispatcher.createEvent(
          "task:queued",
          "coordination-engine",
          { taskId: assignment.taskId, reason: "No available agent" }
        );
        
        return {
          success: false,
          reason: "No available agent, task queued",
        };
      }

      // Assign task to agent
      const agentState = this.agents.get(selectedAgent.id)!;
      agentState.currentTasks.push(assignment.taskId);
      agentState.isAvailable = agentState.currentTasks.length < this.getMaxConcurrentTasks(selectedAgent);
      agentState.lastActivity = new Date();

      await this.eventDispatcher.createEvent(
        "task:assigned",
        "coordination-engine",
        {
          taskId: assignment.taskId,
          agentId: selectedAgent.id,
          priority: assignment.priority,
          estimatedDuration: assignment.estimatedDuration,
        }
      );

      return {
        success: true,
        agentId: selectedAgent.id,
        estimatedDuration: assignment.estimatedDuration,
      };
    } catch (error) {
      await this.eventDispatcher.createEvent(
        "task:assignment_failed",
        "coordination-engine",
        {
          taskId: assignment.taskId,
          error: error instanceof Error ? error.message : "Unknown error",
        }
      );

      return {
        success: false,
        reason: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Complete a task and update agent state
   */
  public async completeTask(
    taskId: string,
    agentId: string,
    result: { success: boolean; duration: number; error?: string }
  ): Promise<void> {
    const agentState = this.agents.get(agentId);
    if (!agentState) {
      return;
    }

    // Remove task from agent's current tasks
    const taskIndex = agentState.currentTasks.indexOf(taskId);
    if (taskIndex > -1) {
      agentState.currentTasks.splice(taskIndex, 1);
    }

    // Update agent performance metrics
    agentState.performance.totalTasks++;
    if (result.success) {
      agentState.performance.completedTasks++;
    }
    
    agentState.performance.successRate = 
      agentState.performance.completedTasks / agentState.performance.totalTasks;
    
    // Update average response time
    if (agentState.performance.averageResponseTime === 0) {
      agentState.performance.averageResponseTime = result.duration;
    } else {
      agentState.performance.averageResponseTime = 
        (agentState.performance.averageResponseTime + result.duration) / 2;
    }

    // Mark agent as available if under task limit
    agentState.isAvailable = agentState.currentTasks.length < this.getMaxConcurrentTasks(agentState.agent);
    agentState.lastActivity = new Date();

    await this.eventDispatcher.createEvent(
      "task:completed",
      "coordination-engine",
      {
        taskId,
        agentId,
        success: result.success,
        duration: result.duration,
        error: result.error,
        agentPerformance: agentState.performance,
      }
    );

    // Process queued tasks if agent is now available
    if (agentState.isAvailable && this.taskQueue.length > 0) {
      await this.processTaskQueue();
    }
  }

  /**
   * Cancel a task
   */
  public async cancelTask(taskId: string, reason: string): Promise<void> {
    // Find and remove from agent's current tasks
    for (const agentState of this.agents.values()) {
      const taskIndex = agentState.currentTasks.indexOf(taskId);
      if (taskIndex > -1) {
        agentState.currentTasks.splice(taskIndex, 1);
        agentState.isAvailable = agentState.currentTasks.length < this.getMaxConcurrentTasks(agentState.agent);
        
        await this.eventDispatcher.createEvent(
          "task:cancelled",
          "coordination-engine",
          { taskId, agentId: agentState.id, reason }
        );
        break;
      }
    }

    // Remove from queue if present
    const queueIndex = this.taskQueue.findIndex(t => t.taskId === taskId);
    if (queueIndex > -1) {
      this.taskQueue.splice(queueIndex, 1);
    }
  }

  /**
   * Start a workflow execution
   */
  public async startWorkflow(workflow: WorkflowExecution): Promise<void> {
    this.activeWorkflows.set(workflow.id, workflow);
    
    await this.eventDispatcher.createEvent(
      "workflow:started",
      "coordination-engine",
      {
        workflowId: workflow.id,
        workflowDefinitionId: workflow.workflowId,
        startTime: workflow.startTime,
      }
    );
  }

  /**
   * Update workflow status
   */
  public async updateWorkflowStatus(
    workflowId: string,
    status: WorkflowStatus,
    currentStep?: string,
    results?: Record<string, any>
  ): Promise<void> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      return;
    }

    workflow.status = status;
    if (currentStep) {
      workflow.currentStep = currentStep;
    }
    if (results) {
      workflow.results = { ...workflow.results, ...results };
    }

    if (status === "completed" || status === "failed" || status === "cancelled") {
      workflow.endTime = new Date();
      this.activeWorkflows.delete(workflowId);
    }

    await this.eventDispatcher.createEvent(
      "workflow:status_updated",
      "coordination-engine",
      {
        workflowId,
        status,
        currentStep,
        results,
        endTime: workflow.endTime,
      }
    );
  }

  /**
   * Cancel a workflow
   */
  public async cancelWorkflow(workflowId: string, reason: string): Promise<void> {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      return;
    }

    workflow.status = "cancelled";
    workflow.endTime = new Date();
    this.activeWorkflows.delete(workflowId);

    await this.eventDispatcher.createEvent(
      "workflow:cancelled",
      "coordination-engine",
      { workflowId, reason }
    );
  }

  /**
   * Get agent statistics
   */
  public getAgentStats(): Record<string, any> {
    const stats = {
      totalAgents: this.agents.size,
      availableAgents: 0,
      busyAgents: 0,
      totalTasks: 0,
      queuedTasks: this.taskQueue.length,
      activeWorkflows: this.activeWorkflows.size,
      agentPerformance: {} as Record<string, any>,
    };

    for (const agentState of this.agents.values()) {
      if (agentState.isAvailable) {
        stats.availableAgents++;
      } else {
        stats.busyAgents++;
      }
      
      stats.totalTasks += agentState.currentTasks.length;
      stats.agentPerformance[agentState.id] = agentState.performance;
    }

    return stats;
  }

  /**
   * Get workflow statistics
   */
  public getWorkflowStats(): Record<string, any> {
    const statusCounts: Record<WorkflowStatus, number> = {
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
    };

    for (const workflow of this.activeWorkflows.values()) {
      statusCounts[workflow.status]++;
    }

    return {
      activeWorkflows: this.activeWorkflows.size,
      statusBreakdown: statusCounts,
    };
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.eventDispatcher.registerHandler({
      type: "agent:health_changed",
      priority: "high",
      handler: async (event: SystemEvent) => {
        await this.handleAgentHealthChange(event);
      },
    });

    this.eventDispatcher.registerHandler({
      type: "system:overload",
      priority: "critical",
      handler: async (event: SystemEvent) => {
        await this.handleSystemOverload(event);
      },
    });
  }

  /**
   * Handle agent health changes
   */
  private async handleAgentHealthChange(event: SystemEvent): Promise<void> {
    const { componentId, currentStatus } = event.data;
    const agentState = this.agents.get(componentId);
    
    if (agentState) {
      if (currentStatus === "unhealthy") {
        // Mark agent as unavailable and reassign tasks
        agentState.isAvailable = false;
        await this.reassignAgentTasks(componentId);
      } else if (currentStatus === "healthy") {
        // Mark agent as available
        agentState.isAvailable = agentState.currentTasks.length < this.getMaxConcurrentTasks(agentState.agent);
        await this.processTaskQueue();
      }
    }
  }

  /**
   * Handle system overload
   */
  private async handleSystemOverload(event: SystemEvent): Promise<void> {
    // Implement load shedding strategies
    // For now, just log the event
    console.warn("System overload detected:", event.data);
  }

  /**
   * Reassign tasks from an unhealthy agent
   */
  private async reassignAgentTasks(agentId: string): Promise<void> {
    const agentState = this.agents.get(agentId);
    if (!agentState) {
      return;
    }

    const tasksToReassign = [...agentState.currentTasks];
    agentState.currentTasks = [];

    for (const taskId of tasksToReassign) {
      // Create new assignment for the task
      const assignment: AgentAssignment = {
        agentId: "", // Will be selected by selectAgent
        taskId,
        priority: 1, // High priority for reassignment
        metadata: { reassigned: true, originalAgent: agentId },
      };

      await this.assignTask(assignment);
    }
  }

  /**
   * Select the best agent for a task
   */
  private async selectAgent(assignment: AgentAssignment): Promise<Agent<any> | null> {
    const availableAgents = Array.from(this.agents.values()).filter(a => a.isAvailable);
    
    if (availableAgents.length === 0) {
      return null;
    }

    // Apply load balancing strategy
    switch (this.config.loadBalancingStrategy) {
      case "round_robin":
        return this.selectAgentRoundRobin(availableAgents);
      case "least_connections":
        return this.selectAgentLeastConnections(availableAgents);
      case "performance_based":
        return this.selectAgentPerformanceBased(availableAgents);
      case "weighted":
        return this.selectAgentWeighted(availableAgents, assignment);
      default:
        return availableAgents[0].agent;
    }
  }

  /**
   * Round robin agent selection
   */
  private selectAgentRoundRobin(agents: AgentState[]): Agent<any> {
    // Simple round robin implementation
    const sortedAgents = agents.sort((a, b) => a.lastActivity.getTime() - b.lastActivity.getTime());
    return sortedAgents[0].agent;
  }

  /**
   * Least connections agent selection
   */
  private selectAgentLeastConnections(agents: AgentState[]): Agent<any> {
    const sortedAgents = agents.sort((a, b) => a.currentTasks.length - b.currentTasks.length);
    return sortedAgents[0].agent;
  }

  /**
   * Performance-based agent selection
   */
  private selectAgentPerformanceBased(agents: AgentState[]): Agent<any> {
    const sortedAgents = agents.sort((a, b) => {
      // Score based on success rate and response time
      const scoreA = a.performance.successRate / (a.performance.averageResponseTime || 1);
      const scoreB = b.performance.successRate / (b.performance.averageResponseTime || 1);
      return scoreB - scoreA;
    });
    return sortedAgents[0].agent;
  }

  /**
   * Weighted agent selection
   */
  private selectAgentWeighted(agents: AgentState[], assignment: AgentAssignment): Agent<any> {
    // Consider agent capabilities and task requirements
    const suitableAgents = agents.filter(agent => 
      this.isAgentSuitableForTask(agent, assignment)
    );
    
    if (suitableAgents.length === 0) {
      return agents[0].agent;
    }
    
    return this.selectAgentPerformanceBased(suitableAgents);
  }

  /**
   * Check if agent is suitable for a task
   */
  private isAgentSuitableForTask(agent: AgentState, assignment: AgentAssignment): boolean {
    // Check if agent has required capabilities
    if (assignment.requirements) {
      return assignment.requirements.every(req => 
        agent.capabilities.includes(req)
      );
    }
    return true;
  }

  /**
   * Extract agent capabilities from agent tools and configuration
   */
  private extractAgentCapabilities(agent: Agent<any>): string[] {
    const capabilities: string[] = [];
    
    // Extract from agent tools
    const tools = agent.getTools();
    for (const tool of tools) {
      capabilities.push(tool.name);
    }
    
    // Add default capabilities
    capabilities.push("text_generation", "conversation");
    
    return capabilities;
  }

  /**
   * Get maximum concurrent tasks for an agent
   */
  private getMaxConcurrentTasks(agent: Agent<any>): number {
    // This could be configurable per agent
    return 3; // Default max concurrent tasks
  }

  /**
   * Start coordination loop
   */
  private startCoordinationLoop(): void {
    this.coordinationInterval = setInterval(async () => {
      await this.processTaskQueue();
      await this.checkWorkflowTimeouts();
      await this.updateAgentMetrics();
    }, 5000); // Run every 5 seconds
  }

  /**
   * Process queued tasks
   */
  private async processTaskQueue(): Promise<void> {
    if (this.taskQueue.length === 0) {
      return;
    }

    // Sort queue by priority
    this.taskQueue.sort((a, b) => b.priority - a.priority);

    const tasksToProcess = this.taskQueue.splice(0, 10); // Process up to 10 tasks at once
    
    for (const assignment of tasksToProcess) {
      const result = await this.assignTask(assignment);
      if (!result.success) {
        // Put back in queue if assignment failed
        this.taskQueue.unshift(assignment);
        break; // Stop processing if we can't assign tasks
      }
    }
  }

  /**
   * Check for workflow timeouts
   */
  private async checkWorkflowTimeouts(): Promise<void> {
    const now = new Date();
    
    for (const workflow of this.activeWorkflows.values()) {
      const elapsed = now.getTime() - workflow.startTime.getTime();
      const timeout = this.config.workflowTimeout;
      
      if (elapsed > timeout) {
        await this.cancelWorkflow(workflow.id, "Workflow timeout");
      }
    }
  }

  /**
   * Update agent metrics
   */
  private async updateAgentMetrics(): Promise<void> {
    for (const agentState of this.agents.values()) {
      // Update last activity if agent has been idle too long
      const idleTime = Date.now() - agentState.lastActivity.getTime();
      if (idleTime > 300000) { // 5 minutes
        agentState.isAvailable = true; // Mark as available if idle
      }
    }
  }
}

