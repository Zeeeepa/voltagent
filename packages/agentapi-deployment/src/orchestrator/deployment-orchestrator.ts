import { EventEmitter } from "events";
import type {
  DeploymentConfig,
  PRInfo,
  DeploymentResult,
  DeploymentStatus,
  DeploymentEvent,
  DeploymentEventType,
  ValidationResults,
  WSL2Instance,
  DeploymentError,
} from "../types";
import { AgentAPIClient } from "../client/agentapi-client";
import { WSL2Manager } from "../environment/wsl2-manager";
import { DatabaseManager } from "../database/database-manager";

export class DeploymentOrchestrator extends EventEmitter {
  private config: DeploymentConfig;
  private wsl2Manager: WSL2Manager;
  private databaseManager?: DatabaseManager;
  private activeDeployments: Map<string, DeploymentContext> = new Map();

  constructor(config: DeploymentConfig) {
    super();
    this.config = config;
    this.wsl2Manager = new WSL2Manager(config.wsl2);
    
    if (config.database) {
      this.databaseManager = new DatabaseManager(config.database);
    }
  }

  /**
   * Deploy a PR branch for validation
   */
  async deployPR(prInfo: PRInfo): Promise<DeploymentResult> {
    const deploymentId = this.generateDeploymentId(prInfo);
    
    try {
      // Check if deployment is already in progress
      if (this.activeDeployments.has(deploymentId)) {
        throw this.createDeploymentError(
          `Deployment for PR ${prInfo.number} is already in progress`,
          "DEPLOYMENT_IN_PROGRESS"
        );
      }

      // Create deployment context
      const context: DeploymentContext = {
        id: deploymentId,
        prInfo,
        status: "pending",
        startTime: new Date(),
        events: [],
      };

      this.activeDeployments.set(deploymentId, context);

      // Log deployment start
      await this.logEvent(context, "deployment_started", {
        pr_number: prInfo.number,
        branch: prInfo.branch,
        repository: `${prInfo.owner}/${prInfo.repository}`,
      });

      // Update status to in_progress
      context.status = "in_progress";
      await this.updateDeploymentRecord(context);

      // Step 1: Create WSL2 environment
      await this.emitEvent("deployment_started", context);
      const wsl2Instance = await this.createEnvironment(context);

      // Step 2: Setup environment and clone code
      await this.setupEnvironment(context, wsl2Instance);

      // Step 3: Start AgentAPI server
      await this.startAgentAPI(context, wsl2Instance);

      // Step 4: Run validation
      const validationResults = await this.runValidation(context, wsl2Instance);

      // Step 5: Complete deployment
      const result = await this.completeDeployment(context, wsl2Instance, validationResults);

      // Cleanup
      this.activeDeployments.delete(deploymentId);

      return result;

    } catch (error) {
      await this.handleDeploymentError(deploymentId, error);
      throw error;
    }
  }

  /**
   * Get deployment status
   */
  async getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus | null> {
    const context = this.activeDeployments.get(deploymentId);
    if (context) {
      return context.status;
    }

    // Check database for completed deployments
    if (this.databaseManager) {
      const record = await this.databaseManager.getDeployment(deploymentId);
      return record?.status || null;
    }

    return null;
  }

  /**
   * Cancel a deployment
   */
  async cancelDeployment(deploymentId: string): Promise<void> {
    const context = this.activeDeployments.get(deploymentId);
    if (!context) {
      throw new Error(`Deployment ${deploymentId} not found`);
    }

    context.status = "cancelled";
    
    // Cleanup WSL2 instance if it exists
    if (context.wsl2Instance) {
      await this.wsl2Manager.cleanupInstance(context.wsl2Instance.id);
    }

    await this.logEvent(context, "deployment_failed", {
      reason: "cancelled",
    });

    this.activeDeployments.delete(deploymentId);
  }

  /**
   * Get all active deployments
   */
  getActiveDeployments(): string[] {
    return Array.from(this.activeDeployments.keys());
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Cancel all active deployments
    const activeIds = Array.from(this.activeDeployments.keys());
    await Promise.all(activeIds.map(id => this.cancelDeployment(id)));

    // Close database connection
    if (this.databaseManager) {
      await this.databaseManager.close();
    }
  }

