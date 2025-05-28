// Deployment-specific types

export interface DeploymentStrategy {
  name: 'wsl2' | 'docker' | 'local';
  description: string;
  requirements: string[];
  capabilities: string[];
}

export interface DeploymentOptions {
  projectId?: string;
  strategy?: 'wsl2' | 'docker' | 'local';
  timeout?: number;
  cleanup?: boolean;
  environment?: Record<string, string>;
}

export interface DeploymentMetrics {
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  averageDeploymentTime: number;
  activeDeployments: number;
}

export interface DeploymentEvent {
  type: 'deployment_started' | 'deployment_progress' | 'deployment_completed' | 'deployment_failed';
  deploymentId: string;
  timestamp: string;
  data: any;
}

