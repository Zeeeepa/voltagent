# @voltagent/linear

Linear API integration for VoltAgent with automated issue management, bidirectional synchronization, and hierarchical task management.

## Features

- 🔗 **Linear API Integration**: Complete Linear API client with rate limiting and retry logic
- 📋 **Issue Management**: Create and manage issues with hierarchical structure
- 🔄 **Bidirectional Sync**: Automatic synchronization between VoltAgent and Linear
- 📊 **Progress Tracking**: Real-time progress monitoring and analytics
- 🤖 **Requirement Analysis**: Automated issue generation from requirements text
- 📈 **Visualization**: Dependency graphs, burndown charts, and team metrics
- 🛠️ **VoltAgent Tools**: Ready-to-use tools for AI agents

## Installation

```bash
npm install @voltagent/linear
# or
pnpm add @voltagent/linear
```

## Quick Start

### Basic Setup

```typescript
import { LinearIntegration, createLinearConfig } from "@voltagent/linear";

const config = createLinearConfig({
  apiKey: "your-linear-api-key",
  teamId: "your-team-id", // optional
  webhookSecret: "your-webhook-secret", // optional
});

const linear = new LinearIntegration(config);
await linear.initialize();
```

### Using with VoltAgent

```typescript
import { VoltAgent, Agent } from "@voltagent/core";
import { createLinearToolkit } from "@voltagent/linear";

const { tools, integration } = createLinearToolkit({
  apiKey: process.env.LINEAR_API_KEY!,
  teamId: process.env.LINEAR_TEAM_ID,
});

const agent = new Agent({
  name: "Linear Assistant",
  description: "AI assistant for Linear issue management",
  tools,
});

const voltAgent = new VoltAgent();
voltAgent.use(agent);
```

## Core Components

### LinearIntegration

Main integration class that orchestrates all Linear functionality:

```typescript
// Create issues from requirements
const result = await linear.createIssuesFromRequirements(
  "User authentication system with JWT tokens and password reset",
  "Authentication Feature"
);

// Get project progress
const progress = await linear.getProjectProgress();
console.log(`Completion: ${progress.completionPercentage}%`);

// Start automatic sync
await linear.startSync();
```

### Issue Management

Create and manage issues with VoltAgent extensions:

```typescript
// Create a main issue
const issue = await linear.createIssue({
  title: "Implement user dashboard",
  description: "Create a responsive user dashboard with analytics",
  priority: "high",
  estimatedHours: 16,
  dependencies: ["auth-system"],
});

// Update issue
await linear.updateIssue(issue.id, {
  assigneeId: "user-id",
  estimatedHours: 20,
});
```

### Requirement Analysis

Automatically analyze requirements and generate issues:

```typescript
const requirements = `
# User Management System

## Features
- User registration with email verification
- User login with JWT authentication
- Password reset functionality
- User profile management
- Admin user management

## Technical Requirements
- RESTful API endpoints
- Database schema design
- Input validation
- Security best practices
`;

const result = await linear.createIssuesFromRequirements(
  requirements,
  "User Management System"
);

console.log(`Created ${result.subIssues.length} sub-issues`);
```

### Progress Tracking

Monitor project progress and generate analytics:

```typescript
// Get progress data
const progress = await linear.getProjectProgress();

// Generate comprehensive report
const report = await linear.generateProgressReport();

// Get team metrics
const metrics = await linear.generateTeamMetrics();

// Generate burndown chart data
const visualization = await linear.generateDependencyVisualization([
  "issue-1", "issue-2", "issue-3"
]);
```

### Bidirectional Sync

Keep VoltAgent and Linear in sync:

```typescript
// Start automatic sync (every 5 minutes by default)
await linear.startSync();

// Manual sync
const result = await linear.performSync({
  direction: "both", // "to-linear" | "from-linear" | "both"
  conflictResolution: "manual", // "linear-wins" | "local-wins" | "merge" | "manual" | "skip"
});

// Handle conflicts
const conflicts = linear.getPendingConflicts();
for (const conflict of conflicts) {
  await linear.resolveConflict(conflict.issueId, "linear-wins");
}
```

## Available Tools

When using with VoltAgent, the following tools are automatically available:

