/**
 * Report Generation Module
 * Generates customizable reports for workflow progress
 */

import { ReportTemplate, Report, ReportSection } from '../types';
import { MilestoneManager } from '../milestones';
import { MetricsCalculator } from '../metrics';
import { BlockerDetector } from '../blockers';
import { PredictiveAnalytics } from '../analytics';

/**
 * ReportGenerator is responsible for generating customizable reports
 */
export class ReportGenerator {
  private templates: Map<string, ReportTemplate> = new Map();
  private reports: Map<string, Report> = new Map();
  private workflowReports: Map<string, Set<string>> = new Map();
  private milestoneManager: MilestoneManager;
  private metricsCalculator: MetricsCalculator;
  private blockerDetector: BlockerDetector;
  private predictiveAnalytics: PredictiveAnalytics;

  /**
   * Create a new ReportGenerator
   * @param milestoneManager The milestone manager to use for reports
   * @param metricsCalculator The metrics calculator to use for reports
   * @param blockerDetector The blocker detector to use for reports
   * @param predictiveAnalytics The predictive analytics to use for reports
   */
  constructor(
    milestoneManager: MilestoneManager,
    metricsCalculator: MetricsCalculator,
    blockerDetector: BlockerDetector,
    predictiveAnalytics: PredictiveAnalytics
  ) {
    this.milestoneManager = milestoneManager;
    this.metricsCalculator = metricsCalculator;
    this.blockerDetector = blockerDetector;
    this.predictiveAnalytics = predictiveAnalytics;

    // Register built-in templates
    this.registerBuiltInTemplates();
  }

  /**
   * Register built-in report templates
   */
  private registerBuiltInTemplates(): void {
    // Executive summary template
    const executiveSummaryTemplate: ReportTemplate = {
      id: 'executive_summary',
      name: 'Executive Summary',
      description: 'High-level summary of workflow progress for executives',
      sections: [
        {
          id: 'overview',
          name: 'Overview',
          description: 'High-level overview of workflow progress',
          type: 'metrics',
          config: {
            metrics: ['overall_progress', 'completed_milestones'],
            layout: 'card',
          },
          order: 1,
        },
        {
          id: 'blockers',
          name: 'Blockers',
          description: 'Summary of active blockers',
          type: 'blockers',
          config: {
            showOnlyActive: true,
            layout: 'list',
          },
          order: 2,
        },
        {
          id: 'predictions',
          name: 'Predictions',
          description: 'Key predictions for workflow completion',
          type: 'predictions',
          config: {
            predictionTypes: ['completion_time', 'risk_assessment'],
            layout: 'card',
          },
          order: 3,
        },
        {
          id: 'progress_chart',
          name: 'Progress Chart',
          description: 'Visual representation of workflow progress',
          type: 'chart',
          config: {
            chartType: 'line',
            dataSource: 'overall_progress_history',
            title: 'Progress Over Time',
          },
          order: 4,
        },
      ],
    };

    // Detailed progress template
    const detailedProgressTemplate: ReportTemplate = {
      id: 'detailed_progress',
      name: 'Detailed Progress Report',
      description: 'Detailed report of workflow progress for project managers',
      sections: [
        {
          id: 'metrics_summary',
          name: 'Metrics Summary',
          description: 'Summary of all progress metrics',
          type: 'metrics',
          config: {
            metrics: ['overall_progress', 'completed_milestones', 'blocked_milestones', 'avg_completion_time', 'critical_path_progress'],
            layout: 'table',
          },
          order: 1,
        },
        {
          id: 'milestone_status',
          name: 'Milestone Status',
          description: 'Status of all milestones',
          type: 'milestones',
          config: {
            groupBy: 'status',
            showDetails: true,
            layout: 'table',
          },
          order: 2,
        },
        {
          id: 'blockers_detail',
          name: 'Blockers Detail',
          description: 'Detailed information about all blockers',
          type: 'blockers',
          config: {
            showAll: true,
            showDetails: true,
            layout: 'table',
          },
          order: 3,
        },
        {
          id: 'predictions_detail',
          name: 'Predictions Detail',
          description: 'Detailed predictions for workflow completion',
          type: 'predictions',
          config: {
            predictionTypes: ['completion_time', 'milestone_completion', 'risk_assessment'],
            showDetails: true,
            layout: 'table',
          },
          order: 4,
        },
        {
          id: 'gantt_chart',
          name: 'Gantt Chart',
          description: 'Gantt chart of milestone schedule',
          type: 'chart',
          config: {
            chartType: 'gantt',
            dataSource: 'milestone_schedule',
            title: 'Milestone Schedule',
          },
          order: 5,
        },
      ],
    };

    // Technical status template
    const technicalStatusTemplate: ReportTemplate = {
      id: 'technical_status',
      name: 'Technical Status Report',
      description: 'Technical status report for developers',
      sections: [
        {
          id: 'critical_path',
          name: 'Critical Path',
          description: 'Status of milestones on the critical path',
          type: 'milestones',
          config: {
            filter: 'critical_path',
            showDetails: true,
            layout: 'table',
          },
          order: 1,
        },
        {
          id: 'dependency_graph',
          name: 'Dependency Graph',
          description: 'Graph of milestone dependencies',
          type: 'chart',
          config: {
            chartType: 'network',
            dataSource: 'milestone_dependencies',
            title: 'Milestone Dependencies',
          },
          order: 2,
        },
        {
          id: 'technical_blockers',
          name: 'Technical Blockers',
          description: 'Technical blockers and their impact',
          type: 'blockers',
          config: {
            showOnlyActive: true,
            showDetails: true,
            layout: 'table',
          },
          order: 3,
        },
        {
          id: 'performance_metrics',
          name: 'Performance Metrics',
          description: 'Performance metrics for the workflow',
          type: 'metrics',
          config: {
            metrics: ['avg_completion_time', 'critical_path_progress'],
            layout: 'table',
          },
          order: 4,
        },
      ],
    };

    // Register the templates
    this.templates.set(executiveSummaryTemplate.id, executiveSummaryTemplate);
    this.templates.set(detailedProgressTemplate.id, detailedProgressTemplate);
    this.templates.set(technicalStatusTemplate.id, technicalStatusTemplate);
  }

