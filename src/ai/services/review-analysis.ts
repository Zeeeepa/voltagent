/**
 * Review Analysis Service
 * 
 * Automated code review and analysis using Codegen SDK
 */

import { CodegenSDKClient } from '../../middleware/codegen/sdk-client.js';

export interface ReviewCriteria {
  codeQuality?: boolean;
  security?: boolean;
  performance?: boolean;
  maintainability?: boolean;
  testCoverage?: boolean;
  documentation?: boolean;
  bestPractices?: boolean;
  accessibility?: boolean;
}

export interface ReviewResult {
  overallScore: number; // 0-100
  issues: ReviewIssue[];
  suggestions: ReviewSuggestion[];
  metrics: CodeMetrics;
  summary: string;
}

export interface ReviewIssue {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: ReviewCategory;
  title: string;
  description: string;
  location: CodeLocation;
  suggestion?: string;
  autoFixable?: boolean;
}

export interface ReviewSuggestion {
  id: string;
  category: ReviewCategory;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  location?: CodeLocation;
}

export interface CodeLocation {
  file: string;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
}

export interface CodeMetrics {
  linesOfCode: number;
  complexity: number;
  maintainabilityIndex: number;
  testCoverage?: number;
  duplicateLines?: number;
  technicalDebt?: number; // in hours
}

export enum ReviewCategory {
  CODE_QUALITY = 'code_quality',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  MAINTAINABILITY = 'maintainability',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation',
  BEST_PRACTICES = 'best_practices',
  ACCESSIBILITY = 'accessibility',
  STYLE = 'style',
  ARCHITECTURE = 'architecture'
}

export interface ReviewContext {
  language: string;
  framework?: string;
  projectType?: string;
  targetAudience?: string;
  performanceRequirements?: string;
  securityRequirements?: string;
}

export class ReviewAnalysisService {
  private client: CodegenSDKClient;
  private defaultCriteria: ReviewCriteria = {
    codeQuality: true,
    security: true,
    performance: true,
    maintainability: true,
    testCoverage: true,
    documentation: true,
    bestPractices: true,
    accessibility: false
  };

  constructor(client: CodegenSDKClient) {
    this.client = client;
  }

  /**
   * Perform comprehensive code review
   */
  async reviewCode(
    filePath: string,
    criteria: ReviewCriteria = this.defaultCriteria,
    context?: ReviewContext
  ): Promise<ReviewResult> {
    const reviewPrompt = this.buildReviewPrompt(criteria, context);
    
    const task = await this.client.reviewCode(filePath, reviewPrompt);
    await task.waitForCompletion();

    if (task.status === 'failed') {
      throw new Error(`Code review failed: ${task.error}`);
    }

    return this.parseReviewResult(task.result, filePath);
  }

  /**
   * Review multiple files
   */
  async reviewMultipleFiles(
    filePaths: string[],
    criteria: ReviewCriteria = this.defaultCriteria,
    context?: ReviewContext
  ): Promise<Map<string, ReviewResult>> {
    const results = new Map<string, ReviewResult>();
    
    // Process files in parallel (with concurrency limit)
    const concurrencyLimit = 3;
    const chunks = this.chunkArray(filePaths, concurrencyLimit);
    
    for (const chunk of chunks) {
      const promises = chunk.map(async (filePath) => {
        try {
          const result = await this.reviewCode(filePath, criteria, context);
          return { filePath, result };
        } catch (error) {
          console.error(`Review failed for ${filePath}:`, error);
          return { filePath, result: null };
        }
      });
      
      const chunkResults = await Promise.all(promises);
      
      for (const { filePath, result } of chunkResults) {
        if (result) {
          results.set(filePath, result);
        }
      }
    }
    
    return results;
  }

  /**
   * Analyze security vulnerabilities
   */
  async analyzeSecurityVulnerabilities(
    filePath: string,
    context?: ReviewContext
  ): Promise<ReviewIssue[]> {
    const criteria: ReviewCriteria = { security: true };
    const result = await this.reviewCode(filePath, criteria, context);
    
    return result.issues.filter(issue => issue.category === ReviewCategory.SECURITY);
  }

