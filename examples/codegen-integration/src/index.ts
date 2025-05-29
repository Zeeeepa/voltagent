/**
 * VoltAgent Codegen Integration Example
 * Demonstrates how to use the Codegen SDK integration with VoltAgent
 */

import { 
  setupCodegen, 
  CodegenOrchestrator,
  createConfigForEnvironment,
  validateCodegenConfig
} from '@voltagent/core';
import { config } from 'dotenv';

// Load environment variables
config();

async function main() {
  console.log('🚀 Starting VoltAgent Codegen Integration Example');

  try {
    // Method 1: Quick setup with environment variables
    console.log('\n📋 Setting up Codegen with environment variables...');
    
    const orchestrator = await setupCodegen({
      // These will be read from environment variables:
      // CODEGEN_ORG_ID, CODEGEN_TOKEN, etc.
      enableEvents: true,
      maxConcurrentTasks: 3
    });

    console.log('✅ Codegen orchestrator initialized successfully');

    // Method 2: Manual configuration with validation
    console.log('\n🔧 Demonstrating manual configuration...');
    
    const manualConfig = {
      orgId: process.env.CODEGEN_ORG_ID || 'your-org-id',
      token: process.env.CODEGEN_TOKEN || 'your-api-token',
      baseURL: 'https://codegen-sh-rest-api.modal.run',
      timeout: 30000,
      retries: 3,
      enableEvents: true,
      maxConcurrentTasks: 5
    };

    const validation = validateCodegenConfig(manualConfig);
    if (!validation.valid) {
      console.error('❌ Configuration validation failed:', validation.errors);
      return;
    }

    // Example 1: Simple code generation
    console.log('\n🎯 Example 1: Simple Code Generation');
    
    try {
      const codeResult = await orchestrator.generateCode({
        prompt: 'Create a TypeScript function that validates email addresses using regex',
        context: {
          language: 'typescript',
          framework: 'node'
        },
        parameters: {
          style: 'documented',
          includeTypes: true,
          includeErrorHandling: true
        }
      });

      console.log('Generated code:', codeResult.code);
      console.log('Explanation:', codeResult.explanation);
      console.log('Quality score:', codeResult.quality.score);
    } catch (error) {
      console.error('Code generation failed:', error);
    }

    // Example 2: Task execution with monitoring
    console.log('\n🔄 Example 2: Task Execution with Progress Monitoring');
    
    orchestrator.on('task_started', ({ task }) => {
      console.log(`📝 Task started: ${task.id} - "${task.prompt}"`);
    });

    orchestrator.on('task_progress', ({ task, context }) => {
      console.log(`⏳ Task progress: ${task.id} - ${context.progress}% - ${context.currentOperation || 'Processing'}`);
    });

    orchestrator.on('task_completed', ({ task }) => {
      console.log(`✅ Task completed: ${task.id}`);
      if (task.result) {
        console.log('Result summary:', task.result.summary);
        if (task.result.links) {
          console.log('Generated links:', task.result.links);
        }
      }
    });

    orchestrator.on('task_failed', ({ task, context }) => {
      console.log(`❌ Task failed: ${task.id} - ${context.error?.message}`);
    });

    try {
      const task = await orchestrator.executeTask({
        prompt: 'Create a React component for a user profile card with TypeScript',
        repository: {
          url: 'https://github.com/example/my-app',
          branch: 'feature/user-profile'
        },
        parameters: {
          language: 'typescript',
          framework: 'react',
          includeTests: true,
          includeDocumentation: true
        }
      });

      console.log('Task created:', task.id);
      
      // Wait for completion (this is handled automatically by the event listeners above)
      
    } catch (error) {
      console.error('Task execution failed:', error);
    }

    // Example 3: Code review
    console.log('\n🔍 Example 3: Code Review');
    
    const codeToReview = `
function processUser(user) {
  if (!user) return null;
  
  const result = {
    id: user.id,
    name: user.firstName + ' ' + user.lastName,
    email: user.email.toLowerCase()
  };
  
  return result;
}
`;

    try {
      const reviewResult = await orchestrator.reviewCode({
        code: codeToReview,
        language: 'javascript',
        criteria: {
          security: true,
          performance: true,
          maintainability: true,
          bestPractices: true,
          testCoverage: false
        }
      });

      console.log('Review score:', reviewResult.score);
      console.log('Review summary:', reviewResult.summary);
      console.log('Approved:', reviewResult.approved);
      console.log('Findings:', reviewResult.findings.length);
      
      reviewResult.findings.forEach((finding, index) => {
        console.log(`  ${index + 1}. [${finding.severity}] ${finding.message}`);
        if (finding.fix) {
          console.log(`     Suggested fix: ${finding.fix}`);
        }
      });
      
    } catch (error) {
      console.error('Code review failed:', error);
    }

    // Example 4: Workflow execution
    console.log('\n🔄 Example 4: Workflow Execution');
    
    const workflow = orchestrator.createWorkflow({
      name: 'Full Stack Feature Development',
      description: 'Complete workflow for developing a new feature',
      steps: [
        {
          id: 'generate_backend',
          name: 'Generate Backend API',
          type: 'code_generation',
          parameters: {
            prompt: 'Create Express.js API endpoints for user management',
            context: { language: 'typescript', framework: 'express' }
          },
          dependencies: [],
          optional: false
        },
        {
          id: 'generate_frontend',
          name: 'Generate Frontend Component',
          type: 'code_generation',
          parameters: {
            prompt: 'Create React component for user management UI',
            context: { language: 'typescript', framework: 'react' }
          },
          dependencies: [],
          optional: false
        },
        {
          id: 'review_backend',
          name: 'Review Backend Code',
          type: 'code_review',
          parameters: {
            // This would reference the result from generate_backend
            language: 'typescript',
            criteria: { security: true, performance: true, maintainability: true, bestPractices: true, testCoverage: true }
          },
          dependencies: ['generate_backend'],
          optional: false
        },
        {
          id: 'create_pr',
          name: 'Create Pull Request',
          type: 'repository_operation',
          parameters: {
            operation: 'create_pull_request',
            repoId: 'example-repo',
            options: {
              title: 'Add user management feature',
              description: 'Implements backend API and frontend UI for user management',
              sourceBranch: 'feature/user-management',
              targetBranch: 'main'
            }
          },
          dependencies: ['generate_backend', 'generate_frontend', 'review_backend'],
          optional: false
        }
      ],
      metadata: {
        author: 'VoltAgent',
        version: '1.0.0'
      }
    });

    console.log('Created workflow:', workflow.id);

    try {
      const execution = await orchestrator.executeWorkflow(workflow.id, {
        projectName: 'User Management System',
        targetRepository: 'my-app'
      });

      console.log('Workflow execution started:', execution.id);
      
    } catch (error) {
      console.error('Workflow execution failed:', error);
    }

    // Example 5: Get orchestrator status
    console.log('\n📊 Example 5: Orchestrator Status');
    
    const status = orchestrator.getStatus();
    console.log('Orchestrator Status:');
    console.log(`  Active tasks: ${status.activeTasks}`);
    console.log(`  Queued tasks: ${status.queuedTasks}`);
    console.log(`  Active workflows: ${status.activeWorkflows}`);
    console.log('  Health:');
    console.log(`    Client state: ${status.health.client.circuitBreakerState}`);
    console.log(`    Cache hits: ${status.health.client.cacheStats.hits}`);
    console.log(`    Auth organizations: ${status.health.auth.activeOrganizations}`);

    // Wait a bit for async operations to complete
    console.log('\n⏳ Waiting for operations to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('❌ Example failed:', error);
  }

  console.log('\n🎉 Example completed!');
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// Run the example
main().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});

