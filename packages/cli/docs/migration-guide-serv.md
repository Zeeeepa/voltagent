# Migration Guide: serv to voltagent

This guide helps users of the `serv` repository migrate to the unified `voltagent` CLI.

## Overview

The `serv` CLI has been integrated into the `voltagent` CLI as part of the `agent` command group. This guide provides a mapping of commands and options from `serv` to `voltagent`.

## Command Mapping

| serv Command | voltagent Command | Description |
|--------------|-------------------|-------------|
| `qckfx` | `volt agent chat` | Start an interactive chat session with an agent |
| `qckfx chat` | `volt agent chat` | Start an interactive chat session with an agent |
| `qckfx eval run` | `volt agent eval run` | Run evaluation tests |
| `qckfx eval list` | `volt agent eval list` | List available test cases |
| `qckfx eval report` | `volt agent eval report` | Generate reports from evaluation results |

## Option Mapping

### Chat Command

| serv Option | voltagent Option | Description |
|-------------|------------------|-------------|
| `-d, --debug` | `-d, --debug` | Enable debug logging |
| `-q, --quiet` | `-q, --quiet` | Minimal output, show only errors and results |
| `-m, --model <model>` | `-m, --model <model>` | Model to use |
| `--caching` | `--caching` | Enable prompt caching |
| `--no-caching` | `--no-caching` | Disable prompt caching |

### Eval Run Command

| serv Option | voltagent Option | Description |
|-------------|------------------|-------------|
| `-c, --config <path>` | `-c, --config <path>` | Path to a custom test configuration file |
| `-o, --output <dir>` | `-o, --output <dir>` | Directory to save results |
| `-r, --runs <number>` | `-r, --runs <number>` | Number of runs per test case |
| `--concurrency <number>` | `--concurrency <number>` | Number of concurrent test executions |
| `--quick` | `--quick` | Use a smaller subset of test cases |
| `--no-judge` | `--no-judge` | Disable AI judge evaluation |

### Eval Report Command

| serv Option | voltagent Option | Description |
|-------------|------------------|-------------|
| `-o, --output <file>` | `-o, --output <file>` | Output file for the report |
| `-f, --format <format>` | `-f, --format <format>` | Report format (markdown, json, html) |

## Examples

### Chat Session

**serv:**
```bash
qckfx
```

**voltagent:**
```bash
volt agent chat
```

### Running Evaluation

**serv:**
```bash
qckfx eval run --quick --runs 2
```

**voltagent:**
```bash
volt agent eval run --quick --runs 2
```

### Generating Reports

**serv:**
```bash
qckfx eval report ./results --format html
```

**voltagent:**
```bash
volt agent eval report ./results --format html
```

## Behavioral Changes

- The command prefix has changed from `qckfx` to `volt agent`
- The help command is now `volt agent --help` instead of `qckfx /help`
- The voltagent CLI has a more structured command hierarchy
- Additional commands are available in the voltagent CLI

## Configuration

The voltagent CLI uses a similar configuration approach to serv, but with some differences:

- Configuration files are stored in a different location
- Environment variables have different prefixes
- Additional configuration options are available

## Getting Help

For more information on the voltagent CLI, run:

```bash
volt --help
volt agent --help
volt agent chat --help
volt agent eval --help
```

