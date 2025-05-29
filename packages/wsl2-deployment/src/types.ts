export interface WSL2Config {
  instancePool: {
    minInstances: number;
    maxInstances: number;
    instanceTimeout: number;
  };
  deployment: {
    timeout: number;
    retries: number;
    parallelDeployments: number;
  };
  environment: {
    nodeVersion: string;
    pythonVersion: string;
    dockerEnabled: boolean;
  };
  monitoring: {
    healthCheckInterval: number;
    resourceCheckInterval: number;
    alertThresholds: {
      cpu: number;
      memory: number;
      disk: number;
    };
  };
  ssh: {
    host: string;
    port: number;
    user: string;
    keyPath: string;
  };
}

export interface WSL2Instance {
  id: string;
  name: string;
  status: 'creating' | 'running' | 'stopped' | 'destroying' | 'error';
  ipAddress?: string;
  sshPort: number;
  createdAt: Date;
  lastUsed?: Date;
  resourceUsage?: ResourceUsage;
  deployments: string[];
}

export interface ResourceUsage {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    bytesIn: number;
    bytesOut: number;
  };
}

export interface DeploymentRequest {
  id: string;
  repository: {
    url: string;
    branch: string;
    prNumber?: number;
  };
  environment: Record<string, string>;
  validationSteps: ValidationStep[];
  priority: 'low' | 'normal' | 'high' | 'critical';
  timeout?: number;
}

export interface ValidationStep {
  name: string;
  command: string;
  workingDirectory?: string;
  timeout?: number;
  retries?: number;
  continueOnFailure?: boolean;
}

export interface DeploymentResult {
  id: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'timeout' | 'cancelled';
  instanceId: string;
  startTime: Date;
  endTime?: Date;
  logs: DeploymentLog[];
  validationResults: ValidationResult[];
  error?: string;
}

export interface DeploymentLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  source: 'deployment' | 'validation' | 'monitoring';
}

export interface ValidationResult {
  stepName: string;
  status: 'success' | 'failed' | 'skipped';
  duration: number;
  output: string;
  error?: string;
}

export interface HealthCheck {
  instanceId: string;
  timestamp: Date;
  status: 'healthy' | 'unhealthy' | 'unknown';
  checks: {
    ssh: boolean;
    disk: boolean;
    memory: boolean;
    cpu: boolean;
    network: boolean;
  };
  resourceUsage: ResourceUsage;
}

export interface DeploymentEvent {
  type: 'deployment.started' | 'deployment.completed' | 'deployment.failed' | 
        'instance.created' | 'instance.destroyed' | 'validation.completed' |
        'health.check' | 'resource.alert';
  timestamp: Date;
  data: any;
}

export interface BranchInfo {
  repository: string;
  branch: string;
  commit: string;
  author: string;
  message: string;
  timestamp: Date;
}

export interface EnvironmentSetupResult {
  success: boolean;
  duration: number;
  steps: {
    name: string;
    success: boolean;
    duration: number;
    output: string;
    error?: string;
  }[];
}

