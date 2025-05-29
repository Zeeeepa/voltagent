import { EventEmitter } from "events";
import type { Agent } from "../agent";
import { EventDispatcher } from "./event-dispatcher";
import { StateManager } from "./state-manager";
import { SystemWatcher } from "./system-watcher";
import { CoordinationEngine } from "./coordination-engine";
import { WorkflowManager } from "./workflow-manager";
import type {
  ComponentStatus,
  ComponentHealth,
  OrchestratorComponent,
  OrchestratorConfig,
  OrchestratorEvent,
  SystemHealthStatus,
  WorkflowDefinition,
  CoordinationRequest,
} from "./types";

/**
 * Main Orchestrator class that coordinates all system components
 */
export class Orchestrator implements OrchestratorComponent {
  public readonly id: string;
  public readonly name: string = "Orchestrator";
  private _status: ComponentStatus = "idle";
  private config: OrchestratorConfig;
  private eventDispatcher: EventDispatcher;
  private stateManager: StateManager;
  private systemWatcher: SystemWatcher;
  private coordinationEngine: CoordinationEngine;
  private workflowManager: WorkflowManager;
  private eventEmitter: EventEmitter = new EventEmitter();
  private startTime: Date = new Date();
  private errorCount: number = 0;
  private lastError?: Error;
  private shutdownTimer?: NodeJS.Timeout;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.id = config.id || `orchestrator-${Date.now()}`;
    this.config = this.mergeWithDefaultConfig(config);
    
    // Initialize core components
    this.eventDispatcher = new EventDispatcher({
      id: `${this.id}-event-dispatcher`,
      maxHistorySize: 10000,
      enableReplay: true,
    });

    this.stateManager = new StateManager({
      id: `${this.id}-state-manager`,
      persistence: this.config.statePersistence,
      maxHistorySize: 10000,
    });

    this.systemWatcher = new SystemWatcher({
      id: `${this.id}-system-watcher`,
      maxMetricsHistory: 1000,
      metricsInterval: this.config.metrics.interval,
    });

    this.coordinationEngine = new CoordinationEngine({
      id: `${this.id}-coordination-engine`,
      maxConcurrentCoordinations: 10,
      coordinationTimeout: 300000,
    });

    this.workflowManager = new WorkflowManager({
      id: `${this.id}-workflow-manager`,
      maxConcurrentWorkflows: 5,
      executionCheckInterval: 5000,
    });

