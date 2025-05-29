import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';
import {
  WSL2Config,
  WSL2Instance,
  DeploymentRequest,
  DeploymentResult,
  DeploymentEvent,
  HealthCheck,
  ResourceUsage
} from '../../types';
import { EnvironmentSetup } from './environment-setup';
import { BranchManager } from './branch-manager';
import { ValidationRunner } from './validation-runner';
import { DeploymentMonitor } from './deployment-monitor';

export class WSL2DeploymentEngine extends EventEmitter {
  private config: WSL2Config;
  private instances: Map<string, WSL2Instance> = new Map();
  private deployments: Map<string, DeploymentResult> = new Map();
  private deploymentQueue: DeploymentRequest[] = [];
  private activeDeployments: Set<string> = new Set();
  
  private environmentSetup: EnvironmentSetup;
  private branchManager: BranchManager;
  private validationRunner: ValidationRunner;
  private deploymentMonitor: DeploymentMonitor;
  
  private healthCheckInterval?: NodeJS.Timeout;
  private resourceCheckInterval?: NodeJS.Timeout;

  constructor(config: WSL2Config) {
    super();
    this.config = config;
    
    this.environmentSetup = new EnvironmentSetup(config);
    this.branchManager = new BranchManager(config);
    this.validationRunner = new ValidationRunner(config);
    this.deploymentMonitor = new DeploymentMonitor(config);
    
    this.setupEventHandlers();
    this.initializeInstancePool();
    this.startMonitoring();
  }

  /**
   * Initialize the WSL2 instance pool
   */
  private async initializeInstancePool(): Promise<void> {
    try {
      // Create minimum required instances
      const promises = [];
      for (let i = 0; i < this.config.instancePool.minInstances; i++) {
        promises.push(this.createInstance());
      }
      
      await Promise.all(promises);
      this.emit('pool.initialized', { instanceCount: this.instances.size });
    } catch (error) {
      this.emit('pool.error', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a new WSL2 instance
   */
  private async createInstance(): Promise<WSL2Instance> {
    const instanceId = uuidv4();
    const instanceName = `wsl2-deploy-${instanceId.slice(0, 8)}`;
    
    const instance: WSL2Instance = {
      id: instanceId,
      name: instanceName,
      status: 'creating',
      sshPort: 22,
      createdAt: new Date(),
      deployments: []
    };
    
    this.instances.set(instanceId, instance);
    
    try {
      // Create WSL2 instance using wsl command
      await this.executeCommand(`wsl --install --distribution Ubuntu-22.04 --name ${instanceName}`);
      
      // Configure SSH access
      await this.configureSSHAccess(instance);
      
      // Setup base environment
      await this.environmentSetup.setupBaseEnvironment(instance);
      
      instance.status = 'running';
      instance.ipAddress = await this.getInstanceIP(instance);
      
      this.emit('instance.created', { instance });
      return instance;
    } catch (error) {
      instance.status = 'error';
      this.emit('instance.error', { instanceId, error: error.message });
      throw error;
    }
  }

  /**
   * Configure SSH access for the instance
   */
  private async configureSSHAccess(instance: WSL2Instance): Promise<void> {
    const commands = [
      'sudo apt update',
      'sudo apt install -y openssh-server',
      'sudo systemctl enable ssh',
      'sudo systemctl start ssh',
      `sudo useradd -m -s /bin/bash ${this.config.ssh.user}`,
      `sudo usermod -aG sudo ${this.config.ssh.user}`,
      `sudo mkdir -p /home/${this.config.ssh.user}/.ssh`,
      `sudo cp ~/.ssh/authorized_keys /home/${this.config.ssh.user}/.ssh/`,
      `sudo chown -R ${this.config.ssh.user}:${this.config.ssh.user} /home/${this.config.ssh.user}/.ssh`,
      `sudo chmod 700 /home/${this.config.ssh.user}/.ssh`,
      `sudo chmod 600 /home/${this.config.ssh.user}/.ssh/authorized_keys`
    ];

    for (const command of commands) {
      await this.executeWSLCommand(instance.name, command);
    }
  }

  /**
   * Get the IP address of a WSL2 instance
   */
  private async getInstanceIP(instance: WSL2Instance): Promise<string> {
    const result = await this.executeWSLCommand(instance.name, 'hostname -I | awk \'{print $1}\'');
    return result.trim();
  }

  /**
   * Execute a command in a WSL2 instance
   */
  private async executeWSLCommand(instanceName: string, command: string): Promise<string> {
    return this.executeCommand(`wsl -d ${instanceName} -- ${command}`);
  }

  /**
   * Execute a system command
   */
  private async executeCommand(command: string): Promise<string> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout, stderr } = await execAsync(command);
      if (stderr) {
        throw new Error(stderr);
      }
      return stdout;
    } catch (error) {
      throw new Error(`Command failed: ${command}. Error: ${error.message}`);
    }
  }

