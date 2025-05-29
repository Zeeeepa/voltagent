import type { LinearClient, Issue, IssueCreateInput, IssueUpdateInput, Team, User, WorkflowState } from "@linear/sdk";

/**
 * Configuration options for Linear integration
 */
export interface LinearConfig {
  /** Linear API key */
  apiKey: string;
  /** Default team ID for issue creation */
  teamId?: string;
  /** Webhook secret for validating incoming webhooks */
  webhookSecret?: string;
  /** Sync interval in milliseconds (default: 5 minutes) */
  syncInterval?: number;
  /** Number of retries for failed API calls */
  retries?: number;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Rate limiting configuration */
  rateLimit?: {
    requests: number;
    window: number;
  };
}

/**
 * Linear issue with additional metadata
 */
export interface LinearIssue extends Issue {
  /** Estimated hours for completion */
  estimatedHours?: number;
  /** Dependencies on other issues */
  dependencies?: string[];
  /** Sub-issues under this issue */
  subIssues?: LinearIssue[];
}

/**
 * Issue creation input with VoltAgent extensions
 */
export interface VoltAgentIssueInput extends Omit<IssueCreateInput, 'teamId'> {
  /** Team ID (optional if default is set) */
  teamId?: string;
  /** Estimated hours for completion */
  estimatedHours?: number;
  /** Dependencies on other issues */
  dependencies?: string[];
  /** Parent issue ID for creating sub-issues */
  parentId?: string;
}

/**
 * Issue update input with VoltAgent extensions
 */
export interface VoltAgentIssueUpdate extends IssueUpdateInput {
  /** Estimated hours for completion */
  estimatedHours?: number;
  /** Dependencies on other issues */
  dependencies?: string[];
}

/**
 * Requirement analysis result
 */
export interface RequirementAnalysis {
  /** Main requirements extracted from text */
  mainRequirements: RequirementItem[];
  /** Sub-requirements and tasks */
  subRequirements: RequirementItem[];
  /** Estimated complexity (1-10) */
  complexity: number;
  /** Estimated effort in hours */
  estimatedHours: number;
  /** Suggested priority level */
  priority: 'low' | 'medium' | 'high' | 'urgent';
  /** Suggested labels */
  labels: string[];
}

/**
 * Individual requirement item
 */
export interface RequirementItem {
  /** Requirement title */
  title: string;
  /** Detailed description */
  description: string;
  /** Acceptance criteria */
  acceptanceCriteria: string[];
  /** Estimated hours */
  estimatedHours: number;
  /** Dependencies on other requirements */
  dependencies: string[];
  /** Priority level */
  priority: 'low' | 'medium' | 'high' | 'urgent';
  /** Suggested labels */
  labels: string[];
}

/**
 * Sync operation result
 */
export interface SyncResult {
  /** Operation success status */
  success: boolean;
  /** Number of issues created */
  created: number;
  /** Number of issues updated */
  updated: number;
  /** Number of issues with conflicts */
  conflicts: number;
  /** Error messages if any */
  errors: string[];
  /** Sync timestamp */
  timestamp: Date;
}

/**
 * Webhook event data
 */
export interface LinearWebhookEvent {
  /** Event type */
  type: string;
  /** Event action */
  action: string;
  /** Issue data */
  data: Issue;
  /** Event timestamp */
  createdAt: string;
  /** Organization ID */
  organizationId: string;
}

/**
 * Progress tracking data
 */
export interface ProgressData {
  /** Total number of issues */
  totalIssues: number;
  /** Number of completed issues */
  completedIssues: number;
  /** Number of in-progress issues */
  inProgressIssues: number;
  /** Number of blocked issues */
  blockedIssues: number;
  /** Completion percentage */
  completionPercentage: number;
  /** Estimated completion date */
  estimatedCompletion?: Date;
  /** Project velocity (issues per week) */
  velocity: number;
}

/**
 * Issue dependency graph node
 */
export interface DependencyNode {
  /** Issue ID */
  issueId: string;
  /** Issue title */
  title: string;
  /** Issue status */
  status: string;
  /** Dependencies (other issue IDs) */
  dependencies: string[];
  /** Dependents (issues that depend on this one) */
  dependents: string[];
  /** Depth in dependency tree */
  depth: number;
}

/**
 * Conflict resolution strategy
 */
export type ConflictResolutionStrategy = 
  | 'linear-wins'      // Linear data takes precedence
  | 'local-wins'       // Local data takes precedence  
  | 'merge'            // Attempt to merge changes
  | 'manual'           // Require manual resolution
  | 'skip';            // Skip conflicted items

/**
 * Sync conflict data
 */
export interface SyncConflict {
  /** Issue ID */
  issueId: string;
  /** Conflict type */
  type: 'status' | 'assignee' | 'description' | 'priority' | 'labels';
  /** Local value */
  localValue: any;
  /** Remote (Linear) value */
  remoteValue: any;
  /** Suggested resolution */
  suggestedResolution: ConflictResolutionStrategy;
  /** Conflict timestamp */
  timestamp: Date;
}

/**
 * Event types for orchestrator integration
 */
export type LinearEventType = 
  | 'issue.created'
  | 'issue.updated'
  | 'issue.completed'
  | 'sync.started'
  | 'sync.completed'
  | 'sync.failed'
  | 'webhook.received'
  | 'conflict.detected';

/**
 * Event data for orchestrator
 */
export interface LinearEvent {
  /** Event type */
  type: LinearEventType;
  /** Event payload */
  payload: any;
  /** Event timestamp */
  timestamp: Date;
  /** Source of the event */
  source: 'linear' | 'voltagent' | 'webhook';
}

