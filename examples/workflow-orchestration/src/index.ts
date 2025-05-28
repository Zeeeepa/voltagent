import { Agent } from "@voltagent/core";
import { AnthropicAI } from "@voltagent/anthropic-ai";
import {
  WorkflowOrchestrationEngine,
  WorkflowDefinition,
  createSequentialWorkflow,
  createParallelWorkflow,
  createPipelineWorkflow,
  createGraphWorkflow,
  OrchestrationIntegration,
  DEFAULT_RETRY_POLICY,
  DEFAULT_ERROR_HANDLING,
} from "@voltagent/core/orchestration";

/**
 * Workflow Orchestration Example
 * 
 * This example demonstrates the unified workflow orchestration engine
 * that consolidates workflow and task management capabilities.
 */

// Initialize LLM provider
const llm = new AnthropicAI({
  apiKey: process.env.ANTHROPIC_API_KEY || "your-api-key-here",
});

// Create specialized agents for different tasks
const dataExtractorAgent = new Agent({
  name: "DataExtractor",
  instructions: "You are a data extraction specialist. Extract and structure data from various sources.",
  llm,
  model: "claude-3-haiku-20240307",
});

const dataAnalyzerAgent = new Agent({
  name: "DataAnalyzer", 
  instructions: "You are a data quality analyst. Analyze data quality and provide recommendations.",
  llm,
  model: "claude-3-haiku-20240307",
});

const dataProcessorAgent = new Agent({
  name: "DataProcessor",
  instructions: "You are a data processor. Process and transform high-quality data.",
  llm,
  model: "claude-3-haiku-20240307",
});

const dataCleanerAgent = new Agent({
  name: "DataCleaner",
  instructions: "You are a data cleaner. Clean and fix low-quality data issues.",
  llm,
  model: "claude-3-haiku-20240307",
});

const dataTransformerAgent = new Agent({
  name: "DataTransformer",
  instructions: "You are a data transformer. Transform data into required formats.",
  llm,
  model: "claude-3-haiku-20240307",
});

const reportGeneratorAgent = new Agent({
  name: "ReportGenerator",
  instructions: "You are a report generator. Create comprehensive reports from processed data.",
  llm,
  model: "claude-3-haiku-20240307",
});

async function main() {
  console.log("🚀 VoltAgent Workflow Orchestration Example\n");

  // Create orchestration engine with all agents
  const agents = [
    dataExtractorAgent,
    dataAnalyzerAgent,
    dataProcessorAgent,
    dataCleanerAgent,
    dataTransformerAgent,
    reportGeneratorAgent,
  ];

  const engine = new WorkflowOrchestrationEngine(agents, {
    maxConcurrentWorkflows: 5,
    maxConcurrentTasks: 10,
    persistenceEnabled: false, // Disable for example
  });

  // Set up event monitoring
  engine.onWorkflowEvent((event) => {
    console.log(`📊 Event: ${event.type} | Workflow: ${event.workflowId} | Task: ${event.taskId || 'N/A'}`);
  });

  await engine.start();
  console.log("✅ Orchestration engine started\n");

  try {
    // Example 1: Sequential Data Processing Pipeline
    await demonstrateSequentialWorkflow(engine);
    
    // Example 2: Parallel Data Analysis
    await demonstrateParallelWorkflow(engine);
    
    // Example 3: Conditional Processing
    await demonstrateConditionalWorkflow(engine);
    
    // Example 4: Complex Dependency Graph
    await demonstrateDependencyGraph(engine);
    
    // Example 5: Pipeline with Data Flow
    await demonstratePipelineWorkflow(engine);
    
    // Example 6: Integration with SubAgentManager
    await demonstrateIntegration(engine);

  } catch (error) {
    console.error("❌ Error during workflow execution:", error);
  } finally {
    await engine.stop();
    console.log("\n🛑 Orchestration engine stopped");
  }
}

