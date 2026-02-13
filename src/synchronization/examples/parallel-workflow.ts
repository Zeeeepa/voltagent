/**
 * Parallel Workflow Example
 * 
 * This example demonstrates a real-world scenario of a parallel workflow
 * with multiple synchronization points, data exchange, and conflict resolution.
 */

import { 
  SynchronizationManager,
  SyncPrimitiveType,
  DataExchangeType,
  ConflictType,
  ConflictSeverity,
  NotificationType,
  TransactionOperationType,
  PartialSyncStatus
} from '../index';

// Create a synchronization manager
const syncManager = new SynchronizationManager({
  autoStartDeadlockDetection: true,
  autoCleanupTransactions: true,
  autoCleanupSyncPoints: true,
  autoCleanupNotifications: true
});

// Define workstream IDs for a parallel data processing workflow
const dataIngestionWorkstream = 'data-ingestion';
const dataValidationWorkstream = 'data-validation';
const dataTransformationWorkstream = 'data-transformation';
const dataAnalysisWorkstream = 'data-analysis';
const dataExportWorkstream = 'data-export';

// Simulated data
const sampleData = {
  records: [
    { id: 1, name: 'Alice', age: 30, email: 'alice@example.com' },
    { id: 2, name: 'Bob', age: 25, email: 'bob@example.com' },
    { id: 3, name: 'Charlie', age: 35, email: 'charlie@example.com' },
    { id: 4, name: 'Dave', age: 40, email: 'dave@example.com' },
    { id: 5, name: 'Eve', age: 28, email: 'eve@example.com' }
  ]
};

// Helper function to simulate work
async function simulateWork(description: string, durationMs: number): Promise<void> {
  console.log(`Starting: ${description}`);
  await new Promise(resolve => setTimeout(resolve, durationMs));
  console.log(`Completed: ${description}`);
}

// Data Ingestion Workstream
async function runDataIngestionWorkstream(): Promise<void> {
  try {
    console.log(`[${dataIngestionWorkstream}] Starting data ingestion workstream`);
    
    // Simulate data ingestion
    await simulateWork(`[${dataIngestionWorkstream}] Ingesting data from source`, 1000);
    
    // Create a data exchange channel for the ingested data
    const dataChannel = syncManager.createDataExchangeChannel(
      'ingested-data-channel',
      DataExchangeType.BROADCAST
    );
    
    // Send the ingested data to other workstreams
    console.log(`[${dataIngestionWorkstream}] Broadcasting ingested data`);
    await dataChannel.send(
      dataIngestionWorkstream,
      sampleData,
      [dataValidationWorkstream, dataTransformationWorkstream]
    );
    
    // Signal that data ingestion is complete
    const ingestionCompleteLatch = syncManager.createCountdownLatch({
      count: 1
    });
    
    await ingestionCompleteLatch.countDown(dataIngestionWorkstream);
    console.log(`[${dataIngestionWorkstream}] Data ingestion complete`);
    
    // Wait for validation to complete before proceeding
    const validationBarrier = syncManager.createBarrier({
      parties: 2
    });
    
    console.log(`[${dataIngestionWorkstream}] Waiting for validation to complete`);
    await validationBarrier.wait(dataIngestionWorkstream);
    console.log(`[${dataIngestionWorkstream}] Validation complete, proceeding`);
    
    // Participate in the final synchronization
    const finalSyncPoint = syncManager.createPartialSyncPoint(
      [dataIngestionWorkstream, dataValidationWorkstream, dataTransformationWorkstream, dataAnalysisWorkstream, dataExportWorkstream],
      {
        minimumParticipants: 3,
        continueOnTimeout: true,
        requiredWorkstreams: [dataIngestionWorkstream, dataExportWorkstream]
      },
      {
        name: 'final-sync-point',
        timeout: 5000
      }
    );
    
    console.log(`[${dataIngestionWorkstream}] Participating in final synchronization`);
    const finalSyncResult = await syncManager.waitAtPartialSyncPoint(finalSyncPoint.id, dataIngestionWorkstream);
    console.log(`[${dataIngestionWorkstream}] Final synchronization result:`, finalSyncResult.status);
    
  } catch (error) {
    console.error(`[${dataIngestionWorkstream}] Error:`, error);
  }
}

