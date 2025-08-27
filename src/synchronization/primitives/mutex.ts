/**
 * Mutex synchronization primitive
 * 
 * A mutex is a special case of a semaphore with only one permit.
 * It ensures that only one workstream can access a resource at a time.
 */

import { Semaphore, SemaphoreOptions } from './semaphore';
import { 
  SyncPointId, 
  WorkstreamId, 
  SyncPrimitiveType
} from '../types';

/**
 * Options specific to mutex synchronization
 */
export type MutexOptions = Omit<SemaphoreOptions, 'permits'>;

/**
 * Mutex synchronization primitive implementation
 * 
 * A mutex is a binary semaphore (with exactly one permit) that ensures
 * mutual exclusion - only one workstream can hold the lock at a time.
 */
export class Mutex extends Semaphore {
  /**
   * Create a new mutex synchronization primitive
   * 
   * @param id Unique identifier for this mutex
   * @param options Configuration options for the mutex
   */
  constructor(id: SyncPointId, options: MutexOptions = {}) {
    super(id, { ...options, permits: 1 });
    // Override the type to MUTEX
    Object.defineProperty(this, 'type', {
      value: SyncPrimitiveType.MUTEX,
      writable: false,
      configurable: false
    });
  }
  
  /**
   * Lock the mutex
   * 
   * @param workstreamId The ID of the workstream acquiring the lock
   * @returns Promise that resolves when the lock is acquired
   */
  async lock(workstreamId: WorkstreamId): Promise<void> {
    return this.acquire(workstreamId, 1);
  }
  
  /**
   * Unlock the mutex
   * 
   * @param workstreamId The ID of the workstream releasing the lock
   * @returns Promise that resolves when the lock is released
   */
  async unlock(workstreamId: WorkstreamId): Promise<void> {
    return this.release(workstreamId, 1);
  }
  
  /**
   * Try to lock the mutex without waiting
   * 
   * @param workstreamId The ID of the workstream acquiring the lock
   * @returns True if the lock was acquired, false otherwise
   */
  tryLock(workstreamId: WorkstreamId): boolean {
    return this.tryAcquire(workstreamId, 1);
  }
  
  /**
   * Check if the mutex is locked
   * 
   * @returns True if the mutex is locked, false otherwise
   */
  isLocked(): boolean {
    return this.availablePermits === 0;
  }
  
  /**
   * Check if a workstream holds the lock
   * 
   * @param workstreamId The ID of the workstream to check
   * @returns True if the workstream holds the lock, false otherwise
   */
  isLockedBy(workstreamId: WorkstreamId): boolean {
    return this.getHeldPermits(workstreamId) === 1;
  }
  
  /**
   * Wait at this mutex (alias for lock)
   * 
   * @param workstreamId The ID of the workstream that is waiting
   * @returns Promise that resolves when the lock is acquired
   */
  async wait(workstreamId: WorkstreamId): Promise<void> {
    return this.lock(workstreamId);
  }
  
  /**
   * Signal this mutex (alias for unlock)
   * 
   * @param workstreamId The ID of the workstream that is signaling
   * @returns Promise that resolves when the lock is released
   */
  async signal(workstreamId: WorkstreamId): Promise<void> {
    return this.unlock(workstreamId);
  }
}