async function demonstrateSequentialWorkflow(engine: WorkflowOrchestrationEngine) {
  console.log("📋 Example 1: Sequential Data Processing Pipeline");
  console.log("=" .repeat(50));

  const workflow = createSequentialWorkflow("sequential-processing", "Sequential Data Processing", [
    {
      id: "extract",
      name: "Extract Data",
      agentName: "DataExtractor",
      input: "Extract customer data from the CRM system",
      timeout: 30000,
    },
    {
      id: "analyze",
      name: "Analyze Quality",
      agentName: "DataAnalyzer", 
      input: "Analyze the quality of the extracted customer data",
      timeout: 30000,
    },
    {
      id: "transform",
      name: "Transform Data",
      agentName: "DataTransformer",
      input: "Transform the analyzed data into standard format",
      timeout: 30000,
    },
    {
      id: "report",
      name: "Generate Report",
      agentName: "ReportGenerator",
      input: "Generate a summary report of the data processing pipeline",
      timeout: 30000,
    },
  ]);

  await engine.registerWorkflow(workflow);
  
  const result = await engine.executeWorkflow("sequential-processing", {
    source: "CRM_SYSTEM",
    format: "JSON",
  });

  console.log(`Status: ${result.status}`);
  console.log(`Duration: ${result.duration}ms`);
  console.log(`Tasks completed: ${result.taskResults.filter(t => t.status === "completed").length}/${result.taskResults.length}`);
  console.log(`Final result: ${result.finalResult}\n`);
}

async function demonstrateParallelWorkflow(engine: WorkflowOrchestrationEngine) {
  console.log("⚡ Example 2: Parallel Data Analysis");
  console.log("=" .repeat(50));

  const workflow = createParallelWorkflow("parallel-analysis", "Parallel Data Analysis", [
    {
      id: "quality-analysis",
      name: "Quality Analysis",
      agentName: "DataAnalyzer",
      input: "Perform comprehensive quality analysis on the dataset",
      timeout: 30000,
    },
    {
      id: "extract-insights",
      name: "Extract Insights",
      agentName: "DataExtractor",
      input: "Extract key business insights from the dataset",
      timeout: 30000,
    },
    {
      id: "clean-data",
      name: "Clean Data",
      agentName: "DataCleaner",
      input: "Clean and standardize the dataset",
      timeout: 30000,
    },
    {
      id: "transform-format",
      name: "Transform Format",
      agentName: "DataTransformer",
      input: "Transform data into multiple output formats",
      timeout: 30000,
    },
  ]);

  await engine.registerWorkflow(workflow);
  
  const result = await engine.executeWorkflow("parallel-analysis", {
    dataset: "customer_transactions_2024",
    analysisType: "comprehensive",
  });

  console.log(`Status: ${result.status}`);
  console.log(`Duration: ${result.duration}ms`);
  console.log(`Parallel tasks completed: ${result.taskResults.filter(t => t.status === "completed").length}/${result.taskResults.length}`);
  
  // Show parallel execution timing
  const startTimes = result.taskResults.map(t => t.startTime.getTime());
  const maxStartDiff = Math.max(...startTimes) - Math.min(...startTimes);
  console.log(`Max start time difference: ${maxStartDiff}ms (should be small for parallel execution)\n`);
}

