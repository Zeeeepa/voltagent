import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { z } from 'zod';

// Environment configuration schemas
const EnvironmentVariableSchema = z.object({
  name: z.string(),
  value: z.string(),
  secure: z.boolean().default(false),
});

const ServiceConfigSchema = z.object({
  name: z.string(),
  command: z.string(),
  port: z.number().optional(),
  healthCheck: z.string().optional(),
  dependencies: z.array(z.string()).default([]),
});

const EnvironmentSetupConfigSchema = z.object({
  nodeVersion: z.string().default('18'),
  packageManager: z.enum(['npm', 'yarn', 'pnpm']).default('npm'),
  environmentVariables: z.array(EnvironmentVariableSchema).default([]),
  services: z.array(ServiceConfigSchema).default([]),
  dependencies: z.array(z.string()).default([]),
  preInstallCommands: z.array(z.string()).default([]),
  postInstallCommands: z.array(z.string()).default([]),
});

export type EnvironmentSetupConfig = z.infer<typeof EnvironmentSetupConfigSchema>;
export type EnvironmentVariable = z.infer<typeof EnvironmentVariableSchema>;
export type ServiceConfig = z.infer<typeof ServiceConfigSchema>;

export interface SetupResult {
  success: boolean;
  environmentId: string;
  installedDependencies: string[];
  runningServices: string[];
  environmentVariables: string[];
  logs: string[];
  errors: string[];
  setupTime: number;
}

export interface HealthCheckResult {
  service: string;
  healthy: boolean;
  responseTime?: number;
  error?: string;
}

export class WSL2EnvironmentSetup extends EventEmitter {
  private config: EnvironmentSetupConfig;
  private runningServices: Map<string, any> = new Map();

  constructor(config: EnvironmentSetupConfig) {
    super();
    this.config = EnvironmentSetupConfigSchema.parse(config);
  }

