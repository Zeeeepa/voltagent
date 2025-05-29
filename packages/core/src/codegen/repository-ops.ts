/**
 * Codegen Repository Operations
 * Handles repository management, branch operations, file operations, and Git integration
 */

import { CodegenSDKClient } from './sdk-client';
import { RepositoryInfo, ModifiedFile, PullRequestInfo } from './types';
import NodeCache from 'node-cache';

export interface RepositoryConfig {
  /** Default branch for operations */
  defaultBranch?: string;
  /** Enable repository caching */
  enableCaching?: boolean;
  /** Cache TTL in milliseconds */
  cacheTTL?: number;
  /** Git operation timeout */
  gitTimeout?: number;
  /** Enable branch protection checks */
  enableBranchProtection?: boolean;
}

export interface BranchInfo {
  /** Branch name */
  name: string;
  /** Branch SHA/commit hash */
  sha: string;
  /** Whether this is the default branch */
  isDefault: boolean;
  /** Whether the branch is protected */
  isProtected: boolean;
  /** Last commit information */
  lastCommit?: {
    sha: string;
    message: string;
    author: string;
    date: string;
  };
}

export interface FileOperation {
  /** File path relative to repository root */
  path: string;
  /** Operation type */
  action: 'create' | 'modify' | 'delete' | 'move' | 'copy';
  /** File content (for create/modify operations) */
  content?: string;
  /** Source path (for move/copy operations) */
  sourcePath?: string;
  /** File encoding */
  encoding?: 'utf8' | 'base64';
  /** File mode/permissions */
  mode?: string;
}

export interface CommitInfo {
  /** Commit SHA */
  sha: string;
  /** Commit message */
  message: string;
  /** Author information */
  author: {
    name: string;
    email: string;
    date: string;
  };
  /** Committer information */
  committer: {
    name: string;
    email: string;
    date: string;
  };
  /** Files changed in this commit */
  files: ModifiedFile[];
  /** Parent commit SHAs */
  parents: string[];
}

export interface MergeConflict {
  /** File path with conflict */
  path: string;
  /** Conflict type */
  type: 'content' | 'delete' | 'rename';
  /** Conflicted content */
  content: string;
  /** Base version content */
  baseContent?: string;
  /** Source branch content */
  sourceContent?: string;
  /** Target branch content */
  targetContent?: string;
}

export interface GitOperationResult {
  /** Operation success status */
  success: boolean;
  /** Result message */
  message: string;
  /** Operation details */
  details?: Record<string, any>;
  /** Files affected */
  files?: string[];
  /** Commit SHA (for commit operations) */
  commitSha?: string;
  /** Merge conflicts (for merge operations) */
  conflicts?: MergeConflict[];
}

export class CodegenRepositoryOps {
  private client: CodegenSDKClient;
  private cache: NodeCache;
  private config: Required<RepositoryConfig>;

  constructor(client: CodegenSDKClient, config: RepositoryConfig = {}) {
    this.client = client;
    this.config = {
      defaultBranch: config.defaultBranch || 'main',
      enableCaching: config.enableCaching !== false,
      cacheTTL: config.cacheTTL || 300000, // 5 minutes
      gitTimeout: config.gitTimeout || 30000, // 30 seconds
      enableBranchProtection: config.enableBranchProtection !== false
    };

    this.cache = new NodeCache({
      stdTTL: this.config.cacheTTL / 1000,
      checkperiod: 60
    });
  }

  /**
   * List all accessible repositories
   */
  async listRepositories(): Promise<RepositoryInfo[]> {
    if (this.config.enableCaching) {
      const cached = this.cache.get<RepositoryInfo[]>('repositories');
      if (cached) {
        return cached;
      }
    }

    const repositories = await this.client.listRepositories();
    
    if (this.config.enableCaching) {
      this.cache.set('repositories', repositories);
    }

    return repositories;
  }

