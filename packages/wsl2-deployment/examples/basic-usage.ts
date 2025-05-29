#!/usr/bin/env node

/**
 * Basic usage example for WSL2 Deployment Engine
 * 
 * This example demonstrates how to:
 * 1. Create a WSL2 deployment engine
 * 2. Deploy a repository with validation steps
 * 3. Monitor deployment progress
 * 4. Handle events and cleanup
 */

import { 
  WSL2DeploymentEngine, 
  defaultWSL2Config, 
  DeploymentRequest,
  WSL2Config 
} from '../src/index';

async function main() {
  console.log('🚀 Starting WSL2 Deployment Engine Example');

  // Custom configuration for this example
  const config: WSL2Config = {
    ...defaultWSL2Config,
    instancePool: {
      minInstances: 1,
      maxInstances: 2,
      instanceTimeout: 1800000 // 30 minutes
    },
    deployment: {
      timeout: 900000, // 15 minutes
      retries: 2,
      parallelDeployments: 1
    }
  };

  // Create the deployment engine
  const engine = new WSL2DeploymentEngine(config);

  // Set up event handlers
  setupEventHandlers(engine);

  try {
    // Wait for the engine to initialize
    console.log('⏳ Waiting for engine initialization...');
    await waitForEvent(engine, 'pool.initialized');
    console.log('✅ Engine initialized successfully');

    // Create a deployment request
    const deploymentRequest: DeploymentRequest = {
      id: 'example-deployment-' + Date.now(),
      repository: {
        url: 'https://github.com/microsoft/TypeScript.git', // Public repo for testing
        branch: 'main'
      },
      environment: {
        NODE_ENV: 'test',
        CI: 'true'
      },
      validationSteps: [
        {
          name: 'Install dependencies',
          command: 'npm install',
          timeout: 300000, // 5 minutes
          retries: 1
        },
        {
          name: 'Run TypeScript compiler',
          command: 'npm run build',
          timeout: 600000, // 10 minutes
          retries: 1,
          continueOnFailure: true
        },
        {
          name: 'Run tests',
          command: 'npm test',
          timeout: 300000, // 5 minutes
          retries: 1,
          continueOnFailure: true
        }
      ],
      priority: 'normal'
    };

    // Start the deployment
    console.log('🔄 Starting deployment...');
    const deploymentId = await engine.deploy(deploymentRequest);
    console.log(`📋 Deployment ID: ${deploymentId}`);

    // Monitor deployment progress
    await monitorDeployment(engine, deploymentId);

    // Get final deployment status
    const finalStatus = engine.getDeploymentStatus(deploymentId);
    console.log('📊 Final deployment status:', finalStatus?.status);

    // Show instance information
    const instances = engine.getInstances();
    console.log(`🖥️  Active instances: ${instances.length}`);
    
    for (const instance of instances) {
      console.log(`   - Instance ${instance.id}: ${instance.status}`);
      
      // Get health information
      const health = await engine.getInstanceHealth(instance.id);
      if (health) {
        console.log(`     Health: ${health.status}`);
        console.log(`     CPU: ${health.resourceUsage.cpu.toFixed(1)}%`);
        console.log(`     Memory: ${health.resourceUsage.memory.toFixed(1)}%`);
        console.log(`     Disk: ${health.resourceUsage.disk.toFixed(1)}%`);
      }
    }

  } catch (error) {
    console.error('❌ Error during deployment:', error);
  } finally {
    // Cleanup
    console.log('🧹 Shutting down engine...');
    await engine.shutdown();
    console.log('✅ Engine shutdown complete');
  }
}

function setupEventHandlers(engine: WSL2DeploymentEngine) {
  // Instance events
  engine.on('instance.created', ({ instance }) => {
    console.log(`🆕 Instance created: ${instance.id} (${instance.name})`);
  });

  engine.on('instance.destroyed', ({ instanceId }) => {
    console.log(`🗑️  Instance destroyed: ${instanceId}`);
  });

  // Deployment events
  engine.on('deployment.started', ({ deployment, instance }) => {
    console.log(`🚀 Deployment ${deployment.id} started on instance ${instance.id}`);
  });

  engine.on('deployment.completed', ({ deployment, success }) => {
    const status = success ? '✅ SUCCESS' : '⚠️  COMPLETED WITH ISSUES';
    console.log(`${status} Deployment ${deployment.id} completed`);
  });

  engine.on('deployment.failed', ({ deployment, error }) => {
    console.log(`❌ Deployment ${deployment.id} failed: ${error}`);
  });

  // Health monitoring events
  engine.on('health.check', (healthCheck) => {
    if (healthCheck.status === 'unhealthy') {
      console.log(`⚠️  Instance ${healthCheck.instanceId} is unhealthy`);
    }
  });

  engine.on('resource.alert', ({ instanceId, usage }) => {
    console.log(`🚨 Resource alert for instance ${instanceId}:`);
    console.log(`   CPU: ${usage.cpu.toFixed(1)}%`);
    console.log(`   Memory: ${usage.memory.toFixed(1)}%`);
    console.log(`   Disk: ${usage.disk.toFixed(1)}%`);
  });

  // Error events
  engine.on('instance.error', ({ instanceId, error }) => {
    console.log(`❌ Instance error ${instanceId}: ${error}`);
  });

  engine.on('deployment.error', ({ request, error }) => {
    console.log(`❌ Deployment error ${request.id}: ${error}`);
  });
}

async function monitorDeployment(engine: WSL2DeploymentEngine, deploymentId: string) {
  console.log('👀 Monitoring deployment progress...');
  
  return new Promise<void>((resolve) => {
    const checkStatus = () => {
      const status = engine.getDeploymentStatus(deploymentId);
      
      if (!status) {
        console.log('❓ Deployment status not found');
        resolve();
        return;
      }

      console.log(`📈 Deployment ${deploymentId} status: ${status.status}`);
      
      // Show validation results if available
      if (status.validationResults.length > 0) {
        console.log('🔍 Validation results:');
        for (const result of status.validationResults) {
          const icon = result.status === 'success' ? '✅' : 
                      result.status === 'failed' ? '❌' : '⏭️';
          console.log(`   ${icon} ${result.stepName}: ${result.status} (${result.duration}ms)`);
        }
      }

      // Check if deployment is complete
      if (['success', 'failed', 'timeout', 'cancelled'].includes(status.status)) {
        resolve();
        return;
      }

      // Continue monitoring
      setTimeout(checkStatus, 5000); // Check every 5 seconds
    };

    checkStatus();
  });
}

function waitForEvent(engine: WSL2DeploymentEngine, eventName: string): Promise<any> {
  return new Promise((resolve) => {
    engine.once(eventName, resolve);
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Run the example
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Unhandled error:', error);
    process.exit(1);
  });
}

