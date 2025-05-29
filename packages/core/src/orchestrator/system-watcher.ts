import { EventEmitter } from "events";
import type {
  ComponentStatus,
  ComponentHealth,
  OrchestratorComponent,
  SystemMetrics,
  SystemHealthStatus,
  OrchestratorEvent,
} from "./types";

/**
 * Resource usage information
 */
export interface ResourceUsage {
  cpu: number;
  memory: number;
  disk?: number;
  network?: number;
  timestamp: Date;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  successRate: number;
  timestamp: Date;
}

/**
 * Component registration info
 */
export interface ComponentRegistration {
  component: OrchestratorComponent;
  healthCheckInterval: number;
  performanceTracking: boolean;
  autoRestart: boolean;
  maxRestarts: number;
  restartCount: number;
  lastRestart?: Date;
}

/**
 * System Watcher - Monitor all system components and health
 */
export class SystemWatcher implements OrchestratorComponent {
  public readonly id: string;
  public readonly name: string = "SystemWatcher";
  private _status: ComponentStatus = "idle";
  private components: Map<string, ComponentRegistration> = new Map();
  private healthCheckTimers: Map<string, NodeJS.Timeout> = new Map();
  private systemMetrics: SystemMetrics[] = [];
  private resourceUsage: ResourceUsage[] = [];
  private performanceMetrics: Map<string, PerformanceMetrics[]> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();
  private startTime: Date = new Date();
  private errorCount: number = 0;
  private lastError?: Error;
  private metricsTimer?: NodeJS.Timeout;
  private readonly maxMetricsHistory: number;
  private readonly metricsInterval: number;
  private readonly defaultHealthCheckInterval: number;

  constructor(options: {
    id?: string;
    maxMetricsHistory?: number;
    metricsInterval?: number;
    defaultHealthCheckInterval?: number;
  } = {}) {
    this.id = options.id || `system-watcher-${Date.now()}`;
    this.maxMetricsHistory = options.maxMetricsHistory || 1000;
    this.metricsInterval = options.metricsInterval || 30000; // 30 seconds
    this.defaultHealthCheckInterval = options.defaultHealthCheckInterval || 10000; // 10 seconds
  }

  public get status(): ComponentStatus {
    return this._status;
  }

