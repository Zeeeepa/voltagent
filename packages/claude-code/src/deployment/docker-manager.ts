import { DeploymentInfo, ClaudeCodeConfig } from '../types/index.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class DockerManager {
  private config: ClaudeCodeConfig['deployment'];

  constructor(config: ClaudeCodeConfig['deployment']) {
    this.config = config;
  }

  async deployPR(
    prUrl: string,
    branchName: string,
    options: { projectId?: string } = {}
  ): Promise<DeploymentInfo> {
    const projectId = options.projectId || `pr-${Date.now()}`;
    const containerName = `${this.config.docker.namespace}-${projectId}`;
    
    const deploymentInfo: DeploymentInfo = {
      instanceName: containerName,
      deploymentPath: `/workspace/${projectId}`,
      status: 'deploying',
      logs: [],
      metadata: {
        prUrl,
        branchName,
        projectId,
        deployedAt: new Date().toISOString(),
        containerName,
      },
    };

    try {
      // Create and start container
      await this.createContainer(containerName, projectId);
      
      // Clone repository
      await this.executeInContainer(
        containerName,
        `git clone ${prUrl} /workspace/${projectId}`
      );

      // Checkout branch
      await this.executeInContainer(
        containerName,
        `cd /workspace/${projectId} && git checkout ${branchName}`
      );

      // Install dependencies
      await this.installDependencies(containerName, `/workspace/${projectId}`);

      deploymentInfo.status = 'deployed';
      return deploymentInfo;
    } catch (error) {
      deploymentInfo.status = 'failed';
      deploymentInfo.logs.push(`Deployment failed: ${error}`);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await execAsync('docker --version');
      return true;
    } catch (error) {
      return false;
    }
  }

  private async createContainer(containerName: string, projectId: string): Promise<void> {
    const command = `docker run -d --name ${containerName} -v ${projectId}:/workspace ubuntu:22.04 tail -f /dev/null`;
    await execAsync(command);
  }

  private async executeInContainer(containerName: string, command: string): Promise<void> {
    const dockerCommand = `docker exec ${containerName} bash -c "${command}"`;
    await execAsync(dockerCommand);
  }

  private async installDependencies(containerName: string, projectPath: string): Promise<void> {
    // Check for package.json
    try {
      await this.executeInContainer(containerName, `test -f ${projectPath}/package.json`);
      await this.executeInContainer(containerName, `cd ${projectPath} && npm install`);
    } catch (error) {
      // No package.json, try other dependency files
    }

    // Check for requirements.txt
    try {
      await this.executeInContainer(containerName, `test -f ${projectPath}/requirements.txt`);
      await this.executeInContainer(containerName, `cd ${projectPath} && pip install -r requirements.txt`);
    } catch (error) {
      // No requirements.txt
    }
  }

  updateConfig(newConfig: ClaudeCodeConfig['deployment']): void {
    this.config = { ...this.config, ...newConfig };
  }
}

