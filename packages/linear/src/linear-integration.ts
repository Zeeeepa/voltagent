import { EventEmitter } from "events";
import { LinearApiClient } from "./api-client";
import { IssueManager } from "./issue-manager";
import { SyncService } from "./sync-service";
import { RequirementAnalyzer } from "./requirement-analyzer";
import { ProgressTracker } from "./progress-tracker";
import type {
  LinearConfig,
  LinearEvent,
  LinearEventType,
  RequirementAnalysis,
  SyncResult,
  ProgressData,
  VoltAgentIssueInput,
  LinearIssue,
} from "./types";

/**
 * Main Linear Integration class for VoltAgent
 * Provides comprehensive Linear integration with automated issue management
 */
export class LinearIntegration extends EventEmitter {
  public readonly apiClient: LinearApiClient;
  public readonly issueManager: IssueManager;
  public readonly syncService: SyncService;
  public readonly requirementAnalyzer: RequirementAnalyzer;
  public readonly progressTracker: ProgressTracker;
  
  private config: LinearConfig;
  private isInitialized = false;

  constructor(config: LinearConfig) {
    super();
    this.config = config;

    // Initialize components
    this.apiClient = new LinearApiClient(config);
    this.issueManager = new IssueManager(this.apiClient, config);
    this.syncService = new SyncService(this.apiClient, this.issueManager, config);
    this.requirementAnalyzer = new RequirementAnalyzer(config);
    this.progressTracker = new ProgressTracker(this.apiClient, this.issueManager, config);

    this.setupEventListeners();
  }

  /**
   * Initialize the Linear integration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Validate API key
      const isValidKey = await this.apiClient.validateApiKey();
      if (!isValidKey) {
        throw new Error("Invalid Linear API key");
      }

      // Get current user and team info
      const user = await this.apiClient.getCurrentUser();
      const teams = await this.apiClient.getTeams();

      this.emit("initialized", {
        user,
        teams,
        timestamp: new Date(),
      });

      this.isInitialized = true;
    } catch (error) {
      this.emit("initialization.failed", {
        error: error.message,
        timestamp: new Date(),
      });
      throw error;
    }
  }

  /**
   * Setup event listeners for all components
   */
  private setupEventListeners(): void {
    // API Client events
    this.apiClient.on("linear.event", (event: LinearEvent) => {
      this.emit("linear.event", event);
      this.emit(event.type, event.payload);
    });

    // Issue Manager events
    this.issueManager.on("issue.created", (data) => {
      this.emitEvent("issue.created", data);
    });

    this.issueManager.on("issue.updated", (data) => {
      this.emitEvent("issue.updated", data);
    });

    this.issueManager.on("issues.generated", (data) => {
      this.emitEvent("issues.generated", data);
    });

    // Sync Service events
    this.syncService.on("sync.completed", (result: SyncResult) => {
      this.emitEvent("sync.completed", result);
    });

    this.syncService.on("sync.failed", (result: SyncResult) => {
      this.emitEvent("sync.failed", result);
    });

    this.syncService.on("conflict.detected", (conflict) => {
      this.emitEvent("conflict.detected", conflict);
    });

    // Requirement Analyzer events
    this.requirementAnalyzer.on("requirements.analyzed", (analysis) => {
      this.emitEvent("requirements.analyzed", analysis);
    });

    // Progress Tracker events
    this.progressTracker.on("progress.calculated", (data) => {
      this.emitEvent("progress.calculated", data);
    });
  }