  /**
   * Start the system watcher
   */
  public async start(): Promise<void> {
    if (this._status === "running") {
      return;
    }

    this._status = "starting";

    try {
      // Start metrics collection
      this.metricsTimer = setInterval(
        () => this.collectSystemMetrics(),
        this.metricsInterval
      );

      // Start health checks for registered components
      for (const [componentId, registration] of this.components.entries()) {
        this.startHealthCheck(componentId, registration);
      }

      this._status = "running";
      this.startTime = new Date();

      this.emitSystemEvent("system.watcher.started", {
        watcherId: this.id,
        componentCount: this.components.size,
        metricsInterval: this.metricsInterval,
      });
    } catch (error) {
      this._status = "error";
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Stop the system watcher
   */
  public async stop(): Promise<void> {
    if (this._status === "stopped") {
      return;
    }

    this._status = "stopping";

    try {
      // Stop metrics collection
      if (this.metricsTimer) {
        clearInterval(this.metricsTimer);
        this.metricsTimer = undefined;
      }

      // Stop all health check timers
      for (const timer of this.healthCheckTimers.values()) {
        clearInterval(timer);
      }
      this.healthCheckTimers.clear();

      this._status = "stopped";

      this.emitSystemEvent("system.watcher.stopped", {
        watcherId: this.id,
        uptime: Date.now() - this.startTime.getTime(),
        totalMetrics: this.systemMetrics.length,
      });
    } catch (error) {
      this._status = "error";
      this.handleError(error as Error);
      throw error;
    }
  }

  /**
   * Restart the system watcher
   */
  public async restart(): Promise<void> {
    await this.stop();
    await this.start();
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
      memoryUsage: this.getCurrentMemoryUsage(),
      cpuUsage: this.getCurrentCpuUsage(),
      errorCount: this.errorCount,
      lastError: this.lastError,
      metadata: {
        componentCount: this.components.size,
        activeHealthChecks: this.healthCheckTimers.size,
        metricsHistory: this.systemMetrics.length,
        systemHealth: this.getSystemHealthStatus(),
      },
    };
  }

  /**
   * Get component metrics
   */
  public getMetrics(): Record<string, unknown> {
    const latestMetrics = this.systemMetrics[this.systemMetrics.length - 1];
    return {
      componentCount: this.components.size,
      activeHealthChecks: this.healthCheckTimers.size,
      metricsHistory: this.systemMetrics.length,
      uptime: Date.now() - this.startTime.getTime(),
      errorRate: this.errorCount / Math.max(this.systemMetrics.length, 1),
      systemHealth: this.getSystemHealthStatus(),
      latestMetrics: latestMetrics || null,
    };
  }

  /**
   * Register a component for monitoring
   */
  public registerComponent(
    component: OrchestratorComponent,
    options: {
      healthCheckInterval?: number;
      performanceTracking?: boolean;
      autoRestart?: boolean;
      maxRestarts?: number;
    } = {}
  ): void {
    const registration: ComponentRegistration = {
      component,
      healthCheckInterval: options.healthCheckInterval || this.defaultHealthCheckInterval,
      performanceTracking: options.performanceTracking ?? true,
      autoRestart: options.autoRestart ?? false,
      maxRestarts: options.maxRestarts || 3,
      restartCount: 0,
    };

    this.components.set(component.id, registration);

    // Start health check if watcher is running
    if (this._status === "running") {
      this.startHealthCheck(component.id, registration);
    }

    this.emitSystemEvent("component.registered", {
      componentId: component.id,
      componentName: component.name,
      healthCheckInterval: registration.healthCheckInterval,
      performanceTracking: registration.performanceTracking,
    });
  }

  /**
   * Unregister a component from monitoring
   */
  public unregisterComponent(componentId: string): void {
    const registration = this.components.get(componentId);
    if (!registration) {
      return;
    }

    // Stop health check
    this.stopHealthCheck(componentId);

    // Remove from tracking
    this.components.delete(componentId);
    this.performanceMetrics.delete(componentId);

    this.emitSystemEvent("component.unregistered", {
      componentId,
      componentName: registration.component.name,
    });
  }

  /**
   * Get all registered components
   */
  public getRegisteredComponents(): OrchestratorComponent[] {
    return Array.from(this.components.values()).map(reg => reg.component);
  }

  /**
   * Get component health by ID
   */
  public getComponentHealth(componentId: string): ComponentHealth | undefined {
    const registration = this.components.get(componentId);
    if (!registration) {
      return undefined;
    }

    try {
      return registration.component.getHealth();
    } catch (error) {
      this.handleError(error as Error);
      return undefined;
    }
  }

  /**
   * Get all component health information
   */
  public getAllComponentHealth(): Map<string, ComponentHealth> {
    const healthMap = new Map<string, ComponentHealth>();

    for (const [componentId, registration] of this.components.entries()) {
      try {
        const health = registration.component.getHealth();
        healthMap.set(componentId, health);
      } catch (error) {
        this.handleError(error as Error);
        // Add error health entry
        healthMap.set(componentId, {
          id: componentId,
          name: registration.component.name,
          status: "error",
          lastHeartbeat: new Date(),
          uptime: 0,
          errorCount: 1,
          lastError: error as Error,
        });
      }
    }

    return healthMap;
  }

  /**
   * Get system health status
   */
  public getSystemHealthStatus(): SystemHealthStatus {
    const componentHealthMap = this.getAllComponentHealth();
    const healthStatuses = Array.from(componentHealthMap.values()).map(h => h.status);

    if (healthStatuses.length === 0) {
      return "unknown";
    }

    const errorCount = healthStatuses.filter(s => s === "error").length;
    const stoppedCount = healthStatuses.filter(s => s === "stopped").length;
    const runningCount = healthStatuses.filter(s => s === "running").length;

    const totalComponents = healthStatuses.length;
    const healthyRatio = runningCount / totalComponents;

    if (errorCount > 0 || stoppedCount > totalComponents * 0.5) {
      return "unhealthy";
    } else if (healthyRatio < 0.8) {
      return "degraded";
    } else {
      return "healthy";
    }
  }

  /**
   * Get latest system metrics
   */
  public getLatestSystemMetrics(): SystemMetrics | undefined {
    return this.systemMetrics[this.systemMetrics.length - 1];
  }

  /**
   * Get system metrics history
   */
  public getSystemMetricsHistory(limit?: number): SystemMetrics[] {
    if (limit) {
      return this.systemMetrics.slice(-limit);
    }
    return [...this.systemMetrics];
  }

  /**
   * Get resource usage history
   */
  public getResourceUsageHistory(limit?: number): ResourceUsage[] {
    if (limit) {
      return this.resourceUsage.slice(-limit);
    }
    return [...this.resourceUsage];
  }

  /**
   * Get performance metrics for a component
   */
  public getComponentPerformanceMetrics(componentId: string, limit?: number): PerformanceMetrics[] {
    const metrics = this.performanceMetrics.get(componentId) || [];
    if (limit) {
      return metrics.slice(-limit);
    }
    return [...metrics];
  }

  /**
   * Force restart a component
   */
  public async restartComponent(componentId: string): Promise<boolean> {
    const registration = this.components.get(componentId);
    if (!registration) {
      return false;
    }

    try {
      await registration.component.restart();
      registration.restartCount++;
      registration.lastRestart = new Date();

      this.emitSystemEvent("component.restarted", {
        componentId,
        componentName: registration.component.name,
        restartCount: registration.restartCount,
      });

      return true;
    } catch (error) {
      this.handleError(error as Error);
      return false;
    }
  }

  /**
   * Subscribe to system events
   */
  public onSystemEvent(eventType: string, callback: (event: OrchestratorEvent) => void): void {
    this.eventEmitter.on(eventType, callback);
  }

  /**
   * Unsubscribe from system events
   */
  public offSystemEvent(eventType: string, callback: (event: OrchestratorEvent) => void): void {
    this.eventEmitter.off(eventType, callback);
  }

  /**
   * Start health check for a component
   */
  private startHealthCheck(componentId: string, registration: ComponentRegistration): void {
    // Stop existing timer if any
    this.stopHealthCheck(componentId);

    const timer = setInterval(async () => {
      try {
        const health = registration.component.getHealth();
        
        // Check if component needs restart
        if (health.status === "error" && registration.autoRestart) {
          if (registration.restartCount < registration.maxRestarts) {
            await this.restartComponent(componentId);
          } else {
            this.emitSystemEvent("component.restart.limit.exceeded", {
              componentId,
              componentName: registration.component.name,
              restartCount: registration.restartCount,
              maxRestarts: registration.maxRestarts,
            });
          }
        }

        // Emit health check event
        this.emitSystemEvent("component.health.checked", {
          componentId,
          componentName: registration.component.name,
          health,
        });

        // Track performance metrics if enabled
        if (registration.performanceTracking) {
          this.trackComponentPerformance(componentId, registration.component);
        }
      } catch (error) {
        this.handleError(error as Error);
        
        this.emitSystemEvent("component.health.check.failed", {
          componentId,
          componentName: registration.component.name,
          error: (error as Error).message,
        });
      }
    }, registration.healthCheckInterval);

    this.healthCheckTimers.set(componentId, timer);
  }

  /**
   * Stop health check for a component
   */
  private stopHealthCheck(componentId: string): void {
    const timer = this.healthCheckTimers.get(componentId);
    if (timer) {
      clearInterval(timer);
      this.healthCheckTimers.delete(componentId);
    }
  }

  /**
   * Collect system-wide metrics
   */
  private collectSystemMetrics(): void {
    try {
      const componentHealthMap = this.getAllComponentHealth();
      const healthStatuses = Array.from(componentHealthMap.values());

      const metrics: SystemMetrics = {
        timestamp: new Date(),
        totalAgents: this.components.size,
        activeWorkflows: this.countActiveWorkflows(),
        completedTasks: this.countCompletedTasks(),
        failedTasks: this.countFailedTasks(),
        averageResponseTime: this.calculateAverageResponseTime(),
        memoryUsage: this.getCurrentMemoryUsage(),
        cpuUsage: this.getCurrentCpuUsage(),
      };

      this.systemMetrics.push(metrics);

      // Maintain metrics history limit
      if (this.systemMetrics.length > this.maxMetricsHistory) {
        this.systemMetrics = this.systemMetrics.slice(-this.maxMetricsHistory);
      }

      // Collect resource usage
      const resourceUsage: ResourceUsage = {
        cpu: metrics.cpuUsage,
        memory: metrics.memoryUsage,
        timestamp: new Date(),
      };

      this.resourceUsage.push(resourceUsage);

      // Maintain resource usage history limit
      if (this.resourceUsage.length > this.maxMetricsHistory) {
        this.resourceUsage = this.resourceUsage.slice(-this.maxMetricsHistory);
      }

      this.emitSystemEvent("system.metrics.collected", {
        metrics,
        systemHealth: this.getSystemHealthStatus(),
      });
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Track performance metrics for a component
   */
  private trackComponentPerformance(componentId: string, component: OrchestratorComponent): void {
    try {
      const componentMetrics = component.getMetrics();
      
      const performanceMetric: PerformanceMetrics = {
        responseTime: (componentMetrics.responseTime as number) || 0,
        throughput: (componentMetrics.throughput as number) || 0,
        errorRate: (componentMetrics.errorRate as number) || 0,
        successRate: 1 - ((componentMetrics.errorRate as number) || 0),
        timestamp: new Date(),
      };

      if (!this.performanceMetrics.has(componentId)) {
        this.performanceMetrics.set(componentId, []);
      }

      const metrics = this.performanceMetrics.get(componentId)!;
      metrics.push(performanceMetric);

      // Maintain metrics history limit
      if (metrics.length > this.maxMetricsHistory) {
        this.performanceMetrics.set(componentId, metrics.slice(-this.maxMetricsHistory));
      }
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Count active workflows (placeholder)
   */
  private countActiveWorkflows(): number {
    // This would integrate with the workflow manager
    return 0;
  }

  /**
   * Count completed tasks (placeholder)
   */
  private countCompletedTasks(): number {
    // This would integrate with the task orchestrator
    return 0;
  }

  /**
   * Count failed tasks (placeholder)
   */
  private countFailedTasks(): number {
    // This would integrate with the task orchestrator
    return 0;
  }

  /**
   * Calculate average response time (placeholder)
   */
  private calculateAverageResponseTime(): number {
    // This would calculate based on component performance metrics
    const allMetrics = Array.from(this.performanceMetrics.values()).flat();
    if (allMetrics.length === 0) return 0;
    
    const totalResponseTime = allMetrics.reduce((sum, metric) => sum + metric.responseTime, 0);
    return totalResponseTime / allMetrics.length;
  }

  /**
   * Get current memory usage
   */
  private getCurrentMemoryUsage(): number {
    if (typeof process !== "undefined" && process.memoryUsage) {
      const usage = process.memoryUsage();
      return usage.heapUsed / 1024 / 1024; // MB
    }
    return 0;
  }

  /**
   * Get current CPU usage (placeholder)
   */
  private getCurrentCpuUsage(): number {
    // This would require platform-specific implementation
    // For now, return a placeholder value
    return 0;
  }

  /**
   * Emit system-related events
   */
  private emitSystemEvent(type: string, data: any): void {
    const event: OrchestratorEvent = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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
    console.error(`SystemWatcher Error:`, error);

    this.emitSystemEvent("system.watcher.error", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date(),
    });
  }
}

