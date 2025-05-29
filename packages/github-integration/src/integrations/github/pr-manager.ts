import { EventEmitter } from 'events';
import { Octokit } from '@octokit/rest';
import { z } from 'zod';

const PRConfigSchema = z.object({
  token: z.string(),
  owner: z.string(),
  repo: z.string(),
  autoMerge: z.boolean().default(false),
  requiredChecks: z.array(z.string()).default([]),
  reviewers: z.array(z.string()).default([]),
});

export type PRConfig = z.infer<typeof PRConfigSchema>;

export interface PRInfo {
  number: number;
  title: string;
  body: string;
  head: string;
  base: string;
  state: 'open' | 'closed' | 'merged';
  mergeable: boolean | null;
  author: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PRStatus {
  number: number;
  checks: CheckStatus[];
  reviews: ReviewStatus[];
  mergeable: boolean;
  conflicts: boolean;
}

export interface CheckStatus {
  name: string;
  status: 'pending' | 'success' | 'failure' | 'error';
  conclusion: string | null;
  url: string | null;
}

export interface ReviewStatus {
  reviewer: string;
  state: 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'DISMISSED';
  submittedAt: Date | null;
}

export class GitHubPRManager extends EventEmitter {
  private octokit: Octokit;
  private config: PRConfig;

  constructor(config: PRConfig) {
    super();
    this.config = PRConfigSchema.parse(config);
    this.octokit = new Octokit({ auth: this.config.token });
  }

  /**
   * Create a new pull request
   */
  async createPR(
    title: string,
    body: string,
    head: string,
    base: string = 'main'
  ): Promise<PRInfo> {
    this.emit('pr:creating', { title, head, base });

    try {
      const response = await this.octokit.rest.pulls.create({
        owner: this.config.owner,
        repo: this.config.repo,
        title,
        body,
        head,
        base,
      });

      const prInfo = this.mapPRResponse(response.data);
      
      // Add reviewers if configured
      if (this.config.reviewers.length > 0) {
        await this.addReviewers(prInfo.number, this.config.reviewers);
      }

      this.emit('pr:created', prInfo);
      return prInfo;
    } catch (error) {
      this.emit('pr:create:failed', { title, head, base, error });
      throw error;
    }
  }

  /**
   * Update an existing pull request
   */
  async updatePR(
    prNumber: number,
    updates: Partial<{ title: string; body: string; state: 'open' | 'closed' }>
  ): Promise<PRInfo> {
    this.emit('pr:updating', { prNumber, updates });

    try {
      const response = await this.octokit.rest.pulls.update({
        owner: this.config.owner,
        repo: this.config.repo,
        pull_number: prNumber,
        ...updates,
      });

      const prInfo = this.mapPRResponse(response.data);
      this.emit('pr:updated', prInfo);
      return prInfo;
    } catch (error) {
      this.emit('pr:update:failed', { prNumber, updates, error });
      throw error;
    }
  }

  /**
   * Get pull request information
   */
  async getPR(prNumber: number): Promise<PRInfo> {
    try {
      const response = await this.octokit.rest.pulls.get({
        owner: this.config.owner,
        repo: this.config.repo,
        pull_number: prNumber,
      });

      return this.mapPRResponse(response.data);
    } catch (error) {
      this.emit('pr:get:failed', { prNumber, error });
      throw error;
    }
  }

  /**
   * Get pull request status including checks and reviews
   */
  async getPRStatus(prNumber: number): Promise<PRStatus> {
    try {
      const [pr, checks, reviews] = await Promise.all([
        this.getPR(prNumber),
        this.getChecks(prNumber),
        this.getReviews(prNumber),
      ]);

      return {
        number: prNumber,
        checks,
        reviews,
        mergeable: pr.mergeable ?? false,
        conflicts: pr.mergeable === false,
      };
    } catch (error) {
      this.emit('pr:status:failed', { prNumber, error });
      throw error;
    }
  }

