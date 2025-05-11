/**
 * Task Management System for AI-driven development
 * 
 * This package provides a task management system for AI-driven development,
 * integrating the core agent functionality from `serv` with the task management
 * system from `SwarmMCP`.
 */

// Export core components
export * from './core/TaskManager';
export * from './core/TaskFSM';
export * from './core/TaskRunner';

// Export types
export * from './types/task';
export * from './types/dependency';
export * from './types/status';

// Export utilities
export * from './utils/taskUtils';
export * from './utils/FileStorageAdapter';
