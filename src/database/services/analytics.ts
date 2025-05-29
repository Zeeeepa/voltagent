/**
 * Analytics Service for Task Master
 * Phase 4.1: Comprehensive Database & Event Storage Implementation
 */

import { getDatabaseManager } from '../connection';
import { RequirementsModel } from '../models/requirements';
import { TasksModel } from '../models/tasks';
import { EventsModel } from '../models/events';
import { CorrelationsModel } from '../models/correlations';
import { EventStorageService, TaskMasterEventTypes, TaskMasterEventSources } from './event-storage';

export interface PerformanceMetrics {
  avg_task_completion_time: number;
  avg_requirement_analysis_time: number;
  system_uptime: number;
  event_processing_rate: number;
  database_query_performance: number;
  error_rate: number;
}

export interface ProjectMetrics {
  total_requirements: number;
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  blocked_tasks: number;
  completion_rate: number;
  velocity: number;
  avg_task_duration: number;
  requirements_coverage: number;
}

export interface UserMetrics {
  active_users: number;
  tasks_per_user: Record<string, number>;
  completion_rate_per_user: Record<string, number>;
  avg_task_time_per_user: Record<string, number>;
  most_productive_users: string[];
}

export interface SystemHealth {
  database_status: 'healthy' | 'degraded' | 'down';
  redis_status: 'healthy' | 'degraded' | 'down';
  elasticsearch_status: 'healthy' | 'degraded' | 'down';
  event_processing_status: 'healthy' | 'degraded' | 'down';
  overall_status: 'healthy' | 'degraded' | 'down';
  last_check: string;
}

export interface TrendData {
  date: string;
  value: number;
}

export interface AnalyticsReport {
  id: string;
  report_type: string;
  generated_at: string;
  time_period: {
    start: string;
    end: string;
  };
  performance_metrics: PerformanceMetrics;
  project_metrics: ProjectMetrics;
  user_metrics: UserMetrics;
  system_health: SystemHealth;
  trends: {
    task_completion: TrendData[];
    requirement_creation: TrendData[];
    system_events: TrendData[];
  };
  insights: string[];
  recommendations: string[];
}

export class AnalyticsService {
  private dbManager = getDatabaseManager();
  private requirementsModel: RequirementsModel;
  private tasksModel: TasksModel;
  private eventsModel: EventsModel;
  private correlationsModel: CorrelationsModel;
  private eventStorage: EventStorageService;

  constructor(eventStorage: EventStorageService) {
    this.requirementsModel = new RequirementsModel();
    this.tasksModel = new TasksModel();
    this.eventsModel = new EventsModel();
    this.correlationsModel = new CorrelationsModel();
    this.eventStorage = eventStorage;
  }

  /**
   * Generate comprehensive analytics report
   */
  async generateReport(
    startDate: Date,
    endDate: Date,
    reportType: string = 'comprehensive'
  ): Promise<AnalyticsReport> {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Log report generation start
      await this.eventStorage.ingestEvent({
        event_type: TaskMasterEventTypes.ANALYTICS_GENERATED,
        source: TaskMasterEventSources.ANALYTICS,
        action: 'generate_report_start',
        target_type: 'report',
        target_id: reportId,
        payload: {
          report_type: reportType,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        },
      });

      const [
        performanceMetrics,
        projectMetrics,
        userMetrics,
        systemHealth,
        trends,
      ] = await Promise.all([
        this.getPerformanceMetrics(startDate, endDate),
        this.getProjectMetrics(startDate, endDate),
        this.getUserMetrics(startDate, endDate),
        this.getSystemHealth(),
        this.getTrendData(startDate, endDate),
      ]);

      const insights = this.generateInsights(performanceMetrics, projectMetrics, userMetrics);
      const recommendations = this.generateRecommendations(performanceMetrics, projectMetrics, userMetrics);

      const report: AnalyticsReport = {
        id: reportId,
        report_type: reportType,
        generated_at: new Date().toISOString(),
        time_period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
        },
        performance_metrics: performanceMetrics,
        project_metrics: projectMetrics,
        user_metrics: userMetrics,
        system_health: systemHealth,
        trends,
        insights,
        recommendations,
      };

      // Log report generation completion
      await this.eventStorage.ingestEvent({
        event_type: TaskMasterEventTypes.ANALYTICS_GENERATED,
        source: TaskMasterEventSources.ANALYTICS,
        action: 'generate_report_complete',
        target_type: 'report',
        target_id: reportId,
        payload: {
          report_type: reportType,
          insights_count: insights.length,
          recommendations_count: recommendations.length,
        },
      });