    this.setupComponentIntegration();
  }

  public get status(): ComponentStatus {
    return this._status;
  }

  /**
   * Start the orchestrator and all components
   */
  public async start(): Promise<void> {
    if (this._status === "running") {
      return;
    }

    this._status = "starting";

    try {
      console.log(`[Orchestrator] Starting orchestrator ${this.id}...`);

      // Start components in dependency order
      await this.startComponent("eventDispatcher", this.eventDispatcher);
      await this.startComponent("stateManager", this.stateManager);
      await this.startComponent("systemWatcher", this.systemWatcher);
      await this.startComponent("coordinationEngine", this.coordinationEngine);
      await this.startComponent("workflowManager", this.workflowManager);

      // Register components with system watcher
      this.systemWatcher.registerComponent(this.eventDispatcher, {
        healthCheckInterval: 10000,
        performanceTracking: true,
        autoRestart: true,
        maxRestarts: 3,
      });

      this.systemWatcher.registerComponent(this.stateManager, {
        healthCheckInterval: 15000,
        performanceTracking: true,
        autoRestart: true,
        maxRestarts: 3,
      });

      this.systemWatcher.registerComponent(this.coordinationEngine, {
        healthCheckInterval: 10000,
        performanceTracking: true,
        autoRestart: true,
        maxRestarts: 3,
      });

      this.systemWatcher.registerComponent(this.workflowManager, {
        healthCheckInterval: 15000,
        performanceTracking: true,
        autoRestart: true,
        maxRestarts: 3,
      });

      this._status = "running";
      this.startTime = new Date();

      this.emitOrchestratorEvent("orchestrator.started", {
        orchestratorId: this.id,
        version: this.config.version,
        componentCount: 5,
        systemHealth: this.getSystemHealthStatus(),
      });

      console.log(`[Orchestrator] Orchestrator ${this.id} started successfully`);
    } catch (error) {
      this._status = "error";
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Stop the orchestrator and all components
   */
  public async stop(): Promise<void> {
    if (this._status === "stopped") {
      return;
    }

    this._status = "stopping";

    try {
      console.log(`[Orchestrator] Stopping orchestrator ${this.id}...`);

      // Clear shutdown timer if exists
      if (this.shutdownTimer) {
        clearTimeout(this.shutdownTimer);
        this.shutdownTimer = undefined;
      }

      // Stop components in reverse dependency order
      await this.stopComponent("workflowManager", this.workflowManager);
      await this.stopComponent("coordinationEngine", this.coordinationEngine);
      await this.stopComponent("systemWatcher", this.systemWatcher);
      await this.stopComponent("stateManager", this.stateManager);
      await this.stopComponent("eventDispatcher", this.eventDispatcher);

      this._status = "stopped";

      this.emitOrchestratorEvent("orchestrator.stopped", {
        orchestratorId: this.id,
        uptime: Date.now() - this.startTime.getTime(),
        totalErrors: this.errorCount,
      });

      console.log(`[Orchestrator] Orchestrator ${this.id} stopped successfully`);
    } catch (error) {
      this._status = "error";
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Restart the orchestrator
   */
  public async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  /**
   * Graceful shutdown with timeout
   */
  public async gracefulShutdown(timeoutMs: number = 30000): Promise<void> {
    console.log(`[Orchestrator] Initiating graceful shutdown with ${timeoutMs}ms timeout...`);

    const shutdownPromise = this.stop();
    const timeoutPromise = new Promise<void>((_, reject) => {
      this.shutdownTimer = setTimeout(() => {
        reject(new Error("Graceful shutdown timeout"));
      }, timeoutMs);
    });

    try {
      await Promise.race([shutdownPromise, timeoutPromise]);
    } catch (error) {
      console.error("[Orchestrator] Graceful shutdown failed, forcing stop...");
      this._status = "stopped";
      throw error;
    }
  }

  /**
   * Get component health information
   */
  public getHealth(): ComponentHealth {
    return {
      id: this.id,
      name: this.name,
      status: this._status,
      lastHeartbeat: new Date(),
      uptime: Date.now() - this.startTime.getTime(),
      errorCount: this.errorCount,
      lastError: this.lastError,
      metadata: {
        version: this.config.version,
        systemHealth: this.getSystemHealthStatus(),
        componentStatuses: this.getComponentStatuses(),
        activeWorkflows: this.workflowManager.getExecutionStats().activeWorkflows,
        registeredAgents: this.coordinationEngine.getAllAgentStates().size,
      },
    };
  }

  /**
   * Get component metrics
   */
  public getMetrics(): Record<string, unknown> {
    return {
      uptime: Date.now() - this.startTime.getTime(),
      errorCount: this.errorCount,
      systemHealth: this.getSystemHealthStatus(),
      componentMetrics: {
        eventDispatcher: this.eventDispatcher.getMetrics(),
        stateManager: this.stateManager.getMetrics(),
        systemWatcher: this.systemWatcher.getMetrics(),
        coordinationEngine: this.coordinationEngine.getMetrics(),
        workflowManager: this.workflowManager.getMetrics(),
      },
    };
  }

  /**
   * Get system health status
   */
  public getSystemHealthStatus(): SystemHealthStatus {
    if (this._status !== "running") {
      return "unknown";
    }

    return this.systemWatcher.getSystemHealthStatus();
  }

  /**
   * Register an agent with the orchestrator
   */
  public registerAgent(agent: Agent<any>, capabilities: string[] = []): void {
    this.coordinationEngine.registerAgent(agent, capabilities);
    
    this.emitOrchestratorEvent("agent.registered", {
      agentId: agent.id,
      agentName: agent.name,
      capabilities,
    });
  }

  /**
   * Unregister an agent from the orchestrator
   */
  public unregisterAgent(agentId: string): void {
    this.coordinationEngine.unregisterAgent(agentId);
    
    this.emitOrchestratorEvent("agent.unregistered", {
      agentId,
    });
  }

  /**
   * Execute a complete workflow
   */
  public async executeCompleteWorkflow(requirementInput: string): Promise<string> {
    console.log(`[Orchestrator] Starting complete workflow for requirement: ${requirementInput}`);

    try {
      // 1. Parse and store requirement in state
      const requirementId = `req_${Date.now()}`;
      this.stateManager.setState(`requirement.${requirementId}`, {
        input: requirementInput,
        status: "processing",
        createdAt: new Date(),
      }, "orchestrator");

      // 2. Create workflow from template
      const workflow = this.workflowManager.createWorkflowFromTemplate(
        "basic-development",
        {
          requirement: requirementInput,
          priority: "normal",
        }
      );

      // 3. Execute workflow
      const executionId = await this.workflowManager.executeWorkflow(workflow.id, {
        requirementId,
        originalInput: requirementInput,
      });

      // 4. Update requirement status
      this.stateManager.setState(`requirement.${requirementId}.status`, "in_progress", "orchestrator");
      this.stateManager.setState(`requirement.${requirementId}.workflowId`, workflow.id, "orchestrator");
      this.stateManager.setState(`requirement.${requirementId}.executionId`, executionId, "orchestrator");

      this.emitOrchestratorEvent("workflow.complete.started", {
        requirementId,
        workflowId: workflow.id,
        executionId,
        requirement: requirementInput,
      });

      return executionId;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Request agent coordination
   */
  public async requestCoordination(request: CoordinationRequest): Promise<string> {
    return this.coordinationEngine.requestCoordination(request);
  }

  /**
   * Get workflow status
   */
  public getWorkflowStatus(executionId: string) {
    return this.workflowManager.getWorkflowStatus(executionId);
  }

  /**
   * Get state value
   */
  public getState<T = unknown>(key: string): T | undefined {
    return this.stateManager.getState<T>(key);
  }

  /**
   * Set state value
   */
  public setState(key: string, value: unknown): void {
    this.stateManager.setState(key, value, "orchestrator");
  }

  /**
   * Subscribe to orchestrator events
   */
  public onEvent(eventType: string, callback: (event: OrchestratorEvent) => void): void {
    this.eventDispatcher.on(eventType, callback);
  }

  /**
   * Unsubscribe from orchestrator events
   */
  public offEvent(eventType: string, callback: (event: OrchestratorEvent) => void): void {
    this.eventDispatcher.off(eventType, callback);
  }

  /**
   * Get all component statuses
   */
  public getComponentStatuses(): Record<string, ComponentStatus> {
    return {
      eventDispatcher: this.eventDispatcher.status,
      stateManager: this.stateManager.status,
      systemWatcher: this.systemWatcher.status,
      coordinationEngine: this.coordinationEngine.status,
      workflowManager: this.workflowManager.status,
    };
  }

  /**
   * Setup integration between components
   */
  private setupComponentIntegration(): void {
    // Connect event dispatcher to all components
    this.stateManager.onStateChange("*", (event) => {
      this.eventDispatcher.emit("state.changed", {
        id: `state_${Date.now()}`,
        type: "state.changed",
        source: this.stateManager.id,
        timestamp: new Date(),
        version: 1,
        status: "completed",
        affectedNodeId: this.stateManager.id,
        data: event,
      });
    });

    this.systemWatcher.onSystemEvent("*", (event) => {
      this.eventDispatcher.emit(event.type, event);
    });

    this.coordinationEngine.onCoordinationEvent("*", (event) => {
      this.eventDispatcher.emit(event.type, event);
    });

    this.workflowManager.onWorkflowEvent("*", (event) => {
      this.eventDispatcher.emit(event.type, event);
    });

    // Setup cross-component communication
    this.eventDispatcher.on("workflow.execution.completed", (event) => {
      const data = event.data;
      this.stateManager.setState(
        `workflow.${data.workflowId}.status`,
        "completed",
        "orchestrator"
      );
    });

    this.eventDispatcher.on("workflow.execution.failed", (event) => {
      const data = event.data;
      this.stateManager.setState(
        `workflow.${data.workflowId}.status`,
        "failed",
        "orchestrator"
      );
    });
  }

  /**
   * Start a component with error handling
   */
  private async startComponent(name: string, component: OrchestratorComponent): Promise<void> {
    if (!this.config.components[name as keyof typeof this.config.components]?.enabled) {
      console.log(`[Orchestrator] Component ${name} is disabled, skipping...`);
      return;
    }

    try {
      console.log(`[Orchestrator] Starting component: ${name}`);
      await component.start();
      console.log(`[Orchestrator] Component ${name} started successfully`);
    } catch (error) {
      console.error(`[Orchestrator] Failed to start component ${name}:`, error);
      throw new Error(`Failed to start component ${name}: ${(error as Error).message}`);
    }
  }

  /**
   * Stop a component with error handling
   */
  private async stopComponent(name: string, component: OrchestratorComponent): Promise<void> {
    try {
      console.log(`[Orchestrator] Stopping component: ${name}`);
      await component.stop();
      console.log(`[Orchestrator] Component ${name} stopped successfully`);
    } catch (error) {
      console.error(`[Orchestrator] Failed to stop component ${name}:`, error);
      // Don't throw - continue stopping other components
    }
  }

  /**
   * Merge user config with default config
   */
  private mergeWithDefaultConfig(userConfig: Partial<OrchestratorConfig>): OrchestratorConfig {
    const defaultConfig: OrchestratorConfig = {
      id: this.id,
      name: "VoltAgent Orchestrator",
      version: "1.0.0",
      components: {
        systemWatcher: { enabled: true },
        coordinationEngine: { enabled: true },
        eventDispatcher: { enabled: true },
        workflowManager: { enabled: true },
        requirementProcessor: { enabled: false }, // Not implemented yet
        taskOrchestrator: { enabled: false }, // Not implemented yet
        healthMonitor: { enabled: false }, // Not implemented yet
        stateManager: { enabled: true },
        cacheManager: { enabled: false }, // Not implemented yet
        loadBalancer: { enabled: false }, // Not implemented yet
      },
      cache: {
        enabled: false,
        ttl: 3600000, // 1 hour
        maxSize: 1000,
        strategy: "lru",
      },
      loadBalancer: {
        strategy: "round_robin",
        healthCheckInterval: 30000,
        maxRetries: 3,
      },
      statePersistence: {
        enabled: false,
        storage: "memory",
      },
      metrics: {
        enabled: true,
        interval: 30000, // 30 seconds
        retention: 86400000, // 24 hours
      },
      logging: {
        level: "info",
        format: "text",
        destination: "console",
      },
    };

    return {
      ...defaultConfig,
      ...userConfig,
      components: {
        ...defaultConfig.components,
        ...userConfig.components,
      },
      cache: {
        ...defaultConfig.cache,
        ...userConfig.cache,
      },
      loadBalancer: {
        ...defaultConfig.loadBalancer,
        ...userConfig.loadBalancer,
      },
      statePersistence: {
        ...defaultConfig.statePersistence,
        ...userConfig.statePersistence,
      },
      metrics: {
        ...defaultConfig.metrics,
        ...userConfig.metrics,
      },
      logging: {
        ...defaultConfig.logging,
        ...userConfig.logging,
      },
    };
  }

  /**
   * Emit orchestrator-related events
   */
  private emitOrchestratorEvent(type: string, data: any): void {
    const event: OrchestratorEvent = {
      id: `orch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      source: this.id,
      timestamp: new Date(),
      version: 1,
      status: "completed",
      affectedNodeId: this.id,
      data,
    };

    this.eventEmitter.emit(type, event);
    
    // Also emit through event dispatcher if it's running
    if (this.eventDispatcher.status === "running") {
      this.eventDispatcher.emit(type, event);
    }
  }

  /**
   * Handle errors
   */
  private handleError(error: Error): void {
    this.errorCount++;
    this.lastError = error;
    console.error(`[Orchestrator] Error:`, error);

    this.emitOrchestratorEvent("orchestrator.error", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date(),
    });
  }
}

// Export all orchestrator components and types
export * from "./types";
export { EventDispatcher } from "./event-dispatcher";
export { StateManager } from "./state-manager";
export { SystemWatcher } from "./system-watcher";
export { CoordinationEngine } from "./coordination-engine";
export { WorkflowManager } from "./workflow-manager";
export { Orchestrator } from "./index";

