# Migration Guide: SwarmMCP to voltagent

This guide helps users of the `SwarmMCP` repository migrate to the unified `voltagent` CLI.

## Overview

The `SwarmMCP` CLI tools have been integrated into the `voltagent` CLI as part of the `task` and `mcp` command groups. This guide provides a mapping of commands and options from `SwarmMCP` to `voltagent`.

## Command Mapping

| SwarmMCP Command | voltagent Command | Description |
|------------------|-------------------|-------------|
| `task-master parse-prd` | `volt task parse-prd` | Parse a PRD file and generate tasks |
| `task-master list` | `volt task list` | List all tasks with their status |
| `task-master next` | `volt task next` | Show the next task to work on |
| `task-master generate` | `volt task generate` | Generate task files and boilerplate code |
| `task-master expand` | `volt task expand` | Add subtasks to a task using AI |
| `task-master set-status` | `volt task set-status` | Change the status of a task |
| `task-master analyze` | `volt task analyze` | Analyze task complexity and dependencies |
| `mcp-server` | `volt mcp server` | Start an MCP server |
| `mcp-client` | `volt mcp client` | Connect to an MCP server |

## Option Mapping

### Task Commands

Most options have been preserved with the same names and default values. Here are some notable differences:

#### Parse-PRD Command

| SwarmMCP Option | voltagent Option | Description |
|-----------------|------------------|-------------|
| `-i, --input <file>` | `-i, --input <file>` | Path to the PRD file |
| `-o, --output <file>` | `-o, --output <file>` | Output file path |
| `-n, --num <number>` | `-n, --num-tasks <number>` | Number of tasks to generate |
| `-f, --force` | `-f, --force` | Skip confirmation when overwriting |
| `--append` | `--append` | Append new tasks to existing tasks |

#### List Command

| SwarmMCP Option | voltagent Option | Description |
|-----------------|------------------|-------------|
| `-f, --file <file>` | `-f, --file <file>` | Path to the tasks file |
| `-s, --status <status>` | `-s, --status <status>` | Filter tasks by status |
| `-w, --with-subtasks` | `-w, --with-subtasks` | Include subtasks in the listing |
| `--json` | `--json` | Output in JSON format |

### MCP Commands

#### Server Command

| SwarmMCP Option | voltagent Option | Description |
|-----------------|------------------|-------------|
| `-p, --port <port>` | `-p, --port <port>` | Port to run the server on |
| `-h, --host <host>` | `-h, --host <host>` | Host to bind the server to |
| `-c, --config <file>` | `-c, --config <file>` | Path to server configuration file |
| `-d, --debug` | `-d, --debug` | Enable debug logging |
| `--no-auth` | `--no-auth` | Disable authentication |

#### Client Command

| SwarmMCP Option | voltagent Option | Description |
|-----------------|------------------|-------------|
| `-u, --url <url>` | `-u, --url <url>` | URL of the MCP server |
| `-t, --token <token>` | `-t, --token <token>` | Authentication token |
| `-c, --config <file>` | `-c, --config <file>` | Path to client configuration file |
| `-d, --debug` | `-d, --debug` | Enable debug logging |
| `--interactive` | `--interactive` | Start in interactive mode |

## Examples

### Parsing a PRD

**SwarmMCP:**
```bash
task-master parse-prd ./docs/prd.md --num 20
```

**voltagent:**
```bash
volt task parse-prd ./docs/prd.md --num-tasks 20
```

### Listing Tasks

**SwarmMCP:**
```bash
task-master list --status pending
```

**voltagent:**
```bash
volt task list --status pending
```

### Starting an MCP Server

**SwarmMCP:**
```bash
mcp-server --port 8080 --debug
```

**voltagent:**
```bash
volt mcp server --port 8080 --debug
```

## Behavioral Changes

- The command prefix has changed from `task-master` to `volt task` and from `mcp-server`/`mcp-client` to `volt mcp server`/`volt mcp client`
- The voltagent CLI has a more structured command hierarchy
- Additional commands are available in the voltagent CLI
- Some option names have been standardized for consistency

## Configuration

The voltagent CLI uses a similar configuration approach to SwarmMCP, but with some differences:

- Configuration files are stored in a different location
- Environment variables have different prefixes
- Additional configuration options are available

## Getting Help

For more information on the voltagent CLI, run:

```bash
volt --help
volt task --help
volt mcp --help
```

