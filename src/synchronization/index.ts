/**
 * Synchronization Management System
 * 
 * This module provides a comprehensive system for managing synchronization
 * points between parallel workstreams, including primitives, data exchange,
 * conflict resolution, deadlock prevention, notifications, transactions,
 * and partial synchronization.
 */

// Export types
export * from './types';

// Export primitives
export * from './primitives/base';
export * from './primitives/barrier';
export * from './primitives/semaphore';
export * from './primitives/mutex';
export * from './primitives/countdown-latch';

// Export data exchange
export * from './data-exchange/types';
export * from './data-exchange/manager';
export * from './data-exchange/channels/broadcast';

// Export conflict resolution
export * from './conflict-resolution/types';
export * from './conflict-resolution/manager';

// Export deadlock prevention
export * from './deadlock-prevention/types';
export * from './deadlock-prevention/detector';

// Export notification
export * from './notification/types';
export * from './notification/manager';

// Export transaction
export * from './transaction/types';
export * from './transaction/manager';

// Export partial synchronization
export * from './partial-sync/types';
export * from './partial-sync/manager';

// Export main manager
export * from './manager';

