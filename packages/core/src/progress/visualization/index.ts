/**
 * Visualization Module
 * Provides data for visualizing workflow progress
 */

import { VisualizationData, MilestoneStatus } from '../types';
import { MilestoneManager } from '../milestones';
import { MetricsCalculator } from '../metrics';
import { BlockerDetector } from '../blockers';
import { PredictiveAnalytics } from '../analytics';

/**
 * VisualizationManager is responsible for generating visualization data
 */
export class VisualizationManager {
  private milestoneManager: MilestoneManager;
  private metricsCalculator: MetricsCalculator;
  private blockerDetector: BlockerDetector;
  private predictiveAnalytics: PredictiveAnalytics;
  private visualizationGenerators: Map<string, (workflowId: string, options?: any) => Promise<VisualizationData>> = new Map();

  /**
   * Create a new VisualizationManager
   * @param milestoneManager The milestone manager to use for visualizations
   * @param metricsCalculator The metrics calculator to use for visualizations
   * @param blockerDetector The blocker detector to use for visualizations
   * @param predictiveAnalytics The predictive analytics to use for visualizations
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

    // Register built-in visualization generators
    this.registerBuiltInVisualizations();
  }

  /**
   * Register built-in visualization generators
   */
  private registerBuiltInVisualizations(): void {
    // Timeline visualization
    this.registerVisualizationGenerator('timeline', async (workflowId: string, options?: any) => {
      const milestones = await this.milestoneManager.getWorkflowMilestones(workflowId);
      const states = await this.milestoneManager.getWorkflowMilestoneStates(workflowId);
      
      // Create a map of milestone states for quick lookup
      const stateMap = new Map();
      for (const state of states) {
        stateMap.set(state.milestoneId, state);
      }
      
      // Generate timeline data
      const timelineData = milestones.map(milestone => {
        const state = stateMap.get(milestone.id);
        
        return {
          id: milestone.id,
          name: milestone.name,
          status: state?.status || MilestoneStatus.NOT_STARTED,
          startTime: state?.startedAt || null,
          endTime: state?.completedAt || null,
          expectedDuration: milestone.expectedCompletionTime || null,
          dependencies: milestone.dependencies || [],
        };
      });
      
      return {
        type: 'timeline',
        title: options?.title || 'Workflow Timeline',
        data: timelineData,
        config: {
          showDependencies: options?.showDependencies !== false,
          colorByStatus: options?.colorByStatus !== false,
          ...options?.config,
        },
      };
    });

    // Gantt chart visualization
    this.registerVisualizationGenerator('gantt', async (workflowId: string, options?: any) => {
      const milestones = await this.milestoneManager.getWorkflowMilestones(workflowId);
      const states = await this.milestoneManager.getWorkflowMilestoneStates(workflowId);
      
      // Create a map of milestone states for quick lookup
      const stateMap = new Map();
      for (const state of states) {
        stateMap.set(state.milestoneId, state);
      }
      
      // Generate Gantt chart data
      const ganttData = {
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
            status: state?.status || MilestoneStatus.NOT_STARTED,
          };
        }),
      };
      
