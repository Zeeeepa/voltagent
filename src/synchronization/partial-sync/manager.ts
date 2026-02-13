/**
 * Partial Synchronization Manager
 * 
 * This module provides a manager for partial synchronization points that allow
 * continued execution with incomplete synchronization.
 */

import { v4 as uuidv4 } from 'uuid';
import { PartialSyncConfig, SyncPointId, WorkstreamId } from '../types';
import { 
  PartialSyncStatus, 
  PartialSyncResult,
  PartialSyncInfo
} from './types';

/**
 * Options for creating a partial synchronization point
 */
export interface PartialSyncOptions {
  /**
   * Name of the partial sync point
   */
  name?: string;
  
  /**
   * Timeout for the synchronization in milliseconds
   */
  timeout?: number;
  
  /**
   * Whether to automatically release workstreams when minimum requirements are met
   */
  autoRelease?: boolean;
}

/**
 * Manager for partial synchronization points
 */
export class PartialSyncManager {
  private _syncPoints: Map<SyncPointId, PartialSyncInfo> = new Map();
  private _workstreamSyncPoints: Map<WorkstreamId, Set<SyncPointId>> = new Map();
  private _resolvers: Map<string, Map<WorkstreamId, (result: PartialSyncResult) => void>> = new Map();
  private _timeouts: Map<SyncPointId, NodeJS.Timeout> = new Map();
  
  /**
   * Create a new partial synchronization point
   * 
   * @param expectedWorkstreams All workstreams that should participate
   * @param config Configuration for the partial sync point
   * @param options Options for the partial sync point
   * @returns The created partial sync point
   */
  createSyncPoint(
    expectedWorkstreams: WorkstreamId[],
    config: PartialSyncConfig,
    options: PartialSyncOptions = {}
  ): PartialSyncInfo {
    const id = uuidv4();
    const name = options.name || `PartialSync-${id.substring(0, 8)}`;
    const createdAt = Date.now();
    
    const syncPoint: PartialSyncInfo = {
      id,
      name,
      config,
      expectedWorkstreams,
      arrivedWorkstreams: [],
      releasedWorkstreams: [],
      status: PartialSyncStatus.WAITING,
      createdAt
    };
    
    this._syncPoints.set(id, syncPoint);
    this._resolvers.set(id, new Map());
    
    // Set up timeout if specified
    if (options.timeout) {
      const timeoutId = setTimeout(() => {
        this._handleTimeout(id);
      }, options.timeout);
      
      this._timeouts.set(id, timeoutId);
    }
    
    return syncPoint;
  }
  
  /**
   * Wait at a partial synchronization point
   * 
   * @param syncPointId The ID of the sync point
   * @param workstreamId The ID of the workstream waiting
   * @returns Promise that resolves with the result of the synchronization
   */
  async wait(syncPointId: SyncPointId, workstreamId: WorkstreamId): Promise<PartialSyncResult> {
    const syncPoint = this._syncPoints.get(syncPointId);
    
    if (!syncPoint) {
      throw new Error(`Partial sync point ${syncPointId} not found`);
    }
    
    // If already released, return immediately
    if (syncPoint.releasedWorkstreams.includes(workstreamId)) {
      return syncPoint.result!;
    }
    
    // Mark this workstream as arrived
    if (!syncPoint.arrivedWorkstreams.includes(workstreamId)) {
      syncPoint.arrivedWorkstreams.push(workstreamId);
      
      // Track this sync point for the workstream
      let syncPoints = this._workstreamSyncPoints.get(workstreamId);
      
      if (!syncPoints) {
        syncPoints = new Set<SyncPointId>();
        this._workstreamSyncPoints.set(workstreamId, syncPoints);
      }
      
      syncPoints.add(syncPointId);
    }
    
    // Check if we can complete the synchronization
    this._checkCompletion(syncPointId);
    
    // If already completed, return the result
    if (syncPoint.status === PartialSyncStatus.COMPLETE || 
        syncPoint.status === PartialSyncStatus.PARTIAL_COMPLETE) {
      syncPoint.releasedWorkstreams.push(workstreamId);
      return syncPoint.result!;
    }
    
    // Otherwise, wait for completion
    return new Promise<PartialSyncResult>((resolve) => {
      const resolvers = this._resolvers.get(syncPointId)!;
      resolvers.set(workstreamId, resolve);
    });
  }
  
  /**
   * Force completion of a partial synchronization point
   * 
   * @param syncPointId The ID of the sync point
   * @returns The result of the synchronization
   */
  forceComplete(syncPointId: SyncPointId): PartialSyncResult {
    const syncPoint = this._syncPoints.get(syncPointId);
    
    if (!syncPoint) {
      throw new Error(`Partial sync point ${syncPointId} not found`);
    }
    
    // If already completed, return the result
    if (syncPoint.status === PartialSyncStatus.COMPLETE || 
        syncPoint.status === PartialSyncStatus.PARTIAL_COMPLETE) {
      return syncPoint.result!;
    }
    
    // Complete the synchronization
    return this._completeSynchronization(syncPointId, PartialSyncStatus.PARTIAL_COMPLETE);
  }
  
