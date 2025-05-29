import { EventEmitter } from "events";
import type {
  SystemComponent,
  ComponentHealth,
  PerformanceMetrics,
  ComponentType,
  OrchestratorConfig,
} from "./types";

/**
 * System Watcher for monitoring component health and performance
 */
export class SystemWatcher extends EventEmitter {
  private components: Map<string, SystemComponent> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;
  private metricsInterval?: NodeJS.Timeout;
  private isRunning = false;
  private config: OrchestratorConfig;

  constructor(config: OrchestratorConfig) {
    super();
    this.config = config;
  }

  /**
   * Start the system watcher
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.startHealthChecks();
    this.startMetricsCollection();
    
    this.emit("watcher:started");
  }

  /**
   * Stop the system watcher
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }

    this.emit("watcher:stopped");
  }

  /**
   * Register a component for monitoring
   */
  public registerComponent(component: SystemComponent): void {
    this.components.set(component.id, {
      ...component,
      lastHealthCheck: new Date(),
    });
    
    this.emit("component:registered", component);
  }

  /**
   * Unregister a component from monitoring
   */
  public unregisterComponent(componentId: string): void {
    const component = this.components.get(componentId);
    if (component) {
      this.components.delete(componentId);
      this.emit("component:unregistered", component);
    }
  }

  /**
   * Get all registered components
   */
  public getComponents(): SystemComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * Get a specific component by ID
   */
  public getComponent(componentId: string): SystemComponent | undefined {
    return this.components.get(componentId);
  }

  /**
   * Update component health status
   */
  public updateComponentHealth(componentId: string, status: ComponentHealth, metadata?: Record<string, any>): void {
    const component = this.components.get(componentId);
    if (component) {
      const previousStatus = component.status;
      component.status = status;
      component.lastHealthCheck = new Date();
      
      if (metadata) {
        component.metadata = { ...component.metadata, ...metadata };
      }

      this.components.set(componentId, component);
      
      // Emit health change event if status changed
      if (previousStatus !== status) {
        this.emit("component:health_changed", {
          componentId,
          previousStatus,
          currentStatus: status,
          component,
        });
      }
    }
  }

  /**
   * Get overall system health
   */
  public getSystemHealth(): ComponentHealth {
    const components = Array.from(this.components.values());
    
    if (components.length === 0) {
      return "unknown";
    }

    const healthCounts = components.reduce((counts, component) => {
      counts[component.status] = (counts[component.status] || 0) + 1;
      return counts;
    }, {} as Record<ComponentHealth, number>);

    // System is unhealthy if any critical component is unhealthy
    if (healthCounts.unhealthy > 0) {
      return "unhealthy";
    }

    // System is degraded if any component is degraded
    if (healthCounts.degraded > 0) {
      return "degraded";
    }

    // System is healthy if all components are healthy
    if (healthCounts.healthy === components.length) {
      return "healthy";
    }

    return "unknown";
  }

  /**
   * Get system performance metrics
   */
  public async getSystemMetrics(): Promise<PerformanceMetrics> {
    const components = Array.from(this.components.values());
    const healthyComponents = components.filter(c => c.status === "healthy");
    
    // Calculate aggregate metrics
    const metrics: PerformanceMetrics = {
      responseTime: this.calculateAverageResponseTime(),
      throughput: this.calculateSystemThroughput(),
      errorRate: this.calculateErrorRate(),
      memoryUsage: await this.getMemoryUsage(),
      cpuUsage: await this.getCpuUsage(),
      timestamp: new Date(),
    };

    this.emit("metrics:collected", metrics);
    return metrics;
  }

  /**
   * Check if system is healthy
   */
  public isSystemHealthy(): boolean {
    const health = this.getSystemHealth();
    return health === "healthy" || health === "degraded";
  }

  /**
   * Get components by type
   */
  public getComponentsByType(type: ComponentType): SystemComponent[] {
    return Array.from(this.components.values()).filter(c => c.type === type);
  }

