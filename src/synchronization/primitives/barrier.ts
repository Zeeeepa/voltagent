/**
 * Barrier synchronization primitive
 * 
 * A barrier is a synchronization point where multiple workstreams must wait
 * until all participating workstreams have reached the barrier before any
 * can proceed.
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
 * Options specific to barrier synchronization
 */
export interface BarrierOptions extends SyncPrimitiveOptions {
  /**
   * The number of workstreams that must reach the barrier before any can proceed
   */
  parties: number;
}

/**
 * Barrier synchronization primitive implementation
 * 
 * A barrier blocks all workstreams until a specified number of workstreams
 * have reached the barrier, at which point all workstreams are released.
 */
export class Barrier extends BaseSyncPrimitive {
  private _parties: number;
  private _generation: number = 0;
  private _resolvers: Map<WorkstreamId, (value: void | PromiseLike<void>) => void> = new Map();
  
  /**
   * Create a new barrier synchronization primitive
   * 
   * @param id Unique identifier for this barrier
   * @param options Configuration options for the barrier
   */
  constructor(id: SyncPointId, options: BarrierOptions) {
    super(id, SyncPrimitiveType.BARRIER, options);
    this._parties = options.parties;
    
    if (this._parties <= 0) {
      throw new Error('Barrier parties must be greater than 0');
    }
  }
  
  /**
   * Get the number of parties required for this barrier
   */
  get parties(): number {
    return this._parties;
  }
  
  /**
   * Get the current generation of this barrier
   * 
   * The generation increments each time the barrier is tripped
   */
  get generation(): number {
    return this._generation;
  }
  
  /**
   * Wait at this barrier until all required parties have arrived
   * 
   * @param workstreamId The ID of the workstream that is waiting
   * @returns Promise that resolves when all parties have arrived and the barrier trips
   */
  async wait(workstreamId: WorkstreamId): Promise<void> {
    // If already passed in this generation, return immediately
    if (this._passedWorkstreams.has(workstreamId)) {
      return;
    }
    
    // Mark this workstream as waiting
    this._waitingWorkstreams.add(workstreamId);
    this._status = SyncStatus.IN_PROGRESS;
    
    // Create a promise that will be resolved when the barrier trips
    const waitPromise = new Promise<void>((resolve) => {
      this._resolvers.set(workstreamId, resolve);
    });
    
    // Check if we have enough parties to trip the barrier
    this._checkBarrier();
    
    // Return a promise with timeout
    return this.withTimeout(waitPromise);
  }
  
  /**
   * Signal that a workstream has arrived at the barrier
   * 
   * This is an alternative to wait() that doesn't block the workstream.
   * The workstream will still be counted towards the barrier's party count.
   * 
   * @param workstreamId The ID of the workstream that is signaling
   */
  async signal(workstreamId: WorkstreamId): Promise<void> {
    // Mark this workstream as waiting (but don't actually block)
    this._waitingWorkstreams.add(workstreamId);
    this._status = SyncStatus.IN_PROGRESS;
    
    // Check if we have enough parties to trip the barrier
    this._checkBarrier();
  }
  
  /**
   * Reset the barrier to its initial state
   * 
   * This clears all waiting and passed workstreams and increments the generation.
   */
  async reset(): Promise<void> {
    await super.reset();
    this._generation++;
    this._resolvers.clear();
  }
  
  /**
   * Check if the barrier should trip and release all waiting workstreams
   */
  private _checkBarrier(): void {
    if (this._waitingWorkstreams.size >= this._parties) {
      // We have enough parties, trip the barrier
      this._tripBarrier();
    }
  }
  
  /**
   * Trip the barrier, releasing all waiting workstreams
   */
  private _tripBarrier(): void {
    // Move all waiting workstreams to passed
    for (const workstreamId of this._waitingWorkstreams) {
      this._passedWorkstreams.add(workstreamId);
      
      // Resolve the promise for this workstream if it exists
      const resolver = this._resolvers.get(workstreamId);
      if (resolver) {
        resolver();
        this._resolvers.delete(workstreamId);
      }
    }
    
    // Clear the waiting set
    this._waitingWorkstreams.clear();
    
    // Update status and increment generation
    this._status = SyncStatus.COMPLETED;
    this._generation++;
  }
}

