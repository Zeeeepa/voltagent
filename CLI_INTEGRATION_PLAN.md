# CLI and Documentation Integration Plan

## Overview

This document outlines the plan for integrating the CLI tools from the `serv` and `SwarmMCP` repositories into the unified `voltagent` project, along with creating comprehensive documentation.

## Current State Analysis

### serv Repository
- CLI implementation in `src/cli.ts`
- Provides a chat interface for interacting with the agent
- Includes an evaluation CLI for A/B testing
- Uses commander.js for CLI command structure
- Focused on agent interaction and evaluation

### SwarmMCP Repository
- Task-master CLI in `bin/task-master.js`
- Includes scripts for dev, init, and modules
- Provides task management functionality
- Uses commander.js for CLI command structure
- Focused on task management and MCP server functionality

### voltagent Repository
- Already has a CLI package in `packages/cli`
- Uses commander.js for CLI command structure
- Currently has init, update, whoami, and add commands
- Structured as a modern TypeScript package
- Uses tsup for building

## Integration Strategy

### 1. Unified Command Structure

We will create a unified CLI with the following command structure:

```
volt
├── agent
│   ├── chat       # From serv - Interactive chat with agent
│   ├── eval       # From serv - Evaluation tools
│   │   ├── run    # Run evaluation tests
│   │   ├── list   # List available test cases
│   │   └── report # Generate evaluation reports
│   └── add        # Add components to agent (existing)
├── task
│   ├── parse-prd  # From SwarmMCP - Parse PRD and generate tasks
│   ├── list       # From SwarmMCP - List all tasks
│   ├── next       # From SwarmMCP - Show next task to work on
│   ├── generate   # From SwarmMCP - Generate task files
│   ├── expand     # From SwarmMCP - Add subtasks to a task
│   ├── set-status # From SwarmMCP - Change task status
│   └── analyze    # From SwarmMCP - Analyze task complexity
├── mcp
│   ├── server     # From SwarmMCP - Run MCP server
│   └── client     # From SwarmMCP - Connect to MCP server
├── init           # Initialize a new project (existing)
├── update         # Check for updates (existing)
└── whoami         # Show configuration info (existing)
```

### 2. Implementation Approach

1. **Modular Architecture**
   - Create separate modules for agent, task, and mcp commands
   - Implement a plugin system for future extensions
   - Use dependency injection for shared services

2. **Code Migration**
   - Convert JavaScript code from SwarmMCP to TypeScript
   - Refactor to match voltagent's code style and patterns
   - Ensure all functionality is preserved

3. **Consistent User Experience**
   - Standardize command naming conventions
   - Create consistent help text and documentation
   - Implement uniform error handling and output formatting

### 3. Directory Structure

```
packages/cli/
├── src/
│   ├── commands/
│   │   ├── agent/
│   │   │   ├── chat.ts
│   │   │   ├── eval.ts
│   │   │   └── index.ts
│   │   ├── task/
│   │   │   ├── parse-prd.ts
│   │   │   ├── list.ts
│   │   │   ├── next.ts
│   │   │   ├── generate.ts
│   │   │   ├── expand.ts
│   │   │   ├── set-status.ts
│   │   │   ├── analyze.ts
│   │   │   └── index.ts
│   │   ├── mcp/
│   │   │   ├── server.ts
│   │   │   ├── client.ts
│   │   │   └── index.ts
│   │   ├── init.ts
│   │   ├── update.ts
│   │   ├── whoami.ts
│   │   └── add.ts
│   ├── services/
│   │   ├── agent-service.ts
│   │   ├── task-service.ts
│   │   └── mcp-service.ts
│   ├── utils/
│   │   ├── analytics.ts
│   │   ├── formatting.ts
│   │   └── config.ts
│   ├── types.ts
│   └── index.ts
└── docs/
    ├── agent-commands.md
    ├── task-commands.md
    ├── mcp-commands.md
    ├── migration-guide-serv.md
    └── migration-guide-swarmmcp.md
```

## Implementation Steps

### Phase 1: Setup and Structure

1. Create the directory structure for the new CLI commands
2. Set up shared utilities and services
3. Update the main CLI entry point to include the new command groups

### Phase 2: Agent Commands Integration

1. Migrate the chat command from serv
2. Migrate the evaluation commands from serv
3. Test the agent commands

### Phase 3: Task Commands Integration

1. Convert the task management commands from SwarmMCP to TypeScript
2. Integrate the task commands into the CLI structure
3. Test the task commands

### Phase 4: MCP Commands Integration

1. Convert the MCP server and client commands from SwarmMCP to TypeScript
2. Integrate the MCP commands into the CLI structure
3. Test the MCP commands

### Phase 5: Documentation

1. Create comprehensive documentation for all commands
2. Create migration guides for serv and SwarmMCP users
3. Update the main README with CLI usage information
4. Add examples and tutorials

## Documentation Plan

### Command Documentation

For each command, we will create documentation that includes:

- Command name and description
- Usage syntax
- Available options
- Examples
- Related commands

### Migration Guides

We will create migration guides for users of both repositories:

- **serv Migration Guide**
  - Mapping of old commands to new commands
  - Changes in behavior or options
  - Examples of common workflows

- **SwarmMCP Migration Guide**
  - Mapping of old commands to new commands
  - Changes in behavior or options
  - Examples of common workflows

### Examples and Tutorials

We will create examples and tutorials for common use cases:

- Setting up a new agent project
- Running and evaluating agents
- Managing tasks for a project
- Using the MCP server and client

## Testing Strategy

1. **Unit Tests**
   - Test individual command implementations
   - Test utility functions and services

2. **Integration Tests**
   - Test command interactions
   - Test end-to-end workflows

3. **Manual Testing**
   - Test the CLI with real-world scenarios
   - Verify backward compatibility

## Timeline

1. **Phase 1: Setup and Structure** - 1 day
2. **Phase 2: Agent Commands Integration** - 2 days
3. **Phase 3: Task Commands Integration** - 3 days
4. **Phase 4: MCP Commands Integration** - 2 days
5. **Phase 5: Documentation** - 2 days

Total: 10 days

## Conclusion

This integration plan provides a comprehensive approach to merging the CLI tools from both repositories into a unified, well-documented CLI for the voltagent project. The modular architecture will allow for future extensions, while the consistent user experience will make it easy for users to adopt the new CLI.

