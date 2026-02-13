/**
 * Deadlock Detector
 * 
 * This module implements deadlock detection algorithms to identify potential
 * deadlocks in the resource allocation graph.
 */

import { v4 as uuidv4 } from 'uuid';
import { WorkstreamId } from '../types';
import { 
  DeadlockDetectionAlgorithm, 
  DeadlockPreventionStrategy,
  ResourceNode,
  WorkstreamNode,
  ResourceEdge,
  DeadlockInfo
} from './types';

/**
 * Options for deadlock detection
 */
export interface DeadlockDetectionOptions {
  /**
   * Algorithm to use for deadlock detection
   */
  algorithm?: DeadlockDetectionAlgorithm;
  
  /**
   * How often to run deadlock detection (in milliseconds)
   */
  detectionInterval?: number;
  
  /**
   * Strategy to use for deadlock prevention
   */
  preventionStrategy?: DeadlockPreventionStrategy;
  
  /**
   * Whether to automatically attempt to resolve deadlocks
   */
  autoResolve?: boolean;
  
  /**
   * Timeout for resource allocation (in milliseconds)
   */
  allocationTimeout?: number;
}

/**
 * Deadlock detector implementation
 */
export class DeadlockDetector {
  private _resources: Map<string, ResourceNode> = new Map();
  private _workstreams: Map<WorkstreamId, WorkstreamNode> = new Map();
  private _edges: ResourceEdge[] = [];
  private _deadlocks: Map<string, DeadlockInfo> = new Map();
  private _options: DeadlockDetectionOptions;
  private _detectionTimer: NodeJS.Timeout | null = null;
  
  /**
   * Create a new deadlock detector
   * 
   * @param options Options for deadlock detection
   */
  constructor(options: DeadlockDetectionOptions = {}) {
    this._options = {
      algorithm: options.algorithm ?? DeadlockDetectionAlgorithm.WAIT_FOR_GRAPH,
      detectionInterval: options.detectionInterval ?? 5000,
      preventionStrategy: options.preventionStrategy ?? DeadlockPreventionStrategy.TIMEOUT,
      autoResolve: options.autoResolve ?? true,
      allocationTimeout: options.allocationTimeout ?? 30000
    };
  }
  
  /**
   * Start periodic deadlock detection
   */
  startDetection(): void {
    if (this._detectionTimer) {
      return;
    }
    
    this._detectionTimer = setInterval(() => {
      this.detectDeadlocks().catch(error => {
        console.error('Error in deadlock detection:', error);
      });
    }, this._options.detectionInterval);
  }
  
  /**
   * Stop periodic deadlock detection
   */
  stopDetection(): void {
    if (this._detectionTimer) {
      clearInterval(this._detectionTimer);
      this._detectionTimer = null;
    }
  }
  
  /**
   * Register a resource in the resource allocation graph
   * 
   * @param resource The resource to register
   * @returns The registered resource
   */
  registerResource(resource: Omit<ResourceNode, 'requestedBy'>): ResourceNode {
    const existingResource = this._resources.get(resource.id);
    
    if (existingResource) {
      return existingResource;
    }
    
    const newResource: ResourceNode = {
      ...resource,
      requestedBy: []
    };
    
    this._resources.set(resource.id, newResource);
    return newResource;
  }
  
  /**
   * Register a workstream in the resource allocation graph
   * 
   * @param workstream The workstream to register
   * @returns The registered workstream
   */
  registerWorkstream(workstream: Omit<WorkstreamNode, 'allocatedResources' | 'requestedResources'>): WorkstreamNode {
    const existingWorkstream = this._workstreams.get(workstream.id);
    
    if (existingWorkstream) {
      return existingWorkstream;
    }
    
    const newWorkstream: WorkstreamNode = {
      ...workstream,
      allocatedResources: [],
      requestedResources: []
    };
    
    this._workstreams.set(workstream.id, newWorkstream);
    return newWorkstream;
  }
  
  /**
   * Record a resource allocation
   * 
   * @param resourceId The ID of the resource being allocated
   * @param workstreamId The ID of the workstream receiving the resource
   */
  recordAllocation(resourceId: string, workstreamId: WorkstreamId): void {
    const resource = this._resources.get(resourceId);
    const workstream = this._workstreams.get(workstreamId);
    
    if (!resource || !workstream) {
      throw new Error(`Resource ${resourceId} or workstream ${workstreamId} not found`);
    }
    
    // Update resource status
    resource.status = 'allocated';
    resource.allocatedTo = workstreamId;
    
    // Remove from requested resources if it was requested
    const requestIndex = workstream.requestedResources.indexOf(resourceId);
    if (requestIndex >= 0) {
      workstream.requestedResources.splice(requestIndex, 1);
    }
    
    // Add to allocated resources
    if (!workstream.allocatedResources.includes(resourceId)) {
      workstream.allocatedResources.push(resourceId);
    }
    
    // Remove any request edges
    this._edges = this._edges.filter(edge => 
      !(edge.type === 'request' && edge.from === workstreamId && edge.to === resourceId)
    );
    
    // Add allocation edge
    this._edges.push({
      from: resourceId,
      to: workstreamId,
      type: 'allocation',
      createdAt: Date.now()
    });
  }
  
