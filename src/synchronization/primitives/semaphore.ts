/**
 * Semaphore synchronization primitive
 * 
 * A semaphore controls access to a shared resource by multiple workstreams.
 * It maintains a set of permits that can be acquired and released by workstreams.
 */

import { BaseSyncPrimitive } from './base';
import { 
  SyncPointId, 
  WorkstreamId, 
  SyncPrimitiveType, 
  SyncPrimitiveOptions,
  SyncStatus
} from '../types';

/**
 * Options specific to semaphore synchronization
 */
export interface SemaphoreOptions extends SyncPrimitiveOptions {
  /**
   * The number of permits available in this semaphore
   */
  permits: number;
  
  /**
   * Whether to allow a workstream to release a permit it didn't acquire
   */
  allowForeignRelease?: boolean;
}

/**
 * Semaphore synchronization primitive implementation
 * 
 * A semaphore controls access to a limited number of resources by maintaining
 * a count of permits that can be acquired and released.
 */
export class Semaphore extends BaseSyncPrimitive {
  private _permits: number;
  private _availablePermits: number;
  private _allowForeignRelease: boolean;
  private _waitQueue: Array<{
    workstreamId: WorkstreamId;
    permits: number;
    resolver: (value: void | PromiseLike<void>) => void;
  }> = [];
  private _heldPermits: Map<WorkstreamId, number> = new Map();
  
  /**
   * Create a new semaphore synchronization primitive
   * 
   * @param id Unique identifier for this semaphore
   * @param options Configuration options for the semaphore
   */
  constructor(id: SyncPointId, options: SemaphoreOptions) {
    super(id, SyncPrimitiveType.SEMAPHORE, options);
    this._permits = options.permits;
    this._availablePermits = options.permits;
    this._allowForeignRelease = options.allowForeignRelease || false;
    
    if (this._permits <= 0) {
      throw new Error('Semaphore permits must be greater than 0');
    }
  }
  
  /**
   * Get the total number of permits in this semaphore
   */
  get permits(): number {
    return this._permits;
  }
  
  /**
   * Get the number of available permits in this semaphore
   */
  get availablePermits(): number {
    return this._availablePermits;
  }
  
  /**
   * Get the number of workstreams waiting to acquire permits
   */
  get queueLength(): number {
    return this._waitQueue.length;
  }
  
  /**
   * Acquire a permit from this semaphore
   * 
   * @param workstreamId The ID of the workstream acquiring the permit
   * @param permits The number of permits to acquire (default: 1)
   * @returns Promise that resolves when the permits are acquired
   */
  async acquire(workstreamId: WorkstreamId, permits: number = 1): Promise<void> {
    if (permits <= 0) {
      throw new Error('Number of permits to acquire must be greater than 0');
    }
    
    if (permits > this._permits) {
      throw new Error(`Cannot acquire ${permits} permits, semaphore only has ${this._permits} total permits`);
    }
    
    // Mark this workstream as waiting
    this._waitingWorkstreams.add(workstreamId);
    this._status = SyncStatus.IN_PROGRESS;
    
    // If we have enough permits available, acquire them immediately
    if (permits <= this._availablePermits) {
      this._acquirePermits(workstreamId, permits);
      return Promise.resolve();
    }
    
    // Otherwise, wait for permits to become available
    return this.withTimeout(new Promise<void>((resolve) => {
      this._waitQueue.push({
        workstreamId,
        permits,
        resolver: resolve
      });
    }));
  }
  