  /**
   * Cancel a partial synchronization point
   * 
   * @param syncPointId The ID of the sync point
   * @param error Optional error to include in the result
   * @returns The result of the synchronization
   */
  cancelSyncPoint(syncPointId: SyncPointId, error?: Error): PartialSyncResult {
    const syncPoint = this._syncPoints.get(syncPointId);
    
    if (!syncPoint) {
      throw new Error(`Partial sync point ${syncPointId} not found`);
    }
    
    // If already completed, return the result
    if (syncPoint.status === PartialSyncStatus.COMPLETE || 
        syncPoint.status === PartialSyncStatus.PARTIAL_COMPLETE ||
        syncPoint.status === PartialSyncStatus.FAILED) {
      return syncPoint.result!;
    }
    
    // Cancel any timeout
    const timeoutId = this._timeouts.get(syncPointId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this._timeouts.delete(syncPointId);
    }
    
    // Complete the synchronization with failure
    const result = this._completeSynchronization(syncPointId, PartialSyncStatus.FAILED);
    
    if (error) {
      result.error = error;
    }
    
    return result;
  }
  
  /**
   * Get a partial sync point by ID
   * 
   * @param syncPointId The ID of the sync point
   * @returns The sync point, or undefined if not found
   */
  getSyncPoint(syncPointId: SyncPointId): PartialSyncInfo | undefined {
    return this._syncPoints.get(syncPointId);
  }
  
  /**
   * Find sync points by name
   * 
   * @param name The name to search for
   * @returns Array of matching sync points
   */
  findSyncPointsByName(name: string): PartialSyncInfo[] {
    const result: PartialSyncInfo[] = [];
    
    for (const syncPoint of this._syncPoints.values()) {
      if (syncPoint.name === name) {
        result.push(syncPoint);
      }
    }
    
    return result;
  }
  
  /**
   * Find sync points by status
   * 
   * @param status The status to search for
   * @returns Array of matching sync points
   */
  findSyncPointsByStatus(status: PartialSyncStatus): PartialSyncInfo[] {
    const result: PartialSyncInfo[] = [];
    
    for (const syncPoint of this._syncPoints.values()) {
      if (syncPoint.status === status) {
        result.push(syncPoint);
      }
    }
    
    return result;
  }
  
  /**
   * Find sync points for a workstream
   * 
   * @param workstreamId The workstream ID
   * @returns Array of sync points for this workstream
   */
  findSyncPointsForWorkstream(workstreamId: WorkstreamId): PartialSyncInfo[] {
    const syncPointIds = this._workstreamSyncPoints.get(workstreamId);
    
    if (!syncPointIds) {
      return [];
    }
    
    const result: PartialSyncInfo[] = [];
    
    for (const id of syncPointIds) {
      const syncPoint = this._syncPoints.get(id);
      
      if (syncPoint) {
        result.push(syncPoint);
      }
    }
    
    return result;
  }
  