  /**
   * Analyze performance issues
   */
  async analyzePerformance(
    filePath: string,
    context?: ReviewContext
  ): Promise<ReviewIssue[]> {
    const criteria: ReviewCriteria = { performance: true };
    const result = await this.reviewCode(filePath, criteria, context);
    
    return result.issues.filter(issue => issue.category === ReviewCategory.PERFORMANCE);
  }

  /**
   * Check code quality metrics
   */
  async checkCodeQuality(
    filePath: string,
    context?: ReviewContext
  ): Promise<CodeMetrics> {
    const criteria: ReviewCriteria = { codeQuality: true, maintainability: true };
    const result = await this.reviewCode(filePath, criteria, context);
    
    return result.metrics;
  }

  /**
   * Generate improvement suggestions
   */
  async generateImprovementSuggestions(
    filePath: string,
    focusArea?: ReviewCategory,
    context?: ReviewContext
  ): Promise<ReviewSuggestion[]> {
    const criteria = focusArea ? 
      { [this.getCriteriaKey(focusArea)]: true } : 
      this.defaultCriteria;
    
    const result = await this.reviewCode(filePath, criteria, context);
    
    return focusArea ? 
      result.suggestions.filter(s => s.category === focusArea) :
      result.suggestions;
  }

  /**
   * Auto-fix issues where possible
   */
  async autoFixIssues(
    filePath: string,
    issueIds?: string[]
  ): Promise<{ fixed: string[], failed: string[] }> {
    const result = await this.reviewCode(filePath);
    const fixableIssues = result.issues.filter(issue => 
      issue.autoFixable && (!issueIds || issueIds.includes(issue.id))
    );

    const fixed: string[] = [];
    const failed: string[] = [];

    for (const issue of fixableIssues) {
      try {
        const fixPrompt = `Fix the following issue in the code: ${issue.description}. ${issue.suggestion || ''}`;
        const task = await this.client.modifyCode(filePath, fixPrompt);
        await task.waitForCompletion();
        
        if (task.status === 'completed') {
          fixed.push(issue.id);
        } else {
          failed.push(issue.id);
        }
      } catch (error) {
        console.error(`Failed to auto-fix issue ${issue.id}:`, error);
        failed.push(issue.id);
      }
    }

    return { fixed, failed };
  }

  /**
   * Compare code before and after changes
   */
  async compareVersions(
    originalFilePath: string,
    modifiedFilePath: string,
    context?: ReviewContext
  ): Promise<{
    improvements: ReviewSuggestion[];
    regressions: ReviewIssue[];
    metricsComparison: {
      before: CodeMetrics;
      after: CodeMetrics;
      delta: Partial<CodeMetrics>;
    };
  }> {
    const [originalResult, modifiedResult] = await Promise.all([
      this.reviewCode(originalFilePath, this.defaultCriteria, context),
      this.reviewCode(modifiedFilePath, this.defaultCriteria, context)
    ]);

    const improvements = this.findImprovements(originalResult, modifiedResult);
    const regressions = this.findRegressions(originalResult, modifiedResult);
    const metricsComparison = this.compareMetrics(originalResult.metrics, modifiedResult.metrics);

    return {
      improvements,
      regressions,
      metricsComparison
    };
  }

  /**
   * Build review prompt based on criteria
   */
  private buildReviewPrompt(criteria: ReviewCriteria, context?: ReviewContext): string {
    const activeCriteria = Object.entries(criteria)
      .filter(([, enabled]) => enabled)
      .map(([key]) => key);

    let prompt = `Perform a comprehensive code review focusing on: ${activeCriteria.join(', ')}.`;

    if (context) {
      if (context.language) {
        prompt += ` Language: ${context.language}.`;
      }
      if (context.framework) {
        prompt += ` Framework: ${context.framework}.`;
      }
      if (context.projectType) {
        prompt += ` Project type: ${context.projectType}.`;
      }
      if (context.performanceRequirements) {
        prompt += ` Performance requirements: ${context.performanceRequirements}.`;
      }
      if (context.securityRequirements) {
        prompt += ` Security requirements: ${context.securityRequirements}.`;
      }
    }

    prompt += ` Provide detailed analysis with specific issues, suggestions, and code metrics.`;
    prompt += ` Include severity levels and auto-fix recommendations where applicable.`;

    return prompt;
  }