  /**
   * Record a resource request
   * 
   * @param resourceId The ID of the resource being requested
   * @param workstreamId The ID of the workstream requesting the resource
   */
  recordRequest(resourceId: string, workstreamId: WorkstreamId): void {
    const resource = this._resources.get(resourceId);
    const workstream = this._workstreams.get(workstreamId);
    
    if (!resource || !workstream) {
      throw new Error(`Resource ${resourceId} or workstream ${workstreamId} not found`);
    }
    
    // Update resource status if it's not already allocated
    if (resource.status !== 'allocated') {
      resource.status = 'requested';
    }
    
    // Add workstream to requestedBy list
    if (!resource.requestedBy.includes(workstreamId)) {
      resource.requestedBy.push(workstreamId);
    }
    
    // Add to requested resources
    if (!workstream.requestedResources.includes(resourceId)) {
      workstream.requestedResources.push(resourceId);
    }
    
    // Add request edge
    this._edges.push({
      from: workstreamId,
      to: resourceId,
      type: 'request',
      createdAt: Date.now()
    });
  }
  
  /**
   * Record a resource release
   * 
   * @param resourceId The ID of the resource being released
   * @param workstreamId The ID of the workstream releasing the resource
   */
  recordRelease(resourceId: string, workstreamId: WorkstreamId): void {
    const resource = this._resources.get(resourceId);
    const workstream = this._workstreams.get(workstreamId);
    
    if (!resource || !workstream) {
      throw new Error(`Resource ${resourceId} or workstream ${workstreamId} not found`);
    }
    
    // Check if this workstream actually holds the resource
    if (resource.allocatedTo !== workstreamId) {
      return;
    }
    
    // Update resource status
    resource.status = resource.requestedBy.length > 0 ? 'requested' : 'free';
    resource.allocatedTo = undefined;
    
    // Remove from allocated resources
    const allocIndex = workstream.allocatedResources.indexOf(resourceId);
    if (allocIndex >= 0) {
      workstream.allocatedResources.splice(allocIndex, 1);
    }
    
    // Remove allocation edges
    this._edges = this._edges.filter(edge => 
      !(edge.type === 'allocation' && edge.from === resourceId && edge.to === workstreamId)
    );
  }
  
  /**
   * Detect deadlocks in the resource allocation graph
   * 
   * @returns Array of detected deadlocks
   */
  async detectDeadlocks(): Promise<DeadlockInfo[]> {
    let detectedDeadlocks: DeadlockInfo[] = [];
    
    switch (this._options.algorithm) {
      case DeadlockDetectionAlgorithm.WAIT_FOR_GRAPH:
        detectedDeadlocks = this._detectDeadlocksWaitForGraph();
        break;
      case DeadlockDetectionAlgorithm.RESOURCE_ALLOCATION_GRAPH:
        detectedDeadlocks = this._detectDeadlocksResourceAllocationGraph();
        break;
      case DeadlockDetectionAlgorithm.BANKER_ALGORITHM:
        detectedDeadlocks = this._detectDeadlocksBankerAlgorithm();
        break;
      case DeadlockDetectionAlgorithm.TIMEOUT_BASED:
        detectedDeadlocks = this._detectDeadlocksTimeoutBased();
        break;
      default:
        throw new Error(`Unsupported deadlock detection algorithm: ${this._options.algorithm}`);
    }
    
    // Store detected deadlocks
    for (const deadlock of detectedDeadlocks) {
      this._deadlocks.set(deadlock.id, deadlock);
      
      // Automatically attempt to resolve if configured
      if (this._options.autoResolve) {
        this.resolveDeadlock(deadlock.id).catch(error => {
          console.error(`Error resolving deadlock ${deadlock.id}:`, error);
        });
      }
    }
    
    return detectedDeadlocks;
  }
  