// Data Validation Workstream
async function runDataValidationWorkstream(): Promise<void> {
  try {
    console.log(`[${dataValidationWorkstream}] Starting data validation workstream`);
    
    // Subscribe to the ingested data channel
    const dataChannel = syncManager.getDataExchangeChannel('ingested-data-channel');
    
    if (!dataChannel) {
      throw new Error('Data channel not found');
    }
    
    // Wait for data to be available
    console.log(`[${dataValidationWorkstream}] Waiting for data`);
    const dataPromise = new Promise<any>(resolve => {
      dataChannel.subscribe(dataValidationWorkstream, {
        onData: (exchange) => {
          console.log(`[${dataValidationWorkstream}] Received data from ${exchange.sourceWorkstream}`);
          resolve(exchange.data);
        }
      });
    });
    
    const data = await dataPromise;
    
    // Validate the data
    await simulateWork(`[${dataValidationWorkstream}] Validating ${data.records.length} records`, 1500);
    
    // Check for validation issues
    const invalidRecords = data.records.filter(record => !record.email.includes('@'));
    
    if (invalidRecords.length > 0) {
      // Detect a conflict for invalid data
      const conflict = syncManager.detectConflict(
        'data-validation',
        [dataValidationWorkstream, dataIngestionWorkstream],
        'Invalid email addresses detected',
        ConflictType.DATA_CONFLICT,
        ConflictSeverity.HIGH,
        { invalidRecords }
      );
      
      // Resolve the conflict (in a real scenario, this would involve fixing the data)
      await syncManager.resolveConflict(conflict.id);
      console.log(`[${dataValidationWorkstream}] Resolved data validation conflict`);
    }
    
    // Signal that validation is complete
    const validationBarrier = syncManager.getPrimitive('validation-barrier');
    
    if (validationBarrier) {
      console.log(`[${dataValidationWorkstream}] Signaling validation complete`);
      await validationBarrier.signal(dataValidationWorkstream);
    } else {
      const newValidationBarrier = syncManager.createBarrier({
        parties: 2
      });
      
      console.log(`[${dataValidationWorkstream}] Signaling validation complete`);
      await newValidationBarrier.signal(dataValidationWorkstream);
    }
    
    // Create a data exchange channel for the validated data
    const validatedDataChannel = syncManager.createDataExchangeChannel(
      'validated-data-channel',
      DataExchangeType.BROADCAST
    );
    
    // Send the validated data to the transformation workstream
    console.log(`[${dataValidationWorkstream}] Broadcasting validated data`);
    await validatedDataChannel.send(
      dataValidationWorkstream,
      data,
      [dataTransformationWorkstream]
    );
    
    // Participate in the final synchronization
    const finalSyncPoint = syncManager.getSyncPoint('final-sync-point');
    
    if (finalSyncPoint) {
      console.log(`[${dataValidationWorkstream}] Participating in final synchronization`);
      const finalSyncResult = await syncManager.waitAtPartialSyncPoint(finalSyncPoint.id, dataValidationWorkstream);
      console.log(`[${dataValidationWorkstream}] Final synchronization result:`, finalSyncResult.status);
    }
    
  } catch (error) {
    console.error(`[${dataValidationWorkstream}] Error:`, error);
  }
}

// Data Transformation Workstream
async function runDataTransformationWorkstream(): Promise<void> {
  try {
    console.log(`[${dataTransformationWorkstream}] Starting data transformation workstream`);
    
    // Subscribe to the validated data channel
    const validatedDataChannel = syncManager.createDataExchangeChannel(
      'validated-data-channel',
      DataExchangeType.BROADCAST
    );
    
    // Wait for validated data to be available
    console.log(`[${dataTransformationWorkstream}] Waiting for validated data`);
    const dataPromise = new Promise<any>(resolve => {
      validatedDataChannel.subscribe(dataTransformationWorkstream, {
        onData: (exchange) => {
          console.log(`[${dataTransformationWorkstream}] Received validated data from ${exchange.sourceWorkstream}`);
          resolve(exchange.data);
        }
      });
    });
    
    const data = await dataPromise;
    
    // Transform the data
    await simulateWork(`[${dataTransformationWorkstream}] Transforming ${data.records.length} records`, 2000);
    
    // Apply transformations
    const transformedData = {
      records: data.records.map(record => ({
        ...record,
        name: record.name.toUpperCase(),
        ageGroup: record.age < 30 ? 'young' : 'adult'
      }))
    };
    
    // Create a data exchange channel for the transformed data
    const transformedDataChannel = syncManager.createDataExchangeChannel(
      'transformed-data-channel',
      DataExchangeType.BROADCAST
    );
    
    // Send the transformed data to the analysis workstream
    console.log(`[${dataTransformationWorkstream}] Broadcasting transformed data`);
    await transformedDataChannel.send(
      dataTransformationWorkstream,
      transformedData,
      [dataAnalysisWorkstream, dataExportWorkstream]
    );
    
    // Participate in the final synchronization
    const finalSyncPoint = syncManager.getSyncPoint('final-sync-point');
    
    if (finalSyncPoint) {
      console.log(`[${dataTransformationWorkstream}] Participating in final synchronization`);
      const finalSyncResult = await syncManager.waitAtPartialSyncPoint(finalSyncPoint.id, dataTransformationWorkstream);
      console.log(`[${dataTransformationWorkstream}] Final synchronization result:`, finalSyncResult.status);
    }
    
  } catch (error) {
    console.error(`[${dataTransformationWorkstream}] Error:`, error);
  }
}

