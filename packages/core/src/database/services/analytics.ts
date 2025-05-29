import { DatabaseConnection } from '../connection';
import { EventsModel } from '../models/events';
import { RequirementsModel } from '../models/requirements';
import { TasksModel } from '../models/tasks';
import { CorrelationsModel } from '../models/correlations';

/**
 * Analytics Service for VoltAgent
 * Phase 1.3: Setup Database Event Storage System
 * 
 * Provides development activity analytics, performance metrics, and trend analysis
 */

export interface DevelopmentMetrics {
  total_events: number;
  total_requirements: number;
  total_tasks: number;
  total_correlations: number;
  events_per_day: number;
  tasks_completed_today: number;
  requirements_completed: number;
  average_task_completion_time: number; // in hours
  agent_activity_score: number;
}

export interface AgentPerformanceMetrics {
  agent_id: string;
  total_events: number;
  tasks_assigned: number;
  tasks_completed: number;
  completion_rate: number;
  average_task_duration: number;
  activity_score: number;
  last_activity: Date;
  most_used_tools: string[];
}

export interface ProjectMetrics {
  project_id: string;
  requirements_count: number;
  tasks_count: number;
  completion_percentage: number;
  estimated_total_effort: number;
  actual_effort_spent: number;
  efficiency_ratio: number;
  blockers_count: number;
  dependencies_resolved: number;
}

export interface TrendData {
  date: string;
  value: number;
  label?: string;
}

export interface ActivityTrends {
  events_over_time: TrendData[];
  tasks_completion_trend: TrendData[];
  requirements_progress: TrendData[];
  agent_activity_trend: TrendData[];
}

export interface PerformanceInsights {
  bottlenecks: string[];
  recommendations: string[];
  efficiency_score: number;
  productivity_trends: 'increasing' | 'decreasing' | 'stable';
  risk_factors: string[];
}

export interface AnalyticsQuery {
  start_date?: Date;
  end_date?: Date;
  agent_id?: string;
  project_id?: string;
  include_trends?: boolean;
  include_insights?: boolean;
}

export class AnalyticsService {
  private eventsModel: EventsModel;
  private requirementsModel: RequirementsModel;
  private tasksModel: TasksModel;
  private correlationsModel: CorrelationsModel;
  private db: DatabaseConnection;

  constructor(db: DatabaseConnection) {
    this.db = db;
    this.eventsModel = new EventsModel(db);
    this.requirementsModel = new RequirementsModel(db);
    this.tasksModel = new TasksModel(db);
    this.correlationsModel = new CorrelationsModel(db);
  }