  /**
   * Resolve a deadlock
   * 
   * @param deadlockId The ID of the deadlock to resolve
   * @returns The resolved deadlock
   */
  async resolveDeadlock(deadlockId: string): Promise<DeadlockInfo> {
    const deadlock = this._deadlocks.get(deadlockId);
    
    if (!deadlock) {
      throw new Error(`Deadlock ${deadlockId} not found`);
    }
    
    // If already resolved, return the deadlock
    if (deadlock.resolved) {
      return deadlock;
    }
    
    // Apply the configured prevention strategy
    switch (deadlock.preventionStrategy) {
      case DeadlockPreventionStrategy.TIMEOUT:
        await this._resolveDeadlockTimeout(deadlock);
        break;
      case DeadlockPreventionStrategy.RESOURCE_ORDERING:
        await this._resolveDeadlockResourceOrdering(deadlock);
        break;
      case DeadlockPreventionStrategy.PREEMPTION:
        await this._resolveDeadlockPreemption(deadlock);
        break;
      case DeadlockPreventionStrategy.AVOIDANCE:
        await this._resolveDeadlockAvoidance(deadlock);
        break;
      case DeadlockPreventionStrategy.DETECTION_RECOVERY:
        await this._resolveDeadlockDetectionRecovery(deadlock);
        break;
      default:
        throw new Error(`Unsupported deadlock prevention strategy: ${deadlock.preventionStrategy}`);
    }
    
    // Mark as resolved
    deadlock.resolved = true;
    deadlock.resolvedAt = Date.now();
    
    return deadlock;
  }
  
  /**
   * Get a deadlock by ID
   * 
   * @param deadlockId The ID of the deadlock
   * @returns The deadlock, or undefined if not found
   */
  getDeadlock(deadlockId: string): DeadlockInfo | undefined {
    return this._deadlocks.get(deadlockId);
  }
  
  /**
   * Get all deadlocks
   * 
   * @returns Array of all deadlocks
   */
  getAllDeadlocks(): DeadlockInfo[] {
    return Array.from(this._deadlocks.values());
  }
  
  /**
   * Get unresolved deadlocks
   * 
   * @returns Array of unresolved deadlocks
   */
  getUnresolvedDeadlocks(): DeadlockInfo[] {
    return Array.from(this._deadlocks.values()).filter(deadlock => !deadlock.resolved);
  }
  
