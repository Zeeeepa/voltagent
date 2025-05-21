/**
 * Progress Tracking & Reporting System
 * Core types for tracking and reporting workflow progress
 */

/**
 * Milestone represents a specific point in a workflow that indicates progress
 */
export interface Milestone {
  /** Unique identifier for the milestone */
  id: string;
  
  /** Human-readable name of the milestone */
  name: string;
  
  /** Optional description of what this milestone represents */
  description?: string;
  
  /** The workflow this milestone belongs to */
  workflowId: string;
  
  /** Optional parent milestone ID for hierarchical milestone structures */
  parentId?: string;
  
  /** Expected completion time in milliseconds from workflow start */
  expectedCompletionTime?: number;
  
  /** Weight of this milestone in overall progress calculation (0-100) */
  weight: number;
  
  /** Dependencies on other milestones that must be completed first */
  dependencies?: string[];
  
  /** Custom metadata for this milestone */
  metadata?: Record<string, any>;
}

/**
 * MilestoneStatus represents the current status of a milestone
 */
export enum MilestoneStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  BLOCKED = 'blocked',
  SKIPPED = 'skipped',
}

/**
 * MilestoneState represents the current state of a milestone
 */
export interface MilestoneState {
  /** The milestone this state refers to */
  milestoneId: string;
  
  /** Current status of the milestone */
  status: MilestoneStatus;
  
  /** Timestamp when the milestone was started */
  startedAt?: number;
  
  /** Timestamp when the milestone was completed */
  completedAt?: number;
  
  /** Percentage of completion (0-100) if partially complete */
  percentComplete?: number;
  
  /** If blocked, the reason for the blockage */
  blockerReason?: string;
  
  /** If blocked, the milestone or external dependency causing the block */
  blockedBy?: string;
  
  /** Custom state data for this milestone */
  stateData?: Record<string, any>;
}

/**
 * ProgressMetric represents a calculated metric about workflow progress
 */
export interface ProgressMetric {
  /** Unique identifier for this metric */
  id: string;
  
  /** Human-readable name of the metric */
  name: string;
  
  /** Description of what this metric represents */
  description?: string;
  
  /** The type of metric (percentage, time, count, etc.) */
  type: 'percentage' | 'time' | 'count' | 'custom';
  
  /** The current value of the metric */
  value: number | string;
  
  /** The unit of measurement for this metric */
  unit?: string;
  
  /** Timestamp when this metric was calculated */
  timestamp: number;
  
  /** The workflow this metric belongs to */
  workflowId: string;
  
  /** Custom metadata for this metric */
  metadata?: Record<string, any>;
}

/**
 * Blocker represents an issue preventing progress in the workflow
 */
export interface Blocker {
  /** Unique identifier for this blocker */
  id: string;
  
  /** Human-readable name of the blocker */
  name: string;
  
  /** Detailed description of the blocker */
  description: string;
  
  /** Severity level of the blocker */
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  /** The workflow affected by this blocker */
  workflowId: string;
  
  /** The milestone(s) affected by this blocker */
  affectedMilestoneIds: string[];
  
  /** Timestamp when this blocker was detected */
  detectedAt: number;
  
  /** Timestamp when this blocker was resolved (if applicable) */
  resolvedAt?: number;
  
  /** Estimated impact on overall workflow completion time (in milliseconds) */
  estimatedImpact?: number;
  
  /** Suggested actions to resolve the blocker */
  suggestedActions?: string[];
  
  /** Custom metadata for this blocker */
  metadata?: Record<string, any>;
}

/**
 * PredictiveAnalytic represents a prediction about workflow progress
 */
export interface PredictiveAnalytic {
  /** Unique identifier for this prediction */
  id: string;
  
  /** Human-readable name of the prediction */
  name: string;
  
  /** Description of what this prediction represents */
  description?: string;
  
  /** The type of prediction (completion time, resource usage, etc.) */
  type: 'completion_time' | 'resource_usage' | 'milestone_completion' | 'custom';
  
  /** The predicted value */
  predictedValue: number | string;
  
  /** The confidence level of this prediction (0-100) */
  confidence: number;
  
  /** The unit of measurement for the predicted value */
  unit?: string;
  
  /** Timestamp when this prediction was made */
  timestamp: number;
  
  /** The workflow this prediction belongs to */
  workflowId: string;
  
  /** The data points used to make this prediction */
  dataPoints?: any[];
  
  /** Custom metadata for this prediction */
  metadata?: Record<string, any>;
}

/**
 * ReportTemplate defines the structure of a progress report
 */
export interface ReportTemplate {
  /** Unique identifier for this template */
  id: string;
  
  /** Human-readable name of the template */
  name: string;
  
