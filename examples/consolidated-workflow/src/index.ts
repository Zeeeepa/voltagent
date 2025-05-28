/**
 * Consolidated Workflow Example
 * 
 * This example demonstrates the unified VoltAgent system that consolidates
 * functionality from multiple PRs into a single, cohesive workflow engine.
 */

import {
  createVoltAgent,
  createTask,
  createWorkflow,
  Priority,
  Status,
  VoltAgent,
  TaskDefinition,
  WorkflowDefinition,
} from '../../../packages/core/src/consolidated/index.js';

/**
 * Main example function
 */
async function runConsolidatedExample(): Promise<void> {
  console.log('🚀 VoltAgent Consolidated Workflow Example');
  console.log('==========================================\n');

  // Create VoltAgent instance with comprehensive configuration
  const voltAgent = createVoltAgent({
    workflow: {
      concurrencyLimit: 3,
      defaultTimeout: 30000,
      enableRetry: true,
      defaultRetryPolicy: {
        maxRetries: 2,
        initialDelay: 1000,
        backoffFactor: 2,
      },
      resourceLimits: {
        cpu: 100,
        memory: 100,
      },
    },
    dependency: {
      enableValidation: true,
      enableCircularDetection: true,
      enableVisualization: true,
      defaultVisualizationFormat: 'mermaid',
      enableCriticalPath: true,
    },
    progress: {
      realTimeUpdates: true,
      metricCalculationInterval: 2000,
      enablePredictiveAnalytics: true,
      enableBlockerDetection: true,
      enableMilestoneTracking: true,
    },
    synchronization: {
      enableConflictDetection: true,
      defaultConflictResolution: 'last_wins',
      enableDeadlockPrevention: true,
      syncTimeout: 30000,
      enableDataExchange: true,
    },
  });

  const engine = voltAgent.getEngine();

  // Set up event listeners for monitoring
  setupEventListeners(engine);

  console.log('📋 Creating workflow tasks...');

  // Create a complex workflow with multiple tasks and dependencies
  const tasks = createExampleTasks();
  const workflow = createExampleWorkflow(tasks);

  console.log('🔧 Registering milestones...');
  await registerMilestones(engine, workflow.id);

  console.log('🎯 Creating synchronization points...');
  createSynchronizationPoints(engine);

  console.log('▶️  Starting workflow execution...');
  
  try {
    // Execute the workflow
    const result = await voltAgent.runWorkflow(workflow, { 
      inputData: 'example input',
      timestamp: Date.now(),
    });

    console.log('✅ Workflow execution completed!');
    console.log('📊 Results:', JSON.stringify(result, null, 2));

    // Demonstrate visualization capabilities
    console.log('\n🎨 Generating dependency visualizations...');
    await generateVisualizations(voltAgent, workflow.id);

    // Demonstrate progress tracking
    console.log('\n📈 Calculating progress metrics...');
    await demonstrateProgressTracking(engine, workflow.id);

    // Demonstrate synchronization features
    console.log('\n🔄 Demonstrating synchronization...');
    await demonstrateSynchronization(engine);

    // Health check
    console.log('\n🏥 Performing health check...');
    const health = await voltAgent.healthCheck();
    console.log('Health status:', health);

  } catch (error) {
    console.error('❌ Workflow execution failed:', error);
  }

  console.log('\n🎉 Example completed successfully!');
}

/**
 * Create example tasks with various dependencies and configurations
 */
