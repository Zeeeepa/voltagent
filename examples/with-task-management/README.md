# Task Management System Example

This example demonstrates how to use the task management system integrated with VoltAgent.

## Features

- Task data structures and models
- Task operations (create, read, update, delete)
- Task dependencies and relationships
- Task status management
- Integration with the agent system
- Task execution by agents
- Integration with the checkpointing system

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Set up environment variables:

Create a `.env` file with your API keys:

```
ANTHROPIC_API_KEY=your_anthropic_api_key
```

3. Run the example:

```bash
npm start
```

## How It Works

The example demonstrates:

1. Creating a file-based task storage provider
2. Setting up a task manager
3. Integrating tasks with agents
4. Registering task tools with the MCP server
5. Creating and managing tasks and subtasks
6. Assigning tasks to agents
7. Tracking task progress and status

## Task Management API

The task management system provides a comprehensive API for managing tasks:

- `TaskManager`: Core class for managing tasks and subtasks
- `FileTaskStorage`: File-based storage provider for tasks
- `TaskAgentIntegration`: Integration with the agent system
- Task tools for the MCP server

## Events

The task management system emits events for various task operations:

- `task:created`: When a task is created
- `task:updated`: When a task is updated
- `task:deleted`: When a task is deleted
- `subtask:created`: When a subtask is created
- `subtask:updated`: When a subtask is updated
- `subtask:deleted`: When a subtask is deleted
- `task:assigned`: When a task is assigned to an agent
- `task:started`: When a task is started by an agent
- `task:completed`: When a task is completed by an agent
- `task:failed`: When a task fails

