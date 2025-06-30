/**
 * Basic Usage Example
 * 
 * This example demonstrates the basic usage of the synchronization management system.
 */

import { 
  SynchronizationManager,
  SyncPrimitiveType,
  DataExchangeType,
  ConflictType,
  ConflictSeverity,
  NotificationType,
  TransactionOperationType,
  PartialSyncStatus
} from '../index';

// Create a synchronization manager
const syncManager = new SynchronizationManager({
  autoStartDeadlockDetection: true,
  autoCleanupTransactions: true,
  autoCleanupSyncPoints: true,
  autoCleanupNotifications: true
});

// Define some workstream IDs
const workstream1 = 'workstream-1';
const workstream2 = 'workstream-2';
const workstream3 = 'workstream-3';

async function runExample() {
  try {
    // Example 1: Using a barrier
    console.log('Example 1: Using a barrier');
    const barrier = syncManager.createBarrier({ parties: 3 });
    
    // Simulate workstreams arriving at the barrier
    console.log(`Workstream ${workstream1} arriving at barrier`);
    const barrier1Promise = barrier.wait(workstream1);
    
    console.log(`Workstream ${workstream2} arriving at barrier`);
    const barrier2Promise = barrier.wait(workstream2);
    
    console.log(`Workstream ${workstream3} arriving at barrier`);
    const barrier3Promise = barrier.wait(workstream3);
    
    // Wait for all workstreams to pass the barrier
    await Promise.all([barrier1Promise, barrier2Promise, barrier3Promise]);
    console.log('All workstreams passed the barrier');
    
    // Example 2: Using a semaphore
    console.log('\nExample 2: Using a semaphore');
    const semaphore = syncManager.createSemaphore({ permits: 2 });
    
    // Acquire permits
    console.log(`Workstream ${workstream1} acquiring permit`);
    await semaphore.acquire(workstream1);
    
    console.log(`Workstream ${workstream2} acquiring permit`);
    await semaphore.acquire(workstream2);
    
    console.log(`Workstream ${workstream3} trying to acquire permit (will wait)`);
    const semaphore3Promise = semaphore.acquire(workstream3);
    
    // Release a permit
    console.log(`Workstream ${workstream1} releasing permit`);
    await semaphore.release(workstream1);
    
    // Now workstream3 can acquire the permit
    await semaphore3Promise;
    console.log(`Workstream ${workstream3} acquired permit`);
    
    // Example 3: Data exchange
    console.log('\nExample 3: Data exchange');
    const channel = syncManager.createDataExchangeChannel('example-channel', DataExchangeType.BROADCAST);
    
    // Subscribe to the channel
    const subscription = await channel.subscribe(workstream2, {
      onData: (exchange) => {
        console.log(`Workstream ${workstream2} received data:`, exchange.data);
      }
    });
    
    // Send data
    console.log(`Workstream ${workstream1} sending data`);
    await channel.send(workstream1, { message: 'Hello from workstream1!' });
    
    // Example 4: Conflict detection and resolution
    console.log('\nExample 4: Conflict detection and resolution');
    
    // Register a conflict handler
    syncManager.registerConflictHandler({
      canHandle: (type) => type === ConflictType.DATA_CONFLICT,
      handleConflict: async (conflict) => {
        console.log(`Resolving conflict: ${conflict.reason}`);
        // In a real implementation, this would contain logic to resolve the conflict
        return conflict;
      }
    });
    
    // Detect a conflict
    const conflict = syncManager.detectConflict(
      barrier.id,
      [workstream1, workstream2],
      'Data conflict between workstreams',
      ConflictType.DATA_CONFLICT,
      ConflictSeverity.MEDIUM,
      { field: 'user.name', values: ['Alice', 'Bob'] }
    );
    
    // Resolve the conflict
    await syncManager.resolveConflict(conflict.id);
    
    // Example 5: Notifications
    console.log('\nExample 5: Notifications');
    
    // Subscribe to notifications
    syncManager.subscribeToNotifications(workstream1, {
      onNotification: (notification) => {
        console.log(`Workstream ${workstream1} received notification: ${notification.message}`);
      }
    });
    
    // Send a notification
    await syncManager.sendNotification(
      NotificationType.SYNC_COMPLETE,
      [workstream1],
      'Synchronization completed successfully',
      barrier.id
    );
    
    // Example 6: Transactions
    console.log('\nExample 6: Transactions');
    
    // Begin a transaction
    const transaction = syncManager.beginTransaction([workstream1, workstream2]);
    
    // Add operations to the transaction
    syncManager.addTransactionOperation(
      transaction.id,
      TransactionOperationType.WRITE,
      'user.profile',
      { name: 'Alice', age: 30 },
      async () => {
        console.log('Executing write operation');
        return { success: true };
      },
      async () => {
        console.log('Undoing write operation');
      }
    );
    
    syncManager.addTransactionOperation(
      transaction.id,
      TransactionOperationType.LOCK,
      'user.account',
      { userId: 123 },
      async () => {
        console.log('Executing lock operation');
        return { success: true };
      },
      async () => {
        console.log('Undoing lock operation');
      }
    );
    
    // Commit the transaction
    const result = await syncManager.commitTransaction(transaction.id);
    console.log('Transaction committed with result:', result);
    
    // Example 7: Partial synchronization
    console.log('\nExample 7: Partial synchronization');
    
    // Create a partial sync point
    const partialSync = syncManager.createPartialSyncPoint(
      [workstream1, workstream2, workstream3],
      {
        minimumParticipants: 2,
        continueOnTimeout: true,
        continueOnFailure: true,
        requiredWorkstreams: [workstream1]
      },
      {
        name: 'example-partial-sync',
        timeout: 5000,
        autoRelease: true
      }
    );
    
    // Workstreams arrive at the partial sync point
    console.log(`Workstream ${workstream1} arriving at partial sync point`);
    const partial1Promise = syncManager.waitAtPartialSyncPoint(partialSync.id, workstream1);
    
    console.log(`Workstream ${workstream2} arriving at partial sync point`);
    const partial2Promise = syncManager.waitAtPartialSyncPoint(partialSync.id, workstream2);
    
    // Wait for the partial sync to complete
    const [result1, result2] = await Promise.all([partial1Promise, partial2Promise]);
    
    console.log('Partial sync completed with status:', result1.status);
    console.log('Participating workstreams:', result1.participatingWorkstreams);
    console.log('Missing workstreams:', result1.missingWorkstreams);
    
    // Clean up
    await syncManager.dispose();
    console.log('\nSynchronization manager disposed');
    
  } catch (error) {
    console.error('Error in example:', error);
  }
}

// Run the example
runExample().catch(console.error);

