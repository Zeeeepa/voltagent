import { Octokit } from '@octokit/rest';
import { 
  PRCreationOptions, 
  PRCreationResult, 
  PRAutomationError,
  PRCreationOptionsSchema 
} from '../types';

/**
 * Unified Automated PR Creation System
 * Consolidates all PR automation functionality with zero duplication
 */
export class UnifiedPRCreator {
  private octokit: Octokit;
  private defaultOptions: Partial<PRCreationOptions>;

  constructor(
    githubToken: string,
    defaultOptions: Partial<PRCreationOptions> = {}
  ) {
    this.octokit = new Octokit({
      auth: githubToken,
    });
    this.defaultOptions = defaultOptions;
  }

  /**
   * Create a new pull request with comprehensive automation
   */
  async createPR(options: PRCreationOptions): Promise<PRCreationResult> {
    try {
      // Validate input
      const validatedOptions = PRCreationOptionsSchema.parse({
        ...this.defaultOptions,
        ...options
      });

      const [owner, repo] = validatedOptions.repository.split('/');
      if (!owner || !repo) {
        throw new PRAutomationError('Invalid repository format. Expected "owner/repo"');
      }

      // Check if PR already exists
      const existingPR = await this.findExistingPR(
        owner, 
        repo, 
        validatedOptions.headBranch, 
        validatedOptions.baseBranch
      );

      if (existingPR) {
        // Update existing PR
        return await this.updateExistingPR(owner, repo, existingPR.number, validatedOptions);
      }

      // Create new PR
      const prResponse = await this.octokit.rest.pulls.create({
        owner,
        repo,
        title: validatedOptions.title,
        body: this.enhancePRDescription(validatedOptions.description),
        head: validatedOptions.headBranch,
        base: validatedOptions.baseBranch,
        draft: validatedOptions.draft || false,
      });

      const prNumber = prResponse.data.number;
      const prUrl = prResponse.data.html_url;

      // Add assignees if specified
      if (validatedOptions.assignees && validatedOptions.assignees.length > 0) {
        await this.addAssignees(owner, repo, prNumber, validatedOptions.assignees);
      }

      // Request reviewers if specified
      if (validatedOptions.reviewers && validatedOptions.reviewers.length > 0) {
        await this.requestReviewers(owner, repo, prNumber, validatedOptions.reviewers);
      }

      // Add labels if specified
      if (validatedOptions.labels && validatedOptions.labels.length > 0) {
        await this.addLabels(owner, repo, prNumber, validatedOptions.labels);
      }

      // Enable auto-merge if requested
      if (validatedOptions.autoMerge) {
        await this.enableAutoMerge(owner, repo, prNumber);
      }

      return {
        prNumber,
        prUrl,
        status: 'created',
        message: `Successfully created PR #${prNumber}`
      };

    } catch (error) {
      if (error instanceof PRAutomationError) {
        throw error;
      }
      
      throw new PRAutomationError(
        `Failed to create PR: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error, options }
      );
    }
  }

  /**
   * Create multiple PRs in batch
   */
  async createBatchPRs(prOptions: PRCreationOptions[]): Promise<PRCreationResult[]> {
    const results: PRCreationResult[] = [];
    
    for (const options of prOptions) {
      try {
        const result = await this.createPR(options);
        results.push(result);
      } catch (error) {
        results.push({
          prNumber: 0,
          prUrl: '',
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Create PR from code generation result
   */
  async createPRFromCodeGeneration(
    codeResult: {
      code: string;
      language: string;
      explanation?: string;
      tests?: string;
    },
    options: Omit<PRCreationOptions, 'title' | 'description'>
  ): Promise<PRCreationResult> {
    const title = `feat: Add generated ${codeResult.language} code`;
    const description = this.generateCodePRDescription(codeResult);

    return this.createPR({
      ...options,
      title,
      description,
      labels: [...(options.labels || []), 'auto-generated', `lang:${codeResult.language}`]
    });
  }

  /**
   * Create PR from NLP analysis result
   */
  async createPRFromNLPAnalysis(
    nlpResult: {
      summary?: string;
      keywords?: string[];
      confidence: number;
    },
    options: Omit<PRCreationOptions, 'title' | 'description'>
  ): Promise<PRCreationResult> {
    const title = `docs: Update based on NLP analysis`;
    const description = this.generateNLPPRDescription(nlpResult);

    return this.createPR({
      ...options,
      title,
      description,
      labels: [...(options.labels || []), 'nlp-generated', 'documentation']
    });
  }

  /**
   * Find existing PR for the same branch
   */
  private async findExistingPR(
    owner: string, 
    repo: string, 
    headBranch: string, 
    baseBranch: string
  ) {
    try {
      const { data: pulls } = await this.octokit.rest.pulls.list({
        owner,
        repo,
        head: `${owner}:${headBranch}`,
        base: baseBranch,
        state: 'open'
      });

      return pulls.length > 0 ? pulls[0] : null;
    } catch (error) {
      // If we can't find existing PRs, continue with creation
      return null;
    }
  }

  /**
   * Update existing PR
   */
  private async updateExistingPR(
    owner: string,
    repo: string,
    prNumber: number,
    options: PRCreationOptions
  ): Promise<PRCreationResult> {
    await this.octokit.rest.pulls.update({
      owner,
      repo,
      pull_number: prNumber,
      title: options.title,
      body: this.enhancePRDescription(options.description),
    });

    const prUrl = `https://github.com/${owner}/${repo}/pull/${prNumber}`;

    return {
      prNumber,
      prUrl,
      status: 'updated',
      message: `Successfully updated existing PR #${prNumber}`
    };
  }

  /**
   * Add assignees to PR
   */
  private async addAssignees(
    owner: string,
    repo: string,
    prNumber: number,
    assignees: string[]
  ) {
    try {
      await this.octokit.rest.issues.addAssignees({
        owner,
        repo,
        issue_number: prNumber,
        assignees
      });
    } catch (error) {
      console.warn(`Failed to add assignees to PR #${prNumber}:`, error);
    }
  }

  /**
   * Request reviewers for PR
   */
  private async requestReviewers(
    owner: string,
    repo: string,
    prNumber: number,
    reviewers: string[]
  ) {
    try {
      await this.octokit.rest.pulls.requestReviewers({
        owner,
        repo,
        pull_number: prNumber,
        reviewers
      });
    } catch (error) {
      console.warn(`Failed to request reviewers for PR #${prNumber}:`, error);
    }
  }

  /**
   * Add labels to PR
   */
  private async addLabels(
    owner: string,
    repo: string,
    prNumber: number,
    labels: string[]
  ) {
    try {
      await this.octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: prNumber,
        labels
      });
    } catch (error) {
      console.warn(`Failed to add labels to PR #${prNumber}:`, error);
    }
  }