  /**
   * Release permits back to this semaphore
   * 
   * @param workstreamId The ID of the workstream releasing the permits
   * @param permits The number of permits to release (default: all held by this workstream)
   * @returns Promise that resolves when the permits are released
   */
  async release(workstreamId: WorkstreamId, permits?: number): Promise<void> {
    const heldPermits = this._heldPermits.get(workstreamId) || 0;
    
    // If no permits specified, release all held by this workstream
    const permitsToRelease = permits === undefined ? heldPermits : permits;
    
    if (permitsToRelease <= 0) {
      throw new Error('Number of permits to release must be greater than 0');
    }
    
    // Check if the workstream holds enough permits
    if (!this._allowForeignRelease && permitsToRelease > heldPermits) {
      throw new Error(`Workstream ${workstreamId} cannot release ${permitsToRelease} permits, it only holds ${heldPermits}`);
    }
    
    // Update held permits for this workstream
    if (heldPermits > 0) {
      const newHeldPermits = heldPermits - permitsToRelease;
      if (newHeldPermits <= 0) {
        this._heldPermits.delete(workstreamId);
        this._passedWorkstreams.add(workstreamId);
        this._waitingWorkstreams.delete(workstreamId);
      } else {
        this._heldPermits.set(workstreamId, newHeldPermits);
      }
    }
    
    // Increase available permits
    this._availablePermits += permitsToRelease;
    
    // Check if we can satisfy any waiting workstreams
    this._processWaitQueue();
    
    return Promise.resolve();
  }
  
  /**
   * Wait at this semaphore (alias for acquire)
   * 
   * @param workstreamId The ID of the workstream that is waiting
   * @returns Promise that resolves when a permit is acquired
   */
  async wait(workstreamId: WorkstreamId): Promise<void> {
    return this.acquire(workstreamId, 1);
  }
  
  /**
   * Signal this semaphore (alias for release)
   * 
   * @param workstreamId The ID of the workstream that is signaling
   * @returns Promise that resolves when a permit is released
   */
  async signal(workstreamId: WorkstreamId): Promise<void> {
    return this.release(workstreamId);
  }
  
  /**
   * Reset the semaphore to its initial state
   */
  async reset(): Promise<void> {
    await super.reset();
    this._availablePermits = this._permits;
    this._heldPermits.clear();
    
    // Reject all waiting workstreams
    for (const { resolver } of this._waitQueue) {
      resolver();
    }
    this._waitQueue = [];
  }
  
  /**
   * Try to acquire permits without waiting
   * 
   * @param workstreamId The ID of the workstream acquiring the permits
   * @param permits The number of permits to acquire
   * @returns True if permits were acquired, false otherwise
   */
  tryAcquire(workstreamId: WorkstreamId, permits: number = 1): boolean {
    if (permits <= 0 || permits > this._permits) {
      return false;
    }
    
    if (permits <= this._availablePermits) {
      this._acquirePermits(workstreamId, permits);
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if a workstream holds any permits
   * 
   * @param workstreamId The ID of the workstream to check
   * @returns True if the workstream holds permits, false otherwise
   */
  holdsPermits(workstreamId: WorkstreamId): boolean {
    return this._heldPermits.has(workstreamId);
  }
  
  /**
   * Get the number of permits held by a workstream
   * 
   * @param workstreamId The ID of the workstream to check
   * @returns The number of permits held by the workstream
   */
  getHeldPermits(workstreamId: WorkstreamId): number {
    return this._heldPermits.get(workstreamId) || 0;
  }
  
  /**
   * Acquire permits for a workstream
   */
  private _acquirePermits(workstreamId: WorkstreamId, permits: number): void {
    // Decrease available permits
    this._availablePermits -= permits;
    
    // Update held permits for this workstream
    const currentHeldPermits = this._heldPermits.get(workstreamId) || 0;
    this._heldPermits.set(workstreamId, currentHeldPermits + permits);
    
    // Update workstream status
    this._waitingWorkstreams.delete(workstreamId);
    
    // If all permits are acquired, mark as completed
    if (this._availablePermits === 0) {
      this._status = SyncStatus.COMPLETED;
    }
  }
  
  /**
   * Process the wait queue to see if any workstreams can acquire permits
   */
  private _processWaitQueue(): void {
    if (this._waitQueue.length === 0 || this._availablePermits === 0) {
      return;
    }
    
    // Try to satisfy waiting workstreams in FIFO order
    let i = 0;
    while (i < this._waitQueue.length) {
      const { workstreamId, permits, resolver } = this._waitQueue[i];
      
      if (permits <= this._availablePermits) {
        // This workstream can acquire its permits
        this._acquirePermits(workstreamId, permits);
        resolver();
        
        // Remove from wait queue
        this._waitQueue.splice(i, 1);
      } else {
        // This workstream must continue waiting
        i++;
      }
      
      // If no more permits available, stop processing
      if (this._availablePermits === 0) {
        break;
      }
    }
  }
}

