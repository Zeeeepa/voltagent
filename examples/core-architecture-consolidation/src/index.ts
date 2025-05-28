/**
 * Core Architecture Consolidation Example
 * 
 * Demonstrates the unified VoltAgent core system architecture with:
 * - Unified system initialization
 * - Centralized configuration management
 * - Core orchestration capabilities
 * - Standardized event handling
 * - Zero duplication architecture
 */

import { 
  initializeSystem, 
  createCoreOrchestrator,
  loadConfigFromEnvironment,
  getUnifiedEventManager,
  Agent,
  type SystemConfig,
} from '@voltagent/core';

// Mock LLM provider for demonstration
const mockLLM = {
  generateText: async () => ({ text: 'Mock response' }),
  streamText: async () => ({ textStream: async function* () { yield 'Mock'; } }),
  generateObject: async () => ({ object: { result: 'mock' } }),
  streamObject: async () => ({ objectStream: async function* () { yield { result: 'mock' }; } }),
  getModelIdentifier: () => 'mock-model',
};

/**
 * Main demonstration function
 */
async function demonstrateCoreArchitecture() {
  console.log('🚀 Starting Core Architecture Consolidation Demo\n');

  try {
    // 1. Load configuration from environment
    console.log('📋 Loading configuration...');
    const envConfig = loadConfigFromEnvironment();
    
    // 2. Create comprehensive system configuration
    const systemConfig: SystemConfig = {
      ...envConfig,
      orchestrator: {
        maxConcurrentOperations: 25,
        defaultTimeout: 30000,
        autoCleanup: true,
        cleanupInterval: 60000,
        enableTelemetry: true,
        enableEventPropagation: true,
        ...envConfig.orchestrator,
      },
      server: {
        port: 3141,
        autoStart: true,
        enableWebSocket: true,
        ...envConfig.server,
      },
      telemetry: {
        enabled: true,
        ...envConfig.telemetry,
      },
      dependencies: {
        checkUpdates: true,
        autoUpdate: false,
        ...envConfig.dependencies,
      },
      logging: {
        level: 'info',
        structured: false,
        ...envConfig.logging,
      },
    };

    console.log('✅ Configuration loaded and validated\n');

    // 3. Create agents for demonstration
    console.log('🤖 Creating demonstration agents...');
    const agents = {
      'data-processor': new Agent({
        name: 'Data Processor',
        instructions: 'Efficiently process and analyze various types of data',
        llm: mockLLM,
        model: 'mock-model' as any,
        tools: [],
      }),
      'report-generator': new Agent({
        name: 'Report Generator',
        instructions: 'Generate comprehensive and insightful reports',
        llm: mockLLM,
        model: 'mock-model' as any,
        tools: [],
      }),
      'task-coordinator': new Agent({
        name: 'Task Coordinator',
        instructions: 'Coordinate and manage complex multi-step tasks',
        llm: mockLLM,
        model: 'mock-model' as any,
        tools: [],
      }),
    };

    console.log(`✅ Created ${Object.keys(agents).length} agents\n`);

    // 4. Initialize the unified system
    console.log('🔧 Initializing unified core system...');
    const system = await initializeSystem(agents, systemConfig);

    console.log('✅ Core system initialized successfully!');
    console.log(`📊 Initial Statistics:`, system.orchestrator.getStatistics());
    if (system.server) {
      console.log(`🌐 Server running at: ${system.server.url}`);
    }
    console.log(`📡 Telemetry enabled: ${system.telemetryEnabled}\n`);

    // 5. Demonstrate core orchestrator operations
    await demonstrateOrchestration(system.orchestrator);

    // 6. Demonstrate unified event handling
    await demonstrateEventHandling();

    // 7. Demonstrate configuration management
    demonstrateConfigurationManagement();

    // 8. Monitor system performance
    await monitorSystemPerformance(system.orchestrator);

    // 9. Graceful shutdown demonstration
    console.log('\n🛑 Demonstrating graceful shutdown...');
    await system.orchestrator.shutdown();
    console.log('✅ System shutdown completed successfully');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

/**
 * Demonstrate core orchestration capabilities
 */
async function demonstrateOrchestration(orchestrator: any) {
  console.log('🎯 Demonstrating Core Orchestration...\n');

  try {
    // Start multiple operations
    const operations = [];
    
    operations.push(await orchestrator.startOperation(
      'data-processor',
      'analyze-dataset',
      'Analyze customer behavior patterns in the sales dataset'
    ));

    operations.push(await orchestrator.startOperation(
      'report-generator',
      'create-report',
      'Generate monthly performance report'
    ));

    operations.push(await orchestrator.startOperation(
      'task-coordinator',
      'coordinate-workflow',
      'Coordinate data processing and report generation workflow'
    ));

    console.log(`🚀 Started ${operations.length} operations:`);
    operations.forEach((opId, index) => {
      console.log(`   ${index + 1}. Operation ID: ${opId}`);
    });

    // Simulate operation completion
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Update operation statuses
    orchestrator.updateOperationStatus(operations[0], 'completed', { 
      insights: 'Customer behavior analysis complete',
      patterns: ['seasonal trends', 'purchase preferences']
    });

    orchestrator.updateOperationStatus(operations[1], 'completed', {
      report: 'Monthly performance report generated',
      metrics: { revenue: 150000, growth: 12 }
    });

    orchestrator.updateOperationStatus(operations[2], 'completed', {
      workflow: 'Coordination workflow completed successfully'
    });

    // Display final statistics
    const finalStats = orchestrator.getStatistics();
    console.log('\n📊 Final Orchestration Statistics:');
    console.log(`   Total Operations: ${finalStats.totalOperations}`);
    console.log(`   Completed Operations: ${finalStats.completedOperations}`);
    console.log(`   Running Operations: ${finalStats.runningOperations}`);
    console.log(`   Registered Agents: ${finalStats.registeredAgents}\n`);

  } catch (error) {
    console.error('❌ Orchestration demo failed:', error);
  }
}

/**
 * Demonstrate unified event handling
 */
async function demonstrateEventHandling() {
  console.log('📡 Demonstrating Unified Event Handling...\n');

  const eventManager = getUnifiedEventManager();

  // Set up event listeners
  eventManager.on('agent:started', (payload) => {
    console.log(`🟢 Agent started: ${payload.agentId}`);
  });

  eventManager.on('agent:completed', (payload) => {
    console.log(`✅ Agent completed: ${payload.agentId}`);
  });

  eventManager.on('operation:started', (payload) => {
    console.log(`🚀 Operation started: ${payload.operationId}`);
  });

  eventManager.on('operation:completed', (payload) => {
    console.log(`🎯 Operation completed: ${payload.operationId}`);
  });

  // Add custom event filter
  eventManager.addEventFilter('high-priority', (payload) => {
    return payload.data.metadata?.priority === 'high';
  });

  // Emit sample events
  eventManager.emitAgentEvent('started', 'demo-agent', {
    affectedNodeId: 'agent_demo-agent',
    status: 'working',
    timestamp: new Date().toISOString(),
    sourceAgentId: 'demo-agent',
    metadata: { priority: 'high' }
  });

  eventManager.emitOperationEvent('started', 'demo-operation', 'demo-agent', {
    affectedNodeId: 'operation_demo-operation',
    status: 'working',
    timestamp: new Date().toISOString(),
    sourceAgentId: 'demo-agent',
  });

  // Wait for events to process
  await new Promise(resolve => setTimeout(resolve, 500));

  // Display event metrics
  const metrics = eventManager.getEventMetrics();
  console.log('\n📈 Event Metrics:');
  Object.entries(metrics).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });
  console.log();
}

