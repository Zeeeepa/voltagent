/**
 * Dependency Management System
 * 
 * A system to manage, visualize, and optimize dependencies between workflow tasks.
 */

// Export types
export * from "./types";

// Export core classes
export { DependencyGraph } from "./graph";
export { DependencyVisualizer } from "./visualization";
export { DependencyManager, DependencyManagerEvent } from "./manager";
export { DependencyWorkflowManager, DependencyWorkflowEvent } from "./workflow";
export type { CreateWorkflowOptions, TaskExecutionResult, WorkflowExecutionResult } from "./workflow";

