# Claude Code Integration Example

This example demonstrates how to use the consolidated Claude Code integration package with VoltAgent.

## Overview

The Claude Code integration provides:
- AI-powered code validation using Claude's advanced code analysis capabilities
- Automated PR deployment and validation workflows
- Comprehensive feedback and scoring system
- WSL2-based isolated validation environments
- Real-time progress tracking and event handling

## Setup

1. Install dependencies:
```bash
npm install @voltagent/core @voltagent/claude-code @voltagent/anthropic-ai
```

2. Set up environment variables:
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
```

3. Configure AgentAPI service (if using external service):
```bash
# Start AgentAPI service
docker run -p 8000:8000 agentapi/claude-code
```

## Usage Examples

### Basic PR Validation

```typescript
import { ClaudeCodeIntegration } from '@voltagent/claude-code';

const claudeCode = new ClaudeCodeIntegration({
  config: {
    agentapi: {
      url: process.env.AGENTAPI_URL || 'http://localhost:8000',
      apiKey: process.env.CLAUDE_CODE_API_KEY,
    },
  },
});

// Validate a PR
const session = await claudeCode.validatePR(
  {
    url: 'https://github.com/owner/repo.git',
    number: 123,
    branchName: 'feature/new-feature',
    repository: 'repo',
    owner: 'owner',
  },
  {
    taskId: 'validation-123',
    title: 'Validate new feature implementation',
    priority: 1,
  }
);

console.log('Validation session started:', session.id);
```

### VoltAgent Integration

```typescript
import { VoltAgent, Agent } from '@voltagent/core';
import { ClaudeCodeProvider } from '@voltagent/claude-code';

const claudeCodeProvider = new ClaudeCodeProvider({
  apiKey: process.env.ANTHROPIC_API_KEY,
  claudeCodeConfig: {
    agentapi: {
      url: process.env.AGENTAPI_URL,
      apiKey: process.env.CLAUDE_CODE_API_KEY,
    },
  },
});

const codeValidatorAgent = new Agent({
  name: 'code-validator',
  instructions: `You are a code validation assistant that uses Claude Code to analyze and validate code changes.
  
  When asked to validate code:
  1. Use the validatePR function to analyze the code
  2. Provide detailed feedback on code quality, security, and performance
  3. Suggest specific improvements based on the validation results
  4. Explain the scoring and grading system`,
  llm: claudeCodeProvider,
  tools: [
    {
      name: 'validate_pr',
      description: 'Validate a Pull Request using Claude Code',
      parameters: {
        type: 'object',
        properties: {
          prUrl: { type: 'string', description: 'PR repository URL' },
          branchName: { type: 'string', description: 'Branch name to validate' },
          prNumber: { type: 'number', description: 'PR number' },
          repository: { type: 'string', description: 'Repository name' },
          owner: { type: 'string', description: 'Repository owner' },
        },
        required: ['prUrl', 'branchName', 'repository', 'owner'],
      },
      handler: async ({ prUrl, branchName, prNumber, repository, owner }) => {
        const session = await claudeCodeProvider.validatePR(
          { url: prUrl, branchName, number: prNumber, repository, owner },
          { taskId: `validation-${Date.now()}`, title: 'PR Validation', priority: 1 }
        );
        return { sessionId: session.id, status: session.status };
      },
    },
  ],
});

new VoltAgent({
  agents: { codeValidator: codeValidatorAgent },
});
```

### Event-Driven Validation

```typescript
import { ClaudeCodeIntegration } from '@voltagent/claude-code';

const claudeCode = new ClaudeCodeIntegration({
  eventHandlers: {
    onValidationStarted: async (event) => {
      console.log(`🚀 Validation started for session: ${event.sessionId}`);
    },
    onValidationProgress: async (event) => {
      const { step, percentage } = event.data;
      console.log(`⏳ ${step}: ${percentage}%`);
    },
    onValidationCompleted: async (event) => {
      const result = event.data.result;
      console.log(`✅ Validation completed with score: ${result.overallScore}/100 (${result.grade})`);
      
      // Send notification or update database
      await sendNotification({
        type: 'validation_completed',
        score: result.overallScore,
        grade: result.grade,
        sessionId: event.sessionId,
      });
    },
    onValidationFailed: async (event) => {
      console.error(`❌ Validation failed: ${event.data.error}`);
      
      // Handle failure
      await handleValidationFailure(event.sessionId, event.data.error);
    },
  },
});
```

### Batch Validation

```typescript
// Validate multiple projects
const projects = [
  { path: '/workspace/project1', options: { enableSecurityAnalysis: true } },
  { path: '/workspace/project2', options: { enablePerformanceAnalysis: true } },
  { path: '/workspace/project3', options: { enableSecurityAnalysis: true, enablePerformanceAnalysis: true } },
];

const results = await claudeCode.validateBatch(projects);

results.forEach((result, index) => {
  console.log(`Project ${index + 1}: ${result.overallScore}/100 (${result.grade})`);
});
```

### Custom Validation Workflow

```typescript
class CustomValidationWorkflow {
  private claudeCode: ClaudeCodeIntegration;

