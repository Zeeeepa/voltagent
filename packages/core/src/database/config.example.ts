/**
 * Example configuration for EventStore database setup
 */

import { EventStore, EventStorageIntegration, DatabaseHealthMonitor } from './index';
import type { EventStoreDatabaseConfig } from './config';

// Example configuration for development
export const developmentConfig: EventStoreDatabaseConfig = {
  host: 'localhost',
  port: 5432,
  database: 'codegen_db',
  user: 'codegen_user',
  password: 'codegen_password',
  ssl: false,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 20,
  min: 2,
  tablePrefix: 'voltagent_events',
  enableHealthMonitoring: true,
  healthCheckInterval: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
};

// Example configuration for production
export const productionConfig: EventStoreDatabaseConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DATABASE || 'codegen_db',
  user: process.env.POSTGRES_USER || 'codegen_user',
  password: process.env.POSTGRES_PASSWORD || '',
  ssl: process.env.POSTGRES_SSL_MODE === 'require',
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 50, // Higher connection pool for production
  min: 5,
  tablePrefix: 'voltagent_events',
  enableHealthMonitoring: true,
  healthCheckInterval: 15000, // More frequent health checks
  retryAttempts: 5,
  retryDelay: 2000,
};

/**
 * Example usage of the EventStore system
 */
export async function setupEventStore(config: EventStoreDatabaseConfig) {
  // Initialize EventStore
  const eventStore = new EventStore(config);
  await eventStore.initialize();

  // Setup health monitoring
  const healthMonitor = new DatabaseHealthMonitor(eventStore['db'], config.healthCheckInterval);
  healthMonitor.setupAutoReconnect();
  healthMonitor.start();

  // Setup integration with existing event system
  const integration = new EventStorageIntegration(eventStore);

  // Log a test event
  await eventStore.logSystemEvent({
    event_type: 'system',
    event_name: 'event_store_initialized',
    data: {
      config: {
        host: config.host,
        database: config.database,
        tablePrefix: config.tablePrefix,
      },
    },
    status: 'completed',
  });

  console.log('EventStore system initialized successfully');

  return {
    eventStore,
    healthMonitor,
    integration,
  };
}

/**
 * Example of logging different types of events
 */
export async function exampleEventLogging(eventStore: EventStore) {
  // Log a task event
  await eventStore.logTaskEvent({
    task_id: 'task-123',
    task_name: 'Process User Request',
    agent_id: 'agent-456',
    event_type: 'task_execution',
    event_name: 'task_started',
    status: 'started',
    input_data: {
      userId: 'user-789',
      requestType: 'data_analysis',
    },
  });

  // Log an agent event
  await eventStore.logAgentEvent({
    agent_id: 'agent-456',
    agent_name: 'DataAnalysisAgent',
    event_type: 'agent_action',
    event_name: 'tool_execution',
    action: 'execute_tool',
    status: 'completed',
    context: {
      toolName: 'data_processor',
      parameters: { format: 'json' },
    },
    result: {
      success: true,
      outputSize: 1024,
    },
  });

  // Log a deployment event
  await eventStore.logDeploymentEvent({
    deployment_id: 'deploy-789',
    environment: 'wsl2',
    event_type: 'deployment',
    event_name: 'pr_deployment',
    status: 'completed',
    branch_name: 'feature/new-functionality',
    commit_hash: 'abc123def456',
    pr_number: 42,
    deployment_config: {
      environment: 'staging',
      replicas: 2,
    },
  });
}

/**
 * Example of querying events and getting statistics
 */
export async function exampleEventQuerying(eventStore: EventStore) {
  // Query recent system events
  const recentEvents = await eventStore.querySystemEvents({
    limit: 10,
    orderBy: 'timestamp',
    orderDirection: 'DESC',
  });

  console.log('Recent events:', recentEvents);

  // Query events for a specific agent
  const agentEvents = await eventStore.querySystemEvents({
    agentId: 'agent-456',
    limit: 50,
  });

  console.log('Agent events:', agentEvents);

  // Get event statistics
  const stats = await eventStore.getEventStatistics({
    startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  });

  console.log('Event statistics:', stats);

  // Get health status
  const health = await eventStore.getHealthStatus();
  console.log('Database health:', health);
}