function createExampleTasks(): TaskDefinition[] {
  return [
    // Task 1: Data Initialization
    createTask('init-data', 'Initialize Data')
      .description('Initialize the data processing pipeline')
      .execute(async (input) => {
        console.log('  🔄 Initializing data...');
        await simulateWork(1000);
        return { 
          initialized: true, 
          timestamp: Date.now(),
          inputData: input.inputData,
        };
      })
      .priority(Priority.HIGH)
      .timeout(5000)
      .resources({ cpu: 20, memory: 30 })
      .build(),

    // Task 2: Fetch External Data
    createTask('fetch-external', 'Fetch External Data')
      .description('Fetch data from external sources')
      .execute(async (input, context) => {
        console.log('  🌐 Fetching external data...');
        await simulateWork(1500);
        
        // Simulate potential failure and retry
        if (context?.attempt === 1 && Math.random() < 0.3) {
          throw new Error('Network timeout - will retry');
        }
        
        return { 
          externalData: 'fetched from API',
          records: 150,
          fetchTime: Date.now(),
        };
      })
      .dependencies(['init-data'])
      .priority(Priority.NORMAL)
      .retryPolicy({
        maxRetries: 2,
        initialDelay: 500,
        backoffFactor: 2,
      })
      .resources({ cpu: 30, memory: 20 })
      .build(),

    // Task 3: Process Data
    createTask('process-data', 'Process Data')
      .description('Process and transform the data')
      .execute(async (input, context) => {
        console.log('  ⚙️  Processing data...');
        await simulateWork(2000);
        
        return {
          processedRecords: 150,
          transformations: ['normalize', 'validate', 'enrich'],
          processingTime: Date.now(),
        };
      })
      .dependencies(['init-data', 'fetch-external'])
      .priority(Priority.NORMAL)
      .resources({ cpu: 50, memory: 40 })
      .build(),

    // Task 4: Validate Results
    createTask('validate-results', 'Validate Results')
      .description('Validate the processed data')
      .execute(async (input, context) => {
        console.log('  ✅ Validating results...');
        await simulateWork(800);
        
        return {
          validationPassed: true,
          validatedRecords: 150,
          validationRules: ['schema', 'business_rules', 'data_quality'],
        };
      })
      .dependencies(['process-data'])
      .priority(Priority.HIGH)
      .resources({ cpu: 25, memory: 20 })
      .build(),

    // Task 5: Generate Report
    createTask('generate-report', 'Generate Report')
      .description('Generate final processing report')
      .execute(async (input, context) => {
        console.log('  📄 Generating report...');
        await simulateWork(1200);
        
        return {
          reportGenerated: true,
          reportPath: '/reports/processing_report.pdf',
          reportSize: '2.5MB',
          generatedAt: Date.now(),
        };
      })
      .dependencies(['validate-results'])
      .priority(Priority.LOW)
      .resources({ cpu: 15, memory: 25 })
      .build(),

    // Task 6: Cleanup
    createTask('cleanup', 'Cleanup Resources')
      .description('Clean up temporary resources')
      .execute(async (input, context) => {
        console.log('  🧹 Cleaning up resources...');
        await simulateWork(500);
        
        return {
          cleanupCompleted: true,
          resourcesFreed: ['temp_files', 'cache', 'connections'],
        };
      })
      .dependencies(['generate-report'])
      .priority(Priority.LOW)
      .resources({ cpu: 10, memory: 10 })
      .build(),
  ];
}

/**
 * Create example workflow
 */
function createExampleWorkflow(tasks: TaskDefinition[]): WorkflowDefinition {
  return createWorkflow('data-processing-workflow', 'Data Processing Workflow')
    .description('A comprehensive data processing workflow demonstrating consolidated features')
    .addTasks(tasks)
    .concurrencyLimit(3)
    .timeout(60000)
    .failFast(false)
    .metadata({
      version: '1.0.0',
      author: 'VoltAgent Consolidation',
      tags: ['data-processing', 'example', 'consolidated'],
    })
    .build();
}

/**
 * Set up event listeners for monitoring
 */
function setupEventListeners(engine: any): void {
  engine.on('workflow:started', ({ workflowId }: any) => {
    console.log(`🚀 Workflow ${workflowId} started`);
  });

  engine.on('task:started', ({ taskId }: any) => {
    console.log(`  ▶️  Task ${taskId} started`);
  });

  engine.on('task:completed', ({ taskId, result }: any) => {
    console.log(`  ✅ Task ${taskId} completed`);
  });

  engine.on('task:failed', ({ taskId, error }: any) => {
    console.log(`  ❌ Task ${taskId} failed: ${error.message}`);
  });

  engine.on('workflow:completed', ({ workflowId, execution }: any) => {
    console.log(`🏁 Workflow ${workflowId} completed in ${execution.duration}ms`);
  });

  engine.on('milestone:updated', ({ milestone }: any) => {
    console.log(`🎯 Milestone '${milestone.name}' updated: ${milestone.status}`);
  });

  engine.on('conflict:detected', ({ conflict }: any) => {
    console.log(`⚠️  Conflict detected: ${conflict.reason}`);
  });

  engine.on('conflict:resolved', ({ conflict }: any) => {
    console.log(`✅ Conflict resolved: ${conflict.id}`);
  });
}

/**
 * Register milestones for progress tracking
 */
