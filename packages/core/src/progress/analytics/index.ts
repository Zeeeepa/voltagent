/**
 * Predictive Analytics Module
 * Provides predictive analytics for workflow progress
 */

import { EventEmitter } from 'events';
import { PredictiveAnalytic, MilestoneStatus } from '../types';
import { MilestoneManager } from '../milestones';
import { MetricsCalculator } from '../metrics';

/**
 * PredictiveAnalytics is responsible for generating predictions about workflow progress
 */
export class PredictiveAnalytics {
  private predictions: Map<string, PredictiveAnalytic> = new Map();
  private workflowPredictions: Map<string, Set<string>> = new Map();
  private milestoneManager: MilestoneManager;
  private metricsCalculator: MetricsCalculator;
  private eventEmitter: EventEmitter;
  private predictionGenerators: Map<string, (workflowId: string) => Promise<PredictiveAnalytic>> = new Map();

  /**
   * Create a new PredictiveAnalytics instance
   * @param milestoneManager The milestone manager to use for predictions
   * @param metricsCalculator The metrics calculator to use for predictions
   * @param eventEmitter Event emitter for publishing prediction events
   */
  constructor(
    milestoneManager: MilestoneManager,
    metricsCalculator: MetricsCalculator,
    eventEmitter: EventEmitter
  ) {
    this.milestoneManager = milestoneManager;
    this.metricsCalculator = metricsCalculator;
    this.eventEmitter = eventEmitter;

    // Register built-in prediction generators
    this.registerBuiltInPredictions();
  }

