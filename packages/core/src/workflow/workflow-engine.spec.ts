import { WorkflowEngine } from "./workflow-engine";
import { createTask, createWorkflow } from "./workflow-builder";
import { TaskPriority, TaskState, WorkflowState } from "./types";

describe("WorkflowEngine", () => {
  let engine: WorkflowEngine;

  beforeEach(() => {
    engine = new WorkflowEngine();
  });

  it("should execute a simple workflow", async () => {
    // Create a simple workflow with two independent tasks
    const task1 = createTask("task1", "Task 1", async () => {
      return { value: "Task 1 result" };
    }).build();

    const task2 = createTask("task2", "Task 2", async () => {
      return { value: "Task 2 result" };
    }).build();

    const workflow = createWorkflow("test-workflow", "Test Workflow")
      .addTask(task1)
      .addTask(task2)
      .build();

    // Execute the workflow
    const result = await engine.executeWorkflow(workflow);

    // Verify the results
    expect(result.state).toBe(WorkflowState.COMPLETED);
    expect(result.results.task1.value).toBe("Task 1 result");
    expect(result.results.task2.value).toBe("Task 2 result");
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it("should respect task dependencies", async () => {
    // Create a workflow with dependent tasks
    const executionOrder: string[] = [];

    const task1 = createTask("task1", "Task 1", async () => {
      executionOrder.push("task1");
      return { value: "Task 1 result" };
    }).build();

    const task2 = createTask("task2", "Task 2", async () => {
      executionOrder.push("task2");
      return { value: "Task 2 result" };
    })
      .withDependencies(["task1"])
      .build();

    const task3 = createTask("task3", "Task 3", async () => {
      executionOrder.push("task3");
      return { value: "Task 3 result" };
    })
      .withDependencies(["task2"])
      .build();

    const workflow = createWorkflow("dependency-workflow", "Dependency Workflow")
      .addTask(task1)
      .addTask(task2)
      .addTask(task3)
      .build();

    // Execute the workflow
    const result = await engine.executeWorkflow(workflow);

    // Verify the execution order
    expect(executionOrder).toEqual(["task1", "task2", "task3"]);
    expect(result.state).toBe(WorkflowState.COMPLETED);
  });

  it("should handle task failures", async () => {
    // Create a workflow with a failing task
    const task1 = createTask("task1", "Task 1", async () => {
      return { value: "Task 1 result" };
    }).build();

    const task2 = createTask("task2", "Task 2", async () => {
      throw new Error("Task 2 failed");
    }).build();

    const workflow = createWorkflow("failure-workflow", "Failure Workflow")
      .addTask(task1)
      .addTask(task2)
      .build();

    // Execute the workflow
    const result = await engine.executeWorkflow(workflow);

    // Verify the results
    expect(result.state).toBe(WorkflowState.FAILED);
    expect(result.results.task1.value).toBe("Task 1 result");
    expect(result.errors.task2).toBeDefined();
    expect(result.errors.task2.message).toBe("Task 2 failed");
  });

  it("should retry failed tasks", async () => {
    // Create a task that fails on first attempt but succeeds on retry
    let attempts = 0;
    
    const retryableTask = createTask("retry-task", "Retry Task", async () => {
      attempts++;
      if (attempts === 1) {
        throw new Error("First attempt failed");
      }
      return { value: `Succeeded on attempt ${attempts}` };
    })
      .withRetryPolicy({
        maxRetries: 3,
        initialDelay: 10, // Short delay for testing
        backoffFactor: 1,
      })
      .build();

    const workflow = createWorkflow("retry-workflow", "Retry Workflow")
      .addTask(retryableTask)
      .build();

    // Execute the workflow
    const result = await engine.executeWorkflow(workflow);

    // Verify the results
    expect(result.state).toBe(WorkflowState.COMPLETED);
    expect(attempts).toBe(2);
    expect(result.results["retry-task"].value).toBe("Succeeded on attempt 2");
  });

  it("should respect concurrency limits", async () => {
    // Create tasks with execution tracking
    const executionTimes: Record<string, { start: number; end: number }> = {};
    
    // Helper to create a task with a specific duration
    const createTimedTask = (id: string, duration: number) => {
      return createTask(id, `Task ${id}`, async () => {
        executionTimes[id] = { start: Date.now(), end: 0 };
        await new Promise(resolve => setTimeout(resolve, duration));
        executionTimes[id].end = Date.now();
        return { value: `${id} result` };
      }).build();
    };

    // Create 4 independent tasks
    const task1 = createTimedTask("task1", 50);
    const task2 = createTimedTask("task2", 50);
    const task3 = createTimedTask("task3", 50);
    const task4 = createTimedTask("task4", 50);

    const workflow = createWorkflow("concurrency-workflow", "Concurrency Workflow")
      .addTask(task1)
      .addTask(task2)
      .addTask(task3)
      .addTask(task4)
      .withConcurrencyLimit(2) // Only 2 tasks can run at a time
      .build();

    // Execute the workflow
    const result = await engine.executeWorkflow(workflow);

    // Verify the results
    expect(result.state).toBe(WorkflowState.COMPLETED);
    
    // Count how many tasks were running concurrently
    let maxConcurrent = 0;
    
    // For each task, count how many other tasks were running at the same time
    for (const taskId in executionTimes) {
      const { start, end } = executionTimes[taskId];
      
      // Count overlapping tasks
      let concurrent = 0;
      for (const otherId in executionTimes) {
        if (otherId !== taskId) {
          const other = executionTimes[otherId];
          // Check if the tasks overlap
          if (start < other.end && end > other.start) {
            concurrent++;
          }
        }
      }
      
      maxConcurrent = Math.max(maxConcurrent, concurrent + 1); // +1 for the task itself
    }
    
    // Verify that no more than 2 tasks ran concurrently
    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });

  it("should prioritize tasks correctly", async () => {
    // Create tasks with different priorities
    const executionOrder: string[] = [];
    
    const lowPriorityTask = createTask("low", "Low Priority", async () => {
      executionOrder.push("low");
      return { value: "Low priority result" };
    })
      .withPriority(TaskPriority.LOW)
      .build();

    const normalPriorityTask = createTask("normal", "Normal Priority", async () => {
      executionOrder.push("normal");
      return { value: "Normal priority result" };
    })
      .withPriority(TaskPriority.NORMAL)
      .build();

    const highPriorityTask = createTask("high", "High Priority", async () => {
      executionOrder.push("high");
      return { value: "High priority result" };
    })
      .withPriority(TaskPriority.HIGH)
      .build();

    const criticalPriorityTask = createTask("critical", "Critical Priority", async () => {
      executionOrder.push("critical");
      return { value: "Critical priority result" };
    })
      .withPriority(TaskPriority.CRITICAL)
      .build();

    // Create a workflow with concurrency limit of 1 to force sequential execution
    const workflow = createWorkflow("priority-workflow", "Priority Workflow")
      .addTask(lowPriorityTask)
      .addTask(normalPriorityTask)
      .addTask(highPriorityTask)
      .addTask(criticalPriorityTask)
      .withConcurrencyLimit(1) // Force sequential execution
      .build();

    // Execute the workflow
    const result = await engine.executeWorkflow(workflow);

    // Verify the execution order (should be in order of priority)
    expect(executionOrder).toEqual(["critical", "high", "normal", "low"]);
    expect(result.state).toBe(WorkflowState.COMPLETED);
  });

  it("should handle task cancellation", async () => {
    // Create a long-running task
    const longTask = createTask("long", "Long Task", async (_, options) => {
      // This task will run for 1 second unless cancelled
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(resolve, 1000);
        
        // Handle cancellation
        options?.signal?.addEventListener("abort", () => {
          clearTimeout(timeout);
          reject(new Error("Task cancelled"));
        });
      });
      
      return { value: "Long task completed" };
    }).build();

    const workflow = createWorkflow("cancellation-workflow", "Cancellation Workflow")
      .addTask(longTask)
      .build();

    // Start the workflow
    const workflowPromise = engine.executeWorkflow(workflow);
    
    // Get the workflow instance
    const workflowInstance = engine.getWorkflow("cancellation-workflow");
    expect(workflowInstance).toBeDefined();
    
    // Wait a bit to ensure the task has started
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Cancel the workflow
    engine.cancelWorkflow(workflowInstance!, "Test cancellation");
    
    // Wait for the workflow to complete
    const result = await workflowPromise;
    
    // Verify the results
    expect(result.state).toBe(WorkflowState.CANCELLED);
    expect(workflowInstance!.tasks.get("long")!.state).toBe(TaskState.CANCELLED);
  });

  it("should handle dynamic task inputs", async () => {
    // Create tasks with dynamic inputs
    const task1 = createTask("task1", "Task 1", async () => {
      return { value: 10 };
    }).build();

    const task2 = createTask("task2", "Task 2", async () => {
      return { value: 20 };
    }).build();

    const task3 = createTask("task3", "Task 3", async (input: { a: number; b: number }) => {
      return { sum: input.a + input.b };
    })
      .withInputFunction(results => ({
        a: results.task1.value,
        b: results.task2.value,
      }))
      .withDependencies(["task1", "task2"])
      .build();

    const workflow = createWorkflow("dynamic-input-workflow", "Dynamic Input Workflow")
      .addTask(task1)
      .addTask(task2)
      .addTask(task3)
      .build();

    // Execute the workflow
    const result = await engine.executeWorkflow(workflow);

    // Verify the results
    expect(result.state).toBe(WorkflowState.COMPLETED);
    expect(result.results.task3.sum).toBe(30);
  });

  it("should handle resource allocation", async () => {
    // Set resource limits
    engine.updateResources({
      cpu: 100,
      memory: 100,
    });
    
    // Create tasks with resource requirements
    const highCpuTask = createTask("high-cpu", "High CPU Task", async () => {
      return { value: "High CPU Task result" };
    })
      .withResources({ cpu: 80, memory: 20 })
      .build();

    const highMemoryTask = createTask("high-memory", "High Memory Task", async () => {
      return { value: "High Memory Task result" };
    })
      .withResources({ cpu: 20, memory: 80 })
      .build();

    const workflow = createWorkflow("resource-workflow", "Resource Workflow")
      .addTask(highCpuTask)
      .addTask(highMemoryTask)
      .build();

    // Execute the workflow
    const result = await engine.executeWorkflow(workflow);

    // Verify the results
    expect(result.state).toBe(WorkflowState.COMPLETED);
    expect(result.results["high-cpu"].value).toBe("High CPU Task result");
    expect(result.results["high-memory"].value).toBe("High Memory Task result");
    
    // Check resource utilization after workflow completion
    const utilization = engine.getResourceUtilization();
    expect(utilization.cpu).toBe(0);
    expect(utilization.memory).toBe(0);
  });
});

