import { DependencyManager, DependencyManagerEvent } from "./manager";
import { DependencyType, TaskStatus } from "./types";

describe("DependencyManager", () => {
  let manager: DependencyManager;

  beforeEach(() => {
    manager = new DependencyManager();
  });

  describe("Task Management with Events", () => {
    it("should emit events when creating tasks", () => {
      const taskCreatedSpy = jest.fn();
      manager.on(DependencyManagerEvent.TASK_CREATED, taskCreatedSpy);

      const task = manager.createTask({
        name: "Test Task",
        description: "A test task",
      });

      expect(taskCreatedSpy).toHaveBeenCalledWith(task);
    });

    it("should emit events when updating tasks", () => {
      const taskUpdatedSpy = jest.fn();
      manager.on(DependencyManagerEvent.TASK_UPDATED, taskUpdatedSpy);

      const task = manager.createTask({
        name: "Test Task",
        description: "Original description",
      });

      const updatedTask = manager.updateTask(task.id, {
        name: "Updated Task",
        description: "Updated description",
      });

      expect(taskUpdatedSpy).toHaveBeenCalledWith(task, updatedTask);
    });

    it("should emit events when removing tasks", () => {
      const taskRemovedSpy = jest.fn();
      manager.on(DependencyManagerEvent.TASK_REMOVED, taskRemovedSpy);

      const task = manager.createTask({
        name: "Test Task",
      });

      manager.removeTask(task.id);

      expect(taskRemovedSpy).toHaveBeenCalledWith(task);
    });
  });

  describe("Dependency Management with Events", () => {
    it("should emit events when creating dependencies", () => {
      const dependencyCreatedSpy = jest.fn();
      manager.on(DependencyManagerEvent.DEPENDENCY_CREATED, dependencyCreatedSpy);

      const task1 = manager.createTask({ name: "Task 1" });
      const task2 = manager.createTask({ name: "Task 2" });

      const dependency = manager.createDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
        type: DependencyType.FINISH_TO_START,
      });

      expect(dependencyCreatedSpy).toHaveBeenCalledWith(dependency);
    });

    it("should emit events when removing dependencies", () => {
      const dependencyRemovedSpy = jest.fn();
      manager.on(DependencyManagerEvent.DEPENDENCY_REMOVED, dependencyRemovedSpy);

      const task1 = manager.createTask({ name: "Task 1" });
      const task2 = manager.createTask({ name: "Task 2" });

      const dependency = manager.createDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
      });

      manager.removeDependency(task1.id, task2.id);

      expect(dependencyRemovedSpy).toHaveBeenCalledWith(dependency);
    });

    it("should emit validation error events when creating invalid dependencies", () => {
      const validationErrorSpy = jest.fn();
      manager.on(DependencyManagerEvent.VALIDATION_ERROR, validationErrorSpy);

      const task1 = manager.createTask({ name: "Task 1" });
      const task2 = manager.createTask({ name: "Task 2" });

      // Create a cycle
      manager.createDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
      });

      manager.createDependency({
        predecessorId: task2.id,
        dependentId: task1.id,
      });

      expect(validationErrorSpy).toHaveBeenCalled();
      const errors = validationErrorSpy.mock.calls[0][0];
      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0].type).toBe("cycle-detected");
    });
  });

  describe("Task Status Management with Events", () => {
    it("should emit events when updating task status", () => {
      const taskStatusChangedSpy = jest.fn();
      const taskReadySpy = jest.fn();
      const taskCompletedSpy = jest.fn();

      manager.on(DependencyManagerEvent.TASK_STATUS_CHANGED, taskStatusChangedSpy);
      manager.on(DependencyManagerEvent.TASK_READY, taskReadySpy);
      manager.on(DependencyManagerEvent.TASK_COMPLETED, taskCompletedSpy);

      const task = manager.createTask({ name: "Test Task" });

      // Update to READY
      const readyTask = manager.updateTaskStatus(task.id, TaskStatus.READY);
      expect(taskStatusChangedSpy).toHaveBeenCalledWith(task, readyTask);
      expect(taskReadySpy).toHaveBeenCalledWith(readyTask);

      // Update to COMPLETED
      const completedTask = manager.updateTaskStatus(task.id, TaskStatus.COMPLETED);
      expect(taskStatusChangedSpy).toHaveBeenCalledWith(readyTask, completedTask);
      expect(taskCompletedSpy).toHaveBeenCalledWith(completedTask);
    });

    it("should emit critical path changed events when task status affects the critical path", () => {
      const criticalPathChangedSpy = jest.fn();
      manager.on(DependencyManagerEvent.CRITICAL_PATH_CHANGED, criticalPathChangedSpy);

      const task1 = manager.createTask({
        name: "Task 1",
        estimatedDuration: 2 * 60 * 60 * 1000, // 2 hours
      });

      const task2 = manager.createTask({
        name: "Task 2",
        estimatedDuration: 3 * 60 * 60 * 1000, // 3 hours
      });

      manager.createDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
      });

      // Initial critical path calculation
      expect(criticalPathChangedSpy).toHaveBeenCalledTimes(1);

      // Complete task1, which should trigger a critical path recalculation
      manager.updateTaskStatus(task1.id, TaskStatus.COMPLETED);
      expect(criticalPathChangedSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe("Health Metrics and Recommendations", () => {
    it("should calculate health metrics", () => {
      // Create a simple workflow
      const task1 = manager.createTask({ name: "Task 1" });
      const task2 = manager.createTask({ name: "Task 2" });
      const task3 = manager.createTask({ name: "Task 3" });

      manager.createDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
      });

      manager.createDependency({
        predecessorId: task2.id,
        dependentId: task3.id,
      });

      const metrics = manager.calculateHealthMetrics();

      expect(metrics.taskCount).toBe(3);
      expect(metrics.dependencyCount).toBe(2);
      expect(metrics.averageDependenciesPerTask).toBeCloseTo(2/3, 2);
      expect(metrics.healthScore).toBeGreaterThanOrEqual(0);
      expect(metrics.healthScore).toBeLessThanOrEqual(100);
    });

    it("should provide minimization recommendations", () => {
      // Create a workflow with redundant dependencies
      const task1 = manager.createTask({ name: "Task 1" });
      const task2 = manager.createTask({ name: "Task 2" });
      const task3 = manager.createTask({ name: "Task 3" });

      manager.createDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
      });

      manager.createDependency({
        predecessorId: task2.id,
        dependentId: task3.id,
      });

      // Redundant dependency
      manager.createDependency({
        predecessorId: task1.id,
        dependentId: task3.id,
      });

      const recommendations = manager.getMinimizationRecommendations();
      expect(recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("Visualization", () => {
    it("should generate visualizations in different formats", () => {
      // Create a simple workflow
      const task1 = manager.createTask({ name: "Task 1" });
      const task2 = manager.createTask({ name: "Task 2" });

      manager.createDependency({
        predecessorId: task1.id,
        dependentId: task2.id,
      });

      // Test JSON visualization
      const jsonVisualization = manager.visualize({ format: "json" });
      expect(jsonVisualization).toBeDefined();
      expect(jsonVisualization).toContain(task1.id);
      expect(jsonVisualization).toContain(task2.id);

      // Test Mermaid visualization
      const mermaidVisualization = manager.visualize({ format: "mermaid" });
      expect(mermaidVisualization).toBeDefined();
      expect(mermaidVisualization).toContain("flowchart TD");
      expect(mermaidVisualization).toContain(task1.id);
      expect(mermaidVisualization).toContain(task2.id);

      // Test DOT visualization
      const dotVisualization = manager.visualize({ format: "dot" });
      expect(dotVisualization).toBeDefined();
      expect(dotVisualization).toContain("digraph DependencyGraph");
      expect(dotVisualization).toContain(task1.id);
      expect(dotVisualization).toContain(task2.id);

      // Test HTML visualization
      const htmlVisualization = manager.visualize({ format: "html" });
      expect(htmlVisualization).toBeDefined();
      expect(htmlVisualization).toContain("<!DOCTYPE html>");
      expect(htmlVisualization).toContain("mermaid");
    });
  });
});

