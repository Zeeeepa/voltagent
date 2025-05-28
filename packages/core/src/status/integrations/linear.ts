import type { AgentStatus } from "../../agent/types";
import type { 
  StatusSyncPlugin, 
  StatusUpdateContext, 
  LinearStatusMapping,
  StatusSyncHealthCheck 
} from "../types";

/**
 * Linear API client interface
 */
interface LinearApiClient {
  updateIssue(issueId: string, data: { stateId?: string; [key: string]: any }): Promise<void>;
  getIssue(issueId: string): Promise<{ id: string; state: { id: string; name: string } }>;
  getTeamStates(teamId: string): Promise<Array<{ id: string; name: string; type: string }>>;
}

/**
 * Linear integration configuration
 */
export interface LinearIntegrationConfig {
  apiKey: string;
  teamId: string;
  statusMappings: LinearStatusMapping[];
  autoCreateIssues?: boolean;
  defaultProjectId?: string;
  webhookUrl?: string;
  enableBidirectionalSync?: boolean;
  syncInterval?: number;
}

/**
 * Linear status synchronization plugin
 * 
 * Provides seamless integration between VoltAgent status updates
 * and Linear issue state management.
 */
export class LinearStatusSyncPlugin implements StatusSyncPlugin {
  public readonly name = "linear-status-sync";
  public readonly version = "1.0.0";
  public readonly channels = ["linear"] as const;

  private config: LinearIntegrationConfig;
  private apiClient: LinearApiClient;
  private statusMappings: Map<AgentStatus, LinearStatusMapping>;
  private reverseStatusMappings: Map<string, AgentStatus>;
  private syncInterval: NodeJS.Timeout | null = null;
  private lastHealthCheck: Date = new Date();
  private errorCount = 0;

  constructor(config: LinearIntegrationConfig) {
    this.config = config;
    this.statusMappings = new Map();
    this.reverseStatusMappings = new Map();
    
    // Initialize API client (would be actual Linear SDK in real implementation)
    this.apiClient = this.createApiClient(config.apiKey);
    
    // Build status mapping tables
    this.buildStatusMappings();
  }

  /**
   * Initialize the Linear integration
   */
  public async initialize(config: Record<string, any>): Promise<void> {
    try {
      // Merge additional config
      this.config = { ...this.config, ...config };
      
      // Validate Linear API connection
      await this.validateConnection();
      
      // Start bidirectional sync if enabled
      if (this.config.enableBidirectionalSync) {
        this.startBidirectionalSync();
      }
      
      console.log(`[LinearStatusSync] Initialized successfully for team ${this.config.teamId}`);
    } catch (error) {
      console.error("[LinearStatusSync] Failed to initialize:", error);
      throw error;
    }
  }

  /**
   * Update Linear issue status based on agent status
   */
  public async updateStatus(context: StatusUpdateContext, status: AgentStatus): Promise<void> {
    try {
      // Get Linear issue ID from context metadata
      const linearIssueId = this.extractLinearIssueId(context);
      if (!linearIssueId) {
        console.debug("[LinearStatusSync] No Linear issue ID found in context, skipping update");
        return;
      }

      // Get status mapping
      const mapping = this.statusMappings.get(status);
      if (!mapping) {
        console.debug(`[LinearStatusSync] No mapping found for status: ${status}`);
        return;
      }

      // Check conditions if specified
      if (mapping.conditions && !this.evaluateConditions(mapping.conditions, context)) {
        console.debug(`[LinearStatusSync] Conditions not met for status mapping: ${status}`);
        return;
      }

      // Update Linear issue
      await this.apiClient.updateIssue(linearIssueId, {
        stateId: mapping.linearStateId,
        // Add additional metadata
        description: this.buildIssueDescription(context, status),
      });

      console.log(`[LinearStatusSync] Updated Linear issue ${linearIssueId} to state ${mapping.linearStateName}`);
      
      // Reset error count on successful update
      this.errorCount = 0;
      
    } catch (error) {
      this.errorCount++;
      console.error("[LinearStatusSync] Failed to update status:", error);
      throw error;
    }
  }

  /**
   * Get agent status from Linear issue
   */
  public async getStatus(agentId: string): Promise<AgentStatus | null> {
    try {
      // This would require a way to map agentId to Linear issue ID
      // For now, return null as this is primarily a push-based integration
      return null;
    } catch (error) {
      console.error("[LinearStatusSync] Failed to get status:", error);
      return null;
    }
  }

  /**
   * Cleanup resources
   */
  public async cleanup(): Promise<void> {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    console.log("[LinearStatusSync] Cleaned up successfully");
  }

  /**
   * Health check for Linear integration
   */
  public async healthCheck(): Promise<boolean> {
    try {
      await this.validateConnection();
      this.lastHealthCheck = new Date();
      return true;
    } catch (error) {
      console.error("[LinearStatusSync] Health check failed:", error);
      return false;
    }
  }

  /**
   * Get integration metrics
   */
  public async getMetrics(): Promise<Record<string, any>> {
    return {
      errorCount: this.errorCount,
      lastHealthCheck: this.lastHealthCheck.toISOString(),
      statusMappingsCount: this.statusMappings.size,
      bidirectionalSyncEnabled: this.config.enableBidirectionalSync,
      teamId: this.config.teamId,
    };
  }

