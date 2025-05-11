/**
 * E2BExecutionAdapter.ts
 * 
 * Execution adapter that runs commands in an E2B sandbox
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
import { GitInfoHelper } from './GitInfoHelper';

// Define the minimal interface needed from the E2B SDK
interface E2BSandbox {
  files: {
    read: (path: string) => Promise<string>;
    write: (path: string, content: string) => Promise<void>;
    exists: (path: string) => Promise<boolean>;
    list: (path: string) => Promise<Array<{ name: string; type: string }>>;
  };
  commands: {
    run: (command: string, options?: { cwd?: string }) => Promise<CommandResult>;
  };
}

/**
 * Execution adapter that runs commands in an E2B sandbox
 */
export class E2BExecutionAdapter implements ExecutionAdapter {
  private sandbox: E2BSandbox;
  private logger?: Logger;
  private gitInfoHelper: GitInfoHelper;

  constructor(sandbox: E2BSandbox, options?: { logger?: Logger }) {
    this.sandbox = sandbox;
    this.logger = options?.logger;
    
    // Initialize git helper with same logger
    this.gitInfoHelper = new GitInfoHelper({ logger: this.logger });
    
    // Emit connected status since the sandbox is already connected at this point
    this.emitEnvironmentStatus('connected', true);
  }

  /**
   * Emit environment status event
   */
  private emitEnvironmentStatus(
    status: 'initializing' | 'connecting' | 'connected' | 'disconnected' | 'error',
    isReady: boolean,
    error?: string
  ): void {
    const statusEvent = {
      environmentType: 'e2b' as const,
      status,
      isReady,
      error
    };
    
    this.logger?.info(
      `Emitting E2B environment status: ${status}, ready=${isReady}`,
      LogCategory.EXECUTION
    );
    
    AgentEvents.emit(AgentEventType.ENVIRONMENT_STATUS_CHANGED, statusEvent);
  }

  /**
   * Creates a new E2BExecutionAdapter instance with a connected sandbox
   * @param sandboxId The ID of the sandbox to connect to
   * @param options Optional configuration options
   * @returns A fully initialized E2BExecutionAdapter
   * @throws Error if connection to the sandbox fails
   */
  static async create(
    sandboxId: string,
    options?: { logger?: Logger }
  ): Promise<E2BExecutionAdapter> {
    try {
      // Emit initializing status before connecting
      if (options?.logger) {
        options.logger.info('E2B sandbox connecting...', LogCategory.EXECUTION);
      }
      
      // Emit event from static context before instance is created
      const initStatusEvent = {
        environmentType: 'e2b' as const,
        status: 'connecting' as const,
        isReady: false
      };
      
      AgentEvents.emit(AgentEventType.ENVIRONMENT_STATUS_CHANGED, initStatusEvent);
      
      // Import the E2B SDK dynamically
      let e2bSdk;
      try {
        e2bSdk = await import('e2b');
      } catch (importError) {
        throw new Error(`Failed to import E2B SDK: ${importError instanceof Error ? importError.message : String(importError)}. Make sure the 'e2b' package is installed.`);
      }
      
      // Connect to the sandbox
      const sandbox = await e2bSdk.Sandbox.connect(sandboxId);
      
      return new E2BExecutionAdapter(sandbox, options);
    } catch (error) {
      if (options?.logger) {
        options.logger.error(
          'Failed to connect to E2B sandbox:',
          error instanceof Error ? error : new Error(String(error)),
          LogCategory.EXECUTION
        );
      } else {
        console.error('Failed to connect to E2B sandbox:', error);
      }
      
      // Emit error status from static context
      const errorStatusEvent = {
        environmentType: 'e2b' as const,
        status: 'error' as const,
        isReady: false,
        error: error instanceof Error ? error.message : String(error)
      };
      
      AgentEvents.emit(AgentEventType.ENVIRONMENT_STATUS_CHANGED, errorStatusEvent);
      
      throw error;
    }
  }