      return report;
    } catch (error) {
      // Log report generation error
      await this.eventStorage.ingestEvent({
        event_type: TaskMasterEventTypes.SYSTEM_ERROR,
        source: TaskMasterEventSources.ANALYTICS,
        action: 'generate_report_error',
        target_type: 'report',
        target_id: reportId,
        payload: {
          error: error instanceof Error ? error.message : 'Unknown error',
          report_type: reportType,
        },
      });
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(startDate: Date, endDate: Date): Promise<PerformanceMetrics> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      // Task completion time
      const taskCompletionQuery = `
        SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) as avg_completion_hours
        FROM tasks 
        WHERE status = 'completed' 
          AND updated_at BETWEEN $1 AND $2
      `;
      
      // Event processing rate
      const eventRateQuery = `
        SELECT COUNT(*) as event_count
        FROM events 
        WHERE timestamp BETWEEN $1 AND $2
      `;
      
      // Error rate
      const errorRateQuery = `
        SELECT 
          COUNT(CASE WHEN event_type LIKE '%error%' THEN 1 END) as error_count,
          COUNT(*) as total_events
        FROM events 
        WHERE timestamp BETWEEN $1 AND $2
      `;

      const [taskResult, eventResult, errorResult] = await Promise.all([
        client.query(taskCompletionQuery, [startDate, endDate]),
        client.query(eventRateQuery, [startDate, endDate]),
        client.query(errorRateQuery, [startDate, endDate]),
      ]);

      const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      const eventCount = parseInt(eventResult.rows[0].event_count);
      const errorCount = parseInt(errorResult.rows[0].error_count);
      const totalEvents = parseInt(errorResult.rows[0].total_events);

      return {
        avg_task_completion_time: parseFloat(taskResult.rows[0].avg_completion_hours) || 0,
        avg_requirement_analysis_time: 0.5, // Placeholder - would need more detailed tracking
        system_uptime: 99.9, // Placeholder - would need system monitoring
        event_processing_rate: hours > 0 ? eventCount / hours : 0,
        database_query_performance: 50, // Placeholder - would need query performance monitoring
        error_rate: totalEvents > 0 ? (errorCount / totalEvents) * 100 : 0,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get project metrics
   */
  async getProjectMetrics(startDate: Date, endDate: Date): Promise<ProjectMetrics> {
    const [requirementStats, taskStats] = await Promise.all([
      this.requirementsModel.getStatistics(),
      this.tasksModel.getStatistics(),
    ]);

    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      // Get tasks created in time period for velocity calculation
      const velocityQuery = `
        SELECT COUNT(*) as tasks_completed
        FROM tasks 
        WHERE status = 'completed' 
          AND updated_at BETWEEN $1 AND $2
      `;
      
      const velocityResult = await client.query(velocityQuery, [startDate, endDate]);
      const tasksCompleted = parseInt(velocityResult.rows[0].tasks_completed);
      const days = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

      return {
        total_requirements: requirementStats.total,
        total_tasks: taskStats.total,
        completed_tasks: taskStats.by_status.completed || 0,
        in_progress_tasks: taskStats.by_status.in_progress || 0,
        blocked_tasks: taskStats.by_status.blocked || 0,
        completion_rate: taskStats.completion_rate,
        velocity: days > 0 ? tasksCompleted / days : 0,
        avg_task_duration: taskStats.avg_actual_hours,
        requirements_coverage: taskStats.total > 0 ? (taskStats.total / requirementStats.total) * 100 : 0,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get user metrics
   */
  async getUserMetrics(startDate: Date, endDate: Date): Promise<UserMetrics> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      // Active users (users with tasks in the period)
      const activeUsersQuery = `
        SELECT COUNT(DISTINCT assigned_to) as active_users
        FROM tasks 
        WHERE assigned_to IS NOT NULL 
          AND updated_at BETWEEN $1 AND $2
      `;
      
      // Tasks per user
      const tasksPerUserQuery = `
        SELECT assigned_to, COUNT(*) as task_count
        FROM tasks 
        WHERE assigned_to IS NOT NULL
        GROUP BY assigned_to
      `;
      
      // Completion rate per user
      const completionRateQuery = `
        SELECT 
          assigned_to,
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks
        FROM tasks 
        WHERE assigned_to IS NOT NULL
        GROUP BY assigned_to
      `;

      const [activeResult, tasksResult, completionResult] = await Promise.all([
        client.query(activeUsersQuery, [startDate, endDate]),
        client.query(tasksPerUserQuery),
        client.query(completionRateQuery),
      ]);

      const tasksPerUser = tasksResult.rows.reduce((acc, row) => {
        acc[row.assigned_to] = parseInt(row.task_count);
        return acc;
      }, {} as Record<string, number>);

      const completionRatePerUser = completionResult.rows.reduce((acc, row) => {
        const total = parseInt(row.total_tasks);
        const completed = parseInt(row.completed_tasks);
        acc[row.assigned_to] = total > 0 ? (completed / total) * 100 : 0;
        return acc;
      }, {} as Record<string, number>);

      // Most productive users (by completion rate and task count)
      const mostProductive = Object.entries(completionRatePerUser)
        .filter(([user, rate]) => tasksPerUser[user] >= 3) // At least 3 tasks
        .sort(([, rateA], [, rateB]) => rateB - rateA)
        .slice(0, 5)
        .map(([user]) => user);

      return {
        active_users: parseInt(activeResult.rows[0].active_users),
        tasks_per_user: tasksPerUser,
        completion_rate_per_user: completionRatePerUser,
        avg_task_time_per_user: {}, // Placeholder - would need more detailed time tracking
        most_productive_users: mostProductive,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<SystemHealth> {
    const health = await this.dbManager.healthCheck();
    
    const statuses = Object.values(health);
    const healthyCount = statuses.filter(status => status).length;
    const totalCount = statuses.length;
    
    let overallStatus: 'healthy' | 'degraded' | 'down';
    if (healthyCount === totalCount) {
      overallStatus = 'healthy';
    } else if (healthyCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'down';
    }

    return {
      database_status: health.postgresql ? 'healthy' : 'down',
      redis_status: health.redis ? 'healthy' : 'down',
      elasticsearch_status: health.elasticsearch ? 'healthy' : 'down',
      event_processing_status: 'healthy', // Placeholder - would need event processing monitoring
      overall_status: overallStatus,
      last_check: new Date().toISOString(),
    };
  }

  /**
   * Get trend data
   */
  async getTrendData(startDate: Date, endDate: Date): Promise<{
    task_completion: TrendData[];
    requirement_creation: TrendData[];
    system_events: TrendData[];
  }> {
    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      // Task completion trend
      const taskTrendQuery = `
        SELECT 
          DATE(updated_at) as date,
          COUNT(*) as value
        FROM tasks 
        WHERE status = 'completed' 
          AND updated_at BETWEEN $1 AND $2
        GROUP BY DATE(updated_at)
        ORDER BY date
      `;
      
      // Requirement creation trend
      const requirementTrendQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as value
        FROM requirements 
        WHERE created_at BETWEEN $1 AND $2
        GROUP BY DATE(created_at)
        ORDER BY date
      `;
      
      // System events trend
      const eventTrendQuery = `
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as value
        FROM events 
        WHERE timestamp BETWEEN $1 AND $2
        GROUP BY DATE(timestamp)
        ORDER BY date
      `;

      const [taskTrend, requirementTrend, eventTrend] = await Promise.all([
        client.query(taskTrendQuery, [startDate, endDate]),
        client.query(requirementTrendQuery, [startDate, endDate]),
        client.query(eventTrendQuery, [startDate, endDate]),
      ]);

      return {
        task_completion: taskTrend.rows.map(row => ({
          date: row.date.toISOString().split('T')[0],
          value: parseInt(row.value),
        })),
        requirement_creation: requirementTrend.rows.map(row => ({
          date: row.date.toISOString().split('T')[0],
          value: parseInt(row.value),
        })),
        system_events: eventTrend.rows.map(row => ({
          date: row.date.toISOString().split('T')[0],
          value: parseInt(row.value),
        })),
      };
    } finally {
      client.release();
    }
  }

  /**
   * Generate insights from metrics
   */
  private generateInsights(
    performance: PerformanceMetrics,
    project: ProjectMetrics,
    user: UserMetrics
  ): string[] {
    const insights: string[] = [];

    // Performance insights
    if (performance.error_rate > 5) {
      insights.push(`High error rate detected: ${performance.error_rate.toFixed(2)}%. Consider investigating system issues.`);
    }

    if (performance.event_processing_rate > 1000) {
      insights.push(`High event processing rate: ${performance.event_processing_rate.toFixed(0)} events/hour. System is handling high load well.`);
    }

    // Project insights
    if (project.completion_rate < 70) {
      insights.push(`Low task completion rate: ${project.completion_rate.toFixed(1)}%. Consider reviewing task assignment and blocking issues.`);
    }

    if (project.velocity > 5) {
      insights.push(`High project velocity: ${project.velocity.toFixed(1)} tasks/day. Team is performing well.`);
    }

    if (project.blocked_tasks > project.total_tasks * 0.2) {
      insights.push(`High number of blocked tasks: ${project.blocked_tasks}. Consider addressing blockers to improve flow.`);
    }

    // User insights
    if (user.active_users < 5) {
      insights.push(`Low user engagement: Only ${user.active_users} active users. Consider user adoption strategies.`);
    }

    if (user.most_productive_users.length > 0) {
      insights.push(`Top performers identified: ${user.most_productive_users.slice(0, 3).join(', ')}. Consider sharing their practices.`);
    }

    return insights;
  }

  /**
   * Generate recommendations from metrics
   */
  private generateRecommendations(
    performance: PerformanceMetrics,
    project: ProjectMetrics,
    user: UserMetrics
  ): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    if (performance.avg_task_completion_time > 48) {
      recommendations.push('Consider breaking down large tasks into smaller, more manageable pieces to reduce completion time.');
    }

    if (performance.error_rate > 3) {
      recommendations.push('Implement better error handling and monitoring to reduce system errors.');
    }

    // Project recommendations
    if (project.completion_rate < 80) {
      recommendations.push('Review task assignment process and provide additional support for struggling team members.');
    }

    if (project.blocked_tasks > 0) {
      recommendations.push('Establish a daily standup process to quickly identify and resolve blocking issues.');
    }

    if (project.requirements_coverage < 50) {
      recommendations.push('Increase task creation to ensure all requirements are properly covered.');
    }

    // User recommendations
    const avgTasksPerUser = Object.values(user.tasks_per_user).reduce((a, b) => a + b, 0) / Object.keys(user.tasks_per_user).length;
    if (avgTasksPerUser > 10) {
      recommendations.push('Consider redistributing workload as some users may be overloaded.');
    }

    if (user.active_users < 10) {
      recommendations.push('Implement user onboarding and training programs to increase system adoption.');
    }

    return recommendations;
  }

  /**
   * Get real-time dashboard data
   */
  async getDashboardData(): Promise<{
    active_tasks: number;
    completed_today: number;
    pending_requirements: number;
    system_events_today: number;
    error_rate_today: number;
    top_users: string[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const client = await this.dbManager.getPostgreSQLClient();
    
    try {
      const queries = await Promise.all([
        // Active tasks
        client.query("SELECT COUNT(*) as count FROM tasks WHERE status = 'in_progress'"),
        
        // Completed today
        client.query("SELECT COUNT(*) as count FROM tasks WHERE status = 'completed' AND updated_at >= $1", [today]),
        
        // Pending requirements
        client.query("SELECT COUNT(*) as count FROM requirements WHERE status = 'pending'"),
        
        // System events today
        client.query("SELECT COUNT(*) as count FROM events WHERE timestamp >= $1", [today]),
        
        // Errors today
        client.query(`
          SELECT 
            COUNT(CASE WHEN event_type LIKE '%error%' THEN 1 END) as error_count,
            COUNT(*) as total_events
          FROM events 
          WHERE timestamp >= $1
        `, [today]),
        
        // Top users by task completion
        client.query(`
          SELECT assigned_to, COUNT(*) as completed
          FROM tasks 
          WHERE status = 'completed' 
            AND assigned_to IS NOT NULL
            AND updated_at >= $1
          GROUP BY assigned_to
          ORDER BY completed DESC
          LIMIT 5
        `, [today]),
      ]);

      const errorData = queries[4].rows[0];
      const errorRate = parseInt(errorData.total_events) > 0 
        ? (parseInt(errorData.error_count) / parseInt(errorData.total_events)) * 100 
        : 0;

      return {
        active_tasks: parseInt(queries[0].rows[0].count),
        completed_today: parseInt(queries[1].rows[0].count),
        pending_requirements: parseInt(queries[2].rows[0].count),
        system_events_today: parseInt(queries[3].rows[0].count),
        error_rate_today: errorRate,
        top_users: queries[5].rows.map(row => row.assigned_to),
      };
    } finally {
      client.release();
    }
  }
}

