/**
 * Resource types that can be monitored
 */
export type ResourceType = 'memory' | 'cpu' | 'disk';

/**
 * Resource usage data
 */
export interface ResourceUsage {
  memory: number; // Percentage of memory used
  cpu: number;    // Percentage of CPU used
  disk: number;   // Percentage of disk used
}

/**
 * Callback for resource threshold events
 */
export type ResourceCallback = (resource: ResourceType, value: number) => void;

/**
 * Monitors system resources and provides feedback for optimization
 */
export class ResourceMonitor {
  private interval: NodeJS.Timeout | null = null;
  private monitoringInterval: number = 5000; // 5 seconds
  private warningThresholds: Record<ResourceType, number> = {
    memory: 70, // 70%
    cpu: 80,    // 80%
    disk: 85    // 85%
  };
  private criticalThresholds: Record<ResourceType, number> = {
    memory: 85, // 85%
    cpu: 90,    // 90%
    disk: 95    // 95%
  };
  private warningCallbacks: ResourceCallback[] = [];
  private criticalCallbacks: ResourceCallback[] = [];
  private lastUsage: ResourceUsage = { memory: 0, cpu: 0, disk: 0 };

  /**
   * Creates a new ResourceMonitor instance
   * 
   * @param autoStart Whether to automatically start monitoring
   */
  constructor(autoStart: boolean = true) {
    if (autoStart) {
      this.start();
    }
  }

  /**
   * Starts resource monitoring
   */
  start(): void {
    if (this.interval) {
      return;
    }

    this.interval = setInterval(() => {
      this.checkResources();
    }, this.monitoringInterval);
  }

  /**
   * Stops resource monitoring
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Sets the monitoring interval
   * 
   * @param ms Interval in milliseconds
   */
  setMonitoringInterval(ms: number): void {
    this.monitoringInterval = ms;
    if (this.interval) {
      this.stop();
      this.start();
    }
  }

  /**
   * Sets a warning threshold for a resource
   * 
   * @param resource The resource type
   * @param threshold The threshold percentage (0-100)
   */
  setWarningThreshold(resource: ResourceType, threshold: number): void {
    this.warningThresholds[resource] = threshold;
  }

  /**
   * Sets a critical threshold for a resource
   * 
   * @param resource The resource type
   * @param threshold The threshold percentage (0-100)
   */
  setCriticalThreshold(resource: ResourceType, threshold: number): void {
    this.criticalThresholds[resource] = threshold;
  }

  /**
   * Registers a callback for warning threshold events
   * 
   * @param callback The callback function
   */
  onWarningResource(callback: ResourceCallback): void {
    this.warningCallbacks.push(callback);
  }

  /**
   * Registers a callback for critical threshold events
   * 
   * @param callback The callback function
   */
  onCriticalResource(callback: ResourceCallback): void {
    this.criticalCallbacks.push(callback);
  }

  /**
   * Gets the current resource usage
   * 
   * @returns The current resource usage
   */
  getCurrentUsage(): ResourceUsage {
    return { ...this.lastUsage };
  }

  /**
   * Checks current resource usage and triggers callbacks if thresholds are exceeded
   */
  private checkResources(): void {
    // In a browser environment, we would use performance.memory
    // In Node.js, we would use process.memoryUsage(), os.cpus(), etc.
    // For this implementation, we'll use a simple simulation

    // Simulate resource usage
    const usage: ResourceUsage = this.getResourceUsage();
    this.lastUsage = usage;

    // Check thresholds and trigger callbacks
    for (const resource of ['memory', 'cpu', 'disk'] as ResourceType[]) {
      const value = usage[resource];
      
      if (value >= this.criticalThresholds[resource]) {
        for (const callback of this.criticalCallbacks) {
          callback(resource, value);
        }
      } else if (value >= this.warningThresholds[resource]) {
        for (const callback of this.warningCallbacks) {
          callback(resource, value);
        }
      }
    }
  }

  /**
   * Gets the current resource usage (simulated in this implementation)
   * 
   * @returns The current resource usage
   */
  private getResourceUsage(): ResourceUsage {
    // In a real implementation, this would use platform-specific APIs
    // For now, we'll simulate resource usage
    
    // This is a simplified implementation for demonstration purposes
    // In a real application, you would use:
    // - For Node.js: process.memoryUsage(), os.cpus(), etc.
    // - For browsers: performance.memory, navigator.hardwareConcurrency, etc.
    
    return {
      memory: Math.min(100, this.lastUsage.memory + (Math.random() * 10 - 5)),
      cpu: Math.min(100, this.lastUsage.cpu + (Math.random() * 10 - 5)),
      disk: Math.min(100, this.lastUsage.disk + (Math.random() * 2 - 1))
    };
  }
}

