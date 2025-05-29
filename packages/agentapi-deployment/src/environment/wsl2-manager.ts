import { spawn, type ChildProcess } from "child_process";
import { promisify } from "util";
import type {
  WSL2Config,
  WSL2Instance,
  DeploymentError,
  PRInfo,
} from "../types";

const execAsync = promisify(require("child_process").exec);

export class WSL2Manager {
  private config: WSL2Config;
  private activeInstances: Map<string, WSL2Instance> = new Map();

  constructor(config: WSL2Config = {}) {
    this.config = {
      distributionName: "Ubuntu-22.04",
      instancePrefix: "claude-test-env",
      resourceLimits: {
        memory: "4GB",
        processors: 2,
      },
      networkConfig: {
        hostPort: 3284,
        guestPort: 3284,
      },
      ...config,
    };
  }

  /**
   * Create a new WSL2 instance for PR deployment
   */
  async createInstance(prInfo: PRInfo): Promise<WSL2Instance> {
    const instanceId = this.generateInstanceId(prInfo);
    const instanceName = `${this.config.instancePrefix}-${instanceId}`;

    try {
      // Check if instance already exists
      const existingInstance = await this.getInstance(instanceId);
      if (existingInstance) {
        console.log(`WSL2 instance ${instanceName} already exists, reusing...`);
        return existingInstance;
      }

      console.log(`Creating WSL2 instance: ${instanceName}`);

      // Create a new WSL2 instance by importing the base distribution
      await this.executeWSLCommand([
        "--import",
        instanceName,
        `C:\\WSL\\${instanceName}`,
        `C:\\WSL\\base\\${this.config.distributionName}.tar`,
      ]);

      // Configure resource limits
      await this.configureResourceLimits(instanceName);

      // Start the instance
      await this.startInstance(instanceName);

      // Get instance IP address
      const ipAddress = await this.getInstanceIP(instanceName);

      const instance: WSL2Instance = {
        id: instanceId,
        name: instanceName,
        status: "running",
        ipAddress,
        port: this.config.networkConfig?.guestPort,
        createdAt: new Date(),
        lastActivity: new Date(),
      };

      this.activeInstances.set(instanceId, instance);
      
      console.log(`WSL2 instance ${instanceName} created successfully`);
      return instance;

    } catch (error) {
      throw this.createDeploymentError(
        `Failed to create WSL2 instance: ${error.message}`,
        "WSL2_CREATE_FAILED",
        error
      );
    }
  }

  /**
   * Get an existing WSL2 instance
   */
  async getInstance(instanceId: string): Promise<WSL2Instance | null> {
    const cached = this.activeInstances.get(instanceId);
    if (cached) {
      // Update status
      cached.status = await this.getInstanceStatus(cached.name);
      return cached;
    }

    // Check if instance exists in WSL
    const instanceName = `${this.config.instancePrefix}-${instanceId}`;
    const exists = await this.instanceExists(instanceName);
    
    if (!exists) {
      return null;
    }

    const status = await this.getInstanceStatus(instanceName);
    const ipAddress = status === "running" ? await this.getInstanceIP(instanceName) : undefined;

    const instance: WSL2Instance = {
      id: instanceId,
      name: instanceName,
      status,
      ipAddress,
      port: this.config.networkConfig?.guestPort,
      createdAt: new Date(), // We don't have the actual creation time
      lastActivity: new Date(),
    };

    this.activeInstances.set(instanceId, instance);
    return instance;
  }

  /**
   * Setup the deployment environment in the WSL2 instance
   */
  async setupEnvironment(instance: WSL2Instance, prInfo: PRInfo): Promise<void> {
    try {
      console.log(`Setting up environment in ${instance.name} for PR ${prInfo.number}`);

      // Update package lists
      await this.executeInInstance(instance.name, "sudo apt update");

      // Install required packages
      await this.executeInInstance(instance.name, [
        "sudo", "apt", "install", "-y",
        "git", "curl", "wget", "build-essential",
        "python3", "python3-pip", "nodejs", "npm"
      ].join(" "));

      // Install Claude Code if not already installed
      await this.installClaudeCode(instance.name);

      // Clone the repository
      await this.cloneRepository(instance.name, prInfo);

      // Setup project dependencies
      await this.setupProjectDependencies(instance.name, prInfo);

      console.log(`Environment setup completed for ${instance.name}`);

    } catch (error) {
      throw this.createDeploymentError(
        `Failed to setup environment: ${error.message}`,
        "WSL2_SETUP_FAILED",
        error
      );
    }
  }

