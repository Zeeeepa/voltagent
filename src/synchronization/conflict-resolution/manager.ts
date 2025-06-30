/**
 * Conflict Resolution Manager
 * 
 * This module provides a central manager for detecting and resolving conflicts
 * between parallel workstreams.
 */

import { v4 as uuidv4 } from 'uuid';
import { SyncConflict, SyncPointId, WorkstreamId } from '../types';
import { 
  ConflictType, 
  ConflictSeverity, 
  ConflictStatus, 
  ConflictResolutionStrategy,
  ConflictInfo,
  ConflictResolutionHandler
} from './types';

/**
 * Options for conflict detection
 */
export interface ConflictDetectionOptions {
  /**
   * Whether to automatically attempt resolution
   */
  autoResolve?: boolean;
  
  /**
   * Default resolution strategy to use
   */
  defaultStrategy?: ConflictResolutionStrategy;
  
  /**
   * Whether to notify workstreams of conflicts
   */
  notifyWorkstreams?: boolean;
  
  /**
   * Timeout for conflict resolution in milliseconds
   */
  resolutionTimeout?: number;
}

/**
 * Manager for conflict detection and resolution
 */
export class ConflictResolutionManager {
  private _conflicts: Map<string, ConflictInfo> = new Map();
  private _handlers: Map<ConflictType, ConflictResolutionHandler[]> = new Map();
  private _options: ConflictDetectionOptions;
  
  /**
   * Create a new conflict resolution manager
   * 
   * @param options Options for conflict detection and resolution
   */
  constructor(options: ConflictDetectionOptions = {}) {
    this._options = {
      autoResolve: options.autoResolve ?? true,
      defaultStrategy: options.defaultStrategy ?? ConflictResolutionStrategy.LAST_WINS,
      notifyWorkstreams: options.notifyWorkstreams ?? true,
      resolutionTimeout: options.resolutionTimeout ?? 30000
    };
    
    // Initialize handlers map for all conflict types
    Object.values(ConflictType).forEach(type => {
      this._handlers.set(type as ConflictType, []);
    });
  }
  
  /**
   * Register a conflict resolution handler
   * 
   * @param handler The handler to register
   * @param conflictTypes The types of conflicts this handler can handle
   */
  registerHandler(handler: ConflictResolutionHandler, conflictTypes?: ConflictType[]): void {
    const types = conflictTypes || Object.values(ConflictType) as ConflictType[];
    
    for (const type of types) {
      if (handler.canHandle(type)) {
        const handlers = this._handlers.get(type) || [];
        handlers.push(handler);
        this._handlers.set(type, handlers);
      }
    }
  }
  
  /**
   * Unregister a conflict resolution handler
   * 
   * @param handler The handler to unregister
   */
  unregisterHandler(handler: ConflictResolutionHandler): void {
    for (const [type, handlers] of this._handlers.entries()) {
      const filteredHandlers = handlers.filter(h => h !== handler);
      this._handlers.set(type, filteredHandlers);
    }
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
    const conflictId = uuidv4();
    const timestamp = Date.now();
    
    const conflict: ConflictInfo = {
      id: conflictId,
      syncPointId,
      workstreams,
      reason,
      timestamp,
      severity,
      type,
      status: ConflictStatus.DETECTED,
      resolutionStrategy: this._options.defaultStrategy!,
      conflictData
    };
    
    this._conflicts.set(conflictId, conflict);
    
    // Automatically attempt to resolve if configured
    if (this._options.autoResolve) {
      this.resolveConflict(conflictId).catch(error => {
        console.error(`Error resolving conflict ${conflictId}:`, error);
      });
    }
    
    return conflict;
  }
  
  /**
   * Get a conflict by ID
   * 
   * @param conflictId The ID of the conflict
   * @returns The conflict, or undefined if not found
   */
  getConflict(conflictId: string): ConflictInfo | undefined {
    return this._conflicts.get(conflictId);
  }
  
  /**
   * Find conflicts by sync point
   * 
   * @param syncPointId The sync point ID
   * @returns Array of conflicts at this sync point
   */
  findConflictsBySyncPoint(syncPointId: SyncPointId): ConflictInfo[] {
    const result: ConflictInfo[] = [];
    
    for (const conflict of this._conflicts.values()) {
      if (conflict.syncPointId === syncPointId) {
        result.push(conflict);
      }
    }
    
    return result;
  }
  
  /**
   * Find conflicts involving a workstream
   * 
   * @param workstreamId The workstream ID
   * @returns Array of conflicts involving this workstream
   */
  findConflictsByWorkstream(workstreamId: WorkstreamId): ConflictInfo[] {
    const result: ConflictInfo[] = [];
    
    for (const conflict of this._conflicts.values()) {
      if (conflict.workstreams.includes(workstreamId)) {
        result.push(conflict);
      }
    }
    
    return result;
  }
  
