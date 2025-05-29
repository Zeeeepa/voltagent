import { Agent, Orchestrator, type WorkflowDefinition } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";

/**
 * Example demonstrating the VoltAgent Orchestration System
 * This shows how to use the orchestrator for system integration and end-to-end workflows
 */

async function main() {
  console.log("🚀 Starting VoltAgent Orchestration Example");

  // Create the orchestrator with custom configuration
  const orchestrator = new Orchestrator({
    healthCheckInterval: 15000, // 15 seconds
    metricsCollectionInterval: 30000, // 30 seconds
    maxConcurrentWorkflows: 5,
    loadBalancingStrategy: "performance_based",
    cacheConfig: {
      ttl: 600000, // 10 minutes
      maxSize: 50 * 1024 * 1024, // 50MB
      strategy: "lru",
    },
    enableTelemetry: true,
    logLevel: "info",
  });

  // Start the orchestrator
  await orchestrator.start();
  console.log("✅ Orchestrator started successfully");

  // Create AI agents
  const codeAgent = new Agent({
    id: "code-agent",
    name: "Code Generation Agent",
    instructions: "You are a skilled software developer who can write, review, and optimize code.",
    llm: new VercelAIProvider({ apiKey: process.env.OPENAI_API_KEY || "demo" }),
    model: openai("gpt-4"),
    tools: [
      {
        name: "write_code",
        description: "Write code based on requirements",
        parameters: {
          type: "object",
          properties: {
            language: { type: "string", description: "Programming language" },
            requirements: { type: "string", description: "Code requirements" },
          },
          required: ["language", "requirements"],
        },
        execute: async ({ language, requirements }) => {
          console.log(`📝 Writing ${language} code for: ${requirements}`);
          return {
            code: `// ${language} code for: ${requirements}\nconsole.log("Hello, World!");`,
            language,
            requirements,
          };
        },
      },
    ],
  });

  const reviewAgent = new Agent({
    id: "review-agent",
    name: "Code Review Agent",
    instructions: "You are an expert code reviewer who ensures code quality and best practices.",
    llm: new VercelAIProvider({ apiKey: process.env.OPENAI_API_KEY || "demo" }),
    model: openai("gpt-4"),
    tools: [
      {
        name: "review_code",
        description: "Review code for quality and best practices",
        parameters: {
          type: "object",
          properties: {
            code: { type: "string", description: "Code to review" },
            language: { type: "string", description: "Programming language" },
          },
          required: ["code", "language"],
        },
        execute: async ({ code, language }) => {
          console.log(`🔍 Reviewing ${language} code...`);
          return {
            approved: true,
            issues: [],
            suggestions: ["Consider adding error handling", "Add unit tests"],
            score: 85,
          };
        },
      },
    ],
  });

  // Register agents with the orchestrator
  await orchestrator.registerAgent(codeAgent);
  await orchestrator.registerAgent(reviewAgent);
  console.log("✅ Agents registered successfully");

  // Create a custom workflow definition
  const codeReviewWorkflow: WorkflowDefinition = {
    id: "code_review_workflow",
    name: "Code Development and Review Workflow",
    description: "Complete workflow for code development, review, and deployment",
    steps: [
      {
        id: "requirement_analysis",
        name: "Analyze Requirements",
        type: "requirement_analysis",
        timeout: 120000, // 2 minutes
        parameters: {
          depth: "detailed",
        },
      },
      {
        id: "code_generation",
        name: "Generate Code",
        type: "execution",
        dependencies: ["requirement_analysis"],
        agentId: "code-agent",
        timeout: 300000, // 5 minutes
        parameters: {
          task: "code_generation",
        },
      },
      {
        id: "code_review",
        name: "Review Code",
        type: "validation",
        dependencies: ["code_generation"],
        agentId: "review-agent",
        timeout: 180000, // 3 minutes
        parameters: {
          task: "code_review",
        },
      },
      {
        id: "deployment",
        name: "Deploy Code",
        type: "deployment",
        dependencies: ["code_review"],
        timeout: 240000, // 4 minutes
        parameters: {
          environment: "staging",
        },
      },
    ],
    timeout: 900000, // 15 minutes total
    retryPolicy: {
      maxAttempts: 2,
      backoffStrategy: "exponential",
      baseDelay: 5000,
    },
  };

  // Execute the custom workflow
  console.log("🔄 Starting code review workflow...");
  const workflowExecution = await orchestrator.executeWorkflow(codeReviewWorkflow, {
    requirements: "Create a TypeScript function that calculates the factorial of a number",
    language: "typescript",
    project: "math-utils",
  });

  console.log(`📋 Workflow execution started: ${workflowExecution.id}`);

  // Monitor workflow progress
  const monitorInterval = setInterval(async () => {
    const status = await orchestrator.getWorkflowStatus(workflowExecution.id);
    if (status) {
      console.log(`📊 Workflow Status: ${status.status} - Current Step: ${status.currentStep || "None"}`);
      console.log(`📈 Completed Steps: ${status.completedSteps.length}, Failed Steps: ${status.failedSteps.length}`);
      
      if (status.status === "completed" || status.status === "failed" || status.status === "cancelled") {
        clearInterval(monitorInterval);
        console.log(`🏁 Workflow ${status.status}!`);
        if (status.results) {
          console.log("📋 Results:", JSON.stringify(status.results, null, 2));
        }
        if (status.error) {
          console.error("❌ Error:", status.error.message);
        }
      }
    }
  }, 2000);

  // Execute the complete development pipeline
  console.log("\n🚀 Starting complete development pipeline...");
  const completeWorkflow = await orchestrator.executeCompleteWorkflow({
    requirements: "Build a REST API for user management with authentication",
    technology: "Node.js with Express and TypeScript",
    database: "PostgreSQL",
    features: ["user registration", "login", "profile management", "JWT authentication"],
  });

  console.log(`📋 Complete workflow execution started: ${completeWorkflow.id}`);

  // Show system statistics
  setInterval(() => {
    const stats = orchestrator.getStats();
    console.log("\n📊 System Statistics:");
    console.log(`- System Health: ${stats.systemHealth}`);
    console.log(`- Uptime: ${Math.round(stats.uptime / 1000)}s`);
    console.log(`- Active Agents: ${stats.agents.availableAgents}/${stats.agents.totalAgents}`);
    console.log(`- Active Workflows: ${stats.workflows}`);
    console.log(`- Cache Hit Rate: ${(stats.cache.hitRate * 100).toFixed(1)}%`);
    console.log(`- Load Balancer Queue: ${stats.loadBalancer.queueSize}`);
  }, 10000);

  // Demonstrate cache usage
  const cache = orchestrator.getCache();
  
  // Cache some data
  cache.set("user:123", { id: 123, name: "John Doe", email: "john@example.com" }, {
    namespace: "users",
    ttl: 300000, // 5 minutes
  });

  // Retrieve cached data
  const cachedUser = cache.get("user:123", "users");
  console.log("📦 Cached user:", cachedUser);

  // Demonstrate memoization
  const expensiveOperation = cache.memoize(
    async (input: string) => {
      console.log(`🔄 Processing: ${input}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate work
      return `Processed: ${input}`;
    },
    { namespace: "operations", ttl: 60000 }
  );

  const result1 = await expensiveOperation("test data");
  const result2 = await expensiveOperation("test data"); // Should be cached
  console.log("🎯 Operation results:", result1, result2);

  // Demonstrate event handling
  const eventDispatcher = orchestrator.getEventDispatcher();
  
  eventDispatcher.registerHandler({
    type: "workflow:execution_completed",
    priority: "high",
    handler: async (event) => {
      console.log(`🎉 Workflow completed: ${event.data.executionId}`);
      console.log(`⏱️  Duration: ${event.data.duration}ms`);
    },
  });

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n🛑 Shutting down orchestrator...");
    await orchestrator.stop();
    console.log("✅ Orchestrator stopped successfully");
    process.exit(0);
  });

  console.log("\n✨ Orchestration example is running!");
  console.log("Press Ctrl+C to stop the example");
}

// Error handling
main().catch((error) => {
  console.error("❌ Error in orchestration example:", error);
  process.exit(1);
});

