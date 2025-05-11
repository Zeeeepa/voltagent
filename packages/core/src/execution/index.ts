/**
 * execution/index.ts
 * 
 * Exports all execution adapter components
 */

// Export interfaces
export * from './ExecutionAdapter';

// Export implementations
export * from './LocalExecutionAdapter';
export * from './DockerExecutionAdapter';
export * from './DockerContainerManager';
export * from './E2BExecutionAdapter';
export * from './CheckpointingExecutionAdapter';
export * from './GitInfoHelper';

// Export factory function
export * from './ExecutionAdapterFactory';

// Export checkpoint manager
export * as CheckpointManager from './CheckpointManager';

