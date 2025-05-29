/**
 * @voltagent/linear - Linear API integration for VoltAgent
 * 
 * Provides comprehensive Linear integration with automated issue management,
 * bidirectional synchronization, and hierarchical task management.
 */

// Main integration class
export { LinearIntegration } from "./linear-integration";

// Core components
export { LinearApiClient } from "./api-client";
export { IssueManager } from "./issue-manager";
export { SyncService } from "./sync-service";
export { RequirementAnalyzer } from "./requirement-analyzer";
export { ProgressTracker } from "./progress-tracker";

// Tools for VoltAgent
export {
  createLinearToolkit,
  createLinearIssueTool,
  updateLinearIssueTool,
  getLinearIssueTool,
  searchLinearIssuesTool,
  createIssuesFromRequirementsTool,
  getProjectProgressTool,
  generateProgressReportTool,
  syncWithLinearTool,
  getLinearTeamsTool,
  getWorkflowStatesTool,
  getSyncStatusTool,
  generateTeamMetricsTool,
} from "./tools";

// Types and interfaces
export type {
  LinearConfig,
  LinearIssue,
  VoltAgentIssueInput,
  VoltAgentIssueUpdate,
  RequirementAnalysis,
  RequirementItem,
  SyncResult,
  SyncConflict,
  ConflictResolutionStrategy,
  ProgressData,
  DependencyNode,
  LinearEvent,
  LinearEventType,
  LinearWebhookEvent,
} from "./types";

// Utility functions and helpers
export const createLinearConfig = (options: {
  apiKey: string;
  teamId?: string;
  webhookSecret?: string;
  syncInterval?: number;
  retries?: number;
  timeout?: number;
  rateLimit?: {
    requests: number;
    window: number;
  };
}): import("./types").LinearConfig => {
  return {
    apiKey: options.apiKey,
    teamId: options.teamId,
    webhookSecret: options.webhookSecret,
    syncInterval: options.syncInterval || 300000, // 5 minutes
    retries: options.retries || 3,
    timeout: options.timeout || 30000,
    rateLimit: options.rateLimit || { requests: 100, window: 60000 },
  };
};

// Default export for convenience
export default LinearIntegration;

