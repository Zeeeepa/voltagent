#!/usr/bin/env tsx

/**
 * Basic Usage Example for Comprehensive CI/CD System with Claude Code Validation
 * 
 * This example demonstrates how to use the system to validate a PR,
 * deploy it to a WSL2 environment, and get validation results.
 */

import { 
  ClaudeCodeValidator, 
  WSL2Manager, 
  AgentAPIClient,
  createValidator,
  systemHealthCheck 
} from '../index.js';

async function basicValidationExample() {
  console.log('🚀 Starting Basic Validation Example\n');

  try {
    // 1. Create validator instance
    console.log('📝 Creating validator instance...');
    const validator = createValidator({
      agentapiUrl: 'http://localhost:8000',
      apiKey: process.env.CLAUDE_CODE_API_KEY || 'demo-key',
    });

    // 2. Check system health
    console.log('🏥 Checking system health...');
    const health = await systemHealthCheck();
    console.log(`System Status: ${health.status}`);
    console.log(`Components: AgentAPI=${health.components.agentapi}, WSL2=${health.components.wsl2}, DB=${health.components.database}\n`);

    // 3. Define PR information
    const prInfo = {
      url: 'https://github.com/VoltAgent/voltagent.git',
      number: 123,
      branchName: 'feature/claude-validation',
      repository: 'voltagent',
      owner: 'VoltAgent',
    };

    const taskContext = {
      taskId: `task-${Date.now()}`,
      title: 'Validate Claude Code Integration',
      description: 'Comprehensive validation of the new Claude Code validation features',
      priority: 1,
      metadata: {
        requester: 'development-team',
        environment: 'staging',
      },
    };

    // 4. Start PR validation
    console.log('🔍 Starting PR validation...');
    const session = await validator.validatePR(prInfo, taskContext, {
      enableSecurityAnalysis: true,
      enablePerformanceAnalysis: true,
      codeQualityWeight: 0.3,
      functionalityWeight: 0.4,
      testingWeight: 0.2,
      documentationWeight: 0.1,
    });

    console.log(`✅ Validation session started: ${session.id}`);
    console.log(`Status: ${session.status}\n`);

    // 5. Monitor validation progress
    console.log('⏳ Monitoring validation progress...');
    let attempts = 0;
    const maxAttempts = 30; // 5 minutes with 10-second intervals

    while (attempts < maxAttempts) {
      const currentSession = await validator.getValidationSession(session.id);
      
      if (!currentSession) {
        console.log('❌ Session not found');
        break;
      }

      console.log(`Status: ${currentSession.status}`);

      if (['completed', 'failed', 'cancelled'].includes(currentSession.status)) {
        console.log(`🏁 Validation ${currentSession.status}\n`);
        break;
      }

      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      attempts++;
    }

    // 6. Get validation results
    console.log('📊 Retrieving validation results...');
    const results = await validator.getValidationResults(taskContext.taskId);
    
    if (results.length > 0) {
      const latestResult = results[0];
      console.log('📈 Validation Results:');
      console.log(`  Overall Score: ${latestResult.result?.overallScore || 'N/A'}`);
      console.log(`  Grade: ${latestResult.result?.grade || 'N/A'}`);
      console.log(`  Duration: ${latestResult.validationDuration || 'N/A'}ms`);
      
      if (latestResult.result?.scores) {
        console.log('  Detailed Scores:');
        console.log(`    Code Quality: ${latestResult.result.scores.codeQuality}`);
        console.log(`    Functionality: ${latestResult.result.scores.functionality}`);
        console.log(`    Testing: ${latestResult.result.scores.testing}`);
        console.log(`    Documentation: ${latestResult.result.scores.documentation}`);
      }

      if (latestResult.result?.feedback && latestResult.result.feedback.length > 0) {
        console.log('\n💡 Feedback:');
        latestResult.result.feedback.slice(0, 3).forEach((feedback, index) => {
          console.log(`  ${index + 1}. [${feedback.severity.toUpperCase()}] ${feedback.title}`);
          console.log(`     ${feedback.message}`);
          if (feedback.filePath) {
            console.log(`     File: ${feedback.filePath}:${feedback.lineNumber || 'N/A'}`);
          }
        });
      }
    } else {
      console.log('📭 No validation results found');
    }

    console.log('\n✅ Basic validation example completed successfully!');

  } catch (error) {
    console.error('❌ Error in basic validation example:', error);
    process.exit(1);
  }
}

