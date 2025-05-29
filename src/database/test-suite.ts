/**
 * Test Suite for Task Master Database Infrastructure
 * Phase 4.1: Comprehensive Database & Event Storage Implementation
 */

import {
  getDatabaseManager,
  RequirementsModel,
  TasksModel,
  EventsModel,
  CorrelationsModel,
  EventStorageService,
  RequirementParserService,
  AnalyticsService,
  TaskMasterEventTypes,
  TaskMasterEventSources,
} from './index';

/**
 * Test configuration
 */
const TEST_CONFIG = {
  database: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'taskmaster_test',
    username: process.env.TEST_DB_USER || 'taskmaster_test',
    password: process.env.TEST_DB_PASSWORD || 'test_password',
    ssl: false,
    pool: { min: 1, max: 5, acquireTimeoutMillis: 10000, idleTimeoutMillis: 30000 },
  },
  redis: {
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
    db: parseInt(process.env.TEST_REDIS_DB || '1'),
  },
  elasticsearch: {
    node: process.env.TEST_ELASTICSEARCH_URL || 'http://localhost:9200',
    auth: {
      username: process.env.TEST_ELASTICSEARCH_USER || 'elastic',
      password: process.env.TEST_ELASTICSEARCH_PASSWORD || 'changeme',
    },
  },
};

/**
 * Test utilities
 */
class TestUtils {
  static async cleanupDatabase() {
    const dbManager = getDatabaseManager(TEST_CONFIG);
    const client = await dbManager.getPostgreSQLClient();
    
    try {
      await client.query('TRUNCATE TABLE events CASCADE');
      await client.query('TRUNCATE TABLE correlations CASCADE');
      await client.query('TRUNCATE TABLE tasks CASCADE');
      await client.query('TRUNCATE TABLE requirements CASCADE');
    } finally {
      client.release();
    }
  }

  static generateTestData() {
    return {
      requirement: {
        title: 'Test User Authentication System',
        description: 'Implement secure user login and registration functionality with JWT tokens',
        priority: 1,
        complexity_score: 8,
        estimated_hours: 40,
        metadata: {
          test_data: true,
          created_by: 'test-suite',
        },
      },
      task: {
        title: 'Implement JWT Authentication',
        description: 'Create JWT token generation and validation logic',
        priority: 1,
        estimated_hours: 16,
        assigned_to: 'test-developer@example.com',
        metadata: {
          test_data: true,
          created_by: 'test-suite',
        },
      },
      event: {
        event_type: TaskMasterEventTypes.TASK_CREATED,
        source: TaskMasterEventSources.TASK_MASTER,
        actor: 'test-user@example.com',
        action: 'create',
        payload: {
          test_data: true,
          created_by: 'test-suite',
        },
      },
    };
  }
}

/**
 * Database Connection Tests
 */
async function testDatabaseConnection() {
  console.log('🔌 Testing database connections...');
  
  const dbManager = getDatabaseManager(TEST_CONFIG);
  
  try {
    await dbManager.initialize();
    console.log('✅ Database connections initialized');
    
    const health = await dbManager.healthCheck();
    console.log('🏥 Health check results:', health);
    
    if (health.postgresql) {
      console.log('✅ PostgreSQL connection healthy');
    } else {
      throw new Error('PostgreSQL connection failed');
    }
    
    await dbManager.runMigrations();
    console.log('✅ Database migrations completed');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error);
    throw error;
  }
}

/**
 * Requirements Model Tests
 */
async function testRequirementsModel() {
  console.log('📝 Testing Requirements Model...');
  
  const model = new RequirementsModel();
  const testData = TestUtils.generateTestData();
  
  try {
    // Test create
    const requirement = await model.create(testData.requirement);
    console.log('✅ Requirement created:', requirement.id);
    
    // Test getById
    const retrieved = await model.getById(requirement.id);
    if (!retrieved || retrieved.title !== testData.requirement.title) {
      throw new Error('Retrieved requirement does not match created requirement');
    }
    console.log('✅ Requirement retrieved successfully');
    
    // Test update
    const updated = await model.update(requirement.id, { priority: 2 });
    if (!updated || updated.priority !== 2) {
      throw new Error('Requirement update failed');
    }
    console.log('✅ Requirement updated successfully');
    
    // Test find
    const found = await model.find({ priority: 2, limit: 10 });
    if (found.length === 0) {
      throw new Error('Requirement find failed');
    }
    console.log('✅ Requirement find successful');
    
    // Test statistics
    const stats = await model.getStatistics();
    console.log('📊 Requirement statistics:', stats);
    
    return requirement;
    
  } catch (error) {
    console.error('❌ Requirements model test failed:', error);
    throw error;
  }
}