  /** Description of what this template is used for */
  description?: string;
  
  /** The sections included in this report template */
  sections: ReportSection[];
  
  /** Custom metadata for this template */
  metadata?: Record<string, any>;
}

/**
 * ReportSection defines a section within a report template
 */
export interface ReportSection {
  /** Unique identifier for this section */
  id: string;
  
  /** Human-readable name of the section */
  name: string;
  
  /** Description of what this section contains */
  description?: string;
  
  /** The type of content in this section */
  type: 'metrics' | 'milestones' | 'blockers' | 'predictions' | 'chart' | 'table' | 'text' | 'custom';
  
  /** Configuration for this section */
  config: Record<string, any>;
  
  /** Order of this section in the report */
  order: number;
}

/**
 * Report represents a generated progress report
 */
export interface Report {
  /** Unique identifier for this report */
  id: string;
  
  /** Human-readable name of the report */
  name: string;
  
  /** The template used to generate this report */
  templateId: string;
  
  /** The workflow this report is for */
  workflowId: string;
  
  /** Timestamp when this report was generated */
  generatedAt: number;
  
  /** The content of the report, organized by section ID */
  content: Record<string, any>;
  
  /** Format of the report (html, pdf, json, etc.) */
  format: 'html' | 'pdf' | 'json' | 'markdown' | 'custom';
  
  /** Custom metadata for this report */
  metadata?: Record<string, any>;
}

/**
 * ProgressManager is the main interface for the progress tracking system
 */
export interface ProgressManager {
  /** Register a new milestone */
  registerMilestone(milestone: Milestone): Promise<Milestone>;
  
  /** Update the state of a milestone */
  updateMilestoneState(milestoneId: string, state: Partial<MilestoneState>): Promise<MilestoneState>;
  
  /** Get the current state of a milestone */
  getMilestoneState(milestoneId: string): Promise<MilestoneState>;
  
  /** Get all milestones for a workflow */
  getWorkflowMilestones(workflowId: string): Promise<Milestone[]>;
  
  /** Calculate a specific metric for a workflow */
  calculateMetric(workflowId: string, metricId: string): Promise<ProgressMetric>;
  
  /** Get all metrics for a workflow */
  getWorkflowMetrics(workflowId: string): Promise<ProgressMetric[]>;
  
  /** Register a new blocker */
  registerBlocker(blocker: Blocker): Promise<Blocker>;
  
  /** Resolve an existing blocker */
  resolveBlocker(blockerId: string, resolution?: string): Promise<Blocker>;
  
  /** Get all active blockers for a workflow */
  getActiveBlockers(workflowId: string): Promise<Blocker[]>;
  
  /** Generate a prediction for a workflow */
  generatePrediction(workflowId: string, type: string): Promise<PredictiveAnalytic>;
  
  /** Get all predictions for a workflow */
  getWorkflowPredictions(workflowId: string): Promise<PredictiveAnalytic[]>;
  
  /** Register a new report template */
  registerReportTemplate(template: ReportTemplate): Promise<ReportTemplate>;
  
  /** Generate a report using a template */
  generateReport(workflowId: string, templateId: string): Promise<Report>;
  
  /** Get all reports for a workflow */
  getWorkflowReports(workflowId: string): Promise<Report[]>;
}

/**
 * ProgressEvent represents an event related to progress tracking
 */
export interface ProgressEvent {
  /** The type of progress event */
  type: 'milestone_registered' | 'milestone_updated' | 'blocker_detected' | 'blocker_resolved' | 'prediction_generated' | 'report_generated' | 'custom';
  
  /** The workflow this event belongs to */
  workflowId: string;
  
  /** Timestamp when this event occurred */
  timestamp: number;
  
  /** The data associated with this event */
  data: any;
}

/**
 * VisualizationData represents data prepared for visualization
 */
export interface VisualizationData {
  /** The type of visualization */
  type: 'timeline' | 'gantt' | 'burndown' | 'pie' | 'bar' | 'line' | 'custom';
  
  /** The title of the visualization */
  title: string;
  
  /** The data to be visualized */
  data: any;
  
  /** Configuration options for the visualization */
  config?: Record<string, any>;
}

/**
 * ProgressOptions represents configuration options for the progress tracking system
 */
export interface ProgressOptions {
  /** Whether to enable real-time updates */
  realTimeUpdates?: boolean;
  
  /** How often to calculate metrics (in milliseconds) */
  metricCalculationInterval?: number;
  
  /** Whether to enable predictive analytics */
  enablePredictiveAnalytics?: boolean;
  
  /** Whether to enable blocker detection */
  enableBlockerDetection?: boolean;
  
  /** Custom options */
  [key: string]: any;
}

