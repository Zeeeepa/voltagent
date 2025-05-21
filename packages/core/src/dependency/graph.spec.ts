import { DependencyGraph } from "./graph";
import { DependencyType, TaskStatus } from "./types";

describe("DependencyGraph", () => {
  let graph: DependencyGraph;

  beforeEach(() => {
    graph = new DependencyGraph();
  });

  describe("Task Management", () => {
    it("should add a task", () => {
      const task = graph.addTask({
        name: "Test Task",
        description: "A test task",
      });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.name).toBe("Test Task");
      expect(task.description).toBe("A test task");
      expect(task.status).toBe(TaskStatus.PENDING);
    });

    it("should get a task by ID", () => {
      const task = graph.addTask({
        name: "Test Task",
      });

      const retrievedTask = graph.getTask(task.id);
      expect(retrievedTask).toBeDefined();
      expect(retrievedTask?.id).toBe(task.id);
      expect(retrievedTask?.name).toBe("Test Task");
    });

    it("should get all tasks", () => {
      graph.addTask({ name: "Task 1" });
      graph.addTask({ name: "Task 2" });
      graph.addTask({ name: "Task 3" });

      const tasks = graph.getAllTasks();
      expect(tasks.length).toBe(3);
      expect(tasks.map(t => t.name)).toContain("Task 1");
      expect(tasks.map(t => t.name)).toContain("Task 2");
      expect(tasks.map(t => t.name)).toContain("Task 3");
    });

    it("should update a task", () => {
      const task = graph.addTask({
        name: "Test Task",
        description: "Original description",
      });

      const updatedTask = graph.updateTask(task.id, {
        name: "Updated Task",
        description: "Updated description",
      });

      expect(updatedTask).toBeDefined();
      expect(updatedTask?.name).toBe("Updated Task");
      expect(updatedTask?.description).toBe("Updated description");

      // Verify the task was actually updated in the graph
      const retrievedTask = graph.getTask(task.id);
      expect(retrievedTask?.name).toBe("Updated Task");
      expect(retrievedTask?.description).toBe("Updated description");
    });

    it("should remove a task", () => {
      const task = graph.addTask({
        name: "Test Task",
      });

      const result = graph.removeTask(task.id);
      expect(result).toBe(true);

      const retrievedTask = graph.getTask(task.id);
      expect(retrievedTask).toBeUndefined();
    });

    it("should return false when removing a non-existent task", () => {
      const result = graph.removeTask("non-existent-id");
      expect(result).toBe(false);
    });
  });

  describe("Dependency Management", () => {
    it("should add a dependency between two tasks", () => {
      const task1 = graph.addTask({ name: "Task 1" });
      const task2 = graph.addTask({ name: "Task 2" });

      const dependency = graph.addDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
        type: DependencyType.FINISH_TO_START,
      });

      expect(dependency).toBeDefined();
      expect(dependency?.predecessorId).toBe(task1.id);
      expect(dependency?.dependentId).toBe(task2.id);
      expect(dependency?.type).toBe(DependencyType.FINISH_TO_START);
    });

    it("should return undefined when adding a dependency with non-existent tasks", () => {
      const task = graph.addTask({ name: "Task 1" });

      const dependency1 = graph.addDependency({
        predecessorId: "non-existent-id",
        dependentId: task.id,
      });

      const dependency2 = graph.addDependency({
        predecessorId: task.id,
        dependentId: "non-existent-id",
      });

      expect(dependency1).toBeUndefined();
      expect(dependency2).toBeUndefined();
    });

    it("should not allow self-dependencies", () => {
      const task = graph.addTask({ name: "Task 1" });

      const dependency = graph.addDependency({
        predecessorId: task.id,
        dependentId: task.id,
      });

      expect(dependency).toBeUndefined();
    });

    it("should get dependencies for a task", () => {
      const task1 = graph.addTask({ name: "Task 1" });
      const task2 = graph.addTask({ name: "Task 2" });
      const task3 = graph.addTask({ name: "Task 3" });

      graph.addDependency({
        predecessorId: task1.id,
        dependentId: task3.id,
      });

      graph.addDependency({
        predecessorId: task2.id,
        dependentId: task3.id,
      });

      const dependencies = graph.getDependenciesForTask(task3.id);
      expect(dependencies.length).toBe(2);
      expect(dependencies.map(d => d.predecessorId)).toContain(task1.id);
      expect(dependencies.map(d => d.predecessorId)).toContain(task2.id);
    });

    it("should get dependents for a task", () => {
      const task1 = graph.addTask({ name: "Task 1" });
      const task2 = graph.addTask({ name: "Task 2" });
      const task3 = graph.addTask({ name: "Task 3" });

      graph.addDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
      });

      graph.addDependency({
        predecessorId: task1.id,
        dependentId: task3.id,
      });

      const dependents = graph.getDependentsForTask(task1.id);
      expect(dependents.length).toBe(2);
      expect(dependents.map(d => d.dependentId)).toContain(task2.id);
      expect(dependents.map(d => d.dependentId)).toContain(task3.id);
    });

    it("should remove a dependency", () => {
      const task1 = graph.addTask({ name: "Task 1" });
      const task2 = graph.addTask({ name: "Task 2" });

      graph.addDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
      });

      const result = graph.removeDependency(task1.id, task2.id);
      expect(result).toBe(true);

      const dependencies = graph.getDependenciesForTask(task2.id);
      expect(dependencies.length).toBe(0);
    });

    it("should return false when removing a non-existent dependency", () => {
      const task1 = graph.addTask({ name: "Task 1" });
      const task2 = graph.addTask({ name: "Task 2" });

      const result = graph.removeDependency(task1.id, task2.id);
      expect(result).toBe(false);
    });
  });

  describe("Task Status Management", () => {
    it("should update task status", () => {
      const task = graph.addTask({ name: "Test Task" });

      const timestamp = new Date();
      const updatedTask = graph.updateTaskStatus(task.id, TaskStatus.IN_PROGRESS, timestamp);

      expect(updatedTask).toBeDefined();
      expect(updatedTask?.status).toBe(TaskStatus.IN_PROGRESS);
      expect(updatedTask?.startTime).toEqual(timestamp);
    });

    it("should update end time when completing a task", () => {
      const task = graph.addTask({ name: "Test Task" });

      const startTime = new Date(2023, 0, 1, 10, 0, 0);
      graph.updateTaskStatus(task.id, TaskStatus.IN_PROGRESS, startTime);

      const endTime = new Date(2023, 0, 1, 12, 0, 0);
      const completedTask = graph.updateTaskStatus(task.id, TaskStatus.COMPLETED, endTime);

      expect(completedTask).toBeDefined();
      expect(completedTask?.status).toBe(TaskStatus.COMPLETED);
      expect(completedTask?.startTime).toEqual(startTime);
      expect(completedTask?.endTime).toEqual(endTime);
      expect(completedTask?.actualDuration).toBe(2 * 60 * 60 * 1000); // 2 hours in milliseconds
    });

    it("should get ready tasks", () => {
      const task1 = graph.addTask({ name: "Task 1" });
      const task2 = graph.addTask({ name: "Task 2" });
      const task3 = graph.addTask({ name: "Task 3" });

      graph.addDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
        type: DependencyType.FINISH_TO_START,
      });

      // Initially, only task1 and task3 should be ready (no dependencies)
      let readyTasks = graph.getReadyTasks();
      expect(readyTasks.length).toBe(2);
      expect(readyTasks.map(t => t.id)).toContain(task1.id);
      expect(readyTasks.map(t => t.id)).toContain(task3.id);
      expect(readyTasks.map(t => t.id)).not.toContain(task2.id);

      // After completing task1, task2 should also be ready
      graph.updateTaskStatus(task1.id, TaskStatus.COMPLETED);
      readyTasks = graph.getReadyTasks();
      expect(readyTasks.length).toBe(2);
      expect(readyTasks.map(t => t.id)).toContain(task2.id);
      expect(readyTasks.map(t => t.id)).toContain(task3.id);
    });

    it("should handle start-to-start dependencies correctly", () => {
      const task1 = graph.addTask({ name: "Task 1" });
      const task2 = graph.addTask({ name: "Task 2" });

      graph.addDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
        type: DependencyType.START_TO_START,
      });

      // Initially, only task1 should be ready
      let readyTasks = graph.getReadyTasks();
      expect(readyTasks.length).toBe(1);
      expect(readyTasks[0].id).toBe(task1.id);

      // After starting task1, task2 should also be ready
      graph.updateTaskStatus(task1.id, TaskStatus.IN_PROGRESS);
      readyTasks = graph.getReadyTasks();
      expect(readyTasks.length).toBe(1);
      expect(readyTasks[0].id).toBe(task2.id);
    });

    it("should check if a task can be completed", () => {
      const task1 = graph.addTask({ name: "Task 1" });
      const task2 = graph.addTask({ name: "Task 2" });

      graph.addDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
        type: DependencyType.FINISH_TO_FINISH,
      });

      // Start both tasks
      graph.updateTaskStatus(task1.id, TaskStatus.IN_PROGRESS);
      graph.updateTaskStatus(task2.id, TaskStatus.IN_PROGRESS);

      // Task2 cannot be completed until task1 is completed
      expect(graph.canCompleteTask(task2.id)).toBe(false);

      // Complete task1
      graph.updateTaskStatus(task1.id, TaskStatus.COMPLETED);

      // Now task2 can be completed
      expect(graph.canCompleteTask(task2.id)).toBe(true);
    });
  });

  describe("Validation and Analysis", () => {
    it("should validate a graph without cycles", () => {
      const task1 = graph.addTask({ name: "Task 1" });
      const task2 = graph.addTask({ name: "Task 2" });
      const task3 = graph.addTask({ name: "Task 3" });

      graph.addDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
      });

      graph.addDependency({
        predecessorId: task2.id,
        dependentId: task3.id,
      });

      const validation = graph.validate();
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it("should detect cycles in the graph", () => {
      const task1 = graph.addTask({ name: "Task 1" });
      const task2 = graph.addTask({ name: "Task 2" });
      const task3 = graph.addTask({ name: "Task 3" });

      graph.addDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
      });

      graph.addDependency({
        predecessorId: task2.id,
        dependentId: task3.id,
      });

      graph.addDependency({
        predecessorId: task3.id,
        dependentId: task1.id,
      });

      const cycles = graph.detectCycles();
      expect(cycles.length).toBeGreaterThan(0);

      const validation = graph.validate();
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0].type).toBe("cycle-detected");
    });

    it("should perform topological sort", () => {
      const task1 = graph.addTask({ name: "Task 1" });
      const task2 = graph.addTask({ name: "Task 2" });
      const task3 = graph.addTask({ name: "Task 3" });

      graph.addDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
      });

      graph.addDependency({
        predecessorId: task2.id,
        dependentId: task3.id,
      });

      const sortedTasks = graph.topologicalSort();
      expect(sortedTasks).not.toBeNull();
      expect(sortedTasks?.length).toBe(3);

      // Check that the order respects dependencies
      const task1Index = sortedTasks?.indexOf(task1.id) ?? -1;
      const task2Index = sortedTasks?.indexOf(task2.id) ?? -1;
      const task3Index = sortedTasks?.indexOf(task3.id) ?? -1;

      expect(task1Index).toBeLessThan(task2Index);
      expect(task2Index).toBeLessThan(task3Index);
    });

    it("should return null for topological sort with cycles", () => {
      const task1 = graph.addTask({ name: "Task 1" });
      const task2 = graph.addTask({ name: "Task 2" });

      graph.addDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
      });

      graph.addDependency({
        predecessorId: task2.id,
        dependentId: task1.id,
      });

      const sortedTasks = graph.topologicalSort();
      expect(sortedTasks).toBeNull();
    });

    it("should analyze the critical path", () => {
      const task1 = graph.addTask({
        name: "Task 1",
        estimatedDuration: 2 * 60 * 60 * 1000, // 2 hours
      });

      const task2 = graph.addTask({
        name: "Task 2",
        estimatedDuration: 3 * 60 * 60 * 1000, // 3 hours
      });

      const task3 = graph.addTask({
        name: "Task 3",
        estimatedDuration: 1 * 60 * 60 * 1000, // 1 hour
      });

      graph.addDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
      });

      graph.addDependency({
        predecessorId: task1.id,
        dependentId: task3.id,
      });

      const criticalPath = graph.analyzeCriticalPath();
      expect(criticalPath.path.length).toBe(2);
      expect(criticalPath.path).toContain(task1.id);
      expect(criticalPath.path).toContain(task2.id);
      expect(criticalPath.duration).toBe(5 * 60 * 60 * 1000); // 5 hours
    });

    it("should analyze impact of changes", () => {
      const task1 = graph.addTask({
        name: "Task 1",
        estimatedDuration: 2 * 60 * 60 * 1000, // 2 hours
      });

      const task2 = graph.addTask({
        name: "Task 2",
        estimatedDuration: 3 * 60 * 60 * 1000, // 3 hours
      });

      const task3 = graph.addTask({
        name: "Task 3",
        estimatedDuration: 1 * 60 * 60 * 1000, // 1 hour
      });

      graph.addDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
      });

      graph.addDependency({
        predecessorId: task1.id,
        dependentId: task3.id,
      });

      // Analyze impact of increasing task1's duration
      const impact = graph.analyzeImpact(task1.id, {
        estimatedDuration: 4 * 60 * 60 * 1000, // 4 hours (2 hours increase)
      });

      expect(impact.directlyAffectedTasks).toContain(task1.id);
      expect(impact.indirectlyAffectedTasks).toContain(task2.id);
      expect(impact.indirectlyAffectedTasks).toContain(task3.id);
      expect(impact.durationImpact).toBe(2 * 60 * 60 * 1000); // 2 hours increase
      expect(impact.criticalPathAffected).toBe(true);
    });

    it("should clone the graph", () => {
      const task1 = graph.addTask({ name: "Task 1" });
      const task2 = graph.addTask({ name: "Task 2" });

      graph.addDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
      });

      const clone = graph.clone();
      
      // Verify tasks were cloned
      expect(clone.getAllTasks().length).toBe(2);
      expect(clone.getTask(task1.id)).toBeDefined();
      expect(clone.getTask(task2.id)).toBeDefined();
      
      // Verify dependencies were cloned
      const dependencies = clone.getDependenciesForTask(task2.id);
      expect(dependencies.length).toBe(1);
      expect(dependencies[0].predecessorId).toBe(task1.id);
      
      // Verify changes to the clone don't affect the original
      clone.removeTask(task1.id);
      expect(clone.getAllTasks().length).toBe(1);
      expect(graph.getAllTasks().length).toBe(2);
    });
  });
});