  /**
   * Read a file from the E2B sandbox
   */
  async readFile(
    executionId: string,
    filepath: string,
    maxSize?: number,
    lineOffset?: number,
    lineCount?: number,
    encoding?: string
  ): Promise<FileReadResult> {
    if (!encoding) {
      encoding = 'utf8';
    }
    
    if (!maxSize) {
      maxSize = 1048576;
    }
    
    if (!lineOffset) {
      lineOffset = 0;
    }
    
    if (!lineCount) {
      lineCount = undefined;
    }
    
    try {
      const exists = await this.sandbox.files.exists(filepath);
      if (!exists) {
        return {
          success: false,
          path: filepath,
          error: `File does not exist: ${filepath}`
        };
      }
      
      let fileContent = '';
      if (lineOffset > 0 || lineCount !== undefined) {
        // Use head and tail with nl for pagination, starting line numbers from lineOffset+1
        const { stdout } = await this.sandbox.commands.run(
          `head -n ${lineOffset + (lineCount || 0)} "${filepath}" | tail -n ${lineCount || '+0'} | nl -v ${lineOffset + 1}`
        );
        fileContent = stdout;
      } else {
        // Use nl for the whole file
        const { stdout } = await this.sandbox.commands.run(`nl "${filepath}"`);
        fileContent = stdout;
      }
      
      // Handle line pagination if requested
      if (lineOffset > 0 || lineCount !== undefined) {
        const lines = fileContent.split('\n');
        const startLine = Math.min(lineOffset, lines.length);
        const endLine = lineCount !== undefined
          ? Math.min(startLine + lineCount, lines.length)
          : lines.length;
        
        fileContent = lines.slice(startLine, endLine).join('\n');
        
        return {
          success: true,
          path: filepath,
          content: fileContent,
          size: fileContent.length,
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
        content: fileContent,
        size: fileContent.length,
        encoding
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      throw new Error(`Failed to read file: ${err.message}`);
    }
  }

  /**
   * Write content to a file in the E2B sandbox
   */
  async writeFile(
    executionId: string,
    filepath: string,
    content: string,
    encoding?: string
  ): Promise<void> {
    await this.sandbox.files.write(filepath, content);
  }

  /**
   * Execute a command in the E2B sandbox
   */
  async executeCommand(
    executionId: string,
    command: string,
    workingDir?: string
  ): Promise<CommandResult> {
    return await this.sandbox.commands.run(command, { cwd: workingDir });
  }

  /**
   * Find files matching a glob pattern in the E2B sandbox
   */
  async glob(
    executionId: string,
    pattern: string,
    _options?: any
  ): Promise<string[]> {
    try {
      // First try using the glob command if it exists
      const globCheck = await this.sandbox.commands.run('which glob || echo "not_found"');
      
      if (!globCheck.stdout.includes('not_found')) {
        // If glob command exists, use it
        const result = await this.sandbox.commands.run(`glob "${pattern}"`);
        return result.stdout.trim().split('\n').filter((line) => line.length > 0);
      } else {
        // Fall back to find command
        const result = await this.sandbox.commands.run(
          `find . -type f -path "${pattern}" -not -path "*/node_modules/*" -not -path "*/\\..*"`
        );
        return result.stdout.trim().split('\n').filter((line) => line.length > 0);
      }
    } catch {
      // If any error occurs, fall back to the most basic implementation
      const result = await this.sandbox.commands.run(`ls -la ${pattern}`);
      return result.stdout.trim().split('\n').filter((line) => line.length > 0);
    }
  }

  /**
   * Edit a file in the E2B sandbox by replacing content
   */
  async editFile(
    executionId: string,
    filepath: string,
    searchCode: string,
    replaceCode: string,
    encoding?: string
  ): Promise<FileEditResult> {
    if (!encoding) {
      encoding = 'utf8';
    }
    
    try {
      const exists = await this.sandbox.files.exists(filepath);
      if (!exists) {
        return {
          success: false,
          path: filepath,
          error: `File does not exist: ${filepath}`
        };
      }
      
      const fileContent = await this.sandbox.files.read(filepath);
      
      // Normalize line endings to ensure consistent handling
      const normalizedContent = fileContent.replace(/\r\n/g, '\n');
      const normalizedSearchCode = searchCode.replace(/\r\n/g, '\n');
      const normalizedReplaceCode = replaceCode.replace(/\r\n/g, '\n');
      
      // Count occurrences of the search code in the normalized content
      const occurrences = normalizedContent.split(normalizedSearchCode).length - 1;
      
      if (occurrences === 0) {
        return {
          success: false,
          path: filepath,
          error: `Search code not found in file: ${filepath}`
        };
      }
      
      if (occurrences > 1) {
        return {
          success: false,
          path: filepath,
          error: `Found ${occurrences} instances of the search code. Please provide a more specific search code that matches exactly once.`
        };
      }
      
      // Use a more robust replacement approach
      // First, find the exact position of the search code
      const searchIndex = normalizedContent.indexOf(normalizedSearchCode);
      if (searchIndex === -1) {
        // This should not happen since we already checked occurrences
        return {
          success: false,
          path: filepath,
          error: `Internal error: Search code not found despite occurrence check`
        };
      }
      
      // Extract the parts before and after the search code
      const prefixContent = normalizedContent.substring(0, searchIndex);
      const suffixContent = normalizedContent.substring(searchIndex + normalizedSearchCode.length);
      
      // Construct the new content by joining the parts with the replacement in between
      const newContent = prefixContent + normalizedReplaceCode + suffixContent;
      
      // Add diagnostic logging for newline debugging
      this.logger?.debug('E2B file edit newline preservation check:', LogCategory.EXECUTION, {
        searchEndsWithNewline: normalizedSearchCode.endsWith('\n'),
        replaceEndsWithNewline: normalizedReplaceCode.endsWith('\n'),
        suffixStartsWithNewline: suffixContent.startsWith('\n')
      });
      
      await this.sandbox.files.write(filepath, newContent);
      
      return {
        success: true,
        path: filepath,
        originalContent: fileContent,
        newContent: newContent
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      return {
        success: false,
        path: filepath,
        error: err.message
      };
    }
  }

  /**
   * List files in a directory in the E2B sandbox
   */
  async ls(
    executionId: string,
    dirPath: string,
    showHidden = false,
    details = false
  ): Promise<DirectoryListResult> {
    try {
      const exists = await this.sandbox.files.exists(dirPath);
      if (!exists) {
        return {
          success: false,
          path: dirPath,
          error: `Directory does not exist: ${dirPath}`
        };
      }
      
      // Read directory contents
      this.logger?.debug(`Listing directory: ${dirPath}`, LogCategory.EXECUTION);
      const entries = await this.sandbox.files.list(dirPath);
      
      // Filter hidden files if needed
      const filteredEntries = showHidden
        ? entries
        : entries.filter((entry) => !entry.name.startsWith('.'));
      
      // Format the results
      let results;
      if (details) {
        // Get detailed information for all entries in a single command
        // This is much more efficient than making individual stat calls
        const filePaths = filteredEntries.map((entry) => path.join(dirPath, entry.name));
        
        // Create a temporary script to get stats for all files at once
        const scriptContent = `
          for path in ${filePaths.map((p) => `"${p}"`).join(' ')}; do
            if [ -e "$path" ]; then
              stat -c "%n|%F|%s|%Y|%Z" "$path"
            fi
          done
        `;
        
        const { stdout } = await this.sandbox.commands.run(scriptContent);
        
        // Parse the output
        const statsMap = new Map();
        stdout.trim().split('\n').forEach((line) => {
          const [name, type, size, mtime, ctime] = line.split('|');
          if (name && type) {
            statsMap.set(name, {
              type,
              size: parseInt(size, 10),
              mtime: parseInt(mtime, 10),
              ctime: parseInt(ctime, 10)
            });
          }
        });
        
        // Build results
        results = filteredEntries.map((entry) => {
          const entryPath = path.join(dirPath, entry.name);
          const stats = statsMap.get(entryPath);
          
          if (stats) {
            return {
              name: entry.name,
              type: stats.type,
              size: stats.size,
              modified: new Date(stats.mtime * 1000),
              created: new Date(stats.ctime * 1000),
              isDirectory: stats.type === 'directory',
              isFile: stats.type === 'regular file',
              isSymbolicLink: stats.type === 'symbolic link'
            };
          } else {
            // Fallback to basic info if stats not available
            return {
              name: entry.name,
              type: entry.type,
              isDirectory: entry.type === 'dir',
              isFile: entry.type === 'file',
              isSymbolicLink: false
            };
          }
        });
      } else {
        // Simple listing
        results = filteredEntries.map((entry) => ({
          name: entry.name,
          type: entry.type,
          isDirectory: entry.type === 'dir',
          isFile: entry.type === 'file',
          isSymbolicLink: false // E2B doesn't give a way to check
        }));
      }
      
      return {
        success: true,
        path: dirPath,
        entries: results,
        count: results.length
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      return {
        success: false,
        path: dirPath,
        error: err.message
      };
    }
  }

  /**
   * Generates a structured directory map for the specified path
   */
  async generateDirectoryMap(
    rootPath: string,
    maxDepth = 10
  ): Promise<string> {
    try {
      console.log(`E2BExecutionAdapter: Generating directory map for ${rootPath} with max depth ${maxDepth}`);
      
      // Use find command to generate directory structure
      const { stdout, stderr, exitCode } = await this.sandbox.commands.run(
        `find "${rootPath}" -type d -not -path "*/node_modules/*" -not -path "*/\\.git/*" -not -path "*/\\.*" | sort`
      );
      
      if (exitCode !== 0) {
        throw new Error(`Failed to generate directory structure: ${stderr}`);
      }
      
      // Process the output into a tree structure
      const lines = stdout.split('\n').filter(line => line.trim().length > 0);
      let result = `<context name="directoryStructure">Below is a snapshot of this project's file structure at the start of the conversation. This snapshot will NOT update during the conversation. It skips over .gitignore patterns.\n\n`;
      
      for (const line of lines) {
        const relativePath = path.posix.relative(rootPath, line);
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
      console.error(`E2BExecutionAdapter: Error generating directory map: ${error instanceof Error ? error.message : String(error)}`);
      
      // Return a basic fallback structure on error
      return `<context name="directoryStructure">Below is a snapshot of this project's file structure at the start of the conversation. This snapshot will NOT update during the conversation. It skips over .gitignore patterns.\n\n- ${rootPath}/\n  - (Error mapping directory structure)\n</context>`;
    }
  }

  /**
   * Retrieves git repository information for the current directory in the E2B sandbox
   */
  async getGitRepositoryInfo() {
    try {
      // Get the default working directory in E2B (typically /home/user or similar)
      const workingDir = '/home/user';
      
      // Use the GitInfoHelper with a custom command executor that prepends cd workingDir
      return await this.gitInfoHelper.getGitRepositoryInfo(async (command) => {
        // Prepend cd to the working directory for all git commands
        const sandboxCommand = `cd "${workingDir}" && ${command}`;
        const result = await this.sandbox.commands.run(sandboxCommand);
        return result;
      });
    } catch (error) {
      this.logger?.error(
        'Error retrieving git repository information from E2B sandbox:',
        error instanceof Error ? error : new Error(String(error)),
        LogCategory.EXECUTION
      );
      return null;
    }
  }
}