  /**
   * Clear resolved deadlocks
   * 
   * @returns The number of deadlocks cleared
   */
  clearResolvedDeadlocks(): number {
    let count = 0;
    
    for (const [id, deadlock] of this._deadlocks.entries()) {
      if (deadlock.resolved) {
        this._deadlocks.delete(id);
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Detect deadlocks using the wait-for graph algorithm
   */
  private _detectDeadlocksWaitForGraph(): DeadlockInfo[] {
    const deadlocks: DeadlockInfo[] = [];
    const waitForGraph = new Map<WorkstreamId, Set<WorkstreamId>>();
    
    // Build the wait-for graph
    for (const [workstreamId, workstream] of this._workstreams.entries()) {
      const waitingFor = new Set<WorkstreamId>();
      
      // For each requested resource, check if it's allocated to another workstream
      for (const resourceId of workstream.requestedResources) {
        const resource = this._resources.get(resourceId);
        
        if (resource && resource.allocatedTo && resource.allocatedTo !== workstreamId) {
          waitingFor.add(resource.allocatedTo);
        }
      }
      
      if (waitingFor.size > 0) {
        waitForGraph.set(workstreamId, waitingFor);
      }
    }
    
    // Detect cycles in the wait-for graph
    const cycles = this._findCycles(waitForGraph);
    
    // Create deadlock objects for each cycle
    for (const cycle of cycles) {
      const resources: string[] = [];
      const cycleDetails: Array<{workstreamId: WorkstreamId, resourceId: string}> = [];
      
      // Find the resources involved in the cycle
      for (let i = 0; i < cycle.length; i++) {
        const currentWorkstream = cycle[i];
        const nextWorkstream = cycle[(i + 1) % cycle.length];
        
        // Find resources that currentWorkstream is waiting for and are allocated to nextWorkstream
        for (const resourceId of this._workstreams.get(currentWorkstream)?.requestedResources || []) {
          const resource = this._resources.get(resourceId);
          
          if (resource && resource.allocatedTo === nextWorkstream) {
            resources.push(resourceId);
            cycleDetails.push({
              workstreamId: currentWorkstream,
              resourceId
            });
            break;
          }
        }
      }
      
      deadlocks.push({
        id: uuidv4(),
        workstreams: cycle,
        resources,
        detectedAt: Date.now(),
        cycle: cycleDetails,
        detectionAlgorithm: DeadlockDetectionAlgorithm.WAIT_FOR_GRAPH,
        preventionStrategy: this._options.preventionStrategy!,
        resolved: false
      });
    }
    
    return deadlocks;
  }
  
  /**
   * Detect deadlocks using the resource allocation graph algorithm
   */
  private _detectDeadlocksResourceAllocationGraph(): DeadlockInfo[] {
    // For simplicity, we'll use the wait-for graph algorithm
    // In a real implementation, this would analyze the bipartite graph of resources and workstreams
    return this._detectDeadlocksWaitForGraph();
  }
  
  /**
   * Detect deadlocks using Banker's algorithm
   */
  private _detectDeadlocksBankerAlgorithm(): DeadlockInfo[] {
    // Banker's algorithm is complex and requires additional information
    // For now, we'll return an empty array
    return [];
  }
  
  /**
   * Detect deadlocks using timeout-based detection
   */
  private _detectDeadlocksTimeoutBased(): DeadlockInfo[] {
    const deadlocks: DeadlockInfo[] = [];
    const now = Date.now();
    const timeout = this._options.allocationTimeout!;
    
    // Find edges that have been waiting for longer than the timeout
    const timedOutEdges = this._edges.filter(edge => 
      edge.type === 'request' && (now - edge.createdAt) > timeout
    );
    
    // Group by workstream
    const workstreamEdges = new Map<WorkstreamId, ResourceEdge[]>();
    
    for (const edge of timedOutEdges) {
      const workstreamId = edge.from as WorkstreamId;
      const edges = workstreamEdges.get(workstreamId) || [];
      edges.push(edge);
      workstreamEdges.set(workstreamId, edges);
    }
    
    // Create a deadlock for each workstream with timed out requests
    for (const [workstreamId, edges] of workstreamEdges.entries()) {
      const resources = edges.map(edge => edge.to);
      const cycle: Array<{workstreamId: WorkstreamId, resourceId: string}> = [];
      
      for (const edge of edges) {
        const resourceId = edge.to;
        const resource = this._resources.get(resourceId);
        
        if (resource) {
          cycle.push({
            workstreamId,
            resourceId
          });
        }
      }
      
      deadlocks.push({
        id: uuidv4(),
        workstreams: [workstreamId],
        resources,
        detectedAt: now,
        cycle,
        detectionAlgorithm: DeadlockDetectionAlgorithm.TIMEOUT_BASED,
        preventionStrategy: DeadlockPreventionStrategy.TIMEOUT,
        resolved: false
      });
    }
    
    return deadlocks;
  }
  
  /**
   * Find cycles in a directed graph
   * 
   * @param graph The graph as an adjacency list
   * @returns Array of cycles found in the graph
   */
  private _findCycles(graph: Map<WorkstreamId, Set<WorkstreamId>>): WorkstreamId[][] {
    const cycles: WorkstreamId[][] = [];
    const visited = new Set<WorkstreamId>();
    const recursionStack = new Set<WorkstreamId>();
    
    // DFS to find cycles
    const dfs = (node: WorkstreamId, path: WorkstreamId[] = []): void => {
      if (recursionStack.has(node)) {
        // Found a cycle
        const cycleStart = path.indexOf(node);
        cycles.push(path.slice(cycleStart));
        return;
      }
      
      if (visited.has(node)) {
        return;
      }
      
      visited.add(node);
      recursionStack.add(node);
      path.push(node);
      
      const neighbors = graph.get(node);
      
      if (neighbors) {
        for (const neighbor of neighbors) {
          dfs(neighbor, [...path]);
        }
      }
      
      recursionStack.delete(node);
    };
    
    // Start DFS from each node
    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node);
      }
    }
    
    return cycles;
  }
  
  /**
   * Resolve a deadlock using timeout-based prevention
   */
  private async _resolveDeadlockTimeout(deadlock: DeadlockInfo): Promise<void> {
    // In timeout-based prevention, we abort one of the workstreams
    // For simplicity, we'll choose the first workstream in the cycle
    const workstreamId = deadlock.workstreams[0];
    const workstream = this._workstreams.get(workstreamId);
    
    if (!workstream) {
      return;
    }
    
    // Release all resources held by this workstream
    for (const resourceId of [...workstream.allocatedResources]) {
      this.recordRelease(resourceId, workstreamId);
    }
    
    // Clear all resource requests by this workstream
    for (const resourceId of [...workstream.requestedResources]) {
      const resource = this._resources.get(resourceId);
      
      if (resource) {
        // Remove from requestedBy list
        const index = resource.requestedBy.indexOf(workstreamId);
        if (index >= 0) {
          resource.requestedBy.splice(index, 1);
        }
        
        // Update resource status
        if (resource.requestedBy.length === 0 && !resource.allocatedTo) {
          resource.status = 'free';
        }
      }
    }
    
    workstream.requestedResources = [];
    
    // Remove all edges involving this workstream
    this._edges = this._edges.filter(edge => 
      edge.from !== workstreamId && edge.to !== workstreamId
    );
    
    deadlock.resolutionMethod = `Aborted workstream ${workstreamId} due to timeout`;
  }
  
