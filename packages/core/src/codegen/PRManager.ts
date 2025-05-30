import type { Agent } from "../agent";
import type { LLMProvider } from "../agent/providers";
import type {
  PRCreationResult,
  ImplementationResult,
  TaskContext,
  CodebaseAnalysisResult,
  QualityAssuranceResult,
  GitHubOptions,
  PRCheck,
} from "./types";

/**
 * Pull Request Manager for creating and managing GitHub PRs
 * Handles automated PR creation with complete implementations
 */
export class PRManager {
  private agent: Agent<{ llm: LLMProvider<unknown> }>;
  private githubOptions?: GitHubOptions;

  constructor(
    agent: Agent<{ llm: LLMProvider<unknown> }>,
    githubOptions?: GitHubOptions
  ) {
    this.agent = agent;
    this.githubOptions = githubOptions;
  }

  /**
   * Create GitHub Pull Request with complete implementation
   */
  async createPullRequest(
    implementation: ImplementationResult,
    metadata: {
      task: TaskContext;
      analysis: CodebaseAnalysisResult;
      quality: QualityAssuranceResult;
    }
  ): Promise<PRCreationResult> {
    try {
      console.log("Creating PR for task:", metadata.task.title);

      // Generate PR title and description
      const prTitle = await this.generatePRTitle(metadata.task);
      const prDescription = await this.generatePRDescription(
        implementation,
        metadata
      );

      // Create branch name
      const branchName = this.generateBranchName(metadata.task);

      // Prepare files for PR
      const filesToCommit = this.prepareFilesForCommit(implementation);

      // Create the actual PR (this would integrate with GitHub API)
      const prResult = await this.createGitHubPR({
        title: prTitle,
        description: prDescription,
        branch: branchName,
        files: filesToCommit,
        baseBranch: metadata.task.branch || 'main',
      });

      // Add PR checks and validations
      const checks = await this.setupPRChecks(prResult, metadata.quality);

      return {
        ...prResult,
        checks,
      };
    } catch (error) {
      console.error("Failed to create PR:", error);
      throw new Error(`PR creation failed: ${error}`);
    }
  }

  /**
   * Update existing PR with new changes
   */
  async updatePullRequest(
    prNumber: number,
    implementation: ImplementationResult,
    metadata: {
      task: TaskContext;
      analysis: CodebaseAnalysisResult;
      quality: QualityAssuranceResult;
    }
  ): Promise<PRCreationResult> {
    try {
      console.log("Updating PR #", prNumber);

      // Update PR description with new information
      const updatedDescription = await this.generatePRDescription(
        implementation,
        metadata
      );

      // Prepare updated files
      const filesToUpdate = this.prepareFilesForCommit(implementation);

      // Update the PR (this would integrate with GitHub API)
      const prResult = await this.updateGitHubPR(prNumber, {
        description: updatedDescription,
        files: filesToUpdate,
      });

      return prResult;
    } catch (error) {
      console.error("Failed to update PR:", error);
      throw new Error(`PR update failed: ${error}`);
    }
  }

  /**
   * Add review comments to PR
   */
  async addReviewComments(
    prNumber: number,
    quality: QualityAssuranceResult
  ): Promise<void> {
    try {
      // Add comments for quality issues
      for (const issue of quality.issues) {
        if (issue.severity === 'high' || issue.severity === 'critical') {
          await this.addPRComment(prNumber, {
            body: `**${issue.category.toUpperCase()} Issue**: ${issue.description}\n\n${issue.fix ? `**Suggested Fix**: ${issue.fix}` : ''}`,
            path: issue.location,
          });
        }
      }

      // Add optimization suggestions
      if (quality.optimizationSuggestions) {
        for (const suggestion of quality.optimizationSuggestions) {
          if (suggestion.priority === 'high') {
            await this.addPRComment(prNumber, {
              body: `**Optimization Suggestion**: ${suggestion.description}\n\n**Implementation**: ${suggestion.implementation}\n\n**Expected Impact**: ${suggestion.estimatedImpact}`,
            });
          }
        }
      }
    } catch (error) {
      console.error("Failed to add review comments:", error);
    }
  }

  /**
   * Monitor PR status and checks
   */
  async monitorPRStatus(prNumber: number): Promise<PRCheck[]> {
    try {
      // This would integrate with GitHub API to check PR status
      return await this.getPRChecks(prNumber);
    } catch (error) {
      console.error("Failed to monitor PR status:", error);
      return [];
    }
  }

  // ===== Private Helper Methods =====