  /**
   * Setup a complete development environment
   */
  async setupEnvironment(environmentId: string, workspaceDir: string): Promise<SetupResult> {
    const startTime = Date.now();
    const result: SetupResult = {
      success: false,
      environmentId,
      installedDependencies: [],
      runningServices: [],
      environmentVariables: [],
      logs: [],
      errors: [],
      setupTime: 0,
    };

    try {
      this.emit('setup:started', { environmentId, workspaceDir });

      // Step 1: Setup Node.js environment
      await this.setupNodeEnvironment(environmentId, workspaceDir, result);

      // Step 2: Configure environment variables
      await this.configureEnvironmentVariables(environmentId, result);

      // Step 3: Install system dependencies
      await this.installSystemDependencies(environmentId, result);

      // Step 4: Run pre-install commands
      await this.runPreInstallCommands(environmentId, workspaceDir, result);

      // Step 5: Install project dependencies
      await this.installProjectDependencies(environmentId, workspaceDir, result);

      // Step 6: Run post-install commands
      await this.runPostInstallCommands(environmentId, workspaceDir, result);

      // Step 7: Start services
      await this.startServices(environmentId, workspaceDir, result);

      // Step 8: Perform health checks
      await this.performHealthChecks(environmentId, result);

      result.success = true;
      this.emit('setup:completed', result);
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      this.emit('setup:failed', result, error);
    } finally {
      result.setupTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Setup Node.js environment with specified version
   */
  private async setupNodeEnvironment(
    environmentId: string,
    workspaceDir: string,
    result: SetupResult
  ): Promise<void> {
    this.emit('setup:node:started', { environmentId, version: this.config.nodeVersion });

    const commands = [
      // Install Node Version Manager if not present
      'curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash',
      'source ~/.bashrc',
      // Install and use specified Node.js version
      `nvm install ${this.config.nodeVersion}`,
      `nvm use ${this.config.nodeVersion}`,
      `nvm alias default ${this.config.nodeVersion}`,
      // Verify installation
      'node --version',
      'npm --version',
    ];

    for (const command of commands) {
      const output = await this.executeCommand(environmentId, command, workspaceDir);
      result.logs.push(`Node setup: ${command} -> ${output}`);
    }

    this.emit('setup:node:completed', { environmentId });
  }

  /**
   * Configure environment variables
   */
  private async configureEnvironmentVariables(
    environmentId: string,
    result: SetupResult
  ): Promise<void> {
    this.emit('setup:env:started', { environmentId, count: this.config.environmentVariables.length });

    for (const envVar of this.config.environmentVariables) {
      try {
        if (envVar.secure) {
          // For secure variables, we don't log the value
          await this.setEnvironmentVariable(environmentId, envVar.name, envVar.value);
          result.environmentVariables.push(envVar.name);
          result.logs.push(`Set secure environment variable: ${envVar.name}`);
        } else {
          await this.setEnvironmentVariable(environmentId, envVar.name, envVar.value);
          result.environmentVariables.push(envVar.name);
          result.logs.push(`Set environment variable: ${envVar.name}=${envVar.value}`);
        }
      } catch (error) {
        result.errors.push(`Failed to set environment variable ${envVar.name}: ${error}`);
      }
    }

    this.emit('setup:env:completed', { environmentId, configured: result.environmentVariables.length });
  }

  /**
   * Install system dependencies
   */
  private async installSystemDependencies(
    environmentId: string,
    result: SetupResult
  ): Promise<void> {
    if (this.config.dependencies.length === 0) {
      return;
    }

    this.emit('setup:dependencies:started', { environmentId, dependencies: this.config.dependencies });

    const commands = [
      'apt-get update',
      `apt-get install -y ${this.config.dependencies.join(' ')}`,
    ];

    for (const command of commands) {
      const output = await this.executeCommand(environmentId, command);
      result.logs.push(`System dependencies: ${command} -> ${output}`);
    }

    result.installedDependencies.push(...this.config.dependencies);
    this.emit('setup:dependencies:completed', { environmentId, installed: this.config.dependencies });
  }

  /**
   * Run pre-install commands
   */
  private async runPreInstallCommands(
    environmentId: string,
    workspaceDir: string,
    result: SetupResult
  ): Promise<void> {
    if (this.config.preInstallCommands.length === 0) {
      return;
    }

    this.emit('setup:preinstall:started', { environmentId, commands: this.config.preInstallCommands });

    for (const command of this.config.preInstallCommands) {
      const output = await this.executeCommand(environmentId, command, workspaceDir);
      result.logs.push(`Pre-install: ${command} -> ${output}`);
    }

    this.emit('setup:preinstall:completed', { environmentId });
  }

  /**
   * Install project dependencies using configured package manager
   */
  private async installProjectDependencies(
    environmentId: string,
    workspaceDir: string,
    result: SetupResult
  ): Promise<void> {
    this.emit('setup:install:started', { environmentId, packageManager: this.config.packageManager });

    let installCommand: string;
    switch (this.config.packageManager) {
      case 'yarn':
        installCommand = 'yarn install';
        break;
      case 'pnpm':
        installCommand = 'pnpm install';
        break;
      default:
        installCommand = 'npm ci';
        break;
    }

    const output = await this.executeCommand(environmentId, installCommand, workspaceDir);
    result.logs.push(`Install dependencies: ${installCommand} -> ${output}`);

    this.emit('setup:install:completed', { environmentId });
  }

  /**
   * Run post-install commands
   */
  private async runPostInstallCommands(
    environmentId: string,
    workspaceDir: string,
    result: SetupResult
  ): Promise<void> {
    if (this.config.postInstallCommands.length === 0) {
      return;
    }

    this.emit('setup:postinstall:started', { environmentId, commands: this.config.postInstallCommands });

    for (const command of this.config.postInstallCommands) {
      const output = await this.executeCommand(environmentId, command, workspaceDir);
      result.logs.push(`Post-install: ${command} -> ${output}`);
    }

    this.emit('setup:postinstall:completed', { environmentId });
  }

  /**
   * Start configured services
   */
  private async startServices(
    environmentId: string,
    workspaceDir: string,
    result: SetupResult
  ): Promise<void> {
    if (this.config.services.length === 0) {
      return;
    }

    this.emit('setup:services:started', { environmentId, services: this.config.services.map(s => s.name) });

    // Sort services by dependencies
    const sortedServices = this.sortServicesByDependencies(this.config.services);

    for (const service of sortedServices) {
      try {
        await this.startService(environmentId, service, workspaceDir);
        result.runningServices.push(service.name);
        result.logs.push(`Started service: ${service.name}`);
      } catch (error) {
        result.errors.push(`Failed to start service ${service.name}: ${error}`);
      }
    }

    this.emit('setup:services:completed', { environmentId, running: result.runningServices });
  }

  /**
   * Perform health checks on running services
   */
  private async performHealthChecks(environmentId: string, result: SetupResult): Promise<void> {
    const healthChecks: HealthCheckResult[] = [];

    for (const service of this.config.services) {
      if (service.healthCheck) {
        const healthResult = await this.checkServiceHealth(environmentId, service);
        healthChecks.push(healthResult);
        
        if (healthResult.healthy) {
          result.logs.push(`Health check passed for ${service.name}`);
        } else {
          result.errors.push(`Health check failed for ${service.name}: ${healthResult.error}`);
        }
      }
    }

    this.emit('setup:healthcheck:completed', { environmentId, results: healthChecks });
  }

  /**
   * Execute a command in the WSL2 environment
   */
  private async executeCommand(
    environmentId: string,
    command: string,
    workingDir?: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const fullCommand = workingDir ? `cd ${workingDir} && ${command}` : command;
      const process = spawn('wsl', ['--', 'bash', '-c', fullCommand]);
      
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
          resolve(stdout.trim());
        } else {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        }
      });

