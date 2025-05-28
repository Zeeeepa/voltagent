import { WSL2Manager } from './wsl2-manager.js';
import { DockerManager } from './docker-manager.js';
import { DeploymentInfo, ClaudeCodeConfig } from '../types/index.js';

export class DeploymentOrchestrator {
  private wsl2Manager: WSL2Manager;
  private dockerManager: DockerManager;
  private config: ClaudeCodeConfig['deployment'];

  constructor(config: ClaudeCodeConfig['deployment']) {
    this.config = config;
    this.wsl2Manager = new WSL2Manager(config);
    this.dockerManager = new DockerManager(config);
  }

  async deployPR(
    prUrl: string,
    branchName: string,
    options: { projectId?: string; strategy?: 'wsl2' | 'docker' | 'local' } = {}
  ): Promise<DeploymentInfo> {
    const strategy = options.strategy || this.config.strategy;

    switch (strategy) {
      case 'wsl2':
        return this.wsl2Manager.deployPR(prUrl, branchName, options);
      
      case 'docker':
        return this.dockerManager.deployPR(prUrl, branchName, options);
      
      case 'local':
        return this.deployLocal(prUrl, branchName, options);
      
      default:
        throw new Error(`Unsupported deployment strategy: ${strategy}`);
    }
  }

  async healthCheck(): Promise<{
    wsl2: boolean;
    docker: boolean;
    overall: boolean;
  }> {
    const wsl2Health = await this.wsl2Manager.healthCheck();
    const dockerHealth = await this.dockerManager.healthCheck();

    return {
      wsl2: wsl2Health,
      docker: dockerHealth,
      overall: wsl2Health || dockerHealth,
    };
  }

  private async deployLocal(
    prUrl: string,
    branchName: string,
    options: { projectId?: string } = {}
  ): Promise<DeploymentInfo> {
    // Local deployment implementation
    // This would clone to a local directory
    const projectId = options.projectId || `pr-${Date.now()}`;
    
    return {
      instanceName: 'local',
      deploymentPath: `/tmp/voltagent-${projectId}`,
      status: 'deployed',
      logs: ['Local deployment not fully implemented'],
      metadata: {
        prUrl,
        branchName,
        projectId,
        deployedAt: new Date().toISOString(),
      },
    };
  }

  updateConfig(newConfig: ClaudeCodeConfig['deployment']): void {
    this.config = { ...this.config, ...newConfig };
    this.wsl2Manager.updateConfig(newConfig);
    this.dockerManager.updateConfig(newConfig);
  }
}