  /**
   * Start AgentAPI server in the WSL2 instance
   */
  async startAgentAPI(instance: WSL2Instance): Promise<void> {
    try {
      console.log(`Starting AgentAPI server in ${instance.name}`);

      // Kill any existing AgentAPI processes
      await this.executeInInstance(instance.name, "pkill -f agentapi || true");

      // Start AgentAPI server with Claude Code
      const command = [
        "cd /workspace &&",
        "nohup agentapi server --",
        "claude",
        "--allowedTools 'Bash(git*) Edit Replace'",
        "> agentapi.log 2>&1 &"
      ].join(" ");

      await this.executeInInstance(instance.name, command);

      // Wait for server to start
      await this.waitForAgentAPIReady(instance);

      console.log(`AgentAPI server started successfully in ${instance.name}`);

    } catch (error) {
      throw this.createDeploymentError(
        `Failed to start AgentAPI: ${error.message}`,
        "AGENTAPI_START_FAILED",
        error
      );
    }
  }

  /**
   * Stop and cleanup a WSL2 instance
   */
  async cleanupInstance(instanceId: string): Promise<void> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) {
      console.log(`Instance ${instanceId} not found in active instances`);
      return;
    }

    try {
      console.log(`Cleaning up WSL2 instance: ${instance.name}`);

      // Stop any running processes
      await this.executeInInstance(instance.name, "pkill -f agentapi || true");

      // Terminate the instance
      await this.executeWSLCommand(["--terminate", instance.name]);

      // Unregister the instance
      await this.executeWSLCommand(["--unregister", instance.name]);

      // Remove from active instances
      this.activeInstances.delete(instanceId);

      console.log(`WSL2 instance ${instance.name} cleaned up successfully`);

    } catch (error) {
      console.error(`Failed to cleanup instance ${instance.name}:`, error);
      // Don't throw here as cleanup should be best-effort
    }
  }

  /**
   * Get resource usage for an instance
   */
  async getResourceUsage(instanceId: string): Promise<{ memory: string; cpu: string } | undefined> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance || instance.status !== "running") {
      return undefined;
    }

    try {
      // Get memory usage
      const memoryResult = await this.executeInInstance(
        instance.name,
        "free -h | grep Mem | awk '{print $3\"/\"$2}'"
      );

      // Get CPU usage (simplified)
      const cpuResult = await this.executeInInstance(
        instance.name,
        "top -bn1 | grep 'Cpu(s)' | awk '{print $2}' | cut -d'%' -f1"
      );

      return {
        memory: memoryResult.trim(),
        cpu: `${cpuResult.trim()}%`,
      };

    } catch (error) {
      console.error(`Failed to get resource usage for ${instance.name}:`, error);
      return undefined;
    }
  }

  /**
   * List all active instances
   */
  getActiveInstances(): WSL2Instance[] {
    return Array.from(this.activeInstances.values());
  }

  /**
   * Generate a unique instance ID for a PR
   */
  private generateInstanceId(prInfo: PRInfo): string {
    return `${prInfo.owner}-${prInfo.repository}-${prInfo.number}`.toLowerCase();
  }

  /**
   * Execute a WSL command
   */
  private async executeWSLCommand(args: string[]): Promise<string> {
    const command = `wsl ${args.join(" ")}`;
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr) {
      throw new Error(`WSL command failed: ${stderr}`);
    }
    
    return stdout;
  }

  /**
   * Execute a command inside a WSL2 instance
   */
  private async executeInInstance(instanceName: string, command: string): Promise<string> {
    const wslCommand = `wsl -d ${instanceName} -- bash -c "${command}"`;
    const { stdout, stderr } = await execAsync(wslCommand);
    
    if (stderr && !stderr.includes("Warning")) {
      throw new Error(`Command failed in ${instanceName}: ${stderr}`);
    }
    
    return stdout;
  }

  /**
   * Check if a WSL2 instance exists
   */
  private async instanceExists(instanceName: string): Promise<boolean> {
    try {
      const result = await this.executeWSLCommand(["--list", "--quiet"]);
      return result.includes(instanceName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the status of a WSL2 instance
   */
  private async getInstanceStatus(instanceName: string): Promise<WSL2Instance["status"]> {
    try {
      const result = await this.executeWSLCommand(["--list", "--running", "--quiet"]);
      return result.includes(instanceName) ? "running" : "stopped";
    } catch (error) {
      return "stopped";
    }
  }

  /**
   * Start a WSL2 instance
   */
  private async startInstance(instanceName: string): Promise<void> {
    await this.executeInInstance(instanceName, "echo 'Instance started'");
  }

  /**
   * Get the IP address of a WSL2 instance
   */
  private async getInstanceIP(instanceName: string): Promise<string> {
    try {
      const result = await this.executeInInstance(
        instanceName,
        "hostname -I | awk '{print $1}'"
      );
      return result.trim();
    } catch (error) {
      // Fallback to localhost for development
      return "127.0.0.1";
    }
  }

  /**
   * Configure resource limits for an instance
   */
  private async configureResourceLimits(instanceName: string): Promise<void> {
    // WSL2 resource limits are typically configured via .wslconfig file
    // This is a placeholder for more advanced resource management
    console.log(`Configuring resource limits for ${instanceName}`);
  }

  /**
   * Install Claude Code in the instance
   */
  private async installClaudeCode(instanceName: string): Promise<void> {
    try {
      // Check if Claude Code is already installed
      const checkResult = await this.executeInInstance(instanceName, "which claude || echo 'not_found'");
      
      if (!checkResult.includes("not_found")) {
        console.log("Claude Code already installed");
        return;
      }

      // Install Claude Code (this would need to be adapted based on actual installation method)
      console.log("Installing Claude Code...");
      await this.executeInInstance(instanceName, [
        "curl -fsSL https://claude.ai/install.sh | bash",
        "|| echo 'Claude Code installation placeholder'"
      ].join(" "));

    } catch (error) {
      console.warn(`Failed to install Claude Code: ${error.message}`);
      // Don't throw here as this might be handled differently in production
    }
  }

  /**
   * Clone the repository for the PR
   */
  private async cloneRepository(instanceName: string, prInfo: PRInfo): Promise<void> {
    const repoUrl = `https://github.com/${prInfo.owner}/${prInfo.repository}.git`;
    const workspaceDir = "/workspace";

    await this.executeInInstance(instanceName, `mkdir -p ${workspaceDir}`);
    await this.executeInInstance(instanceName, `cd ${workspaceDir} && git clone ${repoUrl} .`);
    await this.executeInInstance(instanceName, `cd ${workspaceDir} && git checkout ${prInfo.branch}`);
  }

  /**
   * Setup project dependencies
   */
  private async setupProjectDependencies(instanceName: string, prInfo: PRInfo): Promise<void> {
    const workspaceDir = "/workspace";

    // Check for package.json and install npm dependencies
    try {
      await this.executeInInstance(instanceName, `cd ${workspaceDir} && [ -f package.json ] && npm install || echo 'No package.json found'`);
    } catch (error) {
      console.warn("Failed to install npm dependencies:", error.message);
    }

    // Check for requirements.txt and install Python dependencies
    try {
      await this.executeInInstance(instanceName, `cd ${workspaceDir} && [ -f requirements.txt ] && pip3 install -r requirements.txt || echo 'No requirements.txt found'`);
    } catch (error) {
      console.warn("Failed to install Python dependencies:", error.message);
    }
  }

  /**
   * Wait for AgentAPI to be ready
   */
  private async waitForAgentAPIReady(instance: WSL2Instance, timeoutMs: number = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      try {
        // Check if AgentAPI is responding
        const result = await this.executeInInstance(
          instance.name,
          "curl -s http://localhost:3284/status || echo 'not_ready'"
        );
        
        if (!result.includes("not_ready")) {
          return;
        }
      } catch (error) {
        // Continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`AgentAPI did not become ready within ${timeoutMs}ms`);
  }

  /**
   * Create a standardized deployment error
   */
  private createDeploymentError(
    message: string,
    code: string,
    originalError?: any
  ): DeploymentError {
    const error = new Error(message) as DeploymentError;
    error.code = code;
    error.phase = "wsl2_management";
    error.recoverable = !code.includes("FAILED");
    
    if (originalError) {
      error.stack = originalError.stack;
    }
    
    return error;
  }
}