/**
 * Tasks Model Tests
 */
async function testTasksModel(requirementId: string) {
  console.log('📋 Testing Tasks Model...');
  
  const model = new TasksModel();
  const testData = TestUtils.generateTestData();
  
  try {
    // Test create
    const task = await model.create({
      ...testData.task,
      requirement_id: requirementId,
      linear_issue_id: 'TEST-123',
    });
    console.log('✅ Task created:', task.id);
    
    // Test getById
    const retrieved = await model.getById(task.id);
    if (!retrieved || retrieved.title !== testData.task.title) {
      throw new Error('Retrieved task does not match created task');
    }
    console.log('✅ Task retrieved successfully');
    
    // Test getByLinearIssueId
    const byLinear = await model.getByLinearIssueId('TEST-123');
    if (!byLinear || byLinear.id !== task.id) {
      throw new Error('Task retrieval by Linear ID failed');
    }
    console.log('✅ Task retrieved by Linear ID successfully');
    
    // Test update
    const updated = await model.update(task.id, { status: 'in_progress' });
    if (!updated || updated.status !== 'in_progress') {
      throw new Error('Task update failed');
    }
    console.log('✅ Task updated successfully');
    
    // Test statistics
    const stats = await model.getStatistics();
    console.log('📊 Task statistics:', stats);
    
    return task;
    
  } catch (error) {
    console.error('❌ Tasks model test failed:', error);
    throw error;
  }
}

/**
 * Event Storage Tests
 */
async function testEventStorage(taskId: string) {
  console.log('⚡ Testing Event Storage...');
  
  const eventStorage = new EventStorageService({
    batchSize: 5,
    flushInterval: 1000,
    enableDeduplication: true,
    retentionDays: 30,
  });
  
  try {
    // Test single event ingestion
    await eventStorage.ingestEvent({
      event_type: TaskMasterEventTypes.TASK_UPDATED,
      source: TaskMasterEventSources.TASK_MASTER,
      actor: 'test-user@example.com',
      target_type: 'task',
      target_id: taskId,
      action: 'update_status',
      payload: {
        previous_status: 'pending',
        new_status: 'in_progress',
        test_data: true,
      },
    });
    console.log('✅ Single event ingested');
    
    // Test batch event ingestion
    const batchEvents = Array.from({ length: 10 }, (_, i) => ({
      event_type: TaskMasterEventTypes.SYSTEM_STARTED,
      source: TaskMasterEventSources.SYSTEM,
      action: `test_action_${i}`,
      payload: { batch_index: i, test_data: true },
    }));
    
    await eventStorage.ingestEvents(batchEvents);
    console.log('✅ Batch events ingested');
    
    // Wait for flush
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test event querying
    const events = await eventStorage.queryEvents({
      target_type: 'task',
      target_id: taskId,
      limit: 10,
    });
    
    if (events.length === 0) {
      throw new Error('No events found for task');
    }
    console.log(`✅ Found ${events.length} events for task`);
    
    // Test event timeline
    const timeline = await eventStorage.getEventTimeline('task', taskId);
    console.log(`✅ Task timeline has ${timeline.length} events`);
    
    await eventStorage.shutdown();
    return events[0];
    
  } catch (error) {
    console.error('❌ Event storage test failed:', error);
    await eventStorage.shutdown();
    throw error;
  }
}

/**
 * Requirement Parser Tests
 */
