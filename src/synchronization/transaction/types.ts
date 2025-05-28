/**
 * Transaction Types
 * 
 * This module defines the types and interfaces for the transaction system
 * for synchronized operations.
 */

import { SyncTransaction, WorkstreamId } from '../types';

/**
 * Status of a transaction
 */
export enum TransactionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMMITTING = 'committing',
  COMMITTED = 'committed',
  ROLLING_BACK = 'rolling_back',
  ROLLED_BACK = 'rolled_back',
  FAILED = 'failed',
  TIMED_OUT = 'timed_out'
}

/**
 * Type of transaction operation
 */
export enum TransactionOperationType {
  READ = 'read',
  WRITE = 'write',
  CREATE = 'create',
  DELETE = 'delete',
  LOCK = 'lock',
  UNLOCK = 'unlock',
  CUSTOM = 'custom'
}

/**
 * Transaction operation
 */
export interface TransactionOperation {
  /**
   * Type of operation
   */
  type: TransactionOperationType | string;
  
  /**
   * Target of the operation (e.g., resource ID)
   */
  target: string;
  
  /**
   * Parameters for the operation
   */
  params: any;
  
  /**
   * Function to execute the operation
   */
  execute: () => Promise<any>;
  
  /**
   * Function to undo the operation
   */
  undo: () => Promise<void>;
}

/**
 * Extended transaction information
 */
export interface TransactionInfo extends SyncTransaction {
  /**
   * Current status of the transaction
   */
  status: TransactionStatus;
  
  /**
   * Detailed operations with execute and undo functions
   */
  detailedOperations: TransactionOperation[];
  
  /**
   * Result of the transaction (if committed)
   */
  result?: any;
  
  /**
   * Error that occurred (if failed)
   */
  error?: Error;
  
  /**
   * Timeout for the transaction in milliseconds
   */
  timeout?: number;
}

/**
 * Options for transaction execution
 */
export interface TransactionOptions {
  /**
   * Timeout for the transaction in milliseconds
   */
  timeout?: number;
  
  /**
   * Whether to automatically retry failed operations
   */
  retry?: boolean;
  
  /**
   * Maximum number of retry attempts
   */
  maxRetries?: number;
  
  /**
   * Delay between retry attempts in milliseconds
   */
  retryDelay?: number;
  
  /**
   * Whether to use strict mode (abort on any error)
   */
  strict?: boolean;
  
  /**
   * Whether to use read-only mode
   */
  readOnly?: boolean;
  
  /**
   * Custom metadata for the transaction
   */
  metadata?: Record<string, any>;
}

