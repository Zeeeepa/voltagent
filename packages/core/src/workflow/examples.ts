import {
  createTask,
  createWorkflow,
  createWorkflowEngine,
  Priority,
  TaskExecutionOptions,
} from "./index";

/**
 * Example: Simple parallel workflow
 * 
 * This example demonstrates a simple workflow with parallel tasks.
 */
export async function simpleParallelWorkflowExample() {
  // Create tasks
  const fetchDataTask = createTask(
    "fetch-data",
    "Fetch Data",
    async (input: { url: string }, options?: TaskExecutionOptions) => {
      console.log(`Fetching data from ${input.url}...`);
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { data: `Data from ${input.url}` };
    }
  )
    .withInput({ url: "https://api.example.com/data" })
    .withPriority(Priority.HIGH)
    .build();
  
  const processDataTask = createTask(
    "process-data",
    "Process Data",
    async (input: { data: string }, options?: TaskExecutionOptions) => {
      console.log(`Processing data: ${input.data}`);
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 500));
      return { processed: `Processed ${input.data}` };
    }
  )
    .withInputFunction(results => ({ data: results["fetch-data"].data }))
    .withDependencies(["fetch-data"])
    .build();
  
  const fetchUserTask = createTask(
    "fetch-user",
    "Fetch User",
    async (input: { userId: string }, options?: TaskExecutionOptions) => {
      console.log(`Fetching user ${input.userId}...`);
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 800));
      return { user: `User ${input.userId}` };
    }
  )
    .withInput({ userId: "123" })
    .withPriority(Priority.NORMAL)
    .build();
  
  const generateReportTask = createTask(
    "generate-report",
    "Generate Report",
    async (input: { processed: string; user: string }, options?: TaskExecutionOptions) => {
      console.log(`Generating report with ${input.processed} for ${input.user}`);
      // Simulate report generation
      await new Promise(resolve => setTimeout(resolve, 1200));
      return { report: `Report for ${input.user}: ${input.processed}` };
    }
  )
    .withInputFunction(results => ({
      processed: results["process-data"].processed,
      user: results["fetch-user"].user,
    }))
    .withDependencies(["process-data", "fetch-user"])
    .build();
  
  // Create workflow
  const workflow = createWorkflow("example-workflow", "Example Workflow")
    .withDescription("A simple example workflow with parallel tasks")
    .addTask(fetchDataTask)
    .addTask(processDataTask)
    .addTask(fetchUserTask)
    .addTask(generateReportTask)
    .withConcurrencyLimit(2) // Only run 2 tasks at a time
    .build();
  
  // Create workflow engine
  const engine = createWorkflowEngine();
  
  // Execute workflow
  console.log("Starting workflow execution...");
  const result = await engine.executeWorkflow(workflow);
  
  console.log("Workflow execution completed!");
  console.log("Results:", JSON.stringify(result.results, null, 2));
  console.log("Duration:", result.duration, "ms");
  
  return result;
}

/**
 * Example: Complex workflow with error handling and retries
 * 
 * This example demonstrates a more complex workflow with error handling and retries.
 */
export async function complexWorkflowExample() {
  // Create tasks
  const task1 = createTask(
    "task1",
    "Task 1",
    async (input: any, options?: TaskExecutionOptions) => {
      console.log("Executing Task 1");
      await new Promise(resolve => setTimeout(resolve, 500));
      return { value: "Task 1 result" };
    }
  )
    .withPriority(Priority.HIGH)
    .build();
  
  const task2 = createTask(
    "task2",
    "Task 2",
    async (input: any, options?: TaskExecutionOptions) => {
      console.log("Executing Task 2");
      await new Promise(resolve => setTimeout(resolve, 700));
      
      // Randomly fail with 50% probability
      if (Math.random() < 0.5) {
        throw new Error("Task 2 failed randomly");
      }
      
      return { value: "Task 2 result" };
    }
  )
    .withDependencies(["task1"])
    .withRetryPolicy({
      maxRetries: 3,
      initialDelay: 100,
      backoffFactor: 2,
    })
    .build();
  
  const task3 = createTask(
    "task3",
    "Task 3",
    async (input: any, options?: TaskExecutionOptions) => {
      console.log("Executing Task 3");
      await new Promise(resolve => setTimeout(resolve, 600));
      return { value: "Task 3 result" };
    }
  )
    .withDependencies(["task1"])
    .build();
  
  const task4 = createTask(
    "task4",
    "Task 4",
    async (input: any, options?: TaskExecutionOptions) => {
      console.log("Executing Task 4");
      await new Promise(resolve => setTimeout(resolve, 800));
      return { value: "Task 4 result" };
    }
  )
    .withDependencies(["task2", "task3"])
    .withFailureMode("continue-workflow") // Continue even if this task fails
    .build();
  
  // Create workflow
  const workflow = createWorkflow("complex-workflow", "Complex Workflow")
    .withDescription("A complex workflow with error handling and retries")
    .addTask(task1)
    .addTask(task2)
    .addTask(task3)
    .addTask(task4)
    .withFailFast(false) // Don't fail the workflow on first task failure
    .build();
  
  // Create workflow engine
  const engine = createWorkflowEngine();
  
  // Add event listeners
  workflow.eventEmitter.on("task:retrying", (event) => {
    console.log(`Task ${event.taskName} is being retried (attempt ${event.retryCount})`);
  });
  
  workflow.eventEmitter.on("task:failed", (event) => {
    console.log(`Task ${event.taskName} failed: ${event.error.message}`);
  });
  
  // Execute workflow
  console.log("Starting complex workflow execution...");
  const result = await engine.executeWorkflow(workflow);
  
  console.log("Complex workflow execution completed!");
  console.log("State:", result.state);
  console.log("Results:", JSON.stringify(result.results, null, 2));
  console.log("Errors:", Object.keys(result.errors).length > 0 ? result.errors : "None");
  console.log("Duration:", result.duration, "ms");
  
  return result;
}

