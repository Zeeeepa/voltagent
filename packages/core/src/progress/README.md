# Progress Tracking & Reporting System

A comprehensive system for tracking and reporting workflow progress in the voltagent framework.

## Overview

The Progress Tracking & Reporting System provides a robust solution for monitoring, analyzing, and visualizing workflow progress. It enables teams to track milestones, calculate progress metrics, detect blockers, predict completion times, and generate customizable reports.

## Key Features

- **Milestone Definition and Tracking**: Define workflow milestones with dependencies and track their progress.
- **Progress Metrics Calculation**: Calculate various metrics to measure workflow progress.
- **Real-time Progress Visualization**: Generate data for visualizing progress in real-time.
- **Blocker Detection and Notification**: Automatically detect and manage blockers in workflow progress.
- **Predictive Analytics**: Predict completion times and assess risks based on current progress.
- **Customizable Reporting**: Generate reports with customizable templates.
- **Historical Performance Analysis**: Analyze historical performance data to improve future workflows.
- **Multi-level Granularity**: Track progress at multiple levels of granularity.

## Architecture

The system is composed of several modules:

- **Core Types (`types.ts`)**: Defines the core types and interfaces for the system.
- **Milestone Management (`milestones/`)**: Manages workflow milestones and their states.
- **Metrics Calculation (`metrics/`)**: Calculates various progress metrics.
- **Blocker Detection (`blockers/`)**: Detects and manages blockers in workflow progress.
- **Predictive Analytics (`analytics/`)**: Generates predictions about workflow completion.
- **Report Generation (`reporting/`)**: Creates customizable progress reports.
- **Visualization (`visualization/`)**: Provides data for visualizing workflow progress.

## Usage

### Basic Usage

```typescript
import { Progress, Milestone, MilestoneStatus } from '@voltagent/core';

// Create a new Progress instance
const progress = new Progress();

// Define a workflow ID
const workflowId = 'my-workflow';

// Define and register a milestone
const milestone: Milestone = {
  id: 'milestone-1',
  name: 'Requirements Gathering',
  description: 'Gather and document project requirements',
  workflowId,
  weight: 10,
  expectedCompletionTime: 86400000, // 1 day in milliseconds
};

await progress.registerMilestone(milestone);

// Update milestone state
await progress.updateMilestoneState('milestone-1', {
  status: MilestoneStatus.IN_PROGRESS,
  startedAt: Date.now(),
  percentComplete: 50,
});

// Calculate progress metrics
const overallProgress = await progress.calculateMetric(workflowId, 'overall_progress');
console.log(`Overall progress: ${overallProgress.value}%`);

// Generate a report
const report = await progress.generateReport(workflowId, 'executive_summary');

// Get visualization data
const ganttChart = await progress.getVisualizationData(workflowId, 'gantt');
```

### Advanced Usage

#### Custom Metrics

```typescript
import { Progress, ProgressMetric } from '@voltagent/core';

const progress = new Progress();

// Get the metrics calculator
const metricsCalculator = progress['metricsCalculator'];

// Register a custom metric calculator
metricsCalculator.registerMetricCalculator('custom_metric', async (workflowId: string) => {
  // Calculate the metric
  const value = /* custom calculation */;
  
  return {
    id: `${workflowId}_custom_metric`,
    name: 'Custom Metric',
    description: 'A custom metric for workflow progress',
    type: 'custom',
    value,
    timestamp: Date.now(),
    workflowId,
  };
});

// Calculate the custom metric
const customMetric = await progress.calculateMetric(workflowId, 'custom_metric');
```

#### Custom Predictions

```typescript
import { Progress, PredictiveAnalytic } from '@voltagent/core';

const progress = new Progress();

// Get the predictive analytics
const predictiveAnalytics = progress['predictiveAnalytics'];

// Register a custom prediction generator
predictiveAnalytics.registerPredictionGenerator('custom_prediction', async (workflowId: string) => {
  // Generate the prediction
  const predictedValue = /* custom prediction */;
  
  return {
    id: `${workflowId}_custom_prediction`,
    name: 'Custom Prediction',
    description: 'A custom prediction for workflow progress',
    type: 'custom',
    predictedValue,
    confidence: 70,
    timestamp: Date.now(),
    workflowId,
  };
});

// Generate the custom prediction
const customPrediction = await progress.generatePrediction(workflowId, 'custom_prediction');
```

#### Custom Report Templates

```typescript
import { Progress, ReportTemplate } from '@voltagent/core';

const progress = new Progress();

// Define a custom report template
const customTemplate: ReportTemplate = {
  id: 'custom_template',
  name: 'Custom Report',
  description: 'A custom report template',
  sections: [
    {
      id: 'custom_section',
      name: 'Custom Section',
      description: 'A custom section',
      type: 'custom',
      config: {
        content: { /* custom content */ },
      },
      order: 1,
    },
    // Add more sections as needed
  ],
};

// Register the custom template
await progress.registerReportTemplate(customTemplate);

// Generate a report using the custom template
const report = await progress.generateReport(workflowId, 'custom_template');
```

#### Custom Visualizations

```typescript
import { Progress, VisualizationData } from '@voltagent/core';

const progress = new Progress();

// Get the visualization manager
const visualizationManager = progress['visualizationManager'];

// Register a custom visualization generator
visualizationManager.registerVisualizationGenerator('custom_viz', async (workflowId: string, options?: any) => {
  // Generate the visualization data
  const data = /* custom visualization data */;
  
  return {
    type: 'custom_viz',
    title: options?.title || 'Custom Visualization',
    data,
    config: {
      /* custom configuration */
      ...options?.config,
    },
  };
});

// Get the custom visualization data
const customViz = await progress.getVisualizationData(workflowId, 'custom_viz');
```

## Event Handling

The system emits events for various actions:

```typescript
import { Progress } from '@voltagent/core';

const progress = new Progress();

// Subscribe to milestone events
progress.onProgressEvent('milestone_updated', (data) => {
  console.log('Milestone updated:', data);
});

// Subscribe to blocker events
progress.onProgressEvent('blocker_detected', (data) => {
  console.log('Blocker detected:', data);
});

// Subscribe to prediction events
progress.onProgressEvent('prediction_generated', (data) => {
  console.log('Prediction generated:', data);
});
```

## Configuration Options

The Progress class accepts configuration options:

```typescript
import { Progress } from '@voltagent/core';

const progress = new Progress({
  realTimeUpdates: true,              // Enable real-time updates
  metricCalculationInterval: 5000,    // Calculate metrics every 5 seconds
  enablePredictiveAnalytics: true,    // Enable predictive analytics
  enableBlockerDetection: true,       // Enable blocker detection
  // Custom options
  customOption1: 'value1',
  customOption2: 'value2',
});
```

## Examples

See the `examples/with-progress-tracking` directory for a complete example of using the Progress Tracking & Reporting System.

## Best Practices

- Define milestones with clear dependencies to enable accurate critical path analysis.
- Assign appropriate weights to milestones based on their importance and effort.
- Update milestone states regularly to ensure accurate progress tracking.
- Use the blocker detection system to identify and resolve issues early.
- Leverage predictive analytics to anticipate delays and adjust plans accordingly.
- Create custom report templates tailored to different stakeholder needs.
- Integrate with visualization tools to provide clear progress insights.

## Integration with Other Systems

The Progress Tracking & Reporting System can be integrated with other systems:

- Connect to event systems to automatically track progress.
- Integrate with project management tools.
- Feed data to dashboards and visualization tools.
- Connect to notification systems for blocker alerts.
- Integrate with scheduling systems for resource planning.

