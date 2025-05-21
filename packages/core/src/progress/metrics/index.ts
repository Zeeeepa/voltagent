/**
 * Metrics Calculator Module
 * Calculates various metrics related to workflow progress
 */

import { EventEmitter } from 'events';
import { ProgressMetric, MilestoneStatus } from '../types';
import { MilestoneManager } from '../milestones';

/**
 * MetricsCalculator is responsible for calculating various progress metrics
 */
export class MetricsCalculator {
  private metrics: Map<string, ProgressMetric> = new Map();
  private workflowMetrics: Map<string, Set<string>> = new Map();
  private milestoneManager: MilestoneManager;
  private eventEmitter: EventEmitter;
  private metricCalculators: Map<string, (workflowId: string) => Promise<ProgressMetric>> = new Map();

  /**
   * Create a new MetricsCalculator
   * @param milestoneManager The milestone manager to use for calculations
   * @param eventEmitter Event emitter for publishing metric events
   */
  constructor(milestoneManager: MilestoneManager, eventEmitter: EventEmitter) {
    this.milestoneManager = milestoneManager;
    this.eventEmitter = eventEmitter;

    // Register built-in metric calculators
    this.registerBuiltInMetrics();
  }

  /**
   * Register built-in metric calculators
   */
  private registerBuiltInMetrics(): void {
    // Overall progress percentage
    this.registerMetricCalculator('overall_progress', async (workflowId: string) => {
      const progress = await this.milestoneManager.calculateWorkflowProgress(workflowId);
      
      return {
        id: `${workflowId}_overall_progress`,
        name: 'Overall Progress',
        description: 'Overall workflow progress as a percentage',
        type: 'percentage',
        value: progress,
        unit: '%',
        timestamp: Date.now(),
        workflowId,
      };
    });

    // Completed milestones count
    this.registerMetricCalculator('completed_milestones', async (workflowId: string) => {
      const milestones = await this.milestoneManager.getWorkflowMilestones(workflowId);
      const states = await this.milestoneManager.getWorkflowMilestoneStates(workflowId);
      
      const completedCount = states.filter(s => s.status === MilestoneStatus.COMPLETED).length;
      const totalCount = milestones.length;
      
      return {
        id: `${workflowId}_completed_milestones`,
        name: 'Completed Milestones',
        description: 'Number of completed milestones out of total',
        type: 'count',
        value: `${completedCount}/${totalCount}`,
        timestamp: Date.now(),
        workflowId,
      };
    });

    // Blocked milestones count
    this.registerMetricCalculator('blocked_milestones', async (workflowId: string) => {
      const states = await this.milestoneManager.getWorkflowMilestoneStates(workflowId);
      const blockedCount = states.filter(s => s.status === MilestoneStatus.BLOCKED).length;
      
      return {
        id: `${workflowId}_blocked_milestones`,
        name: 'Blocked Milestones',
        description: 'Number of blocked milestones',
        type: 'count',
        value: blockedCount,
        timestamp: Date.now(),
        workflowId,
      };
    });

    // Average completion time
    this.registerMetricCalculator('avg_completion_time', async (workflowId: string) => {
      const states = await this.milestoneManager.getWorkflowMilestoneStates(workflowId);
      const completedStates = states.filter(
        s => s.status === MilestoneStatus.COMPLETED && s.startedAt && s.completedAt
      );
      
      if (completedStates.length === 0) {
        return {
          id: `${workflowId}_avg_completion_time`,
          name: 'Average Completion Time',
          description: 'Average time to complete milestones',
          type: 'time',
          value: 'N/A',
          unit: 'ms',
          timestamp: Date.now(),
          workflowId,
        };
      }
      
      const totalTime = completedStates.reduce(
        (sum, s) => sum + ((s.completedAt || 0) - (s.startedAt || 0)),
        0
      );
      
      const avgTime = totalTime / completedStates.length;
      
      return {
        id: `${workflowId}_avg_completion_time`,
        name: 'Average Completion Time',
        description: 'Average time to complete milestones',
        type: 'time',
        value: avgTime,
        unit: 'ms',
        timestamp: Date.now(),
        workflowId,
      };
    });

    // Critical path progress
    this.registerMetricCalculator('critical_path_progress', async (workflowId: string) => {
      const criticalPath = await this.milestoneManager.getWorkflowCriticalPath(workflowId);
      
      if (criticalPath.length === 0) {
        return {
          id: `${workflowId}_critical_path_progress`,
          name: 'Critical Path Progress',
          description: 'Progress along the critical path',
          type: 'percentage',
          value: 0,
          unit: '%',
          timestamp: Date.now(),
          workflowId,
        };
      }
      
      let completedWeight = 0;
      let totalWeight = 0;
      
      for (const milestoneId of criticalPath) {
        const milestone = await this.milestoneManager.getMilestone(milestoneId);
        const state = await this.milestoneManager.getMilestoneState(milestoneId);
        
        totalWeight += milestone.weight;
        
        if (state.status === MilestoneStatus.COMPLETED) {
          completedWeight += milestone.weight;
        } else if (state.status === MilestoneStatus.IN_PROGRESS && state.percentComplete !== undefined) {
          completedWeight += (milestone.weight * state.percentComplete / 100);
        }
      }
      
      const progress = totalWeight > 0 ? (completedWeight / totalWeight) * 100 : 0;
      
      return {
        id: `${workflowId}_critical_path_progress`,
        name: 'Critical Path Progress',
        description: 'Progress along the critical path',
        type: 'percentage',
        value: progress,
        unit: '%',
        timestamp: Date.now(),
        workflowId,
      };
    });
  }

