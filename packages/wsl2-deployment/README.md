# @voltagent/wsl2-deployment

WSL2 deployment engine for automated PR branch cloning, environment setup, validation testing, and deployment monitoring on isolated WSL2 instances.

## Features

- **WSL2 Instance Management**: Create, manage, and monitor isolated WSL2 instances
- **Instance Pool Management**: Maintain a pool of available instances with automatic scaling
- **Environment Setup**: Automated setup of Node.js, Python, Docker, and project dependencies
- **Branch Management**: Clone repositories, checkout branches, handle merge conflicts
- **Validation Runner**: Execute tests, linting, security scans, and performance checks
- **Deployment Monitoring**: Real-time monitoring of deployments and resource usage
- **Event-Driven Architecture**: Comprehensive event system for integration with orchestrators

## Installation

```bash
npm install @voltagent/wsl2-deployment
```

## Quick Start

```typescript
import { WSL2DeploymentEngine, defaultWSL2Config } from '@voltagent/wsl2-deployment';

// Create deployment engine with default configuration
const engine = new WSL2DeploymentEngine(defaultWSL2Config);

// Listen for events
engine.on('deployment.completed', (result) => {
  console.log('Deployment completed:', result);
});

// Deploy a repository
const deploymentId = await engine.deploy({
  id: 'my-deployment',
  repository: {
    url: 'https://github.com/myorg/myrepo.git',
    branch: 'feature/new-feature',
    prNumber: 123
  },
  environment: {
    NODE_ENV: 'test',
    API_URL: 'https://api.test.com'
  },
  validationSteps: [
    {
      name: 'Install dependencies',
      command: 'npm install'
    },
    {
      name: 'Run tests',
      command: 'npm test'
    },
    {
      name: 'Run linting',
      command: 'npm run lint'
    }
  ],
  priority: 'high'
});

// Check deployment status
const status = engine.getDeploymentStatus(deploymentId);
console.log('Deployment status:', status);
```

## Configuration

```typescript
import { WSL2Config } from '@voltagent/wsl2-deployment';

const config: WSL2Config = {
  instancePool: {
    minInstances: 2,        // Minimum instances to maintain
    maxInstances: 10,       // Maximum instances allowed
    instanceTimeout: 3600000 // Instance timeout in milliseconds
  },
  deployment: {
    timeout: 1800000,       // Deployment timeout (30 minutes)
    retries: 3,             // Number of retries for failed deployments
    parallelDeployments: 5  // Maximum parallel deployments
  },
  environment: {
    nodeVersion: '18.x',    // Node.js version to install
    pythonVersion: '3.9',   // Python version to install
    dockerEnabled: true     // Whether to install Docker
  },
  monitoring: {
    healthCheckInterval: 30000,    // Health check interval (30 seconds)
    resourceCheckInterval: 60000,  // Resource check interval (1 minute)
    alertThresholds: {
      cpu: 80,    // CPU usage alert threshold (%)
      memory: 85, // Memory usage alert threshold (%)
      disk: 90    // Disk usage alert threshold (%)
    }
  },
  ssh: {
    host: 'localhost',
    port: 22,
    user: 'deploy',
    keyPath: '/home/deploy/.ssh/id_rsa'
  }
};
```

## API Reference

### WSL2DeploymentEngine

The main deployment engine class.

#### Methods

- `deploy(request: DeploymentRequest): Promise<string>` - Deploy a repository
- `getDeploymentStatus(deploymentId: string): DeploymentResult | null` - Get deployment status
- `getInstances(): WSL2Instance[]` - Get all instances
- `getInstanceHealth(instanceId: string): Promise<HealthCheck | null>` - Get instance health
- `destroyInstance(instanceId: string): Promise<void>` - Destroy an instance
- `shutdown(): Promise<void>` - Shutdown the engine

#### Events

- `deployment.started` - Deployment has started
- `deployment.completed` - Deployment completed successfully
- `deployment.failed` - Deployment failed
- `instance.created` - New instance created
- `instance.destroyed` - Instance destroyed
- `health.check` - Health check completed
- `resource.alert` - Resource threshold exceeded

### EnvironmentSetup

Handles environment setup on WSL2 instances.

#### Methods

- `setupBaseEnvironment(instance: WSL2Instance): Promise<EnvironmentSetupResult>`
- `setupProjectEnvironment(instance: WSL2Instance, environment: Record<string, string>): Promise<EnvironmentSetupResult>`
- `validateEnvironment(instance: WSL2Instance): Promise<EnvironmentSetupResult>`

### BranchManager

Manages Git operations and branch handling.

#### Methods

- `cloneAndCheckout(instance: WSL2Instance, repositoryUrl: string, branch: string): Promise<BranchInfo>`
- `switchBranch(instance: WSL2Instance, repositoryName: string, branch: string): Promise<BranchInfo>`
- `handleMergeConflicts(instance: WSL2Instance, repositoryName: string, strategy: 'ours' | 'theirs' | 'manual'): Promise<void>`

### ValidationRunner

Executes validation steps including tests, linting, and security scans.

#### Methods

- `runValidation(instance: WSL2Instance, validationSteps: ValidationStep[]): Promise<ValidationResult[]>`
- `runTests(instance: WSL2Instance, repositoryName: string, testType: 'unit' | 'integration' | 'e2e' | 'all'): Promise<ValidationResult[]>`
- `runLinting(instance: WSL2Instance, repositoryName: string): Promise<ValidationResult[]>`
- `runSecurityScans(instance: WSL2Instance, repositoryName: string): Promise<ValidationResult[]>`

