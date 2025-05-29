import { WSL2DeploymentWorkflow } from '@voltagent/wsl2-integration';
import { GitHubPRManager, GitHubWebhookHandler, GitHubReviewAutomation } from '@voltagent/github-integration';

/**
 * Complete WSL2 PR Deployment and Validation Pipeline Example
 * 
 * This example demonstrates how to set up an automated deployment pipeline
 * that integrates WSL2 environments with GitHub PR management.
 */

// Configuration
const config = {
  github: {
    token: process.env.GITHUB_TOKEN!,
    owner: 'your-org',
    repo: 'your-repo',
  },
  wsl2: {
    deployment: {
      wsl2: {
        distro: 'Ubuntu-22.04',
        memory: '8GB',
        processors: 4,
        swap: '2GB',
      },
      docker: {
        baseImage: 'node:18-alpine',
        networkMode: 'bridge',
        volumes: ['/workspace:/app'],
      },
      validation: {
        timeout: 1800,
        retries: 3,
        parallelJobs: 2,
      },
    },
    environment: {
      nodeVersion: '18',
      packageManager: 'npm' as const,
      environmentVariables: [
        { name: 'NODE_ENV', value: 'test', secure: false },
        { name: 'CI', value: 'true', secure: false },
      ],
      dependencies: ['git', 'curl', 'build-essential'],
    },
    clone: {
      depth: 1,
      singleBranch: true,
      recursive: false,
      timeout: 300000,
      retries: 3,
      lfsSupport: false,
    },
    build: {
      steps: [
        {
          name: 'install',
          command: 'npm ci',
          timeout: 600000,
          retries: 2,
          required: true,
        },
        {
          name: 'build',
          command: 'npm run build',
          timeout: 600000,
          retries: 1,
          required: true,
        },
      ],
      parallelJobs: 2,
      timeout: 1800000,
      cacheEnabled: true,
    },
    test: {
      suites: [
        {
          name: 'unit-tests',
          command: 'npm test',
          timeout: 300000,
          retries: 1,
          parallel: false,
          coverage: true,
        },
        {
          name: 'integration-tests',
          command: 'npm run test:integration',
          timeout: 600000,
          retries: 1,
          parallel: false,
          coverage: true,
        },
      ],
      parallelJobs: 2,
      coverage: {
        enabled: true,
        threshold: 80,
        formats: ['lcov', 'json'],
        outputDir: 'coverage',
      },
    },
    quality: {
      gates: [
        {
          name: 'test-coverage',
          type: 'coverage' as const,
          threshold: 80,
          operator: 'gte' as const,
          required: true,
        },
        {
          name: 'code-complexity',
          type: 'complexity' as const,
          threshold: 10,
          operator: 'lte' as const,
          required: true,
        },
        {
          name: 'security-audit',
          type: 'security' as const,
          threshold: 0,
          operator: 'eq' as const,
          required: true,
        },
      ],
      failFast: false,
    },
    validation: {
      testSuites: [
        {
          name: 'lint',
          command: 'npm run lint',
          timeout: 300000,
          retries: 1,
          required: true,
        },
        {
          name: 'type-check',
          command: 'npm run type-check',
          timeout: 300000,
          retries: 1,
          required: true,
        },
      ],
      qualityChecks: [
        {
          name: 'eslint',
          command: 'npx eslint src/ --format json',
          threshold: 90,
          required: true,
        },
      ],
      securityScans: [
        {
          name: 'npm-audit',
          command: 'npm audit --json',
          severity: 'medium' as const,
          required: true,
        },
      ],
      performanceBenchmarks: [
        {
          name: 'build-time',
          command: 'time npm run build',
          metric: 'real',
          threshold: 120,
          unit: 'seconds',
        },
      ],
    },
    monitor: {
      interval: 5000,
      metrics: ['cpu', 'memory'] as const,
      alerts: {
        cpu: 80,
        memory: 85,
        disk: 90,
      },
    },
    claude: {
      apiKey: process.env.CLAUDE_API_KEY!,
      model: 'claude-3-sonnet-20240229',
      maxTokens: 4000,
      temperature: 0.1,
      agentApiUrl: 'http://localhost:3000',
    },
    codegen: {
      apiKey: process.env.CODEGEN_API_KEY!,
      orgId: process.env.CODEGEN_ORG_ID!,
      baseUrl: 'https://api.codegen.sh',
      timeout: 30000,
    },
  },
};