  /**
   * Get unhealthy components
   */
  public getUnhealthyComponents(): SystemComponent[] {
    return Array.from(this.components.values()).filter(c => 
      c.status === "unhealthy" || c.status === "degraded"
    );
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.config.healthCheckInterval);
  }

  /**
   * Start periodic metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      await this.getSystemMetrics();
    }, this.config.metricsCollectionInterval);
  }

  /**
   * Perform health checks on all components
   */
  private async performHealthChecks(): Promise<void> {
    const components = Array.from(this.components.values());
    
    for (const component of components) {
      try {
        await this.checkComponentHealth(component);
      } catch (error) {
        this.updateComponentHealth(component.id, "unhealthy", {
          error: error instanceof Error ? error.message : "Unknown error",
          lastError: new Date(),
        });
      }
    }
  }

  /**
   * Check health of a specific component
   */
  private async checkComponentHealth(component: SystemComponent): Promise<void> {
    // Component-specific health check logic
    switch (component.type) {
      case "agent":
        await this.checkAgentHealth(component);
        break;
      case "database":
        await this.checkDatabaseHealth(component);
        break;
      case "api":
        await this.checkApiHealth(component);
        break;
      case "cache":
        await this.checkCacheHealth(component);
        break;
      case "external":
        await this.checkExternalHealth(component);
        break;
      default:
        // Generic health check
        this.updateComponentHealth(component.id, "healthy");
    }
  }

  /**
   * Check agent health
   */
  private async checkAgentHealth(component: SystemComponent): Promise<void> {
    // Agent-specific health checks
    // This would integrate with the Agent class to check if it's responsive
    this.updateComponentHealth(component.id, "healthy", {
      lastCheck: new Date(),
      checkType: "agent_ping",
    });
  }

  /**
   * Check database health
   */
  private async checkDatabaseHealth(component: SystemComponent): Promise<void> {
    // Database-specific health checks
    // This would perform a simple query to verify connectivity
    this.updateComponentHealth(component.id, "healthy", {
      lastCheck: new Date(),
      checkType: "database_query",
    });
  }

  /**
   * Check API health
   */
  private async checkApiHealth(component: SystemComponent): Promise<void> {
    // API-specific health checks
    // This would make a health endpoint request
    this.updateComponentHealth(component.id, "healthy", {
      lastCheck: new Date(),
      checkType: "api_ping",
    });
  }

  /**
   * Check cache health
   */
  private async checkCacheHealth(component: SystemComponent): Promise<void> {
    // Cache-specific health checks
    // This would test cache read/write operations
    this.updateComponentHealth(component.id, "healthy", {
      lastCheck: new Date(),
      checkType: "cache_operation",
    });
  }

  /**
   * Check external service health
   */
  private async checkExternalHealth(component: SystemComponent): Promise<void> {
    // External service health checks
    // This would ping external services
    this.updateComponentHealth(component.id, "healthy", {
      lastCheck: new Date(),
      checkType: "external_ping",
    });
  }

  /**
   * Calculate average response time across components
   */
  private calculateAverageResponseTime(): number {
    // Implementation would track actual response times
    // For now, return a mock value
    return Math.random() * 1000 + 100; // 100-1100ms
  }

  /**
   * Calculate system throughput
   */
  private calculateSystemThroughput(): number {
    // Implementation would track actual throughput
    // For now, return a mock value
    return Math.random() * 1000 + 500; // 500-1500 requests/min
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(): number {
    // Implementation would track actual error rates
    // For now, return a mock value
    return Math.random() * 0.05; // 0-5% error rate
  }

  /**
   * Get memory usage
   */
  private async getMemoryUsage(): Promise<number> {
    const memUsage = process.memoryUsage();
    return memUsage.heapUsed / 1024 / 1024; // MB
  }

  /**
   * Get CPU usage
   */
  private async getCpuUsage(): Promise<number> {
    // Simple CPU usage calculation
    const startUsage = process.cpuUsage();
    await new Promise(resolve => setTimeout(resolve, 100));
    const endUsage = process.cpuUsage(startUsage);
    
    const totalUsage = endUsage.user + endUsage.system;
    return (totalUsage / 1000000) * 10; // Convert to percentage
  }
}

