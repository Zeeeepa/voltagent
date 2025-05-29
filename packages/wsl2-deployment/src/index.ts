// Main WSL2 Deployment Engine
export { WSL2DeploymentEngine } from './integrations/wsl2/deployment-engine';

// Individual components
export { EnvironmentSetup } from './integrations/wsl2/environment-setup';
export { BranchManager } from './integrations/wsl2/branch-manager';
export { ValidationRunner } from './integrations/wsl2/validation-runner';
export { DeploymentMonitor } from './integrations/wsl2/deployment-monitor';

// Types and interfaces
export * from './types';

// Default configuration
export const defaultWSL2Config = {
  instancePool: {
    minInstances: 2,
    maxInstances: 10,
    instanceTimeout: 3600000 // 1 hour
  },
  deployment: {
    timeout: 1800000, // 30 minutes
    retries: 3,
    parallelDeployments: 5
  },
  environment: {
    nodeVersion: '18.x',
    pythonVersion: '3.9',
    dockerEnabled: true
  },
  monitoring: {
    healthCheckInterval: 30000, // 30 seconds
    resourceCheckInterval: 60000, // 1 minute
    alertThresholds: {
      cpu: 80,
      memory: 85,
      disk: 90
    }
  },
  ssh: {
    host: 'localhost',
    port: 22,
    user: 'deploy',
    keyPath: '/home/deploy/.ssh/id_rsa'
  }
};

// Utility functions
export const createWSL2DeploymentEngine = (config?: Partial<typeof defaultWSL2Config>) => {
  const finalConfig = { ...defaultWSL2Config, ...config };
  return new WSL2DeploymentEngine(finalConfig);
};

// Version
export const version = '0.1.0';