async function demonstrateConditionalWorkflow(engine: WorkflowOrchestrationEngine) {
  console.log("🔀 Example 3: Conditional Processing");
  console.log("=" .repeat(50));

  const workflow: WorkflowDefinition = {
    id: "conditional-processing",
    name: "Conditional Data Processing",
    version: "1.0.0",
    mode: "conditional",
    tasks: [
      {
        id: "quality-check",
        name: "Quality Check",
        agentName: "DataAnalyzer",
        input: "Analyze data quality and determine if it meets standards. Respond with 'high_quality' or 'low_quality'.",
        timeout: 30000,
      },
      {
        id: "process-good-data",
        name: "Process High Quality Data",
        agentName: "DataProcessor",
        input: "Process the high-quality data using advanced algorithms",
        timeout: 30000,
        conditions: [
          {
            type: "result",
            taskId: "quality-check",
            operator: "contains",
            value: "high_quality",
          },
        ],
      },
      {
        id: "clean-bad-data",
        name: "Clean Low Quality Data",
        agentName: "DataCleaner",
        input: "Clean and improve the low-quality data",
        timeout: 30000,
        conditions: [
          {
            type: "result",
            taskId: "quality-check",
            operator: "contains",
            value: "low_quality",
          },
        ],
      },
      {
        id: "generate-report",
        name: "Generate Final Report",
        agentName: "ReportGenerator",
        input: "Generate a report based on the processing results",
        timeout: 30000,
        conditions: [
          {
            type: "status",
            taskId: "process-good-data",
            operator: "equals",
            value: "completed",
          },
        ],
      },
      {
        id: "generate-cleanup-report",
        name: "Generate Cleanup Report",
        agentName: "ReportGenerator",
        input: "Generate a report on data cleaning activities",
        timeout: 30000,
        conditions: [
          {
            type: "status",
            taskId: "clean-bad-data",
            operator: "equals",
            value: "completed",
          },
        ],
      },
    ],
    retryPolicy: DEFAULT_RETRY_POLICY,
    errorHandling: DEFAULT_ERROR_HANDLING,
  };

  await engine.registerWorkflow(workflow);
  
  const result = await engine.executeWorkflow("conditional-processing", {
    dataSource: "user_uploads",
    qualityThreshold: 0.8,
  });

  console.log(`Status: ${result.status}`);
  console.log(`Duration: ${result.duration}ms`);
  
  // Show which conditional paths were taken
  const executedTasks = result.taskResults.filter(t => t.status === "completed");
  const skippedTasks = result.taskResults.filter(t => t.status === "skipped");
  
  console.log(`Executed tasks: ${executedTasks.map(t => t.taskId).join(", ")}`);
  console.log(`Skipped tasks: ${skippedTasks.map(t => t.taskId).join(", ")}\n`);
}

async function demonstrateDependencyGraph(engine: WorkflowOrchestrationEngine) {
  console.log("🕸️ Example 4: Complex Dependency Graph");
  console.log("=" .repeat(50));

  const workflow = createGraphWorkflow("dependency-graph", "Complex Dependency Processing", [
    {
      id: "initialize",
      name: "Initialize System",
      agentName: "DataExtractor",
      input: "Initialize the data processing system and validate connections",
      timeout: 30000,
    },
    {
      id: "extract-source-a",
      name: "Extract from Source A",
      agentName: "DataExtractor",
      input: "Extract data from source A (database)",
      dependencies: ["initialize"],
      timeout: 30000,
    },
    {
      id: "extract-source-b",
      name: "Extract from Source B", 
      agentName: "DataExtractor",
      input: "Extract data from source B (API)",
      dependencies: ["initialize"],
      timeout: 30000,
    },
    {
      id: "analyze-source-a",
      name: "Analyze Source A Data",
      agentName: "DataAnalyzer",
      input: "Analyze data quality and patterns from source A",
      dependencies: ["extract-source-a"],
      timeout: 30000,
    },
    {
      id: "analyze-source-b",
      name: "Analyze Source B Data",
      agentName: "DataAnalyzer",
      input: "Analyze data quality and patterns from source B",
      dependencies: ["extract-source-b"],
      timeout: 30000,
    },
    {
      id: "merge-data",
      name: "Merge Data Sources",
      agentName: "DataProcessor",
      input: "Merge and reconcile data from both sources",
      dependencies: ["analyze-source-a", "analyze-source-b"],
      timeout: 30000,
    },
    {
      id: "transform-merged",
      name: "Transform Merged Data",
      agentName: "DataTransformer",
      input: "Transform the merged data into final format",
      dependencies: ["merge-data"],
      timeout: 30000,
    },
    {
      id: "generate-final-report",
      name: "Generate Final Report",
      agentName: "ReportGenerator",
      input: "Generate comprehensive report on the entire process",
      dependencies: ["transform-merged"],
      timeout: 30000,
    },
  ]);

  await engine.registerWorkflow(workflow);
  
  const result = await engine.executeWorkflow("dependency-graph", {
    sourceA: "postgresql://localhost/db",
    sourceB: "https://api.example.com/data",
  });

  console.log(`Status: ${result.status}`);
  console.log(`Duration: ${result.duration}ms`);
  
  // Show execution order based on dependencies
  const sortedTasks = result.taskResults.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  console.log("Execution order:");
  sortedTasks.forEach((task, index) => {
    console.log(`  ${index + 1}. ${task.taskId} (${task.status})`);
  });
  console.log();
}

