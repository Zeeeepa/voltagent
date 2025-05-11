/**
 * ExecutionAdapter.ts
 * 
 * Interface for execution adapters that provide a common API for executing commands
 * and managing files across different execution environments (local, Docker, E2B).
 */

import { Logger } from '../utils/logger';

/**
 * Result of a command execution
 */
export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * Result of a file read operation
 */
export interface FileReadResult {
  success: boolean;
  path: string;
  content?: string;
  size?: number;
  encoding?: string;
  error?: string;
  displayPath?: string;
  pagination?: {
    totalLines: number;
    startLine: number;
    endLine: number;
    hasMore: boolean;
  };
}

/**
 * Result of a file edit operation
 */
export interface FileEditResult {
  success: boolean;
  path: string;
  originalContent?: string;
  newContent?: string;
  error?: string;
}

/**
 * Result of a directory listing operation
 */
export interface DirectoryListResult {
  success: boolean;
  path: string;
  entries?: Array<{
    name: string;
    type?: string;
    size?: number;
    modified?: Date;
    created?: Date;
    isDirectory: boolean;
    isFile: boolean;
    isSymbolicLink: boolean;
    error?: string;
  }>;
  count?: number;
  error?: string;
}

/**
 * Git repository information
 */
export interface GitRepositoryInfo {
  isGitRepository: boolean;
  gitDir?: string;
  defaultBranch?: string;
  currentBranch?: string;
  hasUncommittedChanges?: boolean;
  commitSha?: string;
  recentCommits?: string[];
  changedFiles?: string[];
  stagedFiles?: string[];
  untrackedFiles?: string[];
  deletedFiles?: string[];
}

/**
 * Environment status event
 */
export interface EnvironmentStatusEvent {
  environmentType: 'local' | 'docker' | 'e2b';
  status: 'initializing' | 'connecting' | 'connected' | 'disconnected' | 'error';
  isReady: boolean;
  error?: string;
}

/**
 * Interface for execution adapters
 */
export interface ExecutionAdapter {
  /**
   * Execute a command in the execution environment
   * @param executionId Unique ID for this execution
   * @param command Command to execute
   * @param workingDir Optional working directory
   */
  executeCommand(executionId: string, command: string, workingDir?: string): Promise<CommandResult>;

  /**
   * Read a file from the execution environment
   * @param executionId Unique ID for this execution
   * @param filepath Path to the file
   * @param maxSize Maximum size to read (in bytes)
   * @param lineOffset Line number to start reading from (0-based)
   * @param lineCount Number of lines to read
   * @param encoding File encoding
   */
  readFile(
    executionId: string,
    filepath: string,
    maxSize?: number,
    lineOffset?: number,
    lineCount?: number,
    encoding?: string
  ): Promise<FileReadResult>;

  /**
   * Write content to a file in the execution environment
   * @param executionId Unique ID for this execution
   * @param filepath Path to the file
   * @param content Content to write
   * @param encoding File encoding
   */
  writeFile(
    executionId: string,
    filepath: string,
    content: string,
    encoding?: string
  ): Promise<void>;

  /**
   * Edit a file by replacing content
   * @param executionId Unique ID for this execution
   * @param filepath Path to the file
   * @param searchCode Code to search for
   * @param replaceCode Code to replace with
   * @param encoding File encoding
   */
  editFile(
    executionId: string,
    filepath: string,
    searchCode: string,
    replaceCode: string,
    encoding?: string
  ): Promise<FileEditResult>;

  /**
   * List files in a directory
   * @param executionId Unique ID for this execution
   * @param dirPath Path to the directory
   * @param showHidden Whether to show hidden files
   * @param details Whether to include detailed file information
   */
  ls(
    executionId: string,
    dirPath: string,
    showHidden?: boolean,
    details?: boolean
  ): Promise<DirectoryListResult>;

  /**
   * Find files matching a glob pattern
   * @param executionId Unique ID for this execution
   * @param pattern Glob pattern
   * @param options Glob options
   */
  glob?(
    executionId: string,
    pattern: string,
    options?: any
  ): Promise<string[]>;

  /**
   * Generate a directory map
   * @param rootPath Root path to map
   * @param maxDepth Maximum depth to traverse
   */
  generateDirectoryMap?(
    rootPath: string,
    maxDepth?: number
  ): Promise<string>;

  /**
   * Get git repository information
   */
  getGitRepositoryInfo?(): Promise<GitRepositoryInfo | null>;
}

/**
 * Options for creating an execution adapter
 */
export interface ExecutionAdapterOptions {
  type?: 'local' | 'docker' | 'e2b';
  autoFallback?: boolean;
  logger?: Logger;
  sessionId?: string;
  docker?: {
    projectRoot: string;
    composeFilePath?: string;
    serviceName?: string;
    projectName?: string;
  };
  e2b?: {
    sandboxId: string;
  };
}

/**
 * Result of creating an execution adapter
 */
export interface ExecutionAdapterResult {
  adapter: ExecutionAdapter;
  type: 'local' | 'docker' | 'e2b';
}

