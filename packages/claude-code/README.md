# Claude Code Integration (`@voltagent/claude-code`)

A comprehensive Claude Code integration package for VoltAgent that provides AI-powered code validation, analysis, and deployment automation capabilities.

## 🚀 Features

### Core Capabilities
- **🔍 Intelligent PR Validation**: Automated deployment and validation of PR branches
- **🧠 AI-Powered Code Analysis**: Multi-dimensional code quality assessment using Claude Code
- **💡 Actionable Feedback**: Contextual improvement suggestions with detailed explanations
- **📊 Flexible Scoring System**: Weighted validation criteria with detailed breakdowns
- **🖥️ WSL2 Instance Management**: Dedicated environments for isolated validation
- **⚡ Real-time Updates**: Event-based progress tracking and notifications

### Advanced Features
- **🔄 Cyclical Improvement**: Learn from validation results to enhance future assessments
- **📈 Performance Monitoring**: Comprehensive metrics and health monitoring
- **🛡️ Security Analysis**: Built-in security vulnerability detection
- **🧪 Test Coverage Analysis**: Automated test coverage assessment
- **📚 Documentation Quality**: Documentation completeness and quality evaluation

## 📦 Installation

```bash
npm install @voltagent/claude-code @voltagent/core @voltagent/anthropic-ai
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Server    │    │  AgentAPI       │    │  Claude Code    │
│   (Express.js)  │◄──►│  Client         │◄──►│  Validation     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  WSL2 Manager   │    │   Database      │
│  (Instances)    │    │  (PostgreSQL)   │
└─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { ClaudeCodeIntegration } from '@voltagent/claude-code';

const claudeCode = new ClaudeCodeIntegration({
  config: {
    agentapi: {
      url: 'http://localhost:8000',
      apiKey: 'your-api-key',
    },
    validation: {
      enableSecurityAnalysis: true,
      enablePerformanceAnalysis: true,
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
    taskId: 'task-123',
    title: 'Implement new feature',
    priority: 1,
  }
);

console.log('Validation started:', session.id);
```

### Using with VoltAgent

```typescript
import { Agent } from '@voltagent/core';
import { ClaudeCodeProvider } from '@voltagent/claude-code';

const agent = new Agent({
  name: 'code-validator',
  instructions: 'A helpful assistant that validates code using Claude Code',
  llm: new ClaudeCodeProvider({
    apiKey: 'your-anthropic-api-key',
    claudeCodeConfig: {
      agentapi: {
        url: 'http://localhost:8000',
        apiKey: 'your-claude-code-api-key',
      },
    },
  }),
});

// The agent now has access to Claude Code validation capabilities
const validation = await agent.llm.validatePR(prInfo, taskContext);
```

## 📖 API Reference

### ClaudeCodeIntegration

The main class for Claude Code integration.

#### Constructor

```typescript
new ClaudeCodeIntegration(options?: ClaudeCodeIntegrationOptions)
```

#### Methods

##### validatePR(prInfo, taskContext, options?)
Validate a Pull Request using Claude Code.

```typescript
const session = await claudeCode.validatePR(
  {
    url: 'https://github.com/owner/repo.git',
    number: 123,
    branchName: 'feature/new-feature',
    repository: 'repo',
    owner: 'owner',
  },
  {
    taskId: 'task-123',
    title: 'Implement new feature',
    priority: 1,
  },
  {
    enableSecurityAnalysis: true,
    enablePerformanceAnalysis: true,
  }
);
```

##### analyzeCode(deploymentPath, options?)
Analyze code in a deployment path.

```typescript
const analysis = await claudeCode.analyzeCode('/path/to/code', {
  includeMetrics: true,
  includeSecurity: true,
  includePerformance: true,
});
```

##### deployPR(prUrl, branchName, options?)
Deploy a PR to a validation environment.

```typescript
const deployment = await claudeCode.deployPR(
  'https://github.com/owner/repo.git',
  'feature/new-feature',
  { projectId: 'my-project' }
);
```

##### getHealthStatus()
Get system health status.

```typescript
const health = await claudeCode.getHealthStatus();
console.log('System status:', health.status);
```

### Event Handling

```typescript
claudeCode.addEventListener('validation_completed', (event) => {
  console.log('Validation completed:', event.data.result);
});

claudeCode.addEventListener('validation_failed', (event) => {
  console.error('Validation failed:', event.data.error);
});
```

## ⚙️ Configuration

### Environment Variables

