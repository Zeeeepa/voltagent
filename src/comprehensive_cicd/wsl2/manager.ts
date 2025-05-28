import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { config } from '../config/index.js';
import { db } from '../database/connection.js';

const execAsync = promisify(exec);

export interface WSL2Instance {
  id: string;
  instanceName: string;
  projectId: string;
  status: 'creating' | 'running' | 'stopped' | 'error' | 'destroyed';
  distro: string;
  basePath: string;
  resourceLimits: {
    memory: string;
    processors: number;
    swap: string;
  };
  createdAt: Date;
  lastUsedAt: Date;
  metadata: Record<string, any>;
}

export interface WSL2Configuration {
  memory?: string;
  processors?: number;
  swap?: string;
  enableGUI?: boolean;
  enableSystemd?: boolean;
  customPackages?: string[];
}

export interface DeploymentResult {
  success: boolean;
  deploymentPath: string;
  instanceName: string;
  error?: string;
  logs?: string[];
}

export class WSL2Manager {
  private config: typeof config.wsl2;

  constructor(options: Partial<typeof config.wsl2> = {}) {
    this.config = {
      ...config.wsl2,
      ...options,
    };
  }

  async createInstance(
    projectId: string,
    configuration: WSL2Configuration = {}
  ): Promise<WSL2Instance> {
    const instanceName = `claude-code-${projectId}-${Date.now()}`;
    
    try {
      console.log(`Creating WSL2 instance: ${instanceName}`);
      
      // Check if we've reached the maximum number of instances
      const activeInstances = await this.getActiveInstanceCount();
      if (activeInstances >= this.config.maxInstances) {
        throw new Error(`Maximum number of WSL2 instances (${this.config.maxInstances}) reached`);
      }

      // Create WSL2 instance
      await this.executeCommand(`wsl --install -d ${this.config.distro} --name ${instanceName}`);
      
      // Configure instance
      await this.configureInstance(instanceName, configuration);
      
      // Install Claude Code and dependencies
      await this.installClaudeCode(instanceName);
      
      // Store instance info in database
      const instance = await this.storeInstanceInfo(instanceName, projectId, configuration);
      
      console.log(`WSL2 instance created successfully: ${instanceName}`);
      return instance;
    } catch (error) {
      console.error(`Failed to create WSL2 instance ${instanceName}:`, error);
      
      // Cleanup on failure
      try {
        await this.destroyInstance(instanceName);
      } catch (cleanupError) {
        console.error(`Failed to cleanup instance ${instanceName}:`, cleanupError);
      }
      
      throw error;
    }
  }

  async configureInstance(
    instanceName: string,
    configuration: WSL2Configuration
  ): Promise<void> {
    console.log(`Configuring WSL2 instance: ${instanceName}`);
    
    const commands = [
      // Update package lists
      'sudo apt update',
      
      // Install essential packages
      'sudo apt install -y git curl wget nodejs npm python3 python3-pip build-essential',
      
      // Install Node.js LTS
      'curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -',
      'sudo apt-get install -y nodejs',
      
      // Install Python packages
      'pip3 install --upgrade pip setuptools wheel',
      
      // Install Docker if needed
      'curl -fsSL https://get.docker.com -o get-docker.sh',
      'sudo sh get-docker.sh',
      'sudo usermod -aG docker $USER',
      
      // Configure Git
      'git config --global init.defaultBranch main',
      'git config --global pull.rebase false',
    ];

    // Add custom packages if specified
    if (configuration.customPackages && configuration.customPackages.length > 0) {
      commands.push(`sudo apt install -y ${configuration.customPackages.join(' ')}`);
    }

    // Execute configuration commands
    for (const command of commands) {
      try {
        await this.executeInInstance(instanceName, command);
      } catch (error) {
        console.warn(`Warning: Command failed in ${instanceName}: ${command}`, error);
        // Continue with other commands even if one fails
      }
    }

    // Configure resource limits
    await this.configureResourceLimits(instanceName, configuration);
  }

