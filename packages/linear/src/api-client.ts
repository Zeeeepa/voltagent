import { LinearClient, Issue, IssueCreateInput, IssueUpdateInput, Team, User, WorkflowState } from "@linear/sdk";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { createHash, createHmac } from "crypto";
import { EventEmitter } from "events";
import type { LinearConfig, LinearEvent, LinearEventType } from "./types";

/**
 * Enhanced Linear API client with rate limiting, retry logic, and event emission
 */
export class LinearApiClient extends EventEmitter {
  private client: LinearClient;
  private config: Required<LinearConfig>;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private requestCount = 0;
  private windowStart = Date.now();

  constructor(config: LinearConfig) {
    super();
    
    if (!config.apiKey) {
      throw new Error("Linear API key is required");
    }

    // Set default configuration
    this.config = {
      apiKey: config.apiKey,
      teamId: config.teamId || "",
      webhookSecret: config.webhookSecret || "",
      syncInterval: config.syncInterval || 300000, // 5 minutes
      retries: config.retries || 3,
      timeout: config.timeout || 30000,
      rateLimit: config.rateLimit || { requests: 100, window: 60000 }, // 100 requests per minute
    };

    // Initialize Linear client
    this.client = new LinearClient({
      apiKey: this.config.apiKey,
    });

    this.setupRequestInterceptors();
  }

  /**
   * Setup request interceptors for logging and monitoring
   */
  private setupRequestInterceptors(): void {
    // Note: Linear SDK doesn't expose axios instance directly
    // We'll implement our own request wrapper for monitoring
  }

  /**
   * Rate limiting check
   */
  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset window if needed
    if (now - this.windowStart >= this.config.rateLimit.window) {
      this.requestCount = 0;
      this.windowStart = now;
    }

    // Check if we've exceeded the rate limit
    if (this.requestCount >= this.config.rateLimit.requests) {
      const waitTime = this.config.rateLimit.window - (now - this.windowStart);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.requestCount = 0;
      this.windowStart = Date.now();
    }

