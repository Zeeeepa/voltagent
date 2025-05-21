import {
  Agent,
  DependencyManager,
  DependencyManagerEvent,
  DependencyType,
  DependencyVisualizer,
  TaskStatus,
  VisualizationOptions,
  createTool,
} from "@voltagent/core";
import { AnthropicAI } from "@voltagent/anthropic-ai";
import * as fs from "fs";
import * as path from "path";

// Create a simple example to demonstrate the dependency management system
async function main() {
  console.log("🔄 Dependency Management System Example");

  // Create a dependency manager
  const dependencyManager = new DependencyManager();

  // Set up event listeners
  dependencyManager.on(DependencyManagerEvent.TASK_CREATED, (task) => {
    console.log(`📝 Task created: ${task.name} (${task.id})`);
  });

  dependencyManager.on(DependencyManagerEvent.DEPENDENCY_CREATED, (dependency) => {
    console.log(
      `🔗 Dependency created: ${dependency.predecessorId} -> ${dependency.dependentId} (${dependency.type})`
    );
  });

  dependencyManager.on(DependencyManagerEvent.TASK_STATUS_CHANGED, (oldTask, newTask) => {
    console.log(`🔄 Task status changed: ${newTask.name} (${oldTask.status} -> ${newTask.status})`);
  });

  // Create tasks for a simple software development workflow
  const planningTask = dependencyManager.createTask({
    name: "Project Planning",
    description: "Define project scope, requirements, and timeline",
    estimatedDuration: 2 * 60 * 60 * 1000, // 2 hours
  });

  const designTask = dependencyManager.createTask({
    name: "System Design",
    description: "Create architecture and component design",
    estimatedDuration: 4 * 60 * 60 * 1000, // 4 hours
  });

  const frontendTask = dependencyManager.createTask({
    name: "Frontend Development",
    description: "Implement user interface components",
    estimatedDuration: 8 * 60 * 60 * 1000, // 8 hours
  });

  const backendTask = dependencyManager.createTask({
    name: "Backend Development",
    description: "Implement server-side logic and APIs",
    estimatedDuration: 10 * 60 * 60 * 1000, // 10 hours
  });

  const databaseTask = dependencyManager.createTask({
    name: "Database Setup",
    description: "Set up database schema and initial data",
    estimatedDuration: 3 * 60 * 60 * 1000, // 3 hours
  });

  const integrationTask = dependencyManager.createTask({
    name: "Integration",
    description: "Integrate frontend and backend components",
    estimatedDuration: 6 * 60 * 60 * 1000, // 6 hours
  });

  const testingTask = dependencyManager.createTask({
    name: "Testing",
    description: "Perform unit and integration testing",
    estimatedDuration: 5 * 60 * 60 * 1000, // 5 hours
  });

  const deploymentTask = dependencyManager.createTask({
    name: "Deployment",
    description: "Deploy the application to production",
    estimatedDuration: 2 * 60 * 60 * 1000, // 2 hours
  });

  // Create dependencies
  dependencyManager.createDependency({
    predecessorId: planningTask.id,
    dependentId: designTask.id,
    type: DependencyType.FINISH_TO_START,
  });

  dependencyManager.createDependency({
    predecessorId: designTask.id,
    dependentId: frontendTask.id,
    type: DependencyType.FINISH_TO_START,
  });

  dependencyManager.createDependency({
    predecessorId: designTask.id,
    dependentId: backendTask.id,
    type: DependencyType.FINISH_TO_START,
  });

  dependencyManager.createDependency({
    predecessorId: designTask.id,
    dependentId: databaseTask.id,
    type: DependencyType.FINISH_TO_START,
  });

  dependencyManager.createDependency({
    predecessorId: frontendTask.id,
    dependentId: integrationTask.id,
    type: DependencyType.FINISH_TO_START,
  });

  dependencyManager.createDependency({
    predecessorId: backendTask.id,
    dependentId: integrationTask.id,
    type: DependencyType.FINISH_TO_START,
  });

  dependencyManager.createDependency({
    predecessorId: databaseTask.id,
    dependentId: backendTask.id,
    type: DependencyType.START_TO_START,
    lag: 1 * 60 * 60 * 1000, // 1 hour lag
  });

  dependencyManager.createDependency({
    predecessorId: integrationTask.id,
    dependentId: testingTask.id,
    type: DependencyType.FINISH_TO_START,
  });

  dependencyManager.createDependency({
    predecessorId: testingTask.id,
    dependentId: deploymentTask.id,
    type: DependencyType.FINISH_TO_START,
  });

  // Validate the dependency graph
  const validation = dependencyManager.validate();
  console.log(`\n🔍 Dependency graph validation: ${validation.valid ? "Valid" : "Invalid"}`);
  if (!validation.valid) {
    console.log("❌ Validation errors:");
    validation.errors.forEach((error) => {
      console.log(`  - ${error.type}: ${error.message}`);
    });
  }

  // Analyze the critical path
  const criticalPath = dependencyManager.analyzeCriticalPath();
  console.log("\n⚡ Critical Path Analysis:");
  console.log(`  - Path: ${criticalPath.path.map((id) => dependencyManager.getTask(id)?.name).join(" -> ")}`);
  console.log(`  - Duration: ${(criticalPath.duration / (60 * 60 * 1000)).toFixed(2)} hours`);

  // Generate visualizations
  console.log("\n📊 Generating visualizations...");

  // Mermaid visualization
  const mermaidOptions: VisualizationOptions = {
    format: "mermaid",
    includeTaskDetails: true,
    highlightCriticalPath: true,
  };
  const mermaidVisualization = dependencyManager.visualize(mermaidOptions);
  fs.writeFileSync(path.join(__dirname, "dependency_graph.mermaid"), mermaidVisualization);
  console.log("  - Mermaid visualization saved to dependency_graph.mermaid");

  // HTML visualization
  const htmlOptions: VisualizationOptions = {
    format: "html",
    includeTaskDetails: true,
    highlightCriticalPath: true,
  };
  const htmlVisualization = dependencyManager.visualize(htmlOptions);
  fs.writeFileSync(path.join(__dirname, "dependency_graph.html"), htmlVisualization);
  console.log("  - HTML visualization saved to dependency_graph.html");

  // DOT visualization
  const dotOptions: VisualizationOptions = {
    format: "dot",
    includeTaskDetails: true,
    highlightCriticalPath: true,
  };
  const dotVisualization = dependencyManager.visualize(dotOptions);
  fs.writeFileSync(path.join(__dirname, "dependency_graph.dot"), dotVisualization);
  console.log("  - DOT visualization saved to dependency_graph.dot");

  // Simulate task execution
  console.log("\n▶️ Simulating task execution...");

  // Mark planning as completed
  dependencyManager.updateTaskStatus(planningTask.id, TaskStatus.COMPLETED);

  // Mark design as completed
  dependencyManager.updateTaskStatus(designTask.id, TaskStatus.COMPLETED);

  // Get ready tasks
  const readyTasks = dependencyManager.getReadyTasks();
  console.log(`\n🚀 Ready tasks: ${readyTasks.map((task) => task.name).join(", ")}`);

  // Calculate health metrics
  const healthMetrics = dependencyManager.calculateHealthMetrics();
  console.log("\n🏥 Dependency Health Metrics:");
  console.log(`  - Task Count: ${healthMetrics.taskCount}`);
  console.log(`  - Dependency Count: ${healthMetrics.dependencyCount}`);
  console.log(`  - Average Dependencies Per Task: ${healthMetrics.averageDependenciesPerTask.toFixed(2)}`);
  console.log(`  - Complexity Score: ${healthMetrics.complexityScore.toFixed(2)}`);
  console.log(`  - Health Score: ${healthMetrics.healthScore}/100`);
  console.log("  - Recommendations:");
  healthMetrics.recommendations.forEach((recommendation) => {
    console.log(`    * ${recommendation}`);
  });

  // Create an agent with dependency management tools
  if (process.env.ANTHROPIC_API_KEY) {
    console.log("\n🤖 Creating an agent with dependency management tools...");

    // Create dependency management tools
    const getTasksTool = createTool({
      name: "get_tasks",
      description: "Get all tasks in the dependency graph",
      parameters: {} as any,
      execute: async () => {
        return dependencyManager.getAllTasks();
      },
    });

    const getReadyTasksTool = createTool({
      name: "get_ready_tasks",
      description: "Get all tasks that are ready to be executed",
      parameters: {} as any,
      execute: async () => {
        return dependencyManager.getReadyTasks();
      },
    });

    const getCriticalPathTool = createTool({
      name: "get_critical_path",
      description: "Get the critical path of the dependency graph",
      parameters: {} as any,
      execute: async () => {
        return dependencyManager.analyzeCriticalPath();
      },
    });

    // Create an agent with the tools
    const agent = new Agent({
      name: "DependencyManagerAgent",
      instructions: "I am an agent that helps manage task dependencies and workflow optimization.",
      llm: new AnthropicAI({
        apiKey: process.env.ANTHROPIC_API_KEY,
        model: "claude-3-opus-20240229",
      }),
      tools: [getTasksTool, getReadyTasksTool, getCriticalPathTool],
    });

    // Ask the agent about the dependency graph
    const response = await agent.generateText([
      {
        role: "user",
        content: "Analyze the critical path of our project and suggest optimization strategies.",
      },
    ]);

    console.log("\n🤖 Agent Response:");
    console.log(response.text);
  } else {
    console.log("\n⚠️ ANTHROPIC_API_KEY not set, skipping agent example");
  }

  console.log("\n✅ Example completed");
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});

