/**
 * Task Management System for AI-driven development
 *
 * This package provides a task management system for AI-driven development,
 * integrating the core agent functionality from `serv` with the task management
 * system from `SwarmMCP`.
 */

// Export core components
export * from "./core/TaskManager.js";
export * from "./core/TaskFSM.js";
export * from "./core/TaskRunner.js";

// Export types
export * from "./types/task.js";
export * from "./types/dependency.js";
export * from "./types/status.js";

// Export utilities
export * from "./utils/taskUtils.js";
export * from "./utils/FileStorageAdapter.js";
