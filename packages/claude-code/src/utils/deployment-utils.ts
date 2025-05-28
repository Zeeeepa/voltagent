import { DeploymentInfo } from '../types/index.js';

export class DeploymentUtils {
  static generateDeploymentId(): string {
    return `deploy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  static parseGitUrl(url: string): {
    protocol: string;
    host: string;
    owner: string;
    repo: string;
  } | null {
    const patterns = [
      /^https?:\/\/([^\/]+)\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/.*)?$/,
      /^git@([^:]+):([^\/]+)\/([^\/]+?)(?:\.git)?$/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          protocol: url.startsWith('git@') ? 'ssh' : 'https',
          host: match[1],
          owner: match[2],
          repo: match[3],
        };
      }
    }

    return null;
  }

  static validateBranchName(branchName: string): boolean {
    // Basic branch name validation
    const invalidChars = /[~^:?*[\]\\]/;
    const invalidPatterns = /^\.|\.$|\/\.|\.\.|\/{2,}|@{/;
    
    return !invalidChars.test(branchName) && !invalidPatterns.test(branchName);
  }

  static estimateDeploymentTime(repoSize: number, complexity: 'low' | 'medium' | 'high'): number {
    const baseTime = 30000; // 30 seconds base
    const sizeMultiplier = Math.log10(repoSize / 1000) || 1;
    const complexityMultiplier = { low: 1, medium: 1.5, high: 2.5 }[complexity];
    
    return baseTime * sizeMultiplier * complexityMultiplier;
  }

  static getDeploymentStatus(deployment: DeploymentInfo): {
    isActive: boolean;
    isHealthy: boolean;
    age: number;
  } {
    const now = Date.now();
    const deployedAt = new Date(deployment.metadata.deployedAt).getTime();
    const age = now - deployedAt;
    
    return {
      isActive: deployment.status === 'deployed',
      isHealthy: deployment.status === 'deployed' && deployment.logs.length === 0,
      age,
    };
  }

  static formatDeploymentLogs(logs: string[]): string {
    return logs
      .map((log, index) => `[${index + 1}] ${log}`)
      .join('\n');
  }

  static sanitizeProjectId(projectId: string): string {
    return projectId
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  static generateDeploymentSummary(deployment: DeploymentInfo): string {
    const status = this.getDeploymentStatus(deployment);
    const ageInMinutes = Math.floor(status.age / 60000);
    
    return `
Deployment Summary:
- Instance: ${deployment.instanceName}
- Status: ${deployment.status}
- Path: ${deployment.deploymentPath}
- Age: ${ageInMinutes} minutes
- Healthy: ${status.isHealthy ? 'Yes' : 'No'}
- Logs: ${deployment.logs.length} entries
`;
  }
}