  /**
   * Resolve a deadlock using resource ordering prevention
   */
  private async _resolveDeadlockResourceOrdering(deadlock: DeadlockInfo): Promise<void> {
    // Resource ordering prevention is proactive and should prevent deadlocks
    // For recovery, we'll use the same approach as timeout-based prevention
    await this._resolveDeadlockTimeout(deadlock);
    deadlock.resolutionMethod = `Applied resource ordering recovery for deadlock involving workstreams ${deadlock.workstreams.join(', ')}`;
  }
  
  /**
   * Resolve a deadlock using preemption
   */
  private async _resolveDeadlockPreemption(deadlock: DeadlockInfo): Promise<void> {
    // Find the lowest priority workstream in the cycle
    let lowestPriorityWorkstream = deadlock.workstreams[0];
    let lowestPriority = this._workstreams.get(lowestPriorityWorkstream)?.priority ?? 0;
    
    for (const workstreamId of deadlock.workstreams) {
      const priority = this._workstreams.get(workstreamId)?.priority ?? 0;
      
      if (priority < lowestPriority) {
        lowestPriority = priority;
        lowestPriorityWorkstream = workstreamId;
      }
    }
    
    // Preempt resources from the lowest priority workstream
    const workstream = this._workstreams.get(lowestPriorityWorkstream);
    
    if (!workstream) {
      return;
    }
    
    // Release all resources held by this workstream
    for (const resourceId of [...workstream.allocatedResources]) {
      this.recordRelease(resourceId, lowestPriorityWorkstream);
    }
    
    deadlock.resolutionMethod = `Preempted resources from workstream ${lowestPriorityWorkstream} (priority ${lowestPriority})`;
  }
  
  /**
   * Resolve a deadlock using avoidance
   */
  private async _resolveDeadlockAvoidance(deadlock: DeadlockInfo): Promise<void> {
    // Deadlock avoidance is proactive and should prevent deadlocks
    // For recovery, we'll use the same approach as preemption
    await this._resolveDeadlockPreemption(deadlock);
    deadlock.resolutionMethod = `Applied deadlock avoidance recovery for deadlock involving workstreams ${deadlock.workstreams.join(', ')}`;
  }
  
  /**
   * Resolve a deadlock using detection and recovery
   */
  private async _resolveDeadlockDetectionRecovery(deadlock: DeadlockInfo): Promise<void> {
    // Choose a victim workstream to abort
    // For simplicity, we'll choose the workstream with the fewest allocated resources
    let victimWorkstream = deadlock.workstreams[0];
    let fewestResources = Infinity;
    
    for (const workstreamId of deadlock.workstreams) {
      const workstream = this._workstreams.get(workstreamId);
      const resourceCount = workstream?.allocatedResources.length ?? 0;
      
      if (resourceCount < fewestResources) {
        fewestResources = resourceCount;
        victimWorkstream = workstreamId;
      }
    }
    
    // Abort the victim workstream
    const workstream = this._workstreams.get(victimWorkstream);
    
    if (!workstream) {
      return;
    }
    
    // Release all resources held by this workstream
    for (const resourceId of [...workstream.allocatedResources]) {
      this.recordRelease(resourceId, victimWorkstream);
    }
    
    // Clear all resource requests by this workstream
    for (const resourceId of [...workstream.requestedResources]) {
      const resource = this._resources.get(resourceId);
      
      if (resource) {
        // Remove from requestedBy list
        const index = resource.requestedBy.indexOf(victimWorkstream);
        if (index >= 0) {
          resource.requestedBy.splice(index, 1);
        }
        
        // Update resource status
        if (resource.requestedBy.length === 0 && !resource.allocatedTo) {
          resource.status = 'free';
        }
      }
    }
    
    workstream.requestedResources = [];
    
    // Remove all edges involving this workstream
    this._edges = this._edges.filter(edge => 
      edge.from !== victimWorkstream && edge.to !== victimWorkstream
    );
    
    deadlock.resolutionMethod = `Aborted workstream ${victimWorkstream} (had ${fewestResources} allocated resources)`;
  }
}

