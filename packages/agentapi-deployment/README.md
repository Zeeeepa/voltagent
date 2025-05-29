# @voltagent/agentapi-deployment

AgentAPI & Claude Code deployment integration for VoltAgent - enabling automated PR validation and testing through WSL2 environments.

## 🎯 Overview

This module provides a comprehensive solution for automatically deploying PR branches via AgentAPI and Claude Code on WSL2 environments. It enables automated validation, testing, and reporting as part of a CI/CD pipeline.

## ✨ Features

- **🚀 Automated PR Deployment**: Automatically deploy PR branches to isolated WSL2 environments
- **🤖 Claude Code Integration**: Leverage Claude Code for intelligent code analysis and validation
- **🔄 AgentAPI Communication**: Seamless integration with AgentAPI for agent control
- **📊 Comprehensive Logging**: SQL database integration for deployment tracking and analytics
- **🪝 Webhook Support**: GitHub webhook integration for automated triggering
- **🛡️ Error Recovery**: Robust error handling and recovery mechanisms
- **📈 Real-time Monitoring**: Event-driven architecture with real-time status updates

## 📦 Installation

```bash
npm install @voltagent/agentapi-deployment
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { createDefaultDeploymentModule } from "@voltagent/agentapi-deployment";

// Create deployment module with default configuration
const deploymentModule = createDefaultDeploymentModule({
  agentapi: {
    baseUrl: "http://localhost",
    port: 3284,
  },
  database: {
    connectionString: "postgresql://user:password@localhost:5432/deployments",
  },
});

// Deploy a PR
const prInfo = {
  number: 123,
  branch: "feature/new-api",
  repository: "my-repo",
  owner: "my-org",
  headSha: "abc123def456",
  baseBranch: "main",
  title: "Add new API endpoint",
};

try {
  const result = await deploymentModule.deployPR(prInfo);
  console.log("Deployment successful:", result);
} catch (error) {
  console.error("Deployment failed:", error);
} finally {
  await deploymentModule.cleanup();
}
```

### Webhook Integration

```typescript
import { createDeploymentModule } from "@voltagent/agentapi-deployment";

const deploymentModule = createDeploymentModule({
  agentapi: { baseUrl: "http://localhost", port: 3284 },
  wsl2: { instancePrefix: "pr-env" },
  claudeCode: { model: "claude-3-sonnet-20240229" },
  webhooks: {
    secret: "your-webhook-secret",
    autoTriggerEvents: ["opened", "synchronize"],
  },
});

// Handle GitHub webhook
app.post("/webhook", async (req, res) => {
  const signature = req.headers["x-hub-signature-256"];
  const result = await deploymentModule.handleWebhook(
    req.body,
    signature,
    "pull_request"
  );
  res.json(result);
});
```

## 🔧 Configuration

### DeploymentConfig

```typescript
interface DeploymentConfig {
  agentapi: AgentAPIConfig;
  wsl2: WSL2Config;
  claudeCode: ClaudeCodeConfig;
  database?: DatabaseConfig;
  webhooks?: WebhookConfig;
}
```

### AgentAPI Configuration

```typescript
interface AgentAPIConfig {
  baseUrl: string;          // AgentAPI server URL
  port?: number;            // Port (default: 3284)
  timeout?: number;         // Request timeout (default: 30000ms)
  retryAttempts?: number;   // Retry attempts (default: 3)
  retryDelay?: number;      // Retry delay (default: 1000ms)
}
```

### WSL2 Configuration

```typescript
interface WSL2Config {
  distributionName?: string;    // WSL2 distribution (default: "Ubuntu-22.04")
  instancePrefix?: string;      // Instance name prefix
  resourceLimits?: {
    memory?: string;            // Memory limit (e.g., "4GB")
    processors?: number;        // CPU cores (default: 2)
  };
  networkConfig?: {
    hostPort?: number;          // Host port mapping
    guestPort?: number;         // Guest port mapping
  };
}
```

### Claude Code Configuration

```typescript
interface ClaudeCodeConfig {
  version?: string;             // Claude Code version
  allowedTools?: string[];      // Allowed tools (e.g., ["Bash(git*)", "Edit"])
  apiKey?: string;             // Anthropic API key
  model?: string;              // Claude model to use
  additionalArgs?: string[];    // Additional CLI arguments
}
```

## 📊 Deployment Pipeline