  /**
   * Create issues from requirements text
   */
  async createIssuesFromRequirements(
    requirementsText: string,
    projectTitle: string,
    options: {
      teamId?: string;
      priority?: "low" | "medium" | "high" | "urgent";
      assigneeId?: string;
      labelIds?: string[];
    } = {}
  ): Promise<{
    analysis: RequirementAnalysis;
    mainIssue: LinearIssue;
    subIssues: LinearIssue[];
  }> {
    await this.ensureInitialized();

    // Analyze requirements
    const analysis = await this.requirementAnalyzer.analyzeRequirements(requirementsText);

    // Generate issues from analysis
    const { mainIssue, subIssues } = await this.issueManager.generateIssuesFromRequirements(
      analysis,
      projectTitle
    );

    // Apply additional options
    if (options.assigneeId || options.labelIds) {
      const updateData: any = {};
      if (options.assigneeId) updateData.assigneeId = options.assigneeId;
      if (options.labelIds) updateData.labelIds = options.labelIds;

      await this.issueManager.updateIssue(mainIssue.id, updateData);
    }

    this.emitEvent("issues.created.from.requirements", {
      analysis,
      mainIssue,
      subIssues,
      projectTitle,
    });

    return { analysis, mainIssue, subIssues };
  }

  /**
   * Create issues from PRD document
   */
  async createIssuesFromPRD(
    prdContent: string,
    projectTitle: string,
    options: {
      teamId?: string;
      assigneeId?: string;
      labelIds?: string[];
    } = {}
  ): Promise<{
    analysis: RequirementAnalysis;
    mainIssue: LinearIssue;
    subIssues: LinearIssue[];
  }> {
    await this.ensureInitialized();

    // Analyze PRD
    const analysis = await this.requirementAnalyzer.analyzePRD(prdContent);

    // Generate issues from analysis
    const { mainIssue, subIssues } = await this.issueManager.generateIssuesFromRequirements(
      analysis,
      projectTitle
    );

    this.emitEvent("issues.created.from.prd", {
      analysis,
      mainIssue,
      subIssues,
      projectTitle,
    });

    return { analysis, mainIssue, subIssues };
  }

  /**
   * Start automatic synchronization
   */
  async startSync(): Promise<void> {
    await this.ensureInitialized();
    this.syncService.startSync();
  }

  /**
   * Stop automatic synchronization
   */
  stopSync(): void {
    this.syncService.stopSync();
  }

  /**
   * Perform manual synchronization
   */
  async performSync(options: {
    direction?: "both" | "to-linear" | "from-linear";
    conflictResolution?: "linear-wins" | "local-wins" | "merge" | "manual" | "skip";
  } = {}): Promise<SyncResult> {
    await this.ensureInitialized();
    return await this.syncService.performSync(options);
  }

  /**
   * Get project progress
   */
  async getProjectProgress(
    projectId?: string,
    teamId?: string
  ): Promise<ProgressData> {
    await this.ensureInitialized();
    return await this.progressTracker.calculateProjectProgress(projectId, teamId);
  }

  /**
   * Generate progress report
   */
  async generateProgressReport(
    projectId?: string,
    teamId?: string
  ): Promise<{
    progress: ProgressData;
    velocity: any;
    burndown: any[];
    recommendations: string[];
  }> {
    await this.ensureInitialized();

    const progress = await this.progressTracker.calculateProjectProgress(projectId, teamId);
    const velocity = await this.progressTracker.calculateVelocity(teamId);
    
    // Generate burndown for next 30 days
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30);
    
    const issues = await this.apiClient.getIssues({ teamId: teamId || this.config.teamId });
    const issueIds = issues.map(issue => issue.id);
    const burndown = await this.progressTracker.generateBurndownData(issueIds, startDate, endDate);

    const recommendations = this.generateProgressRecommendations(progress, velocity);

    const report = {
      progress,
      velocity,
      burndown,
      recommendations,
    };

