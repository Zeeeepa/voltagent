/**
 * Codegen Pull Request Manager
 * 
 * Pull request creation and management through Codegen SDK
 */

import { CodegenSDKClient, TaskStatus, CodegenTask } from './sdk-client.js';
import { CodegenRepositoryOps } from './repository-ops.js';

export interface PRTemplate {
  title: string;
  description: string;
  labels?: string[];
  assignees?: string[];
  reviewers?: string[];
}

export interface PRStatus {
  number: number;
  state: 'open' | 'closed' | 'merged';
  title: string;
  description: string;
  headBranch: string;
  baseBranch: string;
  url: string;
  createdAt: Date;
  updatedAt: Date;
  mergeable?: boolean;
  checks?: PRCheck[];
}

export interface PRCheck {
  name: string;
  status: 'pending' | 'success' | 'failure' | 'error';
  conclusion?: string;
  url?: string;
}

export interface PRReview {
  id: string;
  state: 'approved' | 'changes_requested' | 'commented';
  reviewer: string;
  body?: string;
  submittedAt: Date;
}

export interface PRComment {
  id: string;
  body: string;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CodegenPRManager {
  private client: CodegenSDKClient;
  private repoOps: CodegenRepositoryOps;

  constructor(client: CodegenSDKClient) {
    this.client = client;
    this.repoOps = new CodegenRepositoryOps(client);
  }

  /**
   * Create a pull request with enhanced options
   */
  async createPullRequest(
    repoUrl: string,
    headBranch: string,
    baseBranch: string,
    template: PRTemplate
  ): Promise<CodegenTask> {
    const status = await this.client.makeRequest<TaskStatus>('/api/v1/repository/pull-request', {
      method: 'POST',
      body: JSON.stringify({
        repoUrl,
        headBranch,
        baseBranch,
        title: template.title,
        description: template.description,
        labels: template.labels,
        assignees: template.assignees,
        reviewers: template.reviewers,
      }),
    });
    
    return new CodegenTask(this.client, status);
  }

  /**
   * Get detailed pull request status
   */
  async getPRStatus(repoUrl: string, prNumber: number): Promise<PRStatus> {
    return this.client.makeRequest<PRStatus>(
      `/api/v1/repository/pull-request/${prNumber}/status?repoUrl=${encodeURIComponent(repoUrl)}`
    );
  }

  /**
   * Update pull request
   */
  async updatePR(
    repoUrl: string,
    prNumber: number,
    updates: Partial<PRTemplate>
  ): Promise<CodegenTask> {
    const status = await this.client.makeRequest<TaskStatus>(
      `/api/v1/repository/pull-request/${prNumber}`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          repoUrl,
          ...updates,
        }),
      }
    );
    
    return new CodegenTask(this.client, status);
  }

  /**
   * Add comment to pull request
   */
  async addComment(
    repoUrl: string,
    prNumber: number,
    comment: string
  ): Promise<CodegenTask> {
    const status = await this.client.makeRequest<TaskStatus>(
      `/api/v1/repository/pull-request/${prNumber}/comment`,
      {
        method: 'POST',
        body: JSON.stringify({
          repoUrl,
          body: comment,
        }),
      }
    );
    
    return new CodegenTask(this.client, status);
  }

  /**
   * Get pull request comments
   */
  async getComments(repoUrl: string, prNumber: number): Promise<PRComment[]> {
    const response = await this.client.makeRequest<{ comments: PRComment[] }>(
      `/api/v1/repository/pull-request/${prNumber}/comments?repoUrl=${encodeURIComponent(repoUrl)}`
    );
    return response.comments;
  }

  /**
   * Request review from users
   */
  async requestReview(
    repoUrl: string,
    prNumber: number,
    reviewers: string[]
  ): Promise<CodegenTask> {
    const status = await this.client.makeRequest<TaskStatus>(
      `/api/v1/repository/pull-request/${prNumber}/review-request`,
      {
        method: 'POST',
        body: JSON.stringify({
          repoUrl,
          reviewers,
        }),
      }
    );
    
    return new CodegenTask(this.client, status);
  }

  /**
   * Get pull request reviews
   */
  async getReviews(repoUrl: string, prNumber: number): Promise<PRReview[]> {
    const response = await this.client.makeRequest<{ reviews: PRReview[] }>(
      `/api/v1/repository/pull-request/${prNumber}/reviews?repoUrl=${encodeURIComponent(repoUrl)}`
    );
    return response.reviews;
  }

  /**
   * Merge pull request
   */
  async mergePR(
    repoUrl: string,
    prNumber: number,
    mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge',
    commitMessage?: string
  ): Promise<CodegenTask> {
    const status = await this.client.makeRequest<TaskStatus>(
      `/api/v1/repository/pull-request/${prNumber}/merge`,
      {
        method: 'POST',
        body: JSON.stringify({
          repoUrl,
          mergeMethod,
          commitMessage,
        }),
      }
    );
    
    return new CodegenTask(this.client, status);
  }

  /**
   * Close pull request
   */
  async closePR(repoUrl: string, prNumber: number): Promise<CodegenTask> {
    const status = await this.client.makeRequest<TaskStatus>(
      `/api/v1/repository/pull-request/${prNumber}/close`,
      {
        method: 'POST',
        body: JSON.stringify({
          repoUrl,
        }),
      }
    );
    
    return new CodegenTask(this.client, status);
  }

  /**
   * Get pull request checks/CI status
   */
  async getPRChecks(repoUrl: string, prNumber: number): Promise<PRCheck[]> {
    const response = await this.client.makeRequest<{ checks: PRCheck[] }>(
      `/api/v1/repository/pull-request/${prNumber}/checks?repoUrl=${encodeURIComponent(repoUrl)}`
    );
    return response.checks;
  }

  /**
   * Wait for PR checks to complete
   */
  async waitForChecks(
    repoUrl: string,
    prNumber: number,
    timeout: number = 300000 // 5 minutes
  ): Promise<PRCheck[]> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const checks = await this.getPRChecks(repoUrl, prNumber);
      
      const allComplete = checks.every(check => 
        check.status === 'success' || check.status === 'failure' || check.status === 'error'
      );
      
      if (allComplete) {
        return checks;
      }
      
      // Wait 10 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    throw new Error('Timeout waiting for PR checks to complete');
  }

  /**
   * Auto-merge PR if conditions are met
   */
  async autoMergePR(
    repoUrl: string,
    prNumber: number,
    conditions: {
      requireApproval?: boolean;
      requireChecks?: boolean;
      mergeMethod?: 'merge' | 'squash' | 'rebase';
    } = {}
  ): Promise<CodegenTask> {
    const {
      requireApproval = true,
      requireChecks = true,
      mergeMethod = 'merge'
    } = conditions;

    // Check PR status
    const prStatus = await this.getPRStatus(repoUrl, prNumber);
    
    if (prStatus.state !== 'open') {
      throw new Error(`PR #${prNumber} is not open (current state: ${prStatus.state})`);
    }

    // Check reviews if required
    if (requireApproval) {
      const reviews = await this.getReviews(repoUrl, prNumber);
      const hasApproval = reviews.some(review => review.state === 'approved');
      
      if (!hasApproval) {
        throw new Error(`PR #${prNumber} requires approval before merging`);
      }
    }

    // Check CI status if required
    if (requireChecks) {
      const checks = await this.getPRChecks(repoUrl, prNumber);
      const hasFailures = checks.some(check => 
        check.status === 'failure' || check.status === 'error'
      );
      
      if (hasFailures) {
        throw new Error(`PR #${prNumber} has failing checks`);
      }
    }

    // Merge the PR
    return this.mergePR(repoUrl, prNumber, mergeMethod);
  }

  /**
   * Generate PR template based on changes
   */
  async generatePRTemplate(
    repoUrl: string,
    headBranch: string,
    baseBranch: string
  ): Promise<PRTemplate> {
    const response = await this.client.makeRequest<PRTemplate>(
      '/api/v1/repository/pull-request/template',
      {
        method: 'POST',
        body: JSON.stringify({
          repoUrl,
          headBranch,
          baseBranch,
        }),
      }
    );
    
    return response;
  }
}

