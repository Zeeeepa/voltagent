import { EventEmitter } from 'events';
import { Octokit } from '@octokit/rest';
import { z } from 'zod';

const ReviewConfigSchema = z.object({
  token: z.string(),
  owner: z.string(),
  repo: z.string(),
  claudeApiKey: z.string(),
  agentApiUrl: z.string().default('http://localhost:3000'),
  autoReview: z.boolean().default(true),
  reviewThreshold: z.number().default(70),
  securityChecks: z.boolean().default(true),
  performanceChecks: z.boolean().default(true),
});

export type ReviewConfig = z.infer<typeof ReviewConfigSchema>;

export interface AutoReviewResult {
  prNumber: number;
  score: number;
  approved: boolean;
  issues: ReviewIssue[];
  suggestions: ReviewSuggestion[];
  securityFindings: SecurityFinding[];
  performanceIssues: PerformanceIssue[];
  summary: string;
}

export interface ReviewIssue {
  file: string;
  line: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type: 'bug' | 'security' | 'performance' | 'style' | 'maintainability';
  message: string;
  suggestion?: string;
}

export interface ReviewSuggestion {
  file: string;
  line: number;
  type: 'improvement' | 'optimization' | 'best-practice';
  message: string;
  code?: string;
}

export interface SecurityFinding {
  file: string;
  line: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cwe: string;
  description: string;
  recommendation: string;
}

export interface PerformanceIssue {
  file: string;
  line: number;
  type: 'memory' | 'cpu' | 'network' | 'database';
  impact: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
}

export class GitHubReviewAutomation extends EventEmitter {
  private octokit: Octokit;
  private config: ReviewConfig;

  constructor(config: ReviewConfig) {
    super();
    this.config = ReviewConfigSchema.parse(config);
    this.octokit = new Octokit({ auth: this.config.token });
  }

  /**
   * Perform automated review of a pull request
   */
  async reviewPR(prNumber: number): Promise<AutoReviewResult> {
    this.emit('review:started', { prNumber });

    try {
      // Get PR details and files
      const [prData, files, diff] = await Promise.all([
        this.getPRData(prNumber),
        this.getPRFiles(prNumber),
        this.getPRDiff(prNumber),
      ]);

      // Perform Claude Code review
      const claudeReview = await this.performClaudeReview(prNumber, files, diff);

      // Perform security analysis
      const securityFindings = this.config.securityChecks 
        ? await this.performSecurityAnalysis(files, diff)
        : [];

      // Perform performance analysis
      const performanceIssues = this.config.performanceChecks
        ? await this.performPerformanceAnalysis(files, diff)
        : [];

      // Calculate overall score
      const score = this.calculateReviewScore(claudeReview, securityFindings, performanceIssues);
      const approved = score >= this.config.reviewThreshold;

      const result: AutoReviewResult = {
        prNumber,
        score,
        approved,
        issues: claudeReview.issues,
        suggestions: claudeReview.suggestions,
        securityFindings,
        performanceIssues,
        summary: this.generateReviewSummary(score, approved, claudeReview, securityFindings, performanceIssues),
      };

      // Post review comments
      await this.postReviewComments(prNumber, result);

      // Submit review
      await this.submitReview(prNumber, result);

      this.emit('review:completed', { prNumber, result });
      return result;
    } catch (error) {
      this.emit('review:failed', { prNumber, error });
      throw error;
    }
  }

  /**
   * Get PR data from GitHub
   */
  private async getPRData(prNumber: number): Promise<any> {
    const response = await this.octokit.rest.pulls.get({
      owner: this.config.owner,
      repo: this.config.repo,
      pull_number: prNumber,
    });
    return response.data;
  }

  /**
   * Get files changed in the PR
   */
  private async getPRFiles(prNumber: number): Promise<string[]> {
    const response = await this.octokit.rest.pulls.listFiles({
      owner: this.config.owner,
      repo: this.config.repo,
      pull_number: prNumber,
    });
    return response.data.map(file => file.filename);
  }

  /**
   * Get PR diff
   */
  private async getPRDiff(prNumber: number): Promise<string> {
    const response = await this.octokit.rest.pulls.get({
      owner: this.config.owner,
      repo: this.config.repo,
      pull_number: prNumber,
      mediaType: {
        format: 'diff',
      },
    });
    return response.data as unknown as string;
  }

