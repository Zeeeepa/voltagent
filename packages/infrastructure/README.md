# @voltagent/infrastructure

SQL Database & Workflow Orchestration Module for VoltAgent's comprehensive PR analysis system.

## Overview

This module provides the core infrastructure for managing analysis tasks, storing results, and coordinating Codegen prompting in VoltAgent's PR analysis pipeline. It includes:

- **PostgreSQL Database**: Stores projects, PRs, analysis results, tasks, and workflow executions
- **Redis Task Queue**: Manages task queuing with priority and retry logic
- **Workflow Engine**: Orchestrates complex analysis workflows with dependency management
- **Codegen Integration**: Templates and execution tracking for AI-powered code generation

## Features

### Database Schema

- **Projects**: Repository configurations and metadata
- **PRs**: Pull request metadata and analysis status
- **Analysis_Results**: Findings from all analysis modules
- **Tasks**: Workflow task definitions with dependencies
- **Codegen_Prompts**: Template execution and results
- **Workflow_Executions**: Workflow progress tracking

### Workflow Orchestration

- Dependency-based task execution
- Parallel processing with configurable concurrency
- Automatic retry logic with exponential backoff
- Real-time progress tracking
- Error handling and recovery

### Built-in Workflows

- **Comprehensive PR Analysis**: 15+ analysis modules covering security, performance, quality
- **Quick Security Scan**: Fast security-focused analysis for urgent PRs
- **Performance Optimization**: Performance-focused analysis and optimization

## Installation

```bash
npm install @voltagent/infrastructure
```

## Quick Start

```typescript
import { createOrchestrator } from "@voltagent/infrastructure";

// Initialize with environment variables
const orchestrator = await createOrchestrator();

// Process a PR event
const result = await orchestrator.processPREvent(
  "owner/repo",
  123,
  {
    id: "pr_123",
    title: "Add new feature",
    author: "developer",
    status: "open",
    baseBranch: "main",
    headBranch: "feature/new-feature",
  }
);

console.log(result);
// {
//   module: "database_workflow_orchestration",
//   workflow_status: "active",
//   database: {
//     pr_id: "uuid",
//     analysis_complete: false,
//     total_findings: 0,
//     critical_issues: 0,
//     codegen_tasks: []
//   }
// }
```

## Configuration

### Environment Variables

```bash
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=voltagent
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_SSL=true

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0

# Workflow Configuration
WORKFLOW_MAX_CONCURRENT_TASKS=5
WORKFLOW_TASK_TIMEOUT=600000
WORKFLOW_RETRY_ATTEMPTS=3
```

### Programmatic Configuration

```typescript
import { WorkflowOrchestrator } from "@voltagent/infrastructure";

const orchestrator = new WorkflowOrchestrator({
  database: {
    host: "localhost",
    port: 5432,
    database: "voltagent",
    username: "postgres",
    password: "password",
    ssl: true,
  },
  redis: {
    host: "localhost",
    port: 6379,
    password: "redis_password",
  },
  workflow: {
    maxConcurrentTasks: 10,
    taskTimeout: 300000,
    retryAttempts: 3,
  },
});

await orchestrator.initialize();
```

## Database Operations

### Working with Projects

```typescript
import { ProjectRepository, DatabaseManager } from "@voltagent/infrastructure";

const db = new DatabaseManager(config.database);
const projectRepo = new ProjectRepository(db);

// Create a project
const project = await projectRepo.create({
  name: "My Project",
  repository_url: "https://github.com/owner/repo",
  repository_id: "owner/repo",
  configuration: { enableSecurity: true },
});

// Get project by repository ID
const existingProject = await projectRepo.getByRepositoryId("owner/repo");
```

### Working with Analysis Results

```typescript
import { AnalysisResultRepository } from "@voltagent/infrastructure";

const analysisRepo = new AnalysisResultRepository(db);

// Store analysis results
const result = await analysisRepo.create({
  pr_id: "pr_uuid",
  module_name: "security_scan",
  analysis_type: "vulnerability_detection",
  findings: {
    vulnerabilities: [
      { type: "sql_injection", severity: "high", file: "user.ts", line: 42 }
    ]
  },
  severity: "high",
  status: "completed",
});

// Get analysis summary
const summary = await analysisRepo.getAnalysisSummary("pr_uuid");
```