// Data Analysis Workstream
async function runDataAnalysisWorkstream(): Promise<void> {
  try {
    console.log(`[${dataAnalysisWorkstream}] Starting data analysis workstream`);
    
    // Subscribe to the transformed data channel
    const transformedDataChannel = syncManager.createDataExchangeChannel(
      'transformed-data-channel',
      DataExchangeType.BROADCAST
    );
    
    // Wait for transformed data to be available
    console.log(`[${dataAnalysisWorkstream}] Waiting for transformed data`);
    const dataPromise = new Promise<any>(resolve => {
      transformedDataChannel.subscribe(dataAnalysisWorkstream, {
        onData: (exchange) => {
          console.log(`[${dataAnalysisWorkstream}] Received transformed data from ${exchange.sourceWorkstream}`);
          resolve(exchange.data);
        }
      });
    });
    
    const data = await dataPromise;
    
    // Analyze the data
    await simulateWork(`[${dataAnalysisWorkstream}] Analyzing ${data.records.length} records`, 2500);
    
    // Perform analysis
    const analysisResults = {
      totalRecords: data.records.length,
      averageAge: data.records.reduce((sum, record) => sum + record.age, 0) / data.records.length,
      ageGroups: {
        young: data.records.filter(record => record.ageGroup === 'young').length,
        adult: data.records.filter(record => record.ageGroup === 'adult').length
      }
    };
    
    // Create a data exchange channel for the analysis results
    const analysisResultsChannel = syncManager.createDataExchangeChannel(
      'analysis-results-channel',
      DataExchangeType.BROADCAST
    );
    
    // Send the analysis results to the export workstream
    console.log(`[${dataAnalysisWorkstream}] Broadcasting analysis results`);
    await analysisResultsChannel.send(
      dataAnalysisWorkstream,
      analysisResults,
      [dataExportWorkstream]
    );
    
    // Participate in the final synchronization
    const finalSyncPoint = syncManager.getSyncPoint('final-sync-point');
    
    if (finalSyncPoint) {
      console.log(`[${dataAnalysisWorkstream}] Participating in final synchronization`);
      const finalSyncResult = await syncManager.waitAtPartialSyncPoint(finalSyncPoint.id, dataAnalysisWorkstream);
      console.log(`[${dataAnalysisWorkstream}] Final synchronization result:`, finalSyncResult.status);
    }
    
  } catch (error) {
    console.error(`[${dataAnalysisWorkstream}] Error:`, error);
  }
}

