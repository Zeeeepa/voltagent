/**
 * Progress Tracking & Reporting System
 * Main entry point for the progress tracking and reporting system
 */

import { ProgressManager, ProgressOptions, Milestone, MilestoneState, Blocker, PredictiveAnalytic, ReportTemplate, Report } from './types';
import { MilestoneManager } from './milestones';
import { MetricsCalculator } from './metrics';
import { BlockerDetector } from './blockers';
import { PredictiveAnalytics } from './analytics';
import { ReportGenerator } from './reporting';
import { VisualizationManager } from './visualization';
import { EventEmitter } from 'events';

/**
 * Implementation of the ProgressManager interface
 * Provides a comprehensive system for tracking and reporting workflow progress
 */
export class Progress implements ProgressManager {
  private milestoneManager: MilestoneManager;
  private metricsCalculator: MetricsCalculator;
  private blockerDetector: BlockerDetector;
  private predictiveAnalytics: PredictiveAnalytics;
  private reportGenerator: ReportGenerator;
  private visualizationManager: VisualizationManager;
  private eventEmitter: EventEmitter;
  private options: ProgressOptions;

  /**
   * Create a new Progress instance
   * @param options Configuration options for the progress tracking system
   */
  constructor(options: ProgressOptions = {}) {
    this.options = {
      realTimeUpdates: true,
      metricCalculationInterval: 5000,
      enablePredictiveAnalytics: true,
      enableBlockerDetection: true,
      ...options,
    };

    this.eventEmitter = new EventEmitter();
    this.milestoneManager = new MilestoneManager(this.eventEmitter);
    this.metricsCalculator = new MetricsCalculator(this.milestoneManager, this.eventEmitter);
    this.blockerDetector = new BlockerDetector(this.milestoneManager, this.eventEmitter);
    this.predictiveAnalytics = new PredictiveAnalytics(this.milestoneManager, this.metricsCalculator, this.eventEmitter);
    this.reportGenerator = new ReportGenerator(this.milestoneManager, this.metricsCalculator, this.blockerDetector, this.predictiveAnalytics);
    this.visualizationManager = new VisualizationManager(this.milestoneManager, this.metricsCalculator, this.blockerDetector, this.predictiveAnalytics);

    // Initialize real-time updates if enabled
    if (this.options.realTimeUpdates) {
      this.initializeRealTimeUpdates();
    }
  }

  /**
   * Initialize real-time updates for metrics and predictions
   */
  private initializeRealTimeUpdates(): void {
    const interval = this.options.metricCalculationInterval || 5000;
    
    setInterval(() => {
      // Update metrics for all active workflows
      this.metricsCalculator.updateAllMetrics();
      
      // Update predictions if enabled
      if (this.options.enablePredictiveAnalytics) {
        this.predictiveAnalytics.updateAllPredictions();
      }
      
      // Check for blockers if enabled
      if (this.options.enableBlockerDetection) {
        this.blockerDetector.detectBlockers();
      }
    }, interval);
  }

  /**
   * Register a new milestone
   * @param milestone The milestone to register
   * @returns The registered milestone
   */
  async registerMilestone(milestone: Milestone): Promise<Milestone> {
    return this.milestoneManager.registerMilestone(milestone);
  }

  /**
   * Update the state of a milestone
   * @param milestoneId The ID of the milestone to update
   * @param state The new state of the milestone
   * @returns The updated milestone state
   */
  async updateMilestoneState(milestoneId: string, state: Partial<MilestoneState>): Promise<MilestoneState> {
    return this.milestoneManager.updateMilestoneState(milestoneId, state);
  }

  /**
   * Get the current state of a milestone
   * @param milestoneId The ID of the milestone
   * @returns The current state of the milestone
   */
  async getMilestoneState(milestoneId: string): Promise<MilestoneState> {
    return this.milestoneManager.getMilestoneState(milestoneId);
  }

  /**
   * Get all milestones for a workflow
   * @param workflowId The ID of the workflow
   * @returns All milestones for the workflow
   */
  async getWorkflowMilestones(workflowId: string): Promise<Milestone[]> {
    return this.milestoneManager.getWorkflowMilestones(workflowId);
  }

