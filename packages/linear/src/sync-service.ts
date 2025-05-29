import { EventEmitter } from "events";
import * as cron from "node-cron";
import { LinearApiClient } from "./api-client";
import { IssueManager } from "./issue-manager";
import type {
  LinearConfig,
  SyncResult,
  SyncConflict,
  ConflictResolutionStrategy,
  LinearEvent,
  LinearIssue,
} from "./types";

/**
 * Sync Service for bidirectional synchronization between VoltAgent and Linear
 */
export class SyncService extends EventEmitter {
  private apiClient: LinearApiClient;
  private issueManager: IssueManager;
  private config: LinearConfig;
  private syncTask?: cron.ScheduledTask;
  private isRunning = false;
  private lastSyncTimestamp?: Date;
  private conflicts: Map<string, SyncConflict> = new Map();
  private localIssueStore: Map<string, LinearIssue> = new Map();

  constructor(
    apiClient: LinearApiClient,
    issueManager: IssueManager,
    config: LinearConfig
  ) {
    super();
    this.apiClient = apiClient;
    this.issueManager = issueManager;
    this.config = config;
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    this.apiClient.on("webhook.received", (data) => {
      this.handleWebhookEvent(data.event);
    });

    this.issueManager.on("issue.created", (data) => {
      this.localIssueStore.set(data.issue.id, data.issue);
    });

    this.issueManager.on("issue.updated", (data) => {
      this.localIssueStore.set(data.issue.id, data.issue);
    });
  }

  /**
   * Start automatic synchronization
   */
  startSync(): void {
    if (this.syncTask) {
      this.stopSync();
    }

    // Convert milliseconds to cron expression (every N minutes)
    const intervalMinutes = Math.floor(this.config.syncInterval! / 60000);
    const cronExpression = `*/${intervalMinutes} * * * *`;

    this.syncTask = cron.schedule(cronExpression, async () => {
      await this.performSync();
    }, {
      scheduled: false,
    });

    this.syncTask.start();
    this.emit("sync.started", { timestamp: new Date() });
  }

  /**
   * Stop automatic synchronization
   */
  stopSync(): void {
    if (this.syncTask) {
      this.syncTask.stop();
      this.syncTask = undefined;
    }
    this.emit("sync.stopped", { timestamp: new Date() });
  }