async function registerMilestones(engine: any, workflowId: string): Promise<void> {
  const milestones = [
    {
      id: 'data-initialization',
      name: 'Data Initialization',
      description: 'Data pipeline initialization complete',
      workflowId,
      taskIds: ['init-data'],
      weight: 10,
      expectedCompletionTime: 2000,
    },
    {
      id: 'data-acquisition',
      name: 'Data Acquisition',
      description: 'External data fetching complete',
      workflowId,
      taskIds: ['fetch-external'],
      weight: 20,
      expectedCompletionTime: 3000,
      dependencies: ['data-initialization'],
    },
    {
      id: 'data-processing',
      name: 'Data Processing',
      description: 'Data processing and transformation complete',
      workflowId,
      taskIds: ['process-data'],
      weight: 40,
      expectedCompletionTime: 4000,
      dependencies: ['data-acquisition'],
    },
    {
      id: 'quality-assurance',
      name: 'Quality Assurance',
      description: 'Data validation and quality checks complete',
      workflowId,
      taskIds: ['validate-results'],
      weight: 20,
      expectedCompletionTime: 2000,
      dependencies: ['data-processing'],
    },
    {
      id: 'finalization',
      name: 'Finalization',
      description: 'Report generation and cleanup complete',
      workflowId,
      taskIds: ['generate-report', 'cleanup'],
      weight: 10,
      expectedCompletionTime: 2000,
      dependencies: ['quality-assurance'],
    },
  ];

  for (const milestone of milestones) {
    await engine.registerMilestone(milestone);
  }
}

/**
 * Create synchronization points
 */
function createSynchronizationPoints(engine: any): void {
  // Create a sync point for data processing coordination
  engine.createSyncPoint({
    id: 'data-processing-sync',
    name: 'Data Processing Synchronization',
    workstreamIds: ['main-workflow', 'validation-stream', 'reporting-stream'],
    minimumParticipants: 2,
    timeout: 30000,
  });
}

/**
 * Generate dependency visualizations
 */
async function generateVisualizations(voltAgent: VoltAgent, workflowId: string): Promise<void> {
  try {
    // Generate Mermaid diagram
    const mermaidDiagram = voltAgent.visualizeDependencies(workflowId, 'mermaid');
    console.log('📊 Mermaid Diagram:');
    console.log(mermaidDiagram);

    // Generate DOT diagram
    const dotDiagram = voltAgent.visualizeDependencies(workflowId, 'dot');
    console.log('\n📊 DOT Diagram:');
    console.log(dotDiagram);

    // Note: In a real application, you would save these to files
    // fs.writeFileSync('workflow.mermaid', mermaidDiagram);
    // fs.writeFileSync('workflow.dot', dotDiagram);
    
  } catch (error) {
    console.error('Error generating visualizations:', error);
  }
}

/**
 * Demonstrate progress tracking capabilities
 */
async function demonstrateProgressTracking(engine: any, workflowId: string): Promise<void> {
  try {
    // Calculate various progress metrics
    const overallProgress = await engine.calculateProgressMetric(workflowId, 'overall_progress');
    console.log(`📈 Overall Progress: ${overallProgress.value.toFixed(2)}%`);

    const completedTasks = await engine.calculateProgressMetric(workflowId, 'completed_tasks');
    console.log(`✅ Completed Tasks: ${completedTasks.value}`);

    const failedTasks = await engine.calculateProgressMetric(workflowId, 'failed_tasks');
    console.log(`❌ Failed Tasks: ${failedTasks.value}`);

  } catch (error) {
    console.error('Error calculating progress metrics:', error);
  }
}

/**
 * Demonstrate synchronization capabilities
 */
async function demonstrateSynchronization(engine: any): Promise<void> {
  try {
    // Simulate a conflict
    const conflict = engine.detectConflict(
      'data-processing-sync',
      ['main-workflow', 'validation-stream'],
      'Data version mismatch detected',
      'data_conflict',
      'medium'
    );

    console.log(`⚠️  Detected conflict: ${conflict.reason}`);

    // Resolve the conflict
    const resolvedConflict = await engine.resolveConflict(conflict.id, 'last_wins');
    console.log(`✅ Resolved conflict using strategy: ${resolvedConflict.resolutionStrategy}`);

  } catch (error) {
    console.error('Error in synchronization demo:', error);
  }
}

/**
 * Simulate work with a delay
 */
async function simulateWork(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Run the example
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  runConsolidatedExample().catch(console.error);
}

export { runConsolidatedExample };