  async configureResourceLimits(
    instanceName: string,
    configuration: WSL2Configuration
  ): Promise<void> {
    const wslConfig = `
[wsl2]
memory=${configuration.memory || this.config.memory}
processors=${configuration.processors || this.config.processors}
swap=${configuration.swap || this.config.swap}
localhostForwarding=${this.config.localhostForwarding}
`;

    // Write WSL configuration (this affects all WSL2 instances)
    // In a production environment, you might want to manage this more carefully
    try {
      await this.executeCommand(`echo "${wslConfig}" > %USERPROFILE%\\.wslconfig`);
    } catch (error) {
      console.warn('Failed to configure WSL2 resource limits:', error);
    }
  }

  async installClaudeCode(instanceName: string): Promise<void> {
    console.log(`Installing Claude Code in instance: ${instanceName}`);
    
    const commands = [
      // Install Claude Code CLI (mock installation for now)
      'curl -fsSL https://claude.ai/install.sh | bash || echo "Claude Code installation placeholder"',
      
      // Install npm packages for code analysis
      'npm install -g eslint prettier typescript ts-node',
      'npm install -g @typescript-eslint/parser @typescript-eslint/eslint-plugin',
      
      // Install Python packages for code analysis
      'pip3 install pylint black mypy bandit safety',
      
      // Create workspace directory
      'mkdir -p ~/workspace',
      'chmod 755 ~/workspace',
    ];

    for (const command of commands) {
      try {
        await this.executeInInstance(instanceName, command);
      } catch (error) {
        console.warn(`Warning: Claude Code installation command failed: ${command}`, error);
      }
    }
  }

  async deployPRToInstance(
    instanceName: string,
    prUrl: string,
    branchName: string
  ): Promise<DeploymentResult> {
    const deploymentPath = `/home/ubuntu/projects/${branchName}`;
    const logs: string[] = [];
    
    try {
      console.log(`Deploying PR to instance ${instanceName}: ${prUrl}#${branchName}`);
      
      const commands = [
        `mkdir -p ${deploymentPath}`,
        `cd ${deploymentPath}`,
        `git clone ${prUrl} .`,
        `git checkout ${branchName}`,
        // Try multiple package managers
        'npm install || yarn install || pip install -r requirements.txt || echo "No dependencies to install"',
        // Run any setup scripts
        'npm run setup || yarn setup || python setup.py install || echo "No setup script found"',
      ];

      for (const command of commands) {
        try {
          const result = await this.executeInInstance(instanceName, command);
          logs.push(`✓ ${command}: ${result.stdout}`);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logs.push(`✗ ${command}: ${errorMsg}`);
          
          // Some commands are expected to fail (e.g., if no package.json exists)
          if (!command.includes('||')) {
            throw error;
          }
        }
      }

      // Update last used timestamp
      await this.updateInstanceLastUsed(instanceName);

      return {
        success: true,
        deploymentPath,
        instanceName,
        logs,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Failed to deploy PR to instance ${instanceName}:`, error);
      
      return {
        success: false,
        deploymentPath,
        instanceName,
        error: errorMsg,
        logs,
      };
    }
  }

  async executeInInstance(instanceName: string, command: string): Promise<{
    stdout: string;
    stderr: string;
  }> {
    const wslCommand = `wsl -d ${instanceName} -- bash -c "${command.replace(/"/g, '\\"')}"`;
    return await this.executeCommand(wslCommand);
  }

