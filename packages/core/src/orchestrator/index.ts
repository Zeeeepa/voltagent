import { EventEmitter } from "events";
import type { Agent } from "../agent";
import { SystemWatcher } from "./system-watcher";
import { EventDispatcher } from "./event-dispatcher";
import { CoordinationEngine } from "./coordination-engine";
import { WorkflowManager } from "./workflow-manager";
import { CacheManager } from "../utils/cache-manager";
import { LoadBalancer } from "../ai/coordination/load-balancer";
import type {
  IOrchestrator,
  OrchestratorConfig,
  WorkflowDefinition,
  WorkflowExecution,
  ComponentHealth,
  PerformanceMetrics,
  SystemComponent,
  ComponentType,
} from "./types";

/**
 * Default orchestrator configuration
 */
const DEFAULT_CONFIG: OrchestratorConfig = {
  healthCheckInterval: 30000, // 30 seconds
  metricsCollectionInterval: 60000, // 1 minute
  workflowTimeout: 3600000, // 1 hour
  maxConcurrentWorkflows: 10,
  loadBalancingStrategy: "performance_based",
  cacheConfig: {
    ttl: 300000, // 5 minutes
    maxSize: 100 * 1024 * 1024, // 100MB
    strategy: "lru",
    namespace: "orchestrator",
  },
  retryPolicy: {
    maxAttempts: 3,
    backoffStrategy: "exponential",
    baseDelay: 1000,
    maxDelay: 30000,
    retryableErrors: ["timeout", "connection", "temporary"],
  },
  enableTelemetry: true,
  logLevel: "info",
};

/**
 * Main Orchestrator class that integrates all components
 */
export class Orchestrator extends EventEmitter implements IOrchestrator {
  private config: OrchestratorConfig;
  private systemWatcher: SystemWatcher;
  private eventDispatcher: EventDispatcher;
  private coordinationEngine: CoordinationEngine;
  private workflowManager: WorkflowManager;
  private cacheManager: CacheManager;
  private loadBalancer: LoadBalancer;
  private isRunning = false;
  private startTime?: Date;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize components
    this.eventDispatcher = new EventDispatcher(this.config);
    this.systemWatcher = new SystemWatcher(this.config);
    this.coordinationEngine = new CoordinationEngine(this.eventDispatcher, this.config);
    this.workflowManager = new WorkflowManager(this.eventDispatcher, this.coordinationEngine, this.config);
    this.cacheManager = new CacheManager(this.config.cacheConfig);
    this.loadBalancer = new LoadBalancer(this.config.loadBalancingStrategy, this.config);

