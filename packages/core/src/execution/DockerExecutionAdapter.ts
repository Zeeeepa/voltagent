/**
 * DockerExecutionAdapter.ts
 * 
 * Execution adapter that runs commands in a Docker container
 */

import path from 'path';
import { 
  ExecutionAdapter, 
  CommandResult, 
  FileReadResult, 
  FileEditResult, 
  DirectoryListResult 
} from './ExecutionAdapter';
import { Logger, LogCategory } from '../utils/logger';
import { AgentEvents, AgentEventType } from '../events';
import { DockerContainerManager, DockerContainerInfo } from './DockerContainerManager';
import { GitInfoHelper } from './GitInfoHelper';

/**
 * Execution adapter that runs commands in a Docker container
 */
export class DockerExecutionAdapter implements ExecutionAdapter {
  private containerManager: DockerContainerManager;
  private logger?: Logger;
  private gitInfoHelper: GitInfoHelper;
  private lastEmittedStatus?: string;
  public initialized = false;

  /**
   * Create a Docker execution adapter with a container manager
   */
  constructor(containerManager: DockerContainerManager, options?: { logger?: Logger }) {
    this.containerManager = containerManager;
    this.logger = options?.logger;
    
    // Initialize git helper with same logger
    this.gitInfoHelper = new GitInfoHelper({ logger: this.logger });
    
    // Start container initialization immediately in the background
    // Fire and forget - we don't await this promise in the constructor
    this.initializeContainer().then(() => {
      this.initialized = true;
    }).catch(error => {
      this.logger?.error(
        `Background Docker initialization failed: ${error.message}`,
        error instanceof Error ? error : new Error(String(error)),
        LogCategory.EXECUTION
      );
    });
  }

  /**
   * Initialize the Docker container in the background
   * This allows eager initialization without blocking construction
   * @returns Promise that resolves when container is initialized
   */
  private initializeContainer(): Promise<DockerContainerInfo | null> {
    console.log('Starting Docker container initialization');
    
    // Emit initializing status
    this.emitEnvironmentStatus('initializing', false);
    
    // Return the promise instead of using .then() so caller can await if needed
    return this.containerManager.ensureContainer()
      .then(container => {
        if (container) {
          console.log('Docker container initialized successfully', LogCategory.EXECUTION);
          
          // Emit connected and ready status
          this.emitEnvironmentStatus('connected', true);
        } else {
          console.log('Docker container initialization failed');
          
          // Emit error status
          this.emitEnvironmentStatus('error', false, 'Failed to initialize Docker container');
        }
        
        return container;
      })
      .catch(error => {
        this.logger?.error(
          `Error initializing Docker container: ${error.message}`,
          error instanceof Error ? error : new Error(String(error)),
          LogCategory.EXECUTION
        );
        
        // Emit error status
        this.emitEnvironmentStatus('error', false, error.message);
        throw error;
      });
  }

  /**
   * Emit environment status event
   */
  private emitEnvironmentStatus(
    status: 'initializing' | 'connecting' | 'connected' | 'disconnected' | 'error',
    isReady: boolean,
    error?: string
  ): void {
    // Skip if this status was already emitted
    if (this.lastEmittedStatus === status) {
      this.logger?.debug(
        `Skipping duplicate Docker environment status: ${status}`,
        LogCategory.EXECUTION
      );
      return;
    }
    
    // Special handling for "initializing" status - only emit if previously disconnected or error
    if (status === 'initializing' &&
        this.lastEmittedStatus &&
        !['disconnected', 'error', undefined].includes(this.lastEmittedStatus)) {
      this.logger?.debug(
        `Skipping redundant initializing status (current: ${this.lastEmittedStatus})`,
        LogCategory.EXECUTION
      );
      return;
    }
    
    // Update last emitted status
    this.lastEmittedStatus = status;
    
    const statusEvent = {
      environmentType: 'docker' as const,
      status,
      isReady,
      error
    };
    
    this.logger?.info(
      `Emitting Docker environment status: ${status}, ready=${isReady}`,
      LogCategory.EXECUTION
    );
    
    if (error) {
      this.logger?.error(`Docker environment status error: ${error}`, LogCategory.EXECUTION);
    }
    
    AgentEvents.emit(AgentEventType.ENVIRONMENT_STATUS_CHANGED, statusEvent);
  }