  /**
   * Register built-in prediction generators
   */
  private registerBuiltInPredictions(): void {
    // Estimated completion time
    this.registerPredictionGenerator('completion_time', async (workflowId: string) => {
      const milestones = await this.milestoneManager.getWorkflowMilestones(workflowId);
      const states = await this.milestoneManager.getWorkflowMilestoneStates(workflowId);
      
      // Create maps for quick lookup
      const stateMap = new Map();
      for (const state of states) {
        stateMap.set(state.milestoneId, state);
      }
      
      // Calculate total expected time and completed time
      let totalExpectedTime = 0;
      let completedTime = 0;
      let remainingTime = 0;
      
      for (const milestone of milestones) {
        const state = stateMap.get(milestone.id);
        const expectedTime = milestone.expectedCompletionTime || 0;
        
        totalExpectedTime += expectedTime;
        
        if (state && state.status === MilestoneStatus.COMPLETED) {
          // For completed milestones, use actual completion time if available
          if (state.startedAt && state.completedAt) {
            completedTime += (state.completedAt - state.startedAt);
          } else {
            completedTime += expectedTime;
          }
        } else if (state && state.status === MilestoneStatus.IN_PROGRESS) {
          // For in-progress milestones, estimate remaining time based on percent complete
          const percentComplete = state.percentComplete || 0;
          const timeSpentSoFar = state.startedAt ? (Date.now() - state.startedAt) : 0;
          
          if (percentComplete > 0) {
            const estimatedTotalTime = timeSpentSoFar / (percentComplete / 100);
            const estimatedRemainingTime = estimatedTotalTime - timeSpentSoFar;
            remainingTime += estimatedRemainingTime;
            completedTime += timeSpentSoFar;
          } else {
            // If no progress reported, use expected time
            remainingTime += expectedTime;
          }
        } else {
          // For not started milestones, use expected time
          remainingTime += expectedTime;
        }
      }
      
      // Calculate completion factor (how actual time compares to expected time)
      const completionFactor = completedTime > 0 && totalExpectedTime > 0
        ? completedTime / totalExpectedTime
        : 1;
      
      // Adjust remaining time based on completion factor
      const adjustedRemainingTime = remainingTime * completionFactor;
      
      // Calculate estimated completion time
      const now = Date.now();
      const estimatedCompletionTime = now + adjustedRemainingTime;
      
      // Calculate confidence based on how much of the workflow is completed
      const progress = await this.milestoneManager.calculateWorkflowProgress(workflowId);
      const confidence = Math.min(90, Math.max(10, progress)); // Confidence between 10% and 90%
      
      return {
        id: `${workflowId}_completion_time`,
        name: 'Estimated Completion Time',
        description: 'Predicted completion time for the workflow',
        type: 'completion_time',
        predictedValue: estimatedCompletionTime,
        confidence,
        unit: 'timestamp',
        timestamp: now,
        workflowId,
        dataPoints: [
          { totalExpectedTime, completedTime, remainingTime, adjustedRemainingTime, completionFactor }
        ],
      };
    });

    // Milestone completion predictions
    this.registerPredictionGenerator('milestone_completion', async (workflowId: string) => {
      const milestones = await this.milestoneManager.getWorkflowMilestones(workflowId);
      const states = await this.milestoneManager.getWorkflowMilestoneStates(workflowId);
      const now = Date.now();
      
      // Create maps for quick lookup
      const stateMap = new Map();
      for (const state of states) {
        stateMap.set(state.milestoneId, state);
      }
      
      // Get completion times for already completed milestones
      const completionTimes: number[] = [];
      for (const state of states) {
        if (state.status === MilestoneStatus.COMPLETED && state.startedAt && state.completedAt) {
          completionTimes.push(state.completedAt - state.startedAt);
        }
      }
      
      // Calculate average completion time and standard deviation
      let avgCompletionTime = 0;
      let stdDeviation = 0;
      
      if (completionTimes.length > 0) {
        avgCompletionTime = completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;
        
        // Calculate standard deviation
        const squaredDiffs = completionTimes.map(time => Math.pow(time - avgCompletionTime, 2));
        const avgSquaredDiff = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / squaredDiffs.length;
        stdDeviation = Math.sqrt(avgSquaredDiff);
      }
      
      // Predict completion times for in-progress and not-started milestones
      const milestonePredictions: any[] = [];
      
      for (const milestone of milestones) {
        const state = stateMap.get(milestone.id);
        
        if (!state || state.status === MilestoneStatus.COMPLETED) {
          continue;
        }
        
        let predictedCompletionTime: number;
        let confidence: number;
        
        if (state.status === MilestoneStatus.IN_PROGRESS && state.startedAt) {
          // For in-progress milestones, estimate based on percent complete
          const percentComplete = state.percentComplete || 0;
          const timeSpentSoFar = now - state.startedAt;
          
          if (percentComplete > 0) {
            const estimatedTotalTime = timeSpentSoFar / (percentComplete / 100);
            const estimatedRemainingTime = estimatedTotalTime - timeSpentSoFar;
            predictedCompletionTime = now + estimatedRemainingTime;
            
            // Higher confidence for milestones with more progress
            confidence = Math.min(90, Math.max(30, percentComplete));
          } else {
            // If no progress reported, use expected time or average
            const expectedTime = milestone.expectedCompletionTime || avgCompletionTime;
            predictedCompletionTime = state.startedAt + expectedTime;
            confidence = 30; // Lower confidence
          }
        } else {
          // For not started milestones, use expected time or average
          const expectedTime = milestone.expectedCompletionTime || avgCompletionTime;
          
          // Adjust expected time based on historical performance
          const adjustmentFactor = avgCompletionTime > 0 && completionTimes.length > 0
            ? avgCompletionTime / (milestone.expectedCompletionTime || avgCompletionTime)
            : 1;
          
          const adjustedExpectedTime = expectedTime * adjustmentFactor;
          predictedCompletionTime = now + adjustedExpectedTime;
          confidence = 20; // Lower confidence for not started milestones
        }
        
        milestonePredictions.push({
          milestoneId: milestone.id,
          milestoneName: milestone.name,
          predictedCompletionTime,
          confidence,
        });
      }
      
      // Sort predictions by predicted completion time
      milestonePredictions.sort((a, b) => a.predictedCompletionTime - b.predictedCompletionTime);
      
      return {
        id: `${workflowId}_milestone_completion`,
        name: 'Milestone Completion Predictions',
        description: 'Predicted completion times for milestones',
        type: 'milestone_completion',
        predictedValue: JSON.stringify(milestonePredictions),
        confidence: milestonePredictions.length > 0
          ? milestonePredictions.reduce((sum, p) => sum + p.confidence, 0) / milestonePredictions.length
          : 0,
        timestamp: now,
        workflowId,
        dataPoints: milestonePredictions,
      };
    });

    // Risk assessment
    this.registerPredictionGenerator('risk_assessment', async (workflowId: string) => {
      const milestones = await this.milestoneManager.getWorkflowMilestones(workflowId);
      const states = await this.milestoneManager.getWorkflowMilestoneStates(workflowId);
      const blockerDetector = await import('../blockers').then(m => new m.BlockerDetector(this.milestoneManager, this.eventEmitter));
      const activeBlockers = await blockerDetector.getActiveBlockers(workflowId);
      
      // Calculate risk factors
      const riskFactors = [];
      
      // 1. Number of active blockers
      const blockerRisk = activeBlockers.length * 20; // Each blocker adds 20% risk
      riskFactors.push({ factor: 'Active Blockers', risk: blockerRisk });
      
      // 2. Delayed milestones
      let delayedMilestones = 0;
      for (const milestone of milestones) {
        const state = states.find(s => s.milestoneId === milestone.id);
        
        if (state && state.status === MilestoneStatus.IN_PROGRESS && state.startedAt && milestone.expectedCompletionTime) {
          const expectedEndTime = state.startedAt + milestone.expectedCompletionTime;
          if (Date.now() > expectedEndTime) {
            delayedMilestones++;
          }
        }
      }
      const delayRisk = Math.min(50, delayedMilestones * 10); // Each delayed milestone adds 10% risk, max 50%
      riskFactors.push({ factor: 'Delayed Milestones', risk: delayRisk });
      
      // 3. Critical path progress
      const criticalPathMetric = await this.metricsCalculator.calculateMetric(workflowId, 'critical_path_progress');
      const criticalPathProgress = typeof criticalPathMetric.value === 'number' ? criticalPathMetric.value : 0;
      const criticalPathRisk = Math.max(0, 50 - criticalPathProgress / 2); // Lower progress means higher risk
      riskFactors.push({ factor: 'Critical Path Progress', risk: criticalPathRisk });
      
      // 4. Dependency complexity
      let maxDependencies = 0;
      for (const milestone of milestones) {
        if (milestone.dependencies && milestone.dependencies.length > maxDependencies) {
          maxDependencies = milestone.dependencies.length;
        }
      }
      const dependencyRisk = Math.min(30, maxDependencies * 5); // Each dependency adds 5% risk, max 30%
      riskFactors.push({ factor: 'Dependency Complexity', risk: dependencyRisk });
      
      // Calculate overall risk (weighted average)
      const weights = [0.4, 0.3, 0.2, 0.1]; // Weights for each risk factor
      const weightedRisk = riskFactors.reduce((sum, factor, index) => sum + factor.risk * weights[index], 0);
      
      // Determine risk level
      let riskLevel;
      if (weightedRisk < 20) {
        riskLevel = 'low';
      } else if (weightedRisk < 50) {
        riskLevel = 'medium';
      } else if (weightedRisk < 75) {
        riskLevel = 'high';
      } else {
        riskLevel = 'critical';
      }
      
      return {
        id: `${workflowId}_risk_assessment`,
        name: 'Risk Assessment',
        description: 'Assessment of workflow completion risk',
        type: 'custom',
        predictedValue: riskLevel,
        confidence: 70, // Moderate confidence in risk assessment
        timestamp: Date.now(),
        workflowId,
        dataPoints: riskFactors,
        metadata: {
          riskScore: weightedRisk,
          riskFactors,
        },
      };
    });
  }

