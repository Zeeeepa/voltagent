import { 
  WSL2Instance, 
  WSL2Configuration, 
  DeploymentInfo,
  ClaudeCodeConfig 
} from '../types/index.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

export class WSL2Manager {
  private config: ClaudeCodeConfig['deployment'];
  private instances: Map<string, WSL2Instance> = new Map();

  constructor(config: ClaudeCodeConfig['deployment']) {
    this.config = config;
  }

  async createInstance(
    projectId: string,
    configuration: Partial<WSL2Configuration> = {}
  ): Promise<WSL2Instance> {
    const instanceName = `voltagent-${projectId}-${uuidv4().slice(0, 8)}`;
    const fullConfig: WSL2Configuration = {
      ...this.config.wsl2,
      ...configuration,
    };

    const instance: WSL2Instance = {
      instanceName,
      projectId,
      status: 'creating',
      configuration: fullConfig,
      deployments: [],
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      resourceUsage: {
        memory: '0MB',
        cpu: 0,
        disk: '0MB',
      },
    };

    this.instances.set(instanceName, instance);

    try {
      // Create WSL2 instance
      await this.executeWSLCommand(`wsl --import ${instanceName} C:\\WSL\\${instanceName} C:\\WSL\\base-image.tar`);
      
      // Configure the instance
      await this.configureInstance(instance);
      
      instance.status = 'running';
      return instance;
    } catch (error) {
      instance.status = 'destroying';
      this.instances.delete(instanceName);
      throw error;
    }
  }

  async deployPR(
    prUrl: string,
    branchName: string,
    options: { projectId?: string; instanceName?: string } = {}
  ): Promise<DeploymentInfo> {
    const projectId = options.projectId || uuidv4();
    let instance: WSL2Instance;

    if (options.instanceName && this.instances.has(options.instanceName)) {
      instance = this.instances.get(options.instanceName)!;
    } else {
      instance = await this.createInstance(projectId);
    }

    const deploymentPath = `${this.config.wsl2.basePath}/${projectId}`;
    
    const deploymentInfo: DeploymentInfo = {
      instanceName: instance.instanceName,
      deploymentPath,
      status: 'deploying',
      logs: [],
      metadata: {
        prUrl,
        branchName,
        projectId,
        deployedAt: new Date().toISOString(),
      },
    };

    try {
      // Clone the repository
      await this.executeInInstance(
        instance.instanceName,
        `git clone ${prUrl} ${deploymentPath}`
      );

      // Checkout the specific branch
      await this.executeInInstance(
        instance.instanceName,
        `cd ${deploymentPath} && git checkout ${branchName}`
      );

      // Install dependencies if package.json exists
      const hasPackageJson = await this.fileExists(
        instance.instanceName,
        `${deploymentPath}/package.json`
      );

      if (hasPackageJson) {
        await this.executeInInstance(
          instance.instanceName,
          `cd ${deploymentPath} && npm install`
        );
      }

      // Check for other dependency files
      const hasRequirementsTxt = await this.fileExists(
        instance.instanceName,
        `${deploymentPath}/requirements.txt`
      );

      if (hasRequirementsTxt) {
        await this.executeInInstance(
          instance.instanceName,
          `cd ${deploymentPath} && pip install -r requirements.txt`
        );
      }

      deploymentInfo.status = 'deployed';
      instance.deployments.push(deploymentInfo);
      instance.lastUsed = new Date().toISOString();

      return deploymentInfo;
    } catch (error) {
      deploymentInfo.status = 'failed';
      deploymentInfo.logs.push(`Deployment failed: ${error}`);
      throw error;
    }
  }

  async destroyInstance(instanceName: string): Promise<boolean> {
    const instance = this.instances.get(instanceName);
    if (!instance) {
      return false;
    }

    try {
      instance.status = 'destroying';
      
      // Stop and unregister the WSL instance
      await this.executeWSLCommand(`wsl --terminate ${instanceName}`);
      await this.executeWSLCommand(`wsl --unregister ${instanceName}`);
      
      // Clean up instance directory
      await this.executeWSLCommand(`rmdir /s /q C:\\WSL\\${instanceName}`);
      
      this.instances.delete(instanceName);
      return true;
    } catch (error) {
      console.error(`Failed to destroy instance ${instanceName}:`, error);
      return false;
    }
  }

