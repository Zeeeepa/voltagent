/**
 * Synchronization Manager
 * 
 * This module provides a central manager for all synchronization components,
 * integrating primitives, data exchange, conflict resolution, deadlock prevention,
 * notifications, transactions, and partial synchronization.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  SyncPointId, 
  WorkstreamId, 
  SyncPrimitiveType, 
  SyncPrimitiveOptions,
  SyncStatus,
  DataExchange,
  DataExchangeId,
  SyncConflict,
  Deadlock,
  SyncNotification,
  SyncTransaction,
  PartialSyncConfig
} from './types';

// Import primitive implementations
import { SyncPrimitive } from './primitives/base';
import { Barrier, BarrierOptions } from './primitives/barrier';
import { Semaphore, SemaphoreOptions } from './primitives/semaphore';
import { Mutex, MutexOptions } from './primitives/mutex';
import { CountdownLatch, CountdownLatchOptions } from './primitives/countdown-latch';

// Import data exchange components
import { 
  DataExchangeType, 
  DataExchangeOptions, 
  DataExchangeHandler,
  DataExchangeChannel,
  DataExchangeSubscription
} from './data-exchange/types';
import { DataExchangeManager } from './data-exchange/manager';

// Import conflict resolution components
import { 
  ConflictType, 
  ConflictSeverity, 
  ConflictStatus, 
  ConflictResolutionStrategy,
  ConflictInfo,
  ConflictResolutionHandler
} from './conflict-resolution/types';
import { ConflictResolutionManager, ConflictDetectionOptions } from './conflict-resolution/manager';

// Import deadlock prevention components
import { 
  DeadlockDetectionAlgorithm, 
  DeadlockPreventionStrategy,
  ResourceType,
  ResourceStatus,
  ResourceNode,
  WorkstreamNode,
  DeadlockInfo
} from './deadlock-prevention/types';
import { DeadlockDetector, DeadlockDetectionOptions } from './deadlock-prevention/detector';

// Import notification components
import { 
  NotificationType, 
  NotificationPriority, 
  NotificationStatus,
  NotificationInfo,
  NotificationOptions,
  NotificationHandler,
  NotificationSubscription
} from './notification/types';
import { NotificationManager } from './notification/manager';

// Import transaction components
import { 
  TransactionStatus, 
  TransactionOperationType,
  TransactionOperation,
  TransactionInfo,
  TransactionOptions
} from './transaction/types';
import { TransactionManager } from './transaction/manager';

// Import partial synchronization components
import { 
  PartialSyncStatus, 
  PartialSyncResult,
  PartialSyncInfo
} from './partial-sync/types';
import { PartialSyncManager, PartialSyncOptions } from './partial-sync/manager';

/**
 * Options for the synchronization manager
 */
export interface SynchronizationManagerOptions {
  /**
   * Options for conflict detection
   */
  conflictDetection?: ConflictDetectionOptions;
  
  /**
   * Options for deadlock detection
   */
  deadlockDetection?: DeadlockDetectionOptions;
  
  /**
   * Whether to automatically start deadlock detection
   */
  autoStartDeadlockDetection?: boolean;
  
  /**
   * Whether to automatically clean up completed transactions
   */
  autoCleanupTransactions?: boolean;
  
  /**
   * Whether to automatically clean up completed sync points
   */
  autoCleanupSyncPoints?: boolean;
  
  /**
   * Whether to automatically clean up expired notifications
   */
  autoCleanupNotifications?: boolean;
  
  /**
   * Interval for automatic cleanup in milliseconds
   */
  cleanupInterval?: number;
}

/**
 * Central manager for all synchronization components
 */
export class SynchronizationManager {
  private _primitives: Map<SyncPointId, SyncPrimitive> = new Map();
  private _dataExchangeManager: DataExchangeManager;
  private _conflictManager: ConflictResolutionManager;
  private _deadlockDetector: DeadlockDetector;
  private _notificationManager: NotificationManager;
  private _transactionManager: TransactionManager;
  private _partialSyncManager: PartialSyncManager;
  private _options: SynchronizationManagerOptions;
  private _cleanupTimer: NodeJS.Timeout | null = null;
  