async function testRequirementParser() {
  console.log('🔍 Testing Requirement Parser...');
  
  const eventStorage = new EventStorageService();
  const parser = new RequirementParserService(eventStorage);
  
  try {
    const requirementsText = `
## Feature 1: Advanced Search System

Description: Implement a comprehensive search system with filters, sorting, and pagination.

Acceptance Criteria:
- Users can search by keywords
- Results can be filtered by category and date
- Results are paginated with 20 items per page
- Search is case-insensitive

Technical Notes:
- Use Elasticsearch for search indexing
- Implement debounced search input
- Add search analytics tracking

Dependencies:
- Elasticsearch cluster setup
- Search index configuration

Risks:
- Performance issues with large datasets
- Search relevance tuning complexity

## Feature 2: Real-time Notifications

Description: Implement real-time notification system using WebSockets.

Acceptance Criteria:
- Users receive instant notifications
- Notifications are categorized by type
- Users can mark notifications as read
- Notification history is maintained

Technical Notes:
- Use Socket.IO for WebSocket connections
- Implement notification queuing
- Add push notification support for mobile
    `;
    
    // Test parsing
    const parsed = await parser.parseRequirementsFile(requirementsText, 'test-requirements.txt');
    console.log(`✅ Parsed ${parsed.length} requirements`);
    
    if (parsed.length !== 2) {
      throw new Error(`Expected 2 requirements, got ${parsed.length}`);
    }
    
    // Test quality analysis
    for (const requirement of parsed) {
      const analysis = await parser.analyzeRequirement(requirement);
      console.log(`📊 Requirement "${requirement.title}" quality: ${analysis.overall_quality.toFixed(1)}/100`);
      
      if (analysis.overall_quality < 50) {
        console.warn(`⚠️ Low quality requirement detected: ${requirement.title}`);
      }
    }
    
    // Test database creation
    const created = await parser.createRequirementsFromParsed(parsed);
    console.log(`✅ Created ${created.length} requirements in database`);
    
    await eventStorage.shutdown();
    return created;
    
  } catch (error) {
    console.error('❌ Requirement parser test failed:', error);
    await eventStorage.shutdown();
    throw error;
  }
}

/**
 * Analytics Tests
 */
async function testAnalytics() {
  console.log('📈 Testing Analytics Service...');
  
  const eventStorage = new EventStorageService();
  const analytics = new AnalyticsService(eventStorage);
  
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    // Test performance metrics
    const performance = await analytics.getPerformanceMetrics(startDate, endDate);
    console.log('📊 Performance metrics:', performance);
    
    // Test project metrics
    const project = await analytics.getProjectMetrics(startDate, endDate);
    console.log('📊 Project metrics:', project);
    
    // Test user metrics
    const user = await analytics.getUserMetrics(startDate, endDate);
    console.log('📊 User metrics:', user);
    
    // Test system health
    const health = await analytics.getSystemHealth();
    console.log('🏥 System health:', health);
    
    // Test dashboard data
    const dashboard = await analytics.getDashboardData();
    console.log('🎛️ Dashboard data:', dashboard);
    
    // Test full report generation
    const report = await analytics.generateReport(startDate, endDate, 'test-report');
    console.log(`📋 Generated report with ${report.insights.length} insights and ${report.recommendations.length} recommendations`);
    
    await eventStorage.shutdown();
    return report;
    
  } catch (error) {
    console.error('❌ Analytics test failed:', error);
    await eventStorage.shutdown();
    throw error;
  }
}

/**
 * Correlations Tests
 */
async function testCorrelations(taskId: string) {
  console.log('🔗 Testing Correlations Model...');
  
  const model = new CorrelationsModel();
  
  try {
    // Test create
    const correlation = await model.create({
      task_master_id: taskId,
      linear_issue_id: 'TEST-456',
      github_pr_id: 'PR-789',
      codegen_request_id: 'req_test_123',
      claude_session_id: 'session_test_456',
      wsl2_deployment_id: 'deploy_test_789',
      status: 'active',
      metadata: {
        test_data: true,
        created_by: 'test-suite',
      },
    });
    console.log('✅ Correlation created:', correlation.id);
    
    // Test retrieval by different IDs
    const byLinear = await model.getByLinearIssueId('TEST-456');
    if (!byLinear || byLinear.id !== correlation.id) {
      throw new Error('Correlation retrieval by Linear ID failed');
    }
    console.log('✅ Correlation retrieved by Linear ID');
    
    const byGithub = await model.getByGithubPrId('PR-789');
    if (!byGithub || byGithub.id !== correlation.id) {
      throw new Error('Correlation retrieval by GitHub PR ID failed');
    }
    console.log('✅ Correlation retrieved by GitHub PR ID');
    
    // Test upsert
    const upserted = await model.upsertByLinearIssueId('TEST-456', {
      status: 'completed',
      metadata: { updated: true },
    });
    if (upserted.status !== 'completed') {
      throw new Error('Correlation upsert failed');
    }
    console.log('✅ Correlation upserted successfully');
    
    // Test statistics
    const stats = await model.getStatistics();
    console.log('📊 Correlation statistics:', stats);
    
    return correlation;
    
  } catch (error) {
    console.error('❌ Correlations test failed:', error);
    throw error;
  }
}

