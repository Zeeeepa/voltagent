/**
 * Task Management System
 * 
 * A TypeScript implementation of the task management system from SwarmMCP,
 * integrated with the voltagent framework.
 */

// Export types
export * from './types';

// Export core functionality
export * from './core/task-master-core';

// Export utility functions
export { contextManager, ContextManager } from './utils/context-manager';
export * from './utils/path-utils';
export * from './utils/ai-client-utils';
export * from './utils/cache-utils';

// Export direct functions
export { listTasksDirect } from './direct-functions/list-tasks';
export { getCacheStatsDirect } from './direct-functions/cache-stats';
export { addTaskDirect } from './direct-functions/add-task';

// Export tools
export { createTaskManagementTools } from './tools';

// Additional exports will be added as more direct functions are implemented
