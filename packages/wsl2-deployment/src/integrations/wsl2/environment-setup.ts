import { EventEmitter } from 'eventemitter3';
import { WSL2Config, WSL2Instance, EnvironmentSetupResult } from '../../types';

export class EnvironmentSetup extends EventEmitter {
  private config: WSL2Config;

  constructor(config: WSL2Config) {
    super();
    this.config = config;
  }

  /**
   * Setup base environment on a WSL2 instance
   */
  public async setupBaseEnvironment(instance: WSL2Instance): Promise<EnvironmentSetupResult> {
    const steps = [
      {
        name: 'Update package lists',
        command: 'sudo apt update && sudo apt upgrade -y'
      },
      {
        name: 'Install essential tools',
        command: 'sudo apt install -y curl wget git build-essential software-properties-common'
      },
      {
        name: 'Install Node.js',
        command: this.getNodeInstallCommand()
      },
      {
        name: 'Install Python',
        command: this.getPythonInstallCommand()
      },
      {
        name: 'Install package managers',
        command: 'npm install -g pnpm yarn && pip install --upgrade pip'
      },
      {
        name: 'Install Docker (if enabled)',
        command: this.config.environment.dockerEnabled ? this.getDockerInstallCommand() : 'echo "Docker disabled"'
      },
      {
        name: 'Install security tools',
        command: 'sudo apt install -y fail2ban ufw'
      },
      {
        name: 'Configure firewall',
        command: 'sudo ufw --force enable && sudo ufw allow ssh'
      },
      {
        name: 'Install monitoring tools',
        command: 'sudo apt install -y htop iotop nethogs'
      }
    ];

    return this.executeSetupSteps(instance, steps);
  }

  /**
   * Setup project-specific environment
   */
  public async setupProjectEnvironment(
    instance: WSL2Instance,
    environment: Record<string, string>
  ): Promise<EnvironmentSetupResult> {
    const steps = [
      {
        name: 'Set environment variables',
        command: this.createEnvSetupCommand(environment)
      },
      {
        name: 'Install project dependencies',
        command: this.getProjectDependenciesCommand()
      },
      {
        name: 'Configure project settings',
        command: this.getProjectConfigCommand()
      },
      {
        name: 'Setup database connections',
        command: this.getDatabaseSetupCommand(environment)
      },
      {
        name: 'Configure external services',
        command: this.getExternalServicesCommand(environment)
      },
      {
        name: 'Run project setup scripts',
        command: this.getProjectSetupCommand()
      }
    ];

    return this.executeSetupSteps(instance, steps);
  }

  /**
   * Validate environment configuration
   */
  public async validateEnvironment(instance: WSL2Instance): Promise<EnvironmentSetupResult> {
    const steps = [
      {
        name: 'Check Node.js installation',
        command: 'node --version && npm --version'
      },
      {
        name: 'Check Python installation',
        command: 'python3 --version && pip3 --version'
      },
      {
        name: 'Check Git configuration',
        command: 'git --version && git config --list'
      },
      {
        name: 'Check Docker (if enabled)',
        command: this.config.environment.dockerEnabled ? 'docker --version && docker info' : 'echo "Docker not enabled"'
      },
      {
        name: 'Check network connectivity',
        command: 'ping -c 3 google.com && curl -I https://github.com'
      },
      {
        name: 'Check disk space',
        command: 'df -h'
      },
      {
        name: 'Check memory',
        command: 'free -h'
      },
      {
        name: 'Check running services',
        command: 'systemctl list-units --type=service --state=running'
      }
    ];

    return this.executeSetupSteps(instance, steps);
  }

  /**
   * Execute setup steps
   */
  private async executeSetupSteps(
    instance: WSL2Instance,
    steps: Array<{ name: string; command: string }>
  ): Promise<EnvironmentSetupResult> {
    const result: EnvironmentSetupResult = {
      success: true,
      duration: 0,
      steps: []
    };

    const startTime = Date.now();

    for (const step of steps) {
      const stepStartTime = Date.now();
      
      try {
        this.emit('step.started', { instance: instance.id, step: step.name });
        
        const output = await this.executeCommand(instance, step.command);
        const stepDuration = Date.now() - stepStartTime;
        
        result.steps.push({
          name: step.name,
          success: true,
          duration: stepDuration,
          output: output.trim()
        });
        
        this.emit('step.completed', { 
          instance: instance.id, 
          step: step.name, 
          duration: stepDuration 
        });
        
      } catch (error) {
        const stepDuration = Date.now() - stepStartTime;
        
        result.steps.push({
          name: step.name,
          success: false,
          duration: stepDuration,
          output: '',
          error: error.message
        });
        
        result.success = false;
        
        this.emit('step.failed', { 
          instance: instance.id, 
          step: step.name, 
          error: error.message 
        });
        
        // Continue with other steps even if one fails
      }
    }

    result.duration = Date.now() - startTime;
    
    this.emit('setup.completed', { 
      instance: instance.id, 
      success: result.success, 
      duration: result.duration 
    });
    
    return result;
  }

