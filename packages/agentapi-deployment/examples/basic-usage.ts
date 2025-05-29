import {
  createDeploymentModule,
  createDefaultDeploymentModule,
  type DeploymentConfig,
  type PRInfo,
} from "../src";

/**
 * Example 1: Basic usage with default configuration
 */
async function basicUsageExample() {
  console.log("=== Basic Usage Example ===");

  // Create deployment module with default configuration
  const deploymentModule = createDefaultDeploymentModule({
    // Override specific settings
    agentapi: {
      baseUrl: "http://localhost",
      port: 3284,
    },
    database: {
      connectionString: "postgresql://user:password@localhost:5432/deployments",
    },
  });

  // Example PR information
  const prInfo: PRInfo = {
    number: 123,
    branch: "feature/new-api",
    repository: "my-repo",
    owner: "my-org",
    headSha: "abc123def456",
    baseBranch: "main",
    title: "Add new API endpoint",
    description: "This PR adds a new API endpoint for user management",
  };

  try {
    // Deploy the PR
    console.log("Deploying PR...");
    const result = await deploymentModule.deployPR(prInfo);
    console.log("Deployment result:", result);

    // Check deployment status
    const status = await deploymentModule.getDeploymentStatus(result.deployment.wsl2_instance);
    console.log("Deployment status:", status);

  } catch (error) {
    console.error("Deployment failed:", error);
  } finally {
    // Cleanup resources
    await deploymentModule.cleanup();
  }
}

/**
 * Example 2: Advanced usage with custom configuration
 */
async function advancedUsageExample() {
  console.log("=== Advanced Usage Example ===");

  // Custom configuration
  const config: DeploymentConfig = {
    agentapi: {
      baseUrl: "http://agentapi.example.com",
      port: 8080,
      timeout: 60000,
      retryAttempts: 5,
      retryDelay: 2000,
    },
    wsl2: {
      distributionName: "Ubuntu-22.04",
      instancePrefix: "production-env",
      resourceLimits: {
        memory: "8GB",
        processors: 4,
      },
      networkConfig: {
        hostPort: 8080,
        guestPort: 8080,
      },
    },
    claudeCode: {
      version: "1.2.3",
      allowedTools: ["Bash(git*)", "Edit", "Replace", "Search"],
      model: "claude-3-opus-20240229",
      additionalArgs: ["--verbose", "--max-tokens", "4000"],
    },
    database: {
      connectionString: "postgresql://deploy:secret@db.example.com:5432/deployments",
      tableName: "pr_deployments",
    },
    webhooks: {
      secret: "super-secret-webhook-key",
      endpoints: ["https://api.example.com/webhooks/deployment"],
    },
  };

  const deploymentModule = createDeploymentModule(config);

  // Listen to deployment events
  deploymentModule.on("deployment_started", (context) => {
    console.log(`Deployment started for PR ${context.prInfo.number}`);
  });

  deploymentModule.on("environment_provisioned", (context) => {
    console.log(`Environment provisioned: ${context.wsl2Instance?.name}`);
  });

  deploymentModule.on("validation_completed", (context) => {
    console.log(`Validation completed with results:`, context.validationResults);
  });

  deploymentModule.on("deployment_completed", (context) => {
    console.log(`Deployment completed successfully for PR ${context.prInfo.number}`);
  });

  deploymentModule.on("deployment_failed", (context) => {
    console.error(`Deployment failed for PR ${context.prInfo.number}:`, context.error);
  });

  // Example webhook payload (GitHub format)
  const webhookPayload = {
    action: "opened",
    pull_request: {
      number: 456,
      head: {
        ref: "feature/webhook-integration",
        sha: "def456abc789",
      },
      base: {
        ref: "main",
      },
      title: "Add webhook integration",
      body: "This PR adds webhook integration for automated deployments",
    },
    repository: {
      name: "my-repo",
      owner: {
        login: "my-org",
      },
    },
  };

  try {
    // Handle webhook event
    console.log("Handling webhook event...");
    const webhookResult = await deploymentModule.handleWebhook(
      webhookPayload,
      "sha256=webhook-signature",
      "pull_request"
    );
    console.log("Webhook result:", webhookResult);

    // Get active deployments
    const activeDeployments = deploymentModule.getActiveDeployments();
    console.log("Active deployments:", activeDeployments);

  } catch (error) {
    console.error("Webhook handling failed:", error);
  } finally {
    // Cleanup resources
    await deploymentModule.cleanup();
  }
}