  constructor() {
    this.claudeCode = new ClaudeCodeIntegration();
  }

  async validatePullRequest(prInfo: any) {
    try {
      // Step 1: Deploy PR
      console.log('🚀 Deploying PR for validation...');
      const deployment = await this.claudeCode.deployPR(
        prInfo.url,
        prInfo.branchName,
        { projectId: `pr-${prInfo.number}` }
      );

      // Step 2: Run validation
      console.log('🔍 Running Claude Code validation...');
      const session = await this.claudeCode.validatePR(
        prInfo,
        {
          taskId: `validation-${prInfo.number}`,
          title: `Validate PR #${prInfo.number}`,
          priority: 1,
        }
      );

      // Step 3: Wait for completion (in real implementation, use events)
      const result = await this.waitForValidation(session.id);

      // Step 4: Generate report
      const report = await this.generateReport(result);

      // Step 5: Post results
      await this.postResults(prInfo, result, report);

      return result;
    } catch (error) {
      console.error('Validation workflow failed:', error);
      throw error;
    }
  }

  private async waitForValidation(sessionId: string): Promise<any> {
    // Implementation would poll or use WebSocket for real-time updates
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ sessionId, status: 'completed' });
      }, 5000);
    });
  }

  private async generateReport(result: any): Promise<string> {
    return `
# Code Validation Report

**Overall Score:** ${result.overallScore}/100
**Grade:** ${result.grade}

## Summary
This PR has been automatically validated using Claude Code.

## Key Findings
- Code Quality: ${result.scores?.codeQuality || 'N/A'}/100
- Functionality: ${result.scores?.functionality || 'N/A'}/100
- Testing: ${result.scores?.testing || 'N/A'}/100
- Documentation: ${result.scores?.documentation || 'N/A'}/100

## Recommendations
${result.weaknesses?.map((w: string) => `- ${w}`).join('\n') || 'No specific recommendations'}
`;
  }

  private async postResults(prInfo: any, result: any, report: string): Promise<void> {
    // Post results to GitHub, Slack, or other systems
    console.log('📊 Validation Results Posted');
    console.log(report);
  }
}

// Usage
const workflow = new CustomValidationWorkflow();
await workflow.validatePullRequest({
  url: 'https://github.com/owner/repo.git',
  number: 123,
  branchName: 'feature/new-feature',
  repository: 'repo',
  owner: 'owner',
});
```

### Health Monitoring

```typescript
// Monitor system health
setInterval(async () => {
  const health = await claudeCode.getHealthStatus();
  
  if (health.status !== 'healthy') {
    console.warn('⚠️ Claude Code system health degraded:', health);
    
    // Send alert
    await sendAlert({
      type: 'health_degraded',
      status: health.status,
      services: health.services,
      timestamp: new Date().toISOString(),
    });
  }
}, 60000); // Check every minute
```

## Configuration

### Environment Variables

```bash
# AgentAPI Configuration
AGENTAPI_URL=http://localhost:8000
CLAUDE_CODE_API_KEY=your-claude-code-api-key

# Anthropic Configuration
ANTHROPIC_API_KEY=your-anthropic-api-key

# Validation Configuration
ENABLE_SECURITY_ANALYSIS=true
ENABLE_PERFORMANCE_ANALYSIS=true
CODE_QUALITY_WEIGHT=0.3
FUNCTIONALITY_WEIGHT=0.4
TESTING_WEIGHT=0.2
DOCUMENTATION_WEIGHT=0.1

# WSL2 Configuration (Windows only)
WSL2_DISTRO=Ubuntu-22.04
WSL2_MEMORY=8GB
WSL2_PROCESSORS=4
MAX_WSL2_INSTANCES=5

# Monitoring
ENABLE_METRICS=true
LOG_LEVEL=info
```

## Best Practices

1. **Error Handling**: Always wrap validation calls in try-catch blocks
2. **Event Handling**: Use event handlers for real-time updates and notifications
3. **Resource Management**: Clean up old WSL2 instances regularly
4. **Configuration**: Use environment variables for sensitive configuration
5. **Monitoring**: Implement health checks and monitoring
6. **Batch Processing**: Use batch validation for multiple projects
7. **Caching**: Cache validation results to avoid redundant validations

## Troubleshooting

### Common Issues

1. **AgentAPI Connection Failed**
   - Check if AgentAPI service is running
   - Verify the URL and API key
   - Check network connectivity

2. **WSL2 Instance Creation Failed**
   - Ensure WSL2 is installed and enabled
   - Check available system resources
   - Verify WSL2 configuration

3. **Validation Timeout**
   - Increase timeout values in configuration
   - Check system resources
   - Verify code complexity

4. **Permission Errors**
   - Check file system permissions
   - Verify WSL2 user permissions
   - Check API key permissions

### Debug Mode

```typescript
const claudeCode = new ClaudeCodeIntegration({
  config: {
    monitoring: {
      logLevel: 'debug',
    },
  },
});
```

## Support

For additional support:
- Check the main package documentation
- Review the API reference
- Join the VoltAgent Discord community
- Submit issues on GitHub