```bash
# AgentAPI Configuration
AGENTAPI_URL=http://localhost:8000
CLAUDE_CODE_API_KEY=your-api-key
AGENTAPI_TIMEOUT=300000

# Validation Configuration
ENABLE_SECURITY_ANALYSIS=true
ENABLE_PERFORMANCE_ANALYSIS=true
CODE_QUALITY_WEIGHT=0.3
FUNCTIONALITY_WEIGHT=0.4
TESTING_WEIGHT=0.2
DOCUMENTATION_WEIGHT=0.1

# WSL2 Configuration
WSL2_DISTRO=Ubuntu-22.04
WSL2_BASE_PATH=/mnt/c/projects
MAX_WSL2_INSTANCES=5
WSL2_MEMORY=8GB
WSL2_PROCESSORS=4
WSL2_SWAP=2GB

# Monitoring Configuration
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
METRICS_PORT=9090
LOG_LEVEL=info
```

### Configuration Object

```typescript
const config: ClaudeCodeConfig = {
  agentapi: {
    url: 'http://localhost:8000',
    apiKey: 'your-api-key',
    timeout: 300000,
  },
  validation: {
    enableSecurityAnalysis: true,
    enablePerformanceAnalysis: true,
    codeQualityWeight: 0.3,
    functionalityWeight: 0.4,
    testingWeight: 0.2,
    documentationWeight: 0.1,
    timeout: 300000,
  },
  deployment: {
    strategy: 'wsl2',
    wsl2: {
      distro: 'Ubuntu-22.04',
      basePath: '/mnt/c/projects',
      maxInstances: 5,
      memory: '8GB',
      processors: 4,
      swap: '2GB',
    },
  },
  monitoring: {
    enableMetrics: true,
    enableHealthChecks: true,
    metricsPort: 9090,
    logLevel: 'info',
  },
};
```

## 🔧 Advanced Usage

### Batch Validation

```typescript
const results = await claudeCode.validateBatch([
  { path: '/path/to/project1', options: { enableSecurityAnalysis: true } },
  { path: '/path/to/project2', options: { enablePerformanceAnalysis: true } },
]);
```

### Streaming Validation

```typescript
const result = await claudeCode.validateCodeStream(
  '/path/to/code',
  { enableSecurityAnalysis: true },
  (progress) => {
    console.log(`${progress.step}: ${progress.percentage}%`);
  }
);
```

### WSL2 Instance Management

```typescript
// Create instance
const instance = await claudeCode.createInstance('my-project', {
  memory: '16GB',
  processors: 8,
});

// List instances
const instances = await claudeCode.listInstances();

// Destroy instance
await claudeCode.destroyInstance(instance.instanceName);
```

### Custom Event Handlers

```typescript
const claudeCode = new ClaudeCodeIntegration({
  eventHandlers: {
    onValidationStarted: async (event) => {
      console.log('Validation started for session:', event.sessionId);
    },
    onValidationCompleted: async (event) => {
      const result = event.data.result;
      console.log(`Validation completed with score: ${result.overallScore}`);
    },
    onValidationFailed: async (event) => {
      console.error('Validation failed:', event.data.error);
    },
  },
});
```

## 📊 Validation Results

### Result Structure

```typescript
interface ValidationResult {
  sessionId: string;
  status: 'success' | 'failure' | 'timeout' | 'cancelled';
  overallScore: number;
  grade: string;
  scores: {
    codeQuality: number;
    functionality: number;
    testing: number;
    documentation: number;
  };
  strengths: string[];
  weaknesses: string[];
  feedback: ValidationFeedback[];
  duration: number;
  metadata: Record<string, any>;
  timestamp: string;
}
```

### Feedback Structure

```typescript
interface ValidationFeedback {
  type: string;
  category: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
  suggestions: string[];
  codeSnippet?: string;
  fixable: boolean;
}
```

## 🔍 Monitoring and Metrics

### Health Monitoring

```typescript
const health = await claudeCode.getHealthStatus();
console.log('System health:', health);
```

### Validation Metrics

```typescript
const metrics = await claudeCode.getValidationMetrics('7d');
console.log('Validation metrics:', metrics);
```

### Instance Metrics

```typescript
const instanceMetrics = await claudeCode.getInstanceMetrics();
console.log('Instance metrics:', instanceMetrics);
```

## 🛠️ Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
npm run test:coverage
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

For support and questions:

- 📧 Email: support@voltagent.com
- 💬 Discord: [VoltAgent Community](https://discord.gg/voltagent)
- 📖 Documentation: [docs.voltagent.com](https://docs.voltagent.com)
- 🐛 Issues: [GitHub Issues](https://github.com/VoltAgent/voltagent/issues)

---

**🎯 Built with ❤️ by the VoltAgent team for intelligent, AI-driven code validation workflows.**