  /**
   * Create a new synchronization manager
   * 
   * @param options Options for the synchronization manager
   */
  constructor(options: SynchronizationManagerOptions = {}) {
    this._options = {
      autoStartDeadlockDetection: options.autoStartDeadlockDetection ?? true,
      autoCleanupTransactions: options.autoCleanupTransactions ?? true,
      autoCleanupSyncPoints: options.autoCleanupSyncPoints ?? true,
      autoCleanupNotifications: options.autoCleanupNotifications ?? true,
      cleanupInterval: options.cleanupInterval ?? 60000 // Default: 1 minute
    };
    
    // Initialize component managers
    this._dataExchangeManager = new DataExchangeManager();
    this._conflictManager = new ConflictResolutionManager(options.conflictDetection);
    this._deadlockDetector = new DeadlockDetector(options.deadlockDetection);
    this._notificationManager = new NotificationManager();
    this._transactionManager = new TransactionManager();
    this._partialSyncManager = new PartialSyncManager();
    
    // Start deadlock detection if configured
    if (this._options.autoStartDeadlockDetection) {
      this._deadlockDetector.startDetection();
    }
    
    // Start cleanup timer if any auto-cleanup is enabled
    if (this._options.autoCleanupTransactions || 
        this._options.autoCleanupSyncPoints || 
        this._options.autoCleanupNotifications) {
      this._startCleanupTimer();
    }
  }
  
  /**
   * Create a barrier synchronization primitive
   * 
   * @param options Options for the barrier
   * @returns The created barrier
   */
  createBarrier(options: BarrierOptions): Barrier {
    const id = uuidv4();
    const barrier = new Barrier(id, options);
    this._primitives.set(id, barrier);
    return barrier;
  }
  
  /**
   * Create a semaphore synchronization primitive
   * 
   * @param options Options for the semaphore
   * @returns The created semaphore
   */
  createSemaphore(options: SemaphoreOptions): Semaphore {
    const id = uuidv4();
    const semaphore = new Semaphore(id, options);
    this._primitives.set(id, semaphore);
    return semaphore;
  }
  
  /**
   * Create a mutex synchronization primitive
   * 
   * @param options Options for the mutex
   * @returns The created mutex
   */
  createMutex(options: MutexOptions = {}): Mutex {
    const id = uuidv4();
    const mutex = new Mutex(id, options);
    this._primitives.set(id, mutex);
    return mutex;
  }
  
  /**
   * Create a countdown latch synchronization primitive
   * 
   * @param options Options for the countdown latch
   * @returns The created countdown latch
   */
  createCountdownLatch(options: CountdownLatchOptions): CountdownLatch {
    const id = uuidv4();
    const latch = new CountdownLatch(id, options);
    this._primitives.set(id, latch);
    return latch;
  }
  
  /**
   * Get a synchronization primitive by ID
   * 
   * @param id The ID of the primitive
   * @returns The primitive, or undefined if not found
   */
  getPrimitive(id: SyncPointId): SyncPrimitive | undefined {
    return this._primitives.get(id);
  }
  
  /**
   * Create a data exchange channel
   * 
   * @param name Name of the channel
   * @param type Type of channel to create
   * @returns The created channel
   */
  createDataExchangeChannel<T = any>(name: string, type: DataExchangeType): DataExchangeChannel<T> {
    return this._dataExchangeManager.createChannel<T>(name, type);
  }
  
  /**
   * Get a data exchange channel by ID
   * 
   * @param channelId ID of the channel to get
   * @returns The channel, or undefined if not found
   */
  getDataExchangeChannel<T = any>(channelId: string): DataExchangeChannel<T> | undefined {
    return this._dataExchangeManager.getChannel<T>(channelId);
  }
  
  /**
   * Create a data exchange
   * 
   * @param sourceWorkstream The source workstream
   * @param targetWorkstreams The target workstreams
   * @param data The data to exchange
   * @param options Options for the exchange
   * @returns The created data exchange
   */
  createDataExchange<T = any>(
    sourceWorkstream: WorkstreamId,
    targetWorkstreams: WorkstreamId[],
    data: T,
    options?: DataExchangeOptions
  ): DataExchange<T> {
    return this._dataExchangeManager.createExchange<T>(
      sourceWorkstream,
      targetWorkstreams,
      data,
      options
    );
  }
  
  /**
   * Register a conflict resolution handler
   * 
   * @param handler The handler to register
   * @param conflictTypes The types of conflicts this handler can handle
   */
  registerConflictHandler(handler: ConflictResolutionHandler, conflictTypes?: ConflictType[]): void {
    this._conflictManager.registerHandler(handler, conflictTypes);
  }
  
  /**
   * Detect a conflict between workstreams
   * 
   * @param syncPointId The sync point where the conflict occurred
   * @param workstreams The workstreams involved in the conflict
   * @param reason The reason for the conflict
   * @param type The type of conflict
   * @param severity The severity of the conflict
   * @param conflictData Additional data related to the conflict
   * @returns The detected conflict
   */
  detectConflict(
    syncPointId: SyncPointId,
    workstreams: WorkstreamId[],
    reason: string,
    type: ConflictType,
    severity: ConflictSeverity = ConflictSeverity.MEDIUM,
    conflictData?: any
  ): ConflictInfo {
    return this._conflictManager.detectConflict(
      syncPointId,
      workstreams,
      reason,
      type,
      severity,
      conflictData
    );
  }
  