/**
 * Example 3: Manual deployment with monitoring
 */
async function manualDeploymentExample() {
  console.log("=== Manual Deployment Example ===");

  const deploymentModule = createDefaultDeploymentModule();

  const prInfo: PRInfo = {
    number: 789,
    branch: "hotfix/critical-bug",
    repository: "critical-app",
    owner: "urgent-org",
    headSha: "urgent123fix456",
    baseBranch: "main",
    title: "Critical bug fix",
    description: "Fixes a critical security vulnerability",
  };

  try {
    // Start deployment
    console.log("Starting manual deployment...");
    const deploymentPromise = deploymentModule.deployPR(prInfo);

    // Monitor deployment progress
    const monitoringInterval = setInterval(async () => {
      const activeDeployments = deploymentModule.getActiveDeployments();
      console.log(`Active deployments: ${activeDeployments.length}`);
      
      if (activeDeployments.length === 0) {
        clearInterval(monitoringInterval);
      }
    }, 5000);

    // Wait for deployment to complete
    const result = await deploymentPromise;
    clearInterval(monitoringInterval);

    console.log("Deployment completed:", result);

    // Validate the result
    if (result.status === "success") {
      console.log("✅ Deployment successful!");
      console.log(`Tests passed: ${result.deployment.validation_results.tests_passed}`);
      console.log(`Tests failed: ${result.deployment.validation_results.tests_failed}`);
      console.log(`Coverage: ${result.deployment.validation_results.coverage}`);
    } else {
      console.log("❌ Deployment failed!");
    }

  } catch (error) {
    console.error("Manual deployment failed:", error);
  } finally {
    await deploymentModule.cleanup();
  }
}

/**
 * Example 4: Error handling and recovery
 */
async function errorHandlingExample() {
  console.log("=== Error Handling Example ===");

  const deploymentModule = createDefaultDeploymentModule();

  const prInfo: PRInfo = {
    number: 999,
    branch: "feature/error-prone",
    repository: "test-repo",
    owner: "test-org",
    headSha: "error123prone456",
    baseBranch: "main",
    title: "Error-prone feature",
    description: "This might fail for demonstration",
  };

  try {
    const result = await deploymentModule.deployPR(prInfo);
    console.log("Unexpected success:", result);

  } catch (error: any) {
    console.log("Handling deployment error:");
    console.log(`Error code: ${error.code}`);
    console.log(`Error phase: ${error.phase}`);
    console.log(`Recoverable: ${error.recoverable}`);
    console.log(`Message: ${error.message}`);

    if (error.recoverable) {
      console.log("Error is recoverable, could retry...");
      // Implement retry logic here
    } else {
      console.log("Error is not recoverable, manual intervention required");
    }
  } finally {
    await deploymentModule.cleanup();
  }
}

// Run examples
async function runExamples() {
  try {
    await basicUsageExample();
    console.log("\\n");
    
    await advancedUsageExample();
    console.log("\\n");
    
    await manualDeploymentExample();
    console.log("\\n");
    
    await errorHandlingExample();
    
  } catch (error) {
    console.error("Example execution failed:", error);
  }
}

// Export for use in other files
export {
  basicUsageExample,
  advancedUsageExample,
  manualDeploymentExample,
  errorHandlingExample,
  runExamples,
};

// Run if this file is executed directly
if (require.main === module) {
  runExamples();
}