/**
 * Integration Tests
 */
async function testIntegration() {
  console.log('🔄 Testing Integration Workflow...');
  
  try {
    // Clean up before testing
    await TestUtils.cleanupDatabase();
    
    // Test full workflow
    const requirement = await testRequirementsModel();
    const task = await testTasksModel(requirement.id);
    const event = await testEventStorage(task.id);
    const correlation = await testCorrelations(task.id);
    
    // Test cross-references
    console.log('🔍 Testing cross-references...');
    
    const tasksModel = new TasksModel();
    const tasksByRequirement = await tasksModel.getByRequirement(requirement.id);
    if (tasksByRequirement.length === 0) {
      throw new Error('No tasks found for requirement');
    }
    console.log('✅ Tasks found for requirement');
    
    const eventsModel = new EventsModel();
    const eventsByTarget = await eventsModel.getByTarget('task', task.id);
    if (eventsByTarget.length === 0) {
      throw new Error('No events found for task');
    }
    console.log('✅ Events found for task');
    
    console.log('✅ Integration workflow completed successfully');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error);
    throw error;
  }
}

/**
 * Performance Tests
 */
async function testPerformance() {
  console.log('⚡ Testing Performance...');
  
  const eventStorage = new EventStorageService({
    batchSize: 100,
    flushInterval: 1000,
  });
  
  try {
    const startTime = Date.now();
    
    // Test high-volume event ingestion
    const events = Array.from({ length: 1000 }, (_, i) => ({
      event_type: TaskMasterEventTypes.SYSTEM_STARTED,
      source: TaskMasterEventSources.SYSTEM,
      action: `performance_test_${i}`,
      payload: { index: i, timestamp: Date.now() },
    }));
    
    await eventStorage.ingestEvents(events);
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for processing
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const eventsPerSecond = (events.length / duration) * 1000;
    
    console.log(`📊 Performance Results:`);
    console.log(`  - Events processed: ${events.length}`);
    console.log(`  - Duration: ${duration}ms`);
    console.log(`  - Events per second: ${eventsPerSecond.toFixed(2)}`);
    
    if (eventsPerSecond < 100) {
      console.warn('⚠️ Performance below expected threshold');
    } else {
      console.log('✅ Performance meets requirements');
    }
    
    await eventStorage.shutdown();
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
    await eventStorage.shutdown();
    throw error;
  }
}

/**
 * Main test runner
 */
async function runTestSuite() {
  console.log('🧪 Starting Task Master Database Test Suite');
  console.log('================================================');
  
  const startTime = Date.now();
  let testsRun = 0;
  let testsPassed = 0;
  
  const tests = [
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Requirements Model', fn: testRequirementsModel },
    { name: 'Requirement Parser', fn: testRequirementParser },
    { name: 'Analytics Service', fn: testAnalytics },
    { name: 'Integration Workflow', fn: testIntegration },
    { name: 'Performance Tests', fn: testPerformance },
  ];
  
  for (const test of tests) {
    testsRun++;
    try {
      console.log(`\n🧪 Running ${test.name}...`);
      await test.fn();
      testsPassed++;
      console.log(`✅ ${test.name} passed`);
    } catch (error) {
      console.error(`❌ ${test.name} failed:`, error);
    }
  }
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  console.log('\n================================================');
  console.log('🏁 Test Suite Results:');
  console.log(`  - Tests run: ${testsRun}`);
  console.log(`  - Tests passed: ${testsPassed}`);
  console.log(`  - Tests failed: ${testsRun - testsPassed}`);
  console.log(`  - Success rate: ${((testsPassed / testsRun) * 100).toFixed(1)}%`);
  console.log(`  - Duration: ${duration}ms`);
  
  if (testsPassed === testsRun) {
    console.log('🎉 All tests passed!');
    return true;
  } else {
    console.log('💥 Some tests failed!');
    return false;
  }
}

// Export for use in other files
export {
  runTestSuite,
  TestUtils,
  testDatabaseConnection,
  testRequirementsModel,
  testTasksModel,
  testEventStorage,
  testRequirementParser,
  testAnalytics,
  testCorrelations,
  testIntegration,
  testPerformance,
};

// Run tests if this file is executed directly
if (require.main === module) {
  runTestSuite()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('💥 Test suite crashed:', error);
      process.exit(1);
    });
}

