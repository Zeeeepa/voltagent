# Agent Commands

The `volt agent` command group provides tools for interacting with and evaluating agents.

## Chat Command

Start an interactive chat session with an agent.

```bash
volt agent chat [options]
```

### Options

- `-d, --debug`: Enable debug logging
- `-q, --quiet`: Minimal output, show only errors and results
- `-m, --model <model>`: Model to use (default: "claude-3-7-sonnet-20250219")
- `--caching`: Enable prompt caching (default: true)
- `--no-caching`: Disable prompt caching

### Examples

```bash
# Start a chat session with default settings
volt agent chat

# Start a chat session with a specific model
volt agent chat --model claude-3-opus-20240229

# Start a chat session with debug logging
volt agent chat --debug
```

## Eval Command

Evaluation tools for agent testing and benchmarking.

### Run Subcommand

Run evaluation tests.

```bash
volt agent eval run [options]
```

#### Options

- `-c, --config <path>`: Path to a custom test configuration file
- `-o, --output <dir>`: Directory to save results (default: "./evaluation-results")
- `-r, --runs <number>`: Number of runs per test case (default: 3)
- `--concurrency <number>`: Number of concurrent test executions (default: 2)
- `--quick`: Use a smaller subset of test cases for quicker evaluation
- `--no-judge`: Disable AI judge evaluation

#### Examples

```bash
# Run evaluation with default settings
volt agent eval run

# Run evaluation with custom configuration
volt agent eval run --config ./my-config.json

# Run quick evaluation with 2 runs per test
volt agent eval run --quick --runs 2
```

### List Subcommand

List available test cases.

```bash
volt agent eval list
```

#### Examples

```bash
# List all available test cases
volt agent eval list
```

### Report Subcommand

Generate reports from evaluation results.

```bash
volt agent eval report [directory] [options]
```

#### Arguments

- `directory`: Directory containing evaluation results (default: "./evaluation-results")

#### Options

- `-o, --output <file>`: Output file for the report
- `-f, --format <format>`: Report format (markdown, json, html) (default: "markdown")

#### Examples

```bash
# Generate a report from the default results directory
volt agent eval report

# Generate a report from a custom results directory
volt agent eval report ./my-results

# Generate an HTML report
volt agent eval report --format html --output report.html
```