  /**
   * Get comprehensive development metrics
   */
  async getDevelopmentMetrics(query: AnalyticsQuery = {}): Promise<DevelopmentMetrics> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalEvents,
      totalRequirements,
      totalTasks,
      totalCorrelations,
      eventsToday,
      eventsYesterday,
      tasksCompletedToday,
      requirementsCompleted,
      avgTaskCompletionTime
    ] = await Promise.all([
      this.eventsModel.count(this.buildEventFilters(query)),
      this.requirementsModel.count(),
      this.tasksModel.count(),
      this.correlationsModel.count(),
      this.eventsModel.count({ start_date: today }),
      this.eventsModel.count({ start_date: yesterday, end_date: today }),
      this.tasksModel.count({ status: 'completed' }),
      this.requirementsModel.count({ status: 'completed' }),
      this.calculateAverageTaskCompletionTime(query)
    ]);

    const eventsPerDay = eventsYesterday > 0 ? eventsToday / eventsYesterday : 1;
    const agentActivityScore = this.calculateActivityScore(totalEvents, totalTasks);

    return {
      total_events: totalEvents,
      total_requirements: totalRequirements,
      total_tasks: totalTasks,
      total_correlations: totalCorrelations,
      events_per_day: eventsPerDay,
      tasks_completed_today: tasksCompletedToday,
      requirements_completed: requirementsCompleted,
      average_task_completion_time: avgTaskCompletionTime,
      agent_activity_score: agentActivityScore
    };
  }

  /**
   * Get agent performance metrics
   */
  async getAgentPerformanceMetrics(agentId: string): Promise<AgentPerformanceMetrics> {
    const [
      totalEvents,
      tasksAssigned,
      tasksCompleted,
      lastActivity,
      mostUsedTools,
      avgTaskDuration
    ] = await Promise.all([
      this.eventsModel.count({ agent_id: agentId }),
      this.tasksModel.count({ assigned_agent: agentId }),
      this.tasksModel.count({ assigned_agent: agentId, status: 'completed' }),
      this.getLastAgentActivity(agentId),
      this.getMostUsedTools(agentId),
      this.calculateAverageTaskDuration(agentId)
    ]);

    const completionRate = tasksAssigned > 0 ? (tasksCompleted / tasksAssigned) * 100 : 0;
    const activityScore = this.calculateAgentActivityScore(totalEvents, tasksCompleted);

    return {
      agent_id: agentId,
      total_events: totalEvents,
      tasks_assigned: tasksAssigned,
      tasks_completed: tasksCompleted,
      completion_rate: completionRate,
      average_task_duration: avgTaskDuration,
      activity_score: activityScore,
      last_activity: lastActivity,
      most_used_tools: mostUsedTools
    };
  }

  /**
   * Get project metrics
   */
  async getProjectMetrics(projectId: string): Promise<ProjectMetrics> {
    const [
      requirementsCount,
      tasksCount,
      completedTasks,
      estimatedEffort,
      actualEffort,
      blockersCount,
      dependenciesResolved
    ] = await Promise.all([
      this.getProjectRequirementsCount(projectId),
      this.getProjectTasksCount(projectId),
      this.getProjectCompletedTasksCount(projectId),
      this.getProjectEstimatedEffort(projectId),
      this.getProjectActualEffort(projectId),
      this.getProjectBlockersCount(projectId),
      this.getProjectDependenciesResolved(projectId)
    ]);

    const completionPercentage = tasksCount > 0 ? (completedTasks / tasksCount) * 100 : 0;
    const efficiencyRatio = estimatedEffort > 0 ? actualEffort / estimatedEffort : 1;

    return {
      project_id: projectId,
      requirements_count: requirementsCount,
      tasks_count: tasksCount,
      completion_percentage: completionPercentage,
      estimated_total_effort: estimatedEffort,
      actual_effort_spent: actualEffort,
      efficiency_ratio: efficiencyRatio,
      blockers_count: blockersCount,
      dependencies_resolved: dependenciesResolved
    };
  }

  /**
   * Get activity trends over time
   */
  async getActivityTrends(query: AnalyticsQuery = {}): Promise<ActivityTrends> {
    const endDate = query.end_date || new Date();
    const startDate = query.start_date || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

    const [
      eventsOverTime,
      tasksCompletionTrend,
      requirementsProgress,
      agentActivityTrend
    ] = await Promise.all([
      this.getEventsOverTime(startDate, endDate, query.agent_id),
      this.getTasksCompletionTrend(startDate, endDate),
      this.getRequirementsProgress(startDate, endDate),
      this.getAgentActivityTrend(startDate, endDate, query.agent_id)
    ]);

    return {
      events_over_time: eventsOverTime,
      tasks_completion_trend: tasksCompletionTrend,
      requirements_progress: requirementsProgress,
      agent_activity_trend: agentActivityTrend
    };
  }

  /**
   * Get performance insights and recommendations
   */
  async getPerformanceInsights(query: AnalyticsQuery = {}): Promise<PerformanceInsights> {
    const metrics = await this.getDevelopmentMetrics(query);
    const trends = await this.getActivityTrends(query);
    
    const bottlenecks = await this.identifyBottlenecks();
    const recommendations = this.generateRecommendations(metrics, trends);
    const efficiencyScore = this.calculateEfficiencyScore(metrics);
    const productivityTrends = this.analyzeProductivityTrends(trends);
    const riskFactors = await this.identifyRiskFactors();

    return {
      bottlenecks,
      recommendations,
      efficiency_score: efficiencyScore,
      productivity_trends: productivityTrends,
      risk_factors: riskFactors
    };
  }

  /**
   * Build event filters from analytics query
   */
  private buildEventFilters(query: AnalyticsQuery) {
    const filters: any = {};
    
    if (query.start_date) filters.start_date = query.start_date;
    if (query.end_date) filters.end_date = query.end_date;
    if (query.agent_id) filters.agent_id = query.agent_id;
    
    return filters;
  }

  /**
   * Calculate average task completion time
   */
  private async calculateAverageTaskCompletionTime(query: AnalyticsQuery): Promise<number> {
    const sql = `
      SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) as avg_hours
      FROM tasks 
      WHERE status = 'completed'
      ${query.start_date ? 'AND updated_at >= $1' : ''}
      ${query.end_date ? 'AND updated_at <= $2' : ''}
    `;
    
    const params = [];
    if (query.start_date) params.push(query.start_date);
    if (query.end_date) params.push(query.end_date);
    
    const result = await this.db.query(sql, params);
    return parseFloat(result.rows[0]?.avg_hours || '0');
  }

  /**
   * Calculate activity score
   */
  private calculateActivityScore(totalEvents: number, totalTasks: number): number {
    const eventScore = Math.min(totalEvents / 1000, 1) * 50; // Max 50 points for events
    const taskScore = Math.min(totalTasks / 100, 1) * 50; // Max 50 points for tasks
    return Math.round(eventScore + taskScore);
  }

  /**
   * Calculate agent activity score
   */
  private calculateAgentActivityScore(totalEvents: number, tasksCompleted: number): number {
    const eventScore = Math.min(totalEvents / 100, 1) * 60; // Max 60 points for events
    const taskScore = Math.min(tasksCompleted / 20, 1) * 40; // Max 40 points for tasks
    return Math.round(eventScore + taskScore);
  }

  /**
   * Get last agent activity
   */
  private async getLastAgentActivity(agentId: string): Promise<Date> {
    const events = await this.eventsModel.find({ agent_id: agentId, limit: 1 });
    return events.length > 0 ? events[0].timestamp : new Date(0);
  }

  /**
   * Get most used tools by agent
   */
  private async getMostUsedTools(agentId: string): Promise<string[]> {
    const sql = `
      SELECT data->>'tool_name' as tool_name, COUNT(*) as usage_count
      FROM events 
      WHERE agent_id = $1 AND event_type = 'tool_usage'
      GROUP BY data->>'tool_name'
      ORDER BY usage_count DESC
      LIMIT 5
    `;
    
    const result = await this.db.query(sql, [agentId]);
    return result.rows.map(row => row.tool_name).filter(Boolean);
  }

  /**
   * Calculate average task duration for agent
   */
  private async calculateAverageTaskDuration(agentId: string): Promise<number> {
    const sql = `
      SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600) as avg_hours
      FROM tasks 
      WHERE assigned_agent = $1 AND status = 'completed'
    `;
    
    const result = await this.db.query(sql, [agentId]);
    return parseFloat(result.rows[0]?.avg_hours || '0');
  }

  /**
   * Get events over time
   */
  private async getEventsOverTime(startDate: Date, endDate: Date, agentId?: string): Promise<TrendData[]> {
    const sql = `
      SELECT DATE(created_at) as date, COUNT(*) as value
      FROM events 
      WHERE created_at >= $1 AND created_at <= $2
      ${agentId ? 'AND agent_id = $3' : ''}
      GROUP BY DATE(created_at)
      ORDER BY date
    `;
    
    const params = [startDate, endDate];
    if (agentId) params.push(agentId);
    
    const result = await this.db.query(sql, params);
    return result.rows.map(row => ({
      date: row.date,
      value: parseInt(row.value)
    }));
  }

  /**
   * Get tasks completion trend
   */
  private async getTasksCompletionTrend(startDate: Date, endDate: Date): Promise<TrendData[]> {
    const sql = `
      SELECT DATE(updated_at) as date, COUNT(*) as value
      FROM tasks 
      WHERE status = 'completed' AND updated_at >= $1 AND updated_at <= $2
      GROUP BY DATE(updated_at)
      ORDER BY date
    `;
    
    const result = await this.db.query(sql, [startDate, endDate]);
    return result.rows.map(row => ({
      date: row.date,
      value: parseInt(row.value)
    }));
  }

  /**
   * Get requirements progress
   */
  private async getRequirementsProgress(startDate: Date, endDate: Date): Promise<TrendData[]> {
    const sql = `
      SELECT DATE(updated_at) as date, COUNT(*) as value
      FROM requirements 
      WHERE status = 'completed' AND updated_at >= $1 AND updated_at <= $2
      GROUP BY DATE(updated_at)
      ORDER BY date
    `;
    
    const result = await this.db.query(sql, [startDate, endDate]);
    return result.rows.map(row => ({
      date: row.date,
      value: parseInt(row.value)
    }));
  }

  /**
   * Get agent activity trend
   */
  private async getAgentActivityTrend(startDate: Date, endDate: Date, agentId?: string): Promise<TrendData[]> {
    const sql = `
      SELECT DATE(timestamp) as date, COUNT(DISTINCT agent_id) as value
      FROM events 
      WHERE timestamp >= $1 AND timestamp <= $2
      ${agentId ? 'AND agent_id = $3' : ''}
      GROUP BY DATE(timestamp)
      ORDER BY date
    `;
    
    const params = [startDate, endDate];
    if (agentId) params.push(agentId);
    
    const result = await this.db.query(sql, params);
    return result.rows.map(row => ({
      date: row.date,
      value: parseInt(row.value)
    }));
  }

  /**
   * Identify bottlenecks in the system
   */
  private async identifyBottlenecks(): Promise<string[]> {
    const bottlenecks: string[] = [];
    
    // Check for blocked tasks
    const blockedTasks = await this.tasksModel.count({ status: 'blocked' });
    if (blockedTasks > 5) {
      bottlenecks.push(`${blockedTasks} tasks are currently blocked`);
    }
    
    // Check for overdue tasks (simplified - would need due dates in real implementation)
    const inProgressTasks = await this.tasksModel.count({ status: 'in_progress' });
    if (inProgressTasks > 20) {
      bottlenecks.push(`${inProgressTasks} tasks are in progress - possible resource constraint`);
    }
    
    // Check for requirements without tasks
    const requirementsWithoutTasks = await this.getRequirementsWithoutTasks();
    if (requirementsWithoutTasks > 0) {
      bottlenecks.push(`${requirementsWithoutTasks} requirements have no associated tasks`);
    }
    
    return bottlenecks;
  }

  /**
   * Generate recommendations based on metrics and trends
   */
  private generateRecommendations(metrics: DevelopmentMetrics, trends: ActivityTrends): string[] {
    const recommendations: string[] = [];
    
    if (metrics.agent_activity_score < 50) {
      recommendations.push('Consider increasing agent activity or optimizing task distribution');
    }
    
    if (metrics.average_task_completion_time > 48) {
      recommendations.push('Task completion time is high - consider breaking down complex tasks');
    }
    
    if (trends.tasks_completion_trend.length > 0) {
      const recentCompletion = trends.tasks_completion_trend.slice(-7).reduce((sum, t) => sum + t.value, 0);
      if (recentCompletion < 5) {
        recommendations.push('Task completion rate is low - review current priorities and blockers');
      }
    }
    
    return recommendations;
  }

  /**
   * Calculate efficiency score
   */
  private calculateEfficiencyScore(metrics: DevelopmentMetrics): number {
    let score = 0;
    
    // Activity score contributes 40%
    score += (metrics.agent_activity_score / 100) * 40;
    
    // Task completion rate contributes 30%
    const completionRate = metrics.total_tasks > 0 ? metrics.tasks_completed_today / metrics.total_tasks : 0;
    score += completionRate * 30;
    
    // Event generation rate contributes 30%
    const eventRate = Math.min(metrics.events_per_day / 10, 1); // Normalize to max 10 events per day
    score += eventRate * 30;
    
    return Math.round(score);
  }

  /**
   * Analyze productivity trends
   */
  private analyzeProductivityTrends(trends: ActivityTrends): 'increasing' | 'decreasing' | 'stable' {
    if (trends.tasks_completion_trend.length < 7) {
      return 'stable';
    }
    
    const firstHalf = trends.tasks_completion_trend.slice(0, Math.floor(trends.tasks_completion_trend.length / 2));
    const secondHalf = trends.tasks_completion_trend.slice(Math.floor(trends.tasks_completion_trend.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, t) => sum + t.value, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, t) => sum + t.value, 0) / secondHalf.length;
    
    const change = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Identify risk factors
   */
  private async identifyRiskFactors(): Promise<string[]> {
    const risks: string[] = [];
    
    // Check for high complexity requirements without progress
    const highComplexityPending = await this.requirementsModel.count({
      status: 'pending',
      min_complexity: 70
    });
    
    if (highComplexityPending > 0) {
      risks.push(`${highComplexityPending} high-complexity requirements are pending`);
    }
    
    // Check for tasks without assigned agents
    const unassignedTasks = await this.getUnassignedTasksCount();
    if (unassignedTasks > 10) {
      risks.push(`${unassignedTasks} tasks are unassigned`);
    }
    
    return risks;
  }

  // Helper methods for project metrics
  private async getProjectRequirementsCount(projectId: string): Promise<number> {
    const sql = `SELECT COUNT(*) as count FROM requirements WHERE metadata->>'project_id' = $1`;
    const result = await this.db.query(sql, [projectId]);
    return parseInt(result.rows[0].count);
  }

  private async getProjectTasksCount(projectId: string): Promise<number> {
    const sql = `
      SELECT COUNT(t.*) as count 
      FROM tasks t 
      JOIN requirements r ON t.requirement_id = r.id 
      WHERE r.metadata->>'project_id' = $1
    `;
    const result = await this.db.query(sql, [projectId]);
    return parseInt(result.rows[0].count);
  }

  private async getProjectCompletedTasksCount(projectId: string): Promise<number> {
    const sql = `
      SELECT COUNT(t.*) as count 
      FROM tasks t 
      JOIN requirements r ON t.requirement_id = r.id 
      WHERE r.metadata->>'project_id' = $1 AND t.status = 'completed'
    `;
    const result = await this.db.query(sql, [projectId]);
    return parseInt(result.rows[0].count);
  }

  private async getProjectEstimatedEffort(projectId: string): Promise<number> {
    const sql = `
      SELECT SUM((r.metadata->>'estimated_effort')::int) as total 
      FROM requirements r 
      WHERE r.metadata->>'project_id' = $1
    `;
    const result = await this.db.query(sql, [projectId]);
    return parseInt(result.rows[0].total || '0');
  }

  private async getProjectActualEffort(projectId: string): Promise<number> {
    // This would need actual time tracking - simplified for now
    return this.getProjectEstimatedEffort(projectId);
  }

  private async getProjectBlockersCount(projectId: string): Promise<number> {
    const sql = `
      SELECT COUNT(t.*) as count 
      FROM tasks t 
      JOIN requirements r ON t.requirement_id = r.id 
      WHERE r.metadata->>'project_id' = $1 AND t.status = 'blocked'
    `;
    const result = await this.db.query(sql, [projectId]);
    return parseInt(result.rows[0].count);
  }

  private async getProjectDependenciesResolved(projectId: string): Promise<number> {
    // Simplified - would need more complex dependency tracking
    return 0;
  }

  private async getRequirementsWithoutTasks(): Promise<number> {
    const sql = `
      SELECT COUNT(*) as count 
      FROM requirements r 
      LEFT JOIN tasks t ON r.id = t.requirement_id 
      WHERE t.id IS NULL
    `;
    const result = await this.db.query(sql);
    return parseInt(result.rows[0].count);
  }

  private async getUnassignedTasksCount(): Promise<number> {
    const sql = `SELECT COUNT(*) as count FROM tasks WHERE assigned_agent IS NULL`;
    const result = await this.db.query(sql);
    return parseInt(result.rows[0].count);
  }
}

