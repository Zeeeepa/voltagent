/**
 * Basic Workflow Orchestration Example
 * 
 * This example demonstrates how to use the VoltAgent Workflow Orchestration System
 * to create and execute AI-driven CI/CD workflows.
 */

import {
  VoltAgentWorkflowIntegration,
  createWorkflowOrchestrator,
  createCICDServer,
  type WorkflowProgressEvent,
  type WorkflowCompletionEvent
} from '@voltagent/core';

// Mock integrations for demonstration
class MockNLPEngine {
  async analyzeRequirement(requirementText: string, options: any) {
    console.log('🧠 NLP Engine: Analyzing requirement...');
    
    // Simulate analysis delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      requirement_text: requirementText,
      tasks: [
        {
          id: 'task-1',
          title: 'Implement user authentication',
          description: 'Create JWT-based authentication system',
          priority: 'high',
          estimated_duration: 180000
        },
        {
          id: 'task-2',
          title: 'Add user registration',
          description: 'Create user registration endpoint',
          priority: 'medium',
          estimated_duration: 120000
        }
      ],
      complexity: 'medium',
      estimated_duration: 300000
    };
  }
}

class MockCodegenIntegration {
  async generateCode(task: any) {
    console.log(`⚡ Codegen: Generating code for ${task.title}...`);
    
    // Simulate code generation delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      task_id: task.id,
      generated_files: [
        'src/auth/auth.controller.ts',
        'src/auth/auth.service.ts',
        'src/auth/jwt.strategy.ts'
      ],
      pr_url: `https://github.com/example/repo/pull/${Math.floor(Math.random() * 1000)}`,
      branch_name: `feature/${task.id}`
    };
  }
}

class MockValidationEngine {
  async validateCode(codegenResult: any) {
    console.log(`🔍 Validation: Validating code for ${codegenResult.task_id}...`);
    
    // Simulate validation delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return {
      task_id: codegenResult.task_id,
      validation_passed: true,
      issues_found: [],
      suggestions: [
        'Consider adding input validation',
        'Add comprehensive error handling',
        'Include unit tests for edge cases'
      ],
      score: 87
    };
  }
}

class MockTaskStorage {
  private tasks: Map<string, any> = new Map();

  async storeTask(task: any) {
    console.log(`💾 Task Storage: Storing task ${task.id}...`);
    this.tasks.set(task.id, task);
    return task;
  }

  async getTask(taskId: string) {
    return this.tasks.get(taskId);
  }

  async getAllTasks() {
    return Array.from(this.tasks.values());
  }
}

/**
 * Example 1: Basic Workflow Creation and Execution
 */
async function basicWorkflowExample() {
  console.log('\n🚀 Example 1: Basic Workflow Creation and Execution\n');

  // Create orchestrator with mock integrations
  const orchestrator = createWorkflowOrchestrator({
    nlpEngine: new MockNLPEngine(),
    codegenIntegration: new MockCodegenIntegration(),
    validationEngine: new MockValidationEngine(),
    taskStorage: new MockTaskStorage(),
    maxConcurrentSteps: 3,
    stepTimeout: 60000,
    enableParallelExecution: true
  });

  // Set up event listeners
  orchestrator.on('workflow_created', (data) => {
    console.log(`✅ Workflow created: ${data.workflow_id}`);
  });

  orchestrator.on('workflow_started', (data) => {
    console.log(`🏁 Workflow started: ${data.workflow_id}`);
  });

  orchestrator.on('workflow_progress', (event: WorkflowProgressEvent) => {
    console.log(`📊 Progress: ${event.progress}% - ${event.message}`);
  });

  orchestrator.on('workflow_completed', (event: WorkflowCompletionEvent) => {
    console.log(`🎉 Workflow completed: ${event.workflowId}`);
    console.log(`   Duration: ${event.duration}ms`);
    console.log(`   Completed steps: ${event.completedSteps}/${event.totalSteps}`);
  });

  orchestrator.on('workflow_failed', (data) => {
    console.log(`❌ Workflow failed: ${data.workflow_id}`);
    console.log(`   Error: ${data.error}`);
  });

  try {
    // Create workflow
    const workflow = await orchestrator.createWorkflow(
      "Build a user authentication system with JWT tokens and registration",
      {
        framework: "Express.js",
        database: "PostgreSQL",
        testing: "Jest",
        deployment: "Docker"
      },
      {
        title: "User Authentication System",
        description: "Complete authentication system with JWT and registration",
        priority: "high"
      }
    );

    console.log(`📋 Created workflow: ${workflow.workflow_id}`);
    console.log(`   Steps: ${workflow.steps.length}`);

    // Start workflow execution
    await orchestrator.startWorkflow(workflow.workflow_id);

    // Monitor workflow status
    const checkStatus = async () => {
      const status = await orchestrator.getWorkflowStatus(workflow.workflow_id);
      console.log(`📈 Current status: ${status.status} (${status.current_state})`);
      
      if (['completed', 'failed', 'cancelled'].includes(status.status)) {
        return true; // Done
      }
      
      return false; // Continue monitoring
    };

    // Check status every 2 seconds until completion
    while (!(await checkStatus())) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Get final analytics
    const analytics = orchestrator.getWorkflowAnalytics();
    console.log('\n📊 Final Analytics:');
    console.log(`   Total workflows: ${analytics.totalWorkflows}`);
    console.log(`   Completed workflows: ${analytics.completedWorkflows}`);
    console.log(`   Average duration: ${analytics.averageDuration}ms`);

  } catch (error) {
    console.error('❌ Error in basic workflow example:', error);
  }
}

/**
 * Example 2: Complete CI/CD Integration
 */
