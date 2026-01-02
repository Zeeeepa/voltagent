/**
 * CountdownLatch synchronization primitive
 * 
 * A countdown latch is a synchronization aid that allows one or more workstreams
 * to wait until a set of operations being performed in other workstreams completes.
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
 * Options specific to countdown latch synchronization
 */
export interface CountdownLatchOptions extends SyncPrimitiveOptions {
  /**
   * The count to initialize the latch with
   */
  count: number;
}

/**
 * CountdownLatch synchronization primitive implementation
 * 
 * A countdown latch is initialized with a given count. The await() method
 * blocks until the current count reaches zero due to invocations of the
 * countDown() method, after which all waiting workstreams are released.
 */
export class CountdownLatch extends BaseSyncPrimitive {
  private _initialCount: number;
  private _count: number;
  private _resolvers: Set<(value: void | PromiseLike<void>) => void> = new Set();
  
  /**
   * Create a new countdown latch synchronization primitive
   * 
   * @param id Unique identifier for this countdown latch
   * @param options Configuration options for the countdown latch
   */
  constructor(id: SyncPointId, options: CountdownLatchOptions) {
    super(id, SyncPrimitiveType.COUNTDOWN_LATCH, options);
    this._initialCount = options.count;
    this._count = options.count;
    
    if (this._count < 0) {
      throw new Error('Countdown latch count must be non-negative');
    }
    
    // If count is already 0, mark as completed
    if (this._count === 0) {
      this._status = SyncStatus.COMPLETED;
    }
  }
  
  /**
   * Get the current count of this countdown latch
   */
  get count(): number {
    return this._count;
  }
  
  /**
   * Get the initial count of this countdown latch
   */
  get initialCount(): number {
    return this._initialCount;
  }
  
  /**
   * Wait until the latch has counted down to zero
   * 
   * @param workstreamId The ID of the workstream that is waiting
   * @returns Promise that resolves when the count reaches zero
   */
  async await(workstreamId: WorkstreamId): Promise<void> {
    // If count is already 0, return immediately
    if (this._count === 0) {
      this._passedWorkstreams.add(workstreamId);
      return Promise.resolve();
    }
    
    // Mark this workstream as waiting
    this._waitingWorkstreams.add(workstreamId);
    this._status = SyncStatus.IN_PROGRESS;
    
    // Create a promise that will be resolved when the count reaches 0
    const waitPromise = new Promise<void>((resolve) => {
      this._resolvers.add(resolve);
    });
    
    // Return a promise with timeout
    return this.withTimeout(waitPromise);
  }
  
  /**
   * Decrements the count of the latch, releasing all waiting workstreams if the count reaches zero
   * 
   * @param workstreamId The ID of the workstream that is counting down
   * @returns Promise that resolves when the countdown is processed
   */
  async countDown(workstreamId: WorkstreamId): Promise<void> {
    // If count is already 0, do nothing
    if (this._count === 0) {
      return Promise.resolve();
    }
    
    // Decrement the count
    this._count--;
    
    // If this workstream was waiting, mark it as passed
    if (this._waitingWorkstreams.has(workstreamId)) {
      this._waitingWorkstreams.delete(workstreamId);
      this._passedWorkstreams.add(workstreamId);
    }
    
    // If count reaches 0, release all waiting workstreams
    if (this._count === 0) {
      this._releaseAll();
    }
    
    return Promise.resolve();
  }
  
  /**
   * Causes the current workstream to wait until the latch has counted down to zero
   * 
   * @param workstreamId The ID of the workstream that is waiting
   * @returns Promise that resolves when the count reaches zero
   */
  async wait(workstreamId: WorkstreamId): Promise<void> {
    return this.await(workstreamId);
  }
  
  /**
   * Decrements the count of the latch (alias for countDown)
   * 
   * @param workstreamId The ID of the workstream that is signaling
   * @returns Promise that resolves when the countdown is processed
   */
  async signal(workstreamId: WorkstreamId): Promise<void> {
    return this.countDown(workstreamId);
  }
  
  /**
   * Reset the countdown latch to its initial state
   */
  async reset(): Promise<void> {
    await super.reset();
    this._count = this._initialCount;
    
    // Reject all waiting workstreams
    for (const resolver of this._resolvers) {
      resolver();
    }
    this._resolvers.clear();
    
    // If count is already 0, mark as completed
    if (this._count === 0) {
      this._status = SyncStatus.COMPLETED;
    }
  }
  
  /**
   * Immediately causes the count to reach zero and releases all waiting workstreams
   * 
   * @returns Promise that resolves when all workstreams are released
   */
  async countDownAll(): Promise<void> {
    if (this._count === 0) {
      return Promise.resolve();
    }
    
    this._count = 0;
    this._releaseAll();
    
    return Promise.resolve();
  }
  
  /**
   * Release all waiting workstreams
   */
  private _releaseAll(): void {
    // Resolve all waiting promises
    for (const resolver of this._resolvers) {
      resolver();
    }
    this._resolvers.clear();
    
    // Move all waiting workstreams to passed
    for (const workstreamId of this._waitingWorkstreams) {
      this._passedWorkstreams.add(workstreamId);
    }
    this._waitingWorkstreams.clear();
    
    // Update status
    this._status = SyncStatus.COMPLETED;
  }
}