      return {
        type: 'gantt',
        title: options?.title || 'Workflow Gantt Chart',
        data: ganttData,
        config: {
          showCriticalPath: options?.showCriticalPath !== false,
          showProgress: options?.showProgress !== false,
          ...options?.config,
        },
      };
    });

    // Burndown chart visualization
    this.registerVisualizationGenerator('burndown', async (workflowId: string, options?: any) => {
      // This would typically use historical data from a time-series database
      // For now, we'll generate some sample data
      
      // Get the total weight of all milestones
      const milestones = await this.milestoneManager.getWorkflowMilestones(workflowId);
      const totalWeight = milestones.reduce((sum, milestone) => sum + milestone.weight, 0);
      
      // Generate sample burndown data
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 14); // 2 weeks ago
      
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 14); // 2 weeks from now
      
      const dataPoints = [];
      let remainingWork = totalWeight;
      let idealRemainingWork = totalWeight;
      const totalDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
      const idealBurnRate = totalWeight / totalDays;
      
      // Generate data points for each day
      for (let day = 0; day <= totalDays; day++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + day);
        
        // For past days, simulate actual progress
        if (date <= today) {
          // Simulate some variance in actual progress
          const actualBurn = idealBurnRate * (0.8 + Math.random() * 0.4); // 80% to 120% of ideal
          remainingWork = Math.max(0, remainingWork - actualBurn);
        }
        
        // Calculate ideal remaining work
        idealRemainingWork = Math.max(0, totalWeight - (day * idealBurnRate));
        
        dataPoints.push({
          date,
          actual: remainingWork,
          ideal: idealRemainingWork,
        });
      }
      
      return {
        type: 'burndown',
        title: options?.title || 'Workflow Burndown Chart',
        data: {
          startDate,
          endDate,
          totalWork: totalWeight,
          dataPoints,
        },
        config: {
          showIdealLine: options?.showIdealLine !== false,
          showProjection: options?.showProjection !== false,
          ...options?.config,
        },
      };
    });

    // Pie chart visualization for milestone status
    this.registerVisualizationGenerator('pie', async (workflowId: string, options?: any) => {
      const states = await this.milestoneManager.getWorkflowMilestoneStates(workflowId);
      
      // Count milestones by status
      const statusCounts: Record<string, number> = {};
      
      for (const state of states) {
        const status = state.status || MilestoneStatus.NOT_STARTED;
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      }
      
      // Convert to pie chart data
      const pieData = Object.entries(statusCounts).map(([status, count]) => ({
        label: status,
        value: count,
      }));
      
      return {
        type: 'pie',
        title: options?.title || 'Milestone Status Distribution',
        data: pieData,
        config: {
          colorMap: {
            [MilestoneStatus.COMPLETED]: '#4CAF50',
            [MilestoneStatus.IN_PROGRESS]: '#2196F3',
            [MilestoneStatus.NOT_STARTED]: '#9E9E9E',
            [MilestoneStatus.BLOCKED]: '#F44336',
            [MilestoneStatus.SKIPPED]: '#FF9800',
          },
          ...options?.config,
        },
      };
    });

    // Bar chart visualization for milestone progress
    this.registerVisualizationGenerator('bar', async (workflowId: string, options?: any) => {
      const milestones = await this.milestoneManager.getWorkflowMilestones(workflowId);
      const states = await this.milestoneManager.getWorkflowMilestoneStates(workflowId);
      
      // Create a map of milestone states for quick lookup
      const stateMap = new Map();
      for (const state of states) {
        stateMap.set(state.milestoneId, state);
      }
      
      // Generate bar chart data
      const barData = {
        labels: milestones.map(m => m.name),
        datasets: [
          {
            label: 'Progress',
            data: milestones.map(milestone => {
              const state = stateMap.get(milestone.id);
              
              if (state?.status === MilestoneStatus.COMPLETED) {
                return 100;
              } else if (state?.status === MilestoneStatus.IN_PROGRESS) {
                return state.percentComplete || 0;
              } else {
                return 0;
              }
            }),
          },
        ],
      };
      
      return {
        type: 'bar',
        title: options?.title || 'Milestone Progress',
        data: barData,
        config: {
          colorByStatus: options?.colorByStatus !== false,
          ...options?.config,
        },
      };
    });

    // Network graph visualization for milestone dependencies
    this.registerVisualizationGenerator('network', async (workflowId: string, options?: any) => {
      const milestones = await this.milestoneManager.getWorkflowMilestones(workflowId);
      const states = await this.milestoneManager.getWorkflowMilestoneStates(workflowId);
      
      // Create a map of milestone states for quick lookup
      const stateMap = new Map();
      for (const state of states) {
        stateMap.set(state.milestoneId, state);
      }
      
      // Generate network graph data
      const networkData = {
        nodes: milestones.map(milestone => {
          const state = stateMap.get(milestone.id);
          
          return {
            id: milestone.id,
            label: milestone.name,
            status: state?.status || MilestoneStatus.NOT_STARTED,
            progress: state?.percentComplete || 0,
          };
        }),
        edges: milestones.flatMap(milestone => 
          (milestone.dependencies || []).map(depId => ({
            from: depId,
            to: milestone.id,
          }))
        ),
      };
      
      // Highlight critical path if requested
      if (options?.highlightCriticalPath) {
        const criticalPath = await this.milestoneManager.getWorkflowCriticalPath(workflowId);
        
        // Create a set of critical path edges
        const criticalEdges = new Set();
        for (let i = 0; i < criticalPath.length - 1; i++) {
          criticalEdges.add(`${criticalPath[i]}-${criticalPath[i + 1]}`);
        }
        
        // Mark critical path edges
        for (const edge of networkData.edges) {
          if (criticalEdges.has(`${edge.from}-${edge.to}`)) {
            edge.critical = true;
          }
        }
      }
      
      return {
        type: 'network',
        title: options?.title || 'Milestone Dependencies',
        data: networkData,
        config: {
          highlightCriticalPath: options?.highlightCriticalPath !== false,
          colorByStatus: options?.colorByStatus !== false,
          ...options?.config,
        },
      };
    });

    // Line chart visualization for progress over time
    this.registerVisualizationGenerator('line', async (workflowId: string, options?: any) => {
      // This would typically use historical data from a time-series database
      // For now, we'll generate some sample data
      
      // Generate sample progress data
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 14); // 2 weeks ago
      
      const dataPoints = [];
      let progress = 0;
      
      // Generate data points for each day
      for (let day = 0; day <= 14; day++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + day);
        
        // Simulate progress (simple S-curve)
        if (day <= 14) {
          // S-curve: slow start, faster middle, slow end
          const x = day / 14;
          progress = 100 / (1 + Math.exp(-10 * (x - 0.5)));
          
          // Add some random variation
          progress += (Math.random() * 5) - 2.5;
          progress = Math.max(0, Math.min(100, progress));
        }
        
        dataPoints.push({
          date,
          progress,
        });
      }
      
      // Format for line chart
      const lineData = {
        labels: dataPoints.map(dp => dp.date.toLocaleDateString()),
        datasets: [
          {
            label: 'Progress',
            data: dataPoints.map(dp => dp.progress),
          },
        ],
      };
      
      return {
        type: 'line',
        title: options?.title || 'Progress Over Time',
        data: lineData,
        config: {
          showProjection: options?.showProjection !== false,
          ...options?.config,
        },
      };
    });
  }

  /**
   * Register a custom visualization generator
   * @param visualizationType The type of visualization
   * @param generator The function to generate the visualization data
   */
  registerVisualizationGenerator(
    visualizationType: string,
    generator: (workflowId: string, options?: any) => Promise<VisualizationData>
  ): void {
    this.visualizationGenerators.set(visualizationType, generator);
  }

  /**
   * Get visualization data for a specific type
   * @param workflowId The ID of the workflow
   * @param visualizationType The type of visualization
   * @param options Options for the visualization
   * @returns The visualization data
   */
  async getVisualizationData(workflowId: string, visualizationType: string, options?: any): Promise<VisualizationData> {
    const generator = this.visualizationGenerators.get(visualizationType);
    
    if (!generator) {
      throw new Error(`Visualization generator for ${visualizationType} not found`);
    }
    
    return generator(workflowId, options);
  }

  /**
   * Get all available visualization types
   * @returns All available visualization types
   */
  getAvailableVisualizationTypes(): string[] {
    return Array.from(this.visualizationGenerators.keys());
  }
}