    this.emitEvent("progress.report.generated", report);
    return report;
  }

  /**
   * Create issue with VoltAgent extensions
   */
  async createIssue(input: VoltAgentIssueInput): Promise<LinearIssue> {
    await this.ensureInitialized();
    return await this.issueManager.createMainIssue(
      input.title,
      input.description || "",
      input
    );
  }

  /**
   * Update issue with VoltAgent extensions
   */
  async updateIssue(issueId: string, update: any): Promise<LinearIssue> {
    await this.ensureInitialized();
    return await this.issueManager.updateIssue(issueId, update);
  }

  /**
   * Get issue with sub-issues
   */
  async getIssue(issueId: string): Promise<LinearIssue | null> {
    await this.ensureInitialized();
    return await this.issueManager.getIssueWithSubIssues(issueId);
  }

  /**
   * Search issues
   */
  async searchIssues(query: string, teamId?: string): Promise<any[]> {
    await this.ensureInitialized();
    return await this.apiClient.searchIssues(query, teamId);
  }

  /**
   * Get teams
   */
  async getTeams(): Promise<any[]> {
    await this.ensureInitialized();
    return await this.apiClient.getTeams();
  }

  /**
   * Get workflow states
   */
  async getWorkflowStates(teamId?: string): Promise<any[]> {
    await this.ensureInitialized();
    return await this.apiClient.getWorkflowStates(teamId);
  }

  /**
   * Process webhook event
   */
  processWebhookEvent(event: any): void {
    this.apiClient.processWebhookEvent(event);
  }

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: string, signature: string): boolean {
    return this.apiClient.validateWebhookSignature(payload, signature);
  }

  /**
   * Get sync status
   */
  getSyncStatus(): any {
    return this.syncService.getSyncStatus();
  }

  /**
   * Get pending conflicts
   */
  getPendingConflicts(): any[] {
    return this.syncService.getPendingConflicts();
  }

  /**
   * Resolve conflict manually
   */
  async resolveConflict(
    issueId: string,
    resolution: "linear-wins" | "local-wins" | "merge" | "skip"
  ): Promise<void> {
    await this.syncService.resolveConflictManually(issueId, resolution);
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<{
    status: "healthy" | "unhealthy";
    components: {
      apiClient: any;
      sync: any;
    };
    timestamp: Date;
  }> {
    const apiHealth = await this.apiClient.healthCheck();
    const syncStatus = this.syncService.getSyncStatus();

    return {
      status: apiHealth.status,
      components: {
        apiClient: apiHealth,
        sync: syncStatus,
      },
      timestamp: new Date(),
    };
  }

  /**
   * Generate dependency visualization
   */
  async generateDependencyVisualization(issueIds: string[]): Promise<any> {
    await this.ensureInitialized();
    return await this.progressTracker.createDependencyVisualization(issueIds);
  }

  /**
   * Generate team metrics
   */
  async generateTeamMetrics(teamId?: string, periodDays = 30): Promise<any> {
    await this.ensureInitialized();
    return await this.progressTracker.generateTeamMetrics(teamId, periodDays);
  }

  /**
   * Generate predictive analytics
   */
  async generatePredictiveAnalytics(projectId?: string, teamId?: string): Promise<any> {
    await this.ensureInitialized();
    return await this.progressTracker.generatePredictiveAnalytics(projectId, teamId);
  }

  /**
   * Private helper methods
   */

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private emitEvent(type: LinearEventType, payload: any): void {
    const event: LinearEvent = {
      type,
      payload,
      timestamp: new Date(),
      source: "voltagent",
    };

    this.emit("linear.event", event);
    this.emit(type, payload);
  }

  private generateProgressRecommendations(progress: ProgressData, velocity: any): string[] {
    const recommendations: string[] = [];

    if (progress.completionPercentage < 50 && velocity.trend === "down") {
      recommendations.push("Consider increasing team capacity or reducing scope");
    }

    if (progress.blockedIssues > 0) {
      recommendations.push("Focus on resolving blocked issues to improve flow");
    }

    if (velocity.current < velocity.average) {
      recommendations.push("Investigate recent velocity decline and address bottlenecks");
    }

    if (progress.inProgressIssues > progress.completedIssues) {
      recommendations.push("Limit work in progress to improve completion rate");
    }

    return recommendations;
  }
}