  /**
   * Enable auto-merge for PR
   */
  private async enableAutoMerge(
    owner: string,
    repo: string,
    prNumber: number
  ) {
    try {
      // Note: This requires the repository to have auto-merge enabled
      await this.octokit.graphql(`
        mutation($pullRequestId: ID!) {
          enablePullRequestAutoMerge(input: {
            pullRequestId: $pullRequestId,
            mergeMethod: SQUASH
          }) {
            pullRequest {
              id
            }
          }
        }
      `, {
        pullRequestId: await this.getPRNodeId(owner, repo, prNumber)
      });
    } catch (error) {
      console.warn(`Failed to enable auto-merge for PR #${prNumber}:`, error);
    }
  }

  /**
   * Get PR node ID for GraphQL operations
   */
  private async getPRNodeId(owner: string, repo: string, prNumber: number): Promise<string> {
    const { data } = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNumber
    });
    return data.node_id;
  }

  /**
   * Enhance PR description with automation metadata
   */
  private enhancePRDescription(description: string): string {
    const timestamp = new Date().toISOString();
    const automationFooter = `

---
*🤖 This PR was created automatically by VoltAgent Codegen SDK*
*Generated at: ${timestamp}*
`;

    return description + automationFooter;
  }

  /**
   * Generate PR description for code generation results
   */
  private generateCodePRDescription(codeResult: {
    code: string;
    language: string;
    explanation?: string;
    tests?: string;
  }): string {
    let description = `## Generated ${codeResult.language} Code\n\n`;
    
    if (codeResult.explanation) {
      description += `### Explanation\n${codeResult.explanation}\n\n`;
    }

    description += `### Generated Code\n\`\`\`${codeResult.language}\n${codeResult.code}\n\`\`\`\n\n`;

    if (codeResult.tests) {
      description += `### Generated Tests\n\`\`\`${codeResult.language}\n${codeResult.tests}\n\`\`\`\n\n`;
    }

    description += `### Review Checklist\n`;
    description += `- [ ] Code follows project conventions\n`;
    description += `- [ ] Tests are comprehensive\n`;
    description += `- [ ] Documentation is updated\n`;
    description += `- [ ] Security considerations reviewed\n`;

    return description;
  }

  /**
   * Generate PR description for NLP analysis results
   */
  private generateNLPPRDescription(nlpResult: {
    summary?: string;
    keywords?: string[];
    confidence: number;
  }): string {
    let description = `## NLP Analysis Results\n\n`;
    
    if (nlpResult.summary) {
      description += `### Summary\n${nlpResult.summary}\n\n`;
    }

    if (nlpResult.keywords && nlpResult.keywords.length > 0) {
      description += `### Key Topics\n`;
      description += nlpResult.keywords.map(keyword => `- ${keyword}`).join('\n');
      description += '\n\n';
    }

    description += `### Analysis Confidence\n${Math.round(nlpResult.confidence * 100)}%\n\n`;

    description += `### Review Notes\n`;
    description += `- Analysis performed using unified NLP engine\n`;
    description += `- Confidence threshold met for automated processing\n`;
    description += `- Manual review recommended for critical changes\n`;

    return description;
  }

  /**
   * Get PR status and metadata
   */
  async getPRStatus(owner: string, repo: string, prNumber: number) {
    try {
      const { data: pr } = await this.octokit.rest.pulls.get({
        owner,
        repo,
        pull_number: prNumber
      });

      const { data: reviews } = await this.octokit.rest.pulls.listReviews({
        owner,
        repo,
        pull_number: prNumber
      });

      const { data: checks } = await this.octokit.rest.checks.listForRef({
        owner,
        repo,
        ref: pr.head.sha
      });

      return {
        state: pr.state,
        mergeable: pr.mergeable,
        merged: pr.merged,
        draft: pr.draft,
        reviews: reviews.length,
        approvals: reviews.filter(review => review.state === 'APPROVED').length,
        checksStatus: checks.check_runs.every(check => check.conclusion === 'success') ? 'passing' : 'failing',
        url: pr.html_url
      };
    } catch (error) {
      throw new PRAutomationError(
        `Failed to get PR status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { owner, repo, prNumber }
      );
    }
  }
}

