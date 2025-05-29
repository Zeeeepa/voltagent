# Phase 2.2: Codegen SDK Integration

This implementation provides comprehensive integration with the Codegen SDK for intelligent code generation, repository management, and AI coordination.

## 🏗️ Architecture Overview

The implementation follows a modular architecture with three main layers:

### 1. Middleware Layer (`middleware/codegen/`)
- **SDK Client** (`sdk-client.ts`): Core API client for Codegen services
- **Authentication Manager** (`auth-manager.ts`): Token management and validation
- **Repository Operations** (`repository-ops.ts`): Git repository management
- **PR Manager** (`pr-manager.ts`): Pull request creation and management

### 2. AI Coordination Layer (`ai/coordination/`)
- **Task Router** (`task-router.ts`): Intelligent routing between agents
- **Dual Agent Manager** (`dual-agent-manager.ts`): Coordination and handoff protocols

### 3. AI Services Layer (`ai/services/`)
- **Code Generation Service** (`code-generation.ts`): High-level code generation
- **Review Analysis Service** (`review-analysis.ts`): Automated code review
- **Debugging Assistant** (`debugging-assistant.ts`): Error analysis and debugging

## 🚀 Quick Start

### Environment Setup

```bash
# Required environment variables
export CODEGEN_API_TOKEN="your-api-token"
export CODEGEN_ORG_ID="your-org-id"

# Optional configuration
export CODEGEN_BASE_URL="https://codegen-sh-rest-api.modal.run"
export GITHUB_TOKEN="your-github-token"
```

### Basic Usage

```typescript
import { createCodegenIntegrationFromEnv, TaskType, TaskPriority } from './codegen-integration.js';

// Initialize integration
const codegen = createCodegenIntegrationFromEnv();

// Validate connection
const isConnected = await codegen.validateConnection();
if (!isConnected) {
  throw new Error('Failed to connect to Codegen API');
}

// Submit a task
const taskId = await codegen.submitTask(
  'Create a React component for user authentication',
  TaskType.CODE_GENERATION,
  TaskPriority.HIGH
);

// Generate code directly
const result = await codegen.generateCode(
  'Create a TypeScript function to validate email addresses',
  {
    language: 'typescript',
    testGeneration: true,
    documentation: true
  }
);

// Review code
const review = await codegen.reviewCode(
  'src/components/UserAuth.tsx',
  {
    security: true,
    performance: true,
    bestPractices: true
  }
);

// Debug errors
const debugResult = await codegen.debugError({
  errorMessage: 'TypeError: Cannot read property of undefined',
  code: 'const user = data.user.profile.name;',
  context: {
    language: 'javascript',
    framework: 'react'
  }
});
```

## 📋 Features

### ✅ Implemented Features

#### Codegen SDK Client Setup
- ✅ SDK client with token + org_id authentication
- ✅ Repository operations through Codegen SDK
- ✅ PR management and GitHub integration
- ✅ Error handling and retry mechanisms
- ✅ Request/response logging

#### AI Coordination
- ✅ Task router for intelligent routing between Codegen SDK and Claude Code
- ✅ Dual agent manager for coordination and handoff protocols
- ✅ Load balancing and fallback mechanisms
- ✅ Agent health monitoring
- ✅ Performance metrics and optimization

#### Code Generation Services
- ✅ High-level code generation requests
- ✅ Automated code review and debugging assistance
- ✅ Integration with existing codebase
- ✅ Template-based code generation
- ✅ Context-aware code suggestions

### 🔧 Configuration

The integration supports comprehensive configuration through environment variables:

```typescript
// Authentication
CODEGEN_API_TOKEN=your-token
CODEGEN_ORG_ID=your-org-id

// API Configuration
CODEGEN_BASE_URL=https://codegen-sh-rest-api.modal.run
CODEGEN_TIMEOUT=30000
CODEGEN_RETRY_ATTEMPTS=3

// GitHub Integration
GITHUB_TOKEN=your-github-token

// Performance
CODEGEN_MAX_CONCURRENT_TASKS=5
CODEGEN_TASK_TIMEOUT=300000

// Features
CODEGEN_ENABLE_AUTO_FIX=true
CODEGEN_ENABLE_CACHING=true
```

## 🔄 Task Routing

The task router intelligently assigns tasks based on:

- **Agent Capabilities**: Matching task requirements to agent strengths
- **Load Balancing**: Distributing tasks across available agents
- **Complexity Analysis**: Routing complex tasks to appropriate agents
- **Fallback Mechanisms**: Automatic handoff when primary agent fails

### Agent Types

