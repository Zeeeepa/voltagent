import { Agent, Orchestrator, VercelAIProvider } from "@voltagent/core";
import { openai } from "@ai-sdk/openai";

/**
 * Example demonstrating the VoltAgent Orchestrator system
 * This shows how to set up and use the complete orchestration system
 * for end-to-end workflow automation and agent coordination.
 */

async function main() {
  console.log("🚀 Starting VoltAgent Orchestrator Example");

  // Create AI provider
  const provider = new VercelAIProvider({
    llm: openai("gpt-4"),
  });

  // Create agents for coordination
  const requirementAgent = new Agent({
    name: "Requirement Analyzer",
    instructions: "You are an expert at analyzing software requirements and breaking them down into actionable tasks.",
    provider,
  });

  const implementationAgent = new Agent({
    name: "Implementation Specialist", 
    instructions: "You are an expert software developer who implements solutions based on analyzed requirements.",
    provider,
  });

  const validationAgent = new Agent({
    name: "Validation Expert",
    instructions: "You are an expert at testing and validating software implementations to ensure they meet requirements.",
    provider,
  });

  // Create orchestrator with configuration
  const orchestrator = new Orchestrator({
    id: "example-orchestrator",
    name: "Example VoltAgent Orchestrator",
    version: "1.0.0",
    components: {
      systemWatcher: { enabled: true },
      coordinationEngine: { enabled: true },
      eventDispatcher: { enabled: true },
      workflowManager: { enabled: true },
      stateManager: { enabled: true },
      requirementProcessor: { enabled: false },
      taskOrchestrator: { enabled: false },
      healthMonitor: { enabled: false },
      cacheManager: { enabled: false },
      loadBalancer: { enabled: false },
    },
    metrics: {
      enabled: true,
      interval: 30000,
      retention: 86400000,
    },
    logging: {
      level: "info",
      format: "text",
      destination: "console",
    },
  });

  try {
    // Start the orchestrator
    console.log("📋 Starting orchestrator...");
    await orchestrator.start();

    // Register agents with capabilities
    console.log("🤖 Registering agents...");
    orchestrator.registerAgent(requirementAgent, ["analysis", "requirements", "planning"]);
    orchestrator.registerAgent(implementationAgent, ["coding", "implementation", "development"]);
    orchestrator.registerAgent(validationAgent, ["testing", "validation", "quality-assurance"]);

    // Set up event listeners to monitor the workflow
    orchestrator.onEvent("workflow.execution.started", (event) => {
      console.log(`🎬 Workflow started: ${event.data.workflowName} (${event.data.executionId})`);
    });

    orchestrator.onEvent("workflow.step.started", (event) => {
      console.log(`⚡ Step started: ${event.data.stepName} (${event.data.stepId})`);
    });

    orchestrator.onEvent("workflow.step.completed", (event) => {
      console.log(`✅ Step completed: ${event.data.stepName} (${event.data.stepId})`);
    });

    orchestrator.onEvent("workflow.execution.completed", (event) => {
      console.log(`🎉 Workflow completed: ${event.data.workflowId} in ${event.data.duration}ms`);
    });

    orchestrator.onEvent("coordination.started", (event) => {
      console.log(`🔄 Agent coordination started: ${event.data.sourceAgentId} -> ${event.data.targetAgentId}`);
    });

    orchestrator.onEvent("coordination.completed", (event) => {
      console.log(`✨ Agent coordination completed in ${event.data.duration}ms`);
    });

    // Example 1: Execute a complete workflow
    console.log("\n📝 Example 1: Complete Workflow Execution");
    const requirement = "Create a simple user authentication system with login and registration functionality";
    
    const executionId = await orchestrator.executeCompleteWorkflow(requirement);
    console.log(`🔄 Workflow execution started with ID: ${executionId}`);

    // Monitor workflow progress
    const checkProgress = setInterval(() => {
      const status = orchestrator.getWorkflowStatus(executionId);
      if (status) {
        console.log(`📊 Workflow status: ${status.status} - Current step: ${status.currentStep || "N/A"}`);
        
        if (status.status === "completed" || status.status === "failed" || status.status === "cancelled") {
          clearInterval(checkProgress);
          console.log(`🏁 Workflow finished with status: ${status.status}`);
          
          if (status.results.size > 0) {
            console.log("📋 Workflow results:");
            for (const [stepId, result] of status.results.entries()) {
              console.log(`  - ${stepId}: ${result.status}`);
            }
          }
        }
      }
    }, 2000);

    // Example 2: Direct agent coordination
    console.log("\n🤝 Example 2: Direct Agent Coordination");
    
    const coordinationRequest = {
      id: `coord_${Date.now()}`,
      sourceAgentId: requirementAgent.id,
      targetAgentId: implementationAgent.id,
      mode: "sequential" as const,
      task: "Analyze this requirement and then implement a solution: Create a simple calculator function",
      priority: "normal" as const,
      timeout: 60000,
    };

    const coordinationId = await orchestrator.requestCoordination(coordinationRequest);
    console.log(`🔄 Agent coordination started with ID: ${coordinationId}`);

    // Example 3: State management
    console.log("\n💾 Example 3: State Management");
    
    orchestrator.setState("example.counter", 0);
    orchestrator.setState("example.timestamp", new Date().toISOString());
    orchestrator.setState("example.config", {
      maxRetries: 3,
      timeout: 30000,
      enableLogging: true,
    });

    console.log("📊 Current state:");
    console.log(`  - Counter: ${orchestrator.getState("example.counter")}`);
    console.log(`  - Timestamp: ${orchestrator.getState("example.timestamp")}`);
    console.log(`  - Config: ${JSON.stringify(orchestrator.getState("example.config"), null, 2)}`);

    // Example 4: System health monitoring
    console.log("\n🏥 Example 4: System Health Monitoring");
    
    const health = orchestrator.getHealth();
    console.log(`📊 Orchestrator health: ${health.status}`);
    console.log(`⏱️  Uptime: ${health.uptime}ms`);
    console.log(`🎯 System health: ${orchestrator.getSystemHealthStatus()}`);

    const metrics = orchestrator.getMetrics();
    console.log("📈 System metrics:", JSON.stringify(metrics, null, 2));

    // Wait for workflow to complete before shutting down
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Graceful shutdown
    console.log("\n🛑 Shutting down orchestrator...");
    await orchestrator.gracefulShutdown(10000);
    
    console.log("✅ Orchestrator example completed successfully!");

  } catch (error) {
    console.error("❌ Error in orchestrator example:", error);
    
    // Attempt graceful shutdown on error
    try {
      await orchestrator.gracefulShutdown(5000);
    } catch (shutdownError) {
      console.error("❌ Error during shutdown:", shutdownError);
    }
    
    process.exit(1);
  }
}

// Handle process signals for graceful shutdown
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
  main().catch(console.error);
}

export { main };