      // Set timeout
      setTimeout(() => {
        process.kill();
        reject(new Error(`Command timeout: ${command}`));
      }, 300000); // 5 minutes timeout
    });
  }

  /**
   * Set an environment variable in the WSL2 environment
   */
  private async setEnvironmentVariable(
    environmentId: string,
    name: string,
    value: string
  ): Promise<void> {
    const command = `echo 'export ${name}="${value}"' >> ~/.bashrc`;
    await this.executeCommand(environmentId, command);
  }

  /**
   * Start a service in the background
   */
  private async startService(
    environmentId: string,
    service: ServiceConfig,
    workspaceDir: string
  ): Promise<void> {
    const command = `nohup ${service.command} > /tmp/${service.name}.log 2>&1 & echo $!`;
    const pid = await this.executeCommand(environmentId, command, workspaceDir);
    
    this.runningServices.set(service.name, {
      pid: parseInt(pid.trim()),
      port: service.port,
      startTime: new Date(),
    });

    // Wait a moment for the service to start
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  /**
   * Check if a service is healthy
   */
  private async checkServiceHealth(
    environmentId: string,
    service: ServiceConfig
  ): Promise<HealthCheckResult> {
    if (!service.healthCheck) {
      return { service: service.name, healthy: true };
    }

    const startTime = Date.now();
    try {
      await this.executeCommand(environmentId, service.healthCheck);
      return {
        service: service.name,
        healthy: true,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        service: service.name,
        healthy: false,
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Sort services by their dependencies
   */
  private sortServicesByDependencies(services: ServiceConfig[]): ServiceConfig[] {
    const sorted: ServiceConfig[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (service: ServiceConfig) => {
      if (visiting.has(service.name)) {
        throw new Error(`Circular dependency detected for service: ${service.name}`);
      }
      if (visited.has(service.name)) {
        return;
      }

      visiting.add(service.name);

      for (const depName of service.dependencies) {
        const dependency = services.find(s => s.name === depName);
        if (dependency) {
          visit(dependency);
        }
      }

      visiting.delete(service.name);
      visited.add(service.name);
      sorted.push(service);
    };

    for (const service of services) {
      visit(service);
    }

    return sorted;
  }

  /**
   * Stop all running services
   */
  async stopAllServices(environmentId: string): Promise<void> {
    for (const [serviceName, serviceInfo] of this.runningServices) {
      try {
        await this.executeCommand(environmentId, `kill ${serviceInfo.pid}`);
        this.emit('service:stopped', { environmentId, service: serviceName });
      } catch (error) {
        this.emit('service:stop:failed', { environmentId, service: serviceName, error });
      }
    }
    this.runningServices.clear();
  }
}

export default WSL2EnvironmentSetup;