  /**
   * Get repository information
   */
  async getRepository(repoId: string): Promise<RepositoryInfo> {
    const cacheKey = `repo:${repoId}`;
    
    if (this.config.enableCaching) {
      const cached = this.cache.get<RepositoryInfo>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const repository = await this.client.getRepository(repoId);
    
    if (this.config.enableCaching) {
      this.cache.set(cacheKey, repository);
    }

    return repository;
  }

  /**
   * Clone repository context (prepare for operations)
   */
  async cloneRepository(repoId: string, options: {
    branch?: string;
    depth?: number;
    includeSubmodules?: boolean;
  } = {}): Promise<{
    repositoryPath: string;
    currentBranch: string;
    lastCommit: string;
  }> {
    // This would typically involve actual git clone operations
    // For now, we'll simulate the repository context setup
    const repository = await this.getRepository(repoId);
    const branch = options.branch || repository.defaultBranch;

    return {
      repositoryPath: `/tmp/codegen-repos/${repoId}`,
      currentBranch: branch,
      lastCommit: 'HEAD'
    };
  }

  /**
   * List branches in repository
   */
  async listBranches(repoId: string): Promise<BranchInfo[]> {
    const cacheKey = `branches:${repoId}`;
    
    if (this.config.enableCaching) {
      const cached = this.cache.get<BranchInfo[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // This would make an API call to get branch information
    // For now, we'll return mock data based on repository info
    const repository = await this.getRepository(repoId);
    const branches: BranchInfo[] = repository.branches.map(branchName => ({
      name: branchName,
      sha: 'mock-sha-' + branchName,
      isDefault: branchName === repository.defaultBranch,
      isProtected: branchName === repository.defaultBranch || branchName === 'develop'
    }));

    if (this.config.enableCaching) {
      this.cache.set(cacheKey, branches, 60); // Cache branches for 1 minute
    }

    return branches;
  }

  /**
   * Create a new branch
   */
  async createBranch(repoId: string, branchName: string, options: {
    sourceBranch?: string;
    sourceCommit?: string;
  } = {}): Promise<BranchInfo> {
    const repository = await this.getRepository(repoId);
    const sourceBranch = options.sourceBranch || repository.defaultBranch;

    // Validate branch name
    if (!this.isValidBranchName(branchName)) {
      throw new Error(`Invalid branch name: ${branchName}`);
    }

    // Check if branch already exists
    const existingBranches = await this.listBranches(repoId);
    if (existingBranches.some(b => b.name === branchName)) {
      throw new Error(`Branch ${branchName} already exists`);
    }

    // Create branch (this would be an API call)
    const newBranch: BranchInfo = {
      name: branchName,
      sha: 'new-branch-sha',
      isDefault: false,
      isProtected: false
    };

    // Invalidate cache
    this.cache.del(`branches:${repoId}`);

    return newBranch;
  }

  /**
   * Switch to a different branch
   */
  async switchBranch(repoId: string, branchName: string): Promise<GitOperationResult> {
    const branches = await this.listBranches(repoId);
    const targetBranch = branches.find(b => b.name === branchName);

    if (!targetBranch) {
      return {
        success: false,
        message: `Branch ${branchName} not found`,
        details: { availableBranches: branches.map(b => b.name) }
      };
    }

    return {
      success: true,
      message: `Switched to branch ${branchName}`,
      details: { 
        previousBranch: 'current-branch',
        newBranch: branchName,
        commitSha: targetBranch.sha
      }
    };
  }

  /**
   * Merge branches
   */
  async mergeBranches(repoId: string, options: {
    sourceBranch: string;
    targetBranch: string;
    mergeMessage?: string;
    strategy?: 'merge' | 'squash' | 'rebase';
  }): Promise<GitOperationResult> {
    const { sourceBranch, targetBranch, mergeMessage, strategy = 'merge' } = options;

    // Check branch protection
    if (this.config.enableBranchProtection) {
      const branches = await this.listBranches(repoId);
      const target = branches.find(b => b.name === targetBranch);
      
      if (target?.isProtected) {
        return {
          success: false,
          message: `Cannot merge into protected branch ${targetBranch}`,
          details: { protectedBranch: targetBranch }
        };
      }
    }

    // Simulate merge operation
    const hasConflicts = Math.random() < 0.1; // 10% chance of conflicts

    if (hasConflicts) {
      const conflicts: MergeConflict[] = [
        {
          path: 'src/example.ts',
          type: 'content',
          content: '<<<<<<< HEAD\noriginal content\n=======\nnew content\n>>>>>>> feature-branch'
        }
      ];

      return {
        success: false,
        message: `Merge conflicts detected between ${sourceBranch} and ${targetBranch}`,
        conflicts,
        details: { strategy, conflictCount: conflicts.length }
      };
    }

    return {
      success: true,
      message: `Successfully merged ${sourceBranch} into ${targetBranch}`,
      commitSha: 'merge-commit-sha',
      details: { strategy, mergeMessage }
    };
  }

  /**
   * Read file content from repository
   */
  async readFile(repoId: string, filePath: string, options: {
    branch?: string;
    encoding?: 'utf8' | 'base64';
  } = {}): Promise<{
    content: string;
    encoding: string;
    size: number;
    sha: string;
  }> {
    const repository = await this.getRepository(repoId);
    const branch = options.branch || repository.defaultBranch;
    const encoding = options.encoding || 'utf8';

    // This would make an API call to get file content
    return {
      content: `// Mock content for ${filePath}`,
      encoding,
      size: 100,
      sha: 'file-content-sha'
    };
  }

  /**
   * Write file content to repository
   */
  async writeFile(repoId: string, filePath: string, content: string, options: {
    branch?: string;
    encoding?: 'utf8' | 'base64';
    createDirectories?: boolean;
  } = {}): Promise<GitOperationResult> {
    const repository = await this.getRepository(repoId);
    const branch = options.branch || repository.defaultBranch;

    // Validate file path
    if (!this.isValidFilePath(filePath)) {
      return {
        success: false,
        message: `Invalid file path: ${filePath}`
      };
    }

    return {
      success: true,
      message: `File ${filePath} written successfully`,
      files: [filePath],
      details: { branch, encoding: options.encoding || 'utf8' }
    };
  }

  /**
   * Delete file from repository
   */
  async deleteFile(repoId: string, filePath: string, options: {
    branch?: string;
  } = {}): Promise<GitOperationResult> {
    const repository = await this.getRepository(repoId);
    const branch = options.branch || repository.defaultBranch;

    return {
      success: true,
      message: `File ${filePath} deleted successfully`,
      files: [filePath],
      details: { branch }
    };
  }

  /**
   * Move/rename file in repository
   */
  async moveFile(repoId: string, sourcePath: string, targetPath: string, options: {
    branch?: string;
  } = {}): Promise<GitOperationResult> {
    const repository = await this.getRepository(repoId);
    const branch = options.branch || repository.defaultBranch;

    if (!this.isValidFilePath(targetPath)) {
      return {
        success: false,
        message: `Invalid target path: ${targetPath}`
      };
    }

    return {
      success: true,
      message: `File moved from ${sourcePath} to ${targetPath}`,
      files: [sourcePath, targetPath],
      details: { branch, operation: 'move' }
    };
  }

  /**
   * Perform batch file operations
   */
  async batchFileOperations(repoId: string, operations: FileOperation[], options: {
    branch?: string;
    commitMessage?: string;
  } = {}): Promise<GitOperationResult> {
    const repository = await this.getRepository(repoId);
    const branch = options.branch || repository.defaultBranch;

    // Validate all operations
    for (const op of operations) {
      if (!this.isValidFilePath(op.path)) {
        return {
          success: false,
          message: `Invalid file path in operation: ${op.path}`
        };
      }
    }

    const affectedFiles = operations.map(op => op.path);

    return {
      success: true,
      message: `Batch operation completed: ${operations.length} files affected`,
      files: affectedFiles,
      commitSha: 'batch-commit-sha',
      details: { 
        branch, 
        operationCount: operations.length,
        commitMessage: options.commitMessage 
      }
    };
  }

  /**
   * Commit changes to repository
   */
  async commitChanges(repoId: string, options: {
    message: string;
    branch?: string;
    author?: { name: string; email: string };
    files?: string[];
  }): Promise<GitOperationResult> {
    const repository = await this.getRepository(repoId);
    const branch = options.branch || repository.defaultBranch;

    if (!options.message || options.message.trim().length === 0) {
      return {
        success: false,
        message: 'Commit message is required'
      };
    }

    return {
      success: true,
      message: `Changes committed to ${branch}`,
      commitSha: 'new-commit-sha',
      files: options.files || [],
      details: { 
        branch, 
        commitMessage: options.message,
        author: options.author 
      }
    };
  }

  /**
   * Get commit history
   */
  async getCommitHistory(repoId: string, options: {
    branch?: string;
    limit?: number;
    since?: string;
    until?: string;
  } = {}): Promise<CommitInfo[]> {
    const repository = await this.getRepository(repoId);
    const branch = options.branch || repository.defaultBranch;
    const limit = options.limit || 50;

    // This would make an API call to get commit history
    // For now, return mock data
    const commits: CommitInfo[] = [];
    for (let i = 0; i < Math.min(limit, 10); i++) {
      commits.push({
        sha: `commit-sha-${i}`,
        message: `Commit message ${i}`,
        author: {
          name: 'Developer',
          email: 'dev@example.com',
          date: new Date(Date.now() - i * 86400000).toISOString()
        },
        committer: {
          name: 'Developer',
          email: 'dev@example.com',
          date: new Date(Date.now() - i * 86400000).toISOString()
        },
        files: [],
        parents: i > 0 ? [`commit-sha-${i - 1}`] : []
      });
    }

    return commits;
  }

  /**
   * Create pull request
   */
  async createPullRequest(repoId: string, options: {
    title: string;
    description: string;
    sourceBranch: string;
    targetBranch?: string;
    files?: ModifiedFile[];
    draft?: boolean;
  }): Promise<PullRequestInfo> {
    const repository = await this.getRepository(repoId);
    const targetBranch = options.targetBranch || repository.defaultBranch;

    return await this.client.createPullRequest(repoId, {
      title: options.title,
      description: options.description,
      sourceBranch: options.sourceBranch,
      targetBranch,
      files: options.files || []
    });
  }

  /**
   * Validate branch name
   */
  private isValidBranchName(branchName: string): boolean {
    // Git branch name validation rules
    const invalidPatterns = [
      /^\./, // Cannot start with dot
      /\.\.$/, // Cannot end with double dot
      /\/\./, // Cannot contain /. 
      /\.\//, // Cannot contain ./
      /\/\//, // Cannot contain //
      /@\{/, // Cannot contain @{
      /\s/, // Cannot contain spaces
      /[\x00-\x1f\x7f]/, // Cannot contain control characters
      /[~^:?*\[]/ // Cannot contain special characters
    ];

    return branchName.length > 0 && 
           branchName.length <= 255 &&
           !invalidPatterns.some(pattern => pattern.test(branchName));
  }

  /**
   * Validate file path
   */
  private isValidFilePath(filePath: string): boolean {
    // Basic file path validation
    return filePath.length > 0 &&
           !filePath.startsWith('/') &&
           !filePath.includes('..') &&
           !filePath.includes('//') &&
           !/[\x00-\x1f\x7f]/.test(filePath);
  }

  /**
   * Get repository health status
   */
  getHealthStatus(): {
    cacheSize: number;
    cacheHits: number;
    cacheMisses: number;
    config: RepositoryConfig;
  } {
    const stats = this.cache.getStats();
    
    return {
      cacheSize: this.cache.keys().length,
      cacheHits: stats.hits,
      cacheMisses: stats.misses,
      config: this.config
    };
  }

  /**
   * Clear repository cache
   */
  clearCache(): void {
    this.cache.flushAll();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.cache.close();
  }
}

