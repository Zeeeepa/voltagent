/**
 * Webhook Event System Example
 * Demonstrates the consolidated webhook handling and event processing system
 */

import { 
  VoltAgent, 
  Agent,
  initializeWebhookEventSystem,
  setupGitHubWebhooks,
  getWebhookHandler,
  getWebhookRouter,
  getWebhookAutomationEngine,
  type WebhookPayload
} from "@voltagent/core";

/**
 * Example: Complete webhook system setup
 */
async function main() {
  console.log("🚀 Starting Webhook Event System Example");

  // 1. Create a VoltAgent instance with agents
  const voltAgent = new VoltAgent({
    agents: {
      "webhook-processor": new Agent({
        name: "Webhook Processor",
        description: "Processes incoming webhook events and takes appropriate actions",
        model: "gpt-4",
        systemPrompt: `You are a webhook processing agent. When you receive webhook events, analyze them and provide insights about what happened. For GitHub events, focus on code changes, pull requests, and deployment status.`
      }),
      "code-reviewer": new Agent({
        name: "Code Reviewer", 
        description: "Reviews code changes from GitHub webhooks",
        model: "gpt-4",
        systemPrompt: `You are a code review agent. When you receive pull request webhooks, analyze the changes and provide feedback on code quality, potential issues, and suggestions for improvement.`
      }),
      "deployment-monitor": new Agent({
        name: "Deployment Monitor",
        description: "Monitors deployment events and system health",
        model: "gpt-4", 
        systemPrompt: `You are a deployment monitoring agent. Track deployment events, analyze success/failure patterns, and alert on issues. Provide insights on deployment frequency and success rates.`
      })
    },
    autoStart: true
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 2. Initialize the comprehensive webhook system
  console.log("\n📡 Initializing Webhook Event System...");
  const webhookSystem = initializeWebhookEventSystem({
    enabled: true,
    basePath: "/webhooks",
    maxPayloadSize: 10 * 1024 * 1024, // 10MB
    timeout: 30000,
    defaultValidation: {
      method: "none" // For demo purposes
    }
  });

  // 3. Setup GitHub webhooks (in production, use a real secret)
  console.log("\n🐙 Setting up GitHub webhooks...");
  const githubSystem = setupGitHubWebhooks(
    "demo-secret-key", // In production, use process.env.GITHUB_WEBHOOK_SECRET
    "webhook-processor" // Route GitHub events to webhook processor agent
  );

  // 4. Add custom routing rules
  console.log("\n🔀 Adding custom routing rules...");
  const router = getWebhookRouter();

  // Route pull request events to code reviewer
  router.addRule({
    id: "pr-to-code-reviewer",
    name: "Route PR Events to Code Reviewer",
    source: "github",
    eventType: "pull_request",
    targetAgentId: "code-reviewer",
    action: {
      type: "agent_trigger",
      agentId: "code-reviewer"
    },
    priority: 150,
    enabled: true
  });

  // Route deployment events to deployment monitor
  router.addRule({
    id: "deployment-to-monitor",
    name: "Route Deployment Events to Monitor",
    source: "github", 
    eventType: "deployment",
    targetAgentId: "deployment-monitor",
    action: {
      type: "agent_trigger",
      agentId: "deployment-monitor"
    },
    priority: 150,
    enabled: true
  });

  // 5. Add automation rules
  console.log("\n🤖 Adding automation rules...");
  const automationEngine = getWebhookAutomationEngine();

  // Critical pull request automation
  automationEngine.addRule({
    id: "critical-pr-automation",
    name: "Critical Pull Request Automation",
    description: "Automatically handle critical pull requests with many changes",
    enabled: true,
    source: "github",
    eventType: "pull_request",
    conditions: [
      {
        field: "data.action",
        operator: "equals",
        value: "opened"
      },
      {
        field: "data.pull_request.changed_files",
        operator: "gt",
        value: 5
      }
    ],
    actions: [
      {
        type: "notification",
        notification: {
          message: "🚨 Critical PR opened: {{webhook.data.pull_request.title}} with {{webhook.data.pull_request.changed_files}} changed files"
        }
      },
      {
        type: "agent_trigger",
        agentId: "code-reviewer"
      }
    ],
    priority: 200,
    cooldown: 300000, // 5 minutes
    tags: ["github", "pull-request", "critical"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // Deployment success automation
  automationEngine.addRule({
    id: "deployment-success-automation",
    name: "Deployment Success Automation", 
    description: "Handle successful deployments",
    enabled: true,
    source: "github",
    eventType: "workflow_run",
    conditions: [
      {
        field: "data.action",
        operator: "equals",
        value: "completed"
      },
      {
        field: "data.workflow_run.conclusion",
        operator: "equals", 
        value: "success"
      },
      {
        field: "data.workflow_run.name",
        operator: "contains",
        value: "deploy"
      }
    ],
    actions: [
      {
        type: "notification",
        notification: {
          message: "✅ Deployment successful: {{webhook.data.workflow_run.name}} on {{webhook.data.workflow_run.head_branch}}"
        }
      },
      {
        type: "agent_trigger",
        agentId: "deployment-monitor"
      }
    ],
    priority: 180,
    tags: ["github", "deployment", "success"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  // 6. Demonstrate webhook processing
  console.log("\n🧪 Testing webhook processing...");
  
  // Simulate GitHub push webhook
  const pushWebhook: WebhookPayload = {
    id: "test-push-1",
    source: "github",
    eventType: "push",
    data: {
      ref: "refs/heads/main",
      commits: [
        {
          id: "abc123",
          message: "Add new feature",
          author: { name: "Developer", email: "dev@example.com" }
        }
      ],
      repository: {
        name: "test-repo",
        full_name: "user/test-repo"
      }
    },
    headers: {
      "x-github-event": "push",
      "x-github-delivery": "test-delivery-1"
    },
    timestamp: new Date().toISOString(),
    validated: true,
    status: "pending"
  };

  const handler = getWebhookHandler();
  const pushResult = await handler.processWebhook(
    JSON.stringify(pushWebhook.data),
    pushWebhook.headers,
    "github",
    "push"
  );

  console.log("Push webhook result:", {
    success: pushResult.success,
    duration: pushResult.duration,
    triggeredActions: pushResult.triggeredActions.length,
    createdEvents: pushResult.createdEvents.length
  });

  // Simulate GitHub pull request webhook
  const prWebhook: WebhookPayload = {
    id: "test-pr-1", 
    source: "github",
    eventType: "pull_request",
    data: {
      action: "opened",
      number: 42,
      pull_request: {
        title: "Add critical security fix",
        changed_files: 8,
        additions: 150,
        deletions: 50,
        head: { ref: "security-fix" },
        base: { ref: "main" }
      },
      repository: {
        name: "test-repo",
        full_name: "user/test-repo"
      }
    },
    headers: {
      "x-github-event": "pull_request",
      "x-github-delivery": "test-delivery-2"
    },
    timestamp: new Date().toISOString(),
    validated: true,
    status: "pending"
  };

  const prResult = await handler.processWebhook(
    JSON.stringify(prWebhook.data),
    prWebhook.headers,
    "github", 
    "pull_request"
  );

  console.log("PR webhook result:", {
    success: prResult.success,
    duration: prResult.duration,
    triggeredActions: prResult.triggeredActions.length,
    createdEvents: prResult.createdEvents.length
  });

  // 7. Display system statistics
  console.log("\n📊 Webhook System Statistics:");
  const stats = handler.getStats();
  console.log({
    totalReceived: stats.totalReceived,
    totalProcessed: stats.totalProcessed,
    successRate: stats.totalReceived > 0 ? (stats.totalProcessed / stats.totalReceived * 100).toFixed(2) + "%" : "N/A",
    averageProcessingTime: stats.averageProcessingTime.toFixed(2) + "ms",
    bySource: stats.bySource,
    byEventType: stats.byEventType
  });

  // 8. Display system health
  console.log("\n🏥 System Health:");
  const health = handler.healthCheck();
  console.log({
    status: health.status,
    details: health.details
  });

  // 9. Display automation statistics
  console.log("\n🤖 Automation Statistics:");
  const automationStats = automationEngine.getExecutionStats();
  console.log(automationStats);

  console.log("\n✅ Webhook Event System Example completed successfully!");
  console.log("\n🌐 Webhook endpoints available at:");
  console.log("   POST /webhooks/github - GitHub webhooks");
  console.log("   POST /webhooks/generic - Generic webhooks");
  console.log("   GET  /webhooks/stats - System statistics");
  console.log("   GET  /webhooks/health - System health");
  console.log("   GET  /ui - Swagger UI with webhook API documentation");

  // Keep the example running to demonstrate real webhook processing
  console.log("\n⏳ Server running... Send webhooks to test the system!");
  console.log("   Example: curl -X POST http://localhost:3141/webhooks/github \\");
  console.log("            -H 'Content-Type: application/json' \\");
  console.log("            -H 'X-GitHub-Event: push' \\");
  console.log("            -d '{\"ref\":\"refs/heads/main\",\"commits\":[{\"message\":\"Test commit\"}]}'");
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down webhook system...');
  process.exit(0);
});

// Run the example
main().catch(console.error);

