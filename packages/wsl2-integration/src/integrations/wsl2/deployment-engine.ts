import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import Docker from 'dockerode';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

// Configuration schemas
const WSL2ConfigSchema = z.object({
  distro: z.string().default('Ubuntu-22.04'),
  memory: z.string().default('8GB'),
  processors: z.number().default(4),
  swap: z.string().default('2GB'),
});

const DockerConfigSchema = z.object({
  baseImage: z.string().default('node:18-alpine'),
  networkMode: z.string().default('bridge'),
  volumes: z.array(z.string()).default(['/workspace:/app']),
});

const DeploymentConfigSchema = z.object({
  wsl2: WSL2ConfigSchema,
  docker: DockerConfigSchema,
  validation: z.object({
    timeout: z.number().default(1800),
    retries: z.number().default(3),
    parallelJobs: z.number().default(2),
  }),
});

export type DeploymentConfig = z.infer<typeof DeploymentConfigSchema>;

export interface DeploymentEnvironment {
  id: string;
  containerId?: string;
  status: 'creating' | 'running' | 'stopped' | 'error';
  createdAt: Date;
  metadata: {
    prNumber?: number;
    repoUrl?: string;
    branch?: string;
  };
}

export interface DeploymentResult {
  success: boolean;
  environmentId: string;
  logs: string[];
  errors: string[];
  metrics: {
    setupTime: number;
    buildTime: number;
    testTime: number;
    totalTime: number;
  };
}

export class WSL2DeploymentEngine extends EventEmitter {
  private docker: Docker;
  private environments: Map<string, DeploymentEnvironment> = new Map();
  private config: DeploymentConfig;

  constructor(config: DeploymentConfig) {
    super();
    this.config = DeploymentConfigSchema.parse(config);
    this.docker = new Docker();
  }

  /**
   * Check if WSL2 is available and properly configured
   */
  async checkWSL2Availability(): Promise<boolean> {
    try {
      const result = await this.executeWSLCommand('wsl --list --verbose');
      return result.includes(this.config.wsl2.distro);
    } catch (error) {
      this.emit('error', new Error(`WSL2 availability check failed: ${error}`));
      return false;
    }
  }

  /**
   * Create a new isolated deployment environment
   */
  async createEnvironment(metadata: DeploymentEnvironment['metadata']): Promise<string> {
    const environmentId = uuidv4();
    const environment: DeploymentEnvironment = {
      id: environmentId,
      status: 'creating',
      createdAt: new Date(),
      metadata,
    };

    this.environments.set(environmentId, environment);
    this.emit('environment:creating', environment);

    try {
      // Create Docker container in WSL2
      const container = await this.createDockerContainer(environmentId);
      environment.containerId = container.id;
      environment.status = 'running';

      this.emit('environment:created', environment);
      return environmentId;
    } catch (error) {
      environment.status = 'error';
      this.emit('environment:error', environment, error);
      throw error;
    }
  }