  /**
   * Resolve a conflict
   * 
   * @param conflictId The ID of the conflict to resolve
   * @param strategy Optional strategy to use
   * @param resolvedBy Optional ID of the workstream that resolved the conflict
   * @returns The resolved conflict, or null if unresolvable
   */
  async resolveConflict(
    conflictId: string,
    strategy?: ConflictResolutionStrategy,
    resolvedBy?: WorkstreamId
  ): Promise<ConflictInfo | null> {
    return this._conflictManager.resolveConflict(conflictId, strategy, resolvedBy);
  }
  
  /**
   * Register a resource in the resource allocation graph
   * 
   * @param resource The resource to register
   * @returns The registered resource
   */
  registerResource(resource: Omit<ResourceNode, 'requestedBy'>): ResourceNode {
    return this._deadlockDetector.registerResource(resource);
  }
  
  /**
   * Register a workstream in the resource allocation graph
   * 
   * @param workstream The workstream to register
   * @returns The registered workstream
   */
  registerWorkstream(workstream: Omit<WorkstreamNode, 'allocatedResources' | 'requestedResources'>): WorkstreamNode {
    return this._deadlockDetector.registerWorkstream(workstream);
  }
  
  /**
   * Record a resource allocation
   * 
   * @param resourceId The ID of the resource being allocated
   * @param workstreamId The ID of the workstream receiving the resource
   */
  recordResourceAllocation(resourceId: string, workstreamId: WorkstreamId): void {
    this._deadlockDetector.recordAllocation(resourceId, workstreamId);
  }
  
  /**
   * Record a resource request
   * 
   * @param resourceId The ID of the resource being requested
   * @param workstreamId The ID of the workstream requesting the resource
   */
  recordResourceRequest(resourceId: string, workstreamId: WorkstreamId): void {
    this._deadlockDetector.recordRequest(resourceId, workstreamId);
  }
  
  /**
   * Record a resource release
   * 
   * @param resourceId The ID of the resource being released
   * @param workstreamId The ID of the workstream releasing the resource
   */
  recordResourceRelease(resourceId: string, workstreamId: WorkstreamId): void {
    this._deadlockDetector.recordRelease(resourceId, workstreamId);
  }
  
  /**
   * Detect deadlocks in the resource allocation graph
   * 
   * @returns Array of detected deadlocks
   */
  async detectDeadlocks(): Promise<DeadlockInfo[]> {
    return this._deadlockDetector.detectDeadlocks();
  }
  
  /**
   * Resolve a deadlock
   * 
   * @param deadlockId The ID of the deadlock to resolve
   * @returns The resolved deadlock
   */
  async resolveDeadlock(deadlockId: string): Promise<DeadlockInfo> {
    return this._deadlockDetector.resolveDeadlock(deadlockId);
  }
  
  /**
   * Send a notification to workstreams
   * 
   * @param type The type of notification
   * @param workstreams The workstreams to notify
   * @param message The notification message
   * @param syncPointId Optional sync point ID related to the notification
   * @param metadata Optional metadata for the notification
   * @param options Optional delivery options
   * @returns The created notification
   */
  async sendNotification(
    type: NotificationType,
    workstreams: WorkstreamId[],
    message: string,
    syncPointId?: string,
    metadata?: Record<string, any>,
    options?: NotificationOptions
  ): Promise<NotificationInfo> {
    return this._notificationManager.sendNotification(
      type,
      workstreams,
      message,
      syncPointId,
      metadata,
      options
    );
  }
  
  /**
   * Subscribe to notifications
   * 
   * @param workstreamId The workstream subscribing
   * @param handler The handler for notifications
   * @param types Optional specific notification types to subscribe to
   * @returns A subscription object
   */
  subscribeToNotifications(
    workstreamId: WorkstreamId,
    handler: NotificationHandler,
    types?: NotificationType[]
  ): NotificationSubscription {
    return this._notificationManager.subscribe(workstreamId, handler, types);
  }
  
  /**
   * Begin a new transaction
   * 
   * @param workstreams The workstreams participating in the transaction
   * @param options Options for the transaction
   * @returns The created transaction
   */
  beginTransaction(
    workstreams: WorkstreamId[],
    options: TransactionOptions = {}
  ): TransactionInfo {
    return this._transactionManager.beginTransaction(workstreams, options);
  }
  
