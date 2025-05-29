import { z } from "zod";

// AgentAPI Configuration
export interface AgentAPIConfig {
  baseUrl: string;
  port?: number;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

// WSL2 Environment Configuration
export interface WSL2Config {
  distributionName?: string;
  instancePrefix?: string;
  resourceLimits?: {
    memory?: string;
    processors?: number;
  };
  networkConfig?: {
    hostPort?: number;
    guestPort?: number;
  };
}

// Claude Code Configuration
export interface ClaudeCodeConfig {
  version?: string;
  allowedTools?: string[];
  apiKey?: string;
  model?: string;
  additionalArgs?: string[];
}

// PR Information
export interface PRInfo {
  number: number;
  branch: string;
  repository: string;
  owner: string;
  headSha: string;
  baseBranch: string;
  title: string;
  description?: string;
}

// Deployment Configuration
export interface DeploymentConfig {
  agentapi: AgentAPIConfig;
  wsl2: WSL2Config;
  claudeCode: ClaudeCodeConfig;
  database?: {
    connectionString: string;
    tableName?: string;
  };
  webhooks?: {
    secret?: string;
    endpoints?: string[];
  };
}

// Deployment Status
export type DeploymentStatus = "pending" | "in_progress" | "success" | "failed" | "cancelled";

// Validation Results
export interface ValidationResults {
  tests_passed: number;
  tests_failed: number;
  coverage?: string;
  errors?: string[];
  warnings?: string[];
  duration?: number;
}

// Deployment Result Schema
export const DeploymentResultSchema = z.object({
  module: z.literal("agentapi_claude_deployment"),
  status: z.enum(["success", "failed", "in_progress"]),
  deployment: z.object({
    pr_number: z.number(),
    branch: z.string(),
    wsl2_instance: z.string(),
    claude_code_version: z.string(),
    deployment_time: z.string(),
    validation_results: z.object({
      tests_passed: z.number(),
      tests_failed: z.number(),
      coverage: z.string().optional(),
    }),
  }),
});

export type DeploymentResult = z.infer<typeof DeploymentResultSchema>;

// AgentAPI Message Types
export interface AgentAPIMessage {
  content: string;
  type: "user" | "agent";
  timestamp?: string;
}

export interface AgentAPIStatus {
  status: "stable" | "running";
  agent_id?: string;
  uptime?: number;
}

// WSL2 Instance Information
export interface WSL2Instance {
  id: string;
  name: string;
  status: "running" | "stopped" | "starting" | "stopping";
  ipAddress?: string;
  port?: number;
  createdAt: Date;
  lastActivity?: Date;
  resourceUsage?: {
    memory: string;
    cpu: string;
  };
}

// Deployment Event Types
export type DeploymentEventType = 
  | "deployment_started"
  | "environment_provisioned"
  | "code_deployed"
  | "validation_started"
  | "validation_completed"
  | "deployment_completed"
  | "deployment_failed"
  | "environment_cleaned";

export interface DeploymentEvent {
  type: DeploymentEventType;
  timestamp: Date;
  deploymentId: string;
  prNumber: number;
  data?: Record<string, any>;
  error?: string;
}

// Error Types
export interface DeploymentError extends Error {
  code: string;
  deploymentId?: string;
  prNumber?: number;
  phase?: string;
  recoverable?: boolean;
}

// Webhook Event
export interface WebhookEvent {
  action: string;
  pull_request?: {
    number: number;
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
    };
    title: string;
    body?: string;
  };
  repository: {
    name: string;
    owner: {
      login: string;
    };
  };
}

// Database Schema
export interface DeploymentRecord {
  id: string;
  pr_number: number;
  branch: string;
  repository: string;
  status: DeploymentStatus;
  wsl2_instance_id?: string;
  claude_code_version?: string;
  deployment_time?: Date;
  completion_time?: Date;
  validation_results?: ValidationResults;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

