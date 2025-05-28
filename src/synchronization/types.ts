/**
 * Core types for the Synchronization Management System
 * 
 * This module defines the fundamental types and interfaces used throughout
 * the synchronization management system.
 */

/**
 * Represents a unique identifier for a workstream
 */
export type WorkstreamId = string;

/**
 * Represents a unique identifier for a synchronization point
 */
export type SyncPointId = string;

/**
 * Represents a unique identifier for a data exchange
 */
export type DataExchangeId = string;

/**
 * Status of a synchronization operation
 */
export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  TIMED_OUT = 'timed_out',
  DEADLOCKED = 'deadlocked',
  PARTIAL = 'partial'
}

/**
 * Priority level for synchronization operations
 */
export enum SyncPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * Type of synchronization primitive
 */
export enum SyncPrimitiveType {
  BARRIER = 'barrier',
  SEMAPHORE = 'semaphore',
  MUTEX = 'mutex',
  READ_WRITE_LOCK = 'read_write_lock',
  COUNTDOWN_LATCH = 'countdown_latch',
  PHASER = 'phaser'
}

/**
 * Configuration options for synchronization primitives
 */
export interface SyncPrimitiveOptions {
  timeout?: number;
  priority?: SyncPriority;
  retryCount?: number;
  retryDelay?: number;
  notifyOnComplete?: boolean;
  notifyOnTimeout?: boolean;
  notifyOnDeadlock?: boolean;
}

/**
 * Represents data being exchanged between workstreams
 */
export interface DataExchange<T = any> {
  id: DataExchangeId;
  sourceWorkstream: WorkstreamId;
  targetWorkstreams: WorkstreamId[];
  data: T;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Represents a conflict between workstreams
 */
export interface SyncConflict {
  id: string;
  syncPointId: SyncPointId;
  workstreams: WorkstreamId[];
  reason: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolutionStrategy?: string;
}

/**
 * Represents a deadlock situation
 */
export interface Deadlock {
  id: string;
  workstreams: WorkstreamId[];
  resources: string[];
  detectedAt: number;
  cycle: Array<{workstreamId: WorkstreamId, resourceId: string}>;
}

/**
 * Notification for synchronization events
 */
export interface SyncNotification {
  id: string;
  type: 'sync_complete' | 'sync_timeout' | 'deadlock_detected' | 'conflict_detected' | 'data_available';
  syncPointId?: SyncPointId;
  workstreams: WorkstreamId[];
  timestamp: number;
  message: string;
  metadata?: Record<string, any>;
}

/**
 * Transaction context for synchronized operations
 */
export interface SyncTransaction {
  id: string;
  workstreams: WorkstreamId[];
  operations: Array<{
    type: string;
    target: string;
    params: any;
  }>;
  status: 'pending' | 'committed' | 'rolled_back';
  startTime: number;
  endTime?: number;
}

/**
 * Configuration for partial synchronization
 */
export interface PartialSyncConfig {
  minimumParticipants: number | ((total: number) => number);
  continueOnTimeout: boolean;
  continueOnFailure: boolean;
  requiredWorkstreams?: WorkstreamId[];
}