  /**
   * Create WSL2 environment
   */
  private async createEnvironment(context: DeploymentContext): Promise<WSL2Instance> {
    try {
      await this.emitEvent("environment_provisioned", context);
      
      const instance = await this.wsl2Manager.createInstance(context.prInfo);
      context.wsl2Instance = instance;

      await this.logEvent(context, "environment_provisioned", {
        instance_id: instance.id,
        instance_name: instance.name,
        ip_address: instance.ipAddress,
      });

      return instance;

    } catch (error) {
      throw this.createDeploymentError(
        `Failed to create environment: ${error.message}`,
        "ENVIRONMENT_CREATE_FAILED",
        error
      );
    }
  }

  /**
   * Setup environment and clone code
   */
  private async setupEnvironment(context: DeploymentContext, instance: WSL2Instance): Promise<void> {
    try {
      await this.wsl2Manager.setupEnvironment(instance, context.prInfo);

      await this.logEvent(context, "code_deployed", {
        instance_id: instance.id,
        branch: context.prInfo.branch,
        commit_sha: context.prInfo.headSha,
      });

    } catch (error) {
      throw this.createDeploymentError(
        `Failed to setup environment: ${error.message}`,
        "ENVIRONMENT_SETUP_FAILED",
        error
      );
    }
  }

  /**
   * Start AgentAPI server
   */
  private async startAgentAPI(context: DeploymentContext, instance: WSL2Instance): Promise<void> {
    try {
      await this.wsl2Manager.startAgentAPI(instance);

      // Create AgentAPI client for this instance
      const agentAPIClient = new AgentAPIClient({
        baseUrl: `http://${instance.ipAddress || "localhost"}`,
        port: this.config.agentapi.port || 3284,
      });

      // Wait for AgentAPI to be ready
      await agentAPIClient.waitForStable(30000);

      context.agentAPIClient = agentAPIClient;

    } catch (error) {
      throw this.createDeploymentError(
        `Failed to start AgentAPI: ${error.message}`,
        "AGENTAPI_START_FAILED",
        error
      );
    }
  }