  /**
   * Perform Claude Code review
   */
  private async performClaudeReview(
    prNumber: number,
    files: string[],
    diff: string
  ): Promise<{ issues: ReviewIssue[]; suggestions: ReviewSuggestion[] }> {
    const prompt = `
Please review this pull request:

Files changed: ${files.join(', ')}

Diff:
${diff}

Analyze the code for:
1. Bugs and potential issues
2. Security vulnerabilities
3. Performance problems
4. Code style and maintainability
5. Best practices

Provide specific feedback with file names and line numbers.
Format your response as JSON with 'issues' and 'suggestions' arrays.
`;

    try {
      const response = await fetch(`${this.config.agentApiUrl}/claude/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.claudeApiKey}`,
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 4000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await response.json();
      const content = data.content[0].text;
      
      try {
        const parsed = JSON.parse(content);
        return {
          issues: parsed.issues || [],
          suggestions: parsed.suggestions || [],
        };
      } catch {
        // Fallback if JSON parsing fails
        return { issues: [], suggestions: [] };
      }
    } catch (error) {
      this.emit('claude:review:failed', { prNumber, error });
      return { issues: [], suggestions: [] };
    }
  }

  /**
   * Perform security analysis
   */
  private async performSecurityAnalysis(files: string[], diff: string): Promise<SecurityFinding[]> {
    const findings: SecurityFinding[] = [];

    // Check for common security issues in the diff
    const securityPatterns = [
      {
        pattern: /password\s*=\s*["'][^"']+["']/gi,
        cwe: 'CWE-798',
        severity: 'high' as const,
        description: 'Hardcoded password detected',
        recommendation: 'Use environment variables or secure configuration',
      },
      {
        pattern: /api[_-]?key\s*=\s*["'][^"']+["']/gi,
        cwe: 'CWE-798',
        severity: 'high' as const,
        description: 'Hardcoded API key detected',
        recommendation: 'Use environment variables or secure vault',
      },
      {
        pattern: /eval\s*\(/gi,
        cwe: 'CWE-95',
        severity: 'critical' as const,
        description: 'Use of eval() function detected',
        recommendation: 'Avoid eval() and use safer alternatives',
      },
      {
        pattern: /innerHTML\s*=/gi,
        cwe: 'CWE-79',
        severity: 'medium' as const,
        description: 'Potential XSS vulnerability with innerHTML',
        recommendation: 'Use textContent or sanitize HTML input',
      },
    ];

    for (const pattern of securityPatterns) {
      const matches = diff.matchAll(pattern.pattern);
      for (const match of matches) {
        findings.push({
          file: 'unknown', // Would need more sophisticated parsing to get exact file
          line: 0,
          severity: pattern.severity,
          cwe: pattern.cwe,
          description: pattern.description,
          recommendation: pattern.recommendation,
        });
      }
    }

    return findings;
  }

  /**
   * Perform performance analysis
   */
  private async performPerformanceAnalysis(files: string[], diff: string): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];

    // Check for common performance issues
    const performancePatterns = [
      {
        pattern: /for\s*\([^)]*\)\s*{\s*for\s*\([^)]*\)/gi,
        type: 'cpu' as const,
        impact: 'medium' as const,
        description: 'Nested loops detected - potential O(n²) complexity',
        suggestion: 'Consider optimizing with better algorithms or data structures',
      },
      {
        pattern: /\.forEach\s*\([^)]*\)\s*{\s*[^}]*\.forEach/gi,
        type: 'cpu' as const,
        impact: 'medium' as const,
        description: 'Nested forEach loops detected',
        suggestion: 'Consider flattening or using more efficient iteration',
      },
      {
        pattern: /new\s+Array\s*\(\s*\d{4,}\s*\)/gi,
        type: 'memory' as const,
        impact: 'high' as const,
        description: 'Large array allocation detected',
        suggestion: 'Consider streaming or pagination for large datasets',
      },
    ];

    for (const pattern of performancePatterns) {
      const matches = diff.matchAll(pattern.pattern);
      for (const match of matches) {
        issues.push({
          file: 'unknown',
          line: 0,
          type: pattern.type,
          impact: pattern.impact,
          description: pattern.description,
          suggestion: pattern.suggestion,
        });
      }
    }

    return issues;
  }

  /**
   * Calculate overall review score
   */
  private calculateReviewScore(
    claudeReview: { issues: ReviewIssue[]; suggestions: ReviewSuggestion[] },
    securityFindings: SecurityFinding[],
    performanceIssues: PerformanceIssue[]
  ): number {
    let score = 100;

    // Deduct points for issues
    for (const issue of claudeReview.issues) {
      switch (issue.severity) {
        case 'critical': score -= 20; break;
        case 'high': score -= 10; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    }

    // Deduct points for security findings
    for (const finding of securityFindings) {
      switch (finding.severity) {
        case 'critical': score -= 25; break;
        case 'high': score -= 15; break;
        case 'medium': score -= 8; break;
        case 'low': score -= 3; break;
      }
    }

    // Deduct points for performance issues
    for (const issue of performanceIssues) {
      switch (issue.impact) {
        case 'high': score -= 10; break;
        case 'medium': score -= 5; break;
        case 'low': score -= 2; break;
      }
    }

    return Math.max(0, score);
  }

  /**
   * Generate review summary
   */
  private generateReviewSummary(
    score: number,
    approved: boolean,
    claudeReview: { issues: ReviewIssue[]; suggestions: ReviewSuggestion[] },
    securityFindings: SecurityFinding[],
    performanceIssues: PerformanceIssue[]
  ): string {
    const totalIssues = claudeReview.issues.length + securityFindings.length + performanceIssues.length;
    const criticalIssues = [
      ...claudeReview.issues.filter(i => i.severity === 'critical'),
      ...securityFindings.filter(f => f.severity === 'critical'),
    ].length;

    let summary = `## Automated Code Review\n\n`;
    summary += `**Score:** ${score}/100 ${approved ? '✅' : '❌'}\n\n`;
    
    if (totalIssues === 0) {
      summary += `🎉 Great job! No issues found in this PR.\n\n`;
    } else {
      summary += `**Issues Found:** ${totalIssues}\n`;
      if (criticalIssues > 0) {
        summary += `**Critical Issues:** ${criticalIssues} ⚠️\n`;
      }
      summary += `\n`;
    }

    if (claudeReview.suggestions.length > 0) {
      summary += `**Suggestions:** ${claudeReview.suggestions.length} improvements recommended\n\n`;
    }

    if (!approved) {
      summary += `❌ **Review Required:** This PR needs attention before merging.\n\n`;
    }

    summary += `*This review was generated automatically. Please review the detailed comments below.*`;

    return summary;
  }

  /**
   * Post review comments on specific lines
   */
  private async postReviewComments(prNumber: number, result: AutoReviewResult): Promise<void> {
    const comments: any[] = [];

    // Add issue comments
    for (const issue of result.issues) {
      if (issue.file && issue.line > 0) {
        comments.push({
          path: issue.file,
          line: issue.line,
          body: `**${issue.severity.toUpperCase()} ${issue.type.toUpperCase()}:** ${issue.message}${issue.suggestion ? `\n\n**Suggestion:** ${issue.suggestion}` : ''}`,
        });
      }
    }

    // Add security finding comments
    for (const finding of result.securityFindings) {
      if (finding.file && finding.line > 0) {
        comments.push({
          path: finding.file,
          line: finding.line,
          body: `**🔒 SECURITY ${finding.severity.toUpperCase()}:** ${finding.description}\n\n**CWE:** ${finding.cwe}\n**Recommendation:** ${finding.recommendation}`,
        });
      }
    }

    // Post comments in batches to avoid rate limits
    for (const comment of comments.slice(0, 10)) { // Limit to 10 comments
      try {
        await this.octokit.rest.pulls.createReviewComment({
          owner: this.config.owner,
          repo: this.config.repo,
          pull_number: prNumber,
          body: comment.body,
          path: comment.path,
          line: comment.line,
        });
      } catch (error) {
        // Continue with other comments if one fails
        this.emit('comment:failed', { prNumber, comment, error });
      }
    }
  }

  /**
   * Submit the overall review
   */
  private async submitReview(prNumber: number, result: AutoReviewResult): Promise<void> {
    const event = result.approved ? 'APPROVE' : 'REQUEST_CHANGES';
    
    try {
      await this.octokit.rest.pulls.createReview({
        owner: this.config.owner,
        repo: this.config.repo,
        pull_number: prNumber,
        body: result.summary,
        event,
      });
    } catch (error) {
      this.emit('review:submit:failed', { prNumber, error });
      throw error;
    }
  }
}

export default GitHubReviewAutomation;

