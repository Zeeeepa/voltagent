# WSL2 PR Deployment and Validation Pipeline

A comprehensive automated deployment system that integrates WSL2 environments with GitHub PR management, featuring AI-powered code review and validation.

## 🎯 Overview

This implementation provides a complete WSL2-based PR deployment system with:

- **Automated Environment Setup**: WSL2 instance management and Docker orchestration
- **Branch Cloning & Management**: Git operations with LFS and submodule support
- **Build System**: Parallel builds with caching and artifact management
- **Test Orchestration**: Parallel test execution with coverage reporting
- **Quality Gates**: Code quality, security, and performance validation
- **AI Integration**: Claude Code review with Codegen SDK fallback
- **GitHub Integration**: PR management, webhooks, and automated reviews
- **Real-time Monitoring**: Resource usage tracking and alerting

## 📦 Packages

### @voltagent/wsl2-integration

Core WSL2 deployment and validation components:

- `WSL2DeploymentEngine` - Environment lifecycle management
- `WSL2EnvironmentSetup` - Development environment configuration
- `WSL2BranchCloner` - Git repository operations
- `WSL2BuildSystem` - Build process orchestration
- `WSL2TestOrchestrator` - Test execution and reporting
- `WSL2QualityGates` - Quality validation checks
- `WSL2ValidationRunner` - Comprehensive validation suite
- `WSL2DeploymentMonitor` - Real-time monitoring
- `WSL2ClaudeIntegration` - AI-powered code review
- `WSL2CodegenFallback` - Codegen SDK integration

### @voltagent/github-integration

GitHub API integration and automation:

- `GitHubPRManager` - Pull request lifecycle management
- `GitHubWebhookHandler` - Event-driven automation
- `GitHubReviewAutomation` - Automated code reviews

## 🚀 Quick Start

### Prerequisites

- Windows 11 with WSL2 enabled
- Docker Desktop with WSL2 backend
- Ubuntu 22.04 LTS distribution
- Node.js 18+ and npm/pnpm
- GitHub token with repository access
- Claude API key (optional)
- Codegen API credentials (optional)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd voltagent

# Install dependencies
pnpm install

# Build packages
pnpm run build
```

### Configuration

Create a `.env` file with required credentials:

```env
GITHUB_TOKEN=your_github_token
GITHUB_WEBHOOK_SECRET=your_webhook_secret
CLAUDE_API_KEY=your_claude_api_key
CODEGEN_API_KEY=your_codegen_api_key
CODEGEN_ORG_ID=your_codegen_org_id
```

### Basic Usage

```typescript
import { WSL2DeploymentWorkflow } from '@voltagent/wsl2-integration';
import { GitHubPRManager } from '@voltagent/github-integration';

// Initialize the deployment workflow
const workflow = new WSL2DeploymentWorkflow(config);

// Deploy a PR
const result = await workflow.deployPR(123, 'https://github.com/org/repo.git', 'feature-branch');

