import { EventEmitter } from 'events';
import { spawn } from 'child_process';
import simpleGit, { SimpleGit, CloneOptions } from 'simple-git';
import { z } from 'zod';

// Configuration schemas
const CloneConfigSchema = z.object({
  depth: z.number().default(1),
  singleBranch: z.boolean().default(true),
  recursive: z.boolean().default(false),
  timeout: z.number().default(300000), // 5 minutes
  retries: z.number().default(3),
  lfsSupport: z.boolean().default(false),
});

const RepositoryInfoSchema = z.object({
  url: z.string().url(),
  branch: z.string(),
  commit: z.string().optional(),
  token: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
});

export type CloneConfig = z.infer<typeof CloneConfigSchema>;
export type RepositoryInfo = z.infer<typeof RepositoryInfoSchema>;

export interface CloneResult {
  success: boolean;
  environmentId: string;
  repositoryPath: string;
  branch: string;
  commit: string;
  cloneTime: number;
  logs: string[];
  errors: string[];
  metadata: {
    repositorySize: number;
    fileCount: number;
    submodules: string[];
    lfsFiles: string[];
  };
}

export interface BranchInfo {
  name: string;
  commit: string;
  author: string;
  date: Date;
  message: string;
}

export interface SubmoduleInfo {
  name: string;
  path: string;
  url: string;
  commit: string;
}

export class WSL2BranchCloner extends EventEmitter {
  private config: CloneConfig;
  private git: SimpleGit;

  constructor(config: CloneConfig) {
    super();
    this.config = CloneConfigSchema.parse(config);
    this.git = simpleGit();
  }