### DeploymentMonitor

Monitors deployments and instance health.

#### Methods

- `checkInstanceHealth(instance: WSL2Instance): Promise<HealthCheck>`
- `getResourceUsage(instance: WSL2Instance): Promise<ResourceUsage>`
- `startInstanceMonitoring(instance: WSL2Instance): void`
- `stopInstanceMonitoring(instanceId: string): void`

## Environment Variables

```bash
# WSL2 Configuration
WSL2_HOST=localhost
WSL2_SSH_PORT=22
WSL2_SSH_USER=deploy
WSL2_SSH_KEY_PATH=/home/deploy/.ssh/id_rsa
WSL2_INSTANCE_POOL_SIZE=5
WSL2_DEPLOYMENT_TIMEOUT=1800000

# Monitoring Configuration
WSL2_HEALTH_CHECK_INTERVAL=30000
WSL2_RESOURCE_CHECK_INTERVAL=60000
WSL2_CPU_THRESHOLD=80
WSL2_MEMORY_THRESHOLD=85
WSL2_DISK_THRESHOLD=90
```

## Prerequisites

- Windows 10/11 with WSL2 enabled
- Ubuntu 22.04 or compatible Linux distribution
- SSH server configured on WSL2 instances
- Git installed on WSL2 instances
- Node.js and npm/pnpm/yarn for JavaScript projects
- Python and pip for Python projects

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- deployment-engine.test.ts
```

## Examples

### Basic Deployment

```typescript
import { createWSL2DeploymentEngine } from '@voltagent/wsl2-deployment';

const engine = createWSL2DeploymentEngine({
  instancePool: {
    minInstances: 1,
    maxInstances: 3
  }
});

const deploymentId = await engine.deploy({
  id: 'basic-deployment',
  repository: {
    url: 'https://github.com/example/app.git',
    branch: 'main'
  },
  environment: {
    NODE_ENV: 'production'
  },
  validationSteps: [
    { name: 'Install', command: 'npm install' },
    { name: 'Build', command: 'npm run build' },
    { name: 'Test', command: 'npm test' }
  ],
  priority: 'normal'
});
```

### Advanced Deployment with Custom Validation

```typescript
const deploymentId = await engine.deploy({
  id: 'advanced-deployment',
  repository: {
    url: 'https://github.com/example/complex-app.git',
    branch: 'feature/new-api',
    prNumber: 456
  },
  environment: {
    NODE_ENV: 'test',
    DATABASE_URL: 'postgresql://test:test@localhost:5432/testdb',
    REDIS_URL: 'redis://localhost:6379'
  },
  validationSteps: [
    {
      name: 'Install dependencies',
      command: 'npm ci',
      timeout: 300000,
      retries: 2
    },
    {
      name: 'Database migration',
      command: 'npm run db:migrate',
      timeout: 120000,
      continueOnFailure: false
    },
    {
      name: 'Unit tests',
      command: 'npm run test:unit',
      timeout: 600000,
      retries: 1
    },
    {
      name: 'Integration tests',
      command: 'npm run test:integration',
      timeout: 900000,
      retries: 1,
      continueOnFailure: true
    },
    {
      name: 'Security scan',
      command: 'npm audit --audit-level=moderate',
      timeout: 180000,
      continueOnFailure: true
    },
    {
      name: 'Performance tests',
      command: 'npm run test:performance',
      timeout: 1200000,
      continueOnFailure: true
    }
  ],
  priority: 'high',
  timeout: 2400000 // 40 minutes
});
```

### Event Handling

```typescript
// Listen for all deployment events
engine.on('deployment.started', ({ deployment, instance }) => {
  console.log(`Deployment ${deployment.id} started on instance ${instance.id}`);
});

engine.on('deployment.completed', ({ deployment, success }) => {
  if (success) {
    console.log(`Deployment ${deployment.id} completed successfully`);
  } else {
    console.log(`Deployment ${deployment.id} completed with failures`);
  }
});

engine.on('deployment.failed', ({ deployment, error }) => {
  console.error(`Deployment ${deployment.id} failed: ${error}`);
});

// Monitor instance health
engine.on('health.check', (healthCheck) => {
  if (healthCheck.status === 'unhealthy') {
    console.warn(`Instance ${healthCheck.instanceId} is unhealthy`);
  }
});

// Handle resource alerts
engine.on('resource.alert', ({ instanceId, usage }) => {
  console.warn(`Resource alert for instance ${instanceId}:`, usage);
});
```

## Integration with Orchestrator

The WSL2 deployment engine is designed to integrate with the Task Master orchestrator:

```typescript
// In your orchestrator
import { WSL2DeploymentEngine } from '@voltagent/wsl2-deployment';

class TaskMasterOrchestrator {
  private wsl2Engine: WSL2DeploymentEngine;

  constructor() {
    this.wsl2Engine = new WSL2DeploymentEngine(config);
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.wsl2Engine.on('deployment.completed', (result) => {
      // Update Linear issue status
      // Send notifications
      // Trigger next phase
    });
  }

  async handlePRDeployment(prData: any) {
    const deploymentId = await this.wsl2Engine.deploy({
      id: `pr-${prData.number}`,
      repository: {
        url: prData.repository.clone_url,
        branch: prData.head.ref,
        prNumber: prData.number
      },
      environment: this.getEnvironmentForPR(prData),
      validationSteps: this.getValidationSteps(prData),
      priority: this.getPriority(prData)
    });

    return deploymentId;
  }
}
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## License

MIT License - see LICENSE file for details.