  /**
   * Execute a command in the Docker container
   */
  async executeCommand(
    executionId: string,
    command: string,
    workingDir?: string
  ): Promise<CommandResult> {
    try {
      // Convert working directory to container path if provided
      let containerWorkingDir;
      if (workingDir) {
        const containerInfo = await this.containerManager.getContainerInfo();
        if (!containerInfo) {
          throw new Error('Container is not available');
        }
        
        containerWorkingDir = this.toContainerPath(workingDir, containerInfo);
      }
      
      this.logger?.debug(
        `Executing command in container: ${command}`,
        LogCategory.EXECUTION
      );
      
      // Try to execute the command
      try {
        const result = await this.containerManager.executeCommand(command, containerWorkingDir);
        return result;
      } catch (error) {
        // Check if container needs to be restarted
        if (error instanceof Error && 
            (error.message.includes('container not running') ||
             error.message.includes('No such container'))) {
          this.logger?.warn('Container not running, attempting to restart', LogCategory.EXECUTION);
          
          // Update status to disconnected before restarting
          this.emitEnvironmentStatus('disconnected', false);
          
          // Try to restart container
          const containerInfo = await this.containerManager.ensureContainer();
          if (!containerInfo) {
            this.emitEnvironmentStatus('error', false, 'Failed to restart container');
            throw new Error('Failed to restart container');
          }
          
          // Reconnected successfully
          this.emitEnvironmentStatus('connected', true);
          
          // Retry command after restart
          const retryResult = await this.containerManager.executeCommand(command, containerWorkingDir);
          return retryResult;
        }
        
        // If it's not a container availability issue, rethrow
        throw error;
      }
    } catch (error) {
      this.logger?.error(
        `Error executing command in container: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error)),
        LogCategory.EXECUTION
      );
      
      return {
        stdout: '',
        stderr: `Error executing command: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: 1
      };
    }
  }