async function wsl2ManagementExample() {
  console.log('\n🖥️  Starting WSL2 Management Example\n');

  try {
    // 1. Create WSL2 manager
    const wsl2Manager = new WSL2Manager();

    // 2. Check WSL2 health
    console.log('🏥 Checking WSL2 health...');
    const health = await wsl2Manager.healthCheck();
    console.log(`WSL2 Available: ${health.available}`);
    console.log(`Version: ${health.version}`);
    console.log(`Active Instances: ${health.activeInstances}\n`);

    // 3. List existing instances
    console.log('📋 Listing existing WSL2 instances...');
    const instances = await wsl2Manager.listInstances();
    console.log(`Found ${instances.length} instances:`);
    instances.forEach(instance => {
      console.log(`  - ${instance.instanceName} (${instance.status})`);
    });

    // 4. Create new instance (commented out to avoid actual creation)
    /*
    console.log('\n🆕 Creating new WSL2 instance...');
    const newInstance = await wsl2Manager.createInstance('example-project', {
      memory: '4GB',
      processors: 2,
      customPackages: ['git', 'nodejs', 'npm'],
    });
    console.log(`✅ Instance created: ${newInstance.instanceName}`);

    // 5. Deploy PR to instance
    console.log('\n📦 Deploying PR to instance...');
    const deployment = await wsl2Manager.deployPRToInstance(
      newInstance.instanceName,
      'https://github.com/VoltAgent/voltagent.git',
      'main'
    );
    
    if (deployment.success) {
      console.log(`✅ Deployment successful: ${deployment.deploymentPath}`);
      console.log('📝 Deployment logs:');
      deployment.logs?.forEach(log => console.log(`  ${log}`));
    } else {
      console.log(`❌ Deployment failed: ${deployment.error}`);
    }

    // 6. Cleanup (destroy instance)
    console.log('\n🧹 Cleaning up instance...');
    const destroyed = await wsl2Manager.destroyInstance(newInstance.instanceName);
    console.log(`Cleanup ${destroyed ? 'successful' : 'failed'}`);
    */

    console.log('\n✅ WSL2 management example completed!');

  } catch (error) {
    console.error('❌ Error in WSL2 management example:', error);
  }
}

async function agentApiExample() {
  console.log('\n🤖 Starting AgentAPI Client Example\n');

  try {
    // 1. Create AgentAPI client
    const client = new AgentAPIClient({
      agentapiUrl: 'http://localhost:8000',
      apiKey: process.env.CLAUDE_CODE_API_KEY || 'demo-key',
    });

    // 2. Test connection
    console.log('🔗 Testing AgentAPI connection...');
    const connected = await client.testConnection();
    console.log(`Connection: ${connected ? 'successful' : 'failed'}\n`);

    // 3. Get health status
    console.log('🏥 Getting AgentAPI health status...');
    const health = await client.getHealthStatus();
    console.log(`Status: ${health.status}`);
    console.log(`Version: ${health.version}`);
    console.log(`Uptime: ${health.uptime}s\n`);

    // 4. Example code analysis (mock)
    console.log('🔍 Running code analysis example...');
    try {
      const analysis = await client.analyzeCode('/mock/path', {
        includeMetrics: true,
        includeSecurity: true,
        includePerformance: true,
      });
      
      console.log('📊 Analysis Results:');
      console.log(`  Lines of Code: ${analysis.metrics.linesOfCode}`);
      console.log(`  Complexity: ${analysis.metrics.cyclomaticComplexity}`);
      console.log(`  Security Risk: ${analysis.security.riskScore}`);
      console.log(`  Performance Score: ${analysis.performance.score}`);
    } catch (error) {
      console.log('ℹ️  Code analysis skipped (mock endpoint not available)');
    }

    console.log('\n✅ AgentAPI client example completed!');

  } catch (error) {
    console.error('❌ Error in AgentAPI client example:', error);
  }
}

// Main execution
async function main() {
  console.log('🎯 Comprehensive CI/CD System - Usage Examples\n');
  console.log('=' .repeat(60));

  // Run examples
  await basicValidationExample();
  await wsl2ManagementExample();
  await agentApiExample();

  console.log('\n' + '='.repeat(60));
  console.log('🎉 All examples completed!\n');
  
  console.log('📚 Next Steps:');
  console.log('  1. Review the API documentation in README.md');
  console.log('  2. Configure your environment variables');
  console.log('  3. Start the system with: npm run dev');
  console.log('  4. Test the health endpoint: curl http://localhost:3000/health');
  console.log('  5. Explore the validation endpoints');
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Example execution failed:', error);
    process.exit(1);
  });
}

export {
  basicValidationExample,
  wsl2ManagementExample,
  agentApiExample,
};

