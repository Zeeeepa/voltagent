/**
 * Progress Tracking & Reporting System Example
 * 
 * This example demonstrates how to use the Progress Tracking & Reporting System
 * to track and visualize workflow progress.
 */

import { Progress, Milestone, MilestoneStatus } from '@voltagent/core';

// Create a new Progress instance
const progress = new Progress({
  realTimeUpdates: true,
  metricCalculationInterval: 5000,
  enablePredictiveAnalytics: true,
  enableBlockerDetection: true,
});

// Define a workflow ID
const workflowId = 'example-workflow-1';

// Define milestones
const milestones: Milestone[] = [
  {
    id: 'milestone-1',
    name: 'Requirements Gathering',
    description: 'Gather and document project requirements',
    workflowId,
    weight: 10,
    expectedCompletionTime: 86400000, // 1 day in milliseconds
  },
  {
    id: 'milestone-2',
    name: 'Design Phase',
    description: 'Create system design and architecture',
    workflowId,
    weight: 20,
    expectedCompletionTime: 172800000, // 2 days in milliseconds
    dependencies: ['milestone-1'],
  },
  {
    id: 'milestone-3',
    name: 'Implementation',
    description: 'Implement the system according to design',
    workflowId,
    weight: 40,
    expectedCompletionTime: 259200000, // 3 days in milliseconds
    dependencies: ['milestone-2'],
  },
  {
    id: 'milestone-4',
    name: 'Testing',
    description: 'Test the implemented system',
    workflowId,
    weight: 20,
    expectedCompletionTime: 172800000, // 2 days in milliseconds
    dependencies: ['milestone-3'],
  },
  {
    id: 'milestone-5',
    name: 'Deployment',
    description: 'Deploy the system to production',
    workflowId,
    weight: 10,
    expectedCompletionTime: 86400000, // 1 day in milliseconds
    dependencies: ['milestone-4'],
  },
];

// Function to run the example
async function runExample() {
  try {
    console.log('Progress Tracking & Reporting System Example');
    console.log('-------------------------------------------');

    // Register milestones
    console.log('\nRegistering milestones...');
    for (const milestone of milestones) {
      await progress.registerMilestone(milestone);
      console.log(`Registered milestone: ${milestone.name}`);
    }

    // Update milestone states
    console.log('\nUpdating milestone states...');
    
    // Mark milestone 1 as completed
    await progress.updateMilestoneState('milestone-1', {
      status: MilestoneStatus.COMPLETED,
      startedAt: Date.now() - 86400000, // Started 1 day ago
      completedAt: Date.now() - 3600000, // Completed 1 hour ago
    });
    console.log('Milestone 1 marked as completed');
    
    // Mark milestone 2 as in progress
    await progress.updateMilestoneState('milestone-2', {
      status: MilestoneStatus.IN_PROGRESS,
      startedAt: Date.now() - 3600000, // Started 1 hour ago
      percentComplete: 50,
    });
    console.log('Milestone 2 marked as in progress (50% complete)');
    
    // Mark milestone 3 as blocked
    await progress.updateMilestoneState('milestone-3', {
      status: MilestoneStatus.BLOCKED,
      blockerReason: 'Waiting for design approval',
      blockedBy: 'milestone-2',
    });
    console.log('Milestone 3 marked as blocked');

    // Calculate metrics
    console.log('\nCalculating metrics...');
    const overallProgress = await progress.calculateMetric(workflowId, 'overall_progress');
    console.log(`Overall progress: ${overallProgress.value}%`);
    
    const completedMilestones = await progress.calculateMetric(workflowId, 'completed_milestones');
    console.log(`Completed milestones: ${completedMilestones.value}`);
    
    const blockedMilestones = await progress.calculateMetric(workflowId, 'blocked_milestones');
    console.log(`Blocked milestones: ${blockedMilestones.value}`);

    // Get active blockers
    console.log('\nGetting active blockers...');
    const activeBlockers = await progress.getActiveBlockers(workflowId);
    console.log(`Found ${activeBlockers.length} active blockers:`);
    for (const blocker of activeBlockers) {
      console.log(`- ${blocker.name}: ${blocker.description}`);
    }

    // Generate predictions
    console.log('\nGenerating predictions...');
    const completionTimePrediction = await progress.generatePrediction(workflowId, 'completion_time');
    const predictedCompletionDate = new Date(completionTimePrediction.predictedValue as number);
    console.log(`Predicted completion time: ${predictedCompletionDate.toLocaleString()} (${completionTimePrediction.confidence}% confidence)`);
    
    const riskAssessment = await progress.generatePrediction(workflowId, 'risk_assessment');
    console.log(`Risk assessment: ${riskAssessment.predictedValue} (${riskAssessment.confidence}% confidence)`);

    // Generate a report
    console.log('\nGenerating a report...');
    const report = await progress.generateReport(workflowId, 'executive_summary');
    console.log(`Generated report: ${report.name} (ID: ${report.id})`);
    console.log(`Report sections: ${Object.keys(report.content).join(', ')}`);

    // Get visualization data
    console.log('\nGetting visualization data...');
    const ganttChart = await progress.getVisualizationData(workflowId, 'gantt');
    console.log(`Generated Gantt chart: ${ganttChart.title}`);
    console.log(`Chart contains ${ganttChart.data.tasks.length} tasks`);

    const pieChart = await progress.getVisualizationData(workflowId, 'pie');
    console.log(`Generated pie chart: ${pieChart.title}`);
    console.log(`Chart contains ${pieChart.data.length} segments`);

    // Resolve a blocker
    console.log('\nResolving a blocker...');
    if (activeBlockers.length > 0) {
      const resolvedBlocker = await progress.resolveBlocker(activeBlockers[0].id, 'Design approved');
      console.log(`Resolved blocker: ${resolvedBlocker.name}`);
      
      // Update the previously blocked milestone
      await progress.updateMilestoneState('milestone-3', {
        status: MilestoneStatus.NOT_STARTED,
      });
      console.log('Updated milestone 3 status to not started');
    }

    // Calculate final metrics
    console.log('\nCalculating final metrics...');
    const finalProgress = await progress.calculateMetric(workflowId, 'overall_progress');
    console.log(`Final overall progress: ${finalProgress.value}%`);

    console.log('\nExample completed successfully!');
  } catch (error) {
    console.error('Error running example:', error);
  }
}

// Run the example
runExample();

