/**
 * Example Usage of Task Master Database Infrastructure
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
 * Example: Complete Task Master Database Workflow
 */
async function exampleWorkflow() {
  console.log('🚀 Starting Task Master Database Example Workflow');

  // 1. Initialize database connections
  const dbManager = getDatabaseManager();
  await dbManager.initialize();
  await dbManager.runMigrations();

  // 2. Initialize services
  const eventStorage = new EventStorageService({
    batchSize: 50,
    flushInterval: 3000,
    enableDeduplication: true,
    retentionDays: 90,
  });

  const requirementParser = new RequirementParserService(eventStorage);
  const analytics = new AnalyticsService(eventStorage);

  // 3. Initialize models
  const requirementsModel = new RequirementsModel();
  const tasksModel = new TasksModel();
  const eventsModel = new EventsModel();
  const correlationsModel = new CorrelationsModel();

  try {
    // 4. Example: Parse requirements from text
    console.log('📝 Parsing requirements from text...');
    const requirementsText = `
## Feature 1: User Authentication System

Description: Implement a secure user authentication system with login, logout, and session management.

Acceptance Criteria:
- Users can register with email and password
- Users can login with valid credentials
- Users can logout and session is terminated
- Password must meet security requirements

Technical Notes:
- Use JWT tokens for session management
- Implement password hashing with bcrypt
- Add rate limiting for login attempts

Dependencies:
- Database user table setup
- Email service integration

Risks:
- Security vulnerabilities if not implemented correctly
- Performance issues with high concurrent users

## Feature 2: Task Management Dashboard

Description: Create a dashboard for users to view and manage their tasks.

Acceptance Criteria:
- Display list of user's tasks
- Allow filtering by status and priority
- Enable task creation and editing
- Show task statistics

Technical Notes:
- Use React for frontend components
- Implement real-time updates with WebSockets
- Add pagination for large task lists
    `;

    const parsedRequirements = await requirementParser.parseRequirementsFile(requirementsText);
    console.log(`✅ Parsed ${parsedRequirements.length} requirements`);

    // 5. Create requirements in database
    console.log('💾 Creating requirements in database...');
    const createdRequirements = await requirementParser.createRequirementsFromParsed(parsedRequirements);
    console.log(`✅ Created ${createdRequirements.length} requirements in database`);

    // 6. Analyze requirement quality
    console.log('🔍 Analyzing requirement quality...');
    for (const parsed of parsedRequirements) {
      const analysis = await requirementParser.analyzeRequirement(parsed);
      console.log(`📊 Requirement "${parsed.title}" quality score: ${analysis.overall_quality.toFixed(1)}/100`);
    }

    // 7. Create tasks from requirements
    console.log('📋 Creating tasks from requirements...');
    const tasks = [];
    for (const requirement of createdRequirements) {
      const task = await tasksModel.create({
        requirement_id: requirement.id,
        linear_issue_id: `ZAM-${Math.floor(Math.random() * 1000)}`,
        title: `Implement: ${requirement.title}`,
        description: `Task to implement requirement: ${requirement.description}`,
        priority: requirement.priority,
        estimated_hours: requirement.estimated_hours,
        assigned_to: 'developer@example.com',
        metadata: {
          requirement_title: requirement.title,
          created_from: 'requirement',
        },
      });
      tasks.push(task);
    }
    console.log(`✅ Created ${tasks.length} tasks`);

    // 8. Create correlations for cross-system tracking
    console.log('🔗 Creating correlations...');
    for (const task of tasks) {
      await correlationsModel.create({
        task_master_id: task.id,
        linear_issue_id: task.linear_issue_id,
        github_pr_id: `PR-${Math.floor(Math.random() * 1000)}`,
        codegen_request_id: `req_${Date.now()}`,
        status: 'active',
        metadata: {
          task_title: task.title,
          created_at: new Date().toISOString(),
        },
      });
    }
    console.log('✅ Created correlations');

    // 9. Simulate task progress with events
    console.log('⚡ Simulating task progress with events...');
    for (const task of tasks.slice(0, 2)) {
      // Task started
      await eventStorage.ingestEvent({
        event_type: TaskMasterEventTypes.TASK_UPDATED,
        source: TaskMasterEventSources.TASK_MASTER,
        actor: 'developer@example.com',
        target_type: 'task',
        target_id: task.id,
        action: 'start',
        payload: {
          task_id: task.id,
          previous_status: 'pending',
          new_status: 'in_progress',
        },
      });

      // Update task status
      await tasksModel.update(task.id, { status: 'in_progress' });

      // Simulate some work time
      await new Promise(resolve => setTimeout(resolve, 100));

      // Task completed
      await eventStorage.ingestEvent({
        event_type: TaskMasterEventTypes.TASK_COMPLETED,
        source: TaskMasterEventSources.TASK_MASTER,
        actor: 'developer@example.com',
        target_type: 'task',
        target_id: task.id,
        action: 'complete',
        payload: {
          task_id: task.id,
          completion_time: new Date().toISOString(),
          actual_hours: Math.floor(Math.random() * 10) + 1,
        },
      });

      // Update task status
      await tasksModel.update(task.id, { 
        status: 'completed',
        actual_hours: Math.floor(Math.random() * 10) + 1,
      });
    }
    console.log('✅ Simulated task progress');

    // 10. Generate analytics report
    console.log('📈 Generating analytics report...');
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    const report = await analytics.generateReport(startDate, endDate, 'weekly');
    console.log('📊 Analytics Report Generated:');
    console.log(`  - Total Requirements: ${report.project_metrics.total_requirements}`);
    console.log(`  - Total Tasks: ${report.project_metrics.total_tasks}`);
    console.log(`  - Completion Rate: ${report.project_metrics.completion_rate.toFixed(1)}%`);
    console.log(`  - System Health: ${report.system_health.overall_status}`);
    console.log(`  - Insights: ${report.insights.length}`);
    console.log(`  - Recommendations: ${report.recommendations.length}`);

    // 11. Get real-time dashboard data
    console.log('📊 Getting dashboard data...');
    const dashboardData = await analytics.getDashboardData();
    console.log('🎛️ Dashboard Data:');
    console.log(`  - Active Tasks: ${dashboardData.active_tasks}`);
    console.log(`  - Completed Today: ${dashboardData.completed_today}`);
    console.log(`  - Pending Requirements: ${dashboardData.pending_requirements}`);
    console.log(`  - System Events Today: ${dashboardData.system_events_today}`);

    // 12. Query events and correlations
    console.log('🔍 Querying events and correlations...');
    const recentEvents = await eventsModel.find({ limit: 10 });
    console.log(`📝 Found ${recentEvents.length} recent events`);

    const correlations = await correlationsModel.find({ status: 'active' });
    console.log(`🔗 Found ${correlations.length} active correlations`);

    // 13. Test event timeline
    if (tasks.length > 0) {
      const timeline = await eventStorage.getEventTimeline('task', tasks[0].id);
      console.log(`📅 Task timeline has ${timeline.length} events`);
    }

    console.log('✅ Task Master Database Example Workflow Completed Successfully!');

  } catch (error) {
    console.error('❌ Error in example workflow:', error);
    throw error;
  } finally {
    // 14. Cleanup
    await eventStorage.shutdown();
    await dbManager.close();
  }
}

