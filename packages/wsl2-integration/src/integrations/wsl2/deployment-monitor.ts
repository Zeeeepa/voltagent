import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import { z } from 'zod';

const MonitorConfigSchema = z.object({
  interval: z.number().default(5000), // 5 seconds
  metrics: z.array(z.enum(['cpu', 'memory', 'disk', 'network'])).default(['cpu', 'memory']),
  alerts: z.object({
    cpu: z.number().default(80),
    memory: z.number().default(85),
    disk: z.number().default(90),
  }),
});

export type MonitorConfig = z.infer<typeof MonitorConfigSchema>;

export interface DeploymentMetrics {
  timestamp: Date;
  cpu: { usage: number; cores: number };
  memory: { used: number; total: number; percentage: number };
  disk: { used: number; total: number; percentage: number };
  network: { bytesIn: number; bytesOut: number };
  processes: ProcessInfo[];
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  memory: number;
}

export interface Alert {
  type: 'cpu' | 'memory' | 'disk' | 'network';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
}

export class WSL2DeploymentMonitor extends EventEmitter {
  private config: MonitorConfig;
  private monitoring = false;
  private intervalId?: NodeJS.Timeout;
  private metrics: DeploymentMetrics[] = [];

  constructor(config: MonitorConfig) {
    super();
    this.config = MonitorConfigSchema.parse(config);
  }

  async startMonitoring(environmentId: string): Promise<void> {
    if (this.monitoring) return;

    this.monitoring = true;
    this.emit('monitoring:started', { environmentId });

    this.intervalId = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics(environmentId);
        this.metrics.push(metrics);
        this.emit('metrics:collected', { environmentId, metrics });

        const alerts = this.checkAlerts(metrics);
        if (alerts.length > 0) {
          this.emit('alerts:triggered', { environmentId, alerts });
        }
      } catch (error) {
        this.emit('monitoring:error', { environmentId, error });
      }
    }, this.config.interval);
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.monitoring = false;
    this.emit('monitoring:stopped');
  }

  private async collectMetrics(environmentId: string): Promise<DeploymentMetrics> {
    const [cpuInfo, memInfo, diskInfo, processInfo] = await Promise.all([
      this.getCPUMetrics(environmentId),
      this.getMemoryMetrics(environmentId),
      this.getDiskMetrics(environmentId),
      this.getProcessMetrics(environmentId),
    ]);

    return {
      timestamp: new Date(),
      cpu: cpuInfo,
      memory: memInfo,
      disk: diskInfo,
      network: { bytesIn: 0, bytesOut: 0 }, // Simplified
      processes: processInfo,
    };
  }

  private async getCPUMetrics(environmentId: string): Promise<{ usage: number; cores: number }> {
    const output = await this.executeWSLCommand(environmentId, "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1");
    const usage = parseFloat(output.trim());
    const cores = parseInt(await this.executeWSLCommand(environmentId, 'nproc'));
    return { usage, cores };
  }

  private async getMemoryMetrics(environmentId: string): Promise<{ used: number; total: number; percentage: number }> {
    const output = await this.executeWSLCommand(environmentId, "free -m | awk 'NR==2{printf \"%.2f %.2f %.2f\", $3,$2,($3/$2)*100}'");
    const [used, total, percentage] = output.trim().split(' ').map(parseFloat);
    return { used, total, percentage };
  }

  private async getDiskMetrics(environmentId: string): Promise<{ used: number; total: number; percentage: number }> {
    const output = await this.executeWSLCommand(environmentId, "df -h / | awk 'NR==2{print $3,$2,$5}' | sed 's/%//'");
    const [usedStr, totalStr, percentageStr] = output.trim().split(' ');
    return {
      used: this.parseSize(usedStr),
      total: this.parseSize(totalStr),
      percentage: parseFloat(percentageStr),
    };
  }

  private async getProcessMetrics(environmentId: string): Promise<ProcessInfo[]> {
    const output = await this.executeWSLCommand(environmentId, "ps aux --sort=-%cpu | head -10 | awk '{print $2,$11,$3,$4}'");
    return output.split('\n').slice(1).map(line => {
      const [pid, name, cpu, memory] = line.trim().split(/\s+/);
      return {
        pid: parseInt(pid),
        name,
        cpu: parseFloat(cpu),
        memory: parseFloat(memory),
      };
    }).filter(p => !isNaN(p.pid));
  }

  private checkAlerts(metrics: DeploymentMetrics): Alert[] {
    const alerts: Alert[] = [];

    if (metrics.cpu.usage > this.config.alerts.cpu) {
      alerts.push({
        type: 'cpu',
        severity: metrics.cpu.usage > 90 ? 'critical' : 'warning',
        message: `High CPU usage: ${metrics.cpu.usage}%`,
        value: metrics.cpu.usage,
        threshold: this.config.alerts.cpu,
        timestamp: new Date(),
      });
    }

    if (metrics.memory.percentage > this.config.alerts.memory) {
      alerts.push({
        type: 'memory',
        severity: metrics.memory.percentage > 95 ? 'critical' : 'warning',
        message: `High memory usage: ${metrics.memory.percentage}%`,
        value: metrics.memory.percentage,
        threshold: this.config.alerts.memory,
        timestamp: new Date(),
      });
    }

    return alerts;
  }

  private parseSize(sizeStr: string): number {
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)(K|M|G|T)?$/);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2] || '';

    switch (unit) {
      case 'K': return value * 1024;
      case 'M': return value * 1024 * 1024;
      case 'G': return value * 1024 * 1024 * 1024;
      case 'T': return value * 1024 * 1024 * 1024 * 1024;
      default: return value;
    }
  }

  private async executeWSLCommand(environmentId: string, command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('wsl', ['--', 'bash', '-c', command]);
      let stdout = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });
    });
  }
}

export default WSL2DeploymentMonitor;