  /**
   * Deploy a PR to the specified environment
   */
  async deployPR(
    environmentId: string,
    prNumber: number,
    repoUrl: string,
    branch: string
  ): Promise<DeploymentResult> {
    const startTime = Date.now();
    const environment = this.environments.get(environmentId);
    
    if (!environment) {
      throw new Error(`Environment ${environmentId} not found`);
    }

    const result: DeploymentResult = {
      success: false,
      environmentId,
      logs: [],
      errors: [],
      metrics: {
        setupTime: 0,
        buildTime: 0,
        testTime: 0,
        totalTime: 0,
      },
    };

    try {
      this.emit('deployment:started', { environmentId, prNumber, repoUrl, branch });

      // Step 1: Setup environment
      const setupStart = Date.now();
      await this.setupEnvironment(environmentId, repoUrl, branch);
      result.metrics.setupTime = Date.now() - setupStart;

      // Step 2: Install dependencies and build
      const buildStart = Date.now();
      await this.buildProject(environmentId);
      result.metrics.buildTime = Date.now() - buildStart;

      // Step 3: Run tests and validation
      const testStart = Date.now();
      await this.runValidation(environmentId);
      result.metrics.testTime = Date.now() - testStart;

      result.success = true;
      this.emit('deployment:completed', result);
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      this.emit('deployment:failed', result, error);
    } finally {
      result.metrics.totalTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Clean up and destroy an environment
   */
  async destroyEnvironment(environmentId: string): Promise<void> {
    const environment = this.environments.get(environmentId);
    if (!environment) {
      return;
    }

    try {
      if (environment.containerId) {
        const container = this.docker.getContainer(environment.containerId);
        await container.stop();
        await container.remove();
      }

      this.environments.delete(environmentId);
      this.emit('environment:destroyed', environment);
    } catch (error) {
      this.emit('error', new Error(`Failed to destroy environment ${environmentId}: ${error}`));
    }
  }

  /**
   * Get resource usage for all environments
   */
  async getResourceUsage(): Promise<Record<string, any>> {
    const usage: Record<string, any> = {};

    for (const [id, env] of this.environments) {
      if (env.containerId) {
        try {
          const container = this.docker.getContainer(env.containerId);
          const stats = await container.stats({ stream: false });
          usage[id] = {
            cpu: this.calculateCPUUsage(stats),
            memory: this.calculateMemoryUsage(stats),
            network: stats.networks,
          };
        } catch (error) {
          usage[id] = { error: error instanceof Error ? error.message : String(error) };
        }
      }
    }

    return usage;
  }

  /**
   * Execute a command in WSL2
   */
  private async executeWSLCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('wsl', ['-d', this.config.wsl2.distro, '--', 'bash', '-c', command]);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`WSL command failed with code ${code}: ${stderr}`));
        }
      });
    });
  }

  /**
   * Create a Docker container for the deployment environment
   */
  private async createDockerContainer(environmentId: string): Promise<Docker.Container> {
    const containerConfig = {
      Image: this.config.docker.baseImage,
      name: `voltagent-deploy-${environmentId}`,
      Env: [
        `ENVIRONMENT_ID=${environmentId}`,
        'NODE_ENV=development',
      ],
      HostConfig: {
        NetworkMode: this.config.docker.networkMode,
        Binds: this.config.docker.volumes,
        Memory: this.parseMemoryString(this.config.wsl2.memory),
        CpuCount: this.config.wsl2.processors,
      },
      WorkingDir: '/app',
    };

    const container = await this.docker.createContainer(containerConfig);
    await container.start();
    return container;
  }

  /**
   * Setup the deployment environment with repository code
   */
  private async setupEnvironment(environmentId: string, repoUrl: string, branch: string): Promise<void> {
    const commands = [
      `cd /app`,
      `git clone ${repoUrl} .`,
      `git checkout ${branch}`,
      `git pull origin ${branch}`,
    ];

    for (const command of commands) {
      await this.executeInContainer(environmentId, command);
    }
  }

  /**
   * Build the project in the deployment environment
   */
  private async buildProject(environmentId: string): Promise<void> {
    const commands = [
      'cd /app',
      'npm ci --production=false',
      'npm run build',
    ];

    for (const command of commands) {
      await this.executeInContainer(environmentId, command);
    }
  }

  /**
   * Run validation tests in the deployment environment
   */
  private async runValidation(environmentId: string): Promise<void> {
    const commands = [
      'cd /app',
      'npm test',
      'npm run lint',
    ];

    for (const command of commands) {
      await this.executeInContainer(environmentId, command);
    }
  }

  /**
   * Execute a command inside a container
   */
  private async executeInContainer(environmentId: string, command: string): Promise<string> {
    const environment = this.environments.get(environmentId);
    if (!environment?.containerId) {
      throw new Error(`Container not found for environment ${environmentId}`);
    }

    const container = this.docker.getContainer(environment.containerId);
    const exec = await container.exec({
      Cmd: ['bash', '-c', command],
      AttachStdout: true,
      AttachStderr: true,
    });

    const stream = await exec.start({ hijack: true, stdin: false });
    
    return new Promise((resolve, reject) => {
      let output = '';
      
      stream.on('data', (chunk) => {
        output += chunk.toString();
      });

      stream.on('end', () => {
        resolve(output);
      });

      stream.on('error', reject);
    });
  }

  /**
   * Parse memory string (e.g., "8GB") to bytes
   */
  private parseMemoryString(memoryStr: string): number {
    const match = memoryStr.match(/^(\d+)(GB|MB|KB)$/i);
    if (!match) {
      throw new Error(`Invalid memory format: ${memoryStr}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2].toUpperCase();

    switch (unit) {
      case 'GB':
        return value * 1024 * 1024 * 1024;
      case 'MB':
        return value * 1024 * 1024;
      case 'KB':
        return value * 1024;
      default:
        throw new Error(`Unsupported memory unit: ${unit}`);
    }
  }

  /**
   * Calculate CPU usage percentage from Docker stats
   */
  private calculateCPUUsage(stats: any): number {
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
    const cpuCount = stats.cpu_stats.online_cpus || 1;
    
    return (cpuDelta / systemDelta) * cpuCount * 100;
  }

  /**
   * Calculate memory usage from Docker stats
   */
  private calculateMemoryUsage(stats: any): { used: number; limit: number; percentage: number } {
    const used = stats.memory_stats.usage;
    const limit = stats.memory_stats.limit;
    const percentage = (used / limit) * 100;

    return { used, limit, percentage };
  }
}

export default WSL2DeploymentEngine;

