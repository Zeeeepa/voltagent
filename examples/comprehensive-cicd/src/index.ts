import 'dotenv/config';
import { TaskStorageManager, ContextEngine } from '@voltagent/task-storage';
import { ApiServer } from '@voltagent/ci-cd-core';

async function main() {
  console.log('🚀 Starting VoltAgent Comprehensive CI/CD System...');

  try {
    // Initialize Task Storage Manager
    console.log('📦 Initializing Task Storage Manager...');
    const taskStorage = TaskStorageManager.fromEnvironment();
    await taskStorage.initialize();
    console.log('✅ Task Storage Manager initialized');

    // Initialize Context Engine
    console.log('🧠 Initializing Context Engine...');
    const contextEngine = new ContextEngine(taskStorage, {
      enableCaching: process.env.ENABLE_CONTEXT_CACHING === 'true',
      cacheTtlSeconds: parseInt(process.env.CONTEXT_CACHE_TTL || '3600'),
      enableCompression: process.env.ENABLE_CONTEXT_COMPRESSION === 'true',
      maxContextSizeMb: parseInt(process.env.MAX_CONTEXT_SIZE_MB || '10'),
    });
    console.log('✅ Context Engine initialized');

    // Initialize API Server
    console.log('🌐 Initializing API Server...');
    const apiServer = new ApiServer({
      port: parseInt(process.env.API_PORT || '3001'),
      host: process.env.API_HOST || '0.0.0.0',
      enableCors: process.env.ENABLE_CORS === 'true',
      enableCompression: process.env.ENABLE_COMPRESSION === 'true',
      enableWebSocket: process.env.ENABLE_WEBSOCKET === 'true',
      taskStorage,
      contextEngine,
    });

    // Start the API server
    await apiServer.start();
    console.log('✅ API Server started');

    // Demonstrate the system with sample data
    await demonstrateSystem(taskStorage, contextEngine);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down gracefully...');
      await apiServer.stop();
      await taskStorage.close();
      console.log('✅ Shutdown complete');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      await apiServer.stop();
      await taskStorage.close();
      console.log('✅ Shutdown complete');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start CI/CD system:', error);
    process.exit(1);
  }
}