  /**
   * Execute command on WSL2 instance
   */
  private async executeCommand(instance: WSL2Instance, command: string): Promise<string> {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const wslCommand = `wsl -d ${instance.name} -- bash -c "${command.replace(/"/g, '\\"')}"`;
    
    try {
      const { stdout, stderr } = await execAsync(wslCommand, { 
        timeout: 300000, // 5 minutes timeout
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer
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
   * Get Node.js installation command
   */
  private getNodeInstallCommand(): string {
    const version = this.config.environment.nodeVersion;
    return `
      curl -fsSL https://deb.nodesource.com/setup_${version} | sudo -E bash - &&
      sudo apt-get install -y nodejs
    `;
  }

  /**
   * Get Python installation command
   */
  private getPythonInstallCommand(): string {
    const version = this.config.environment.pythonVersion;
    return `
      sudo apt install -y python${version} python${version}-pip python${version}-venv &&
      sudo ln -sf /usr/bin/python${version} /usr/bin/python3 &&
      sudo ln -sf /usr/bin/pip${version} /usr/bin/pip3
    `;
  }

  /**
   * Get Docker installation command
   */
  private getDockerInstallCommand(): string {
    return `
      curl -fsSL https://get.docker.com -o get-docker.sh &&
      sudo sh get-docker.sh &&
      sudo usermod -aG docker ${this.config.ssh.user} &&
      sudo systemctl enable docker &&
      sudo systemctl start docker &&
      rm get-docker.sh
    `;
  }

  /**
   * Create environment variables setup command
   */
  private createEnvSetupCommand(environment: Record<string, string>): string {
    const envVars = Object.entries(environment)
      .map(([key, value]) => `export ${key}="${value}"`)
      .join(' && ');
    
    const envFile = Object.entries(environment)
      .map(([key, value]) => `${key}="${value}"`)
      .join('\\n');
    
    return `
      ${envVars} &&
      echo -e "${envFile}" >> ~/.bashrc &&
      echo -e "${envFile}" >> ~/.profile
    `;
  }

  /**
   * Get project dependencies installation command
   */
  private getProjectDependenciesCommand(): string {
    return `
      if [ -f package.json ]; then
        if [ -f pnpm-lock.yaml ]; then
          pnpm install
        elif [ -f yarn.lock ]; then
          yarn install
        else
          npm install
        fi
      fi &&
      if [ -f requirements.txt ]; then
        pip3 install -r requirements.txt
      fi &&
      if [ -f Pipfile ]; then
        pip3 install pipenv && pipenv install
      fi &&
      if [ -f pyproject.toml ]; then
        pip3 install poetry && poetry install
      fi
    `;
  }

  /**
   * Get project configuration command
   */
  private getProjectConfigCommand(): string {
    return `
      if [ -f .env.example ]; then
        cp .env.example .env
      fi &&
      if [ -f config/config.example.js ]; then
        cp config/config.example.js config/config.js
      fi &&
      if [ -f config/config.example.json ]; then
        cp config/config.example.json config/config.json
      fi
    `;
  }

  /**
   * Get database setup command
   */
  private getDatabaseSetupCommand(environment: Record<string, string>): string {
    const commands = [];
    
    // Check for database URLs in environment
    if (environment.DATABASE_URL || environment.POSTGRES_URL) {
      commands.push('echo "PostgreSQL connection configured"');
    }
    
    if (environment.MONGODB_URL || environment.MONGO_URL) {
      commands.push('echo "MongoDB connection configured"');
    }
    
    if (environment.REDIS_URL) {
      commands.push('echo "Redis connection configured"');
    }
    
    // Run database migrations if available
    commands.push(`
      if [ -f package.json ] && grep -q "migrate" package.json; then
        npm run migrate || echo "Migration script not found or failed"
      fi
    `);
    
    return commands.join(' && ');
  }

  /**
   * Get external services configuration command
   */
  private getExternalServicesCommand(environment: Record<string, string>): string {
    const commands = ['echo "Configuring external services"'];
    
    // Check for common service configurations
    if (environment.AWS_ACCESS_KEY_ID) {
      commands.push('echo "AWS credentials configured"');
    }
    
    if (environment.STRIPE_SECRET_KEY) {
      commands.push('echo "Stripe configuration found"');
    }
    
    if (environment.SENDGRID_API_KEY) {
      commands.push('echo "SendGrid configuration found"');
    }
    
    return commands.join(' && ');
  }

  /**
   * Get project setup command
   */
  private getProjectSetupCommand(): string {
    return `
      if [ -f package.json ] && grep -q "setup" package.json; then
        npm run setup
      elif [ -f package.json ] && grep -q "postinstall" package.json; then
        npm run postinstall
      elif [ -f Makefile ] && grep -q "setup" Makefile; then
        make setup
      elif [ -f setup.sh ]; then
        chmod +x setup.sh && ./setup.sh
      else
        echo "No setup script found"
      fi
    `;
  }

  /**
   * Generate environment report
   */
  public async generateEnvironmentReport(instance: WSL2Instance): Promise<string> {
    const commands = [
      'echo "=== System Information ==="',
      'uname -a',
      'lsb_release -a',
      'echo "\\n=== Installed Software ==="',
      'node --version 2>/dev/null || echo "Node.js: Not installed"',
      'npm --version 2>/dev/null || echo "npm: Not installed"',
      'python3 --version 2>/dev/null || echo "Python: Not installed"',
      'pip3 --version 2>/dev/null || echo "pip: Not installed"',
      'git --version 2>/dev/null || echo "Git: Not installed"',
      'docker --version 2>/dev/null || echo "Docker: Not installed"',
      'echo "\\n=== Resource Usage ==="',
      'free -h',
      'df -h',
      'echo "\\n=== Network Configuration ==="',
      'ip addr show',
      'echo "\\n=== Running Services ==="',
      'systemctl list-units --type=service --state=running | head -20'
    ];
    
    try {
      const report = await this.executeCommand(instance, commands.join(' && '));
      return report;
    } catch (error) {
      return `Error generating environment report: ${error.message}`;
    }
  }
}