The deployment process follows these steps:

1. **PR Detection**: Webhook triggers deployment
2. **Environment Setup**: WSL2 instance provisioning
3. **Code Deployment**: Branch cloning and setup
4. **Claude Code Integration**: Agent deployment and startup
5. **Validation**: Automated testing and analysis
6. **Reporting**: Results back to Linear/GitHub

## 🎭 Event System

The module emits various events during the deployment lifecycle:

```typescript
deploymentModule.on("deployment_started", (context) => {
  console.log(`Deployment started for PR ${context.prInfo.number}`);
});

deploymentModule.on("environment_provisioned", (context) => {
  console.log(`Environment ready: ${context.wsl2Instance.name}`);
});

deploymentModule.on("validation_completed", (context) => {
  console.log("Validation results:", context.validationResults);
});

deploymentModule.on("deployment_completed", (context) => {
  console.log("Deployment successful!");
});

deploymentModule.on("deployment_failed", (context) => {
  console.error("Deployment failed:", context.error);
});
```

## 📈 Monitoring & Analytics

### Deployment Status

```typescript
// Get deployment status
const status = await deploymentModule.getDeploymentStatus(deploymentId);

// Get active deployments
const activeDeployments = deploymentModule.getActiveDeployments();

// Cancel a deployment
await deploymentModule.cancelDeployment(deploymentId);
```

### Database Integration

The module automatically logs deployment events and results to a SQL database:

```sql
-- Deployments table
CREATE TABLE deployments (
  id VARCHAR(255) PRIMARY KEY,
  pr_number INTEGER NOT NULL,
  branch VARCHAR(255) NOT NULL,
  repository VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  wsl2_instance_id VARCHAR(255),
  claude_code_version VARCHAR(50),
  deployment_time TIMESTAMP,
  completion_time TIMESTAMP,
  validation_results JSON,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table
CREATE TABLE deployment_events (
  id SERIAL PRIMARY KEY,
  deployment_id VARCHAR(255) NOT NULL,
  pr_number INTEGER NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  data JSON,
  error_message TEXT
);
```

## 🔒 Security

### Webhook Security

- HMAC signature verification for webhook authenticity
- Configurable webhook secrets
- Event deduplication to prevent replay attacks

### Environment Isolation

- Isolated WSL2 instances per PR
- Resource limits and network isolation
- Automatic cleanup after deployment

## 🛠️ Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
npm run lint:fix
```

## 📋 API Reference

### Main Classes

- **`DeploymentOrchestrator`**: Main orchestration engine
- **`AgentAPIClient`**: HTTP client for AgentAPI communication
- **`WSL2Manager`**: WSL2 environment management
- **`WebhookHandler`**: GitHub webhook processing
- **`DatabaseManager`**: Database operations and logging

### Factory Functions

- **`createDeploymentModule(config)`**: Create a deployment module with custom config
- **`createDefaultDeploymentModule(overrides)`**: Create with default config + overrides
- **`createTestDeploymentModule(overrides)`**: Create for testing purposes

### Utility Functions

- **`validateConfig(config)`**: Validate deployment configuration
- **`mergeAndValidateConfig(base, overrides)`**: Merge and validate configs

## 🎯 Success Metrics

The module tracks several key metrics:

- **Deployment Success Rate**: >95% successful deployments
- **Deployment Speed**: <5 minutes average deployment time
- **Reliability**: Zero data loss during failures
- **Resource Efficiency**: Optimal WSL2 resource utilization

## 🔗 Integration Examples

### Linear Integration

```typescript
// Report deployment status to Linear
deploymentModule.on("deployment_completed", async (context) => {
  await linearClient.updateIssue(issueId, {
    status: "completed",
    comment: `Deployment successful for PR ${context.prInfo.number}`,
  });
});
```

### GitHub Integration

```typescript
// Update PR status
deploymentModule.on("deployment_completed", async (context) => {
  await githubClient.createStatus({
    owner: context.prInfo.owner,
    repo: context.prInfo.repository,
    sha: context.prInfo.headSha,
    state: "success",
    description: "Deployment validation passed",
  });
});
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:

- GitHub Issues: [Create an issue](https://github.com/VoltAgent/voltagent/issues)
- Documentation: [VoltAgent Docs](https://voltagent.dev/docs)
- Community: [Discord](https://discord.gg/voltagent)

---

Built with ❤️ by the VoltAgent team