  /**
   * Run validation tests
   */
  private async runValidation(context: DeploymentContext, instance: WSL2Instance): Promise<ValidationResults> {
    try {
      await this.emitEvent("validation_started", context);
      await this.logEvent(context, "validation_started", {});

      const agentAPIClient = context.agentAPIClient!;
      const startTime = Date.now();

      // Send validation commands to Claude Code
      const validationCommands = [
        "Please analyze this codebase and run any available tests",
        "Check for code quality issues and potential bugs",
        "Verify that the code follows best practices",
        "Generate a summary of your findings",
      ];

      const results: ValidationResults = {
        tests_passed: 0,
        tests_failed: 0,
        coverage: "0%",
        errors: [],
        warnings: [],
        duration: 0,
      };

      for (const command of validationCommands) {
        const messages = await agentAPIClient.executeCommand(command, 120000);
        
        // Parse the response for test results and issues
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.type === "agent") {
          this.parseValidationResults(lastMessage.content, results);
        }
      }

      results.duration = Date.now() - startTime;

      await this.logEvent(context, "validation_completed", {
        tests_passed: results.tests_passed,
        tests_failed: results.tests_failed,
        coverage: results.coverage,
        duration: results.duration,
      });

      await this.emitEvent("validation_completed", context);

      return results;

    } catch (error) {
      throw this.createDeploymentError(
        `Validation failed: ${error.message}`,
        "VALIDATION_FAILED",
        error
      );
    }
  }

  /**
   * Complete the deployment
   */
  private async completeDeployment(
    context: DeploymentContext,
    instance: WSL2Instance,
    validationResults: ValidationResults
  ): Promise<DeploymentResult> {
    try {
      context.status = "success";
      context.endTime = new Date();
      context.validationResults = validationResults;

      const result: DeploymentResult = {
        module: "agentapi_claude_deployment",
        status: "success",
        deployment: {
          pr_number: context.prInfo.number,
          branch: context.prInfo.branch,
          wsl2_instance: instance.name,
          claude_code_version: this.config.claudeCode.version || "latest",
          deployment_time: context.startTime.toISOString(),
          validation_results: {
            tests_passed: validationResults.tests_passed,
            tests_failed: validationResults.tests_failed,
            coverage: validationResults.coverage,
          },
        },
      };

      await this.logEvent(context, "deployment_completed", result);
      await this.updateDeploymentRecord(context);
      await this.emitEvent("deployment_completed", context);

      // Cleanup AgentAPI client
      if (context.agentAPIClient) {
        context.agentAPIClient.destroy();
      }

      // Optionally cleanup WSL2 instance (or keep it for debugging)
      if (this.config.wsl2.instancePrefix?.includes("temp")) {
        await this.wsl2Manager.cleanupInstance(instance.id);
      }

      return result;

    } catch (error) {
      throw this.createDeploymentError(
        `Failed to complete deployment: ${error.message}`,
        "DEPLOYMENT_COMPLETION_FAILED",
        error
      );
    }
  }

  /**
   * Handle deployment errors
   */
  private async handleDeploymentError(deploymentId: string, error: any): Promise<void> {
    const context = this.activeDeployments.get(deploymentId);
    if (context) {
      context.status = "failed";
      context.endTime = new Date();
      context.error = error.message;

      await this.logEvent(context, "deployment_failed", {
        error: error.message,
        code: error.code,
        phase: error.phase,
      });

      await this.updateDeploymentRecord(context);

      // Cleanup resources
      if (context.agentAPIClient) {
        context.agentAPIClient.destroy();
      }

      if (context.wsl2Instance) {
        await this.wsl2Manager.cleanupInstance(context.wsl2Instance.id);
      }

      this.activeDeployments.delete(deploymentId);
    }

    await this.emitEvent("deployment_failed", context);
  }

  /**
   * Parse validation results from Claude Code output
   */
  private parseValidationResults(output: string, results: ValidationResults): void {
    // Simple parsing logic - this would be more sophisticated in production
    const lines = output.split("\\n");
    
    for (const line of lines) {
      // Look for test results
      if (line.includes("tests passed")) {
        const match = line.match(/(\\d+)\\s+tests?\\s+passed/i);
        if (match) {
          results.tests_passed += parseInt(match[1], 10);
        }
      }
      
      if (line.includes("tests failed") || line.includes("test failed")) {
        const match = line.match(/(\\d+)\\s+tests?\\s+failed/i);
        if (match) {
          results.tests_failed += parseInt(match[1], 10);
        }
      }

      // Look for coverage information
      if (line.includes("coverage")) {
        const match = line.match(/(\\d+(?:\\.\\d+)?)%/);
        if (match) {
          results.coverage = `${match[1]}%`;
        }
      }

      // Look for errors and warnings
      if (line.toLowerCase().includes("error:")) {
        results.errors?.push(line.trim());
      }
      
      if (line.toLowerCase().includes("warning:")) {
        results.warnings?.push(line.trim());
      }
    }
  }

  /**
   * Generate a unique deployment ID
   */
  private generateDeploymentId(prInfo: PRInfo): string {
    return `${prInfo.owner}-${prInfo.repository}-${prInfo.number}-${Date.now()}`;
  }

  /**
   * Log a deployment event
   */
  private async logEvent(
    context: DeploymentContext,
    type: DeploymentEventType,
    data?: Record<string, any>
  ): Promise<void> {
    const event: DeploymentEvent = {
      type,
      timestamp: new Date(),
      deploymentId: context.id,
      prNumber: context.prInfo.number,
      data,
    };

    context.events.push(event);

    if (this.databaseManager) {
      await this.databaseManager.logEvent(event);
    }
  }

  /**
   * Update deployment record in database
   */
  private async updateDeploymentRecord(context: DeploymentContext): Promise<void> {
    if (this.databaseManager) {
      await this.databaseManager.updateDeployment(context);
    }
  }

  /**
   * Emit an event
   */
  private async emitEvent(eventType: string, context?: DeploymentContext): Promise<void> {
    this.emit(eventType, context);
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
    error.phase = "orchestration";
    error.recoverable = !code.includes("FAILED");
    
    if (originalError) {
      error.stack = originalError.stack;
    }
    
    return error;
  }
}

/**
 * Internal deployment context
 */
interface DeploymentContext {
  id: string;
  prInfo: PRInfo;
  status: DeploymentStatus;
  startTime: Date;
  endTime?: Date;
  wsl2Instance?: WSL2Instance;
  agentAPIClient?: AgentAPIClient;
  validationResults?: ValidationResults;
  error?: string;
  events: DeploymentEvent[];
}