/**
 * Demonstrate configuration management
 */
function demonstrateConfigurationManagement() {
  console.log('⚙️ Demonstrating Configuration Management...\n');

  try {
    // Import configuration manager
    const { getConfigManager } = require('@voltagent/core');
    const configManager = getConfigManager();

    // Display current configuration
    const config = configManager.getConfig();
    console.log('📋 Current Configuration:');
    console.log(`   Max Concurrent Operations: ${config.orchestrator.maxConcurrentOperations}`);
    console.log(`   Default Timeout: ${config.orchestrator.defaultTimeout}ms`);
    console.log(`   Server Port: ${config.server.port}`);
    console.log(`   Telemetry Enabled: ${config.telemetry.enabled}`);
    console.log(`   Log Level: ${config.logging.level}`);

    // Export configuration to environment format
    const envVars = configManager.exportToEnv();
    console.log('\n🌍 Environment Variables:');
    Object.entries(envVars).slice(0, 5).forEach(([key, value]) => {
      console.log(`   ${key}=${value}`);
    });
    console.log(`   ... and ${Object.keys(envVars).length - 5} more\n`);

  } catch (error) {
    console.log('⚠️ Configuration management demo skipped (module not available)\n');
  }
}

/**
 * Monitor system performance
 */
async function monitorSystemPerformance(orchestrator: any) {
  console.log('📊 Monitoring System Performance...\n');

  const startTime = Date.now();
  let iterations = 0;
  const maxIterations = 3;

  const monitorInterval = setInterval(() => {
    iterations++;
    const stats = orchestrator.getStatistics();
    const uptime = Date.now() - startTime;

    console.log(`📈 Performance Report #${iterations}:`);
    console.log(`   Uptime: ${uptime}ms`);
    console.log(`   Total Operations: ${stats.totalOperations}`);
    console.log(`   Active Operations: ${stats.runningOperations}`);
    console.log(`   Success Rate: ${stats.totalOperations > 0 ? 
      Math.round((stats.completedOperations / stats.totalOperations) * 100) : 0}%`);
    console.log(`   Registered Agents: ${stats.registeredAgents}`);

    if (iterations >= maxIterations) {
      clearInterval(monitorInterval);
      console.log('\n✅ Performance monitoring completed\n');
    } else {
      console.log();
    }
  }, 1000);

  // Wait for monitoring to complete
  await new Promise(resolve => setTimeout(resolve, maxIterations * 1000 + 500));
}

/**
 * Set up graceful shutdown handling
 */
function setupGracefulShutdown() {
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    try {
      const { shutdownSystem } = require('@voltagent/core');
      await shutdownSystem();
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Shutdown failed:', error);
      process.exit(1);
    }
  });

  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    try {
      const { shutdownSystem } = require('@voltagent/core');
      await shutdownSystem();
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Shutdown failed:', error);
      process.exit(1);
    }
  });
}

// Main execution
if (require.main === module) {
  setupGracefulShutdown();
  demonstrateCoreArchitecture().catch((error) => {
    console.error('❌ Demo execution failed:', error);
    process.exit(1);
  });
}

export { demonstrateCoreArchitecture };