## Workflow Management

### Custom Workflows

```typescript
import { WorkflowDefinition } from "@voltagent/infrastructure";

const customWorkflow: WorkflowDefinition = {
  name: "custom_analysis",
  description: "Custom analysis workflow",
  version: "1.0.0",
  steps: [
    {
      id: "lint_check",
      name: "Lint Check",
      description: "Run linting analysis",
      type: "analysis",
      timeout: 120000,
    },
    {
      id: "generate_fixes",
      name: "Generate Fixes",
      description: "Generate automated fixes",
      type: "codegen",
      dependencies: ["lint_check"],
      timeout: 300000,
    },
  ],
  triggers: [{ type: "pr_created" }],
};

orchestrator.registerWorkflow(customWorkflow);
```

### Codegen Templates

```typescript
import { CodegenPromptTemplates } from "@voltagent/infrastructure";

// Use built-in templates
const prompt = CodegenPromptTemplates.renderTemplate("fix-sql-injection", {
  file_path: "src/user.ts",
  function_name: "getUserById",
  issue_description: "SQL injection vulnerability in user lookup",
  code_snippet: "SELECT * FROM users WHERE id = " + userId,
  language: "typescript",
});

// Register custom template
CodegenPromptTemplates.registerTemplate({
  name: "add-logging",
  description: "Add logging to functions",
  template: "Add comprehensive logging to {{function_name}} in {{file_path}}...",
  variables: ["function_name", "file_path"],
});
```

## Monitoring and Metrics

### Health Checks

```typescript
// Check system health
const health = await orchestrator.getHealthStatus();
console.log(health);
// {
//   database: true,
//   taskQueue: true,
//   workflows: 3,
//   activeExecutions: 5
// }
```

### System Statistics

```typescript
// Get detailed statistics
const stats = await orchestrator.getSystemStats();
console.log(stats);
// {
//   database: { totalConnections: 8, idleConnections: 3 },
//   taskQueue: { pending: 12, processing: 3, deadLetter: 0 },
//   workflows: { total: 150, success_rate: 94.2 }
// }
```

### Metrics Collection

```typescript
import { MetricsCollector } from "@voltagent/infrastructure";

const metrics = new MetricsCollector();

// Record metrics
metrics.record("analysis_duration", 1500, { module: "security" });
metrics.increment("analysis_count", 1, { type: "vulnerability_scan" });

// Get summaries
const summary = metrics.getSummary("analysis_duration");
console.log(summary);
// { count: 100, avg: 1250, p95: 2000, p99: 3500 }
```

## Error Handling and Retry Logic

```typescript
import { RetryHelper } from "@voltagent/infrastructure";

// Retry database operations
const result = await RetryHelper.retryDatabaseOperation(async () => {
  return await db.query("SELECT * FROM projects");
});

// Custom retry logic
const data = await RetryHelper.retryWithCondition(
  async () => await fetchExternalAPI(),
  (error, attempt) => error.message.includes("rate limit") && attempt < 5,
  { maxAttempts: 5, baseDelay: 2000 }
);
```

## API Reference

### Core Classes

- **WorkflowOrchestrator**: Main orchestration class
- **DatabaseManager**: Database connection and query management
- **TaskQueue**: Redis-based task queue with priority
- **WorkflowEngine**: Workflow execution engine

### Repositories

- **ProjectRepository**: Project CRUD operations
- **PRRepository**: PR management and analysis tracking
- **AnalysisResultRepository**: Analysis results storage
- **TaskRepository**: Task management with dependencies
- **CodegenPromptRepository**: Codegen execution tracking
- **WorkflowExecutionRepository**: Workflow progress tracking

### Utilities

- **ConfigValidator**: Configuration validation
- **RetryHelper**: Retry logic with exponential backoff
- **MetricsCollector**: Performance metrics collection
- **Logger**: Structured logging

## Development

### Running Tests

```bash
npm test
```

### Building

```bash
npm run build
```

### Linting

```bash
npm run lint
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

