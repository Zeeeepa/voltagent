import { ResourceRequirements, TaskId } from "./types";

/**
 * Error thrown when resource allocation fails
 */
export class ResourceAllocationError extends Error {
  constructor(public readonly taskId: TaskId, public readonly resource: string, public readonly required: number, public readonly available: number) {
    super(`Cannot allocate resource "${resource}" for task "${taskId}": required ${required}, available ${available}`);
    this.name = "ResourceAllocationError";
  }
}

/**
 * ResourceManager is responsible for tracking and allocating resources
 * for parallel task execution.
 */
export class ResourceManager {
  // Total available resources
  private totalResources: Record<string, number>;
  
  // Currently allocated resources
  private allocatedResources: Record<string, number>;
  
  // Resource allocations by task
  private taskAllocations: Map<TaskId, Record<string, number>>;
  
  /**
   * Creates a new ResourceManager
   * @param resources Available resources (default: unlimited CPU and memory)
   */
  constructor(resources: Record<string, number> = { cpu: Infinity, memory: Infinity, concurrency: Infinity }) {
    this.totalResources = { ...resources };
    this.allocatedResources = Object.keys(this.totalResources).reduce((acc, key) => {
      acc[key] = 0;
      return acc;
    }, {} as Record<string, number>);
    this.taskAllocations = new Map();
  }
  
  /**
   * Gets the available resources
   * @returns Record of available resources
   */
  public getAvailableResources(): Record<string, number> {
    const available: Record<string, number> = {};
    
    for (const [resource, total] of Object.entries(this.totalResources)) {
      available[resource] = total - (this.allocatedResources[resource] || 0);
    }
    
    return available;
  }
  
  /**
   * Checks if resources are available for a task
   * @param taskId Task ID
   * @param requirements Resource requirements
   * @returns True if resources are available, false otherwise
   */
  public canAllocate(taskId: TaskId, requirements: ResourceRequirements): boolean {
    try {
      this.validateResourceRequirements(taskId, requirements);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Validates resource requirements against available resources
   * @param taskId Task ID
   * @param requirements Resource requirements
   * @throws {ResourceAllocationError} If resources are not available
   */
  private validateResourceRequirements(taskId: TaskId, requirements: ResourceRequirements): void {
    const available = this.getAvailableResources();
    
    for (const [resource, required] of Object.entries(requirements)) {
      // Skip if resource is not a number or is not defined
      if (typeof required !== "number") {
        continue;
      }
      
      // Check if resource is defined in total resources
      if (!(resource in this.totalResources)) {
        this.totalResources[resource] = Infinity;
        this.allocatedResources[resource] = 0;
      }
      
      // Check if enough resources are available
      if (required > available[resource]) {
        throw new ResourceAllocationError(taskId, resource, required, available[resource]);
      }
    }
  }
  
  /**
   * Allocates resources for a task
   * @param taskId Task ID
   * @param requirements Resource requirements
   * @throws {ResourceAllocationError} If resources are not available
   */
  public allocate(taskId: TaskId, requirements: ResourceRequirements): void {
    // Validate resource requirements
    this.validateResourceRequirements(taskId, requirements);
    
    // Allocate resources
    const allocation: Record<string, number> = {};
    
    for (const [resource, required] of Object.entries(requirements)) {
      // Skip if resource is not a number
      if (typeof required !== "number") {
        continue;
      }
      
      // Allocate resource
      this.allocatedResources[resource] = (this.allocatedResources[resource] || 0) + required;
      allocation[resource] = required;
    }
    
    // Store allocation for task
    this.taskAllocations.set(taskId, allocation);
  }
  
  /**
   * Releases resources allocated for a task
   * @param taskId Task ID
   */
  public release(taskId: TaskId): void {
    const allocation = this.taskAllocations.get(taskId);
    
    if (!allocation) {
      return;
    }
    
    // Release resources
    for (const [resource, allocated] of Object.entries(allocation)) {
      this.allocatedResources[resource] -= allocated;
    }
    
    // Remove allocation
    this.taskAllocations.delete(taskId);
  }
  
  /**
   * Gets the current resource utilization
   * @returns Record of resource utilization (0-1)
   */
  public getUtilization(): Record<string, number> {
    const utilization: Record<string, number> = {};
    
    for (const [resource, total] of Object.entries(this.totalResources)) {
      // Skip infinite resources
      if (!isFinite(total)) {
        utilization[resource] = 0;
        continue;
      }
      
      const allocated = this.allocatedResources[resource] || 0;
      utilization[resource] = allocated / total;
    }
    
    return utilization;
  }
  
  /**
   * Gets the resources allocated to a task
   * @param taskId Task ID
   * @returns Allocated resources or null if task has no allocations
   */
  public getAllocatedResources(taskId: TaskId): Record<string, number> | null {
    return this.taskAllocations.get(taskId) || null;
  }
  
  /**
   * Updates the total available resources
   * @param resources New total resources
   */
  public updateTotalResources(resources: Record<string, number>): void {
    this.totalResources = { ...resources };
    
    // Ensure allocated resources don't exceed total
    for (const [resource, allocated] of Object.entries(this.allocatedResources)) {
      const total = this.totalResources[resource] || 0;
      
      if (allocated > total) {
        this.allocatedResources[resource] = total;
      }
    }
  }
}