  /**
   * Parse review result from API response
   */
  private parseReviewResult(result: any, filePath: string): ReviewResult {
    // Handle different response formats
    if (typeof result === 'string') {
      return this.parseTextResult(result, filePath);
    }

    return {
      overallScore: result.overallScore || this.calculateOverallScore(result.issues || []),
      issues: this.parseIssues(result.issues || [], filePath),
      suggestions: this.parseSuggestions(result.suggestions || []),
      metrics: this.parseMetrics(result.metrics || {}),
      summary: result.summary || 'Code review completed'
    };
  }

  /**
   * Parse text-based review result
   */
  private parseTextResult(text: string, filePath: string): ReviewResult {
    // Simple text parsing - in a real implementation, this would be more sophisticated
    const issues: ReviewIssue[] = [];
    const suggestions: ReviewSuggestion[] = [];
    
    // Extract issues (simplified pattern matching)
    const issueMatches = text.match(/ISSUE:\s*(.*?)(?=ISSUE:|SUGGESTION:|$)/gs);
    if (issueMatches) {
      issueMatches.forEach((match, index) => {
        issues.push({
          id: `issue-${index}`,
          severity: 'medium',
          category: ReviewCategory.CODE_QUALITY,
          title: `Issue ${index + 1}`,
          description: match.replace('ISSUE:', '').trim(),
          location: { file: filePath }
        });
      });
    }

    // Extract suggestions
    const suggestionMatches = text.match(/SUGGESTION:\s*(.*?)(?=ISSUE:|SUGGESTION:|$)/gs);
    if (suggestionMatches) {
      suggestionMatches.forEach((match, index) => {
        suggestions.push({
          id: `suggestion-${index}`,
          category: ReviewCategory.CODE_QUALITY,
          title: `Suggestion ${index + 1}`,
          description: match.replace('SUGGESTION:', '').trim(),
          impact: 'medium',
          effort: 'medium'
        });
      });
    }

    return {
      overallScore: this.calculateOverallScore(issues),
      issues,
      suggestions,
      metrics: {
        linesOfCode: 0,
        complexity: 0,
        maintainabilityIndex: 0
      },
      summary: 'Code review completed from text analysis'
    };
  }

  /**
   * Parse issues from result
   */
  private parseIssues(issues: any[], filePath: string): ReviewIssue[] {
    return issues.map((issue, index) => ({
      id: issue.id || `issue-${index}`,
      severity: issue.severity || 'medium',
      category: issue.category || ReviewCategory.CODE_QUALITY,
      title: issue.title || `Issue ${index + 1}`,
      description: issue.description || '',
      location: issue.location || { file: filePath },
      suggestion: issue.suggestion,
      autoFixable: issue.autoFixable || false
    }));
  }

  /**
   * Parse suggestions from result
   */
  private parseSuggestions(suggestions: any[]): ReviewSuggestion[] {
    return suggestions.map((suggestion, index) => ({
      id: suggestion.id || `suggestion-${index}`,
      category: suggestion.category || ReviewCategory.CODE_QUALITY,
      title: suggestion.title || `Suggestion ${index + 1}`,
      description: suggestion.description || '',
      impact: suggestion.impact || 'medium',
      effort: suggestion.effort || 'medium',
      location: suggestion.location
    }));
  }

  /**
   * Parse metrics from result
   */
  private parseMetrics(metrics: any): CodeMetrics {
    return {
      linesOfCode: metrics.linesOfCode || 0,
      complexity: metrics.complexity || 0,
      maintainabilityIndex: metrics.maintainabilityIndex || 0,
      testCoverage: metrics.testCoverage,
      duplicateLines: metrics.duplicateLines,
      technicalDebt: metrics.technicalDebt
    };
  }

