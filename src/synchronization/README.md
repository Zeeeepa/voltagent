# Synchronization Management System

A comprehensive system for managing synchronization points between parallel workstreams.

## Overview

The Synchronization Management System provides a set of tools and abstractions for coordinating parallel workstreams in a distributed system. It includes synchronization primitives, data exchange mechanisms, conflict detection and resolution, deadlock prevention, notification systems, transaction management, and partial synchronization support.

## Features

### Synchronization Primitives

- **Barrier**: A synchronization point where multiple workstreams must wait until all participating workstreams have reached the barrier before any can proceed.
- **Semaphore**: Controls access to a shared resource by multiple workstreams by maintaining a set of permits.
- **Mutex**: A special case of a semaphore with only one permit, ensuring exclusive access to a resource.
- **Countdown Latch**: Allows one or more workstreams to wait until a set of operations being performed in other workstreams completes.

### Data Exchange

- **Broadcast Channel**: Delivers data sent by one workstream to all subscribed workstreams.
- **Direct Channel**: Delivers data directly from one workstream to another.
- **Publish-Subscribe Channel**: Allows workstreams to subscribe to topics and receive data published to those topics.
- **Queue Channel**: Delivers data to workstreams in a first-in-first-out (FIFO) order.
- **Shared Memory Channel**: Provides a shared memory space for workstreams to exchange data.

### Conflict Detection and Resolution

- **Conflict Detection**: Identifies conflicts between workstreams, such as concurrent modifications to the same data.
- **Resolution Strategies**: Provides various strategies for resolving conflicts, including first-wins, last-wins, merge, and custom strategies.
- **Conflict Handlers**: Allows registration of custom handlers for specific types of conflicts.

### Deadlock Prevention

- **Resource Allocation Graph**: Tracks resource allocations and requests to detect potential deadlocks.
- **Deadlock Detection Algorithms**: Implements various algorithms for detecting deadlocks, including wait-for graph and timeout-based detection.
- **Prevention Strategies**: Provides strategies for preventing deadlocks, including resource ordering, timeouts, and preemption.

### Notification System

- **Event Notifications**: Sends notifications to workstreams about synchronization events, such as completion, timeouts, and conflicts.
- **Subscription Management**: Allows workstreams to subscribe to specific types of notifications.
- **Priority Levels**: Supports different priority levels for notifications.

### Transaction Management

- **ACID Transactions**: Ensures that a set of operations are executed as a single unit, with atomicity, consistency, isolation, and durability.
- **Operation Management**: Allows adding operations to a transaction, with execute and undo functions.
- **Commit and Rollback**: Supports committing a transaction to apply all operations, or rolling back to undo all operations.

### Partial Synchronization

- **Minimum Participants**: Allows synchronization to proceed when a minimum number of workstreams have arrived.
- **Required Workstreams**: Specifies workstreams that must participate for synchronization to be considered complete.
- **Timeout-Based Continuation**: Allows synchronization to proceed after a timeout, even if not all workstreams have arrived.

## Installation

```bash
npm install @voltagent/synchronization
```

## Usage

### Basic Usage

```typescript
import { SynchronizationManager } from '@voltagent/synchronization';

// Create a synchronization manager
const syncManager = new SynchronizationManager();

// Define workstream IDs
const workstream1 = 'workstream-1';
const workstream2 = 'workstream-2';

// Create a barrier
const barrier = syncManager.createBarrier({ parties: 2 });

// In workstream 1
await barrier.wait(workstream1);

// In workstream 2
await barrier.wait(workstream2);

// Both workstreams will be released when both have arrived at the barrier
```

### Data Exchange

```typescript
// Create a data exchange channel
const channel = syncManager.createDataExchangeChannel('example-channel', DataExchangeType.BROADCAST);

// Subscribe to the channel
await channel.subscribe(workstream2, {
  onData: (exchange) => {
    console.log(`Received data: ${exchange.data}`);
  }
});

// Send data
await channel.send(workstream1, { message: 'Hello from workstream1!' });
```

### Conflict Resolution

```typescript
// Register a conflict handler
syncManager.registerConflictHandler({
  canHandle: (type) => type === ConflictType.DATA_CONFLICT,
  handleConflict: async (conflict) => {
    console.log(`Resolving conflict: ${conflict.reason}`);
    // Resolve the conflict...
    return conflict;
  }
});

// Detect a conflict
const conflict = syncManager.detectConflict(
  'sync-point-id',
  [workstream1, workstream2],
  'Data conflict between workstreams',
  ConflictType.DATA_CONFLICT,
  ConflictSeverity.MEDIUM,
  { field: 'user.name', values: ['Alice', 'Bob'] }
);

// Resolve the conflict
await syncManager.resolveConflict(conflict.id);
```

### Transactions

```typescript
// Begin a transaction
const transaction = syncManager.beginTransaction([workstream1]);

// Add operations to the transaction
syncManager.addTransactionOperation(
  transaction.id,
  TransactionOperationType.WRITE,
  'user.profile',
  { name: 'Alice' },
  async () => {
    // Execute the write
    return { success: true };
  },
  async () => {
    // Undo the write
  }
);

// Commit the transaction
await syncManager.commitTransaction(transaction.id);
```

### Partial Synchronization

```typescript
// Create a partial sync point
const syncPoint = syncManager.createPartialSyncPoint(
  [workstream1, workstream2, workstream3],
  {
    minimumParticipants: 2,
    continueOnTimeout: true,
    requiredWorkstreams: [workstream1]
  },
  {
    name: 'example-partial-sync',
    timeout: 5000
  }
);

// Wait at the partial sync point
const result = await syncManager.waitAtPartialSyncPoint(syncPoint.id, workstream1);

// Check the result
if (result.status === PartialSyncStatus.PARTIAL_COMPLETE) {
  console.log('Partial synchronization completed');
  console.log('Participating workstreams:', result.participatingWorkstreams);
  console.log('Missing workstreams:', result.missingWorkstreams);
}
```

## Documentation

For more detailed documentation, see:

- [API Reference](./docs/api-reference.md)
- [Synchronization Patterns and Best Practices](./docs/patterns-and-best-practices.md)
- [Examples](./examples)

## License

MIT