async function demonstrateSystem(taskStorage: TaskStorageManager, contextEngine: ContextEngine) {
  console.log('\n🎯 Demonstrating CI/CD System Capabilities...');

  try {
    // Create a sample project workflow
    const projectTask = await taskStorage.createTask({
      title: 'Build User Authentication System',
      description: 'Implement comprehensive user authentication with JWT tokens, password hashing, and role-based access control',
      requirements: {
        features: ['Login/Logout', 'Registration', 'Password Reset', 'Role Management'],
        technologies: ['Node.js', 'Express', 'JWT', 'bcrypt', 'PostgreSQL'],
        security: ['Input validation', 'Rate limiting', 'HTTPS only'],
      },
      acceptance_criteria: {
        functional: [
          'Users can register with email and password',
          'Users can login and receive JWT token',
          'Password reset functionality works',
          'Admin can manage user roles',
        ],
        technical: [
          'All passwords are hashed with bcrypt',
          'JWT tokens expire after 24 hours',
          'Rate limiting prevents brute force attacks',
          'All endpoints require HTTPS',
        ],
      },
      complexity_score: 8,
      priority: 'high',
      estimated_hours: 40,
      project_id: 'auth-system-v1',
      tags: ['authentication', 'security', 'backend'],
    });

    console.log(`✅ Created project task: ${projectTask.id}`);

    // Create subtasks
    const subtasks = [
      {
        title: 'Design Database Schema',
        description: 'Create users, roles, and permissions tables',
        parent_task_id: projectTask.id,
        complexity_score: 3,
        estimated_hours: 4,
        tags: ['database', 'design'],
      },
      {
        title: 'Implement User Registration',
        description: 'Create registration endpoint with validation',
        parent_task_id: projectTask.id,
        complexity_score: 5,
        estimated_hours: 8,
        tags: ['api', 'validation'],
      },
      {
        title: 'Implement Authentication Middleware',
        description: 'JWT token validation and route protection',
        parent_task_id: projectTask.id,
        complexity_score: 6,
        estimated_hours: 10,
        tags: ['middleware', 'jwt'],
      },
    ];

    const createdSubtasks = [];
    for (const subtask of subtasks) {
      const created = await taskStorage.createTask(subtask);
      createdSubtasks.push(created);
      console.log(`✅ Created subtask: ${created.title}`);
    }

    // Store context for the main task
    await contextEngine.storeTaskContext(projectTask.id, 'requirements', {
      business_requirements: {
        target_users: 'Web application users',
        expected_load: '1000 concurrent users',
        compliance: ['GDPR', 'CCPA'],
      },
      technical_requirements: {
        performance: 'Response time < 200ms',
        availability: '99.9% uptime',
        scalability: 'Horizontal scaling support',
      },
    });

    await contextEngine.storeTaskContext(projectTask.id, 'codebase_analysis', {
      existing_structure: {
        framework: 'Express.js',
        database: 'PostgreSQL',
        orm: 'Prisma',
        testing: 'Jest',
      },
      integration_points: [
        'User management API',
        'Email service',
        'Logging system',
      ],
    });

    console.log('✅ Stored task context');

    // Simulate AI interactions
    await taskStorage.storeAIInteraction(
      projectTask.id,
      'CodeGenAgent',
      'task_analysis',
      {
        prompt: 'Analyze the authentication system requirements and suggest implementation approach',
        context: 'User authentication system with JWT tokens',
      },
      {
        analysis: 'Recommended approach: Express.js with JWT, bcrypt for password hashing, rate limiting with express-rate-limit',
        estimated_complexity: 8,
        suggested_technologies: ['express', 'jsonwebtoken', 'bcrypt', 'express-rate-limit'],
      },
      1250,
      true,
      'session-123',
      'analysis'
    );

    console.log('✅ Stored AI interaction');

    // Store validation results
    await taskStorage.storeValidationResult(
      projectTask.id,
      'security',
      'SecurityValidator',
      'passed',
      95,
      {
        checks_performed: [
          'Password strength validation',
          'JWT token security',
          'Rate limiting configuration',
          'HTTPS enforcement',
        ],
        vulnerabilities_found: 0,
        recommendations: [
          'Consider implementing 2FA',
          'Add session management',
        ],
      },
      {
        improvements: [
          'Add password complexity requirements',
          'Implement account lockout after failed attempts',
        ],
      }
    );

    console.log('✅ Stored validation result');

    // Store performance metrics
    await taskStorage.storePerformanceMetric(
      projectTask.id,
      'execution_time',
      'task_analysis_time',
      1.25,
      'seconds',
      {
        agent: 'CodeGenAgent',
        complexity: 8,
        context_size: '2.5KB',
      }
    );

    console.log('✅ Stored performance metric');

    // Get analytics
    const analytics = await taskStorage.getTaskAnalytics();
    console.log('\n📊 Task Analytics:');
    console.log(`Total tasks: ${analytics.total_tasks}`);
    console.log(`Tasks by status:`, analytics.tasks_by_status);
    console.log(`Tasks by priority:`, analytics.tasks_by_priority);
    console.log(`Success rate: ${analytics.success_rate.toFixed(2)}%`);

    // Get context statistics
    const contextStats = await contextEngine.getContextStats(projectTask.id);
    console.log('\n🧠 Context Statistics:');
    console.log(`Total contexts: ${contextStats.total_contexts}`);
    console.log(`Contexts by type:`, contextStats.contexts_by_type);
    console.log(`Average size: ${contextStats.average_size_bytes.toFixed(0)} bytes`);

    console.log('\n🎉 System demonstration completed successfully!');
    console.log('\n📡 API Server is running. You can now:');
    console.log(`   • View API documentation: http://localhost:${process.env.API_PORT || 3001}/`);
    console.log(`   • Check health status: http://localhost:${process.env.API_PORT || 3001}/health`);
    console.log(`   • Access task API: http://localhost:${process.env.API_PORT || 3001}/api/v1/tasks`);
    console.log(`   • WebSocket endpoint: ws://localhost:${process.env.API_PORT || 3001}/ws`);

  } catch (error) {
    console.error('❌ Error during system demonstration:', error);
  }
}

// Start the application
main().catch((error) => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});

