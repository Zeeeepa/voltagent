# VoltAgent Linear Integration Example

This example demonstrates how to use the `@voltagent/linear` package to create an AI agent with comprehensive Linear project management capabilities.

## Features Demonstrated

- 🔗 Linear API integration and authentication
- 📋 Automated issue creation from requirements
- 🔄 Bidirectional synchronization with Linear
- 📊 Progress tracking and analytics
- 🤖 AI agent with Linear management tools
- 📈 Team performance metrics
- 🎯 Requirement analysis and breakdown

## Prerequisites

1. **Linear Account**: You need a Linear account with API access
2. **Linear API Key**: Generate an API key from Linear settings
3. **Team ID**: Optional but recommended for team-specific operations

## Setup

1. **Clone and Install**:
   ```bash
   git clone <repository>
   cd examples/with-linear
   pnpm install
   ```

2. **Environment Configuration**:
   ```bash
   cp .env.example .env
   ```

3. **Configure Linear Credentials**:
   Edit `.env` file with your Linear credentials:
   ```env
   LINEAR_API_KEY=your_linear_api_key_here
   LINEAR_TEAM_ID=your_team_id_here
   LINEAR_WEBHOOK_SECRET=your_webhook_secret_here
   ```

## Getting Linear Credentials

### 1. Linear API Key

1. Go to [Linear Settings](https://linear.app/settings)
2. Navigate to "API" section
3. Click "Create API Key"
4. Copy the generated key to your `.env` file

### 2. Team ID (Optional)

1. Go to your Linear workspace
2. Navigate to team settings
3. Copy the team ID from the URL or settings
4. Add to your `.env` file

### 3. Webhook Secret (Optional)

1. In Linear Settings, go to "Webhooks"
2. Create a new webhook
3. Set the endpoint URL to your server
4. Copy the webhook secret to your `.env` file

## Running the Example

```bash
# Development mode with auto-reload
pnpm dev

# Build and run
pnpm build
pnpm start
```

## What This Example Does

### 1. Linear Integration Setup
- Initializes Linear API client with authentication
- Validates API credentials
- Sets up event listeners for Linear events

### 2. AI Agent Creation
- Creates a VoltAgent with Linear management tools
- Provides comprehensive Linear project management capabilities
- Enables natural language interaction with Linear

### 3. Capability Demonstration
- **Team Discovery**: Lists available Linear teams
- **Workflow States**: Shows team workflow configurations
- **Requirement Analysis**: Analyzes sample requirements and creates issues
- **Progress Tracking**: Monitors project progress and metrics
- **Sync Management**: Handles bidirectional synchronization

### 4. Event Monitoring
- Listens to Linear integration events
- Logs issue creation, updates, and sync operations
- Monitors conflicts and progress changes

## Available Agent Capabilities

The AI agent has access to these Linear tools:

### Issue Management
- `create_linear_issue` - Create new issues with VoltAgent extensions
- `update_linear_issue` - Update existing issues
- `get_linear_issue` - Retrieve issue details with sub-issues
- `search_linear_issues` - Search issues by text query

### Requirement Analysis
- `create_issues_from_requirements` - Analyze requirements and generate issue hierarchies

### Progress & Analytics
- `get_project_progress` - Get real-time progress data
- `generate_progress_report` - Create comprehensive progress reports
- `generate_team_metrics` - Generate team performance analytics

### Synchronization
- `sync_with_linear` - Perform bidirectional sync operations
- `get_sync_status` - Check synchronization status

### Team Management
- `get_linear_teams` - List available teams
- `get_workflow_states` - Get team workflow states

## Example Interactions

Once running, you can interact with the agent using natural language:

```
"Create a new issue for implementing user authentication"

"Analyze these requirements and create a project structure:
- User registration with email verification
- JWT token authentication
- Password reset functionality
- User profile management"

"Show me the current progress of our project"

"Generate a team performance report for the last 30 days"

"Sync our local changes with Linear"

"What's the status of issue ABC-123?"
```

## Sample Requirements Analysis

The example includes a demonstration of requirement analysis using this sample:

```markdown
# E-commerce Platform

## Core Features
- User registration and authentication
- Product catalog with search and filtering
- Shopping cart functionality
- Order processing and payment integration
- Admin dashboard for inventory management

## Technical Requirements
- RESTful API design
- Database schema optimization
- Security implementation
- Performance monitoring
- Mobile-responsive design

## Quality Assurance
- Unit testing coverage
- Integration testing
- Security testing
- Performance testing
```

This generates:
- 1 main project issue
- Multiple sub-issues for each feature
- Complexity analysis (1-10 scale)
- Effort estimation in hours
- Dependency mapping
- Priority assignment

## Event Monitoring

The example sets up comprehensive event monitoring:

```typescript
integration.on("issue.created", (data) => {
  console.log(`Issue created: ${data.issue.title}`);
});

integration.on("sync.completed", (result) => {
  console.log(`Sync completed: ${result.created} created, ${result.updated} updated`);
});

integration.on("progress.calculated", (data) => {
  console.log(`Progress: ${data.progress.completionPercentage}%`);
});
```

## Webhook Integration

To enable real-time updates from Linear, set up a webhook endpoint:

```typescript
import express from "express";

const app = express();

app.post("/linear-webhook", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.headers["linear-signature"] as string;
  const payload = req.body.toString();

  if (integration.validateWebhookSignature(payload, signature)) {
    const event = JSON.parse(payload);
    integration.processWebhookEvent(event);
    res.status(200).send("OK");
  } else {
    res.status(401).send("Invalid signature");
  }
});

app.listen(3000, () => {
  console.log("Webhook server running on port 3000");
});
```

## Troubleshooting

### Common Issues

1. **Invalid API Key**:
   - Verify your Linear API key is correct
   - Check that the key has necessary permissions

2. **Team Not Found**:
   - Ensure the team ID is correct
   - Verify you have access to the specified team

3. **Rate Limiting**:
   - The integration includes automatic rate limiting
   - Adjust rate limit settings in configuration if needed

4. **Sync Conflicts**:
   - Use conflict resolution strategies
   - Monitor pending conflicts and resolve manually

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=voltagent:linear:*
```

## Next Steps

- Integrate with your existing Linear workflow
- Customize requirement analysis patterns
- Set up automated progress reporting
- Implement custom conflict resolution strategies
- Add team-specific metrics and dashboards

## Learn More

- [Linear API Documentation](https://developers.linear.app/)
- [VoltAgent Documentation](../../README.md)
- [@voltagent/linear Package](../../packages/linear/README.md)

