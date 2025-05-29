import { EventEmitter } from "events";
import type { Agent } from "../agent";
import type {
  ComponentStatus,
  ComponentHealth,
  OrchestratorComponent,
  CoordinationRequest,
  CoordinationMode,
  TaskResult,
  TaskPriority,
  WorkflowContext,
  OrchestratorEvent,
} from "./types";

/**
 * Agent coordination state
 */
export interface AgentCoordinationState {
  agentId: string;
  status: "idle" | "busy" | "error" | "offline";
  currentTask?: string;
  taskQueue: CoordinationRequest[];
  lastActivity: Date;
  capabilities: string[];
  workload: number;
  performance: {
    averageResponseTime: number;
    successRate: number;
    errorRate: number;
  };
}

/**
 * Coordination session
 */
export interface CoordinationSession {
  id: string;
  sourceAgentId: string;
  targetAgentId: string;
  mode: CoordinationMode;
  status: "pending" | "active" | "completed" | "failed" | "cancelled";
  startTime: Date;
  endTime?: Date;
  context: Record<string, unknown>;
  results: TaskResult[];
  errors: Error[];
}

/**
 * Workflow recovery state
 */
export interface WorkflowRecoveryState {
  workflowId: string;
  lastKnownStep: string;
  checkpointData: Record<string, unknown>;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
  lastRecoveryTime?: Date;
}

/**
 * Coordination Engine - Orchestrate dual AI agent coordination
 */
export class CoordinationEngine implements OrchestratorComponent {
  public readonly id: string;
  public readonly name: string = "CoordinationEngine";
  private _status: ComponentStatus = "idle";
  private agents: Map<string, Agent<any>> = new Map();
  private agentStates: Map<string, AgentCoordinationState> = new Map();
  private coordinationSessions: Map<string, CoordinationSession> = new Map();
  private workflowRecovery: Map<string, WorkflowRecoveryState> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();
  private startTime: Date = new Date();
  private errorCount: number = 0;
  private lastError?: Error;
  private coordinationQueue: CoordinationRequest[] = [];
  private processingTimer?: NodeJS.Timeout;
  private readonly maxConcurrentCoordinations: number;
  private readonly coordinationTimeout: number;
  private readonly queueProcessingInterval: number;

  constructor(options: {
    id?: string;
    maxConcurrentCoordinations?: number;
    coordinationTimeout?: number;
    queueProcessingInterval?: number;
  } = {}) {
    this.id = options.id || `coordination-engine-${Date.now()}`;
    this.maxConcurrentCoordinations = options.maxConcurrentCoordinations || 10;
    this.coordinationTimeout = options.coordinationTimeout || 300000; // 5 minutes
    this.queueProcessingInterval = options.queueProcessingInterval || 1000; // 1 second
  }

  public get status(): ComponentStatus {
    return this._status;
  }

