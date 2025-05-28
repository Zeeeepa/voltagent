/**
 * Base interfaces for synchronization primitives
 * 
 * This module defines the core interfaces that all synchronization primitives
 * must implement, providing a consistent API across different primitive types.
 */

import { 
  SyncPointId, 
  WorkstreamId, 
  SyncPrimitiveType, 
  SyncPrimitiveOptions,
  SyncStatus
} from '../types';

/**
 * Base interface for all synchronization primitives
 */
export interface SyncPrimitive {
  /**
   * Unique identifier for this synchronization primitive
   */
  readonly id: SyncPointId;
  
  /**
   * Type of synchronization primitive
   */
  readonly type: SyncPrimitiveType;
  
  /**
   * Current status of the synchronization primitive
   */
  readonly status: SyncStatus;
  
  /**
   * List of workstreams currently waiting at this synchronization point
   */
  readonly waitingWorkstreams: WorkstreamId[];
  
  /**
   * List of workstreams that have passed this synchronization point
   */
  readonly passedWorkstreams: WorkstreamId[];
  
  /**
   * Configuration options for this synchronization primitive
   */
  readonly options: SyncPrimitiveOptions;
  
  /**
   * Wait at this synchronization point until conditions are met
   * 
   * @param workstreamId The ID of the workstream that is waiting
   * @returns Promise that resolves when the workstream can proceed
   */
  wait(workstreamId: WorkstreamId): Promise<void>;
  
  /**
   * Signal that a workstream has completed its work at this synchronization point
   * 
   * @param workstreamId The ID of the workstream that is signaling
   * @returns Promise that resolves when the signal has been processed
   */
  signal(workstreamId: WorkstreamId): Promise<void>;
  
  /**
   * Reset the synchronization primitive to its initial state
   * 
   * @returns Promise that resolves when the reset is complete
   */
  reset(): Promise<void>;
  
  /**
   * Check if a workstream is currently waiting at this synchronization point
   * 
   * @param workstreamId The ID of the workstream to check
   * @returns True if the workstream is waiting, false otherwise
   */
  isWaiting(workstreamId: WorkstreamId): boolean;
  
  /**
   * Check if a workstream has passed this synchronization point
   * 
   * @param workstreamId The ID of the workstream to check
   * @returns True if the workstream has passed, false otherwise
   */
  hasPassed(workstreamId: WorkstreamId): boolean;
  
  /**
   * Get the number of workstreams currently waiting at this synchronization point
   * 
   * @returns The number of waiting workstreams
   */
  getWaitingCount(): number;
  
  /**
   * Get the number of workstreams that have passed this synchronization point
   * 
   * @returns The number of passed workstreams
   */
  getPassedCount(): number;
}

/**
 * Base abstract class for synchronization primitives
 * 
 * Provides common implementation details for all synchronization primitives
 */
export abstract class BaseSyncPrimitive implements SyncPrimitive {
  readonly id: SyncPointId;
  readonly type: SyncPrimitiveType;
  protected _status: SyncStatus = SyncStatus.PENDING;
  protected _waitingWorkstreams: Set<WorkstreamId> = new Set();
  protected _passedWorkstreams: Set<WorkstreamId> = new Set();
  readonly options: SyncPrimitiveOptions;
  
  constructor(id: SyncPointId, type: SyncPrimitiveType, options: SyncPrimitiveOptions = {}) {
    this.id = id;
    this.type = type;
    this.options = {
      timeout: 30000, // Default 30 second timeout
      priority: options.priority,
      retryCount: options.retryCount || 0,
      retryDelay: options.retryDelay || 1000,
      notifyOnComplete: options.notifyOnComplete || false,
      notifyOnTimeout: options.notifyOnTimeout || true,
      notifyOnDeadlock: options.notifyOnDeadlock || true
    };
  }
  
  get status(): SyncStatus {
    return this._status;
  }
  
  get waitingWorkstreams(): WorkstreamId[] {
    return Array.from(this._waitingWorkstreams);
  }
  
  get passedWorkstreams(): WorkstreamId[] {
    return Array.from(this._passedWorkstreams);
  }
  
  abstract wait(workstreamId: WorkstreamId): Promise<void>;
  
  abstract signal(workstreamId: WorkstreamId): Promise<void>;
  
  async reset(): Promise<void> {
    this._waitingWorkstreams.clear();
    this._passedWorkstreams.clear();
    this._status = SyncStatus.PENDING;
  }
  
  isWaiting(workstreamId: WorkstreamId): boolean {
    return this._waitingWorkstreams.has(workstreamId);
  }
  
  hasPassed(workstreamId: WorkstreamId): boolean {
    return this._passedWorkstreams.has(workstreamId);
  }
  
  getWaitingCount(): number {
    return this._waitingWorkstreams.size;
  }
  
  getPassedCount(): number {
    return this._passedWorkstreams.size;
  }
  
  /**
   * Protected method to handle timeouts for wait operations
   * 
   * @param promise The promise to apply a timeout to
   * @param timeoutMs The timeout in milliseconds
   * @returns A promise that rejects if the timeout is reached
   */
  protected withTimeout<T>(promise: Promise<T>, timeoutMs: number = this.options.timeout || 30000): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this._status = SyncStatus.TIMED_OUT;
        reject(new Error(`Synchronization timed out after ${timeoutMs}ms at sync point ${this.id}`));
      }, timeoutMs);
      
      promise.then(
        (result) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        }
      );
    });
  }
}

