/**
 * DockerContainerManager.ts
 * 
 * Manages Docker containers for the Docker execution adapter
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { CommandResult } from './ExecutionAdapter';
import { Logger, LogCategory } from '../utils/logger';

// Promisify node.js functions
const execAsync = promisify(exec);

/**
 * Docker container information
 */
export interface DockerContainerInfo {
  id: string;
  name: string;
  status: string;
  projectPath: string;
  workspacePath: string;
}

/**
 * Options for the Docker container manager
 */
export interface DockerContainerManagerOptions {
  projectRoot: string;
  composeFilePath?: string;
  serviceName?: string;
  projectName?: string;
  logger?: Logger;
}

/**
 * Manages Docker containers for the Docker execution adapter
 */
export class DockerContainerManager {
  private projectRoot: string;
  private composeFilePath: string;
  private serviceName: string;
  private projectName: string;
  private logger?: Logger;
  private containerInfo: DockerContainerInfo | null = null;

  constructor(options: DockerContainerManagerOptions) {
    this.projectRoot = path.resolve(options.projectRoot);
    this.composeFilePath = options.composeFilePath || path.join(this.projectRoot, 'docker-compose.yml');
    this.serviceName = options.serviceName || 'voltagent';
    this.projectName = options.projectName || 'voltagent';
    this.logger = options.logger;
  }

  /**
   * Check if Docker is available on the system
   */
  async isDockerAvailable(): Promise<boolean> {
    try {
      await execAsync('docker --version');
      return true;
    } catch (error) {
      this.logger?.error(
        'Docker is not available on this system',
        error instanceof Error ? error : new Error(String(error)),
        LogCategory.EXECUTION
      );
      return false;
    }
  }

  /**
   * Ensure the Docker container is running
   */
  async ensureContainer(): Promise<DockerContainerInfo | null> {
    try {
      // Check if container is already running
      const existingContainer = await this.getContainerInfo();
      if (existingContainer) {
        this.logger?.info(
          `Docker container already running: ${existingContainer.id}`,
          LogCategory.EXECUTION
        );
        return existingContainer;
      }

      // Start the container using docker-compose
      this.logger?.info(
        `Starting Docker container using compose file: ${this.composeFilePath}`,
        LogCategory.EXECUTION
      );

      // Check if docker-compose file exists
      try {
        await execAsync(`test -f "${this.composeFilePath}"`);
      } catch (error) {
        throw new Error(`Docker compose file not found: ${this.composeFilePath}`);
      }

      // Start the container
      await execAsync(
        `docker-compose -f "${this.composeFilePath}" -p ${this.projectName} up -d ${this.serviceName}`
      );

      // Get the container info
      const containerInfo = await this.getContainerInfo();
      if (!containerInfo) {
        throw new Error('Failed to start Docker container');
      }

      this.logger?.info(
        `Docker container started: ${containerInfo.id}`,
        LogCategory.EXECUTION
      );

      return containerInfo;
    } catch (error) {
      this.logger?.error(
        'Error ensuring Docker container:',
        error instanceof Error ? error : new Error(String(error)),
        LogCategory.EXECUTION
      );
      return null;
    }
  }

  /**
   * Get information about the Docker container
   */
  async getContainerInfo(): Promise<DockerContainerInfo | null> {
    try {
      // If we already have container info, return it
      if (this.containerInfo) {
        // Verify the container is still running
        try {
          const { stdout } = await execAsync(
            `docker inspect --format='{{.State.Running}}' ${this.containerInfo.id}`
          );
          if (stdout.trim() === 'true') {
            return this.containerInfo;
          }
        } catch (error) {
          // Container no longer exists, clear the cached info
          this.containerInfo = null;
        }
      }

      // Get the container ID
      const { stdout: containerId } = await execAsync(
        `docker-compose -f "${this.composeFilePath}" -p ${this.projectName} ps -q ${this.serviceName}`
      );

      if (!containerId.trim()) {
        return null;
      }

      // Get container details
      const { stdout: containerDetails } = await execAsync(
        `docker inspect --format='{{.Name}}|{{.State.Status}}|{{.Config.WorkingDir}}' ${containerId.trim()}`
      );

      const [name, status, workspacePath] = containerDetails.trim().split('|');

      // Create container info
      this.containerInfo = {
        id: containerId.trim(),
        name: name.startsWith('/') ? name.substring(1) : name,
        status,
        projectPath: this.projectRoot,
        workspacePath: workspacePath || '/workspace'
      };

      return this.containerInfo;
    } catch (error) {
      this.logger?.error(
        'Error getting Docker container info:',
        error instanceof Error ? error : new Error(String(error)),
        LogCategory.EXECUTION
      );
      return null;
    }
  }

  /**
   * Execute a command in the Docker container
   */
  async executeCommand(
    command: string,
    workingDir?: string
  ): Promise<CommandResult> {
    try {
      // Get container info
      const containerInfo = await this.getContainerInfo();
      if (!containerInfo) {
        throw new Error('Container is not available');
      }

      // Build the docker exec command
      let dockerCommand = `docker exec`;
      
      // Add working directory if provided
      if (workingDir) {
        dockerCommand += ` -w "${workingDir}"`;
      }
      
      // Add container ID and command
      dockerCommand += ` ${containerInfo.id} /bin/sh -c "${command.replace(/"/g, '\\"')}"`;

      // Execute the command
      const result = await execAsync(dockerCommand);
      
      return {
        stdout: result.stdout,
        stderr: result.stderr,
        exitCode: 0
      };
    } catch (error) {
      if (error instanceof Error && 'stderr' in error && 'stdout' in error) {
        const execError = error as { stderr: string; stdout: string; message: string };
        return {
          stdout: execError.stdout || '',
          stderr: execError.stderr || execError.message,
          exitCode: 1
        };
      }
      
      return {
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        exitCode: 1
      };
    }
  }

  /**
   * Stop the Docker container
   */
  async stopContainer(): Promise<boolean> {
    try {
      // Get container info
      const containerInfo = await this.getContainerInfo();
      if (!containerInfo) {
        return true; // Container is already stopped
      }

      // Stop the container
      await execAsync(
        `docker-compose -f "${this.composeFilePath}" -p ${this.projectName} stop ${this.serviceName}`
      );

      // Clear the cached container info
      this.containerInfo = null;

      return true;
    } catch (error) {
      this.logger?.error(
        'Error stopping Docker container:',
        error instanceof Error ? error : new Error(String(error)),
        LogCategory.EXECUTION
      );
      return false;
    }
  }
}

