/**
 * LocalExecutionAdapter.ts
 * 
 * Execution adapter that runs commands locally on the host machine
 */

import { exec } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';
import path from 'path';
import { glob } from 'glob';
import os from 'os';

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

// Promisify node.js functions
const execAsync = promisify(exec);
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const mkdtempAsync = promisify(fs.mkdtemp);
const mkdirAsync = promisify(fs.mkdir);
const globAsync = promisify(glob);

/**
 * Execution adapter that runs commands locally on the host machine
 */
export class LocalExecutionAdapter implements ExecutionAdapter {
  private logger?: Logger;
  private gitInfoHelper: GitInfoHelper;

  constructor(options?: { logger?: Logger }) {
    this.logger = options?.logger;
    
    // Initialize git helper with same logger
    this.gitInfoHelper = new GitInfoHelper({ logger: this.logger });
    
    // Emit environment status as ready immediately for local adapter
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
      environmentType: 'local' as const,
      status,
      isReady,
      error
    };
    
    this.logger?.info(
      `Emitting local environment status: ${status}, ready=${isReady}`,
      LogCategory.EXECUTION
    );
    
    AgentEvents.emit(AgentEventType.ENVIRONMENT_STATUS_CHANGED, statusEvent);
  }

  /**
   * Execute a command locally
   */
  async executeCommand(
    executionId: string,
    command: string,
    workingDir?: string
  ): Promise<CommandResult> {
    try {
      const options = workingDir ? { cwd: workingDir } : undefined;
      const result = await execAsync(command, options);
      
      return {
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString(),
        exitCode: 0
      };
    } catch (error) {
      if (error instanceof Error) {
        return {
          stdout: '',
          stderr: error.message,
          exitCode: 1
        };
      }
      
      return {
        stdout: '',
        stderr: 'Unknown error',
        exitCode: 1
      };
    }
  }

  /**
   * Edit a file by replacing content
   * Uses a binary-safe approach to handle files with special characters and line endings
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
      // Resolve the path
      const resolvedPath = path.resolve(filepath);
      
      // Check if file exists
      let fileContent = '';
      try {
        const stats = await fs.promises.stat(resolvedPath);
        if (!stats.isFile()) {
          return {
            success: false,
            path: filepath,
            error: `Path exists but is not a file: ${filepath}`
          };
        }
        
        // Read file content for analysis
        fileContent = (await readFileAsync(resolvedPath, encoding)).toString();
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === 'ENOENT') {
          return {
            success: false,
            path: filepath,
            error: `File does not exist: ${filepath}`
          };
        } else {
          throw error; // Re-throw unexpected errors
        }
      }
      
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
      
      // Use string replacement with careful handling of newlines
      const searchIndex = normalizedContent.indexOf(normalizedSearchCode);
      if (searchIndex === -1) {
        throw new Error(`Search pattern not found in file: ${filepath}`);
      }
      
      const prefixContent = normalizedContent.substring(0, searchIndex);
      const suffixContent = normalizedContent.substring(searchIndex + normalizedSearchCode.length);
      
      // Construct the new content with proper newline preservation
      const newContent = prefixContent + normalizedReplaceCode + suffixContent;
      
      // Add diagnostic logging for newline debugging
      this.logger?.debug('File edit newline preservation check:', LogCategory.EXECUTION, {
        searchEndsWithNewline: normalizedSearchCode.endsWith('\n'),
        replaceEndsWithNewline: normalizedReplaceCode.endsWith('\n'),
        suffixStartsWithNewline: suffixContent.startsWith('\n')
      });
      
      // Write the updated content back to the original file
      await writeFileAsync(resolvedPath, newContent, encoding);
      
      return {
        success: true,
        path: resolvedPath,
        originalContent: fileContent,
        newContent
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger?.error(`Error editing file: ${err.message}`, err, LogCategory.EXECUTION);
      
      return {
        success: false,
        path: filepath,
        error: `Failed to edit file: ${err.message}`
      };
    }
  }

  /**
   * Read a file from the local filesystem
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
      maxSize = 1048576; // 1MB default
    }
    
    if (!lineOffset) {
      lineOffset = 0;
    }
    
    try {
      // Resolve the path
      const resolvedPath = path.resolve(filepath);
      
      // Check if file exists and get stats
      let stats: fs.Stats;
      try {
        stats = await fs.promises.stat(resolvedPath);
        if (!stats.isFile()) {
          return {
            success: false,
            path: filepath,
            error: `Path exists but is not a file: ${filepath}`
          };
        }
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === 'ENOENT') {
          return {
            success: false,
            path: filepath,
            error: `File does not exist: ${filepath}`
          };
        } else {
          throw error; // Re-throw unexpected errors
        }
      }
      
      // Check file size
      if (stats.size > maxSize) {
        return {
          success: false,
          path: filepath,
          error: `File is too large (${stats.size} bytes) to read. Max size: ${maxSize} bytes`
        };
      }
      
      // Read file content
      const content = (await readFileAsync(resolvedPath, encoding)).toString();
      
      // Handle line pagination if requested
      if (lineOffset > 0 || lineCount !== undefined) {
        const lines = content.split('\n');
        const startLine = Math.min(lineOffset, lines.length);
        const endLine = lineCount !== undefined
          ? Math.min(startLine + lineCount, lines.length)
          : lines.length;
        
        const paginatedContent = lines.slice(startLine, endLine).join('\n');
        
        return {
          success: true,
          path: resolvedPath,
          content: paginatedContent,
          size: stats.size,
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
        path: resolvedPath,
        content,
        size: stats.size,
        encoding
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger?.error(`Error reading file: ${err.message}`, err, LogCategory.EXECUTION);
      
      return {
        success: false,
        path: filepath,
        error: `Failed to read file: ${err.message}`
      };
    }
  }

  /**
   * Write content to a file
   * Uses a more robust approach for handling larger files
   */
  async writeFile(
    executionId: string,
    filePath: string,
    content: string,
    encoding?: string
  ): Promise<void> {
    if (!encoding) {
      encoding = 'utf8';
    }
    
    try {
      // Resolve the file path
      const resolvedPath = path.resolve(filePath);
      
      // Ensure parent directory exists
      const dirPath = path.dirname(resolvedPath);
      try {
        await fs.promises.access(dirPath);
      } catch (err) {
        // Create directory if it doesn't exist
        await mkdirAsync(dirPath, { recursive: true });
      }
      
      // For smaller files, write directly
      if (content.length < 1048576) { // 1MB threshold
        await writeFileAsync(resolvedPath, content, encoding);
      } else {
        // For larger files, use a temporary file approach to avoid memory issues
        this.logger?.debug(
          `Using chunked approach for large file (${content.length} bytes): ${filePath}`,
          LogCategory.EXECUTION
        );
        
        // Create a temporary file
        const tempDir = await mkdtempAsync(path.join(os.tmpdir(), 'voltagent-write-'));
        const tempFile = path.join(tempDir, 'temp_content');
        
        try {
          // Write content to temp file
          await writeFileAsync(tempFile, content, encoding);
          
          // Verify temp file size
          const stats = await fs.promises.stat(tempFile);
          if (stats.size === 0) {
            throw new Error(`Failed to write temporary file: file size is 0 bytes`);
          }
          
          // Copy temp file to destination
          await fs.promises.copyFile(tempFile, resolvedPath);
          
          // Verify destination file
          const finalStats = await fs.promises.stat(resolvedPath);
          this.logger?.debug(`File write successful: ${filePath}`, LogCategory.EXECUTION, {
            contentLength: content.length,
            fileSize: finalStats.size
          });
        } finally {
          // Clean up temp directory
          await this.executeCommand(executionId, `rm -rf "${tempDir}"`).catch(() => {
            // Ignore cleanup errors
          });
        }
      }
    } catch (error) {
      throw new Error(`Failed to write file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * List files in a directory
   */
  async ls(
    executionId: string,
    dirPath: string,
    showHidden = false,
    details = false
  ): Promise<DirectoryListResult> {
    try {
      // Resolve the path
      const resolvedPath = path.resolve(dirPath);
      
      // Check if directory exists
      try {
        const stats = await fs.promises.stat(resolvedPath);
        if (!stats.isDirectory()) {
          return {
            success: false,
            path: dirPath,
            error: `Path exists but is not a directory: ${dirPath}`
          };
        }
      } catch {
        return {
          success: false,
          path: dirPath,
          error: `Directory does not exist: ${dirPath}`
        };
      }
      
      // Read directory contents
      this.logger?.debug(`Listing directory: ${resolvedPath}`, LogCategory.EXECUTION);
      const entries = await fs.promises.readdir(resolvedPath, { withFileTypes: true });
      
      // Filter hidden files if needed
      const filteredEntries = showHidden
        ? entries
        : entries.filter(entry => !entry.name.startsWith('.'));
      
      // Format the results
      let results;
      if (details) {
        // Get detailed information for all entries more efficiently
        results = [];
        for (const entry of filteredEntries) {
          const entryPath = path.join(resolvedPath, entry.name);
          try {
            const stats = await fs.promises.stat(entryPath);
            results.push({
              name: entry.name,
              type: entry.isDirectory() ? 'directory' :
                entry.isFile() ? 'file' :
                  entry.isSymbolicLink() ? 'symlink' : 'other',
              size: stats.size,
              modified: stats.mtime,
              created: stats.birthtime,
              isDirectory: entry.isDirectory(),
              isFile: entry.isFile(),
              isSymbolicLink: entry.isSymbolicLink()
            });
          } catch (err) {
            results.push({
              name: entry.name,
              isDirectory: false,
              isFile: false,
              isSymbolicLink: false,
              error: err instanceof Error ? err.message : String(err)
            });
          }
        }
      } else {
        // Simple listing
        results = filteredEntries.map(entry => ({
          name: entry.name,
          isDirectory: entry.isDirectory(),
          isFile: entry.isFile(),
          isSymbolicLink: entry.isSymbolicLink()
        }));
      }
      
      return {
        success: true,
        path: resolvedPath,
        entries: results,
        count: results.length
      };
    } catch (error) {
      this.logger?.error(
        `Error listing directory: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error)),
        LogCategory.EXECUTION
      );
      
      return {
        success: false,
        path: dirPath,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Find files matching a glob pattern
   */
  async glob(
    executionId: string,
    pattern: string,
    options?: any
  ): Promise<string[]> {
    try {
      return await globAsync(pattern, options || {});
    } catch (error) {
      this.logger?.error(
        `Error globbing files: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : new Error(String(error)),
        LogCategory.EXECUTION
      );
      return [];
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
      console.log(`LocalExecutionAdapter: Generating directory map for ${rootPath} with max depth ${maxDepth}`);
      
      // Use find command to generate directory structure
      const { stdout, stderr, exitCode } = await this.executeCommand(
        'local-directory-mapper',
        `find "${rootPath}" -type d -not -path "*/node_modules/*" -not -path "*/\\.git/*" -not -path "*/\\.*" | sort`
      );
      
      if (exitCode !== 0) {
        throw new Error(`Failed to generate directory structure: ${stderr}`);
      }
      
      // Process the output into a tree structure
      const lines = stdout.split('\n').filter(line => line.trim().length > 0);
      let result = `<context name="directoryStructure">Below is a snapshot of this project's file structure at the start of the conversation. This snapshot will NOT update during the conversation. It skips over .gitignore patterns.\n\n`;
      
      for (const line of lines) {
        const relativePath = path.relative(rootPath, line);
        if (!relativePath) continue; // Skip root path
        
        const depth = relativePath.split(path.sep).length;
        if (depth > maxDepth) continue; // Skip if too deep
        
        const indent = '  '.repeat(depth);
        const dirName = path.basename(line);
        result += `${indent}- ${dirName}/\n`;
      }
      
      result += `</context>`;
      return result;
    } catch (error) {
      console.error(`LocalExecutionAdapter: Error generating directory map: ${error instanceof Error ? error.message : String(error)}`);
      
      // Return a basic fallback structure on error
      return `<context name="directoryStructure">Below is a snapshot of this project's file structure at the start of the conversation. This snapshot will NOT update during the conversation. It skips over .gitignore patterns.\n\n- ${rootPath}/\n  - (Error mapping directory structure)\n</context>`;
    }
  }

  /**
   * Retrieves git repository information for the current directory
   */
  async getGitRepositoryInfo() {
    try {
      // Use the dedicated GitInfoHelper for optimized, parallel git operations
      return await this.gitInfoHelper.getGitRepositoryInfo(async (command) => {
        // Pass our executeCommand implementation to the helper
        return await this.executeCommand('local-git-info', command);
      });
    } catch (error) {
      this.logger?.error(
        'Error retrieving git repository information:',
        error instanceof Error ? error : new Error(String(error)),
        LogCategory.EXECUTION
      );
      return null;
    }
  }
}