  /**
   * Perform manual synchronization
   */
  async performSync(options: {
    direction?: "both" | "to-linear" | "from-linear";
    conflictResolution?: ConflictResolutionStrategy;
  } = {}): Promise<SyncResult> {
    if (this.isRunning) {
      throw new Error("Sync is already running");
    }

    this.isRunning = true;
    const startTime = new Date();
    
    this.emit("sync.started", { 
      timestamp: startTime,
      direction: options.direction || "both",
    });

    try {
      let result: SyncResult;

      switch (options.direction || "both") {
        case "to-linear":
          result = await this.syncToLinear(options.conflictResolution);
          break;
        case "from-linear":
          result = await this.syncFromLinear(options.conflictResolution);
          break;
        case "both":
        default:
          const toLinearResult = await this.syncToLinear(options.conflictResolution);
          const fromLinearResult = await this.syncFromLinear(options.conflictResolution);
          
          result = {
            success: toLinearResult.success && fromLinearResult.success,
            created: toLinearResult.created + fromLinearResult.created,
            updated: toLinearResult.updated + fromLinearResult.updated,
            conflicts: toLinearResult.conflicts + fromLinearResult.conflicts,
            errors: [...toLinearResult.errors, ...fromLinearResult.errors],
            timestamp: new Date(),
          };
          break;
      }

      this.lastSyncTimestamp = result.timestamp;
      this.emit("sync.completed", result);
      
      return result;
    } catch (error) {
      const errorResult: SyncResult = {
        success: false,
        created: 0,
        updated: 0,
        conflicts: 0,
        errors: [error.message],
        timestamp: new Date(),
      };

      this.emit("sync.failed", errorResult);
      return errorResult;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Sync local changes to Linear
   */
  private async syncToLinear(
    conflictResolution: ConflictResolutionStrategy = "manual"
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      created: 0,
      updated: 0,
      conflicts: 0,
      errors: [],
      timestamp: new Date(),
    };

    try {
      // Get local issues that need syncing
      const localIssues = Array.from(this.localIssueStore.values());
      
      for (const localIssue of localIssues) {
        try {
          // Check if issue exists in Linear
          const remoteIssue = await this.apiClient.getIssue(localIssue.id);
          
          if (!remoteIssue) {
            // Create new issue in Linear
            await this.createIssueInLinear(localIssue);
            result.created++;
          } else {
            // Check for conflicts and update
            const conflict = await this.detectConflict(localIssue, remoteIssue);
            
            if (conflict) {
              result.conflicts++;
              await this.handleConflict(conflict, conflictResolution);
            } else {
              await this.updateIssueInLinear(localIssue);
              result.updated++;
            }
          }
        } catch (error) {
          result.errors.push(`Failed to sync issue ${localIssue.id}: ${error.message}`);
          result.success = false;
        }
      }
    } catch (error) {
      result.errors.push(`Sync to Linear failed: ${error.message}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Sync changes from Linear to local
   */
  private async syncFromLinear(
    conflictResolution: ConflictResolutionStrategy = "manual"
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      created: 0,
      updated: 0,
      conflicts: 0,
      errors: [],
      timestamp: new Date(),
    };

    try {
      // Get issues from Linear that have been updated since last sync
      const remoteIssues = await this.getUpdatedLinearIssues();
      
      for (const remoteIssue of remoteIssues) {
        try {
          const localIssue = this.localIssueStore.get(remoteIssue.id);
          
          if (!localIssue) {
            // Add new issue to local store
            this.localIssueStore.set(remoteIssue.id, remoteIssue as LinearIssue);
            result.created++;
          } else {
            // Check for conflicts and update
            const conflict = await this.detectConflict(localIssue, remoteIssue);
            
            if (conflict) {
              result.conflicts++;
              await this.handleConflict(conflict, conflictResolution);
            } else {
              this.updateLocalIssue(remoteIssue);
              result.updated++;
            }
          }
        } catch (error) {
          result.errors.push(`Failed to sync issue ${remoteIssue.id}: ${error.message}`);
          result.success = false;
        }
      }
    } catch (error) {
      result.errors.push(`Sync from Linear failed: ${error.message}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Handle webhook events for real-time updates
   */
  private async handleWebhookEvent(event: any): Promise<void> {
    try {
      switch (event.type) {
        case "Issue":
          await this.handleIssueWebhookEvent(event);
          break;
        default:
          // Handle other event types as needed
          break;
      }
    } catch (error) {
      this.emit("webhook.error", {
        event,
        error: error.message,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Handle issue webhook events
   */
  private async handleIssueWebhookEvent(event: any): Promise<void> {
    const issue = event.data;
    const localIssue = this.localIssueStore.get(issue.id);

    switch (event.action) {
      case "create":
        if (!localIssue) {
          this.localIssueStore.set(issue.id, issue);
          this.emit("issue.synced.from.webhook", {
            action: "created",
            issue,
            timestamp: new Date(),
          });
        }
        break;

      case "update":
        if (localIssue) {
          // Check for conflicts
          const conflict = await this.detectConflict(localIssue, issue);
          
          if (conflict) {
            this.emit("conflict.detected", conflict);
          } else {
            this.updateLocalIssue(issue);
            this.emit("issue.synced.from.webhook", {
              action: "updated",
              issue,
              timestamp: new Date(),
            });
          }
        }
        break;

      case "remove":
        if (localIssue) {
          this.localIssueStore.delete(issue.id);
          this.emit("issue.synced.from.webhook", {
            action: "deleted",
            issue,
            timestamp: new Date(),
          });
        }
        break;
    }
  }

  /**
   * Detect conflicts between local and remote issues
   */
  private async detectConflict(
    localIssue: LinearIssue,
    remoteIssue: any
  ): Promise<SyncConflict | null> {
    // Simple conflict detection based on update timestamps
    // In a real implementation, you'd compare specific fields
    
    const localUpdated = new Date(localIssue.updatedAt);
    const remoteUpdated = new Date(remoteIssue.updatedAt);
    
    if (Math.abs(localUpdated.getTime() - remoteUpdated.getTime()) < 1000) {
      return null; // No conflict if timestamps are very close
    }

    // Check for specific field conflicts
    const conflicts: Array<{
      type: SyncConflict['type'];
      localValue: any;
      remoteValue: any;
    }> = [];

    if (localIssue.title !== remoteIssue.title) {
      conflicts.push({
        type: "description",
        localValue: localIssue.title,
        remoteValue: remoteIssue.title,
      });
    }

    if (localIssue.description !== remoteIssue.description) {
      conflicts.push({
        type: "description",
        localValue: localIssue.description,
        remoteValue: remoteIssue.description,
      });
    }

    if (conflicts.length > 0) {
      const conflict: SyncConflict = {
        issueId: localIssue.id,
        type: conflicts[0].type, // Use first conflict type
        localValue: conflicts[0].localValue,
        remoteValue: conflicts[0].remoteValue,
        suggestedResolution: "manual",
        timestamp: new Date(),
      };

      this.conflicts.set(localIssue.id, conflict);
      return conflict;
    }

    return null;
  }

  /**
   * Handle sync conflicts
   */
  private async handleConflict(
    conflict: SyncConflict,
    strategy: ConflictResolutionStrategy
  ): Promise<void> {
    switch (strategy) {
      case "linear-wins":
        await this.resolveConflictLinearWins(conflict);
        break;
      case "local-wins":
        await this.resolveConflictLocalWins(conflict);
        break;
      case "merge":
        await this.resolveConflictMerge(conflict);
        break;
      case "manual":
        // Store conflict for manual resolution
        this.emit("conflict.requires.manual.resolution", conflict);
        break;
      case "skip":
        // Skip this conflict
        this.conflicts.delete(conflict.issueId);
        break;
    }
  }

  /**
   * Resolve conflict with Linear data taking precedence
   */
  private async resolveConflictLinearWins(conflict: SyncConflict): Promise<void> {
    const remoteIssue = await this.apiClient.getIssue(conflict.issueId);
    if (remoteIssue) {
      this.updateLocalIssue(remoteIssue);
      this.conflicts.delete(conflict.issueId);
      this.emit("conflict.resolved", {
        conflict,
        resolution: "linear-wins",
        timestamp: new Date(),
      });
    }
  }

  /**
   * Resolve conflict with local data taking precedence
   */
  private async resolveConflictLocalWins(conflict: SyncConflict): Promise<void> {
    const localIssue = this.localIssueStore.get(conflict.issueId);
    if (localIssue) {
      await this.updateIssueInLinear(localIssue);
      this.conflicts.delete(conflict.issueId);
      this.emit("conflict.resolved", {
        conflict,
        resolution: "local-wins",
        timestamp: new Date(),
      });
    }
  }

  /**
   * Resolve conflict by merging changes
   */
  private async resolveConflictMerge(conflict: SyncConflict): Promise<void> {
    // Simple merge strategy - concatenate descriptions, prefer local for other fields
    const localIssue = this.localIssueStore.get(conflict.issueId);
    const remoteIssue = await this.apiClient.getIssue(conflict.issueId);
    
    if (localIssue && remoteIssue) {
      const mergedDescription = `${localIssue.description}\n\n---\n\n${remoteIssue.description}`;
      
      const mergedIssue: LinearIssue = {
        ...localIssue,
        description: mergedDescription,
      };

      await this.updateIssueInLinear(mergedIssue);
      this.localIssueStore.set(conflict.issueId, mergedIssue);
      this.conflicts.delete(conflict.issueId);
      
      this.emit("conflict.resolved", {
        conflict,
        resolution: "merge",
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get issues updated since last sync
   */
  private async getUpdatedLinearIssues(): Promise<any[]> {
    // Get all issues and filter by update time
    // In a real implementation, you'd use Linear's filtering capabilities
    const issues = await this.apiClient.getIssues();
    
    if (!this.lastSyncTimestamp) {
      return issues;
    }

    return issues.filter(issue => 
      new Date(issue.updatedAt) > this.lastSyncTimestamp!
    );
  }

  /**
   * Create issue in Linear
   */
  private async createIssueInLinear(localIssue: LinearIssue): Promise<void> {
    await this.apiClient.createIssue({
      title: localIssue.title,
      description: localIssue.description,
      teamId: this.config.teamId,
      priority: localIssue.priority,
      assigneeId: localIssue.assignee?.id,
      labelIds: localIssue.labels?.nodes?.map(label => label.id),
      stateId: localIssue.state?.id,
    });
  }

  /**
   * Update issue in Linear
   */
  private async updateIssueInLinear(localIssue: LinearIssue): Promise<void> {
    await this.apiClient.updateIssue(localIssue.id, {
      title: localIssue.title,
      description: localIssue.description,
      priority: localIssue.priority,
      assigneeId: localIssue.assignee?.id,
      labelIds: localIssue.labels?.nodes?.map(label => label.id),
      stateId: localIssue.state?.id,
    });
  }

  /**
   * Update local issue
   */
  private updateLocalIssue(remoteIssue: any): void {
    const linearIssue: LinearIssue = {
      ...remoteIssue,
      // Preserve VoltAgent-specific fields if they exist
      estimatedHours: this.localIssueStore.get(remoteIssue.id)?.estimatedHours,
      dependencies: this.localIssueStore.get(remoteIssue.id)?.dependencies || [],
    };

    this.localIssueStore.set(remoteIssue.id, linearIssue);
  }

  /**
   * Get sync status
   */
  getSyncStatus(): {
    isRunning: boolean;
    lastSync?: Date;
    conflicts: number;
    nextSync?: Date;
  } {
    let nextSync: Date | undefined;
    
    if (this.syncTask && this.config.syncInterval) {
      nextSync = new Date(Date.now() + this.config.syncInterval);
    }

    return {
      isRunning: this.isRunning,
      lastSync: this.lastSyncTimestamp,
      conflicts: this.conflicts.size,
      nextSync,
    };
  }

  /**
   * Get pending conflicts
   */
  getPendingConflicts(): SyncConflict[] {
    return Array.from(this.conflicts.values());
  }

  /**
   * Manually resolve conflict
   */
  async resolveConflictManually(
    issueId: string,
    resolution: ConflictResolutionStrategy
  ): Promise<void> {
    const conflict = this.conflicts.get(issueId);
    if (!conflict) {
      throw new Error(`No conflict found for issue ${issueId}`);
    }

    await this.handleConflict(conflict, resolution);
  }

  /**
   * Force sync specific issue
   */
  async forceSyncIssue(
    issueId: string,
    direction: "to-linear" | "from-linear"
  ): Promise<void> {
    if (direction === "to-linear") {
      const localIssue = this.localIssueStore.get(issueId);
      if (localIssue) {
        await this.updateIssueInLinear(localIssue);
      }
    } else {
      const remoteIssue = await this.apiClient.getIssue(issueId);
      if (remoteIssue) {
        this.updateLocalIssue(remoteIssue);
      }
    }

    this.emit("issue.force.synced", {
      issueId,
      direction,
      timestamp: new Date(),
    });
  }
}

