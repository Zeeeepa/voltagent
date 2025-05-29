/**
 * Codegen Repository Operations
 * 
 * Git repository management through Codegen SDK
 */

import { CodegenSDKClient, TaskStatus, CodegenTask } from './sdk-client.js';

export interface FileOperation {
  path: string;
  content?: string;
  operation: 'create' | 'update' | 'delete';
}

export interface CommitInfo {
  message: string;
  author?: {
    name: string;
    email: string;
  };
}

export interface BranchInfo {
  name: string;
  baseBranch: string;
  repoUrl: string;
}

export interface PullRequestInfo {
  title: string;
  description: string;
  headBranch: string;
  baseBranch: string;
  repoUrl: string;
  draft?: boolean;
}

export class CodegenRepositoryOps {
  private client: CodegenSDKClient;

  constructor(client: CodegenSDKClient) {
    this.client = client;
  }

  /**
   * Create a new branch
   */
  async createBranch(branchInfo: BranchInfo): Promise<CodegenTask> {
    const status = await this.client.createBranch(
      branchInfo.repoUrl,
      branchInfo.name,
      branchInfo.baseBranch
    );
    
    return new CodegenTask(this.client, status);
  }

  /**
   * Perform file operations (create, update, delete)
   */
  async performFileOperations(
    repoUrl: string,
    branchName: string,
    operations: FileOperation[]
  ): Promise<CodegenTask> {
    const status = await this.client.makeRequest<TaskStatus>('/api/v1/repository/files', {
      method: 'POST',
      body: JSON.stringify({
        repoUrl,
        branchName,
        operations,
      }),
    });
    
    return new CodegenTask(this.client, status);
  }

  /**
   * Create a single file
   */
  async createFile(
    repoUrl: string,
    branchName: string,
    filePath: string,
    content: string
  ): Promise<CodegenTask> {
    return this.performFileOperations(repoUrl, branchName, [
      {
        path: filePath,
        content,
        operation: 'create',
      },
    ]);
  }

  /**
   * Update a single file
   */
  async updateFile(
    repoUrl: string,
    branchName: string,
    filePath: string,
    content: string
  ): Promise<CodegenTask> {
    return this.performFileOperations(repoUrl, branchName, [
      {
        path: filePath,
        content,
        operation: 'update',
      },
    ]);
  }

  /**
   * Delete a single file
   */
  async deleteFile(
    repoUrl: string,
    branchName: string,
    filePath: string
  ): Promise<CodegenTask> {
    return this.performFileOperations(repoUrl, branchName, [
      {
        path: filePath,
        operation: 'delete',
      },
    ]);
  }

  /**
   * Commit changes to a branch
   */
  async commitChanges(
    repoUrl: string,
    branchName: string,
    commitInfo: CommitInfo
  ): Promise<CodegenTask> {
    const status = await this.client.makeRequest<TaskStatus>('/api/v1/repository/commit', {
      method: 'POST',
      body: JSON.stringify({
        repoUrl,
        branchName,
        message: commitInfo.message,
        author: commitInfo.author,
      }),
    });
    
    return new CodegenTask(this.client, status);
  }

  /**
   * Push changes to remote repository
   */
  async pushChanges(
    repoUrl: string,
    branchName: string
  ): Promise<CodegenTask> {
    const status = await this.client.makeRequest<TaskStatus>('/api/v1/repository/push', {
      method: 'POST',
      body: JSON.stringify({
        repoUrl,
        branchName,
      }),
    });
    
    return new CodegenTask(this.client, status);
  }

  /**
   * Create a pull request
   */
  async createPullRequest(prInfo: PullRequestInfo): Promise<CodegenTask> {
    const status = await this.client.createPullRequest({
      repoUrl: prInfo.repoUrl,
      title: prInfo.title,
      description: prInfo.description,
      headBranch: prInfo.headBranch,
      baseBranch: prInfo.baseBranch,
    });
    
    return new CodegenTask(this.client, status);
  }

  /**
   * Get repository information
   */
  async getRepositoryInfo(repoUrl: string): Promise<any> {
    return this.client.makeRequest(`/api/v1/repository/info?repoUrl=${encodeURIComponent(repoUrl)}`);
  }

  /**
   * List branches in repository
   */
  async listBranches(repoUrl: string): Promise<string[]> {
    const response = await this.client.makeRequest<{ branches: string[] }>(
      `/api/v1/repository/branches?repoUrl=${encodeURIComponent(repoUrl)}`
    );
    return response.branches;
  }

  /**
   * Get file content from repository
   */
  async getFileContent(
    repoUrl: string,
    filePath: string,
    branchName: string = 'main'
  ): Promise<string> {
    const response = await this.client.makeRequest<{ content: string }>(
      `/api/v1/repository/file?repoUrl=${encodeURIComponent(repoUrl)}&path=${encodeURIComponent(filePath)}&branch=${encodeURIComponent(branchName)}`
    );
    return response.content;
  }

  /**
   * List files in repository directory
   */
  async listFiles(
    repoUrl: string,
    directoryPath: string = '',
    branchName: string = 'main'
  ): Promise<string[]> {
    const response = await this.client.makeRequest<{ files: string[] }>(
      `/api/v1/repository/files?repoUrl=${encodeURIComponent(repoUrl)}&path=${encodeURIComponent(directoryPath)}&branch=${encodeURIComponent(branchName)}`
    );
    return response.files;
  }

  /**
   * Clone repository (if supported)
   */
  async cloneRepository(
    repoUrl: string,
    targetPath?: string
  ): Promise<CodegenTask> {
    const status = await this.client.makeRequest<TaskStatus>('/api/v1/repository/clone', {
      method: 'POST',
      body: JSON.stringify({
        repoUrl,
        targetPath,
      }),
    });
    
    return new CodegenTask(this.client, status);
  }

  /**
   * Merge pull request
   */
  async mergePullRequest(
    repoUrl: string,
    prNumber: number,
    mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge'
  ): Promise<CodegenTask> {
    const status = await this.client.mergePullRequest(repoUrl, prNumber, mergeMethod);
    return new CodegenTask(this.client, status);
  }

  /**
   * Get pull request status
   */
  async getPullRequestStatus(
    repoUrl: string,
    prNumber: number
  ): Promise<any> {
    return this.client.makeRequest(
      `/api/v1/repository/pull-request/${prNumber}?repoUrl=${encodeURIComponent(repoUrl)}`
    );
  }

  /**
   * List pull requests
   */
  async listPullRequests(
    repoUrl: string,
    state: 'open' | 'closed' | 'all' = 'open'
  ): Promise<any[]> {
    const response = await this.client.makeRequest<{ pullRequests: any[] }>(
      `/api/v1/repository/pull-requests?repoUrl=${encodeURIComponent(repoUrl)}&state=${state}`
    );
    return response.pullRequests;
  }
}
