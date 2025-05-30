import type { Agent } from "../agent";
import type { LLMProvider } from "../agent/providers";
import type {
  TaskContext,
  LinearOptions,
  DevelopmentEngineEvent,
} from "./types";

/**
 * Linear Monitor for tracking task assignments and status updates
 * Handles integration with Linear API for automated task management
 */
export class LinearMonitor {
  private agent: Agent<{ llm: LLMProvider<unknown> }>;
  private options?: LinearOptions;
  private isMonitoringActive = false;
  private monitoringInterval?: NodeJS.Timeout;
  private eventHandlers: Map<string, (event: DevelopmentEngineEvent) => void> = new Map();

  constructor(
    agent: Agent<{ llm: LLMProvider<unknown> }>,
    options?: LinearOptions
  ) {
    this.agent = agent;
    this.options = options;
  }

  /**
   * Start monitoring Linear for new assignments
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoringActive) {
      console.log("Linear monitoring is already active");
      return;
    }

    try {
      console.log("Starting Linear assignment monitoring...");
      
      this.isMonitoringActive = true;
      
      // Set up periodic polling for new assignments
      this.monitoringInterval = setInterval(
        () => this.checkForNewAssignments(),
        30000 // Check every 30 seconds
      );

      // Set up webhook listener if webhook URL is provided
      if (this.options?.webhookUrl) {
        await this.setupWebhookListener();
      }

      console.log("Linear monitoring started successfully");
    } catch (error) {
      console.error("Failed to start Linear monitoring:", error);
      this.isMonitoringActive = false;
      throw new Error(`Linear monitoring startup failed: ${error}`);
    }
  }

  /**
   * Stop monitoring Linear assignments
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoringActive) {
      console.log("Linear monitoring is not active");
      return;
    }

    try {
      console.log("Stopping Linear assignment monitoring...");
      
      this.isMonitoringActive = false;
      
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = undefined;
      }

      console.log("Linear monitoring stopped successfully");
    } catch (error) {
      console.error("Failed to stop Linear monitoring:", error);
      throw new Error(`Linear monitoring shutdown failed: ${error}`);
    }
  }

  /**
   * Check if monitoring is currently active
   */
  async isMonitoring(): Promise<boolean> {
    return this.isMonitoringActive;
  }

  /**
   * Update task status in Linear
   */
  async updateTaskStatus(
    taskId: string,
    status: 'todo' | 'in_progress' | 'done' | 'cancelled',
    progress?: number
  ): Promise<void> {
    try {
      console.log(`Updating task ${taskId} status to ${status}`);
      
      // This would integrate with Linear API
      await this.callLinearAPI('updateIssue', {
        id: taskId,
        state: this.mapStatusToLinearState(status),
        progress,
      });

      // Emit status update event
      this.emitEvent({
        type: 'task_completed',
        taskId,
        timestamp: new Date(),
        data: { status, progress },
      });
    } catch (error) {
      console.error(`Failed to update task status for ${taskId}:`, error);
      throw new Error(`Task status update failed: ${error}`);
    }
  }

  /**
   * Create new task in Linear
   */
  async createTask(
    title: string,
    description: string,
    assigneeId?: string,
    parentId?: string
  ): Promise<string> {
    try {
      console.log("Creating new Linear task:", title);
      
      const taskData = {
        title,
        description,
        teamId: this.options?.teamId,
        assigneeId,
        parentId,
      };

      // This would integrate with Linear API
      const response = await this.callLinearAPI('createIssue', taskData);
      
      const taskId = response.id;
      
      // Emit task creation event
      this.emitEvent({
        type: 'task_started',
        taskId,
        timestamp: new Date(),
        data: taskData,
      });

      return taskId;
    } catch (error) {
      console.error("Failed to create Linear task:", error);
      throw new Error(`Task creation failed: ${error}`);
    }
  }

  /**
   * Add comment to Linear task
   */
  async addTaskComment(taskId: string, comment: string): Promise<void> {
    try {
      console.log(`Adding comment to task ${taskId}`);
      
      // This would integrate with Linear API
      await this.callLinearAPI('createComment', {
        issueId: taskId,
        body: comment,
      });
    } catch (error) {
      console.error(`Failed to add comment to task ${taskId}:`, error);
      throw new Error(`Comment creation failed: ${error}`);
    }
  }