  /**
   * Add an operation to a transaction
   * 
   * @param transactionId The ID of the transaction
   * @param type The type of operation
   * @param target The target of the operation
   * @param params Parameters for the operation
   * @param execute Function to execute the operation
   * @param undo Function to undo the operation
   * @returns The updated transaction
   */
  addTransactionOperation(
    transactionId: string,
    type: TransactionOperationType | string,
    target: string,
    params: any,
    execute: () => Promise<any>,
    undo: () => Promise<void>
  ): TransactionInfo {
    return this._transactionManager.addOperation(
      transactionId,
      type,
      target,
      params,
      execute,
      undo
    );
  }
  
  /**
   * Commit a transaction
   * 
   * @param transactionId The ID of the transaction
   * @returns The result of the transaction
   */
  async commitTransaction(transactionId: string): Promise<any> {
    return this._transactionManager.commitTransaction(transactionId);
  }
  
  /**
   * Roll back a transaction
   * 
   * @param transactionId The ID of the transaction
   * @returns Promise that resolves when the rollback is complete
   */
  async rollbackTransaction(transactionId: string): Promise<void> {
    return this._transactionManager.rollbackTransaction(transactionId);
  }
  
  /**
   * Create a new partial synchronization point
   * 
   * @param expectedWorkstreams All workstreams that should participate
   * @param config Configuration for the partial sync point
   * @param options Options for the partial sync point
   * @returns The created partial sync point
   */
  createPartialSyncPoint(
    expectedWorkstreams: WorkstreamId[],
    config: PartialSyncConfig,
    options: PartialSyncOptions = {}
  ): PartialSyncInfo {
    return this._partialSyncManager.createSyncPoint(
      expectedWorkstreams,
      config,
      options
    );
  }
  
  /**
   * Wait at a partial synchronization point
   * 
   * @param syncPointId The ID of the sync point
   * @param workstreamId The ID of the workstream waiting
   * @returns Promise that resolves with the result of the synchronization
   */
  async waitAtPartialSyncPoint(syncPointId: SyncPointId, workstreamId: WorkstreamId): Promise<PartialSyncResult> {
    return this._partialSyncManager.wait(syncPointId, workstreamId);
  }
  
  /**
   * Force completion of a partial synchronization point
   * 
   * @param syncPointId The ID of the sync point
   * @returns The result of the synchronization
   */
  forceCompletePartialSyncPoint(syncPointId: SyncPointId): PartialSyncResult {
    return this._partialSyncManager.forceComplete(syncPointId);
  }
  
  /**
   * Clean up resources for a workstream
   * 
   * @param workstreamId The workstream ID
   */
  async cleanupWorkstream(workstreamId: WorkstreamId): Promise<void> {
    // Clean up primitives
    for (const primitive of this._primitives.values()) {
      if (primitive.isWaiting(workstreamId)) {
        try {
          await primitive.signal(workstreamId);
        } catch (error) {
          console.error(`Error signaling primitive ${primitive.id} for workstream ${workstreamId}:`, error);
        }
      }
    }
    
    // Clean up data exchange
    this._dataExchangeManager.cleanupWorkstream(workstreamId);
    
    // Clean up transactions
    await this._transactionManager.cleanupWorkstream(workstreamId);
    
    // Clean up partial sync points
    this._partialSyncManager.cleanupWorkstream(workstreamId);
    
    // Clean up notifications
    this._notificationManager.cleanupWorkstream(workstreamId);
  }
  
  /**
   * Perform cleanup of completed resources
   */
  performCleanup(): void {
    if (this._options.autoCleanupTransactions) {
      this._transactionManager.cleanupCompletedTransactions();
    }
    
    if (this._options.autoCleanupSyncPoints) {
      this._partialSyncManager.cleanupCompletedSyncPoints();
    }
    
    if (this._options.autoCleanupNotifications) {
      this._notificationManager.cleanupExpiredNotifications();
    }
  }
  
  /**
   * Start the cleanup timer
   */
  private _startCleanupTimer(): void {
    if (this._cleanupTimer) {
      return;
    }
    
    this._cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, this._options.cleanupInterval);
  }
  
  /**
   * Stop the cleanup timer
   */
  private _stopCleanupTimer(): void {
    if (this._cleanupTimer) {
      clearInterval(this._cleanupTimer);
      this._cleanupTimer = null;
    }
  }
  
  /**
   * Dispose of the synchronization manager and release all resources
   */
  async dispose(): Promise<void> {
    // Stop timers
    this._stopCleanupTimer();
    this._deadlockDetector.stopDetection();
    
    // Clean up all primitives
    for (const primitive of this._primitives.values()) {
      await primitive.reset();
    }
    
    this._primitives.clear();
  }
}

