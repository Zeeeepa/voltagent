# Task Management System Example

This example demonstrates how to use the Task Management System with VoltAgent.

## Overview

The Task Management System provides a structured way to manage tasks, subtasks, and their dependencies within a project. This example shows how to:

- Initialize the task management system
- Create task management tools
- Integrate these tools with a VoltAgent
- Use the agent to manage tasks

## Getting Started

1. Set up your environment variables:

```bash
export ANTHROPIC_API_KEY=your_anthropic_api_key
```

2. Run the example:

```bash
# From the root of the voltagent repository
pnpm --filter with-task-management start
```

## Code Explanation

The example demonstrates:

1. **Initializing the Task Management System**:
   ```typescript
   const projectRoot = process.cwd();
   const tasksJsonPath = path.join(projectRoot, 'tasks', 'tasks.json');
   ```

2. **Creating Task Management Tools**:
   ```typescript
   const taskTools = createTaskManagementTools(tasksJsonPath);
   ```

3. **Creating an Agent with Task Management Tools**:
   ```typescript
   const agent = new Agent({
     provider: new AnthropicProvider({
       apiKey: process.env.ANTHROPIC_API_KEY || '',
       model: 'claude-3-7-sonnet-20250219'
     }),
     tools: {
       ...taskTools,
       // Add other tools as needed
     },
     name: 'TaskManagerAgent',
     description: 'An agent that can manage tasks using the task management system'
   });
   ```

4. **Using the Agent to Manage Tasks**:
   ```typescript
   // Initialize the project
   await agent.execute({
     messages: [{
       role: 'user',
       content: 'Initialize the task management system for this project'
     }]
   });

   // Add a task
   const addTaskResponse = await agent.execute({
     messages: [{
       role: 'user',
       content: 'Add a task to implement user authentication'
     }]
   });

   // List tasks
   const listTasksResponse = await agent.execute({
     messages: [{
       role: 'user',
       content: 'List all tasks in the system'
     }]
   });
   ```

## Available Tools

The Task Management System provides the following tools:

- **listTasks**: List tasks from the task management system
- **addTask**: Add a new task to the task management system
- **getCacheStats**: Get statistics about the task management cache

## Task Structure

Tasks are structured as follows:

```typescript
interface Task {
  id: number;
  title: string;
  description?: string;
  details?: string;
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  priority: 'high' | 'medium' | 'low';
  dependencies?: number[];
  subtasks?: Subtask[];
  testStrategy?: string;
  complexity?: number;
}
```

## Next Steps

- Implement more direct functions from the SwarmMCP repository
- Add more tools to the task management system
- Create a UI for visualizing and managing tasks

