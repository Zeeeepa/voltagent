/**
 * Transaction Manager
 * 
 * This module provides a central manager for transaction-like semantics
 * for synchronized operations.
 */

import { v4 as uuidv4 } from 'uuid';
import { WorkstreamId } from '../types';
import { 
  TransactionStatus, 
  TransactionOperationType,
  TransactionOperation,
  TransactionInfo,
  TransactionOptions
} from './types';

/**
 * Manager for synchronized transactions
 */
export class TransactionManager {
  private _transactions: Map<string, TransactionInfo> = new Map();
  private _activeTransactions: Map<WorkstreamId, Set<string>> = new Map();
  
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
    const id = uuidv4();
    const startTime = Date.now();
    
    const transaction: TransactionInfo = {
      id,
      workstreams,
      operations: [],
      detailedOperations: [],
      status: TransactionStatus.PENDING,
      startTime,
      timeout: options.timeout,
      metadata: options.metadata
    };
    
    this._transactions.set(id, transaction);
    
    // Track active transactions for each workstream
    for (const workstreamId of workstreams) {
      let transactions = this._activeTransactions.get(workstreamId);
      
      if (!transactions) {
        transactions = new Set<string>();
        this._activeTransactions.set(workstreamId, transactions);
      }
      
      transactions.add(id);
    }
    
    return transaction;
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
  addOperation(
    transactionId: string,
    type: TransactionOperationType | string,
    target: string,
    params: any,
    execute: () => Promise<any>,
    undo: () => Promise<void>
  ): TransactionInfo {
    const transaction = this._transactions.get(transactionId);
    
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }
    
    if (transaction.status !== TransactionStatus.PENDING && transaction.status !== TransactionStatus.ACTIVE) {
      throw new Error(`Cannot add operation to transaction in ${transaction.status} state`);
    }
    
    // Add the operation
    const operation: TransactionOperation = {
      type,
      target,
      params,
      execute,
      undo
    };
    
    transaction.detailedOperations.push(operation);
    transaction.operations.push({
      type,
      target,
      params
    });
    
    // Update status to active if it was pending
    if (transaction.status === TransactionStatus.PENDING) {
      transaction.status = TransactionStatus.ACTIVE;
    }
    