  /**
   * Register a new report template
   * @param template The template to register
   * @returns The registered template
   */
  async registerTemplate(template: ReportTemplate): Promise<ReportTemplate> {
    // Validate template
    this.validateTemplate(template);

    // Store the template
    this.templates.set(template.id, template);

    return template;
  }

  /**
   * Generate a report using a template
   * @param workflowId The ID of the workflow
   * @param templateId The ID of the template to use
   * @returns The generated report
   */
  async generateReport(workflowId: string, templateId: string): Promise<Report> {
    // Check if template exists
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template with ID ${templateId} not found`);
    }

    // Generate report content
    const content: Record<string, any> = {};
    
    // Sort sections by order
    const sortedSections = [...template.sections].sort((a, b) => a.order - b.order);
    
    // Generate content for each section
    for (const section of sortedSections) {
      content[section.id] = await this.generateSectionContent(workflowId, section);
    }

    // Create the report
    const report: Report = {
      id: `${workflowId}_${templateId}_${Date.now()}`,
      name: `${template.name} for Workflow ${workflowId}`,
      templateId,
      workflowId,
      generatedAt: Date.now(),
      content,
      format: 'json',
    };

    // Store the report
    this.reports.set(report.id, report);

    // Add to workflow reports
    if (!this.workflowReports.has(workflowId)) {
      this.workflowReports.set(workflowId, new Set());
    }
    this.workflowReports.get(workflowId)?.add(report.id);

    return report;
  }

  /**
   * Generate content for a report section
   * @param workflowId The ID of the workflow
   * @param section The section to generate content for
   * @returns The generated content
   */
  private async generateSectionContent(workflowId: string, section: ReportSection): Promise<any> {
    switch (section.type) {
      case 'metrics':
        return this.generateMetricsContent(workflowId, section);
      
      case 'milestones':
        return this.generateMilestonesContent(workflowId, section);
      
      case 'blockers':
        return this.generateBlockersContent(workflowId, section);
      
      case 'predictions':
        return this.generatePredictionsContent(workflowId, section);
      
      case 'chart':
        return this.generateChartContent(workflowId, section);
      
      case 'table':
        return this.generateTableContent(workflowId, section);
      
      case 'text':
        return section.config.text || '';
      
      case 'custom':
        return section.config.content || {};
      
      default:
        return {};
    }
  }

  /**
   * Generate metrics content for a report section
   * @param workflowId The ID of the workflow
   * @param section The section to generate content for
   * @returns The generated content
   */
  private async generateMetricsContent(workflowId: string, section: ReportSection): Promise<any> {
    const metricIds = section.config.metrics || [];
    const metrics = [];
    
    for (const metricId of metricIds) {
      try {
        const metric = await this.metricsCalculator.calculateMetric(workflowId, metricId);
        metrics.push(metric);
      } catch (error) {
        console.error(`Error calculating metric ${metricId}:`, error);
      }
    }
    
    return {
      metrics,
      layout: section.config.layout || 'list',
    };
  }

  /**
   * Generate milestones content for a report section
   * @param workflowId The ID of the workflow
   * @param section The section to generate content for
   * @returns The generated content
   */
  private async generateMilestonesContent(workflowId: string, section: ReportSection): Promise<any> {
    const milestones = await this.milestoneManager.getWorkflowMilestones(workflowId);
    const states = await this.milestoneManager.getWorkflowMilestoneStates(workflowId);
    
    // Create a map of milestone states for quick lookup
    const stateMap = new Map();
    for (const state of states) {
      stateMap.set(state.milestoneId, state);
    }
    
    // Combine milestone and state information
    const milestoneData = milestones.map(milestone => {
      const state = stateMap.get(milestone.id);
      return {
        ...milestone,
        state,
      };
    });
    
    // Apply filters if specified
    let filteredData = [...milestoneData];
    
    if (section.config.filter === 'critical_path') {
      const criticalPath = await this.milestoneManager.getWorkflowCriticalPath(workflowId);
      filteredData = filteredData.filter(data => criticalPath.includes(data.id));
    }
    
    // Group by status if specified
    let groupedData = filteredData;
    
    if (section.config.groupBy === 'status') {
      const groups: Record<string, any[]> = {};
      
      for (const data of filteredData) {
        const status = data.state?.status || 'unknown';
        
        if (!groups[status]) {
          groups[status] = [];
        }
        
        groups[status].push(data);
      }
      
      groupedData = groups;
    }
    
    return {
      milestones: groupedData,
      layout: section.config.layout || 'list',
      showDetails: section.config.showDetails || false,
    };
  }

  /**
   * Generate blockers content for a report section
   * @param workflowId The ID of the workflow
   * @param section The section to generate content for
   * @returns The generated content
   */
  private async generateBlockersContent(workflowId: string, section: ReportSection): Promise<any> {
    let blockers;
    
    if (section.config.showOnlyActive) {
      blockers = await this.blockerDetector.getActiveBlockers(workflowId);
    } else {
      blockers = await this.blockerDetector.getAllWorkflowBlockers(workflowId);
    }
    
    return {
      blockers,
      layout: section.config.layout || 'list',
      showDetails: section.config.showDetails || false,
    };
  }

  /**
   * Generate predictions content for a report section
   * @param workflowId The ID of the workflow
   * @param section The section to generate content for
   * @returns The generated content
   */
  private async generatePredictionsContent(workflowId: string, section: ReportSection): Promise<any> {
    const predictionTypes = section.config.predictionTypes || [];
    const predictions = [];
    
    for (const type of predictionTypes) {
      try {
        const prediction = await this.predictiveAnalytics.generatePrediction(workflowId, type);
        predictions.push(prediction);
      } catch (error) {
        console.error(`Error generating prediction ${type}:`, error);
      }
    }
    
    return {
      predictions,
      layout: section.config.layout || 'list',
      showDetails: section.config.showDetails || false,
    };
  }

  /**
   * Generate chart content for a report section
   * @param workflowId The ID of the workflow
   * @param section The section to generate content for
   * @returns The generated content
   */
  private async generateChartContent(workflowId: string, section: ReportSection): Promise<any> {
    const chartType = section.config.chartType || 'line';
    const dataSource = section.config.dataSource || '';
    let chartData: any = null;
    
    // Generate chart data based on data source
    switch (dataSource) {
      case 'overall_progress_history':
        // This would typically come from a time-series database
        // For now, we'll generate some sample data
        chartData = {
          labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'],
          datasets: [
            {
              label: 'Progress',
              data: [10, 25, 40, 60, 75],
            },
          ],
        };
        break;
      
      case 'milestone_schedule':
        // Generate Gantt chart data from milestones
        const milestones = await this.milestoneManager.getWorkflowMilestones(workflowId);
        const states = await this.milestoneManager.getWorkflowMilestoneStates(workflowId);
        
        // Create a map of milestone states for quick lookup
        const stateMap = new Map();
        for (const state of states) {
          stateMap.set(state.milestoneId, state);
        }
        
        chartData = {
          tasks: milestones.map(milestone => {
            const state = stateMap.get(milestone.id);
            const startDate = state?.startedAt ? new Date(state.startedAt) : new Date();
            let endDate;
            
            if (state?.completedAt) {
              endDate = new Date(state.completedAt);
            } else if (state?.startedAt && milestone.expectedCompletionTime) {
              endDate = new Date(state.startedAt + milestone.expectedCompletionTime);
            } else {
              endDate = new Date(startDate.getTime() + (milestone.expectedCompletionTime || 86400000));
            }
            
            return {
              id: milestone.id,
              name: milestone.name,
              start: startDate,
              end: endDate,
              progress: state?.percentComplete || 0,
              dependencies: milestone.dependencies || [],
            };
          }),
        };
        break;
      
      case 'milestone_dependencies':
        // Generate network graph data from milestone dependencies
        const depMilestones = await this.milestoneManager.getWorkflowMilestones(workflowId);
        
        chartData = {
          nodes: depMilestones.map(milestone => ({
            id: milestone.id,
            label: milestone.name,
          })),
          edges: depMilestones.flatMap(milestone => 
            (milestone.dependencies || []).map(depId => ({
              from: depId,
              to: milestone.id,
            }))
          ),
        };
        break;
      
      default:
        chartData = {};
    }
    
    return {
      chartType,
      title: section.config.title || '',
      data: chartData,
    };
  }

  /**
   * Generate table content for a report section
   * @param workflowId The ID of the workflow
   * @param section The section to generate content for
   * @returns The generated content
   */
  private async generateTableContent(workflowId: string, section: ReportSection): Promise<any> {
    const dataSource = section.config.dataSource || '';
    let tableData: any = null;
    
    // Generate table data based on data source
    switch (dataSource) {
      case 'milestones':
        const milestones = await this.milestoneManager.getWorkflowMilestones(workflowId);
        const states = await this.milestoneManager.getWorkflowMilestoneStates(workflowId);
        
        // Create a map of milestone states for quick lookup
        const stateMap = new Map();
        for (const state of states) {
          stateMap.set(state.milestoneId, state);
        }
        
        tableData = {
          columns: ['ID', 'Name', 'Status', 'Progress', 'Started', 'Completed'],
          rows: milestones.map(milestone => {
            const state = stateMap.get(milestone.id);
            return [
              milestone.id,
              milestone.name,
              state?.status || 'unknown',
              `${state?.percentComplete || 0}%`,
              state?.startedAt ? new Date(state.startedAt).toLocaleString() : 'N/A',
              state?.completedAt ? new Date(state.completedAt).toLocaleString() : 'N/A',
            ];
          }),
        };
        break;
      
      case 'blockers':
        const blockers = await this.blockerDetector.getAllWorkflowBlockers(workflowId);
        
        tableData = {
          columns: ['ID', 'Name', 'Description', 'Severity', 'Detected', 'Resolved'],
          rows: blockers.map(blocker => [
            blocker.id,
            blocker.name,
            blocker.description,
            blocker.severity,
            new Date(blocker.detectedAt).toLocaleString(),
            blocker.resolvedAt ? new Date(blocker.resolvedAt).toLocaleString() : 'N/A',
          ]),
        };
        break;
      
      default:
        tableData = {
          columns: [],
          rows: [],
        };
    }
    
    return {
      title: section.config.title || '',
      data: tableData,
    };
  }

  /**
   * Get all reports for a workflow
   * @param workflowId The ID of the workflow
   * @returns All reports for the workflow
   */
  async getWorkflowReports(workflowId: string): Promise<Report[]> {
    const reportIds = this.workflowReports.get(workflowId) || new Set();
    const reports: Report[] = [];
    
    for (const id of reportIds) {
      const report = this.reports.get(id);
      if (report) {
        reports.push(report);
      }
    }
    
    return reports;
  }

  /**
   * Get a report by ID
   * @param reportId The ID of the report
   * @returns The report
   */
  getReport(reportId: string): Report | undefined {
    return this.reports.get(reportId);
  }

  /**
   * Get all available templates
   * @returns All available templates
   */
  getTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get a template by ID
   * @param templateId The ID of the template
   * @returns The template
   */
  getTemplate(templateId: string): ReportTemplate | undefined {
    return this.templates.get(templateId);
  }

  /**
   * Validate a template
   * @param template The template to validate
   * @throws Error if the template is invalid
   */
  private validateTemplate(template: ReportTemplate): void {
    if (!template.id) {
      throw new Error('Template ID is required');
    }
    
    if (!template.name) {
      throw new Error('Template name is required');
    }
    
    if (!template.sections || template.sections.length === 0) {
      throw new Error('Template must have at least one section');
    }
    
    // Check if template already exists
    if (this.templates.has(template.id)) {
      throw new Error(`Template with ID ${template.id} already exists`);
    }
    
    // Validate sections
    for (const section of template.sections) {
      if (!section.id) {
        throw new Error('Section ID is required');
      }
      
      if (!section.name) {
        throw new Error('Section name is required');
      }
      
      if (!section.type) {
        throw new Error('Section type is required');
      }
      
      if (section.order === undefined || section.order === null) {
        throw new Error('Section order is required');
      }
    }
  }
}