  /**
   * Register a custom prediction generator
   * @param predictionType The type of prediction
   * @param generator The function to generate the prediction
   */
  registerPredictionGenerator(
    predictionType: string,
    generator: (workflowId: string) => Promise<PredictiveAnalytic>
  ): void {
    this.predictionGenerators.set(predictionType, generator);
  }

  /**
   * Generate a prediction for a workflow
   * @param workflowId The ID of the workflow
   * @param predictionType The type of prediction to generate
   * @returns The generated prediction
   */
  async generatePrediction(workflowId: string, predictionType: string): Promise<PredictiveAnalytic> {
    const generator = this.predictionGenerators.get(predictionType);
    
    if (!generator) {
      throw new Error(`Prediction generator for ${predictionType} not found`);
    }
    
    const prediction = await generator(workflowId);
    
    // Store the prediction
    this.predictions.set(prediction.id, prediction);
    
    // Add to workflow predictions
    if (!this.workflowPredictions.has(workflowId)) {
      this.workflowPredictions.set(workflowId, new Set());
    }
    this.workflowPredictions.get(workflowId)?.add(prediction.id);
    
    // Emit prediction generated event
    this.eventEmitter.emit('prediction_generated', {
      type: 'prediction_generated',
      workflowId,
      timestamp: Date.now(),
      data: prediction,
    });
    
    return prediction;
  }

  /**
   * Get all predictions for a workflow
   * @param workflowId The ID of the workflow
   * @returns All predictions for the workflow
   */
  async getWorkflowPredictions(workflowId: string): Promise<PredictiveAnalytic[]> {
    // Generate all predictions for the workflow
    await this.updateWorkflowPredictions(workflowId);
    
    const predictionIds = this.workflowPredictions.get(workflowId) || new Set();
    const predictions: PredictiveAnalytic[] = [];
    
    for (const id of predictionIds) {
      const prediction = this.predictions.get(id);
      if (prediction) {
        predictions.push(prediction);
      }
    }
    
    return predictions;
  }

  /**
   * Update all predictions for a workflow
   * @param workflowId The ID of the workflow
   */
  async updateWorkflowPredictions(workflowId: string): Promise<void> {
    for (const [predictionType, generator] of this.predictionGenerators.entries()) {
      await this.generatePrediction(workflowId, predictionType);
    }
  }

  /**
   * Update all predictions for all workflows
   */
  async updateAllPredictions(): Promise<void> {
    const workflowIds = new Set<string>();
    
    // Collect all workflow IDs
    for (const [workflowId] of this.workflowPredictions) {
      workflowIds.add(workflowId);
    }
    
    // Update predictions for each workflow
    for (const workflowId of workflowIds) {
      await this.updateWorkflowPredictions(workflowId);
    }
  }

  /**
   * Get a specific prediction
   * @param predictionId The ID of the prediction
   * @returns The prediction
   */
  getPrediction(predictionId: string): PredictiveAnalytic | undefined {
    return this.predictions.get(predictionId);
  }
}