  async listInstances(): Promise<WSL2Instance[]> {
    return Array.from(this.instances.values());
  }

  async getInstance(instanceName: string): Promise<WSL2Instance | null> {
    return this.instances.get(instanceName) || null;
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Check if WSL is available
      await this.executeWSLCommand('wsl --list --quiet');
      return true;
    } catch (error) {
      return false;
    }
  }

  async getResourceUsage(instanceName: string): Promise<{
    memory: string;
    cpu: number;
    disk: string;
  }> {
    try {
      // Get memory usage
      const memoryResult = await this.executeInInstance(
        instanceName,
        "free -h | grep '^Mem:' | awk '{print $3}'"
      );

      // Get CPU usage
      const cpuResult = await this.executeInInstance(
        instanceName,
        "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1"
      );

      // Get disk usage
      const diskResult = await this.executeInInstance(
        instanceName,
        "df -h / | tail -1 | awk '{print $3}'"
      );

      return {
        memory: memoryResult.stdout.trim(),
        cpu: parseFloat(cpuResult.stdout.trim()) || 0,
        disk: diskResult.stdout.trim(),
      };
    } catch (error) {
      return {
        memory: '0MB',
        cpu: 0,
        disk: '0MB',
      };
    }
  }

  private async configureInstance(instance: WSL2Instance): Promise<void> {
    const { instanceName, configuration } = instance;

    // Set memory and CPU limits
    const wslConfig = `
[wsl2]
memory=${configuration.memory}
processors=${configuration.processors}
swap=${configuration.swap}
`;

    // Write WSL configuration
    await this.executeWSLCommand(
      `echo "${wslConfig}" > C:\\Users\\%USERNAME%\\.wslconfig`
    );

    // Install custom packages
    if (configuration.customPackages.length > 0) {
      const packages = configuration.customPackages.join(' ');
      await this.executeInInstance(
        instanceName,
        `apt-get update && apt-get install -y ${packages}`
      );
    }

    // Set environment variables
    if (Object.keys(configuration.environmentVariables).length > 0) {
      const envVars = Object.entries(configuration.environmentVariables)
        .map(([key, value]) => `export ${key}="${value}"`)
        .join('\n');
      
      await this.executeInInstance(
        instanceName,
        `echo "${envVars}" >> ~/.bashrc`
      );
    }

    // Install common development tools
    await this.executeInInstance(
      instanceName,
      'apt-get install -y git curl wget build-essential python3 python3-pip nodejs npm'
    );
  }

  private async executeWSLCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    try {
      const result = await execAsync(command);
      return result;
    } catch (error) {
      console.error('WSL command failed:', command, error);
      throw error;
    }
  }

  private async executeInInstance(
    instanceName: string,
    command: string
  ): Promise<{ stdout: string; stderr: string }> {
    const wslCommand = `wsl -d ${instanceName} -- bash -c "${command}"`;
    return this.executeWSLCommand(wslCommand);
  }

  private async fileExists(instanceName: string, filePath: string): Promise<boolean> {
    try {
      await this.executeInInstance(instanceName, `test -f ${filePath}`);
      return true;
    } catch (error) {
      return false;
    }
  }

  updateConfig(newConfig: ClaudeCodeConfig['deployment']): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Cleanup old instances
  async cleanupOldInstances(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [instanceName, instance] of this.instances.entries()) {
      const lastUsed = new Date(instance.lastUsed).getTime();
      const age = now - lastUsed;

      if (age > maxAge && instance.status !== 'running') {
        const destroyed = await this.destroyInstance(instanceName);
        if (destroyed) {
          cleanedCount++;
        }
      }
    }

    return cleanedCount;
  }

  // Get instance metrics
  async getInstanceMetrics(): Promise<{
    total: number;
    running: number;
    stopped: number;
    creating: number;
    destroying: number;
  }> {
    const instances = Array.from(this.instances.values());
    
    return {
      total: instances.length,
      running: instances.filter(i => i.status === 'running').length,
      stopped: instances.filter(i => i.status === 'stopped').length,
      creating: instances.filter(i => i.status === 'creating').length,
      destroying: instances.filter(i => i.status === 'destroying').length,
    };
  }
}