  /**
   * Merge a pull request
   */
  async mergePR(
    prNumber: number,
    mergeMethod: 'merge' | 'squash' | 'rebase' = 'merge',
    commitTitle?: string,
    commitMessage?: string
  ): Promise<void> {
    this.emit('pr:merging', { prNumber, mergeMethod });

    try {
      // Check if PR is mergeable
      const status = await this.getPRStatus(prNumber);
      if (!status.mergeable) {
        throw new Error('Pull request is not mergeable');
      }

      // Check required status checks
      if (this.config.requiredChecks.length > 0) {
        const failedChecks = status.checks.filter(check => 
          this.config.requiredChecks.includes(check.name) && 
          check.status !== 'success'
        );

        if (failedChecks.length > 0) {
          throw new Error(`Required checks failed: ${failedChecks.map(c => c.name).join(', ')}`);
        }
      }

      await this.octokit.rest.pulls.merge({
        owner: this.config.owner,
        repo: this.config.repo,
        pull_number: prNumber,
        merge_method: mergeMethod,
        commit_title: commitTitle,
        commit_message: commitMessage,
      });

      this.emit('pr:merged', { prNumber, mergeMethod });
    } catch (error) {
      this.emit('pr:merge:failed', { prNumber, mergeMethod, error });
      throw error;
    }
  }

  /**
   * Close a pull request
   */
  async closePR(prNumber: number): Promise<void> {
    this.emit('pr:closing', { prNumber });

    try {
      await this.updatePR(prNumber, { state: 'closed' });
      this.emit('pr:closed', { prNumber });
    } catch (error) {
      this.emit('pr:close:failed', { prNumber, error });
      throw error;
    }
  }

  /**
   * Add reviewers to a pull request
   */
  async addReviewers(prNumber: number, reviewers: string[]): Promise<void> {
    try {
      await this.octokit.rest.pulls.requestReviewers({
        owner: this.config.owner,
        repo: this.config.repo,
        pull_number: prNumber,
        reviewers,
      });

      this.emit('pr:reviewers:added', { prNumber, reviewers });
    } catch (error) {
      this.emit('pr:reviewers:failed', { prNumber, reviewers, error });
      throw error;
    }
  }

  /**
   * Add a comment to a pull request
   */
  async addComment(prNumber: number, body: string): Promise<void> {
    try {
      await this.octokit.rest.issues.createComment({
        owner: this.config.owner,
        repo: this.config.repo,
        issue_number: prNumber,
        body,
      });

      this.emit('pr:comment:added', { prNumber, body });
    } catch (error) {
      this.emit('pr:comment:failed', { prNumber, body, error });
      throw error;
    }
  }

  /**
   * Get status checks for a pull request
   */
  private async getChecks(prNumber: number): Promise<CheckStatus[]> {
    try {
      const pr = await this.getPR(prNumber);
      const response = await this.octokit.rest.checks.listForRef({
        owner: this.config.owner,
        repo: this.config.repo,
        ref: pr.head,
      });

      return response.data.check_runs.map(check => ({
        name: check.name,
        status: check.status as 'pending' | 'success' | 'failure' | 'error',
        conclusion: check.conclusion,
        url: check.html_url,
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get reviews for a pull request
   */
  private async getReviews(prNumber: number): Promise<ReviewStatus[]> {
    try {
      const response = await this.octokit.rest.pulls.listReviews({
        owner: this.config.owner,
        repo: this.config.repo,
        pull_number: prNumber,
      });

      return response.data.map(review => ({
        reviewer: review.user?.login || 'unknown',
        state: review.state as 'PENDING' | 'APPROVED' | 'CHANGES_REQUESTED' | 'DISMISSED',
        submittedAt: review.submitted_at ? new Date(review.submitted_at) : null,
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Map GitHub API response to PRInfo
   */
  private mapPRResponse(data: any): PRInfo {
    return {
      number: data.number,
      title: data.title,
      body: data.body || '',
      head: data.head.ref,
      base: data.base.ref,
      state: data.state,
      mergeable: data.mergeable,
      author: data.user.login,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }

  /**
   * List open pull requests
   */
  async listOpenPRs(): Promise<PRInfo[]> {
    try {
      const response = await this.octokit.rest.pulls.list({
        owner: this.config.owner,
        repo: this.config.repo,
        state: 'open',
      });

      return response.data.map(pr => this.mapPRResponse(pr));
    } catch (error) {
      this.emit('pr:list:failed', { error });
      throw error;
    }
  }

  /**
   * Check if branch has conflicts with base
   */
  async checkConflicts(prNumber: number): Promise<boolean> {
    try {
      const pr = await this.getPR(prNumber);
      return pr.mergeable === false;
    } catch (error) {
      return true; // Assume conflicts if we can't check
    }
  }
}

export default GitHubPRManager;