1. **Codegen SDK Agent**
   - Strengths: Large-scale operations, repository management, GitHub integration
   - Best for: Complex refactoring, multi-file operations, automated workflows

2. **Claude Code Agent**
   - Strengths: Real-time interaction, context understanding, quick iterations
   - Best for: Interactive coding, code explanation, debugging assistance

## 🛠️ API Reference

### Core Classes

#### `CodegenIntegration`
Main integration class providing unified access to all functionality.

```typescript
class CodegenIntegration {
  async validateConnection(): Promise<boolean>
  async submitTask(description: string, type: TaskType, priority?: TaskPriority): Promise<string>
  async generateCode(description: string, options?: CodeGenerationOptions): Promise<GenerationResult>
  async reviewCode(filePath: string, criteria?: ReviewCriteria): Promise<ReviewResult>
  async debugError(request: DebugRequest): Promise<DebugResult>
  async createBranch(repoUrl: string, branchName: string, baseBranch?: string): Promise<CodegenTask>
  async createPullRequest(repoUrl: string, title: string, description: string, headBranch: string, baseBranch?: string): Promise<CodegenTask>
}
```

#### `TaskRouter`
Intelligent task routing between agents.

```typescript
class TaskRouter {
  async routeTask(task: TaskRequest): Promise<RoutingDecision>
  updateAgentLoad(agentType: AgentType, load: number): void
  getRoutingStats(): RoutingStats
}
```

#### `DualAgentManager`
Coordination between multiple AI agents.

```typescript
class DualAgentManager {
  async submitTask(task: TaskRequest): Promise<string>
  getAgentStatus(): AgentSession[]
  getMetrics(): CoordinationMetrics
}
```

## 🔍 Error Handling

The integration includes comprehensive error handling:

- **Authentication Errors**: Automatic token validation and refresh
- **Network Errors**: Retry mechanisms with exponential backoff
- **API Errors**: Structured error responses with actionable messages
- **Task Failures**: Automatic fallback to alternative agents

## 📊 Monitoring and Metrics

Built-in monitoring provides insights into:

- Task completion rates
- Agent utilization
- Response times
- Error rates
- Routing accuracy

## 🧪 Testing

The implementation includes comprehensive testing support:

- Unit tests for all core components
- Integration tests with mock Codegen API
- Error scenario testing
- Performance benchmarks

## 🔒 Security

Security features include:

- Secure credential storage
- Input validation for all user data
- Rate limiting to prevent abuse
- Audit logging for all operations
- Access control for sensitive operations

## 📈 Performance

Performance optimizations:

- Connection pooling for API requests
- Caching of frequently accessed data
- Parallel processing of independent tasks
- Load balancing across agents
- Timeout handling for long-running operations

## 🤝 Integration Points

The implementation integrates with:

- **AgentAPI Middleware**: Seamless coordination with existing agent infrastructure
- **Database Event Storage**: Persistent storage of task history and metrics
- **GitHub API**: Direct repository and PR management
- **Linear API**: Issue tracking and project management

## 📝 Usage Examples

### Code Generation with Templates

```typescript
// Generate React component from template
const component = await codegen.codeGeneration.generateFromTemplate(
  'react-component',
  {
    componentName: 'UserProfile',
    props: 'user: User; onEdit: () => void',
    propParams: '{ user, onEdit }',
    componentBody: 'return <div>{user.name}</div>;'
  },
  { testGeneration: true }
);
```

### Automated Code Review

```typescript
// Review multiple files
const files = ['src/auth.ts', 'src/user.ts', 'src/api.ts'];
const reviews = await codegen.codeReview.reviewMultipleFiles(
  files,
  {
    security: true,
    performance: true,
    maintainability: true
  }
);
```

### Debugging with Context

```typescript
// Debug with full context
const debugResult = await codegen.debugging.debugError({
  errorMessage: 'Memory leak detected',
  code: sourceCode,
  context: {
    language: 'javascript',
    framework: 'node',
    environment: 'production',
    recentChanges: ['Updated user service', 'Added caching layer']
  }
});
```

## 🚀 Deployment

For production deployment:

1. Set all required environment variables
2. Configure monitoring and logging
3. Set up health checks
4. Configure rate limiting
5. Enable security features

## 📚 Documentation

- [API Documentation](./docs/api.md)
- [Configuration Guide](./docs/configuration.md)
- [Troubleshooting](./docs/troubleshooting.md)
- [Best Practices](./docs/best-practices.md)

## 🤝 Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for contribution guidelines.

## 📄 License

This implementation is part of the VoltAgent project and follows the same license terms.

