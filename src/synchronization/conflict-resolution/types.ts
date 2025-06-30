/**
 * Conflict Resolution Types
 * 
 * This module defines the types and interfaces for the conflict detection
 * and resolution system.
 */

import { SyncConflict, WorkstreamId } from '../types';

/**
 * Type of conflict
 */
export enum ConflictType {
  DATA_CONFLICT = 'data_conflict',
  RESOURCE_CONFLICT = 'resource_conflict',
  TIMING_CONFLICT = 'timing_conflict',
  DEPENDENCY_CONFLICT = 'dependency_conflict',
  STATE_CONFLICT = 'state_conflict',
  PRIORITY_CONFLICT = 'priority_conflict'
}

/**
 * Severity of a conflict
 */
export enum ConflictSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Status of a conflict
 */
export enum ConflictStatus {
  DETECTED = 'detected',
  ANALYZING = 'analyzing',
  RESOLVING = 'resolving',
  RESOLVED = 'resolved',
  UNRESOLVABLE = 'unresolvable',
  IGNORED = 'ignored'
}

/**
 * Resolution strategy for conflicts
 */
export enum ConflictResolutionStrategy {
  FIRST_WINS = 'first_wins',
  LAST_WINS = 'last_wins',
  PRIORITY_BASED = 'priority_based',
  MERGE = 'merge',
  CUSTOM = 'custom',
  MANUAL = 'manual',
  ABORT = 'abort'
}

/**
 * Extended conflict information
 */
export interface ConflictInfo extends SyncConflict {
  /**
   * Type of conflict
   */
  type: ConflictType;
  
  /**
   * Current status of the conflict
   */
  status: ConflictStatus;
  
  /**
   * Resolution strategy to use
   */
  resolutionStrategy: ConflictResolutionStrategy;
  
  /**
   * Data related to the conflict
   */
  conflictData?: any;
  
  /**
   * Result of the resolution (if resolved)
   */
  resolutionResult?: any;
  
  /**
   * When the conflict was resolved (if resolved)
   */
  resolvedAt?: number;
  
  /**
   * Who resolved the conflict (if resolved)
   */
  resolvedBy?: WorkstreamId;
}

/**
 * Interface for conflict resolution handlers
 */
export interface ConflictResolutionHandler {
  /**
   * Handle a conflict
   * 
   * @param conflict The conflict to handle
   * @returns The resolved conflict, or null if unresolvable
   */
  handleConflict(conflict: ConflictInfo): Promise<ConflictInfo | null>;
  
  /**
   * Check if this handler can handle a specific conflict type
   * 
   * @param conflictType The type of conflict
   * @returns True if this handler can handle the conflict type
   */
  canHandle(conflictType: ConflictType): boolean;
}

