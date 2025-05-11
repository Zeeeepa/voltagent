# Task Commands

The `volt task` command group provides tools for managing AI-driven development tasks.

## Parse-PRD Command

Parse a PRD file and generate tasks.

```bash
volt task parse-prd [file] [options]
```

### Arguments

- `file`: Path to the PRD file

### Options

- `-i, --input <file>`: Path to the PRD file (alternative to positional argument)
- `-o, --output <file>`: Output file path (default: "tasks/tasks.json")
- `-n, --num-tasks <number>`: Number of tasks to generate (default: "10")
- `-f, --force`: Skip confirmation when overwriting existing tasks
- `--append`: Append new tasks to existing tasks.json instead of overwriting

### Examples

```bash
# Parse a PRD file
volt task parse-prd ./docs/prd.md

# Parse a PRD file with custom output
volt task parse-prd --input ./docs/prd.md --output ./custom-tasks.json

# Generate 20 tasks from a PRD
volt task parse-prd ./docs/prd.md --num-tasks 20
```

## List Command

List all tasks with their status.

```bash
volt task list [options]
```

### Options

- `-f, --file <file>`: Path to the tasks file (default: "tasks/tasks.json")
- `-s, --status <status>`: Filter tasks by status (done, pending, deferred)
- `-w, --with-subtasks`: Include subtasks in the listing
- `--json`: Output in JSON format

### Examples

```bash
# List all tasks
volt task list

# List only pending tasks
volt task list --status pending

# List all tasks including subtasks
volt task list --with-subtasks

# Output tasks in JSON format
volt task list --json
```

## Next Command

Show the next task to work on based on dependencies and status.

```bash
volt task next [options]
```

### Options

- `-f, --file <file>`: Path to the tasks file (default: "tasks/tasks.json")

### Examples

```bash
# Show the next task to work on
volt task next

# Show the next task from a custom tasks file
volt task next --file ./custom-tasks.json
```

## Generate Command

Generate task files and boilerplate code.

```bash
volt task generate <task-id> [options]
```

### Arguments

- `task-id`: ID of the task to generate files for

### Options

- `-f, --file <file>`: Path to the tasks file (default: "tasks/tasks.json")
- `-o, --output <dir>`: Output directory for generated files (default: "src")
- `--force`: Overwrite existing files

### Examples

```bash
# Generate files for task 2
volt task generate 2

# Generate files for task 3 in a custom directory
volt task generate 3 --output ./custom-src

# Force overwrite of existing files
volt task generate 4 --force
```

## Expand Command

Add subtasks to a task using AI.

```bash
volt task expand <task-id> [options]
```

### Arguments

- `task-id`: ID of the task to expand

### Options

- `-f, --file <file>`: Path to the tasks file (default: "tasks/tasks.json")
- `-n, --num-subtasks <number>`: Number of subtasks to generate (default: "5")
- `-m, --model <model>`: AI model to use for expansion (default: "claude-3-7-sonnet-20250219")

### Examples

```bash
# Expand task 2 with default settings
volt task expand 2

# Expand task 3 with 10 subtasks
volt task expand 3 --num-subtasks 10

# Expand task 4 using a specific model
volt task expand 4 --model claude-3-opus-20240229
```

## Set-Status Command

Change the status of a task.

```bash
volt task set-status <task-id> [options]
```

### Arguments

- `task-id`: ID of the task to update

### Options

- `-f, --file <file>`: Path to the tasks file (default: "tasks/tasks.json")
- `-s, --status <status>`: New status for the task (default: "done")
- `-r, --recursive`: Apply status change to all subtasks

### Examples

```bash
# Mark task 2 as done
volt task set-status 2

# Mark task 3 as pending
volt task set-status 3 --status pending

# Mark task 4 and all its subtasks as done
volt task set-status 4 --recursive
```

## Analyze Command

Analyze task complexity and dependencies.

```bash
volt task analyze [options]
```

### Options

- `-f, --file <file>`: Path to the tasks file (default: "tasks/tasks.json")
- `-i, --id <task-id>`: ID of a specific task to analyze
- `--graph`: Generate a dependency graph visualization
- `--estimate`: Generate time estimates for tasks
- `-o, --output <file>`: Output file for analysis results

### Examples

```bash
# Analyze all tasks
volt task analyze

# Analyze a specific task
volt task analyze --id 3

# Generate a dependency graph
volt task analyze --graph

# Generate time estimates
volt task analyze --estimate

# Save analysis to a file
volt task analyze --output ./analysis.md
```