  /**
   * Deploy a request to an available instance
   */
  public async deploy(request: DeploymentRequest): Promise<string> {
    const deploymentId = uuidv4();
    
    const deployment: DeploymentResult = {
      id: deploymentId,
      status: 'pending',
      instanceId: '',
      startTime: new Date(),
      logs: [],
      validationResults: []
    };
    
    this.deployments.set(deploymentId, deployment);
    
    // Add to queue based on priority
    this.addToQueue(request);
    
    // Process queue
    this.processDeploymentQueue();
    
    return deploymentId;
  }

  /**
   * Add deployment request to queue based on priority
   */
  private addToQueue(request: DeploymentRequest): void {
    const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
    
    let insertIndex = this.deploymentQueue.length;
    for (let i = 0; i < this.deploymentQueue.length; i++) {
      if (priorityOrder[request.priority] < priorityOrder[this.deploymentQueue[i].priority]) {
        insertIndex = i;
        break;
      }
    }
    
    this.deploymentQueue.splice(insertIndex, 0, request);
  }

  /**
   * Process the deployment queue
   */
  private async processDeploymentQueue(): Promise<void> {
    if (this.activeDeployments.size >= this.config.deployment.parallelDeployments) {
      return;
    }
    
    const request = this.deploymentQueue.shift();
    if (!request) {
      return;
    }
    
    const availableInstance = this.getAvailableInstance();
    if (!availableInstance) {
      // Try to create a new instance if under max limit
      if (this.instances.size < this.config.instancePool.maxInstances) {
        try {
          await this.createInstance();
          // Retry processing
          this.deploymentQueue.unshift(request);
          setTimeout(() => this.processDeploymentQueue(), 1000);
        } catch (error) {
          this.emit('deployment.error', { request, error: error.message });
        }
      } else {
        // Put back in queue
        this.deploymentQueue.unshift(request);
      }
      return;
    }
    
    this.executeDeployment(request, availableInstance);
  }

  /**
   * Get an available instance for deployment
   */
  private getAvailableInstance(): WSL2Instance | null {
    for (const instance of this.instances.values()) {
      if (instance.status === 'running' && instance.deployments.length === 0) {
        return instance;
      }
    }
    return null;
  }

  /**
   * Execute a deployment on a specific instance
   */
  private async executeDeployment(request: DeploymentRequest, instance: WSL2Instance): Promise<void> {
    const deployment = this.deployments.get(request.id);
    if (!deployment) {
      return;
    }
    
    this.activeDeployments.add(request.id);
    instance.deployments.push(request.id);
    deployment.instanceId = instance.id;
    deployment.status = 'running';
    
    this.emit('deployment.started', { deployment, instance });
    
    try {
      // Clone repository and checkout branch
      const branchInfo = await this.branchManager.cloneAndCheckout(
        instance,
        request.repository.url,
        request.repository.branch
      );
      
      deployment.logs.push({
        timestamp: new Date(),
        level: 'info',
        message: `Repository cloned: ${branchInfo.repository}@${branchInfo.commit}`,
        source: 'deployment'
      });
      
      // Setup project-specific environment
      const envResult = await this.environmentSetup.setupProjectEnvironment(
        instance,
        request.environment
      );
      
      if (!envResult.success) {
        throw new Error('Environment setup failed');
      }
      
      // Run validation steps
      const validationResults = await this.validationRunner.runValidation(
        instance,
        request.validationSteps
      );
      
      deployment.validationResults = validationResults;
      
      // Check if all validations passed
      const allPassed = validationResults.every(result => result.status === 'success');
      
      deployment.status = allPassed ? 'success' : 'failed';
      deployment.endTime = new Date();
      
      this.emit('deployment.completed', { deployment, success: allPassed });
      
    } catch (error) {
      deployment.status = 'failed';
      deployment.error = error.message;
      deployment.endTime = new Date();
      
      deployment.logs.push({
        timestamp: new Date(),
        level: 'error',
        message: `Deployment failed: ${error.message}`,
        source: 'deployment'
      });
      
      this.emit('deployment.failed', { deployment, error: error.message });
    } finally {
      // Cleanup
      this.activeDeployments.delete(request.id);
      instance.deployments = instance.deployments.filter(id => id !== request.id);
      instance.lastUsed = new Date();
      
      // Continue processing queue
      setTimeout(() => this.processDeploymentQueue(), 100);
    }
  }