/**
 * Example: Event Processing Rules
 */
function setupEventProcessingRules(eventStorage: EventStorageService) {
  // Rule: Log all task completions
  eventStorage.addProcessingRule({
    eventType: TaskMasterEventTypes.TASK_COMPLETED,
    processor: async (event) => {
      console.log(`🎉 Task completed: ${event.target_id} by ${event.actor}`);
    },
  });

  // Rule: Alert on system errors
  eventStorage.addProcessingRule({
    eventType: TaskMasterEventTypes.SYSTEM_ERROR,
    processor: async (event) => {
      console.error(`🚨 System error detected: ${event.payload.error}`);
      // In real implementation, send alert to monitoring system
    },
  });

  // Rule: Track requirement analysis
  eventStorage.addProcessingRule({
    eventType: TaskMasterEventTypes.REQUIREMENT_ANALYZED,
    processor: async (event) => {
      console.log(`🔍 Requirement analyzed: ${event.target_id}`);
      // In real implementation, update analytics dashboard
    },
  });
}

/**
 * Example: Custom Analytics Queries
 */
async function customAnalyticsExamples() {
  const analytics = new AnalyticsService(new EventStorageService());
  
  // Get performance metrics for last 30 days
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  const performanceMetrics = await analytics.getPerformanceMetrics(startDate, endDate);
  console.log('Performance Metrics:', performanceMetrics);
  
  // Get system health
  const health = await analytics.getSystemHealth();
  console.log('System Health:', health);
  
  // Get trend data
  const trends = await analytics.getTrendData(startDate, endDate);
  console.log('Trend Data:', trends);
}

// Export examples for use
export {
  exampleWorkflow,
  setupEventProcessingRules,
  customAnalyticsExamples,
};

// Run example if this file is executed directly
if (require.main === module) {
  exampleWorkflow()
    .then(() => {
      console.log('🎯 Example completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Example failed:', error);
      process.exit(1);
    });
}