  /**
   * Clone a repository branch to WSL2 environment
   */
  async cloneBranch(
    environmentId: string,
    repositoryInfo: RepositoryInfo,
    targetPath: string
  ): Promise<CloneResult> {
    const startTime = Date.now();
    const result: CloneResult = {
      success: false,
      environmentId,
      repositoryPath: targetPath,
      branch: repositoryInfo.branch,
      commit: '',
      cloneTime: 0,
      logs: [],
      errors: [],
      metadata: {
        repositorySize: 0,
        fileCount: 0,
        submodules: [],
        lfsFiles: [],
      },
    };

    try {
      this.emit('clone:started', { environmentId, repository: repositoryInfo.url, branch: repositoryInfo.branch });

      // Validate repository info
      const validatedRepo = RepositoryInfoSchema.parse(repositoryInfo);

      // Setup authentication if provided
      const authenticatedUrl = this.setupAuthentication(validatedRepo);

      // Perform clone with retries
      await this.performCloneWithRetries(environmentId, authenticatedUrl, validatedRepo.branch, targetPath, result);

      // Get commit information
      result.commit = await this.getCurrentCommit(environmentId, targetPath);

      // Handle submodules if recursive is enabled
      if (this.config.recursive) {
        await this.handleSubmodules(environmentId, targetPath, result);
      }

      // Handle Git LFS if enabled
      if (this.config.lfsSupport) {
        await this.handleGitLFS(environmentId, targetPath, result);
      }

      // Collect repository metadata
      await this.collectRepositoryMetadata(environmentId, targetPath, result);

      result.success = true;
      this.emit('clone:completed', result);
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
      this.emit('clone:failed', result, error);
    } finally {
      result.cloneTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Switch to a different branch in an existing repository
   */
  async switchBranch(
    environmentId: string,
    repositoryPath: string,
    branchName: string
  ): Promise<BranchInfo> {
    this.emit('branch:switching', { environmentId, repositoryPath, branch: branchName });

    try {
      // Fetch the branch if it doesn't exist locally
      await this.executeGitCommand(environmentId, repositoryPath, `fetch origin ${branchName}`);
      
      // Switch to the branch
      await this.executeGitCommand(environmentId, repositoryPath, `checkout ${branchName}`);
      
      // Pull latest changes
      await this.executeGitCommand(environmentId, repositoryPath, `pull origin ${branchName}`);

      // Get branch information
      const branchInfo = await this.getBranchInfo(environmentId, repositoryPath, branchName);
      
      this.emit('branch:switched', { environmentId, repositoryPath, branch: branchName, info: branchInfo });
      return branchInfo;
    } catch (error) {
      this.emit('branch:switch:failed', { environmentId, repositoryPath, branch: branchName, error });
      throw error;
    }
  }

  /**
   * Get information about a specific branch
   */
  async getBranchInfo(
    environmentId: string,
    repositoryPath: string,
    branchName: string
  ): Promise<BranchInfo> {
    const commands = [
      `git log -1 --format="%H" ${branchName}`, // commit hash
      `git log -1 --format="%an" ${branchName}`, // author name
      `git log -1 --format="%ad" --date=iso ${branchName}`, // author date
      `git log -1 --format="%s" ${branchName}`, // commit message
    ];

    const [commit, author, dateStr, message] = await Promise.all(
      commands.map(cmd => this.executeGitCommand(environmentId, repositoryPath, cmd))
    );

    return {
      name: branchName,
      commit: commit.trim(),
      author: author.trim(),
      date: new Date(dateStr.trim()),
      message: message.trim(),
    };
  }

  /**
   * List all available branches in the repository
   */
  async listBranches(
    environmentId: string,
    repositoryPath: string,
    includeRemote: boolean = true
  ): Promise<string[]> {
    const command = includeRemote ? 'git branch -a' : 'git branch';
    const output = await this.executeGitCommand(environmentId, repositoryPath, command);
    
    return output
      .split('\n')
      .map(line => line.trim().replace(/^\*\s*/, '').replace(/^remotes\/origin\//, ''))
      .filter(line => line && !line.includes('HEAD ->'))
      .map(line => line.trim());
  }

  /**
   * Get the current commit hash
   */
  async getCurrentCommit(environmentId: string, repositoryPath: string): Promise<string> {
    const output = await this.executeGitCommand(environmentId, repositoryPath, 'git rev-parse HEAD');
    return output.trim();
  }

  /**
   * Get repository status
   */
  async getRepositoryStatus(environmentId: string, repositoryPath: string): Promise<{
    branch: string;
    commit: string;
    modified: string[];
    untracked: string[];
    staged: string[];
  }> {
    const [branchOutput, commitOutput, statusOutput] = await Promise.all([
      this.executeGitCommand(environmentId, repositoryPath, 'git branch --show-current'),
      this.executeGitCommand(environmentId, repositoryPath, 'git rev-parse HEAD'),
      this.executeGitCommand(environmentId, repositoryPath, 'git status --porcelain'),
    ]);

    const statusLines = statusOutput.split('\n').filter(line => line.trim());
    const modified: string[] = [];
    const untracked: string[] = [];
    const staged: string[] = [];

    for (const line of statusLines) {
      const status = line.substring(0, 2);
      const file = line.substring(3);

      if (status.includes('M')) modified.push(file);
      if (status.includes('?')) untracked.push(file);
      if (status[0] !== ' ' && status[0] !== '?') staged.push(file);
    }

    return {
      branch: branchOutput.trim(),
      commit: commitOutput.trim(),
      modified,
      untracked,
      staged,
    };
  }

  /**
   * Setup authentication for repository URL
   */
  private setupAuthentication(repositoryInfo: RepositoryInfo): string {
    let url = repositoryInfo.url;

    if (repositoryInfo.token) {
      // GitHub token authentication
      url = url.replace('https://', `https://${repositoryInfo.token}@`);
    } else if (repositoryInfo.username && repositoryInfo.password) {
      // Username/password authentication
      url = url.replace('https://', `https://${repositoryInfo.username}:${repositoryInfo.password}@`);
    }

    return url;
  }

  /**
   * Perform clone operation with retries
   */
  private async performCloneWithRetries(
    environmentId: string,
    url: string,
    branch: string,
    targetPath: string,
    result: CloneResult
  ): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.config.retries; attempt++) {
      try {
        this.emit('clone:attempt', { environmentId, attempt, maxAttempts: this.config.retries });

        await this.performClone(environmentId, url, branch, targetPath, result);
        return; // Success, exit retry loop
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        result.errors.push(`Attempt ${attempt} failed: ${lastError.message}`);

        if (attempt < this.config.retries) {
          this.emit('clone:retry', { environmentId, attempt, error: lastError.message });
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('Clone failed after all retries');
  }

  /**
   * Perform the actual clone operation
   */
  private async performClone(
    environmentId: string,
    url: string,
    branch: string,
    targetPath: string,
    result: CloneResult
  ): Promise<void> {
    const cloneOptions: string[] = [
      'clone',
      url,
      targetPath,
      '--branch', branch,
    ];

    if (this.config.depth > 0) {
      cloneOptions.push('--depth', this.config.depth.toString());
    }

    if (this.config.singleBranch) {
      cloneOptions.push('--single-branch');
    }

    if (this.config.recursive) {
      cloneOptions.push('--recursive');
    }

    const command = `git ${cloneOptions.join(' ')}`;
    const output = await this.executeWSLCommand(environmentId, command, this.config.timeout);
    result.logs.push(`Clone output: ${output}`);
  }

  /**
   * Handle submodules initialization and update
   */
  private async handleSubmodules(
    environmentId: string,
    repositoryPath: string,
    result: CloneResult
  ): Promise<void> {
    try {
      // Check if .gitmodules exists
      const gitmodulesExists = await this.executeWSLCommand(
        environmentId,
        `test -f ${repositoryPath}/.gitmodules && echo "exists" || echo "not found"`
      );

      if (gitmodulesExists.includes('exists')) {
        this.emit('submodules:initializing', { environmentId, repositoryPath });

        // Initialize and update submodules
        await this.executeGitCommand(environmentId, repositoryPath, 'git submodule init');
        await this.executeGitCommand(environmentId, repositoryPath, 'git submodule update');

        // Get submodule information
        const submodules = await this.getSubmoduleInfo(environmentId, repositoryPath);
        result.metadata.submodules = submodules.map(s => s.name);

        this.emit('submodules:completed', { environmentId, repositoryPath, submodules });
      }
    } catch (error) {
      result.errors.push(`Submodule handling failed: ${error}`);
    }
  }

  /**
   * Handle Git LFS files
   */
  private async handleGitLFS(
    environmentId: string,
    repositoryPath: string,
    result: CloneResult
  ): Promise<void> {
    try {
      // Check if Git LFS is available
      await this.executeWSLCommand(environmentId, 'git lfs version');

      this.emit('lfs:pulling', { environmentId, repositoryPath });

      // Pull LFS files
      await this.executeGitCommand(environmentId, repositoryPath, 'git lfs pull');

      // Get LFS file list
      const lfsOutput = await this.executeGitCommand(environmentId, repositoryPath, 'git lfs ls-files');
      result.metadata.lfsFiles = lfsOutput
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.split(' ').slice(2).join(' '));

      this.emit('lfs:completed', { environmentId, repositoryPath, files: result.metadata.lfsFiles });
    } catch (error) {
      result.errors.push(`Git LFS handling failed: ${error}`);
    }
  }

  /**
   * Collect repository metadata
   */
  private async collectRepositoryMetadata(
    environmentId: string,
    repositoryPath: string,
    result: CloneResult
  ): Promise<void> {
    try {
      // Get repository size
      const sizeOutput = await this.executeWSLCommand(environmentId, `du -sb ${repositoryPath}`);
      result.metadata.repositorySize = parseInt(sizeOutput.split('\t')[0]);

      // Get file count
      const fileCountOutput = await this.executeWSLCommand(environmentId, `find ${repositoryPath} -type f | wc -l`);
      result.metadata.fileCount = parseInt(fileCountOutput.trim());

      this.emit('metadata:collected', { environmentId, repositoryPath, metadata: result.metadata });
    } catch (error) {
      result.errors.push(`Metadata collection failed: ${error}`);
    }
  }

  /**
   * Get submodule information
   */
  private async getSubmoduleInfo(environmentId: string, repositoryPath: string): Promise<SubmoduleInfo[]> {
    const output = await this.executeGitCommand(environmentId, repositoryPath, 'git submodule status');
    const submodules: SubmoduleInfo[] = [];

    for (const line of output.split('\n')) {
      if (line.trim()) {
        const parts = line.trim().split(' ');
        if (parts.length >= 2) {
          const commit = parts[0].replace(/^[-+]/, '');
          const path = parts[1];
          
          // Get submodule URL
          const urlOutput = await this.executeGitCommand(
            environmentId,
            repositoryPath,
            `git config --file .gitmodules --get submodule.${path}.url`
          );

          submodules.push({
            name: path.split('/').pop() || path,
            path,
            url: urlOutput.trim(),
            commit,
          });
        }
      }
    }

    return submodules;
  }

  /**
   * Execute a Git command in the repository
   */
  private async executeGitCommand(
    environmentId: string,
    repositoryPath: string,
    command: string
  ): Promise<string> {
    const fullCommand = `cd ${repositoryPath} && ${command}`;
    return this.executeWSLCommand(environmentId, fullCommand);
  }

  /**
   * Execute a command in WSL2
   */
  private async executeWSLCommand(
    environmentId: string,
    command: string,
    timeout: number = 300000
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const process = spawn('wsl', ['--', 'bash', '-c', command]);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`WSL command failed with code ${code}: ${stderr}`));
        }
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        process.kill();
        reject(new Error(`Command timeout after ${timeout}ms: ${command}`));
      }, timeout);

      process.on('close', () => {
        clearTimeout(timeoutId);
      });
    });
  }
}

export default WSL2BranchCloner;