async function demonstratePipelineWorkflow(engine: WorkflowOrchestrationEngine) {
  console.log("🔄 Example 5: Pipeline with Data Flow");
  console.log("=" .repeat(50));

  const workflow = createPipelineWorkflow("data-pipeline", "Data Processing Pipeline", [
    {
      id: "extract-raw",
      name: "Extract Raw Data",
      agentName: "DataExtractor",
      input: "Extract raw data from the source system",
      timeout: 30000,
    },
    {
      id: "clean-raw",
      name: "Clean Raw Data",
      agentName: "DataCleaner",
      input: "Clean and validate the raw data",
      timeout: 30000,
    },
    {
      id: "transform-clean",
      name: "Transform Clean Data",
      agentName: "DataTransformer",
      input: "Transform cleaned data into business format",
      timeout: 30000,
    },
    {
      id: "analyze-transformed",
      name: "Analyze Transformed Data",
      agentName: "DataAnalyzer",
      input: "Analyze the transformed data for insights",
      timeout: 30000,
    },
    {
      id: "generate-insights-report",
      name: "Generate Insights Report",
      agentName: "ReportGenerator",
      input: "Generate final insights report",
      timeout: 30000,
    },
  ]);

  await engine.registerWorkflow(workflow);
  
  const result = await engine.executeWorkflow("data-pipeline", {
    input: "customer_data_2024.csv",
    outputFormat: "insights_report",
  });

  console.log(`Status: ${result.status}`);
  console.log(`Duration: ${result.duration}ms`);
  console.log(`Pipeline stages completed: ${result.taskResults.filter(t => t.status === "completed").length}/${result.taskResults.length}`);
  console.log(`Final pipeline result: ${result.finalResult}\n`);
}

async function demonstrateIntegration(engine: WorkflowOrchestrationEngine) {
  console.log("🔗 Example 6: Integration with SubAgentManager");
  console.log("=" .repeat(50));

  // Create a supervisor agent with sub-agents
  const supervisorAgent = new Agent({
    name: "DataSupervisor",
    instructions: "You are a data processing supervisor that coordinates multiple specialized agents.",
    llm,
    model: "claude-3-haiku-20240307",
    subAgents: [dataExtractorAgent, dataAnalyzerAgent, dataProcessorAgent],
  });

  // Create integration layer
  const integration = new OrchestrationIntegration(
    supervisorAgent,
    supervisorAgent.getSubAgentManager(),
    engine
  );

  await integration.start();

  console.log("Testing enhanced delegation with orchestration...");

  // Use enhanced delegation that can leverage orchestration
  const result = await integration.enhancedDelegateTask({
    task: "Process customer feedback data and generate insights",
    targetAgents: ["DataExtractor", "DataAnalyzer", "DataProcessor"],
    useOrchestration: true,
    executionMode: "sequential",
    timeout: 30000,
    context: {
      dataSource: "customer_feedback_2024",
      analysisType: "sentiment_and_trends",
    },
  });

  console.log(`Integration result status: ${result.status}`);
  console.log(`Tasks executed: ${result.taskResults.length}`);
  
  // Show backward compatibility
  console.log("\nTesting backward compatibility...");
  const simpleResult = await integration.enhancedDelegateTask({
    task: "Quick data validation",
    targetAgents: ["DataAnalyzer"],
    useOrchestration: false, // Use traditional SubAgentManager
  });

  console.log(`Simple delegation completed: ${Array.isArray(simpleResult) ? simpleResult.length : 1} results`);

  await integration.stop();
  console.log("Integration demonstration completed\n");
}

// Error handling wrapper
async function runExample() {
  try {
    await main();
  } catch (error) {
    console.error("❌ Example failed:", error);
    process.exit(1);
  }
}

// Check for required environment variables
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("❌ Please set ANTHROPIC_API_KEY environment variable");
  console.log("💡 You can get an API key from: https://console.anthropic.com/");
  process.exit(1);
}

// Run the example
runExample();