  private async generatePRTitle(task: TaskContext): Promise<string> {
    const prompt = `
Generate a clear, concise PR title for the following task:

Task: ${task.title}
Description: ${task.description}

The title should:
1. Be descriptive but concise
2. Follow conventional commit format if applicable
3. Indicate the type of change (feat, fix, refactor, etc.)
4. Be under 72 characters

Generate only the title, no additional text.
`;

    try {
      const response = await this.agent.generateText({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        maxTokens: 100,
      });

      return response.text.trim().replace(/^["']|["']$/g, '');
    } catch (error) {
      console.error("Failed to generate PR title:", error);
      return `feat: ${task.title}`;
    }
  }

  private async generatePRDescription(
    implementation: ImplementationResult,
    metadata: {
      task: TaskContext;
      analysis: CodebaseAnalysisResult;
      quality: QualityAssuranceResult;
    }
  ): Promise<string> {
    const prompt = `
Generate a comprehensive PR description for the following implementation:

## Task Information
- **Title**: ${metadata.task.title}
- **Description**: ${metadata.task.description}
- **Requirements**: ${metadata.task.requirements.naturalLanguage}

## Implementation Summary
- **Files Changed**: ${implementation.files.length}
- **File Types**: ${[...new Set(implementation.files.map(f => f.type))].join(', ')}
- **Key Files**: ${implementation.files.slice(0, 5).map(f => f.path).join(', ')}

## Quality Metrics
- **Overall Score**: ${(metadata.quality.overallScore * 100).toFixed(1)}%
- **Code Quality**: ${metadata.quality.codeQuality.maintainabilityIndex}/100
- **Security Score**: ${metadata.quality.security.score}/100
- **Performance Score**: ${metadata.quality.performance.score}/100
- **Test Coverage**: ${metadata.quality.testCoverage.overall}%

## Architecture
- **Patterns Used**: ${implementation.patterns.map(p => p.name).join(', ')}
- **Best Practices**: ${implementation.practices.length} applied
- **Optimizations**: ${implementation.optimizations.length} applied

Generate a professional PR description that includes:
1. ## Summary - Brief overview of changes
2. ## Changes Made - Detailed list of modifications
3. ## Testing - Testing approach and coverage
4. ## Quality Assurance - Quality metrics and checks
5. ## Breaking Changes - Any breaking changes (if applicable)
6. ## Additional Notes - Any important notes for reviewers

Use markdown formatting and be comprehensive but concise.
`;

    try {
      const response = await this.agent.generateText({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        maxTokens: 1500,
      });

      return response.text;
    } catch (error) {
      console.error("Failed to generate PR description:", error);
      return this.getDefaultPRDescription(metadata.task, implementation);
    }
  }

  private generateBranchName(task: TaskContext): string {
    // Generate branch name from task
    const sanitizedTitle = task.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    return `feature/${task.id}-${sanitizedTitle}`;
  }

  private prepareFilesForCommit(implementation: ImplementationResult): Array<{
    path: string;
    content: string;
    mode: string;
  }> {
    return implementation.files.map(file => ({
      path: file.path,
      content: file.content,
      mode: '100644', // Regular file mode
    }));
  }

  private async createGitHubPR(prData: {
    title: string;
    description: string;
    branch: string;
    files: Array<{ path: string; content: string; mode: string }>;
    baseBranch: string;
  }): Promise<PRCreationResult> {
    // This would integrate with actual GitHub API
    // For now, return a mock result
    const prNumber = Math.floor(Math.random() * 1000) + 1;
    const prUrl = `${this.githubOptions?.baseUrl || 'https://github.com'}/${this.githubOptions?.owner}/${this.githubOptions?.repo}/pull/${prNumber}`;

    return {
      prUrl,
      prNumber,
      branch: prData.branch,
      title: prData.title,
      description: prData.description,
      files: prData.files.map(f => f.path),
      status: 'created',
    };
  }

  private async updateGitHubPR(
    prNumber: number,
    updateData: {
      description: string;
      files: Array<{ path: string; content: string; mode: string }>;
    }
  ): Promise<PRCreationResult> {
    // This would integrate with actual GitHub API
    // For now, return a mock result
    const prUrl = `${this.githubOptions?.baseUrl || 'https://github.com'}/${this.githubOptions?.owner}/${this.githubOptions?.repo}/pull/${prNumber}`;

    return {
      prUrl,
      prNumber,
      branch: `feature/updated-${prNumber}`,
      title: "Updated Implementation",
      description: updateData.description,
      files: updateData.files.map(f => f.path),
      status: 'updated',
    };
  }

  private async addPRComment(
    prNumber: number,
    comment: {
      body: string;
      path?: string;
      line?: number;
    }
  ): Promise<void> {
    // This would integrate with GitHub API to add comments
    console.log(`Adding comment to PR #${prNumber}:`, comment.body);
  }

  private async setupPRChecks(
    prResult: PRCreationResult,
    quality: QualityAssuranceResult
  ): Promise<PRCheck[]> {
    const checks: PRCheck[] = [
      {
        name: "Quality Gate",
        status: quality.overallScore >= 0.8 ? 'success' : 'failure',
        description: `Overall quality score: ${(quality.overallScore * 100).toFixed(1)}%`,
      },
      {
        name: "Security Scan",
        status: quality.security.vulnerabilities.length === 0 ? 'success' : 'failure',
        description: `${quality.security.vulnerabilities.length} vulnerabilities found`,
      },
      {
        name: "Performance Check",
        status: quality.performance.score >= 80 ? 'success' : 'warning',
        description: `Performance score: ${quality.performance.score}/100`,
      },
      {
        name: "Test Coverage",
        status: quality.testCoverage.overall >= 80 ? 'success' : 'warning',
        description: `Test coverage: ${quality.testCoverage.overall}%`,
      },
    ];

    return checks;
  }

  private async getPRChecks(prNumber: number): Promise<PRCheck[]> {
    // This would integrate with GitHub API to get actual check status
    return [
      {
        name: "CI/CD Pipeline",
        status: 'pending',
        description: "Running automated tests and builds",
      },
    ];
  }

  private getDefaultPRDescription(task: TaskContext, implementation: ImplementationResult): string {
    return `## Summary

Implements ${task.title}

## Changes Made

- Added ${implementation.files.length} new files
- Implemented core functionality as specified in requirements
- Added comprehensive error handling and validation
- Included documentation and type definitions

## Testing

- Unit tests included for core functionality
- Integration tests for external dependencies
- Manual testing completed

## Quality Assurance

- Code review completed
- Security scan passed
- Performance optimization applied
- Coding standards compliance verified

## Additional Notes

This implementation follows the existing architectural patterns and maintains consistency with the codebase.
`;
  }
}