  /**
   * Get deployment status
   */
  public getDeploymentStatus(deploymentId: string): DeploymentResult | null {
    return this.deployments.get(deploymentId) || null;
  }

  /**
   * Get all instances
   */
  public getInstances(): WSL2Instance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Get instance health
   */
  public async getInstanceHealth(instanceId: string): Promise<HealthCheck | null> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return null;
    }
    
    return this.deploymentMonitor.checkInstanceHealth(instance);
  }

  /**
   * Destroy an instance
   */
  public async destroyInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }
    
    if (instance.deployments.length > 0) {
      throw new Error(`Instance ${instanceId} has active deployments`);
    }
    
    try {
      instance.status = 'destroying';
      await this.executeCommand(`wsl --unregister ${instance.name}`);
      
      this.instances.delete(instanceId);
      this.emit('instance.destroyed', { instanceId });
    } catch (error) {
      instance.status = 'error';
      throw error;
    }
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    this.deploymentMonitor.on('health.check', (healthCheck: HealthCheck) => {
      const instance = this.instances.get(healthCheck.instanceId);
      if (instance) {
        instance.resourceUsage = healthCheck.resourceUsage;
      }
      this.emit('health.check', healthCheck);
    });
    
    this.deploymentMonitor.on('resource.alert', (alert) => {
      this.emit('resource.alert', alert);
    });
  }

  /**
   * Start monitoring
   */
  private startMonitoring(): void {
    // Health checks
    this.healthCheckInterval = setInterval(async () => {
      for (const instance of this.instances.values()) {
        if (instance.status === 'running') {
          try {
            const health = await this.deploymentMonitor.checkInstanceHealth(instance);
            this.emit('health.check', health);
          } catch (error) {
            this.emit('health.error', { instanceId: instance.id, error: error.message });
          }
        }
      }
    }, this.config.monitoring.healthCheckInterval);
    
    // Resource monitoring
    this.resourceCheckInterval = setInterval(async () => {
      for (const instance of this.instances.values()) {
        if (instance.status === 'running') {
          try {
            const usage = await this.deploymentMonitor.getResourceUsage(instance);
            instance.resourceUsage = usage;
            
            // Check thresholds
            if (usage.cpu > this.config.monitoring.alertThresholds.cpu ||
                usage.memory > this.config.monitoring.alertThresholds.memory ||
                usage.disk > this.config.monitoring.alertThresholds.disk) {
              this.emit('resource.alert', { instanceId: instance.id, usage });
            }
          } catch (error) {
            this.emit('resource.error', { instanceId: instance.id, error: error.message });
          }
        }
      }
    }, this.config.monitoring.resourceCheckInterval);
  }

  /**
   * Stop monitoring and cleanup
   */
  public async shutdown(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    if (this.resourceCheckInterval) {
      clearInterval(this.resourceCheckInterval);
    }
    
    // Wait for active deployments to complete or timeout
    const timeout = 30000; // 30 seconds
    const start = Date.now();
    
    while (this.activeDeployments.size > 0 && Date.now() - start < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Force stop remaining deployments
    for (const deploymentId of this.activeDeployments) {
      const deployment = this.deployments.get(deploymentId);
      if (deployment) {
        deployment.status = 'cancelled';
        deployment.endTime = new Date();
      }
    }
    
    this.emit('engine.shutdown');
  }
}