  /**
   * Get task details from Linear
   */
  async getTaskDetails(taskId: string): Promise<TaskContext | null> {
    try {
      console.log(`Fetching task details for ${taskId}`);
      
      // This would integrate with Linear API
      const response = await this.callLinearAPI('getIssue', { id: taskId });
      
      if (!response) {
        return null;
      }

      return this.mapLinearIssueToTaskContext(response);
    } catch (error) {
      console.error(`Failed to get task details for ${taskId}:`, error);
      return null;
    }
  }

  /**
   * Register event handler for development engine events
   */
  addEventListener(
    eventType: string,
    handler: (event: DevelopmentEngineEvent) => void
  ): void {
    this.eventHandlers.set(eventType, handler);
  }

  /**
   * Remove event handler
   */
  removeEventListener(eventType: string): void {
    this.eventHandlers.delete(eventType);
  }

  // ===== Private Helper Methods =====

  private async checkForNewAssignments(): Promise<void> {
    try {
      // This would integrate with Linear API to check for new assignments
      const newAssignments = await this.getNewAssignments();
      
      for (const assignment of newAssignments) {
        await this.processNewAssignment(assignment);
      }
    } catch (error) {
      console.error("Failed to check for new assignments:", error);
    }
  }

  private async getNewAssignments(): Promise<any[]> {
    try {
      // This would integrate with Linear API
      const response = await this.callLinearAPI('getAssignedIssues', {
        teamId: this.options?.teamId,
        states: ['todo', 'in_progress'],
      });

      return response.issues || [];
    } catch (error) {
      console.error("Failed to get new assignments:", error);
      return [];
    }
  }

  private async processNewAssignment(assignment: any): Promise<void> {
    try {
      const taskContext = this.mapLinearIssueToTaskContext(assignment);
      
      // Emit task started event
      this.emitEvent({
        type: 'task_started',
        taskId: taskContext.id,
        timestamp: new Date(),
        data: { assignment: taskContext },
      });

      // Update task status to in progress
      await this.updateTaskStatus(taskContext.id, 'in_progress');
    } catch (error) {
      console.error("Failed to process new assignment:", error);
    }
  }

  private async setupWebhookListener(): Promise<void> {
    // This would set up a webhook listener for Linear events
    console.log("Setting up Linear webhook listener...");
    
    // Implementation would depend on the webhook framework being used
    // For now, just log that it would be set up
    console.log(`Webhook listener would be set up at: ${this.options?.webhookUrl}`);
  }

  private async callLinearAPI(method: string, data: any): Promise<any> {
    // This would make actual calls to the Linear API
    // For now, return mock responses
    
    console.log(`Linear API call: ${method}`, data);
    
    switch (method) {
      case 'updateIssue':
        return { success: true };
      case 'createIssue':
        return { id: `task-${Date.now()}` };
      case 'createComment':
        return { success: true };
      case 'getIssue':
        return this.getMockLinearIssue(data.id);
      case 'getAssignedIssues':
        return { issues: [] };
      default:
        throw new Error(`Unknown Linear API method: ${method}`);
    }
  }

  private mapStatusToLinearState(status: string): string {
    const statusMap: Record<string, string> = {
      'todo': 'Todo',
      'in_progress': 'In Progress',
      'done': 'Done',
      'cancelled': 'Cancelled',
    };

    return statusMap[status] || 'Todo';
  }

  private mapLinearIssueToTaskContext(issue: any): TaskContext {
    return {
      id: issue.id,
      title: issue.title,
      description: issue.description || '',
      requirements: {
        naturalLanguage: issue.description || '',
      },
      repoUrl: issue.repository?.url || '',
      priority: issue.priority || 1,
      labels: issue.labels?.map((label: any) => label.name) || [],
      assignee: issue.assignee?.id,
      parentTask: issue.parent?.id,
      subTasks: issue.children?.map((child: any) => child.id) || [],
      createdAt: new Date(issue.createdAt),
      updatedAt: new Date(issue.updatedAt),
    };
  }

  private getMockLinearIssue(id: string): any {
    return {
      id,
      title: "Sample Linear Task",
      description: "Sample task description from Linear",
      state: { name: "Todo" },
      priority: 1,
      labels: [],
      assignee: null,
      parent: null,
      children: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private emitEvent(event: DevelopmentEngineEvent): void {
    const handler = this.eventHandlers.get(event.type);
    if (handler) {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error in event handler for ${event.type}:`, error);
      }
    }
  }
}

