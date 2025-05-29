import { EventEmitter } from "events";
import { LinearApiClient } from "./api-client";
import { IssueManager } from "./issue-manager";
import type {
  LinearConfig,
  ProgressData,
  DependencyNode,
  LinearIssue,
} from "./types";

/**
 * Progress Tracker for monitoring project progress and generating visualizations
 */
export class ProgressTracker extends EventEmitter {
  private apiClient: LinearApiClient;
  private issueManager: IssueManager;
  private config: LinearConfig;
  private progressHistory: Map<string, ProgressData[]> = new Map();
  private velocityData: Array<{ date: Date; completed: number }> = [];

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
    this.issueManager.on("issue.completed", (data) => {
      this.recordVelocityData(data.timestamp);
      this.emit("progress.updated", { timestamp: data.timestamp });
    });

    this.issueManager.on("issue.created", () => {
      this.emit("progress.updated", { timestamp: new Date() });
    });

    this.issueManager.on("issue.updated", () => {
      this.emit("progress.updated", { timestamp: new Date() });
    });
  }

  /**
   * Calculate progress for a project or milestone
   */
  async calculateProjectProgress(
    projectId?: string,
    teamId?: string
  ): Promise<ProgressData> {
    const issues = await this.getProjectIssues(projectId, teamId);
    const progressData = await this.calculateProgressFromIssues(issues);
    
    // Store progress history
    const key = projectId || teamId || "default";
    if (!this.progressHistory.has(key)) {
      this.progressHistory.set(key, []);
    }
    this.progressHistory.get(key)!.push(progressData);

    this.emit("progress.calculated", {
      projectId,
      teamId,
      progress: progressData,
    });

    return progressData;
  }

  /**
   * Get progress history for trend analysis
   */
  getProgressHistory(
    projectId?: string,
    teamId?: string,
    days = 30
  ): ProgressData[] {
    const key = projectId || teamId || "default";
    const history = this.progressHistory.get(key) || [];
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return history.filter(progress => 
      progress.timestamp && progress.timestamp >= cutoffDate
    );
  }

  /**
   * Calculate team velocity (issues completed per time period)
   */
  async calculateVelocity(
    teamId?: string,
    periodDays = 7
  ): Promise<{
    current: number;
    average: number;
    trend: "up" | "down" | "stable";
    history: Array<{ period: string; completed: number }>;
  }> {
    const issues = await this.getCompletedIssues(teamId, periodDays * 4); // Get 4 periods of data
    
    const periods = this.groupIssuesByPeriod(issues, periodDays);
    const velocityHistory = periods.map(period => ({
      period: period.name,
      completed: period.issues.length,
    }));

    const currentVelocity = velocityHistory[velocityHistory.length - 1]?.completed || 0;
    const averageVelocity = velocityHistory.length > 0
      ? velocityHistory.reduce((sum, period) => sum + period.completed, 0) / velocityHistory.length
      : 0;

    const trend = this.calculateTrend(velocityHistory);

    const velocityData = {
      current: currentVelocity,
      average: averageVelocity,
      trend,
      history: velocityHistory,
    };

    this.emit("velocity.calculated", {
      teamId,
      velocity: velocityData,
    });

    return velocityData;
  }

  /**
   * Generate burndown chart data
   */
  async generateBurndownData(
    issueIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    date: Date;
    remaining: number;
    ideal: number;
    completed: number;
  }>> {
    const issues = await Promise.all(
      issueIds.map(id => this.apiClient.getIssue(id))
    );
    const validIssues = issues.filter(issue => issue !== null);

    const totalIssues = validIssues.length;
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const idealBurnRate = totalIssues / totalDays;

    const burndownData: Array<{
      date: Date;
      remaining: number;
      ideal: number;
      completed: number;
    }> = [];

    for (let day = 0; day <= totalDays; day++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + day);

      const completedByDate = await this.getIssuesCompletedByDate(validIssues, currentDate);
      const remaining = totalIssues - completedByDate;
      const ideal = Math.max(0, totalIssues - (idealBurnRate * day));

      burndownData.push({
        date: currentDate,
        remaining,
        ideal,
        completed: completedByDate,
      });
    }

    this.emit("burndown.generated", {
      issueIds,
      startDate,
      endDate,
      data: burndownData,
    });

    return burndownData;
  }

  /**
   * Generate milestone progress report
   */
  async generateMilestoneReport(milestoneId: string): Promise<{
    milestone: any;
    progress: ProgressData;
    blockers: any[];
    risks: string[];
    estimatedCompletion: Date | null;
    recommendations: string[];
  }> {
    // Note: Linear doesn't have explicit milestones, using projects instead
    const issues = await this.getProjectIssues(milestoneId);
    const progress = await this.calculateProgressFromIssues(issues);
    
    const blockers = await this.identifyBlockers(issues);
    const risks = this.identifyRisks(issues, progress);
    const estimatedCompletion = this.estimateCompletion(issues, progress);
    const recommendations = this.generateRecommendations(progress, blockers, risks);

    const report = {
      milestone: { id: milestoneId },
      progress,
      blockers,
      risks,
      estimatedCompletion,
      recommendations,
    };

    this.emit("milestone.report.generated", report);
    return report;
  }

  /**
   * Generate team performance metrics
   */
  async generateTeamMetrics(
    teamId?: string,
    periodDays = 30
  ): Promise<{
    velocity: any;
    throughput: number;
    cycleTime: number;
    qualityMetrics: {
      bugRate: number;
      reworkRate: number;
    };
    memberMetrics: Array<{
      userId: string;
      completed: number;
      inProgress: number;
      averageCycleTime: number;
    }>;
  }> {
    const velocity = await this.calculateVelocity(teamId, 7);
    const issues = await this.getTeamIssues(teamId, periodDays);
    
    const throughput = this.calculateThroughput(issues, periodDays);
    const cycleTime = await this.calculateAverageCycleTime(issues);
    const qualityMetrics = this.calculateQualityMetrics(issues);
    const memberMetrics = await this.calculateMemberMetrics(issues);

    const metrics = {
      velocity,
      throughput,
      cycleTime,
      qualityMetrics,
      memberMetrics,
    };

    this.emit("team.metrics.generated", {
      teamId,
      metrics,
    });

    return metrics;
  }

  /**
   * Create dependency visualization data
   */
  async createDependencyVisualization(
    issueIds: string[]
  ): Promise<{
    nodes: Array<{
      id: string;
      title: string;
      status: string;
      type: "issue" | "milestone";
      progress?: number;
    }>;
    edges: Array<{
      source: string;
      target: string;
      type: "depends_on" | "blocks";
    }>;
    criticalPath: string[];
  }> {
    const issues = await Promise.all(
      issueIds.map(id => this.issueManager.getIssueWithSubIssues(id))
    );
    const validIssues = issues.filter(issue => issue !== null) as LinearIssue[];

    const dependencyGraph = this.issueManager.buildDependencyGraph(validIssues);
    
    const nodes = Array.from(dependencyGraph.values()).map(node => ({
      id: node.issueId,
      title: node.title,
      status: node.status,
      type: "issue" as const,
    }));

    const edges: Array<{
      source: string;
      target: string;
      type: "depends_on" | "blocks";
    }> = [];

    for (const node of dependencyGraph.values()) {
      for (const depId of node.dependencies) {
        edges.push({
          source: node.issueId,
          target: depId,
          type: "depends_on",
        });
      }
    }

    const criticalPath = this.findCriticalPath(dependencyGraph);

    const visualization = {
      nodes,
      edges,
      criticalPath,
    };

    this.emit("dependency.visualization.created", visualization);
    return visualization;
  }

  /**
   * Generate predictive analytics
   */
  async generatePredictiveAnalytics(
    projectId?: string,
    teamId?: string
  ): Promise<{
    estimatedCompletion: Date | null;
    riskFactors: Array<{
      factor: string;
      impact: "low" | "medium" | "high";
      probability: number;
    }>;
    recommendations: string[];
    confidenceLevel: number;
  }> {
    const issues = await this.getProjectIssues(projectId, teamId);
    const progress = await this.calculateProgressFromIssues(issues);
    const velocity = await this.calculateVelocity(teamId);

    const estimatedCompletion = this.predictCompletion(progress, velocity);
    const riskFactors = this.identifyRiskFactors(issues, progress, velocity);
    const recommendations = this.generatePredictiveRecommendations(riskFactors);
    const confidenceLevel = this.calculateConfidenceLevel(velocity, progress);

    const analytics = {
      estimatedCompletion,
      riskFactors,
      recommendations,
      confidenceLevel,
    };

    this.emit("predictive.analytics.generated", analytics);
    return analytics;
  }

  /**
   * Private helper methods
   */

  private async getProjectIssues(projectId?: string, teamId?: string): Promise<any[]> {
    if (projectId) {
      // Get issues for specific project
      return await this.apiClient.getIssues({ teamId: teamId || this.config.teamId });
    } else if (teamId) {
      return await this.apiClient.getIssues({ teamId });
    } else {
      return await this.apiClient.getIssues({ teamId: this.config.teamId });
    }
  }

  private async calculateProgressFromIssues(issues: any[]): Promise<ProgressData> {
    let completedIssues = 0;
    let inProgressIssues = 0;
    let blockedIssues = 0;

    for (const issue of issues) {
      const state = await issue.state;
      
      switch (state.type) {
        case "completed":
          completedIssues++;
          break;
        case "started":
          inProgressIssues++;
          break;
        case "backlog":
          if (state.name.toLowerCase().includes("blocked")) {
            blockedIssues++;
          }
          break;
      }
    }

    const totalIssues = issues.length;
    const completionPercentage = totalIssues > 0 ? (completedIssues / totalIssues) * 100 : 0;
    const velocity = this.velocityData.length > 0 
      ? this.velocityData[this.velocityData.length - 1].completed 
      : 0;

    return {
      totalIssues,
      completedIssues,
      inProgressIssues,
      blockedIssues,
      completionPercentage,
      velocity,
      timestamp: new Date(),
    };
  }

  private recordVelocityData(timestamp: Date): void {
    const today = new Date(timestamp);
    today.setHours(0, 0, 0, 0);

    const existingEntry = this.velocityData.find(entry => 
      entry.date.getTime() === today.getTime()
    );

    if (existingEntry) {
      existingEntry.completed++;
    } else {
      this.velocityData.push({
        date: today,
        completed: 1,
      });
    }

    // Keep only last 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);
    this.velocityData = this.velocityData.filter(entry => entry.date >= cutoffDate);
  }

  private async getCompletedIssues(teamId?: string, days = 30): Promise<any[]> {
    const allIssues = await this.getTeamIssues(teamId, days);
    const completedIssues = [];

    for (const issue of allIssues) {
      const state = await issue.state;
      if (state.type === "completed") {
        completedIssues.push(issue);
      }
    }

    return completedIssues;
  }

  private async getTeamIssues(teamId?: string, days = 30): Promise<any[]> {
    // This is a simplified implementation
    // In practice, you'd filter by update date
    return await this.apiClient.getIssues({ 
      teamId: teamId || this.config.teamId 
    });
  }

  private groupIssuesByPeriod(
    issues: any[],
    periodDays: number
  ): Array<{ name: string; issues: any[] }> {
    const periods: Array<{ name: string; issues: any[] }> = [];
    const now = new Date();

    for (let i = 0; i < 4; i++) {
      const periodEnd = new Date(now);
      periodEnd.setDate(now.getDate() - (i * periodDays));
      
      const periodStart = new Date(periodEnd);
      periodStart.setDate(periodEnd.getDate() - periodDays);

      const periodIssues = issues.filter(issue => {
        const completedAt = new Date(issue.completedAt || issue.updatedAt);
        return completedAt >= periodStart && completedAt < periodEnd;
      });

      periods.unshift({
        name: `${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`,
        issues: periodIssues,
      });
    }

    return periods;
  }

  private calculateTrend(history: Array<{ completed: number }>): "up" | "down" | "stable" {
    if (history.length < 2) return "stable";

    const recent = history.slice(-2);
    const change = recent[1].completed - recent[0].completed;

    if (change > 0) return "up";
    if (change < 0) return "down";
    return "stable";
  }

  private async getIssuesCompletedByDate(issues: any[], date: Date): Promise<number> {
    let completed = 0;
    
    for (const issue of issues) {
      const state = await issue.state;
      if (state.type === "completed") {
        const completedAt = new Date(issue.completedAt || issue.updatedAt);
        if (completedAt <= date) {
          completed++;
        }
      }
    }

    return completed;
  }

  private async identifyBlockers(issues: any[]): Promise<any[]> {
    const blockers = [];

    for (const issue of issues) {
      const state = await issue.state;
      if (state.name.toLowerCase().includes("blocked") || 
          state.name.toLowerCase().includes("waiting")) {
        blockers.push(issue);
      }
    }

    return blockers;
  }

  private identifyRisks(issues: any[], progress: ProgressData): string[] {
    const risks: string[] = [];

    if (progress.blockedIssues > progress.totalIssues * 0.2) {
      risks.push("High number of blocked issues may delay completion");
    }

    if (progress.velocity < progress.totalIssues * 0.1) {
      risks.push("Low velocity may indicate resource constraints");
    }

    if (progress.inProgressIssues > progress.totalIssues * 0.5) {
      risks.push("Too many issues in progress may indicate lack of focus");
    }

    return risks;
  }

  private estimateCompletion(issues: any[], progress: ProgressData): Date | null {
    if (progress.velocity === 0) return null;

    const remainingIssues = progress.totalIssues - progress.completedIssues;
    const weeksToComplete = remainingIssues / progress.velocity;
    
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + (weeksToComplete * 7));
    
    return estimatedDate;
  }

  private generateRecommendations(
    progress: ProgressData,
    blockers: any[],
    risks: string[]
  ): string[] {
    const recommendations: string[] = [];

    if (blockers.length > 0) {
      recommendations.push("Focus on resolving blocked issues to improve flow");
    }

    if (progress.velocity < 1) {
      recommendations.push("Consider adding more resources or reducing scope");
    }

    if (progress.inProgressIssues > progress.completedIssues) {
      recommendations.push("Limit work in progress to improve focus and completion rate");
    }

    return recommendations;
  }

  private calculateThroughput(issues: any[], periodDays: number): number {
    // Simplified throughput calculation
    return issues.length / periodDays;
  }

  private async calculateAverageCycleTime(issues: any[]): Promise<number> {
    let totalCycleTime = 0;
    let completedIssues = 0;

    for (const issue of issues) {
      const state = await issue.state;
      if (state.type === "completed") {
        const created = new Date(issue.createdAt);
        const completed = new Date(issue.completedAt || issue.updatedAt);
        const cycleTime = (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        
        totalCycleTime += cycleTime;
        completedIssues++;
      }
    }

    return completedIssues > 0 ? totalCycleTime / completedIssues : 0;
  }

  private calculateQualityMetrics(issues: any[]): {
    bugRate: number;
    reworkRate: number;
  } {
    const bugIssues = issues.filter(issue => 
      issue.labels?.nodes?.some(label => 
        label.name.toLowerCase().includes("bug")
      )
    );

    const reworkIssues = issues.filter(issue =>
      issue.title.toLowerCase().includes("fix") ||
      issue.title.toLowerCase().includes("rework")
    );

    return {
      bugRate: issues.length > 0 ? bugIssues.length / issues.length : 0,
      reworkRate: issues.length > 0 ? reworkIssues.length / issues.length : 0,
    };
  }

  private async calculateMemberMetrics(issues: any[]): Promise<Array<{
    userId: string;
    completed: number;
    inProgress: number;
    averageCycleTime: number;
  }>> {
    const memberMap = new Map<string, {
      completed: number;
      inProgress: number;
      totalCycleTime: number;
      completedCount: number;
    }>();

    for (const issue of issues) {
      const assignee = issue.assignee;
      if (!assignee) continue;

      if (!memberMap.has(assignee.id)) {
        memberMap.set(assignee.id, {
          completed: 0,
          inProgress: 0,
          totalCycleTime: 0,
          completedCount: 0,
        });
      }

      const member = memberMap.get(assignee.id)!;
      const state = await issue.state;

      if (state.type === "completed") {
        member.completed++;
        member.completedCount++;
        
        const created = new Date(issue.createdAt);
        const completed = new Date(issue.completedAt || issue.updatedAt);
        const cycleTime = (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        member.totalCycleTime += cycleTime;
      } else if (state.type === "started") {
        member.inProgress++;
      }
    }

    return Array.from(memberMap.entries()).map(([userId, data]) => ({
      userId,
      completed: data.completed,
      inProgress: data.inProgress,
      averageCycleTime: data.completedCount > 0 ? data.totalCycleTime / data.completedCount : 0,
    }));
  }

  private findCriticalPath(dependencyGraph: Map<string, DependencyNode>): string[] {
    // Simplified critical path calculation
    const criticalPath: string[] = [];
    let maxDepth = 0;

    for (const node of dependencyGraph.values()) {
      if (node.depth > maxDepth) {
        maxDepth = node.depth;
      }
    }

    // Find nodes on the critical path (highest depth)
    for (const node of dependencyGraph.values()) {
      if (node.depth === maxDepth) {
        criticalPath.push(node.issueId);
      }
    }

    return criticalPath;
  }

  private predictCompletion(progress: ProgressData, velocity: any): Date | null {
    if (velocity.average === 0) return null;

    const remainingIssues = progress.totalIssues - progress.completedIssues;
    const weeksToComplete = remainingIssues / velocity.average;
    
    const estimatedDate = new Date();
    estimatedDate.setDate(estimatedDate.getDate() + (weeksToComplete * 7));
    
    return estimatedDate;
  }

  private identifyRiskFactors(
    issues: any[],
    progress: ProgressData,
    velocity: any
  ): Array<{
    factor: string;
    impact: "low" | "medium" | "high";
    probability: number;
  }> {
    const risks: Array<{
      factor: string;
      impact: "low" | "medium" | "high";
      probability: number;
    }> = [];

    if (velocity.trend === "down") {
      risks.push({
        factor: "Declining velocity",
        impact: "high",
        probability: 0.8,
      });
    }

    if (progress.blockedIssues > 0) {
      risks.push({
        factor: "Blocked issues",
        impact: "medium",
        probability: 0.6,
      });
    }

    return risks;
  }

  private generatePredictiveRecommendations(riskFactors: any[]): string[] {
    const recommendations: string[] = [];

    for (const risk of riskFactors) {
      switch (risk.factor) {
        case "Declining velocity":
          recommendations.push("Investigate causes of velocity decline and address bottlenecks");
          break;
        case "Blocked issues":
          recommendations.push("Prioritize unblocking issues to maintain flow");
          break;
      }
    }

    return recommendations;
  }

  private calculateConfidenceLevel(velocity: any, progress: ProgressData): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on velocity stability
    if (velocity.trend === "stable") confidence += 0.2;
    if (velocity.trend === "up") confidence += 0.1;

    // Decrease confidence based on blockers
    if (progress.blockedIssues > 0) {
      confidence -= (progress.blockedIssues / progress.totalIssues) * 0.3;
    }

    return Math.max(0, Math.min(1, confidence));
  }
}