  /**
   * Clean up completed sync points
   * 
   * @returns The number of sync points cleaned up
   */
  cleanupCompletedSyncPoints(): number {
    const completedStatuses = [
      PartialSyncStatus.COMPLETE,
      PartialSyncStatus.PARTIAL_COMPLETE,
      PartialSyncStatus.FAILED,
      PartialSyncStatus.TIMED_OUT
    ];
    
    let count = 0;
    
    for (const [id, syncPoint] of this._syncPoints.entries()) {
      if (completedStatuses.includes(syncPoint.status)) {
        this._cleanupSyncPoint(id);
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Clean up resources for a workstream
   * 
   * @param workstreamId The workstream ID
   */
  cleanupWorkstream(workstreamId: WorkstreamId): void {
    const syncPointIds = this._workstreamSyncPoints.get(workstreamId);
    
    if (!syncPointIds) {
      return;
    }
    
    // Remove this workstream from all sync points
    for (const id of syncPointIds) {
      const syncPoint = this._syncPoints.get(id);
      
      if (syncPoint) {
        // Remove from arrived workstreams
        const arrivedIndex = syncPoint.arrivedWorkstreams.indexOf(workstreamId);
        if (arrivedIndex >= 0) {
          syncPoint.arrivedWorkstreams.splice(arrivedIndex, 1);
        }
        
        // Remove from released workstreams
        const releasedIndex = syncPoint.releasedWorkstreams.indexOf(workstreamId);
        if (releasedIndex >= 0) {
          syncPoint.releasedWorkstreams.splice(releasedIndex, 1);
        }
        
        // Remove resolver
        const resolvers = this._resolvers.get(id);
        if (resolvers) {
          resolvers.delete(workstreamId);
        }
        
        // Check if we can complete the synchronization
        this._checkCompletion(id);
      }
    }
    
    this._workstreamSyncPoints.delete(workstreamId);
  }
  
  /**
   * Check if a partial synchronization point can be completed
   */
  private _checkCompletion(syncPointId: SyncPointId): void {
    const syncPoint = this._syncPoints.get(syncPointId);
    
    if (!syncPoint) {
      return;
    }
    
    // If already completed, do nothing
    if (syncPoint.status !== PartialSyncStatus.WAITING) {
      return;
    }
    
    const { expectedWorkstreams, arrivedWorkstreams, config } = syncPoint;
    
    // Check if all workstreams have arrived
    const allArrived = expectedWorkstreams.every(id => arrivedWorkstreams.includes(id));
    
    if (allArrived) {
      // Complete the synchronization
      this._completeSynchronization(syncPointId, PartialSyncStatus.COMPLETE);
      return;
    }
    
    // Check if we have enough workstreams for partial completion
    const minimumParticipants = typeof config.minimumParticipants === 'function'
      ? config.minimumParticipants(expectedWorkstreams.length)
      : config.minimumParticipants;
    
    // Check if all required workstreams have arrived
    const requiredWorkstreams = config.requiredWorkstreams || [];
    const allRequiredArrived = requiredWorkstreams.every(id => arrivedWorkstreams.includes(id));
    
    if (arrivedWorkstreams.length >= minimumParticipants && allRequiredArrived) {
      // Complete the synchronization partially
      this._completeSynchronization(syncPointId, PartialSyncStatus.PARTIAL_COMPLETE);
    }
  }
  
  /**
   * Complete a partial synchronization point
   */
  private _completeSynchronization(syncPointId: SyncPointId, status: PartialSyncStatus): PartialSyncResult {
    const syncPoint = this._syncPoints.get(syncPointId);
    
    if (!syncPoint) {
      throw new Error(`Partial sync point ${syncPointId} not found`);
    }
    
    const { expectedWorkstreams, arrivedWorkstreams, config } = syncPoint;
    const completedAt = Date.now();
    
    // Calculate missing workstreams
    const missingWorkstreams = expectedWorkstreams.filter(id => !arrivedWorkstreams.includes(id));
    
    // Calculate minimum participants
    const minimumParticipants = typeof config.minimumParticipants === 'function'
      ? config.minimumParticipants(expectedWorkstreams.length)
      : config.minimumParticipants;
    
    // Check if all required workstreams participated
    const requiredWorkstreams = config.requiredWorkstreams || [];
    const allRequiredParticipated = requiredWorkstreams.every(id => arrivedWorkstreams.includes(id));
    
    // Create the result
    const result: PartialSyncResult = {
      status,
      participatingWorkstreams: [...arrivedWorkstreams],
      missingWorkstreams,
      metMinimumRequirement: arrivedWorkstreams.length >= minimumParticipants,
      allRequiredWorkstreamsParticipated: allRequiredParticipated,
      completedAt
    };
    
    // Update the sync point
    syncPoint.status = status;
    syncPoint.completedAt = completedAt;
    syncPoint.result = result;
    
    // Cancel any timeout
    const timeoutId = this._timeouts.get(syncPointId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this._timeouts.delete(syncPointId);
    }
    
    // Resolve all waiting workstreams
    const resolvers = this._resolvers.get(syncPointId);
    
    if (resolvers) {
      for (const [workstreamId, resolve] of resolvers.entries()) {
        syncPoint.releasedWorkstreams.push(workstreamId);
        resolve(result);
      }
      
      resolvers.clear();
    }
    
    return result;
  }
  
  /**
   * Handle timeout for a partial synchronization point
   */
  private _handleTimeout(syncPointId: SyncPointId): void {
    const syncPoint = this._syncPoints.get(syncPointId);
    
    if (!syncPoint) {
      return;
    }
    
    // If already completed, do nothing
    if (syncPoint.status !== PartialSyncStatus.WAITING) {
      return;
    }
    
    // Check if we can continue on timeout
    if (syncPoint.config.continueOnTimeout) {
      // Complete the synchronization partially
      this._completeSynchronization(syncPointId, PartialSyncStatus.PARTIAL_COMPLETE);
    } else {
      // Complete the synchronization with timeout
      this._completeSynchronization(syncPointId, PartialSyncStatus.TIMED_OUT);
    }
  }
  
  /**
   * Clean up resources for a sync point
   */
  private _cleanupSyncPoint(syncPointId: SyncPointId): void {
    // Remove from sync points map
    this._syncPoints.delete(syncPointId);
    
    // Remove from resolvers map
    this._resolvers.delete(syncPointId);
    
    // Remove from timeouts map
    const timeoutId = this._timeouts.get(syncPointId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      this._timeouts.delete(syncPointId);
    }
    
    // Remove from workstream sync points
    for (const [workstreamId, syncPoints] of this._workstreamSyncPoints.entries()) {
      if (syncPoints.has(syncPointId)) {
        syncPoints.delete(syncPointId);
        
        if (syncPoints.size === 0) {
          this._workstreamSyncPoints.delete(workstreamId);
        }
      }
    }
  }
}