  /**
   * Start the coordination engine
   */
  public async start(): Promise<void> {
    if (this._status === "running") {
      return;
    }

    this._status = "starting";

    try {
      // Start queue processing
      this.processingTimer = setInterval(
        () => this.processCoordinationQueue(),
        this.queueProcessingInterval
      );

      this._status = "running";
      this.startTime = new Date();

      this.emitCoordinationEvent("coordination.engine.started", {
        engineId: this.id,
        maxConcurrentCoordinations: this.maxConcurrentCoordinations,
        registeredAgents: this.agents.size,
      });
    } catch (error) {
      this._status = "error";
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Stop the coordination engine
   */
  public async stop(): Promise<void> {
    if (this._status === "stopped") {
      return;
    }

    this._status = "stopping";

    try {
      // Stop queue processing
      if (this.processingTimer) {
        clearInterval(this.processingTimer);
        this.processingTimer = undefined;
      }

      // Cancel active coordination sessions
      for (const session of this.coordinationSessions.values()) {
        if (session.status === "active") {
          session.status = "cancelled";
          session.endTime = new Date();
        }
      }

      this._status = "stopped";

      this.emitCoordinationEvent("coordination.engine.stopped", {
        engineId: this.id,
        uptime: Date.now() - this.startTime.getTime(),
        totalSessions: this.coordinationSessions.size,
      });
    } catch (error) {
      this._status = "error";
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Restart the coordination engine
   */
  public async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  /**
   * Get component health information
   */
  public getHealth(): ComponentHealth {
    const activeSessions = Array.from(this.coordinationSessions.values())
      .filter(s => s.status === "active").length;

    return {
      id: this.id,
      name: this.name,
      status: this._status,
      lastHeartbeat: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      errorCount: this.errorCount,
      lastError: this.lastError,
      metadata: {
        registeredAgents: this.agents.size,
        activeSessions,
        queueSize: this.coordinationQueue.length,
        totalSessions: this.coordinationSessions.size,
        recoveryStates: this.workflowRecovery.size,
      },
    };
  }

  /**
   * Get component metrics
   */
  public getMetrics(): Record<string, unknown> {
    const activeSessions = Array.from(this.coordinationSessions.values())
      .filter(s => s.status === "active").length;
    const completedSessions = Array.from(this.coordinationSessions.values())
      .filter(s => s.status === "completed").length;
    const failedSessions = Array.from(this.coordinationSessions.values())
      .filter(s => s.status === "failed").length;

    return {
      registeredAgents: this.agents.size,
      activeSessions,
      queueSize: this.coordinationQueue.length,
      totalSessions: this.coordinationSessions.size,
      completedSessions,
      failedSessions,
      successRate: completedSessions / Math.max(completedSessions + failedSessions, 1),
      uptime: Date.now() - this.startTime.getTime(),
      errorRate: this.errorCount / Math.max(this.coordinationSessions.size, 1),
    };
  }

  /**
   * Register an agent for coordination
   */
  public registerAgent(agent: Agent<any>, capabilities: string[] = []): void {
    this.agents.set(agent.id, agent);

    const agentState: AgentCoordinationState = {
      agentId: agent.id,
      status: "idle",
      taskQueue: [],
      lastActivity: new Date(),
      capabilities,
      workload: 0,
      performance: {
        averageResponseTime: 0,
        successRate: 1.0,
        errorRate: 0,
      },
    };

    this.agentStates.set(agent.id, agentState);

    this.emitCoordinationEvent("agent.registered", {
      agentId: agent.id,
      agentName: agent.name,
      capabilities,
    });
  }

  /**
   * Unregister an agent from coordination
   */
  public unregisterAgent(agentId: string): void {
    const agent = this.agents.get(agentId);
    if (!agent) {
      return;
    }

    // Cancel any active sessions involving this agent
    for (const session of this.coordinationSessions.values()) {
      if ((session.sourceAgentId === agentId || session.targetAgentId === agentId) && 
          session.status === "active") {
        session.status = "cancelled";
        session.endTime = new Date();
      }
    }

    // Remove from queue
    this.coordinationQueue = this.coordinationQueue.filter(
      req => req.sourceAgentId !== agentId && req.targetAgentId !== agentId
    );

    this.agents.delete(agentId);
    this.agentStates.delete(agentId);

    this.emitCoordinationEvent("agent.unregistered", {
      agentId,
      agentName: agent.name,
    });
  }

  /**
   * Request coordination between agents
   */
  public async requestCoordination(request: CoordinationRequest): Promise<string> {
    if (this._status !== "running") {
      throw new Error("CoordinationEngine is not running");
    }

    // Validate request
    this.validateCoordinationRequest(request);

    // Add to queue
    this.coordinationQueue.push(request);

    this.emitCoordinationEvent("coordination.requested", {
      requestId: request.id,
      sourceAgentId: request.sourceAgentId,
      targetAgentId: request.targetAgentId,
      mode: request.mode,
      priority: request.priority,
    });

    return request.id;
  }

  /**
   * Cancel coordination request
   */
  public cancelCoordination(requestId: string): boolean {
    // Remove from queue
    const queueIndex = this.coordinationQueue.findIndex(req => req.id === requestId);
    if (queueIndex !== -1) {
      this.coordinationQueue.splice(queueIndex, 1);
      this.emitCoordinationEvent("coordination.cancelled", { requestId });
      return true;
    }

    // Cancel active session
    const session = this.coordinationSessions.get(requestId);
    if (session && session.status === "active") {
      session.status = "cancelled";
      session.endTime = new Date();
      this.emitCoordinationEvent("coordination.cancelled", { requestId });
      return true;
    }

    return false;
  }

  /**
   * Get coordination session status
   */
  public getCoordinationStatus(requestId: string): CoordinationSession | undefined {
    return this.coordinationSessions.get(requestId);
  }

  /**
   * Get agent coordination state
   */
  public getAgentState(agentId: string): AgentCoordinationState | undefined {
    return this.agentStates.get(agentId);
  }

  /**
   * Get all agent states
   */
  public getAllAgentStates(): Map<string, AgentCoordinationState> {
    return new Map(this.agentStates);
  }

  /**
   * Update agent capabilities
   */
  public updateAgentCapabilities(agentId: string, capabilities: string[]): void {
    const agentState = this.agentStates.get(agentId);
    if (agentState) {
      agentState.capabilities = capabilities;
      this.emitCoordinationEvent("agent.capabilities.updated", {
        agentId,
        capabilities,
      });
    }
  }

  /**
   * Create workflow recovery checkpoint
   */
  public createRecoveryCheckpoint(
    workflowId: string,
    currentStep: string,
    checkpointData: Record<string, unknown>
  ): void {
    const recoveryState: WorkflowRecoveryState = {
      workflowId,
      lastKnownStep: currentStep,
      checkpointData,
      recoveryAttempts: 0,
      maxRecoveryAttempts: 3,
    };

    this.workflowRecovery.set(workflowId, recoveryState);

    this.emitCoordinationEvent("workflow.checkpoint.created", {
      workflowId,
      currentStep,
      checkpointSize: Object.keys(checkpointData).length,
    });
  }

  /**
   * Recover workflow from checkpoint
   */
  public async recoverWorkflow(workflowId: string): Promise<boolean> {
    const recoveryState = this.workflowRecovery.get(workflowId);
    if (!recoveryState) {
      return false;
    }

    if (recoveryState.recoveryAttempts >= recoveryState.maxRecoveryAttempts) {
      this.emitCoordinationEvent("workflow.recovery.failed", {
        workflowId,
        reason: "Max recovery attempts exceeded",
        attempts: recoveryState.recoveryAttempts,
      });
      return false;
    }

    try {
      recoveryState.recoveryAttempts++;
      recoveryState.lastRecoveryTime = new Date();

      // Implement workflow recovery logic here
      // This would integrate with the workflow manager

      this.emitCoordinationEvent("workflow.recovered", {
        workflowId,
        lastKnownStep: recoveryState.lastKnownStep,
        attempts: recoveryState.recoveryAttempts,
      });

      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  /**
   * Subscribe to coordination events
   */
  public onCoordinationEvent(eventType: string, callback: (event: OrchestratorEvent) => void): void {
    this.eventEmitter.on(eventType, callback);
  }

  /**
   * Unsubscribe from coordination events
   */
  public offCoordinationEvent(eventType: string, callback: (event: OrchestratorEvent) => void): void {
    this.eventEmitter.off(eventType, callback);
  }

  /**
   * Process coordination queue
   */
  private async processCoordinationQueue(): Promise<void> {
    if (this.coordinationQueue.length === 0) {
      return;
    }

    const activeSessions = Array.from(this.coordinationSessions.values())
      .filter(s => s.status === "active").length;

    if (activeSessions >= this.maxConcurrentCoordinations) {
      return;
    }

    // Sort queue by priority
    this.coordinationQueue.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const request = this.coordinationQueue.shift();
    if (!request) {
      return;
    }

    try {
      await this.executeCoordination(request);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Execute coordination request
   */
  private async executeCoordination(request: CoordinationRequest): Promise<void> {
    const session: CoordinationSession = {
      id: request.id,
      sourceAgentId: request.sourceAgentId,
      targetAgentId: request.targetAgentId || this.selectBestAgent(request),
      mode: request.mode,
      status: "active",
      startTime: new Date(),
      context: request.context || {},
      results: [],
      errors: [],
    };

    this.coordinationSessions.set(session.id, session);

    try {
      // Update agent states
      this.updateAgentStatus(session.sourceAgentId, "busy");
      this.updateAgentStatus(session.targetAgentId, "busy");

      this.emitCoordinationEvent("coordination.started", {
        sessionId: session.id,
        sourceAgentId: session.sourceAgentId,
        targetAgentId: session.targetAgentId,
        mode: session.mode,
      });

      // Execute coordination based on mode
      const result = await this.executeCoordinationMode(session, request);

      session.results.push(result);
      session.status = "completed";
      session.endTime = new Date();

      // Update agent performance metrics
      this.updateAgentPerformance(session.targetAgentId, result);

      // Execute callback if provided
      if (request.callback) {
        request.callback(result);
      }

      this.emitCoordinationEvent("coordination.completed", {
        sessionId: session.id,
        result,
        duration: session.endTime.getTime() - session.startTime.getTime(),
      });
    } catch (error) {
      session.errors.push(error as Error);
      session.status = "failed";
      session.endTime = new Date();

      this.handleError(error as Error);

      this.emitCoordinationEvent("coordination.failed", {
        sessionId: session.id,
        error: (error as Error).message,
        duration: (session.endTime || new Date()).getTime() - session.startTime.getTime(),
      });
    } finally {
      // Update agent states back to idle
      this.updateAgentStatus(session.sourceAgentId, "idle");
      this.updateAgentStatus(session.targetAgentId, "idle");
    }
  }

  /**
   * Execute coordination based on mode
   */
  private async executeCoordinationMode(
    session: CoordinationSession,
    request: CoordinationRequest
  ): Promise<TaskResult> {
    const startTime = new Date();
    const sourceAgent = this.agents.get(session.sourceAgentId);
    const targetAgent = this.agents.get(session.targetAgentId);

    if (!sourceAgent || !targetAgent) {
      throw new Error("Required agents not found");
    }

    let result: unknown;

    switch (session.mode) {
      case "sequential":
        result = await this.executeSequentialCoordination(sourceAgent, targetAgent, request);
        break;
      case "parallel":
        result = await this.executeParallelCoordination(sourceAgent, targetAgent, request);
        break;
      case "conditional":
        result = await this.executeConditionalCoordination(sourceAgent, targetAgent, request);
        break;
      case "pipeline":
        result = await this.executePipelineCoordination(sourceAgent, targetAgent, request);
        break;
      default:
        throw new Error(`Unsupported coordination mode: ${session.mode}`);
    }

    const endTime = new Date();

    return {
      taskId: request.id,
      status: "success",
      result,
      startTime,
      endTime,
      executionTime: endTime.getTime() - startTime.getTime(),
      metadata: {
        mode: session.mode,
        sourceAgentId: session.sourceAgentId,
        targetAgentId: session.targetAgentId,
      },
    };
  }

  /**
   * Execute sequential coordination
   */
  private async executeSequentialCoordination(
    sourceAgent: Agent<any>,
    targetAgent: Agent<any>,
    request: CoordinationRequest
  ): Promise<unknown> {
    // Source agent processes first, then target agent
    const sourceResult = await sourceAgent.generateText(request.task);
    const targetResult = await targetAgent.generateText(
      `Continue from: ${sourceResult.text}`,
      { context: request.context }
    );
    return { sourceResult: sourceResult.text, targetResult: targetResult.text };
  }

  /**
   * Execute parallel coordination
   */
  private async executeParallelCoordination(
    sourceAgent: Agent<any>,
    targetAgent: Agent<any>,
    request: CoordinationRequest
  ): Promise<unknown> {
    // Both agents process simultaneously
    const [sourceResult, targetResult] = await Promise.all([
      sourceAgent.generateText(request.task),
      targetAgent.generateText(request.task, { context: request.context }),
    ]);
    return { sourceResult: sourceResult.text, targetResult: targetResult.text };
  }

  /**
   * Execute conditional coordination
   */
  private async executeConditionalCoordination(
    sourceAgent: Agent<any>,
    targetAgent: Agent<any>,
    request: CoordinationRequest
  ): Promise<unknown> {
    // Source agent determines if target agent should process
    const sourceResult = await sourceAgent.generateText(request.task);
    
    // Simple condition check (in practice, this would be more sophisticated)
    const shouldContinue = sourceResult.text.toLowerCase().includes("continue");
    
    if (shouldContinue) {
      const targetResult = await targetAgent.generateText(
        `Process based on: ${sourceResult.text}`,
        { context: request.context }
      );
      return { sourceResult: sourceResult.text, targetResult: targetResult.text };
    }
    
    return { sourceResult: sourceResult.text, targetResult: null };
  }

  /**
   * Execute pipeline coordination
   */
  private async executePipelineCoordination(
    sourceAgent: Agent<any>,
    targetAgent: Agent<any>,
    request: CoordinationRequest
  ): Promise<unknown> {
    // Source agent output becomes target agent input
    const sourceResult = await sourceAgent.generateText(request.task);
    const targetResult = await targetAgent.generateText(sourceResult.text, {
      context: request.context,
    });
    return { pipeline: [sourceResult.text, targetResult.text] };
  }

  /**
   * Select best agent for coordination
   */
  private selectBestAgent(request: CoordinationRequest): string {
    const availableAgents = Array.from(this.agentStates.values())
      .filter(state => 
        state.agentId !== request.sourceAgentId &&
        state.status === "idle" &&
        this.agentHasCapabilities(state, request)
      );

    if (availableAgents.length === 0) {
      throw new Error("No suitable agents available for coordination");
    }

    // Select agent with best performance and lowest workload
    const bestAgent = availableAgents.reduce((best, current) => {
      const bestScore = best.performance.successRate - (best.workload * 0.1);
      const currentScore = current.performance.successRate - (current.workload * 0.1);
      return currentScore > bestScore ? current : best;
    });

    return bestAgent.agentId;
  }

  /**
   * Check if agent has required capabilities
   */
  private agentHasCapabilities(agentState: AgentCoordinationState, request: CoordinationRequest): boolean {
    // For now, assume all agents can handle all tasks
    // In practice, this would check specific capabilities
    return true;
  }

  /**
   * Update agent status
   */
  private updateAgentStatus(agentId: string, status: AgentCoordinationState["status"]): void {
    const agentState = this.agentStates.get(agentId);
    if (agentState) {
      agentState.status = status;
      agentState.lastActivity = new Date();
      
      if (status === "busy") {
        agentState.workload++;
      } else if (status === "idle" && agentState.workload > 0) {
        agentState.workload--;
      }
    }
  }

  /**
   * Update agent performance metrics
   */
  private updateAgentPerformance(agentId: string, result: TaskResult): void {
    const agentState = this.agentStates.get(agentId);
    if (!agentState) {
      return;
    }

    const performance = agentState.performance;
    
    // Update response time (simple moving average)
    performance.averageResponseTime = 
      (performance.averageResponseTime + result.executionTime) / 2;

    // Update success/error rates
    if (result.status === "success") {
      performance.successRate = (performance.successRate * 0.9) + (1.0 * 0.1);
      performance.errorRate = (performance.errorRate * 0.9) + (0.0 * 0.1);
    } else {
      performance.successRate = (performance.successRate * 0.9) + (0.0 * 0.1);
      performance.errorRate = (performance.errorRate * 0.9) + (1.0 * 0.1);
    }
  }

  /**
   * Validate coordination request
   */
  private validateCoordinationRequest(request: CoordinationRequest): void {
    if (!request.id) {
      throw new Error("Coordination request must have an ID");
    }

    if (!request.sourceAgentId) {
      throw new Error("Coordination request must have a source agent ID");
    }

    if (!this.agents.has(request.sourceAgentId)) {
      throw new Error(`Source agent ${request.sourceAgentId} not registered`);
    }

    if (request.targetAgentId && !this.agents.has(request.targetAgentId)) {
      throw new Error(`Target agent ${request.targetAgentId} not registered`);
    }

    if (!request.task) {
      throw new Error("Coordination request must have a task");
    }
  }

  /**
   * Emit coordination-related events
   */
  private emitCoordinationEvent(type: string, data: any): void {
    const event: OrchestratorEvent = {
      id: `coord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      source: this.id,
      timestamp: new Date(),
      version: 1,
      status: "completed",
      affectedNodeId: this.id,
      data,
    };

    this.eventEmitter.emit(type, event);
    this.eventEmitter.emit("*", event); // Wildcard listener
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    this.errorCount++;
    this.lastError = error;
    console.error(`CoordinationEngine Error:`, error);

    this.emitCoordinationEvent("coordination.engine.error", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date(),
    });
  }
}

