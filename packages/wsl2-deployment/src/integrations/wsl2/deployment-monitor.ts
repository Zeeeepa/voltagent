import { EventEmitter } from 'eventemitter3';
import { WSL2Config, WSL2Instance, HealthCheck, ResourceUsage } from '../../types';

export class DeploymentMonitor extends EventEmitter {
  private config: WSL2Config;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: WSL2Config) {
    super();
    this.config = config;
  }

  /**
   * Check instance health
   */
  public async checkInstanceHealth(instance: WSL2Instance): Promise<HealthCheck> {
    const timestamp = new Date();
    
    const healthCheck: HealthCheck = {
      instanceId: instance.id,
      timestamp,
      status: 'unknown',
      checks: {
        ssh: false,
        disk: false,
        memory: false,
        cpu: false,
        network: false
      },
      resourceUsage: {
        cpu: 0,
        memory: 0,
        disk: 0,
        network: {
          bytesIn: 0,
          bytesOut: 0
        }
      }
    };

    try {
      // SSH connectivity check
      healthCheck.checks.ssh = await this.checkSSHConnectivity(instance);
      
      if (healthCheck.checks.ssh) {
        // Resource usage checks
        healthCheck.resourceUsage = await this.getResourceUsage(instance);
        
        // Individual health checks
        healthCheck.checks.cpu = healthCheck.resourceUsage.cpu < this.config.monitoring.alertThresholds.cpu;
        healthCheck.checks.memory = healthCheck.resourceUsage.memory < this.config.monitoring.alertThresholds.memory;
        healthCheck.checks.disk = healthCheck.resourceUsage.disk < this.config.monitoring.alertThresholds.disk;
        healthCheck.checks.network = await this.checkNetworkConnectivity(instance);
      }
      
      // Determine overall health status
      const allChecks = Object.values(healthCheck.checks);
      healthCheck.status = allChecks.every(check => check) ? 'healthy' : 'unhealthy';
      
    } catch (error) {
      healthCheck.status = 'unhealthy';
      this.emit('health.check.error', { instanceId: instance.id, error: error.message });
    }
    
    this.emit('health.check.completed', healthCheck);
    return healthCheck;
  }

  /**
   * Get resource usage for an instance
   */
  public async getResourceUsage(instance: WSL2Instance): Promise<ResourceUsage> {
    try {
      // Get CPU usage
      const cpuUsage = await this.getCPUUsage(instance);
      
      // Get memory usage
      const memoryUsage = await this.getMemoryUsage(instance);
      
      // Get disk usage
      const diskUsage = await this.getDiskUsage(instance);
      
      // Get network usage
      const networkUsage = await this.getNetworkUsage(instance);
      
      return {
        cpu: cpuUsage,
        memory: memoryUsage,
        disk: diskUsage,
        network: networkUsage
      };
      
    } catch (error) {
      throw new Error(`Failed to get resource usage: ${error.message}`);
    }
  }

  /**
   * Start monitoring an instance
   */
  public startInstanceMonitoring(instance: WSL2Instance): void {
    if (this.monitoringIntervals.has(instance.id)) {
      this.stopInstanceMonitoring(instance.id);
    }
    
    const interval = setInterval(async () => {
      try {
        const healthCheck = await this.checkInstanceHealth(instance);
        
        // Check for alerts
        if (healthCheck.status === 'unhealthy') {
          this.emit('instance.unhealthy', { instance, healthCheck });
        }
        
        // Check resource thresholds
        const usage = healthCheck.resourceUsage;
        if (usage.cpu > this.config.monitoring.alertThresholds.cpu ||
            usage.memory > this.config.monitoring.alertThresholds.memory ||
            usage.disk > this.config.monitoring.alertThresholds.disk) {
          this.emit('resource.alert', { instance, usage });
        }
        
      } catch (error) {
        this.emit('monitoring.error', { instanceId: instance.id, error: error.message });
      }
    }, this.config.monitoring.healthCheckInterval);
    
    this.monitoringIntervals.set(instance.id, interval);
    this.emit('monitoring.started', { instanceId: instance.id });
  }

  /**
   * Stop monitoring an instance
   */
  public stopInstanceMonitoring(instanceId: string): void {
    const interval = this.monitoringIntervals.get(instanceId);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(instanceId);
      this.emit('monitoring.stopped', { instanceId });
    }
  }

  /**
   * Monitor deployment progress
   */
  public async monitorDeploymentProgress(
    instance: WSL2Instance,
    deploymentId: string,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const startTime = Date.now();
    const timeout = this.config.deployment.timeout;
    
    this.emit('deployment.monitoring.started', { instanceId: instance.id, deploymentId });
    
    const progressInterval = setInterval(async () => {
      try {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / timeout) * 100, 100);
        
        if (onProgress) {
          onProgress(progress);
        }
        
        this.emit('deployment.progress', { 
          instanceId: instance.id, 
          deploymentId, 
          progress, 
          elapsed 
        });
        
        // Check if deployment is still running
        const isRunning = await this.checkDeploymentStatus(instance, deploymentId);
        if (!isRunning) {
          clearInterval(progressInterval);
          this.emit('deployment.monitoring.completed', { instanceId: instance.id, deploymentId });
        }
        
        // Check timeout
        if (elapsed >= timeout) {
          clearInterval(progressInterval);
          this.emit('deployment.timeout', { instanceId: instance.id, deploymentId });
        }
        
      } catch (error) {
        clearInterval(progressInterval);
        this.emit('deployment.monitoring.error', { 
          instanceId: instance.id, 
          deploymentId, 
          error: error.message 
        });
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Track application performance
   */
  public async trackApplicationPerformance(
    instance: WSL2Instance,
    applicationPort: number
  ): Promise<{
    responseTime: number;
    statusCode: number;
    memoryUsage: number;
    cpuUsage: number;
  }> {
    try {
      const startTime = Date.now();
      
      // Make HTTP request to application
      const curlCommand = `curl -w "%{http_code}\\n%{time_total}\\n" -s -o /dev/null http://localhost:${applicationPort}/health || echo "000\\n0"`;
      const curlResult = await this.executeCommand(instance, curlCommand);
      const [statusCode, responseTime] = curlResult.trim().split('\n').map(Number);
      
      // Get current resource usage
      const resourceUsage = await this.getResourceUsage(instance);
      
      const performance = {
        responseTime: responseTime * 1000, // Convert to milliseconds
        statusCode,
        memoryUsage: resourceUsage.memory,
        cpuUsage: resourceUsage.cpu
      };
      
      this.emit('application.performance', { instanceId: instance.id, performance });
      
      return performance;
      
    } catch (error) {
      throw new Error(`Failed to track application performance: ${error.message}`);
    }
  }

  /**
   * Monitor security events
   */
  public async monitorSecurityEvents(instance: WSL2Instance): Promise<{
    failedLogins: number;
    suspiciousConnections: number;
    fileChanges: number;
  }> {
    try {
      // Check failed login attempts
      const failedLoginsCommand = `grep "Failed password" /var/log/auth.log | wc -l || echo "0"`;
      const failedLogins = parseInt(await this.executeCommand(instance, failedLoginsCommand), 10);
      
      // Check suspicious network connections
      const suspiciousConnectionsCommand = `netstat -an | grep -E "(LISTEN|ESTABLISHED)" | wc -l || echo "0"`;
      const suspiciousConnections = parseInt(await this.executeCommand(instance, suspiciousConnectionsCommand), 10);
      
      // Check recent file changes in sensitive directories
      const fileChangesCommand = `find /etc /home -type f -mmin -60 | wc -l || echo "0"`;
      const fileChanges = parseInt(await this.executeCommand(instance, fileChangesCommand), 10);
      
      const securityEvents = {
        failedLogins,
        suspiciousConnections,
        fileChanges
      };
      
      this.emit('security.events', { instanceId: instance.id, events: securityEvents });
      
      return securityEvents;
      
    } catch (error) {
      throw new Error(`Failed to monitor security events: ${error.message}`);
    }
  }

  /**
   * Check SSH connectivity
   */
  private async checkSSHConnectivity(instance: WSL2Instance): Promise<boolean> {
    try {
      await this.executeCommand(instance, 'echo "SSH test"', 5000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check network connectivity
   */
  private async checkNetworkConnectivity(instance: WSL2Instance): Promise<boolean> {
    try {
      await this.executeCommand(instance, 'ping -c 1 8.8.8.8', 10000);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get CPU usage percentage
   */
  private async getCPUUsage(instance: WSL2Instance): Promise<number> {
    try {
      const command = `top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}'`;
      const result = await this.executeCommand(instance, command);
      return parseFloat(result.trim()) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get memory usage percentage
   */
  private async getMemoryUsage(instance: WSL2Instance): Promise<number> {
    try {
      const command = `free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}'`;
      const result = await this.executeCommand(instance, command);
      return parseFloat(result.trim()) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get disk usage percentage
   */
  private async getDiskUsage(instance: WSL2Instance): Promise<number> {
    try {
      const command = `df / | tail -1 | awk '{print $5}' | sed 's/%//'`;
      const result = await this.executeCommand(instance, command);
      return parseInt(result.trim(), 10) || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get network usage
   */
  private async getNetworkUsage(instance: WSL2Instance): Promise<{ bytesIn: number; bytesOut: number }> {
    try {
      const command = `cat /proc/net/dev | grep eth0 | awk '{print $2, $10}'`;
      const result = await this.executeCommand(instance, command);
      const [bytesIn, bytesOut] = result.trim().split(' ').map(Number);
      
      return {
        bytesIn: bytesIn || 0,
        bytesOut: bytesOut || 0
      };
    } catch {
      return { bytesIn: 0, bytesOut: 0 };
    }
  }

  /**
   * Check deployment status
   */
  private async checkDeploymentStatus(instance: WSL2Instance, deploymentId: string): Promise<boolean> {
    try {
      // Check if deployment process is still running
      const command = `ps aux | grep "${deploymentId}" | grep -v grep | wc -l`;
      const result = await this.executeCommand(instance, command);
      return parseInt(result.trim(), 10) > 0;
    } catch {
      return false;
    }
  }

  /**
   * Generate monitoring report
   */
  public async generateMonitoringReport(instance: WSL2Instance): Promise<string> {
    try {
      const healthCheck = await this.checkInstanceHealth(instance);
      const securityEvents = await this.monitorSecurityEvents(instance);
      
      const report = `
=== WSL2 Instance Monitoring Report ===
Instance ID: ${instance.id}
Instance Name: ${instance.name}
Timestamp: ${new Date().toISOString()}

=== Health Status ===
Overall Status: ${healthCheck.status}
SSH Connectivity: ${healthCheck.checks.ssh ? 'OK' : 'FAILED'}
CPU Health: ${healthCheck.checks.cpu ? 'OK' : 'HIGH USAGE'}
Memory Health: ${healthCheck.checks.memory ? 'OK' : 'HIGH USAGE'}
Disk Health: ${healthCheck.checks.disk ? 'OK' : 'HIGH USAGE'}
Network Health: ${healthCheck.checks.network ? 'OK' : 'FAILED'}

=== Resource Usage ===
CPU Usage: ${healthCheck.resourceUsage.cpu.toFixed(1)}%
Memory Usage: ${healthCheck.resourceUsage.memory.toFixed(1)}%
Disk Usage: ${healthCheck.resourceUsage.disk.toFixed(1)}%
Network In: ${(healthCheck.resourceUsage.network.bytesIn / 1024 / 1024).toFixed(2)} MB
Network Out: ${(healthCheck.resourceUsage.network.bytesOut / 1024 / 1024).toFixed(2)} MB

=== Security Events ===
Failed Logins: ${securityEvents.failedLogins}
Suspicious Connections: ${securityEvents.suspiciousConnections}
Recent File Changes: ${securityEvents.fileChanges}

=== Alert Thresholds ===
CPU Threshold: ${this.config.monitoring.alertThresholds.cpu}%
Memory Threshold: ${this.config.monitoring.alertThresholds.memory}%
Disk Threshold: ${this.config.monitoring.alertThresholds.disk}%

=== Active Deployments ===
${instance.deployments.length > 0 ? instance.deployments.join(', ') : 'None'}
      `.trim();
      
      return report;
      
    } catch (error) {
      return `Error generating monitoring report: ${error.message}`;
    }
  }

  /**
   * Execute command on WSL2 instance
   */
  private async executeCommand(
    instance: WSL2Instance,
    command: string,
    timeout: number = 30000
  ): Promise<string> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const wslCommand = `wsl -d ${instance.name} -- bash -c "${command.replace(/"/g, '\\"')}"`;
    
    try {
      const { stdout, stderr } = await execAsync(wslCommand, { 
        timeout,
        maxBuffer: 1024 * 1024 // 1MB buffer
      });
      
      if (stderr && !stderr.includes('Warning')) {
        throw new Error(stderr);
      }
      
      return stdout;
    } catch (error) {
      throw new Error(`Command failed on ${instance.name}: ${command}. Error: ${error.message}`);
    }
  }

  /**
   * Cleanup monitoring resources
   */
  public cleanup(): void {
    for (const [instanceId, interval] of this.monitoringIntervals) {
      clearInterval(interval);
      this.emit('monitoring.stopped', { instanceId });
    }
    this.monitoringIntervals.clear();
  }
}