  /**
   * Read a file from the container
   */
  async readFile(
    executionId: string,
    filepath: string,
    maxSize?: number,
    lineOffset?: number,
    lineCount?: number,
    encoding?: string
  ): Promise<FileReadResult> {
    try {
      if (!encoding) {
        encoding = 'utf8';
      }
      
      if (!maxSize) {
        maxSize = 1048576; // 1MB default
      }
      
      if (!lineOffset) {
        lineOffset = 0;
      }
      
      // Get container info
      const containerInfo = await this.containerManager.getContainerInfo();
      if (!containerInfo) {
        return {
          success: false,
          path: filepath,
          error: 'Container is not available'
        };
      }
      
      // Convert to container path
      const containerPath = this.toContainerPath(filepath, containerInfo);
      
      // Check if file exists
      const { exitCode: fileExists } = await this.executeCommand(
        executionId,
        `[ -f "${containerPath}" ]`
      );
      
      if (fileExists !== 0) {
        // Format path for display
        const displayPath = this.formatPathForDisplay(filepath, containerInfo);
        return {
          success: false,
          path: filepath,
          displayPath,
          error: `File does not exist: ${displayPath}`
        };
      }
      
      // Check file size
      const { stdout: fileSizeStr } = await this.executeCommand(
        executionId,
        `stat -c %s "${containerPath}"`
      );
      
      const fileSize = parseInt(fileSizeStr.trim(), 10);
      if (isNaN(fileSize)) {
        // Format path for display
        const displayPath = this.formatPathForDisplay(filepath, containerInfo);
        return {
          success: false,
          path: filepath,
          displayPath,
          error: `Unable to determine file size: ${displayPath}`
        };
      }
      
      if (fileSize > maxSize) {
        // Format path for display
        const displayPath = this.formatPathForDisplay(filepath, containerInfo);
        return {
          success: false,
          path: filepath,
          displayPath,
          error: `File is too large (${fileSize} bytes) to read. Max size: ${maxSize} bytes`
        };
      }
      
      // Read file content with line numbers
      let command;
      if (lineOffset > 0 || lineCount !== undefined) {
        // Use head and tail with nl for pagination, starting line numbers from lineOffset+1
        command = `head -n ${lineOffset + (lineCount || 0)} "${containerPath}" | tail -n ${lineCount || '+0'} | nl -v ${lineOffset + 1}`;
      } else {
        // Use nl for the whole file
        command = `nl "${containerPath}"`;
      }
      
      const { stdout: fileContent } = await this.executeCommand(executionId, command);
      
      // Handle line pagination if requested
      if (lineOffset > 0 || lineCount !== undefined) {
        const lines = fileContent.split('\n');
        const startLine = Math.min(lineOffset, lines.length);
        const endLine = lineCount !== undefined
          ? Math.min(startLine + lineCount, lines.length)
          : lines.length;
        
        return {
          success: true,
          path: filepath,
          displayPath: this.formatPathForDisplay(filepath, containerInfo),
          content: fileContent,
          size: fileSize,
          encoding,
          pagination: {
            totalLines: lines.length,
            startLine,
            endLine,
            hasMore: endLine < lines.length
          }
        };
      }
      
      return {
        success: true,
        path: filepath,
        displayPath: this.formatPathForDisplay(filepath, containerInfo),
        content: fileContent,
        size: fileSize,
        encoding
      };
    } catch (error) {
      return {
        success: false,
        path: filepath,
        error: `Failed to read file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Write content to a file in the container
   */
  async writeFile(
    executionId: string,
    filepath: string,
    content: string,
    encoding?: string
  ): Promise<void> {
    try {
      if (!encoding) {
        encoding = 'utf8';
      }
      
      // Get container info
      const containerInfo = await this.containerManager.getContainerInfo();
      if (!containerInfo) {
        throw new Error('Container is not available');
      }
      
      // Convert to container path
      const containerPath = this.toContainerPath(filepath, containerInfo);
      
      // Ensure parent directory exists
      const dirPath = path.posix.dirname(containerPath);
      await this.executeCommand(executionId, `mkdir -p "${dirPath}"`);
      
      // Write content to a temporary file in the container
      const tempFile = `/tmp/voltagent-write-${Date.now()}.tmp`;
      
      // Write content to temp file
      await this.executeCommand(
        executionId,
        `cat > "${tempFile}" << 'VOLTAGENT_EOF'\n${content}\nVOLTAGENT_EOF`
      );
      
      // Move temp file to destination
      await this.executeCommand(executionId, `mv "${tempFile}" "${containerPath}"`);
      
      // Verify file was written
      const { exitCode } = await this.executeCommand(
        executionId,
        `[ -f "${containerPath}" ]`
      );
      
      if (exitCode !== 0) {
        throw new Error(`Failed to write file: ${filepath}`);
      }
    } catch (error) {
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Edit a file in the container by replacing content
   */
  async editFile(
    executionId: string,
    filepath: string,
    searchCode: string,
    replaceCode: string,
    encoding?: string
  ): Promise<FileEditResult> {
    try {
      if (!encoding) {
        encoding = 'utf8';
      }
      
      // Get container info
      const containerInfo = await this.containerManager.getContainerInfo();
      if (!containerInfo) {
        return {
          success: false,
          path: filepath,
          error: 'Container is not available'
        };
      }
      
      // Convert to container path
      const containerPath = this.toContainerPath(filepath, containerInfo);
      
      // Check if file exists
      const { exitCode: fileExists } = await this.executeCommand(
        executionId,
        `[ -f "${containerPath}" ]`
      );
      
      if (fileExists !== 0) {
        return {
          success: false,
          path: filepath,
          error: `File does not exist: ${this.formatPathForDisplay(filepath, containerInfo)}`
        };
      }
      
      // Read original file content
      const { stdout: originalContent } = await this.executeCommand(
        executionId,
        `cat "${containerPath}"`
      );
      
      // Normalize line endings to ensure consistent handling
      const normalizedContent = originalContent.replace(/\r\n/g, '\n');
      const normalizedSearchCode = searchCode.replace(/\r\n/g, '\n');
      const normalizedReplaceCode = replaceCode.replace(/\r\n/g, '\n');
      
      // Count occurrences of the search code in the normalized content
      const occurrences = normalizedContent.split(normalizedSearchCode).length - 1;
      
      if (occurrences === 0) {
        return {
          success: false,
          path: filepath,
          error: `Search code not found in file: ${this.formatPathForDisplay(filepath, containerInfo)}`
        };
      }
      
      if (occurrences > 1) {
        return {
          success: false,
          path: filepath,
          error: `Found ${occurrences} instances of the search code. Please provide a more specific search code that matches exactly once.`
        };
      }
      
      // Create temporary files for search and replace
      const tempSearchFile = `/tmp/voltagent-search-${Date.now()}.tmp`;
      const tempReplaceFile = `/tmp/voltagent-replace-${Date.now()}.tmp`;
      const tempOutputFile = `/tmp/voltagent-output-${Date.now()}.tmp`;
      
      // Write search and replace content to temp files
      await this.executeCommand(
        executionId,
        `cat > "${tempSearchFile}" << 'VOLTAGENT_SEARCH_EOF'\n${normalizedSearchCode}\nVOLTAGENT_SEARCH_EOF`
      );
      
      await this.executeCommand(
        executionId,
        `cat > "${tempReplaceFile}" << 'VOLTAGENT_REPLACE_EOF'\n${normalizedReplaceCode}\nVOLTAGENT_REPLACE_EOF`
      );
      
      // Use sed to perform the replacement
      const sedCommand = `sed "s/$(cat ${tempSearchFile} | sed 's/[/]/\\\\\\//g')/$(cat ${tempReplaceFile} | sed 's/[/]/\\\\\\//g')/g" "${containerPath}" > "${tempOutputFile}"`;
      
      const { exitCode: sedExitCode, stderr: sedError } = await this.executeCommand(
        executionId,
        sedCommand
      );
      
      if (sedExitCode !== 0) {
        return {
          success: false,
          path: filepath,
          error: `Failed to edit file: ${sedError}`
        };
      }
      
      // Read the new content
      const { stdout: newContent } = await this.executeCommand(
        executionId,
        `cat "${tempOutputFile}"`
      );
      
      // Check if the content actually changed
      if (newContent === originalContent) {
        return {
          success: false,
          path: filepath,
          error: `No changes were made to the file. The search and replace operation did not modify the content.`
        };
      }
      
      // Write the new content back to the original file
      await this.executeCommand(
        executionId,
        `mv "${tempOutputFile}" "${containerPath}"`
      );
      
      // Clean up temp files
      await this.executeCommand(
        executionId,
        `rm -f "${tempSearchFile}" "${tempReplaceFile}"`
      );
      
      return {
        success: true,
        path: filepath,
        originalContent,
        newContent
      };
    } catch (error) {
      return {
        success: false,
        path: filepath,
        error: `Failed to edit file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * List files in a directory in the container
   */
  async ls(
    executionId: string,
    dirPath: string,
    showHidden = false,
    details = false
  ): Promise<DirectoryListResult> {
    try {
      // Get container info
      const containerInfo = await this.containerManager.getContainerInfo();
      if (!containerInfo) {
        return {
          success: false,
          path: dirPath,
          error: 'Container is not available'
        };
      }
      
      // Convert to container path
      const containerPath = this.toContainerPath(dirPath, containerInfo);
      
      // Check if directory exists
      const { exitCode: dirExists } = await this.executeCommand(
        executionId,
        `[ -d "${containerPath}" ]`
      );
      
      if (dirExists !== 0) {
        return {
          success: false,
          path: dirPath,
          error: `Directory does not exist: ${this.formatPathForDisplay(dirPath, containerInfo)}`
        };
      }
      
      // List directory contents
      const lsCommand = showHidden
        ? `ls -la "${containerPath}" | tail -n +4`  // Skip . and .. entries
        : `ls -la "${containerPath}" | grep -v "^d" | grep -v "^\\." | tail -n +4`; // Skip hidden files and . and .. entries
      
      const { stdout: lsOutput } = await this.executeCommand(executionId, lsCommand);
      
      // Parse ls output
      const entries = lsOutput.split('\n')
        .filter(line => line.trim().length > 0)
        .map(line => {
          const parts = line.trim().split(/\s+/);
          const permissions = parts[0];
          const size = parseInt(parts[4], 10);
          const name = parts.slice(8).join(' ');
          
          const isDirectory = permissions.startsWith('d');
          const isSymbolicLink = permissions.startsWith('l');
          const isFile = !isDirectory && !isSymbolicLink;
          
          if (details) {
            return {
              name,
              type: isDirectory ? 'directory' : isFile ? 'file' : 'symlink',
              size,
              isDirectory,
              isFile,
              isSymbolicLink
            };
          } else {
            return {
              name,
              isDirectory,
              isFile,
              isSymbolicLink
            };
          }
        });
      
      return {
        success: true,
        path: dirPath,
        entries,
        count: entries.length
      };
    } catch (error) {
      return {
        success: false,
        path: dirPath,
        error: `Failed to list directory: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Find files matching a glob pattern in the container
   */
  async glob(
    executionId: string,
    pattern: string,
    options?: any
  ): Promise<string[]> {
    try {
      // Get container info
      const containerInfo = await this.containerManager.getContainerInfo();
      if (!containerInfo) {
        throw new Error('Container is not available');
      }
      
      // Use find command to glob files
      const { stdout } = await this.executeCommand(
        executionId,
        `find ${containerInfo.workspacePath} -path "${pattern}" -type f | sort`
      );
      
      return stdout.split('\n').filter(line => line.trim().length > 0);
    } catch (error) {
      this.logger?.error(
        `Error globbing files in container: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error)),
        LogCategory.EXECUTION
      );
      return [];
    }
  }

  /**
   * Convert a host path to a container path
   */
  private toContainerPath(hostPath: string, containerInfo: DockerContainerInfo): string {
    // If path is already a container path starting with workspace path, return as is
    if (hostPath === containerInfo.workspacePath ||
        (hostPath.startsWith(containerInfo.workspacePath) &&
         (hostPath.length === containerInfo.workspacePath.length ||
          hostPath[containerInfo.workspacePath.length] === '/'))) {
      return hostPath;
    }
    
    if (hostPath.startsWith('/tmp/')) {
      return hostPath;
    }
    
    // Ensure absolute path – if the caller provided a relative path we treat
    // it as relative to the *project* root that was detected by the
    // DockerContainerManager instead of resolving it against `process.cwd()`.
    // This makes sure tools like FileReadTool, FileEditTool, FileWriteTool and
    // BashTool behave consistently regardless of where the JS process was
    // launched from (e.g. inside node_modules when installed as a dependency).
    const absolutePath = path.isAbsolute(hostPath)
      ? hostPath
      : path.resolve(containerInfo.projectPath, hostPath);
    
    // Check if path is within project directory
    if (absolutePath.startsWith(containerInfo.projectPath)) {
      return path.join(
        containerInfo.workspacePath,
        path.relative(containerInfo.projectPath, absolutePath)
      );
    }
    
    // For paths outside project directory, throw error
    throw new Error(`Path is outside project directory: ${hostPath}`);
  }

  /**
   * Convert a container path to a host path
   */
  private toHostPath(containerPath: string, containerInfo: DockerContainerInfo): string {
    if (containerPath.startsWith(containerInfo.workspacePath)) {
      return path.join(
        containerInfo.projectPath,
        containerPath.substring(containerInfo.workspacePath.length + 1)
      );
    }
    
    return containerPath;
  }

  /**
   * Format a path for display by converting absolute paths to relative ones
   * This is used in tool results to show more user-friendly paths
   */
  private formatPathForDisplay(absolutePath: string, containerInfo: DockerContainerInfo): string {
    // If it's a container path, convert to relative project path
    if (absolutePath.startsWith(containerInfo.workspacePath)) {
      return path.posix.relative(containerInfo.workspacePath, absolutePath);
    }
    
    // If it's a host path, try to make it relative to the project directory
    if (absolutePath.startsWith(containerInfo.projectPath)) {
      return path.relative(containerInfo.projectPath, absolutePath);
    }
    
    // If path is outside known directories, return as is
    return absolutePath;
  }

  /**
   * Check if a path is within the working directory
   */
  private isPathWithinWorkingDir(filepath: string, containerInfo: DockerContainerInfo): boolean {
    // Only allow paths within /workspace or /tmp
    return filepath.startsWith(containerInfo.workspacePath) || filepath.startsWith('/tmp/');
  }

  /**
   * Generates a structured directory map for the specified path
   */
  async generateDirectoryMap(
    rootPath: string,
    maxDepth = 10
  ): Promise<string> {
    try {
      console.log(`DockerExecutionAdapter: Generating directory map for ${rootPath} with max depth ${maxDepth}`);
      
      // Get container info
      const containerInfo = await this.containerManager.getContainerInfo();
      if (!containerInfo) {
        throw new Error('Container is not available');
      }
      
      // Convert to container path
      const containerPath = this.toContainerPath(rootPath, containerInfo);
      
      // Use find command to generate directory structure
      const { stdout, stderr, exitCode } = await this.executeCommand(
        'docker-directory-mapper',
        `find "${containerPath}" -type d -not -path "*/node_modules/*" -not -path "*/\\.git/*" -not -path "*/\\.*" | sort`
      );
      
      if (exitCode !== 0) {
        throw new Error(`Failed to generate directory structure: ${stderr}`);
      }
      
      // Process the output into a tree structure
      const lines = stdout.split('\n').filter(line => line.trim().length > 0);
      let result = `<context name="directoryStructure">Below is a snapshot of this project's file structure at the start of the conversation. This snapshot will NOT update during the conversation. It skips over .gitignore patterns.\n\n`;
      
      for (const line of lines) {
        const relativePath = path.posix.relative(containerPath, line);
        if (!relativePath) continue; // Skip root path
        
        const depth = relativePath.split('/').length;
        if (depth > maxDepth) continue; // Skip if too deep
        
        const indent = '  '.repeat(depth);
        const dirName = path.posix.basename(line);
        result += `${indent}- ${dirName}/\n`;
      }
      
      result += `</context>`;
      return result;
    } catch (error) {
      console.error(`DockerExecutionAdapter: Error generating directory map: ${error instanceof Error ? error.message : String(error)}`);
      
      // Return a basic fallback structure on error
      return `<context name="directoryStructure">Below is a snapshot of this project's file structure at the start of the conversation. This snapshot will NOT update during the conversation. It skips over .gitignore patterns.\n\n- ${rootPath}/\n  - (Error mapping directory structure)\n</context>`;
    }
  }

  /**
   * Retrieves git repository information for the current directory in the container
   */
  async getGitRepositoryInfo() {
    try {
      // Check if container is ready
      const containerInfo = await this.containerManager.getContainerInfo();
      if (!containerInfo) {
        this.logger?.warn(
          'Container is not ready, cannot get git repository information',
          LogCategory.EXECUTION
        );
        return null;
      }
      
      // Get container working directory
      const workingDir = containerInfo.workspacePath;
      
      // Use the GitInfoHelper with a custom command executor that prepends cd workingDir
      return await this.gitInfoHelper.getGitRepositoryInfo(async (command) => {
        // Prepend cd to the working directory for all git commands
        const containerCommand = `cd "${workingDir}" && ${command}`;
        return await this.executeCommand('docker-git-info', containerCommand);
      });
    } catch (error) {
      this.logger?.error(
        'Error retrieving git repository information from container:',
        error instanceof Error ? error : new Error(String(error)),
        LogCategory.EXECUTION
      );
      return null;
    }
  }
}