  /**
   * Create Linear API client
   */
  private createApiClient(apiKey: string): LinearApiClient {
    // This would be the actual Linear SDK client in a real implementation
    return {
      async updateIssue(issueId: string, data: any): Promise<void> {
        // Mock implementation - would use actual Linear API
        console.log(`[LinearAPI] Updating issue ${issueId} with data:`, data);
      },
      
      async getIssue(issueId: string): Promise<any> {
        // Mock implementation - would use actual Linear API
        return {
          id: issueId,
          state: { id: "state-1", name: "In Progress" }
        };
      },
      
      async getTeamStates(teamId: string): Promise<any[]> {
        // Mock implementation - would use actual Linear API
        return [
          { id: "state-1", name: "Backlog", type: "backlog" },
          { id: "state-2", name: "In Progress", type: "started" },
          { id: "state-3", name: "Done", type: "completed" },
          { id: "state-4", name: "Cancelled", type: "cancelled" },
        ];
      }
    };
  }

  /**
   * Build status mapping tables
   */
  private buildStatusMappings(): void {
    for (const mapping of this.config.statusMappings) {
      this.statusMappings.set(mapping.agentStatus, mapping);
      this.reverseStatusMappings.set(mapping.linearStateId, mapping.agentStatus);
    }
  }

  /**
   * Validate Linear API connection
   */
  private async validateConnection(): Promise<void> {
    try {
      // Test API connection by fetching team states
      await this.apiClient.getTeamStates(this.config.teamId);
    } catch (error) {
      throw new Error(`Failed to connect to Linear API: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Start bidirectional synchronization
   */
  private startBidirectionalSync(): void {
    if (this.syncInterval) return;
    
    const interval = this.config.syncInterval || 30000; // 30 seconds default
    
    this.syncInterval = setInterval(async () => {
      try {
        await this.syncFromLinear();
      } catch (error) {
        console.error("[LinearStatusSync] Bidirectional sync failed:", error);
      }
    }, interval);
    
    console.log(`[LinearStatusSync] Started bidirectional sync with ${interval}ms interval`);
  }

  /**
   * Sync status changes from Linear to VoltAgent
   */
  private async syncFromLinear(): Promise<void> {
    // This would implement polling Linear for status changes
    // and updating VoltAgent accordingly
    console.debug("[LinearStatusSync] Syncing from Linear...");
  }

  /**
   * Extract Linear issue ID from context
   */
  private extractLinearIssueId(context: StatusUpdateContext): string | null {
    // Check various possible locations for Linear issue ID
    const metadata = context.metadata || {};
    
    return (
      metadata.linearIssueId ||
      metadata.linear?.issueId ||
      metadata.issueId ||
      null
    );
  }

  /**
   * Evaluate mapping conditions
   */
  private evaluateConditions(
    conditions: LinearStatusMapping["conditions"],
    context: StatusUpdateContext
  ): boolean {
    if (!conditions || conditions.length === 0) return true;
    
    return conditions.every(condition => {
      const value = this.getContextValue(context, condition.field);
      
      switch (condition.operator) {
        case "equals":
          return value === condition.value;
        case "contains":
          return String(value).includes(String(condition.value));
        case "startsWith":
          return String(value).startsWith(String(condition.value));
        case "endsWith":
          return String(value).endsWith(String(condition.value));
        default:
          return false;
      }
    });
  }

  /**
   * Get value from context by field path
   */
  private getContextValue(context: StatusUpdateContext, field: string): any {
    const parts = field.split(".");
    let value: any = context;
    
    for (const part of parts) {
      value = value?.[part];
      if (value === undefined) break;
    }
    
    return value;
  }

  /**
   * Build issue description with status context
   */
  private buildIssueDescription(context: StatusUpdateContext, status: AgentStatus): string {
    const timestamp = new Date(context.timestamp).toLocaleString();
    const source = context.source;
    const reason = context.reason;
    
    return `Status updated to **${status}** at ${timestamp}\n` +
           `Source: ${source}\n` +
           `Reason: ${reason}\n` +
           `Agent: ${context.agentId}`;
  }
}

/**
 * Default Linear status mappings for VoltAgent
 */
export const DEFAULT_LINEAR_MAPPINGS: LinearStatusMapping[] = [
  {
    agentStatus: "idle",
    linearStateId: "backlog-state-id",
    linearStateName: "Backlog",
    autoTransition: true,
  },
  {
    agentStatus: "working",
    linearStateId: "in-progress-state-id", 
    linearStateName: "In Progress",
    autoTransition: true,
  },
  {
    agentStatus: "tool_calling",
    linearStateId: "in-progress-state-id",
    linearStateName: "In Progress", 
    autoTransition: true,
  },
  {
    agentStatus: "completed",
    linearStateId: "done-state-id",
    linearStateName: "Done",
    autoTransition: true,
  },
  {
    agentStatus: "error",
    linearStateId: "cancelled-state-id",
    linearStateName: "Cancelled",
    autoTransition: false, // Manual review required for errors
    conditions: [
      {
        field: "reason",
        operator: "equals",
        value: "agent_error"
      }
    ]
  },
];

/**
 * Create Linear status sync plugin with default configuration
 */
export function createLinearStatusSync(config: Partial<LinearIntegrationConfig>): LinearStatusSyncPlugin {
  const defaultConfig: LinearIntegrationConfig = {
    apiKey: "",
    teamId: "",
    statusMappings: DEFAULT_LINEAR_MAPPINGS,
    autoCreateIssues: false,
    enableBidirectionalSync: false,
    syncInterval: 30000,
    ...config,
  };
  
  return new LinearStatusSyncPlugin(defaultConfig);
}