  /**
   * Find conflicts by type
   * 
   * @param type The conflict type
   * @returns Array of conflicts of this type
   */
  findConflictsByType(type: ConflictType): ConflictInfo[] {
    const result: ConflictInfo[] = [];
    
    for (const conflict of this._conflicts.values()) {
      if (conflict.type === type) {
        result.push(conflict);
      }
    }
    
    return result;
  }
  
  /**
   * Find conflicts by status
   * 
   * @param status The conflict status
   * @returns Array of conflicts with this status
   */
  findConflictsByStatus(status: ConflictStatus): ConflictInfo[] {
    const result: ConflictInfo[] = [];
    
    for (const conflict of this._conflicts.values()) {
      if (conflict.status === status) {
        result.push(conflict);
      }
    }
    
    return result;
  }
  
  /**
   * Resolve a conflict
   * 
   * @param conflictId The ID of the conflict to resolve
   * @param strategy Optional strategy to use (overrides the default)
   * @param resolvedBy Optional ID of the workstream that resolved the conflict
   * @returns The resolved conflict, or null if unresolvable
   */
  async resolveConflict(
    conflictId: string,
    strategy?: ConflictResolutionStrategy,
    resolvedBy?: WorkstreamId
  ): Promise<ConflictInfo | null> {
    const conflict = this._conflicts.get(conflictId);
    
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }
    
    // If already resolved, return the conflict
    if (conflict.status === ConflictStatus.RESOLVED) {
      return conflict;
    }
    
    // Update the resolution strategy if provided
    if (strategy) {
      conflict.resolutionStrategy = strategy;
    }
    
    // Update status to resolving
    conflict.status = ConflictStatus.RESOLVING;
    
    // Get handlers for this conflict type
    const handlers = this._handlers.get(conflict.type) || [];
    
    if (handlers.length === 0) {
      // No handlers available, mark as unresolvable
      conflict.status = ConflictStatus.UNRESOLVABLE;
      return null;
    }
    
    // Try each handler in order
    for (const handler of handlers) {
      try {
        const result = await this._withTimeout(
          handler.handleConflict(conflict),
          this._options.resolutionTimeout!
        );
        
        if (result) {
          // Handler successfully resolved the conflict
          result.status = ConflictStatus.RESOLVED;
          result.resolvedAt = Date.now();
          result.resolvedBy = resolvedBy;
          
          // Update the conflict in the map
          this._conflicts.set(conflictId, result);
          
          return result;
        }
      } catch (error) {
        console.error(`Error in conflict handler for ${conflictId}:`, error);
      }
    }
    
    // No handler could resolve the conflict
    conflict.status = ConflictStatus.UNRESOLVABLE;
    return null;
  }
  
  /**
   * Ignore a conflict
   * 
   * @param conflictId The ID of the conflict to ignore
   * @param ignoredBy Optional ID of the workstream that ignored the conflict
   * @returns The ignored conflict
   */
  ignoreConflict(conflictId: string, ignoredBy?: WorkstreamId): ConflictInfo {
    const conflict = this._conflicts.get(conflictId);
    
    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }
    
    conflict.status = ConflictStatus.IGNORED;
    conflict.resolvedAt = Date.now();
    conflict.resolvedBy = ignoredBy;
    
    return conflict;
  }
  
  /**
   * Get all conflicts
   * 
   * @returns Array of all conflicts
   */
  getAllConflicts(): ConflictInfo[] {
    return Array.from(this._conflicts.values());
  }
  
  /**
   * Get active conflicts (detected, analyzing, or resolving)
   * 
   * @returns Array of active conflicts
   */
  getActiveConflicts(): ConflictInfo[] {
    const activeStatuses = [
      ConflictStatus.DETECTED,
      ConflictStatus.ANALYZING,
      ConflictStatus.RESOLVING
    ];
    
    return Array.from(this._conflicts.values()).filter(
      conflict => activeStatuses.includes(conflict.status)
    );
  }
  
  /**
   * Clear resolved and ignored conflicts
   * 
   * @returns The number of conflicts cleared
   */
  clearResolvedConflicts(): number {
    const resolvedStatuses = [
      ConflictStatus.RESOLVED,
      ConflictStatus.IGNORED
    ];
    
    let count = 0;
    
    for (const [id, conflict] of this._conflicts.entries()) {
      if (resolvedStatuses.includes(conflict.status)) {
        this._conflicts.delete(id);
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Apply a timeout to a promise
   * 
   * @param promise The promise to apply a timeout to
   * @param timeoutMs The timeout in milliseconds
   * @returns A promise that rejects if the timeout is reached
   */
  private _withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
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

