/**
 * GitInfoHelper.ts
 * 
 * Helper class for retrieving git repository information
 */

import { CommandResult } from './ExecutionAdapter';
import { Logger, LogCategory } from '../utils/logger';

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
 * Helper class for retrieving git repository information
 */
export class GitInfoHelper {
  private logger?: Logger;

  constructor(options?: { logger?: Logger }) {
    this.logger = options?.logger;
  }

  /**
   * Get git repository information
   * @param executeCommand Function to execute git commands
   * @returns Git repository information or null if not a git repository
   */
  async getGitRepositoryInfo(
    executeCommand: (command: string) => Promise<CommandResult>
  ): Promise<GitRepositoryInfo | null> {
    try {
      // Check if we're in a git repository
      const isGitRepo = await this.executeGitCommand(
        executeCommand,
        "git rev-parse --is-inside-work-tree 2>/dev/null || echo false"
      );

      if (isGitRepo.trim() !== "true") {
        return { isGitRepository: false };
      }

      // Get git directory
      const gitDir = await this.executeGitCommand(
        executeCommand,
        "git rev-parse --git-dir 2>/dev/null"
      );

      // Try to determine default branch (from origin)
      let defaultBranch = await this.executeGitCommand(
        executeCommand,
        "git remote show origin 2>/dev/null | grep 'HEAD branch' | cut -d ':' -f 2 | xargs"
      );

      // If no remote or no HEAD branch, try to guess from local branches
      if (!defaultBranch.trim()) {
        defaultBranch = await this.executeGitCommand(
          executeCommand,
          "git for-each-ref --format='%(refname:short)' refs/heads/ | grep -E '^(main|master|trunk)$' | head -1"
        );
      }

      // Get current branch
      const currentBranch = await this.executeGitCommand(
        executeCommand,
        "git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown"
      );

      // Check for uncommitted changes
      const status = await this.executeGitCommand(
        executeCommand,
        "git status --porcelain"
      );
      const hasUncommittedChanges = status.trim().length > 0;

      // Get current commit hash
      const commitSha = await this.executeGitCommand(
        executeCommand,
        "git rev-parse HEAD 2>/dev/null || echo ''"
      );

      // Get recent commits
      const recentCommits = (
        await this.executeGitCommand(
          executeCommand,
          "git log -5 --pretty=format:'%h %s'"
        )
      )
        .split("\n")
        .filter((line) => line.trim().length > 0);

      // Get changed files (not staged)
      const changedFiles = (
        await this.executeGitCommand(executeCommand, "git diff --name-only")
      )
        .split("\n")
        .filter((line) => line.trim().length > 0);

      // Get staged files
      const stagedFiles = (
        await this.executeGitCommand(
          executeCommand,
          "git diff --name-only --staged"
        )
      )
        .split("\n")
        .filter((line) => line.trim().length > 0);

      // Get untracked files
      const untrackedFiles = (
        await this.executeGitCommand(
          executeCommand,
          "git ls-files --others --exclude-standard"
        )
      )
        .split("\n")
        .filter((line) => line.trim().length > 0);

      // Get deleted files
      const deletedFiles = (
        await this.executeGitCommand(executeCommand, "git ls-files --deleted")
      )
        .split("\n")
        .filter((line) => line.trim().length > 0);

      return {
        isGitRepository: true,
        gitDir: gitDir.trim(),
        defaultBranch: defaultBranch.trim(),
        currentBranch: currentBranch.trim(),
        hasUncommittedChanges,
        commitSha: commitSha.trim(),
        recentCommits,
        changedFiles,
        stagedFiles,
        untrackedFiles,
        deletedFiles,
      };
    } catch (error) {
      this.logger?.error(
        "Error retrieving git repository information",
        error instanceof Error ? error : new Error(String(error)),
        LogCategory.EXECUTION
      );
      return null;
    }
  }

  /**
   * Execute a git command and return the stdout
   * @param executeCommand Function to execute git commands
   * @param command Git command to execute
   * @returns Command stdout
   */
  private async executeGitCommand(
    executeCommand: (command: string) => Promise<CommandResult>,
    command: string
  ): Promise<string> {
    try {
      const result = await executeCommand(command);
      return result.stdout;
    } catch (error) {
      this.logger?.debug(
        `Git command failed: ${command}`,
        LogCategory.EXECUTION,
        error
      );
      return "";
    }
  }
}

