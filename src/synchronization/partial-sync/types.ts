/**
 * Partial Synchronization Types
 * 
 * This module defines the types and interfaces for the partial synchronization
 * system that allows continued execution with incomplete synchronization.
 */

import { PartialSyncConfig, SyncPointId, WorkstreamId } from '../types';

/**
 * Status of a partial synchronization
 */
export enum PartialSyncStatus {
  WAITING = 'waiting',
  PARTIAL_COMPLETE = 'partial_complete',
  COMPLETE = 'complete',
  FAILED = 'failed',
  TIMED_OUT = 'timed_out'
}

/**
 * Result of a partial synchronization
 */
export interface PartialSyncResult {
  /**
   * Status of the synchronization
   */
  status: PartialSyncStatus;
  
  /**
   * Workstreams that participated in the synchronization
   */
  participatingWorkstreams: WorkstreamId[];
  
  /**
   * Workstreams that did not participate in the synchronization
   */
  missingWorkstreams: WorkstreamId[];
  
  /**
   * Whether the synchronization met the minimum participation requirement
   */
  metMinimumRequirement: boolean;
  
  /**
   * Whether all required workstreams participated
   */
  allRequiredWorkstreamsParticipated: boolean;
  
  /**
   * When the synchronization completed
   */
  completedAt: number;
  
  /**
   * Error that occurred (if failed)
   */
  error?: Error;
}

/**
 * Information about a partial synchronization point
 */
export interface PartialSyncInfo {
  /**
   * Unique identifier for this partial sync point
   */
  id: SyncPointId;
  
  /**
   * Name of this partial sync point
   */
  name: string;
  
  /**
   * Configuration for this partial sync point
   */
  config: PartialSyncConfig;
  
  /**
   * All workstreams that should participate in this synchronization
   */
  expectedWorkstreams: WorkstreamId[];
  
  /**
   * Workstreams that have arrived at this synchronization point
   */
  arrivedWorkstreams: WorkstreamId[];
  
  /**
   * Workstreams that have been released from this synchronization point
   */
  releasedWorkstreams: WorkstreamId[];
  
  /**
   * Current status of this partial sync point
   */
  status: PartialSyncStatus;
  
  /**
   * When this partial sync point was created
   */
  createdAt: number;
  
  /**
   * When this partial sync point was completed (if completed)
   */
  completedAt?: number;
  
  /**
   * Result of the synchronization (if completed)
   */
  result?: PartialSyncResult;
}