async function main() {
  console.log('🚀 Starting WSL2 Deployment Pipeline...');

  // Initialize components
  const prManager = new GitHubPRManager({
    token: config.github.token,
    owner: config.github.owner,
    repo: config.github.repo,
    autoMerge: false,
    requiredChecks: ['test-coverage', 'security-audit'],
    reviewers: ['team-lead', 'senior-dev'],
  });

  const reviewAutomation = new GitHubReviewAutomation({
    token: config.github.token,
    owner: config.github.owner,
    repo: config.github.repo,
    claudeApiKey: config.wsl2.claude.apiKey,
    agentApiUrl: config.wsl2.claude.agentApiUrl,
    autoReview: true,
    reviewThreshold: 70,
    securityChecks: true,
    performanceChecks: true,
  });

  const deploymentWorkflow = new WSL2DeploymentWorkflow(config.wsl2);

  // Setup webhook handler
  const webhookHandler = new GitHubWebhookHandler({
    secret: process.env.GITHUB_WEBHOOK_SECRET!,
    port: 3001,
    path: '/webhook',
    events: ['pull_request', 'push', 'check_run'],
  });

  // Event handlers
  deploymentWorkflow.on('workflow:started', (data) => {
    console.log(`📦 Starting deployment for PR #${data.prNumber}`);
  });

  deploymentWorkflow.on('workflow:completed', async (result) => {
    console.log(`✅ Deployment completed for PR #${result.prNumber}`);
    
    // Generate and post deployment report
    const report = deploymentWorkflow.generateReport(result);
    await prManager.addComment(result.prNumber, report);
    
    // Perform automated review
    try {
      const reviewResult = await reviewAutomation.reviewPR(result.prNumber);
      console.log(`🔍 Automated review completed with score: ${reviewResult.score}/100`);
    } catch (error) {
      console.error('❌ Automated review failed:', error);
    }
  });

  deploymentWorkflow.on('workflow:failed', async (result, error) => {
    console.error(`❌ Deployment failed for PR #${result.prNumber}:`, error);
    
    // Post failure report
    const report = deploymentWorkflow.generateReport(result);
    await prManager.addComment(result.prNumber, `## ❌ Deployment Failed\n\n${report}`);
  });

  // Webhook event handlers
  webhookHandler.on('pr:opened', async (prEvent) => {
    console.log(`🔔 New PR opened: #${prEvent.number} - ${prEvent.title}`);
    
    try {
      // Trigger deployment workflow
      const result = await deploymentWorkflow.deployPR(
        prEvent.number,
        `https://github.com/${prEvent.repository}.git`,
        prEvent.head
      );
      
      console.log(`📊 Deployment result: ${result.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.error('❌ Deployment workflow failed:', error);
    }
  });

  webhookHandler.on('pr:updated', async (prEvent) => {
    console.log(`🔄 PR updated: #${prEvent.number}`);
    
    // Re-run deployment for updated PR
    try {
      const result = await deploymentWorkflow.deployPR(
        prEvent.number,
        `https://github.com/${prEvent.repository}.git`,
        prEvent.head
      );
      
      console.log(`📊 Re-deployment result: ${result.success ? 'Success' : 'Failed'}`);
    } catch (error) {
      console.error('❌ Re-deployment failed:', error);
    }
  });

  webhookHandler.on('check:failure', async (checkEvent) => {
    console.log(`⚠️ Check failed: ${checkEvent.name}`);
    
    // Could trigger additional analysis or notifications here
  });

  // Start the webhook server
  try {
    await webhookHandler.start();
    console.log(`🌐 Webhook server started on port ${3001}`);
  } catch (error) {
    console.error('❌ Failed to start webhook server:', error);
    process.exit(1);
  }

  // Example: Manual deployment trigger
  if (process.argv.includes('--manual')) {
    const prNumber = parseInt(process.argv[process.argv.indexOf('--pr') + 1]);
    const repoUrl = process.argv[process.argv.indexOf('--repo') + 1];
    const branch = process.argv[process.argv.indexOf('--branch') + 1];

    if (prNumber && repoUrl && branch) {
      console.log(`🔧 Manual deployment triggered for PR #${prNumber}`);
      
      try {
        const result = await deploymentWorkflow.deployPR(prNumber, repoUrl, branch);
        console.log(`📊 Manual deployment result: ${result.success ? 'Success' : 'Failed'}`);
        
        const report = deploymentWorkflow.generateReport(result);
        console.log('\n📋 Deployment Report:');
        console.log(report);
      } catch (error) {
        console.error('❌ Manual deployment failed:', error);
      }
    } else {
      console.error('❌ Missing required arguments for manual deployment');
      console.log('Usage: npm start -- --manual --pr <number> --repo <url> --branch <name>');
    }
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await webhookHandler.stop();
    process.exit(0);
  });

  console.log('✅ WSL2 Deployment Pipeline is ready!');
  console.log('📝 Listening for GitHub webhook events...');
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

// Start the application
if (require.main === module) {
  main().catch(console.error);
}

export { main as startDeploymentPipeline };