console.log(`Deployment ${result.success ? 'succeeded' : 'failed'}`);
```

## 🔧 Configuration

### WSL2 Configuration

```json
{
  "wsl2": {
    "distro": "Ubuntu-22.04",
    "memory": "8GB",
    "processors": 4,
    "swap": "2GB"
  },
  "docker": {
    "baseImage": "node:18-alpine",
    "networkMode": "bridge",
    "volumes": ["/workspace:/app"]
  },
  "validation": {
    "timeout": 1800,
    "retries": 3,
    "parallelJobs": 2
  }
}
```

### Build Configuration

```typescript
const buildConfig = {
  steps: [
    {
      name: 'install',
      command: 'npm ci',
      timeout: 600000,
      retries: 2,
      required: true,
    },
    {
      name: 'build',
      command: 'npm run build',
      timeout: 600000,
      retries: 1,
      required: true,
    },
  ],
  parallelJobs: 2,
  cacheEnabled: true,
};
```

### Quality Gates

```typescript
const qualityConfig = {
  gates: [
    {
      name: 'test-coverage',
      type: 'coverage',
      threshold: 80,
      operator: 'gte',
      required: true,
    },
    {
      name: 'security-audit',
      type: 'security',
      threshold: 0,
      operator: 'eq',
      required: true,
    },
  ],
  failFast: false,
};
```

## 🔄 Deployment Workflow

The complete deployment workflow follows these stages:

1. **Environment Creation**: Provision WSL2 container with Docker
2. **Repository Cloning**: Clone PR branch with dependencies
3. **Environment Setup**: Install Node.js, dependencies, and services
4. **Build Process**: Execute build steps with caching
5. **Test Execution**: Run test suites with coverage reporting
6. **Quality Validation**: Execute quality gates and security scans
7. **AI Review**: Claude Code analysis with Codegen fallback
8. **Report Generation**: Comprehensive deployment report
9. **PR Updates**: Post results and recommendations
10. **Cleanup**: Resource cleanup and monitoring stop

## 📊 Monitoring & Alerts

Real-time monitoring includes:

- **CPU Usage**: Track processor utilization
- **Memory Usage**: Monitor RAM consumption
- **Disk Usage**: Track storage utilization
- **Process Monitoring**: Track running processes
- **Alert System**: Configurable thresholds and notifications

```typescript
const monitorConfig = {
  interval: 5000,
  metrics: ['cpu', 'memory', 'disk'],
  alerts: {
    cpu: 80,
    memory: 85,
    disk: 90,
  },
};
```

## 🤖 AI Integration

### Claude Code Integration

Automated code review with:
- Bug detection and analysis
- Security vulnerability scanning
- Performance optimization suggestions
- Code quality assessment
- Best practices recommendations

### Codegen SDK Fallback

Fallback system for:
- Complex issue analysis
- Code generation and fixes
- Refactoring suggestions
- Error resolution

## 🔗 GitHub Integration

### Webhook Events

Supported webhook events:
- `pull_request.opened` - Trigger deployment
- `pull_request.synchronize` - Re-run validation
- `check_run.completed` - Monitor CI status
- `push` - Track branch updates

### Automated Reviews

Features include:
- Automated PR reviews with scoring
- Inline code comments
- Security finding reports
- Performance issue detection
- Approval/rejection based on thresholds

## 📈 Reporting

Comprehensive reports include:

- **Deployment Status**: Success/failure with timing
- **Test Results**: Coverage, pass/fail rates
- **Quality Metrics**: Code quality scores
- **Security Findings**: Vulnerability reports
- **Performance Analysis**: Build times, resource usage
- **AI Recommendations**: Code improvement suggestions

## 🛠️ Development

### Running the Example

```bash
cd examples/wsl2-deployment-pipeline
npm install
npm start
```

### Manual Deployment

```bash
npm run manual -- --pr 123 --repo https://github.com/org/repo.git --branch feature-branch
```

### Testing

```bash
# Run tests for WSL2 integration
cd packages/wsl2-integration
npm test

# Run tests for GitHub integration
cd packages/github-integration
npm test
```

## 🔒 Security Considerations

- **Environment Isolation**: Each PR gets isolated WSL2 container
- **Credential Management**: Secure handling of API keys and tokens
- **Network Isolation**: Containers run in isolated networks
- **Access Control**: WSL2 operations with proper permissions
- **Audit Logging**: Comprehensive activity logging

## 📚 API Reference

### WSL2DeploymentWorkflow

```typescript
class WSL2DeploymentWorkflow {
  async deployPR(prNumber: number, repoUrl: string, branch: string): Promise<WorkflowResult>
  generateReport(result: WorkflowResult): string
}
```

### GitHubPRManager

```typescript
class GitHubPRManager {
  async createPR(title: string, body: string, head: string, base?: string): Promise<PRInfo>
  async updatePR(prNumber: number, updates: Partial<PRInfo>): Promise<PRInfo>
  async mergePR(prNumber: number, method?: 'merge' | 'squash' | 'rebase'): Promise<void>
  async addComment(prNumber: number, body: string): Promise<void>
}
```

## 🚨 Troubleshooting

### Common Issues

1. **WSL2 Not Available**
   - Ensure WSL2 is installed and enabled
   - Check Ubuntu distribution is available
   - Verify Docker Desktop WSL2 integration

2. **Build Failures**
   - Check Node.js version compatibility
   - Verify package.json scripts exist
   - Review build logs for specific errors

3. **Test Failures**
   - Ensure test commands are correct
   - Check test environment setup
   - Review coverage thresholds

4. **GitHub API Errors**
   - Verify GitHub token permissions
   - Check repository access
   - Review rate limiting

### Debug Mode

Enable debug logging:

```typescript
process.env.DEBUG = 'voltagent:*';
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- Built on the VoltAgent AI Agent Framework
- Integrates with GitHub API and webhooks
- Uses Claude AI for code analysis
- Leverages Codegen SDK for code generation
- WSL2 and Docker for environment isolation

