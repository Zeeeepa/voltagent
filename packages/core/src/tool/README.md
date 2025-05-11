# Unified Tool System

This directory contains the unified tool system that combines tools from both `serv` and `SwarmMCP` repositories.

## Overview

The unified tool system provides a consistent interface for tool registration and execution, enabling easy extension with new tools. It supports all tools from both repositories and provides a clean architecture with proper error handling and permission management.

## Architecture

The tool system consists of the following components:

### Tool Registry

The tool registry manages tool registration, discovery, and execution. It provides a unified interface for working with tools and handles tool permissions and execution callbacks.

- `registry/types.ts`: Defines the interfaces and types for the tool registry
- `registry/index.ts`: Implements the tool registry functionality

### Tool Manager

The tool manager is responsible for registering and executing tools. It integrates with the tool registry to provide a consistent interface for working with tools.

- `manager.ts`: Implements the tool manager

### Tools

The tools are organized by category and provide specific functionality:

#### File System Tools

- `tools/filesystem/read.ts`: Tool for reading files
- `tools/filesystem/write.ts`: Tool for writing files
- `tools/filesystem/edit.ts`: Tool for editing files
- `tools/filesystem/glob.ts`: Tool for finding files using glob patterns
- `tools/filesystem/grep.ts`: Tool for searching file contents
- `tools/filesystem/ls.ts`: Tool for listing directory contents

#### Execution Tools

- `tools/execution/bash.ts`: Tool for executing bash commands
- `tools/execution/batch.ts`: Tool for executing multiple tools in a batch
- `tools/execution/think.ts`: Tool for thinking through complex problems

#### Task Management Tools

- `tools/task/add-task.ts`: Tool for adding a new task
- `tools/task/get-task.ts`: Tool for getting a specific task
- `tools/task/get-tasks.ts`: Tool for getting all tasks
- `tools/task/update-task.ts`: Tool for updating an existing task
- And many more task-related tools

#### Project Management Tools

- `tools/project/parse-prd.ts`: Tool for parsing a PRD document
- `tools/project/initialize-project.ts`: Tool for initializing a new project
- `tools/project/analyze.ts`: Tool for analyzing a project
- `tools/project/complexity-report.ts`: Tool for generating a complexity report

### Toolkits

Toolkits are collections of related tools that can be registered together:

- `tools/filesystem/index.ts`: Toolkit for file system tools
- `tools/execution/index.ts`: Toolkit for execution tools
- `tools/task/index.ts`: Toolkit for task management tools
- `tools/project/index.ts`: Toolkit for project management tools

## Usage

### Registering Tools

```typescript
import { ToolManager } from "./tool/manager";
import { FileReadTool, BashTool } from "./tool/tools";

const toolManager = new ToolManager();
toolManager.registerTool(FileReadTool);
toolManager.registerTool(BashTool);
```

### Registering Toolkits

```typescript
import { ToolManager } from "./tool/manager";
import { createFileSystemToolkit, createExecutionToolkit } from "./tool/tools";

const toolManager = new ToolManager();
toolManager.registerToolkit(createFileSystemToolkit());
toolManager.registerToolkit(createExecutionToolkit());
```

### Executing Tools

```typescript
import { ToolManager } from "./tool/manager";
import { FileReadTool } from "./tool/tools";

const toolManager = new ToolManager();
toolManager.registerTool(FileReadTool);

const result = await toolManager.executeTool("file_read", {
  path: "path/to/file.txt",
});
```

### Using the Tool Registry

```typescript
import { defaultToolRegistry, ToolCategory } from "./tool";
import { FileReadTool } from "./tool/tools";

// Register a tool
defaultToolRegistry.registerTool(FileReadTool);

// Get all tools in a category
const readonlyTools = defaultToolRegistry.getToolsByCategory(ToolCategory.READONLY);

// Execute a tool with callbacks
const result = await defaultToolRegistry.executeToolWithCallbacks(
  "file_read",
  undefined,
  { path: "path/to/file.txt" },
  { executionId: "123" }
);
```

## Extending the Tool System

### Creating a New Tool

```typescript
import { z } from "zod";
import { createTool } from "./tool";
import { ToolCategory } from "./tool/registry/types";

export const MyTool = createTool({
  name: "my_tool",
  description: "My custom tool",
  category: ToolCategory.READONLY,
  parameters: z.object({
    param1: z.string().describe("Parameter 1"),
    param2: z.number().optional().describe("Parameter 2"),
  }),
  execute: async (args, context) => {
    // Tool implementation
    return {
      success: true,
      result: `Executed with ${args.param1}`,
    };
  },
});
```

### Creating a New Toolkit

```typescript
import { MyTool1, MyTool2 } from "./my-tools";
import type { Toolkit } from "./tool/toolkit";

export function createMyToolkit(): Toolkit {
  return {
    name: "my-toolkit",
    description: "My custom toolkit",
    tools: [
      MyTool1,
      MyTool2,
    ],
  };
}
```

## Permission System

The tool system includes a permission system that controls access to tools based on the execution context:

- `ToolPermission.NONE`: No permission required
- `ToolPermission.USER`: User-level permission required
- `ToolPermission.ADMIN`: Admin-level permission required

Tools can specify their permission requirements:

```typescript
export const MyTool = createTool({
  name: "my_tool",
  description: "My custom tool",
  category: ToolCategory.FILE_OPERATION,
  requiresPermission: true,
  permissionLevel: ToolPermission.ADMIN,
  alwaysRequirePermission: true,
  // ...
});
```

## Error Handling

The tool system includes comprehensive error handling:

- Tools can return success/error status
- The tool registry provides callbacks for execution events
- Errors are propagated to the caller with detailed information

## Conclusion

The unified tool system provides a powerful and flexible way to work with tools from both `serv` and `SwarmMCP` repositories. It enables easy extension with new tools and provides a consistent interface for tool registration and execution.