  /**
   * Calculate a specific metric for a workflow
   * @param workflowId The ID of the workflow
   * @param metricId The ID of the metric to calculate
   * @returns The calculated metric
   */
  async calculateMetric(workflowId: string, metricId: string): Promise<any> {
    return this.metricsCalculator.calculateMetric(workflowId, metricId);
  }

  /**
   * Get all metrics for a workflow
   * @param workflowId The ID of the workflow
   * @returns All metrics for the workflow
   */
  async getWorkflowMetrics(workflowId: string): Promise<any[]> {
    return this.metricsCalculator.getWorkflowMetrics(workflowId);
  }

  /**
   * Register a new blocker
   * @param blocker The blocker to register
   * @returns The registered blocker
   */
  async registerBlocker(blocker: Blocker): Promise<Blocker> {
    return this.blockerDetector.registerBlocker(blocker);
  }

  /**
   * Resolve an existing blocker
   * @param blockerId The ID of the blocker to resolve
   * @param resolution Optional resolution details
   * @returns The resolved blocker
   */
  async resolveBlocker(blockerId: string, resolution?: string): Promise<Blocker> {
    return this.blockerDetector.resolveBlocker(blockerId, resolution);
  }

  /**
   * Get all active blockers for a workflow
   * @param workflowId The ID of the workflow
   * @returns All active blockers for the workflow
   */
  async getActiveBlockers(workflowId: string): Promise<Blocker[]> {
    return this.blockerDetector.getActiveBlockers(workflowId);
  }

  /**
   * Generate a prediction for a workflow
   * @param workflowId The ID of the workflow
   * @param type The type of prediction to generate
   * @returns The generated prediction
   */
  async generatePrediction(workflowId: string, type: string): Promise<PredictiveAnalytic> {
    return this.predictiveAnalytics.generatePrediction(workflowId, type);
  }

  /**
   * Get all predictions for a workflow
   * @param workflowId The ID of the workflow
   * @returns All predictions for the workflow
   */
  async getWorkflowPredictions(workflowId: string): Promise<PredictiveAnalytic[]> {
    return this.predictiveAnalytics.getWorkflowPredictions(workflowId);
  }

  /**
   * Register a new report template
   * @param template The template to register
   * @returns The registered template
   */
  async registerReportTemplate(template: ReportTemplate): Promise<ReportTemplate> {
    return this.reportGenerator.registerTemplate(template);
  }

  /**
   * Generate a report using a template
   * @param workflowId The ID of the workflow
   * @param templateId The ID of the template to use
   * @returns The generated report
   */
  async generateReport(workflowId: string, templateId: string): Promise<Report> {
    return this.reportGenerator.generateReport(workflowId, templateId);
  }

  /**
   * Get all reports for a workflow
   * @param workflowId The ID of the workflow
   * @returns All reports for the workflow
   */
  async getWorkflowReports(workflowId: string): Promise<Report[]> {
    return this.reportGenerator.getWorkflowReports(workflowId);
  }

  /**
   * Get visualization data for a specific type
   * @param workflowId The ID of the workflow
   * @param visualizationType The type of visualization
   * @param options Options for the visualization
   * @returns The visualization data
   */
  async getVisualizationData(workflowId: string, visualizationType: string, options?: any): Promise<any> {
    return this.visualizationManager.getVisualizationData(workflowId, visualizationType, options);
  }

  /**
   * Subscribe to progress events
   * @param eventType The type of event to subscribe to
   * @param callback The callback to call when the event occurs
   * @returns A function to unsubscribe from the event
   */
  onProgressEvent(eventType: string, callback: (data: any) => void): () => void {
    this.eventEmitter.on(eventType, callback);
    return () => this.eventEmitter.off(eventType, callback);
  }
}

// Export all types and components
export * from './types';
export * from './milestones';
export * from './metrics';
export * from './blockers';
export * from './analytics';
export * from './reporting';
export * from './visualization';

