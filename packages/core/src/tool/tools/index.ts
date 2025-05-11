// Export all tools from their respective directories
export * from "./filesystem";
export * from "./execution";
export * from "./task";
export * from "./project";

// Export toolkit creation functions
import { createFileSystemToolkit } from "./filesystem";
import { createExecutionToolkit } from "./execution";
import { createTaskManagementToolkit } from "./task";
import { createProjectManagementToolkit } from "./project";

/**
 * Create all default toolkits
 * @returns Array of all default toolkits
 */
export function createDefaultToolkits() {
  return [
    createFileSystemToolkit(),
    createExecutionToolkit(),
    createTaskManagementToolkit(),
    createProjectManagementToolkit(),
  ];
}

export {
  createFileSystemToolkit,
  createExecutionToolkit,
  createTaskManagementToolkit,
  createProjectManagementToolkit,
};