- `create_linear_issue` - Create new Linear issues
- `update_linear_issue` - Update existing issues
- `get_linear_issue` - Retrieve issue details
- `search_linear_issues` - Search issues by text
- `create_issues_from_requirements` - Generate issues from requirements
- `get_project_progress` - Get progress data
- `generate_progress_report` - Create comprehensive reports
- `sync_with_linear` - Perform synchronization
- `get_linear_teams` - List available teams
- `get_workflow_states` - Get team workflow states
- `get_sync_status` - Check sync status
- `generate_team_metrics` - Generate team performance metrics

## Configuration

### Environment Variables

```bash
LINEAR_API_KEY=your_linear_api_key_here
LINEAR_TEAM_ID=your_team_id_here
LINEAR_WEBHOOK_SECRET=your_webhook_secret_here
LINEAR_SYNC_INTERVAL=300000
```

### Configuration Options

```typescript
const config = createLinearConfig({
  apiKey: "required-api-key",
  teamId: "optional-default-team-id",
  webhookSecret: "optional-webhook-secret",
  syncInterval: 300000, // 5 minutes in milliseconds
  retries: 3, // Number of API retry attempts
  timeout: 30000, // Request timeout in milliseconds
  rateLimit: {
    requests: 100, // Max requests per window
    window: 60000, // Rate limit window in milliseconds
  },
});
```

## Webhook Integration

Handle real-time Linear events:

```typescript
import express from "express";

const app = express();

app.post("/linear-webhook", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.headers["linear-signature"] as string;
  const payload = req.body.toString();

  // Validate webhook signature
  if (!linear.validateWebhookSignature(payload, signature)) {
    return res.status(401).send("Invalid signature");
  }

  // Process webhook event
  const event = JSON.parse(payload);
  linear.processWebhookEvent(event);

  res.status(200).send("OK");
});
```

## Event Handling

Listen to Linear integration events:

```typescript
linear.on("issue.created", (data) => {
  console.log(`Issue created: ${data.issue.title}`);
});

linear.on("sync.completed", (result) => {
  console.log(`Sync completed: ${result.created} created, ${result.updated} updated`);
});

linear.on("conflict.detected", (conflict) => {
  console.log(`Conflict detected for issue ${conflict.issueId}`);
});

linear.on("progress.calculated", (data) => {
  console.log(`Progress: ${data.progress.completionPercentage}%`);
});
```

## Examples

### AI-Powered Project Planning

```typescript
const agent = new Agent({
  name: "Project Planner",
  description: "AI assistant for project planning and issue management",
  tools: createLinearToolkit(config).tools,
});

// The agent can now:
// - Analyze requirements and create issues
// - Track project progress
// - Generate reports and analytics
// - Manage issue dependencies
// - Sync with Linear automatically
```

### Automated Progress Reporting

```typescript
// Set up automatic progress reporting
setInterval(async () => {
  const report = await linear.generateProgressReport();
  
  // Send report to team (Slack, email, etc.)
  await sendProgressReport(report);
}, 24 * 60 * 60 * 1000); // Daily reports
```

### Requirement-Driven Development

```typescript
// Automatically create issues from PRD
const prdContent = await fs.readFile("product-requirements.md", "utf-8");
const result = await linear.createIssuesFromPRD(prdContent, "New Feature");

console.log(`Generated ${result.subIssues.length} implementation tasks`);
```

## API Reference

### LinearIntegration

Main integration class with the following methods:

- `initialize()` - Initialize the integration
- `createIssue(input)` - Create a new issue
- `updateIssue(id, update)` - Update an existing issue
- `getIssue(id)` - Get issue with sub-issues
- `searchIssues(query, teamId?)` - Search issues
- `createIssuesFromRequirements(text, title, options?)` - Generate issues from requirements
- `getProjectProgress(projectId?, teamId?)` - Get progress data
- `generateProgressReport(projectId?, teamId?)` - Generate comprehensive report
- `startSync()` - Start automatic synchronization
- `stopSync()` - Stop automatic synchronization
- `performSync(options?)` - Perform manual sync

### Types

Key TypeScript types and interfaces:

- `LinearConfig` - Configuration options
- `LinearIssue` - Extended issue with VoltAgent features
- `RequirementAnalysis` - Requirement analysis result
- `ProgressData` - Progress tracking data
- `SyncResult` - Synchronization result
- `LinearEvent` - Event data structure

## Contributing

Contributions are welcome! Please read our [contributing guidelines](../../CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](../../LICENCE) for details.

