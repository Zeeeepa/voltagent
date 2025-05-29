import { EventEmitter } from 'eventemitter3';
import { WSL2Config, WSL2Instance, BranchInfo } from '../../types';

export class BranchManager extends EventEmitter {
  private config: WSL2Config;
  private workingDirectory = '/home/deploy/workspace';

  constructor(config: WSL2Config) {
    super();
    this.config = config;
  }

  /**
   * Clone repository and checkout specific branch
   */
  public async cloneAndCheckout(
    instance: WSL2Instance,
    repositoryUrl: string,
    branch: string
  ): Promise<BranchInfo> {
    try {
      this.emit('clone.started', { instance: instance.id, repository: repositoryUrl, branch });
      
      // Create working directory
      await this.executeCommand(instance, `mkdir -p ${this.workingDirectory}`);
      
      // Extract repository name from URL
      const repoName = this.extractRepoName(repositoryUrl);
      const repoPath = `${this.workingDirectory}/${repoName}`;
      
      // Remove existing directory if it exists
      await this.executeCommand(instance, `rm -rf ${repoPath}`);
      
      // Clone repository
      const cloneCommand = `git clone ${repositoryUrl} ${repoPath}`;
      await this.executeCommand(instance, cloneCommand);
      
      // Change to repository directory and checkout branch
      const checkoutCommand = `cd ${repoPath} && git checkout ${branch}`;
      await this.executeCommand(instance, checkoutCommand);
      
      // Get branch information
      const branchInfo = await this.getBranchInfo(instance, repoPath);
      
      this.emit('clone.completed', { 
        instance: instance.id, 
        repository: repositoryUrl, 
        branch, 
        branchInfo 
      });
      
      return branchInfo;
      
    } catch (error) {
      this.emit('clone.failed', { 
        instance: instance.id, 
        repository: repositoryUrl, 
        branch, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Switch to a different branch
   */
  public async switchBranch(
    instance: WSL2Instance,
    repositoryName: string,
    branch: string
  ): Promise<BranchInfo> {
    const repoPath = `${this.workingDirectory}/${repositoryName}`;
    
    try {
      this.emit('branch.switch.started', { instance: instance.id, repository: repositoryName, branch });
      
      // Fetch latest changes
      await this.executeCommand(instance, `cd ${repoPath} && git fetch origin`);
      
      // Checkout branch
      await this.executeCommand(instance, `cd ${repoPath} && git checkout ${branch}`);
      
      // Pull latest changes
      await this.executeCommand(instance, `cd ${repoPath} && git pull origin ${branch}`);
      
      const branchInfo = await this.getBranchInfo(instance, repoPath);
      
      this.emit('branch.switch.completed', { 
        instance: instance.id, 
        repository: repositoryName, 
        branch, 
        branchInfo 
      });
      
      return branchInfo;
      
    } catch (error) {
      this.emit('branch.switch.failed', { 
        instance: instance.id, 
        repository: repositoryName, 
        branch, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Handle merge conflicts
   */
  public async handleMergeConflicts(
    instance: WSL2Instance,
    repositoryName: string,
    strategy: 'ours' | 'theirs' | 'manual' = 'theirs'
  ): Promise<void> {
    const repoPath = `${this.workingDirectory}/${repositoryName}`;
    
    try {
      this.emit('merge.conflict.started', { instance: instance.id, repository: repositoryName, strategy });
      
      let resolveCommand: string;
      
      switch (strategy) {
        case 'ours':
          resolveCommand = `cd ${repoPath} && git checkout --ours . && git add .`;
          break;
        case 'theirs':
          resolveCommand = `cd ${repoPath} && git checkout --theirs . && git add .`;
          break;
        case 'manual':
          // For manual resolution, we'll just mark conflicts as resolved
          resolveCommand = `cd ${repoPath} && git add .`;
          break;
        default:
          throw new Error(`Unknown merge strategy: ${strategy}`);
      }
      
      await this.executeCommand(instance, resolveCommand);
      await this.executeCommand(instance, `cd ${repoPath} && git commit -m "Resolve merge conflicts using ${strategy} strategy"`);
      
      this.emit('merge.conflict.resolved', { 
        instance: instance.id, 
        repository: repositoryName, 
        strategy 
      });
      
    } catch (error) {
      this.emit('merge.conflict.failed', { 
        instance: instance.id, 
        repository: repositoryName, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Create temporary branch for testing
   */
  public async createTemporaryBranch(
    instance: WSL2Instance,
    repositoryName: string,
    baseBranch: string,
    tempBranchName?: string
  ): Promise<string> {
    const repoPath = `${this.workingDirectory}/${repositoryName}`;
    const branchName = tempBranchName || `temp-${Date.now()}`;
    
    try {
      this.emit('temp.branch.created', { instance: instance.id, repository: repositoryName, branch: branchName });
      
      // Ensure we're on the base branch
      await this.executeCommand(instance, `cd ${repoPath} && git checkout ${baseBranch}`);
      
      // Create and checkout temporary branch
      await this.executeCommand(instance, `cd ${repoPath} && git checkout -b ${branchName}`);
      
      this.emit('temp.branch.created', { 
        instance: instance.id, 
        repository: repositoryName, 
        branch: branchName 
      });
      
      return branchName;
      
    } catch (error) {
      this.emit('temp.branch.failed', { 
        instance: instance.id, 
        repository: repositoryName, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Clean up temporary branches
   */
  public async cleanupTemporaryBranches(
    instance: WSL2Instance,
    repositoryName: string
  ): Promise<void> {
    const repoPath = `${this.workingDirectory}/${repositoryName}`;
    
    try {
      this.emit('cleanup.started', { instance: instance.id, repository: repositoryName });
      
      // Get list of temporary branches
      const branchList = await this.executeCommand(
        instance, 
        `cd ${repoPath} && git branch | grep "temp-" | sed 's/^[* ]*//'`
      );
      
      const tempBranches = branchList.trim().split('\n').filter(branch => branch);
      
      if (tempBranches.length === 0) {
        this.emit('cleanup.completed', { instance: instance.id, repository: repositoryName, cleaned: 0 });
        return;
      }
      
      // Switch to main/master branch before deleting
      await this.executeCommand(instance, `cd ${repoPath} && git checkout main || git checkout master`);
      
      // Delete temporary branches
      for (const branch of tempBranches) {
        try {
          await this.executeCommand(instance, `cd ${repoPath} && git branch -D ${branch}`);
        } catch (error) {
          // Continue with other branches if one fails
          this.emit('cleanup.branch.failed', { 
            instance: instance.id, 
            repository: repositoryName, 
            branch, 
            error: error.message 
          });
        }
      }
      
      this.emit('cleanup.completed', { 
        instance: instance.id, 
        repository: repositoryName, 
        cleaned: tempBranches.length 
      });
      
    } catch (error) {
      this.emit('cleanup.failed', { 
        instance: instance.id, 
        repository: repositoryName, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Track branch status and changes
   */
  public async getBranchStatus(
    instance: WSL2Instance,
    repositoryName: string
  ): Promise<{
    currentBranch: string;
    hasUncommittedChanges: boolean;
    hasUnpushedCommits: boolean;
    behindOrigin: number;
    aheadOfOrigin: number;
  }> {
    const repoPath = `${this.workingDirectory}/${repositoryName}`;
    
    try {
      // Get current branch
      const currentBranch = await this.executeCommand(
        instance, 
        `cd ${repoPath} && git rev-parse --abbrev-ref HEAD`
      );
      
      // Check for uncommitted changes
      const statusOutput = await this.executeCommand(
        instance, 
        `cd ${repoPath} && git status --porcelain`
      );
      const hasUncommittedChanges = statusOutput.trim().length > 0;
      
      // Check for unpushed commits
      const unpushedOutput = await this.executeCommand(
        instance, 
        `cd ${repoPath} && git log origin/${currentBranch.trim()}..HEAD --oneline`
      );
      const hasUnpushedCommits = unpushedOutput.trim().length > 0;
      
      // Check how far behind/ahead of origin
      const revListOutput = await this.executeCommand(
        instance, 
        `cd ${repoPath} && git rev-list --left-right --count origin/${currentBranch.trim()}...HEAD`
      );
      const [behindOrigin, aheadOfOrigin] = revListOutput.trim().split('\t').map(Number);
      
      return {
        currentBranch: currentBranch.trim(),
        hasUncommittedChanges,
        hasUnpushedCommits,
        behindOrigin: behindOrigin || 0,
        aheadOfOrigin: aheadOfOrigin || 0
      };
      
    } catch (error) {
      throw new Error(`Failed to get branch status: ${error.message}`);
    }
  }

  /**
   * Perform git operations (pull, push, merge)
   */
  public async performGitOperation(
    instance: WSL2Instance,
    repositoryName: string,
    operation: 'pull' | 'push' | 'merge',
    options: {
      branch?: string;
      remote?: string;
      force?: boolean;
      message?: string;
    } = {}
  ): Promise<string> {
    const repoPath = `${this.workingDirectory}/${repositoryName}`;
    const { branch = 'main', remote = 'origin', force = false, message } = options;
    
    try {
      let command: string;
      
      switch (operation) {
        case 'pull':
          command = `cd ${repoPath} && git pull ${remote} ${branch}`;
          if (force) {
            command += ' --force';
          }
          break;
          
        case 'push':
          command = `cd ${repoPath} && git push ${remote} ${branch}`;
          if (force) {
            command += ' --force';
          }
          break;
          
        case 'merge':
          command = `cd ${repoPath} && git merge ${branch}`;
          if (message) {
            command += ` -m "${message}"`;
          }
          break;
          
        default:
          throw new Error(`Unknown git operation: ${operation}`);
      }
      
      const result = await this.executeCommand(instance, command);
      
      this.emit('git.operation.completed', { 
        instance: instance.id, 
        repository: repositoryName, 
        operation, 
        options 
      });
      
      return result;
      
    } catch (error) {
      this.emit('git.operation.failed', { 
        instance: instance.id, 
        repository: repositoryName, 
        operation, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Configure git authentication
   */
  public async configureGitAuth(
    instance: WSL2Instance,
    config: {
      username: string;
      email: string;
      token?: string;
    }
  ): Promise<void> {
    try {
      // Set git user configuration
      await this.executeCommand(instance, `git config --global user.name "${config.username}"`);
      await this.executeCommand(instance, `git config --global user.email "${config.email}"`);
      
      // Configure credential helper if token is provided
      if (config.token) {
        await this.executeCommand(instance, 'git config --global credential.helper store');
        
        // Store credentials
        const credentialCommand = `echo "https://${config.username}:${config.token}@github.com" > ~/.git-credentials`;
        await this.executeCommand(instance, credentialCommand);
      }
      
      this.emit('git.auth.configured', { instance: instance.id, username: config.username });
      
    } catch (error) {
      this.emit('git.auth.failed', { instance: instance.id, error: error.message });
      throw error;
    }
  }

  /**
   * Monitor git operation performance
   */
  public async monitorGitPerformance(
    instance: WSL2Instance,
    repositoryName: string
  ): Promise<{
    repositorySize: string;
    commitCount: number;
    lastCommitDate: Date;
    remoteUrl: string;
  }> {
    const repoPath = `${this.workingDirectory}/${repositoryName}`;
    
    try {
      // Get repository size
      const sizeOutput = await this.executeCommand(
        instance, 
        `cd ${repoPath} && du -sh .git | cut -f1`
      );
      
      // Get commit count
      const commitCountOutput = await this.executeCommand(
        instance, 
        `cd ${repoPath} && git rev-list --count HEAD`
      );
      
      // Get last commit date
      const lastCommitOutput = await this.executeCommand(
        instance, 
        `cd ${repoPath} && git log -1 --format="%ci"`
      );
      
      // Get remote URL
      const remoteUrlOutput = await this.executeCommand(
        instance, 
        `cd ${repoPath} && git remote get-url origin`
      );
      
      return {
        repositorySize: sizeOutput.trim(),
        commitCount: parseInt(commitCountOutput.trim(), 10),
        lastCommitDate: new Date(lastCommitOutput.trim()),
        remoteUrl: remoteUrlOutput.trim()
      };
      
    } catch (error) {
      throw new Error(`Failed to monitor git performance: ${error.message}`);
    }
  }

  /**
   * Get branch information
   */
  private async getBranchInfo(instance: WSL2Instance, repoPath: string): Promise<BranchInfo> {
    try {
      const commands = [
        `cd ${repoPath} && git remote get-url origin`,
        `cd ${repoPath} && git rev-parse --abbrev-ref HEAD`,
        `cd ${repoPath} && git rev-parse HEAD`,
        `cd ${repoPath} && git log -1 --format="%an"`,
        `cd ${repoPath} && git log -1 --format="%s"`,
        `cd ${repoPath} && git log -1 --format="%ci"`
      ];
      
      const results = await Promise.all(
        commands.map(cmd => this.executeCommand(instance, cmd))
      );
      
      return {
        repository: results[0].trim(),
        branch: results[1].trim(),
        commit: results[2].trim(),
        author: results[3].trim(),
        message: results[4].trim(),
        timestamp: new Date(results[5].trim())
      };
      
    } catch (error) {
      throw new Error(`Failed to get branch info: ${error.message}`);
    }
  }

  /**
   * Extract repository name from URL
   */
  private extractRepoName(repositoryUrl: string): string {
    const match = repositoryUrl.match(/\/([^\/]+)\.git$/) || repositoryUrl.match(/\/([^\/]+)$/);
    if (!match) {
      throw new Error(`Invalid repository URL: ${repositoryUrl}`);
    }
    return match[1];
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
}