    this.setupEventHandlers();
    this.registerSystemComponents();
  }

  /**
   * Start the orchestrator and all its components
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.startTime = new Date();
    this.isRunning = true;

    try {
      // Start components in order
      await this.eventDispatcher.start();
      this.cacheManager.start();
      await this.systemWatcher.start();
      await this.loadBalancer.start();
      await this.coordinationEngine.start();
      await this.workflowManager.start();

      // Register default workflows
      this.registerDefaultWorkflows();

      await this.eventDispatcher.createEvent(
        "orchestrator:started",
        "orchestrator",
        {
          startTime: this.startTime,
          config: this.config,
        }
      );

      this.emit("started");
    } catch (error) {
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the orchestrator and all its components
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    try {
      // Stop components in reverse order
      await this.workflowManager.stop();
      await this.coordinationEngine.stop();
      await this.loadBalancer.stop();
      await this.systemWatcher.stop();
      this.cacheManager.stop();
      await this.eventDispatcher.stop();

      await this.eventDispatcher.createEvent(
        "orchestrator:stopped",
        "orchestrator",
        {
          stopTime: new Date(),
          uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
        }
      );

      this.emit("stopped");
    } catch (error) {
      console.error("Error stopping orchestrator:", error);
      throw error;
    }
  }

  /**
   * Get overall system health
   */
  public async getHealth(): Promise<ComponentHealth> {
    if (!this.isRunning) {
      return "unhealthy";
    }

    return this.systemWatcher.getSystemHealth();
  }

  /**
   * Execute a workflow
   */
  public async executeWorkflow(
    definition: WorkflowDefinition,
    input: Record<string, any> = {}
  ): Promise<WorkflowExecution> {
    if (!this.isRunning) {
      throw new Error("Orchestrator is not running");
    }

    // Register workflow if not already registered
    this.workflowManager.registerWorkflow(definition);

    // Execute workflow
    return this.workflowManager.executeWorkflow(definition.id, input);
  }

  /**
   * Get workflow execution status
   */
  public async getWorkflowStatus(workflowId: string): Promise<WorkflowExecution | null> {
    return this.workflowManager.getExecution(workflowId) || null;
  }

  /**
   * Cancel a workflow execution
   */
  public async cancelWorkflow(workflowId: string): Promise<boolean> {
    return this.workflowManager.cancelExecution(workflowId, "User requested cancellation");
  }

  /**
   * Register an agent with the orchestrator
   */
  public async registerAgent(agent: Agent<any>): Promise<void> {
    // Register with coordination engine
    await this.coordinationEngine.registerAgent(agent);

    // Register with load balancer
    this.loadBalancer.registerAgent(agent);

    // Register as system component
    const component: SystemComponent = {
      id: agent.id,
      name: agent.name,
      type: "agent",
      status: "healthy",
      lastHealthCheck: new Date(),
      metadata: {
        model: agent.getModelName(),
        tools: agent.getTools().map(t => t.name),
      },
    };

    this.systemWatcher.registerComponent(component);

    await this.eventDispatcher.createEvent(
      "orchestrator:agent_registered",
      "orchestrator",
      {
        agentId: agent.id,
        agentName: agent.name,
        capabilities: component.metadata,
      }
    );
  }

  /**
   * Unregister an agent from the orchestrator
   */
  public async unregisterAgent(agentId: string): Promise<void> {
    // Unregister from coordination engine
    await this.coordinationEngine.unregisterAgent(agentId);

    // Unregister from load balancer
    this.loadBalancer.unregisterAgent(agentId);

    // Unregister from system watcher
    this.systemWatcher.unregisterComponent(agentId);

    await this.eventDispatcher.createEvent(
      "orchestrator:agent_unregistered",
      "orchestrator",
      { agentId }
    );
  }

  /**
   * Get system performance metrics
   */
  public async getSystemMetrics(): Promise<PerformanceMetrics> {
    return this.systemWatcher.getSystemMetrics();
  }

  /**
   * Get orchestrator statistics
   */
  public getStats(): Record<string, any> {
    return {
      isRunning: this.isRunning,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : 0,
      systemHealth: this.systemWatcher.getSystemHealth(),
      components: this.systemWatcher.getComponents().length,
      agents: this.coordinationEngine.getAgentStats(),
      workflows: this.workflowManager.getExecutions().length,
      cache: this.cacheManager.getStats(),
      loadBalancer: this.loadBalancer.getStats(),
      events: this.eventDispatcher.getEventStats(),
    };
  }

  /**
   * Get cache manager instance
   */
  public getCache(): CacheManager {
    return this.cacheManager;
  }

  /**
   * Get event dispatcher instance
   */
  public getEventDispatcher(): EventDispatcher {
    return this.eventDispatcher;
  }

  /**
   * Get workflow manager instance
   */
  public getWorkflowManager(): WorkflowManager {
    return this.workflowManager;
  }

  /**
   * Get coordination engine instance
   */
  public getCoordinationEngine(): CoordinationEngine {
    return this.coordinationEngine;
  }

  /**
   * Get load balancer instance
   */
  public getLoadBalancer(): LoadBalancer {
    return this.loadBalancer;
  }

  /**
   * Get system watcher instance
   */
  public getSystemWatcher(): SystemWatcher {
    return this.systemWatcher;
  }

  /**
   * Execute complete workflow pipeline
   */
  public async executeCompleteWorkflow(requirementInput: Record<string, any>): Promise<WorkflowExecution> {
    const completeWorkflow = this.workflowManager.createCompleteWorkflowPipeline();
    return this.executeWorkflow(completeWorkflow, requirementInput);
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<OrchestratorConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update component configurations
    if (newConfig.cacheConfig) {
      this.cacheManager.updateConfig(newConfig.cacheConfig);
    }
    
    if (newConfig.loadBalancingStrategy) {
      this.loadBalancer.setStrategy(newConfig.loadBalancingStrategy);
    }

    this.emit("config:updated", this.config);
  }

  /**
   * Setup event handlers for cross-component communication
   */
  private setupEventHandlers(): void {
    // System health events
    this.systemWatcher.on("component:health_changed", async (data) => {
      await this.eventDispatcher.createEvent(
        "system:component_health_changed",
        "system-watcher",
        data
      );
    });

    // Load balancer events
    this.loadBalancer.on("agent:load_updated", async (data) => {
      await this.eventDispatcher.createEvent(
        "load_balancer:agent_load_updated",
        "load-balancer",
        data
      );
    });

    // Workflow events
    this.workflowManager.on("workflow:registered", async (workflow) => {
      await this.eventDispatcher.createEvent(
        "workflow:registered",
        "workflow-manager",
        { workflowId: workflow.id, workflowName: workflow.name }
      );
    });

    // Cache events
    this.cacheManager.on("cache:evicted", async (data) => {
      await this.eventDispatcher.createEvent(
        "cache:entry_evicted",
        "cache-manager",
        data
      );
    });

    // Error handling
    this.on("error", async (error) => {
      await this.eventDispatcher.createEvent(
        "orchestrator:error",
        "orchestrator",
        {
          error: error.message,
          stack: error.stack,
          timestamp: new Date(),
        },
        { priority: "critical" }
      );
    });
  }

  /**
   * Register system components for monitoring
   */
  private registerSystemComponents(): void {
    const components: SystemComponent[] = [
      {
        id: "event-dispatcher",
        name: "Event Dispatcher",
        type: "api",
        status: "healthy",
        lastHealthCheck: new Date(),
      },
      {
        id: "cache-manager",
        name: "Cache Manager",
        type: "cache",
        status: "healthy",
        lastHealthCheck: new Date(),
      },
      {
        id: "load-balancer",
        name: "Load Balancer",
        type: "api",
        status: "healthy",
        lastHealthCheck: new Date(),
      },
      {
        id: "coordination-engine",
        name: "Coordination Engine",
        type: "api",
        status: "healthy",
        lastHealthCheck: new Date(),
      },
      {
        id: "workflow-manager",
        name: "Workflow Manager",
        type: "api",
        status: "healthy",
        lastHealthCheck: new Date(),
      },
    ];

    for (const component of components) {
      this.systemWatcher.registerComponent(component);
    }
  }

  /**
   * Register default workflows
   */
  private registerDefaultWorkflows(): void {
    // Register the complete development pipeline workflow
    const completeWorkflow = this.workflowManager.createCompleteWorkflowPipeline();
    this.workflowManager.registerWorkflow(completeWorkflow);

    // Register other default workflows as needed
    const simpleWorkflow: WorkflowDefinition = {
      id: "simple_task_execution",
      name: "Simple Task Execution",
      description: "Execute a single task with an agent",
      steps: [
        {
          id: "task_execution",
          name: "Execute Task",
          type: "execution",
          timeout: 300000, // 5 minutes
        },
      ],
      timeout: 600000, // 10 minutes
    };

    this.workflowManager.registerWorkflow(simpleWorkflow);
  }
}

// Export types and classes
export * from "./types";
export { SystemWatcher } from "./system-watcher";
export { EventDispatcher } from "./event-dispatcher";
export { CoordinationEngine } from "./coordination-engine";
export { WorkflowManager } from "./workflow-manager";
export { CacheManager } from "../utils/cache-manager";
export { LoadBalancer } from "../ai/coordination/load-balancer";

// Default export
export default Orchestrator;