  async executeCommand(command: string): Promise<{
    stdout: string;
    stderr: string;
  }> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 60000, // 1 minute timeout
        maxBuffer: 1024 * 1024, // 1MB buffer
      });
      return { stdout, stderr };
    } catch (error) {
      console.error(`Command execution failed: ${command}`, error);
      throw error;
    }
  }

  async listInstances(): Promise<WSL2Instance[]> {
    try {
      const result = await db.query<WSL2Instance>(`
        SELECT * FROM wsl2_instances 
        WHERE status != 'destroyed' 
        ORDER BY created_at DESC
      `);
      return result.rows;
    } catch (error) {
      console.error('Failed to list WSL2 instances:', error);
      throw error;
    }
  }

  async getInstance(instanceName: string): Promise<WSL2Instance | null> {
    try {
      const result = await db.query<WSL2Instance>(
        'SELECT * FROM wsl2_instances WHERE instance_name = $1',
        [instanceName]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Failed to get WSL2 instance ${instanceName}:`, error);
      throw error;
    }
  }

  async destroyInstance(instanceName: string): Promise<boolean> {
    try {
      console.log(`Destroying WSL2 instance: ${instanceName}`);
      
      // Stop the instance
      await this.executeCommand(`wsl --terminate ${instanceName}`);
      
      // Unregister the instance
      await this.executeCommand(`wsl --unregister ${instanceName}`);
      
      // Update database status
      await db.query(
        'UPDATE wsl2_instances SET status = $1, updated_at = NOW() WHERE instance_name = $2',
        ['destroyed', instanceName]
      );
      
      console.log(`WSL2 instance destroyed: ${instanceName}`);
      return true;
    } catch (error) {
      console.error(`Failed to destroy WSL2 instance ${instanceName}:`, error);
      return false;
    }
  }

  async getActiveInstanceCount(): Promise<number> {
    try {
      const result = await db.query(
        "SELECT COUNT(*) as count FROM wsl2_instances WHERE status IN ('creating', 'running')"
      );
      return parseInt(result.rows[0].count);
    } catch (error) {
      console.error('Failed to get active instance count:', error);
      return 0;
    }
  }

  async cleanupOldInstances(maxAgeHours: number = 24): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);
      
      const result = await db.query<{ instance_name: string }>(
        'SELECT instance_name FROM wsl2_instances WHERE last_used_at < $1 AND status != $2',
        [cutoffTime, 'destroyed']
      );
      
      let cleanedCount = 0;
      for (const row of result.rows) {
        const success = await this.destroyInstance(row.instance_name);
        if (success) {
          cleanedCount++;
        }
      }
      
      console.log(`Cleaned up ${cleanedCount} old WSL2 instances`);
      return cleanedCount;
    } catch (error) {
      console.error('Failed to cleanup old instances:', error);
      return 0;
    }
  }

  private async storeInstanceInfo(
    instanceName: string,
    projectId: string,
    configuration: WSL2Configuration
  ): Promise<WSL2Instance> {
    const resourceLimits = {
      memory: configuration.memory || this.config.memory,
      processors: configuration.processors || this.config.processors,
      swap: configuration.swap || this.config.swap,
    };

    const result = await db.query<WSL2Instance>(
      `INSERT INTO wsl2_instances 
       (instance_name, project_id, status, distro, base_path, resource_limits, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        instanceName,
        projectId,
        'running',
        this.config.distro,
        this.config.basePath,
        JSON.stringify(resourceLimits),
        JSON.stringify(configuration),
      ]
    );

    return result.rows[0];
  }

  private async updateInstanceLastUsed(instanceName: string): Promise<void> {
    await db.query(
      'UPDATE wsl2_instances SET last_used_at = NOW() WHERE instance_name = $1',
      [instanceName]
    );
  }

  // Health check for WSL2 subsystem
  async healthCheck(): Promise<{
    available: boolean;
    version: string;
    activeInstances: number;
    error?: string;
  }> {
    try {
      const { stdout } = await this.executeCommand('wsl --version');
      const activeInstances = await this.getActiveInstanceCount();
      
      return {
        available: true,
        version: stdout.trim(),
        activeInstances,
      };
    } catch (error) {
      return {
        available: false,
        version: 'unknown',
        activeInstances: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