async function completeCICDExample() {
  console.log('\n🚀 Example 2: Complete CI/CD Integration\n');

  // Create complete integration
  const integration = new VoltAgentWorkflowIntegration({
    nlpEngine: new MockNLPEngine(),
    codegenIntegration: new MockCodegenIntegration(),
    validationEngine: new MockValidationEngine(),
    taskStorage: new MockTaskStorage()
  });

  try {
    // Create and start workflow with monitoring
    const { workflowId, workflow, stopMonitoring } = await integration.createAndStartWorkflow(
      "Create a REST API for user management with CRUD operations",
      {
        language: "TypeScript",
        framework: "Express",
        database: "MongoDB",
        authentication: "JWT",
        testing: "Jest",
        documentation: "OpenAPI"
      }
    );

    console.log(`🆔 Workflow ID: ${workflowId}`);
    console.log(`📝 Workflow Title: ${workflow.title}`);

    // Get real-time status updates
    const { status, unsubscribe } = await integration.getWorkflowStatusWithUpdates(
      workflowId,
      (update) => {
        console.log(`🔄 Real-time update: ${JSON.stringify(update, null, 2)}`);
      }
    );

    console.log(`📊 Initial status: ${status.status}`);

    // Wait for completion (in real scenario, this would be event-driven)
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Get final status
    const finalStatus = await integration.getOrchestrator().getWorkflowStatus(workflowId);
    console.log(`🏁 Final status: ${finalStatus.status}`);

    // Clean up
    stopMonitoring();
    unsubscribe();

  } catch (error) {
    console.error('❌ Error in complete CI/CD example:', error);
  }
}

/**
 * Example 3: API Server with Real-time Monitoring
 */
async function apiServerExample() {
  console.log('\n🚀 Example 3: API Server with Real-time Monitoring\n');

  try {
    // Create and start CI/CD server
    const server = await createCICDServer({
      port: 3001,
      nlpEngine: new MockNLPEngine(),
      codegenIntegration: new MockCodegenIntegration(),
      validationEngine: new MockValidationEngine(),
      taskStorage: new MockTaskStorage(),
      autoStart: true
    });

    console.log('🌐 CI/CD API Server started on port 3001');
    console.log('📋 Available endpoints:');
    console.log('   POST /api/v1/workflows - Create workflow');
    console.log('   GET /api/v1/workflows/:id/status - Get workflow status');
    console.log('   POST /api/v1/workflows/:id/start - Start workflow');
    console.log('   GET /api/v1/analytics/workflows - Get analytics');
    console.log('   WebSocket /api/v1/workflows/:id/stream - Real-time updates');

    // Example API usage (you would normally use HTTP client)
    const workflowIntegration = server.getWorkflowIntegration();
    const orchestrator = workflowIntegration.getOrchestrator();

    // Create a workflow via the integration
    const workflow = await orchestrator.createWorkflow(
      "Implement microservice for order processing",
      {
        architecture: "microservices",
        language: "Node.js",
        database: "PostgreSQL",
        messaging: "RabbitMQ"
      }
    );

    console.log(`📋 Created workflow via API integration: ${workflow.workflow_id}`);

    // Start the workflow
    await orchestrator.startWorkflow(workflow.workflow_id);

    // Monitor for a bit
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Stop server
    await server.stop();
    console.log('🛑 CI/CD API Server stopped');

  } catch (error) {
    console.error('❌ Error in API server example:', error);
  }
}

/**
 * Example 4: Error Handling and Recovery
 */
async function errorHandlingExample() {
  console.log('\n🚀 Example 4: Error Handling and Recovery\n');

  // Create orchestrator with error-prone mock
  class ErrorProneCodegen extends MockCodegenIntegration {
    private attemptCount = 0;

    async generateCode(task: any) {
      this.attemptCount++;
      
      if (this.attemptCount <= 2) {
        console.log(`💥 Codegen: Simulating failure (attempt ${this.attemptCount})...`);
        throw new Error('Network timeout - recoverable error');
      }
      
      console.log(`✅ Codegen: Success on attempt ${this.attemptCount}`);
      return super.generateCode(task);
    }
  }

  const orchestrator = createWorkflowOrchestrator({
    nlpEngine: new MockNLPEngine(),
    codegenIntegration: new ErrorProneCodegen(),
    validationEngine: new MockValidationEngine(),
    taskStorage: new MockTaskStorage(),
    retryDelay: 2000
  });

  // Set up error event listeners
  orchestrator.on('workflow_step_failed', (data) => {
    console.log(`⚠️  Step failed: ${data.step_id}`);
    console.log(`   Error: ${data.error.message}`);
  });

  orchestrator.on('workflow_step_retry', (data) => {
    console.log(`🔄 Retrying step: ${data.step_id}`);
  });

  try {
    const workflow = await orchestrator.createWorkflow(
      "Simple feature implementation",
      { framework: "React" }
    );

    await orchestrator.startWorkflow(workflow.workflow_id);

    // Monitor until completion
    let isComplete = false;
    while (!isComplete) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      const status = await orchestrator.getWorkflowStatus(workflow.workflow_id);
      
      if (['completed', 'failed'].includes(status.status)) {
        isComplete = true;
        console.log(`🏁 Workflow ${status.status}: ${workflow.workflow_id}`);
      }
    }

  } catch (error) {
    console.error('❌ Error in error handling example:', error);
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🎯 VoltAgent Workflow Orchestration Examples\n');
  console.log('='.repeat(50));

  try {
    // Run examples sequentially
    await basicWorkflowExample();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await completeCICDExample();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await apiServerExample();
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await errorHandlingExample();

    console.log('\n✅ All examples completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error running examples:', error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  basicWorkflowExample,
  completeCICDExample,
  apiServerExample,
  errorHandlingExample,
  main
};

