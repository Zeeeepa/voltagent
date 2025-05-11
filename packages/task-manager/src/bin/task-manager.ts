#!/usr/bin/env node

/**
 * Task Manager CLI
 *
 * Command-line interface for the VoltAgent Task Manager
 */

import { TaskManager } from "../index";

async function main() {
  try {
    const taskManager = new TaskManager();

    // Example usage
    const task = await taskManager.createTask({
      title: "Example task",
      description: "This is an example task created from the CLI",
    });

    console.log("Task created:", task);

    const runningTask = await taskManager.runTask(task.id);
    console.log("Task completed:", runningTask);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