/**
 * Example: Resource-constrained workflow
 * 
 * This example demonstrates a workflow with resource constraints.
 */
export async function resourceConstrainedWorkflowExample() {
  // Create tasks with resource requirements
  const highCpuTask = createTask(
    "high-cpu",
    "High CPU Task",
    async (input: any, options?: TaskExecutionOptions) => {
      console.log("Executing High CPU Task");
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { value: "High CPU Task result" };
    }
  )
    .withResources({ cpu: 80, memory: 20 })
    .build();
  
  const highMemoryTask = createTask(
    "high-memory",
    "High Memory Task",
    async (input: any, options?: TaskExecutionOptions) => {
      console.log("Executing High Memory Task");
      await new Promise(resolve => setTimeout(resolve, 1200));
      return { value: "High Memory Task result" };
    }
  )
    .withResources({ cpu: 20, memory: 80 })
    .build();
  
  const mediumResourceTask1 = createTask(
    "medium-1",
    "Medium Resource Task 1",
    async (input: any, options?: TaskExecutionOptions) => {
      console.log("Executing Medium Resource Task 1");
      await new Promise(resolve => setTimeout(resolve, 800));
      return { value: "Medium Resource Task 1 result" };
    }
  )
    .withResources({ cpu: 40, memory: 40 })
    .build();
  
  const mediumResourceTask2 = createTask(
    "medium-2",
    "Medium Resource Task 2",
    async (input: any, options?: TaskExecutionOptions) => {
      console.log("Executing Medium Resource Task 2");
      await new Promise(resolve => setTimeout(resolve, 900));
      return { value: "Medium Resource Task 2 result" };
    }
  )
    .withResources({ cpu: 40, memory: 40 })
    .build();
  
  const finalTask = createTask(
    "final",
    "Final Task",
    async (input: any, options?: TaskExecutionOptions) => {
      console.log("Executing Final Task");
      await new Promise(resolve => setTimeout(resolve, 500));
      return { value: "Final Task result" };
    }
  )
    .withDependencies(["high-cpu", "high-memory", "medium-1", "medium-2"])
    .build();
  
  // Create workflow
  const workflow = createWorkflow("resource-workflow", "Resource Workflow")
    .withDescription("A workflow with resource constraints")
    .addTask(highCpuTask)
    .addTask(highMemoryTask)
    .addTask(mediumResourceTask1)
    .addTask(mediumResourceTask2)
    .addTask(finalTask)
    .build();
  
  // Create workflow engine
  const engine = createWorkflowEngine();
  
  // Set resource limits
  engine.updateResources({
    cpu: 100, // 100 CPU units available
    memory: 100, // 100 memory units available
  });
  
  // Execute workflow
  console.log("Starting resource-constrained workflow execution...");
  console.log("Resource utilization:", JSON.stringify(engine.getResourceUtilization(), null, 2));
  
  const result = await engine.executeWorkflow(workflow);
  
  console.log("Resource-constrained workflow execution completed!");
  console.log("Results:", JSON.stringify(result.results, null, 2));
  console.log("Duration:", result.duration, "ms");
  console.log("Final resource utilization:", JSON.stringify(engine.getResourceUtilization(), null, 2));
  
  return result;
}