    this.requestCount++;
  }

  /**
   * Execute API request with retry logic and rate limiting
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    retries = this.config.retries
  ): Promise<T> {
    await this.checkRateLimit();

    try {
      const result = await operation();
      this.emit("api.success", { operation: operation.name, timestamp: new Date() });
      return result;
    } catch (error) {
      this.emit("api.error", { 
        operation: operation.name, 
        error: error.message, 
        timestamp: new Date() 
      });

      if (retries > 0) {
        // Exponential backoff
        const delay = Math.pow(2, this.config.retries - retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.executeWithRetry(operation, retries - 1);
      }
      
      throw error;
    }
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.executeWithRetry(async () => {
        const viewer = await this.client.viewer;
        return viewer.id;
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current user information
   */
  async getCurrentUser(): Promise<User> {
    return this.executeWithRetry(async () => {
      return await this.client.viewer;
    });
  }

  /**
   * Get teams accessible to the user
   */
  async getTeams(): Promise<Team[]> {
    return this.executeWithRetry(async () => {
      const teams = await this.client.teams();
      return teams.nodes;
    });
  }

  /**
   * Get team by ID
   */
  async getTeam(teamId: string): Promise<Team | null> {
    return this.executeWithRetry(async () => {
      try {
        return await this.client.team(teamId);
      } catch (error) {
        if (error.message.includes("not found")) {
          return null;
        }
        throw error;
      }
    });
  }

  /**
   * Get workflow states for a team
   */
  async getWorkflowStates(teamId?: string): Promise<WorkflowState[]> {
    const targetTeamId = teamId || this.config.teamId;
    if (!targetTeamId) {
      throw new Error("Team ID is required");
    }

    return this.executeWithRetry(async () => {
      const team = await this.client.team(targetTeamId);
      const states = await team.states();
      return states.nodes;
    });
  }

  /**
   * Create a new issue
   */
  async createIssue(input: IssueCreateInput): Promise<Issue> {
    return this.executeWithRetry(async () => {
      const issuePayload = await this.client.createIssue({
        ...input,
        teamId: input.teamId || this.config.teamId,
      });
      
      if (!issuePayload.success) {
        throw new Error(`Failed to create issue: ${issuePayload.lastSyncId}`);
      }

      const issue = await issuePayload.issue;
      
      this.emitEvent("issue.created", {
        issue,
        timestamp: new Date(),
      });

      return issue;
    });
  }

  /**
   * Update an existing issue
   */
  async updateIssue(issueId: string, input: IssueUpdateInput): Promise<Issue> {
    return this.executeWithRetry(async () => {
      const issuePayload = await this.client.updateIssue(issueId, input);
      
      if (!issuePayload.success) {
        throw new Error(`Failed to update issue: ${issuePayload.lastSyncId}`);
      }

      const issue = await issuePayload.issue;
      
      this.emitEvent("issue.updated", {
        issue,
        timestamp: new Date(),
      });

      return issue;
    });
  }

  /**
   * Get issue by ID
   */
  async getIssue(issueId: string): Promise<Issue | null> {
    return this.executeWithRetry(async () => {
      try {
        return await this.client.issue(issueId);
      } catch (error) {
        if (error.message.includes("not found")) {
          return null;
        }
        throw error;
      }
    });
  }

  /**
   * Get issues for a team with filtering
   */
  async getIssues(options: {
    teamId?: string;
    assigneeId?: string;
    stateId?: string;
    first?: number;
    after?: string;
  } = {}): Promise<Issue[]> {
    return this.executeWithRetry(async () => {
      const filter: any = {};
      
      if (options.teamId || this.config.teamId) {
        filter.team = { id: { eq: options.teamId || this.config.teamId } };
      }
      
      if (options.assigneeId) {
        filter.assignee = { id: { eq: options.assigneeId } };
      }
      
      if (options.stateId) {
        filter.state = { id: { eq: options.stateId } };
      }

      const issues = await this.client.issues({
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        first: options.first || 50,
        after: options.after,
      });

      return issues.nodes;
    });
  }

  /**
   * Search issues by text
   */
  async searchIssues(query: string, teamId?: string): Promise<Issue[]> {
    return this.executeWithRetry(async () => {
      const filter: any = {
        or: [
          { title: { containsIgnoreCase: query } },
          { description: { containsIgnoreCase: query } },
        ],
      };

      if (teamId || this.config.teamId) {
        filter.team = { id: { eq: teamId || this.config.teamId } };
      }

      const issues = await this.client.issues({
        filter,
        first: 50,
      });

      return issues.nodes;
    });
  }

  /**
   * Get issue comments
   */
  async getIssueComments(issueId: string): Promise<any[]> {
    return this.executeWithRetry(async () => {
      const issue = await this.client.issue(issueId);
      const comments = await issue.comments();
      return comments.nodes;
    });
  }

  /**
   * Add comment to issue
   */
  async addIssueComment(issueId: string, body: string): Promise<any> {
    return this.executeWithRetry(async () => {
      const commentPayload = await this.client.createComment({
        issueId,
        body,
      });

      if (!commentPayload.success) {
        throw new Error(`Failed to create comment: ${commentPayload.lastSyncId}`);
      }

      return await commentPayload.comment;
    });
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    if (!this.config.webhookSecret) {
      throw new Error("Webhook secret not configured");
    }

    const expectedSignature = createHmac("sha256", this.config.webhookSecret)
      .update(payload)
      .digest("hex");

    return signature === `sha256=${expectedSignature}`;
  }

  /**
   * Process webhook event
   */
  processWebhookEvent(event: any): void {
    this.emitEvent("webhook.received", {
      event,
      timestamp: new Date(),
    });

    // Process specific event types
    switch (event.type) {
      case "Issue":
        if (event.action === "create") {
          this.emitEvent("issue.created", {
            issue: event.data,
            timestamp: new Date(),
          });
        } else if (event.action === "update") {
          this.emitEvent("issue.updated", {
            issue: event.data,
            timestamp: new Date(),
          });
        }
        break;
      default:
        // Handle other event types as needed
        break;
    }
  }

  /**
   * Emit Linear event
   */
  private emitEvent(type: LinearEventType, payload: any): void {
    const event: LinearEvent = {
      type,
      payload,
      timestamp: new Date(),
      source: "linear",
    };

    this.emit("linear.event", event);
    this.emit(type, payload);
  }

  /**
   * Get API usage statistics
   */
  getApiUsage(): {
    requestCount: number;
    windowStart: Date;
    remainingRequests: number;
  } {
    return {
      requestCount: this.requestCount,
      windowStart: new Date(this.windowStart),
      remainingRequests: Math.max(0, this.config.rateLimit.requests - this.requestCount),
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    status: "healthy" | "unhealthy";
    apiKey: boolean;
    rateLimit: any;
    timestamp: Date;
  }> {
    try {
      const isValidKey = await this.validateApiKey();
      const usage = this.getApiUsage();

      return {
        status: isValidKey ? "healthy" : "unhealthy",
        apiKey: isValidKey,
        rateLimit: usage,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        apiKey: false,
        rateLimit: this.getApiUsage(),
        timestamp: new Date(),
      };
    }
  }
}