    return transaction;
  }
  
  /**
   * Commit a transaction
   * 
   * @param transactionId The ID of the transaction
   * @returns The result of the transaction
   */
  async commitTransaction(transactionId: string): Promise<any> {
    const transaction = this._transactions.get(transactionId);
    
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }
    
    if (transaction.status !== TransactionStatus.ACTIVE) {
      throw new Error(`Cannot commit transaction in ${transaction.status} state`);
    }
    
    // Update status to committing
    transaction.status = TransactionStatus.COMMITTING;
    
    try {
      // Execute all operations
      const results = [];
      
      for (const operation of transaction.detailedOperations) {
        try {
          const result = await this._withTimeout(
            operation.execute(),
            transaction.timeout
          );
          results.push(result);
        } catch (error) {
          // Roll back all executed operations
          await this._rollbackTransaction(transaction, error as Error);
          throw error;
        }
      }
      
      // All operations succeeded, update status to committed
      transaction.status = TransactionStatus.COMMITTED;
      transaction.endTime = Date.now();
      transaction.result = results.length === 1 ? results[0] : results;
      
      // Remove from active transactions
      this._removeActiveTransaction(transaction);
      
      return transaction.result;
    } catch (error) {
      // Error already handled in the loop
      throw error;
    }
  }
  
  /**
   * Roll back a transaction
   * 
   * @param transactionId The ID of the transaction
   * @returns Promise that resolves when the rollback is complete
   */
  async rollbackTransaction(transactionId: string): Promise<void> {
    const transaction = this._transactions.get(transactionId);
    
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }
    
    if (transaction.status !== TransactionStatus.ACTIVE && transaction.status !== TransactionStatus.PENDING) {
      throw new Error(`Cannot roll back transaction in ${transaction.status} state`);
    }
    
    await this._rollbackTransaction(transaction);
  }
  
  /**
   * Get a transaction by ID
   * 
   * @param transactionId The ID of the transaction
   * @returns The transaction, or undefined if not found
   */
  getTransaction(transactionId: string): TransactionInfo | undefined {
    return this._transactions.get(transactionId);
  }
  
  /**
   * Find active transactions for a workstream
   * 
   * @param workstreamId The workstream ID
   * @returns Array of active transactions for this workstream
   */
  findActiveTransactions(workstreamId: WorkstreamId): TransactionInfo[] {
    const transactionIds = this._activeTransactions.get(workstreamId);
    
    if (!transactionIds) {
      return [];
    }
    
    const result: TransactionInfo[] = [];
    
    for (const id of transactionIds) {
      const transaction = this._transactions.get(id);
      
      if (transaction) {
        result.push(transaction);
      }
    }
    
    return result;
  }
  
  /**
   * Find transactions by status
   * 
   * @param status The transaction status
   * @returns Array of transactions with this status
   */
  findTransactionsByStatus(status: TransactionStatus): TransactionInfo[] {
    const result: TransactionInfo[] = [];
    
    for (const transaction of this._transactions.values()) {
      if (transaction.status === status) {
        result.push(transaction);
      }
    }
    
    return result;
  }
  
  /**
   * Clean up completed transactions
   * 
   * @returns The number of transactions cleaned up
   */
  cleanupCompletedTransactions(): number {
    const completedStatuses = [
      TransactionStatus.COMMITTED,
      TransactionStatus.ROLLED_BACK,
      TransactionStatus.FAILED,
      TransactionStatus.TIMED_OUT
    ];
    
    let count = 0;
    
    for (const [id, transaction] of this._transactions.entries()) {
      if (completedStatuses.includes(transaction.status)) {
        this._transactions.delete(id);
        count++;
      }
    }
    
    return count;
  }
  
  /**
   * Clean up resources for a workstream
   * 
   * @param workstreamId The workstream ID
   */
  async cleanupWorkstream(workstreamId: WorkstreamId): Promise<void> {
    // Roll back all active transactions for this workstream
    const transactions = this.findActiveTransactions(workstreamId);
    
    for (const transaction of transactions) {
      try {
        await this.rollbackTransaction(transaction.id);
      } catch (error) {
        console.error(`Error rolling back transaction ${transaction.id}:`, error);
      }
    }
    
    this._activeTransactions.delete(workstreamId);
  }
  
  /**
   * Internal method to roll back a transaction
   */
  private async _rollbackTransaction(transaction: TransactionInfo, error?: Error): Promise<void> {
    // Update status to rolling back
    transaction.status = TransactionStatus.ROLLING_BACK;
    
    if (error) {
      transaction.error = error;
    }
    
    // Roll back operations in reverse order
    for (let i = transaction.detailedOperations.length - 1; i >= 0; i--) {
      const operation = transaction.detailedOperations[i];
      
      try {
        await operation.undo();
      } catch (undoError) {
        console.error(`Error undoing operation ${operation.type} on ${operation.target}:`, undoError);
      }
    }
    
    // Update status to rolled back
    transaction.status = TransactionStatus.ROLLED_BACK;
    transaction.endTime = Date.now();
    
    // Remove from active transactions
    this._removeActiveTransaction(transaction);
  }
  
  /**
   * Remove a transaction from active transactions
   */
  private _removeActiveTransaction(transaction: TransactionInfo): void {
    for (const workstreamId of transaction.workstreams) {
      const transactions = this._activeTransactions.get(workstreamId);
      
      if (transactions) {
        transactions.delete(transaction.id);
        
        if (transactions.size === 0) {
          this._activeTransactions.delete(workstreamId);
        }
      }
    }
  }
  
  /**
   * Apply a timeout to a promise
   * 
   * @param promise The promise to apply a timeout to
   * @param timeoutMs The timeout in milliseconds
   * @returns A promise that rejects if the timeout is reached
   */
  private _withTimeout<T>(promise: Promise<T>, timeoutMs?: number): Promise<T> {
    if (!timeoutMs) {
      return promise;
    }
    
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

