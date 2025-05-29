import { VoltAgent, Agent } from "@voltagent/core";
import { createLinearToolkit, createLinearConfig } from "@voltagent/linear";
import { config } from "dotenv";

// Load environment variables
config();

async function main() {
  console.log("🚀 Starting VoltAgent Linear Integration Example");

  // Validate required environment variables
  if (!process.env.LINEAR_API_KEY) {
    console.error("❌ LINEAR_API_KEY environment variable is required");
    process.exit(1);
  }

  try {
    // Create Linear configuration
    const linearConfig = createLinearConfig({
      apiKey: process.env.LINEAR_API_KEY!,
      teamId: process.env.LINEAR_TEAM_ID,
      webhookSecret: process.env.LINEAR_WEBHOOK_SECRET,
      syncInterval: process.env.LINEAR_SYNC_INTERVAL 
        ? parseInt(process.env.LINEAR_SYNC_INTERVAL) 
        : undefined,
      retries: process.env.LINEAR_RETRIES 
        ? parseInt(process.env.LINEAR_RETRIES) 
        : undefined,
      timeout: process.env.LINEAR_TIMEOUT 
        ? parseInt(process.env.LINEAR_TIMEOUT) 
        : undefined,
    });

    // Create Linear toolkit
    const { tools, integration } = createLinearToolkit(linearConfig);

    // Initialize the integration
    console.log("🔗 Initializing Linear integration...");
    await integration.initialize();
    console.log("✅ Linear integration initialized successfully");

    // Create VoltAgent with Linear tools
    const agent = new Agent({
      name: "Linear Project Manager",
      description: `
        I'm an AI assistant specialized in Linear project management. I can help you:
        
        - Create and manage Linear issues
        - Analyze requirements and generate issue hierarchies
        - Track project progress and generate reports
        - Sync data between systems
        - Generate team performance metrics
        - Visualize project dependencies
        
        I have access to comprehensive Linear integration tools and can automate
        many project management tasks for you.
      `,
      tools,
    });

    const voltAgent = new VoltAgent();
    voltAgent.use(agent);

    // Set up event listeners for Linear integration
    setupEventListeners(integration);

    // Example: Demonstrate Linear integration capabilities
    await demonstrateLinearCapabilities(integration);

    console.log("\n🎉 VoltAgent Linear Integration is ready!");
    console.log("You can now interact with the agent to manage Linear issues and projects.");

  } catch (error) {
    console.error("❌ Failed to initialize Linear integration:", error.message);
    process.exit(1);
  }
}

/**
 * Set up event listeners for Linear integration events
 */
function setupEventListeners(integration: any) {
  console.log("📡 Setting up Linear event listeners...");

  integration.on("issue.created", (data: any) => {
    console.log(`📝 Issue created: ${data.issue.title} (${data.issue.identifier})`);
  });

  integration.on("issue.updated", (data: any) => {
    console.log(`📝 Issue updated: ${data.issue.title} (${data.issue.identifier})`);
  });

  integration.on("sync.completed", (result: any) => {
    console.log(`🔄 Sync completed: ${result.created} created, ${result.updated} updated`);
    if (result.conflicts > 0) {
      console.log(`⚠️  ${result.conflicts} conflicts detected`);
    }
  });

  integration.on("sync.failed", (result: any) => {
    console.log(`❌ Sync failed: ${result.errors.join(", ")}`);
  });

  integration.on("conflict.detected", (conflict: any) => {
    console.log(`⚠️  Conflict detected for issue ${conflict.issueId}: ${conflict.type}`);
  });

  integration.on("progress.calculated", (data: any) => {
    console.log(`📊 Progress updated: ${data.progress.completionPercentage.toFixed(1)}% complete`);
  });

  integration.on("requirements.analyzed", (analysis: any) => {
    console.log(`🔍 Requirements analyzed: ${analysis.complexity}/10 complexity, ${analysis.estimatedHours}h estimated`);
  });
}

/**
 * Demonstrate Linear integration capabilities
 */
async function demonstrateLinearCapabilities(integration: any) {
  console.log("\n🎯 Demonstrating Linear Integration Capabilities");
  console.log("=" .repeat(50));

  try {
    // 1. Get teams
    console.log("\n1. 📋 Getting Linear teams...");
    const teams = await integration.getTeams();
    console.log(`   Found ${teams.length} teams`);
    teams.forEach((team: any) => {
      console.log(`   - ${team.name} (${team.key})`);
    });

    // 2. Get workflow states
    if (teams.length > 0) {
      console.log("\n2. 🔄 Getting workflow states...");
      const states = await integration.getWorkflowStates();
      console.log(`   Found ${states.length} workflow states`);
      states.forEach((state: any) => {
        console.log(`   - ${state.name} (${state.type})`);
      });
    }

    // 3. Demonstrate requirement analysis
    console.log("\n3. 🔍 Analyzing sample requirements...");
    const sampleRequirements = `
# E-commerce Platform

## Core Features
- User registration and authentication
- Product catalog with search and filtering
- Shopping cart functionality
- Order processing and payment integration
- Admin dashboard for inventory management

## Technical Requirements
- RESTful API design
- Database schema optimization
- Security implementation
- Performance monitoring
- Mobile-responsive design

## Quality Assurance
- Unit testing coverage
- Integration testing
- Security testing
- Performance testing
`;

    const result = await integration.createIssuesFromRequirements(
      sampleRequirements,
      "E-commerce Platform Development"
    );

    console.log(`   ✅ Created main issue: ${result.mainIssue.title}`);
    console.log(`   ✅ Generated ${result.subIssues.length} sub-issues`);
    console.log(`   📊 Complexity: ${result.analysis.complexity}/10`);
    console.log(`   ⏱️  Estimated: ${result.analysis.estimatedHours} hours`);

    // 4. Get project progress
    console.log("\n4. 📊 Getting project progress...");
    const progress = await integration.getProjectProgress();
    console.log(`   Total issues: ${progress.totalIssues}`);
    console.log(`   Completed: ${progress.completedIssues}`);
    console.log(`   In progress: ${progress.inProgressIssues}`);
    console.log(`   Completion: ${progress.completionPercentage.toFixed(1)}%`);

    // 5. Generate progress report
    console.log("\n5. 📈 Generating progress report...");
    const report = await integration.generateProgressReport();
    console.log(`   Velocity trend: ${report.velocity.trend}`);
    console.log(`   Current velocity: ${report.velocity.current}`);
    console.log(`   Recommendations: ${report.recommendations.length}`);

    // 6. Check sync status
    console.log("\n6. 🔄 Checking sync status...");
    const syncStatus = integration.getSyncStatus();
    console.log(`   Sync running: ${syncStatus.isRunning}`);
    console.log(`   Last sync: ${syncStatus.lastSync || "Never"}`);
    console.log(`   Conflicts: ${syncStatus.conflicts}`);

    console.log("\n✅ All demonstrations completed successfully!");

  } catch (error) {
    console.error("❌ Error during demonstration:", error.message);
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Shutting down gracefully...");
  process.exit(0);
});

// Start the application
main().catch((error) => {
  console.error("💥 Fatal error:", error);
  process.exit(1);
});