  /**
   * Register a custom metric calculator
   * @param metricId The ID of the metric
   * @param calculator The function to calculate the metric
   */
  registerMetricCalculator(
    metricId: string,
    calculator: (workflowId: string) => Promise<ProgressMetric>
  ): void {
    this.metricCalculators.set(metricId, calculator);
  }

  /**
   * Calculate a specific metric for a workflow
   * @param workflowId The ID of the workflow
   * @param metricId The ID of the metric to calculate
   * @returns The calculated metric
   */
  async calculateMetric(workflowId: string, metricId: string): Promise<ProgressMetric> {
    const calculator = this.metricCalculators.get(metricId);
    
    if (!calculator) {
      throw new Error(`Metric calculator for ${metricId} not found`);
    }
    
    const metric = await calculator(workflowId);
    
    // Store the metric
    this.metrics.set(metric.id, metric);
    
    // Add to workflow metrics
    if (!this.workflowMetrics.has(workflowId)) {
      this.workflowMetrics.set(workflowId, new Set());
    }
    this.workflowMetrics.get(workflowId)?.add(metric.id);
    
    // Emit metric calculated event
    this.eventEmitter.emit('metric_calculated', {
      type: 'metric_calculated',
      workflowId,
      timestamp: Date.now(),
      data: metric,
    });
    
    return metric;
  }

  /**
   * Get all metrics for a workflow
   * @param workflowId The ID of the workflow
   * @returns All metrics for the workflow
   */
  async getWorkflowMetrics(workflowId: string): Promise<ProgressMetric[]> {
    // Calculate all metrics for the workflow
    await this.updateWorkflowMetrics(workflowId);
    
    const metricIds = this.workflowMetrics.get(workflowId) || new Set();
    const metrics: ProgressMetric[] = [];
    
    for (const id of metricIds) {
      const metric = this.metrics.get(id);
      if (metric) {
        metrics.push(metric);
      }
    }
    
    return metrics;
  }

  /**
   * Update all metrics for a workflow
   * @param workflowId The ID of the workflow
   */
  async updateWorkflowMetrics(workflowId: string): Promise<void> {
    for (const [metricId, calculator] of this.metricCalculators.entries()) {
      await this.calculateMetric(workflowId, metricId);
    }
  }

  /**
   * Update all metrics for all workflows
   */
  async updateAllMetrics(): Promise<void> {
    const workflowIds = new Set<string>();
    
    // Collect all workflow IDs
    for (const [workflowId] of this.workflowMetrics) {
      workflowIds.add(workflowId);
    }
    
    // Update metrics for each workflow
    for (const workflowId of workflowIds) {
      await this.updateWorkflowMetrics(workflowId);
    }
  }

  /**
   * Get a specific metric
   * @param metricId The ID of the metric
   * @returns The metric
   */
  getMetric(metricId: string): ProgressMetric | undefined {
    return this.metrics.get(metricId);
  }
}