// Data Export Workstream
async function runDataExportWorkstream(): Promise<void> {
  try {
    console.log(`[${dataExportWorkstream}] Starting data export workstream`);
    
    // Subscribe to the transformed data channel
    const transformedDataChannel = syncManager.createDataExchangeChannel(
      'transformed-data-channel',
      DataExchangeType.BROADCAST
    );
    
    // Subscribe to the analysis results channel
    const analysisResultsChannel = syncManager.createDataExchangeChannel(
      'analysis-results-channel',
      DataExchangeType.BROADCAST
    );
    
    // Wait for both transformed data and analysis results
    console.log(`[${dataExportWorkstream}] Waiting for transformed data and analysis results`);
    
    const transformedDataPromise = new Promise<any>(resolve => {
      transformedDataChannel.subscribe(dataExportWorkstream, {
        onData: (exchange) => {
          console.log(`[${dataExportWorkstream}] Received transformed data from ${exchange.sourceWorkstream}`);
          resolve(exchange.data);
        }
      });
    });
    
    const analysisResultsPromise = new Promise<any>(resolve => {
      analysisResultsChannel.subscribe(dataExportWorkstream, {
        onData: (exchange) => {
          console.log(`[${dataExportWorkstream}] Received analysis results from ${exchange.sourceWorkstream}`);
          resolve(exchange.data);
        }
      });
    });
    
    // Use a transaction to ensure both data sets are available
    const transaction = syncManager.beginTransaction([dataExportWorkstream]);
    
    let transformedData: any;
    let analysisResults: any;
    
    syncManager.addTransactionOperation(
      transaction.id,
      'get_transformed_data',
      'transformed-data-channel',
      {},
      async () => {
        transformedData = await transformedDataPromise;
        return transformedData;
      },
      async () => {
        // No-op for undo
      }
    );
    
    syncManager.addTransactionOperation(
      transaction.id,
      'get_analysis_results',
      'analysis-results-channel',
      {},
      async () => {
        analysisResults = await analysisResultsPromise;
        return analysisResults;
      },
      async () => {
        // No-op for undo
      }
    );
    
    // Commit the transaction to get both data sets
    await syncManager.commitTransaction(transaction.id);
    
    // Export the data
    await simulateWork(
      `[${dataExportWorkstream}] Exporting ${transformedData.records.length} records with analysis`,
      1500
    );
    
    // Combine the data for export
    const exportData = {
      transformedRecords: transformedData.records,
      analysisResults
    };
    
    console.log(`[${dataExportWorkstream}] Export complete:`, JSON.stringify(exportData, null, 2));
    
    // Send a notification that export is complete
    await syncManager.sendNotification(
      NotificationType.CUSTOM,
      [dataIngestionWorkstream, dataValidationWorkstream, dataTransformationWorkstream, dataAnalysisWorkstream],
      'Data export completed successfully',
      undefined,
      { exportTimestamp: Date.now() }
    );
    
    // Participate in the final synchronization
    const finalSyncPoint = syncManager.getSyncPoint('final-sync-point');
    
    if (finalSyncPoint) {
      console.log(`[${dataExportWorkstream}] Participating in final synchronization`);
      const finalSyncResult = await syncManager.waitAtPartialSyncPoint(finalSyncPoint.id, dataExportWorkstream);
      console.log(`[${dataExportWorkstream}] Final synchronization result:`, finalSyncResult.status);
    } else {
      // Create the final sync point if it doesn't exist
      const newFinalSyncPoint = syncManager.createPartialSyncPoint(
        [dataIngestionWorkstream, dataValidationWorkstream, dataTransformationWorkstream, dataAnalysisWorkstream, dataExportWorkstream],
        {
          minimumParticipants: 3,
          continueOnTimeout: true,
          requiredWorkstreams: [dataIngestionWorkstream, dataExportWorkstream]
        },
        {
          name: 'final-sync-point',
          timeout: 5000
        }
      );
      
      console.log(`[${dataExportWorkstream}] Participating in final synchronization`);
      const finalSyncResult = await syncManager.waitAtPartialSyncPoint(newFinalSyncPoint.id, dataExportWorkstream);
      console.log(`[${dataExportWorkstream}] Final synchronization result:`, finalSyncResult.status);
    }
    
  } catch (error) {
    console.error(`[${dataExportWorkstream}] Error:`, error);
  }
}

// Run all workstreams in parallel
async function runParallelWorkflow() {
  try {
    // Register conflict handlers
    syncManager.registerConflictHandler({
      canHandle: (type) => type === ConflictType.DATA_CONFLICT,
      handleConflict: async (conflict) => {
        console.log(`Resolving data conflict: ${conflict.reason}`);
        // In a real implementation, this would contain logic to resolve the conflict
        return conflict;
      }
    });
    
    // Start all workstreams in parallel
    const workstreams = [
      runDataIngestionWorkstream(),
      runDataValidationWorkstream(),
      runDataTransformationWorkstream(),
      runDataAnalysisWorkstream(),
      runDataExportWorkstream()
    ];
    
    // Wait for all workstreams to complete
    await Promise.all(workstreams);
    
    console.log('\nAll workstreams completed');
    
    // Clean up
    await syncManager.dispose();
    console.log('Synchronization manager disposed');
    
  } catch (error) {
    console.error('Error in parallel workflow:', error);
  }
}

// Run the parallel workflow
runParallelWorkflow().catch(console.error);