  /**
   * Calculate overall score based on issues
   */
  private calculateOverallScore(issues: ReviewIssue[]): number {
    if (issues.length === 0) return 100;

    const severityWeights = {
      low: 1,
      medium: 3,
      high: 7,
      critical: 15
    };

    const totalPenalty = issues.reduce((sum, issue) => {
      return sum + severityWeights[issue.severity];
    }, 0);

    return Math.max(0, 100 - totalPenalty);
  }

  /**
   * Find improvements between versions
   */
  private findImprovements(original: ReviewResult, modified: ReviewResult): ReviewSuggestion[] {
    const improvements: ReviewSuggestion[] = [];
    
    // Compare issue counts by category
    const originalIssuesByCategory = this.groupIssuesByCategory(original.issues);
    const modifiedIssuesByCategory = this.groupIssuesByCategory(modified.issues);

    for (const [category, originalCount] of originalIssuesByCategory) {
      const modifiedCount = modifiedIssuesByCategory.get(category) || 0;
      if (modifiedCount < originalCount) {
        improvements.push({
          id: `improvement-${category}`,
          category: category as ReviewCategory,
          title: `Reduced ${category} issues`,
          description: `Reduced ${category} issues from ${originalCount} to ${modifiedCount}`,
          impact: 'high',
          effort: 'low'
        });
      }
    }

    return improvements;
  }

  /**
   * Find regressions between versions
   */
  private findRegressions(original: ReviewResult, modified: ReviewResult): ReviewIssue[] {
    const regressions: ReviewIssue[] = [];
    
    // Find new issues in modified version
    const originalIssueIds = new Set(original.issues.map(i => i.id));
    const newIssues = modified.issues.filter(i => !originalIssueIds.has(i.id));

    return newIssues;
  }

  /**
   * Compare metrics between versions
   */
  private compareMetrics(before: CodeMetrics, after: CodeMetrics): {
    before: CodeMetrics;
    after: CodeMetrics;
    delta: Partial<CodeMetrics>;
  } {
    const delta: Partial<CodeMetrics> = {
      linesOfCode: after.linesOfCode - before.linesOfCode,
      complexity: after.complexity - before.complexity,
      maintainabilityIndex: after.maintainabilityIndex - before.maintainabilityIndex
    };

    if (before.testCoverage !== undefined && after.testCoverage !== undefined) {
      delta.testCoverage = after.testCoverage - before.testCoverage;
    }

    return { before, after, delta };
  }

  /**
   * Group issues by category
   */
  private groupIssuesByCategory(issues: ReviewIssue[]): Map<string, number> {
    const groups = new Map<string, number>();
    
    for (const issue of issues) {
      const count = groups.get(issue.category) || 0;
      groups.set(issue.category, count + 1);
    }
    
    return groups;
  }

  /**
   * Get criteria key from category
   */
  private getCriteriaKey(category: ReviewCategory): keyof ReviewCriteria {
    const mapping: Record<ReviewCategory, keyof ReviewCriteria> = {
      [ReviewCategory.CODE_QUALITY]: 'codeQuality',
      [ReviewCategory.SECURITY]: 'security',
      [ReviewCategory.PERFORMANCE]: 'performance',
      [ReviewCategory.MAINTAINABILITY]: 'maintainability',
      [ReviewCategory.TESTING]: 'testCoverage',
      [ReviewCategory.DOCUMENTATION]: 'documentation',
      [ReviewCategory.BEST_PRACTICES]: 'bestPractices',
      [ReviewCategory.ACCESSIBILITY]: 'accessibility',
      [ReviewCategory.STYLE]: 'codeQuality',
      [ReviewCategory.ARCHITECTURE]: 'maintainability'
    };

    return mapping[category] || 'codeQuality';
  }

  /**
   * Utility function to chunk array
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

