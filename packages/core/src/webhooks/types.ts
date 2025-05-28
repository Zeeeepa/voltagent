/**
 * Webhook Event System Types
 * Consolidates all webhook handling and event processing functionality
 */

import type { AgentStatus } from "../agent/types";
import type { StandardEventData } from "../events/types";

/**
 * Supported webhook sources
 */
export type WebhookSource = "github" | "generic" | "custom";

/**
 * Webhook event types for different sources
 */
export type WebhookEventType = 
  // GitHub webhook events
  | "push" 
  | "pull_request" 
  | "issues" 
  | "release" 
  | "workflow_run"
  | "deployment"
  | "repository"
  // Generic webhook events
  | "data_update"
  | "notification"
  | "trigger"
  | "status_change"
  // Custom webhook events
  | "custom";

/**
 * Webhook validation configuration
 */
export interface WebhookValidationConfig {
  /** Validation method */
  method: "hmac-sha256" | "hmac-sha1" | "secret" | "none";
  /** Secret key for validation */
  secret?: string;
  /** Header name containing the signature */
  signatureHeader?: string;
  /** Custom validation function */
  customValidator?: (payload: any, headers: Record<string, string>) => boolean;
}

/**
 * Webhook routing rule
 */
export interface WebhookRoutingRule {
  /** Rule identifier */
  id: string;
  /** Rule name */
  name: string;
  /** Source filter */
  source?: WebhookSource;
  /** Event type filter */
  eventType?: WebhookEventType;
  /** Custom condition function */
  condition?: (payload: WebhookPayload) => boolean;
  /** Target agent ID */
  targetAgentId?: string;
  /** Automation action to trigger */
  action?: WebhookAutomationAction;
  /** Priority (higher numbers processed first) */
  priority?: number;
  /** Whether this rule is enabled */
  enabled?: boolean;
}

/**
 * Webhook automation action
 */
export interface WebhookAutomationAction {
  /** Action type */
  type: "agent_trigger" | "tool_call" | "notification" | "custom";
  /** Target agent ID (for agent_trigger) */
  agentId?: string;
  /** Tool name to call (for tool_call) */
  toolName?: string;
  /** Tool parameters (for tool_call) */
  toolParams?: Record<string, any>;
  /** Custom action handler (for custom) */
  handler?: (payload: WebhookPayload) => Promise<any>;
  /** Notification configuration (for notification) */
  notification?: {
    message: string;
    channels?: string[];
  };
}

/**
 * Webhook payload structure
 */
export interface WebhookPayload {
  /** Unique webhook event ID */
  id: string;
  /** Webhook source */
  source: WebhookSource;
  /** Event type */
  eventType: WebhookEventType;
  /** Raw payload data */
  data: any;
  /** Request headers */
  headers: Record<string, string>;
  /** Timestamp when received */
  timestamp: string;
  /** Validation status */
  validated: boolean;
  /** Processing status */
  status: "pending" | "processing" | "completed" | "failed";
  /** Error message if processing failed */
  error?: string;
  /** Metadata for additional context */
  metadata?: Record<string, any>;
}

/**
 * Webhook event data for the event system
 */
export interface WebhookEventData extends StandardEventData {
  /** Webhook payload */
  payload: WebhookPayload;
  /** Routing rule that matched */
  routingRule?: WebhookRoutingRule;
  /** Automation action result */
  actionResult?: any;
  /** Processing duration in milliseconds */
  processingDuration?: number;
}

/**
 * Webhook handler configuration
 */
export interface WebhookHandlerConfig {
  /** Handler identifier */
  id: string;
  /** Handler name */
  name: string;
  /** Webhook source this handler supports */
  source: WebhookSource;
  /** Event types this handler can process */
  eventTypes: WebhookEventType[];
  /** Validation configuration */
  validation: WebhookValidationConfig;
  /** Whether this handler is enabled */
  enabled: boolean;
  /** Custom processing function */
  processor?: (payload: WebhookPayload) => Promise<any>;
}

/**
 * Webhook processing result
 */
export interface WebhookProcessingResult {
  /** Whether processing was successful */
  success: boolean;
  /** Processing result data */
  data?: any;
  /** Error message if failed */
  error?: string;
  /** Processing duration in milliseconds */
  duration: number;
  /** Actions that were triggered */
  triggeredActions: WebhookAutomationAction[];
  /** Events that were created */
  createdEvents: string[];
}

/**
 * Webhook system configuration
 */
export interface WebhookSystemConfig {
  /** Whether the webhook system is enabled */
  enabled: boolean;
  /** Base path for webhook endpoints */
  basePath: string;
  /** Maximum payload size in bytes */
  maxPayloadSize: number;
  /** Request timeout in milliseconds */
  timeout: number;
  /** Default validation configuration */
  defaultValidation: WebhookValidationConfig;
  /** Registered handlers */
  handlers: WebhookHandlerConfig[];
  /** Routing rules */
  routingRules: WebhookRoutingRule[];
  /** Rate limiting configuration */
  rateLimit?: {
    windowMs: number;
    maxRequests: number;
  };
}

/**
 * Webhook system statistics
 */
export interface WebhookSystemStats {
  /** Total webhooks received */
  totalReceived: number;
  /** Total webhooks processed successfully */
  totalProcessed: number;
  /** Total webhooks failed */
  totalFailed: number;
  /** Average processing time in milliseconds */
  averageProcessingTime: number;
  /** Statistics by source */
  bySource: Record<WebhookSource, {
    received: number;
    processed: number;
    failed: number;
  }>;
  /** Statistics by event type */
  byEventType: Record<WebhookEventType, {
    received: number;
    processed: number;
    failed: number;
  }>;
  /** Last reset timestamp */
  lastReset: string;
}

