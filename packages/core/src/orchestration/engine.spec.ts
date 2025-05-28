import { WorkflowOrchestrationEngine } from "./engine";
import type {
  WorkflowDefinition,
  WorkflowExecutionOptions,
  WorkflowExecutionResult,
  TaskExecutionResult,
} from "./types";

// Mock Agent class
class MockAgent {
  public id: string;
  public name: string;
  public instructions: string;
  public tools: any[] = [];
  public memory: any = null;

  constructor(name: string, instructions = "") {
    this.id = `agent_${name.toLowerCase()}_${Date.now()}`;
    this.name = name;
    this.instructions = instructions;
  }

  async generateText(input: string, options?: any): Promise<{ text: string; conversationId?: string }> {
    // Simulate agent processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate different responses based on agent name
    let response = `${this.name} processed: ${input}`;
    
    if (this.name.includes("Analyzer")) {
      response = input.includes("error") ? "low_quality" : "high_quality";
    } else if (this.name.includes("Processor")) {
      response = `Processed data: ${input}`;
    } else if (this.name.includes("Cleaner")) {
      response = `Cleaned data: ${input}`;
    }

    return {
      text: response,
      conversationId: options?.conversationId || `conv_${Date.now()}`,
    };
  }
}

describe("WorkflowOrchestrationEngine", () => {
  let engine: WorkflowOrchestrationEngine;
  let mockAgents: MockAgent[];

  beforeEach(async () => {
    mockAgents = [
      new MockAgent("DataExtractor", "Extracts data from sources"),
      new MockAgent("DataAnalyzer", "Analyzes data quality"),
      new MockAgent("DataProcessor", "Processes high quality data"),
      new MockAgent("DataCleaner", "Cleans low quality data"),
      new MockAgent("DataTransformer", "Transforms data format"),
    ];

    engine = new WorkflowOrchestrationEngine(mockAgents as any, {
      maxConcurrentWorkflows: 5,
      maxConcurrentTasks: 10,
      persistenceEnabled: false,
    });

    await engine.start();
  });

  afterEach(async () => {
    await engine.stop();
  });

  describe("Workflow Registration", () => {
    it("should register a valid workflow", async () => {
      const workflow: WorkflowDefinition = {
        id: "test_workflow",
        name: "Test Workflow",
        version: "1.0.0",
        mode: "sequential",
        tasks: [
          {
            id: "task1",
            name: "Extract Data",
            agentName: "DataExtractor",
            input: "Extract from database",
          },
        ],
      };

      await expect(engine.registerWorkflow(workflow)).resolves.not.toThrow();
      
      const retrieved = await engine.getWorkflow("test_workflow");
      expect(retrieved).toEqual(workflow);
    });

    it("should reject invalid workflow", async () => {
      const invalidWorkflow: WorkflowDefinition = {
        id: "",
        name: "Invalid Workflow",
        version: "1.0.0",
        mode: "sequential",
        tasks: [],
      };

      await expect(engine.registerWorkflow(invalidWorkflow)).rejects.toThrow();
    });

    it("should reject workflow with non-existent agent", async () => {
      const workflow: WorkflowDefinition = {
        id: "invalid_agent_workflow",
        name: "Invalid Agent Workflow",
        version: "1.0.0",
        mode: "sequential",
        tasks: [
          {
            id: "task1",
            name: "Invalid Task",
            agentName: "NonExistentAgent",
            input: "Do something",
          },
        ],
      };

      await expect(engine.registerWorkflow(workflow)).rejects.toThrow();
    });
  });

  describe("Sequential Execution", () => {
    it("should execute tasks sequentially", async () => {
      const workflow: WorkflowDefinition = {
        id: "sequential_workflow",
        name: "Sequential Workflow",
        version: "1.0.0",
        mode: "sequential",
        tasks: [
          {
            id: "extract",
            name: "Extract Data",
            agentName: "DataExtractor",
            input: "Extract from source",
          },
          {
            id: "transform",
            name: "Transform Data",
            agentName: "DataTransformer",
            input: "Transform extracted data",
          },
        ],
      };

      await engine.registerWorkflow(workflow);
      const result = await engine.executeWorkflow("sequential_workflow");

      expect(result.status).toBe("completed");
      expect(result.taskResults).toHaveLength(2);
      expect(result.taskResults[0].taskId).toBe("extract");
      expect(result.taskResults[1].taskId).toBe("transform");
      
      // Check that tasks executed in order
      const extractEndTime = result.taskResults[0].endTime!.getTime();
      const transformStartTime = result.taskResults[1].startTime.getTime();
      expect(transformStartTime).toBeGreaterThanOrEqual(extractEndTime);
    });
  });

  describe("Parallel Execution", () => {
    it("should execute tasks in parallel", async () => {
      const workflow: WorkflowDefinition = {
        id: "parallel_workflow",
        name: "Parallel Workflow",
        version: "1.0.0",
        mode: "parallel",
        tasks: [
          {
            id: "extract1",
            name: "Extract Data 1",
            agentName: "DataExtractor",
            input: "Extract from source 1",
          },
          {
            id: "extract2",
            name: "Extract Data 2",
            agentName: "DataAnalyzer",
            input: "Extract from source 2",
          },
        ],
      };

      await engine.registerWorkflow(workflow);
      const result = await engine.executeWorkflow("parallel_workflow");

      expect(result.status).toBe("completed");
      expect(result.taskResults).toHaveLength(2);
      
      // Check that tasks started around the same time (parallel execution)
      const startTime1 = result.taskResults[0].startTime.getTime();
      const startTime2 = result.taskResults[1].startTime.getTime();
      expect(Math.abs(startTime1 - startTime2)).toBeLessThan(1000); // Within 1 second
    });
  });

  describe("Conditional Execution", () => {
    it("should execute tasks based on conditions", async () => {
      const workflow: WorkflowDefinition = {
        id: "conditional_workflow",
        name: "Conditional Workflow",
        version: "1.0.0",
        mode: "conditional",
        tasks: [
          {
            id: "analyze",
            name: "Analyze Data",
            agentName: "DataAnalyzer",
            input: "good data", // This will return "high_quality"
          },
          {
            id: "process",
            name: "Process Good Data",
            agentName: "DataProcessor",
            input: "Process the data",
            conditions: [
              {
                type: "result",
                taskId: "analyze",
                operator: "contains",
                value: "high_quality",
              },
            ],
          },
          {
            id: "clean",
            name: "Clean Bad Data",
            agentName: "DataCleaner",
            input: "Clean the data",
            conditions: [
              {
                type: "result",
                taskId: "analyze",
                operator: "contains",
                value: "low_quality",
              },
            ],
          },
        ],
      };

      await engine.registerWorkflow(workflow);
      const result = await engine.executeWorkflow("conditional_workflow");

      expect(result.status).toBe("completed");
      expect(result.taskResults).toHaveLength(3);
      
      // Check that analyze task completed
      const analyzeResult = result.taskResults.find(r => r.taskId === "analyze");
      expect(analyzeResult?.status).toBe("completed");
      
      // Check that process task executed (condition met)
      const processResult = result.taskResults.find(r => r.taskId === "process");
      expect(processResult?.status).toBe("completed");
      
      // Check that clean task was skipped (condition not met)
      const cleanResult = result.taskResults.find(r => r.taskId === "clean");
      expect(cleanResult?.status).toBe("skipped");
    });
  });

  describe("Pipeline Execution", () => {
    it("should execute tasks in pipeline mode with data flow", async () => {
      const workflow: WorkflowDefinition = {
        id: "pipeline_workflow",
        name: "Pipeline Workflow",
        version: "1.0.0",
        mode: "pipeline",
        tasks: [
          {
            id: "extract",
            name: "Extract Data",
            agentName: "DataExtractor",
            input: "Extract from database",
          },
          {
            id: "transform",
            name: "Transform Data",
            agentName: "DataTransformer",
            input: "Transform the data",
          },
        ],
      };

      await engine.registerWorkflow(workflow);
      const result = await engine.executeWorkflow("pipeline_workflow", { input: "initial data" });

      expect(result.status).toBe("completed");
      expect(result.taskResults).toHaveLength(2);
      
      // Check that data flowed between tasks
      const extractResult = result.taskResults.find(r => r.taskId === "extract");
      const transformResult = result.taskResults.find(r => r.taskId === "transform");
      
      expect(extractResult?.status).toBe("completed");
      expect(transformResult?.status).toBe("completed");
    });
  });

  describe("Graph Execution", () => {
    it("should execute tasks based on dependency graph", async () => {
      const workflow: WorkflowDefinition = {
        id: "graph_workflow",
        name: "Graph Workflow",
        version: "1.0.0",
        mode: "graph",
        tasks: [
          {
            id: "extract",
            name: "Extract Data",
            agentName: "DataExtractor",
            input: "Extract from source",
          },
          {
            id: "analyze",
            name: "Analyze Data",
            agentName: "DataAnalyzer",
            input: "Analyze extracted data",
            dependencies: ["extract"],
          },
          {
            id: "process",
            name: "Process Data",
            agentName: "DataProcessor",
            input: "Process analyzed data",
            dependencies: ["analyze"],
          },
          {
            id: "transform",
            name: "Transform Data",
            agentName: "DataTransformer",
            input: "Transform processed data",
            dependencies: ["process"],
          },
        ],
      };

      await engine.registerWorkflow(workflow);
      const result = await engine.executeWorkflow("graph_workflow");

      expect(result.status).toBe("completed");
      expect(result.taskResults).toHaveLength(4);
      
      // Check execution order based on dependencies
      const extractResult = result.taskResults.find(r => r.taskId === "extract")!;
      const analyzeResult = result.taskResults.find(r => r.taskId === "analyze")!;
      const processResult = result.taskResults.find(r => r.taskId === "process")!;
      const transformResult = result.taskResults.find(r => r.taskId === "transform")!;
      
      expect(extractResult.endTime!.getTime()).toBeLessThanOrEqual(analyzeResult.startTime.getTime());
      expect(analyzeResult.endTime!.getTime()).toBeLessThanOrEqual(processResult.startTime.getTime());
      expect(processResult.endTime!.getTime()).toBeLessThanOrEqual(transformResult.startTime.getTime());
    });

    it("should handle parallel branches in dependency graph", async () => {
      const workflow: WorkflowDefinition = {
        id: "parallel_graph_workflow",
        name: "Parallel Graph Workflow",
        version: "1.0.0",
        mode: "graph",
        tasks: [
          {
            id: "extract",
            name: "Extract Data",
            agentName: "DataExtractor",
            input: "Extract from source",
          },
          {
            id: "analyze",
            name: "Analyze Data",
            agentName: "DataAnalyzer",
            input: "Analyze data",
            dependencies: ["extract"],
          },
          {
            id: "clean",
            name: "Clean Data",
            agentName: "DataCleaner",
            input: "Clean data",
            dependencies: ["extract"],
          },
          {
            id: "process",
            name: "Process Data",
            agentName: "DataProcessor",
            input: "Process data",
            dependencies: ["analyze", "clean"],
          },
        ],
      };

      await engine.registerWorkflow(workflow);
      const result = await engine.executeWorkflow("parallel_graph_workflow");

      expect(result.status).toBe("completed");
      expect(result.taskResults).toHaveLength(4);
      
      // Check that analyze and clean can run in parallel after extract
      const extractResult = result.taskResults.find(r => r.taskId === "extract")!;
      const analyzeResult = result.taskResults.find(r => r.taskId === "analyze")!;
      const cleanResult = result.taskResults.find(r => r.taskId === "clean")!;
      const processResult = result.taskResults.find(r => r.taskId === "process")!;
      
      // Extract must complete before analyze and clean
      expect(extractResult.endTime!.getTime()).toBeLessThanOrEqual(analyzeResult.startTime.getTime());
      expect(extractResult.endTime!.getTime()).toBeLessThanOrEqual(cleanResult.startTime.getTime());
      
      // Process must wait for both analyze and clean
      expect(analyzeResult.endTime!.getTime()).toBeLessThanOrEqual(processResult.startTime.getTime());
      expect(cleanResult.endTime!.getTime()).toBeLessThanOrEqual(processResult.startTime.getTime());
    });
  });

  describe("Workflow Execution Options", () => {
    it("should handle dry run execution", async () => {
      const workflow: WorkflowDefinition = {
        id: "dry_run_workflow",
        name: "Dry Run Workflow",
        version: "1.0.0",
        mode: "sequential",
        tasks: [
          {
            id: "task1",
            name: "Test Task",
            agentName: "DataExtractor",
            input: "Test input",
          },
        ],
      };

      await engine.registerWorkflow(workflow);
      const result = await engine.executeWorkflow("dry_run_workflow", {}, { dryRun: true });

      expect(result.status).toBe("completed");
      expect(result.taskResults).toHaveLength(1);
      expect(result.taskResults[0].result).toContain("[DRY RUN]");
      expect(result.finalResult).toContain("[DRY RUN]");
    });

    it("should pass user context to agents", async () => {
      const workflow: WorkflowDefinition = {
        id: "context_workflow",
        name: "Context Workflow",
        version: "1.0.0",
        mode: "sequential",
        tasks: [
          {
            id: "task1",
            name: "Context Task",
            agentName: "DataExtractor",
            input: "Process with context",
          },
        ],
      };

      const userContext = new Map([["userId", "test123"], ["sessionId", "session456"]]);

      await engine.registerWorkflow(workflow);
      const result = await engine.executeWorkflow("context_workflow", {}, { userContext });

      expect(result.status).toBe("completed");
      expect(result.taskResults).toHaveLength(1);
    });
  });

  describe("Error Handling", () => {
    it("should handle task failures gracefully", async () => {
      // Create a mock agent that always fails
      const failingAgent = new MockAgent("FailingAgent");
      failingAgent.generateText = async () => {
        throw new Error("Simulated task failure");
      };

      engine.registerAgent(failingAgent as any);

      const workflow: WorkflowDefinition = {
        id: "failing_workflow",
        name: "Failing Workflow",
        version: "1.0.0",
        mode: "sequential",
        tasks: [
          {
            id: "failing_task",
            name: "Failing Task",
            agentName: "FailingAgent",
            input: "This will fail",
          },
        ],
      };

      await engine.registerWorkflow(workflow);
      const result = await engine.executeWorkflow("failing_workflow");

      expect(result.status).toBe("failed");
      expect(result.taskResults).toHaveLength(1);
      expect(result.taskResults[0].status).toBe("failed");
      expect(result.taskResults[0].error).toBeDefined();
      expect(result.error).toBeDefined();
    });
  });

  describe("Workflow Management", () => {
    it("should list all registered workflows", async () => {
      const workflow1: WorkflowDefinition = {
        id: "workflow1",
        name: "Workflow 1",
        version: "1.0.0",
        mode: "sequential",
        tasks: [
          {
            id: "task1",
            name: "Task 1",
            agentName: "DataExtractor",
            input: "Test",
          },
        ],
      };

      const workflow2: WorkflowDefinition = {
        id: "workflow2",
        name: "Workflow 2",
        version: "1.0.0",
        mode: "parallel",
        tasks: [
          {
            id: "task2",
            name: "Task 2",
            agentName: "DataAnalyzer",
            input: "Test",
          },
        ],
      };

      await engine.registerWorkflow(workflow1);
      await engine.registerWorkflow(workflow2);

      const workflows = await engine.listWorkflows();
      expect(workflows).toHaveLength(2);
      expect(workflows.map(w => w.id)).toContain("workflow1");
      expect(workflows.map(w => w.id)).toContain("workflow2");
    });

    it("should unregister workflows", async () => {
      const workflow: WorkflowDefinition = {
        id: "temp_workflow",
        name: "Temporary Workflow",
        version: "1.0.0",
        mode: "sequential",
        tasks: [
          {
            id: "task1",
            name: "Task 1",
            agentName: "DataExtractor",
            input: "Test",
          },
        ],
      };

      await engine.registerWorkflow(workflow);
      expect(await engine.getWorkflow("temp_workflow")).toBeDefined();

      await engine.unregisterWorkflow("temp_workflow");
      expect(await engine.getWorkflow("temp_workflow")).toBeNull();
    });
  });

  describe("Event Handling", () => {
    it("should emit workflow events", async () => {
      const events: any[] = [];
      
      engine.onWorkflowEvent((event) => {
        events.push(event);
      });

      const workflow: WorkflowDefinition = {
        id: "event_workflow",
        name: "Event Workflow",
        version: "1.0.0",
        mode: "sequential",
        tasks: [
          {
            id: "task1",
            name: "Event Task",
            agentName: "DataExtractor",
            input: "Test events",
          },
        ],
      };

      await engine.registerWorkflow(workflow);
      await engine.executeWorkflow("event_workflow");

      // Check that events were emitted
      expect(events.length).toBeGreaterThan(0);
      
      const eventTypes = events.map(e => e.type);
      expect(eventTypes).toContain("workflow_started");
      expect(eventTypes).toContain("task_started");
      expect(eventTypes).toContain("task_completed");
      expect(eventTypes).toContain("workflow_completed");
    });
  });
});

