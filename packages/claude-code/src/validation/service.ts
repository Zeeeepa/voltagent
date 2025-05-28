import { 
  ValidationResult, 
  ValidationSession, 
  ValidationFeedback,
  ClaudeCodeConfig 
} from '../types/index.js';

export class ValidationService {
  private config: ClaudeCodeConfig['validation'];

  constructor(config: ClaudeCodeConfig['validation']) {
    this.config = config;
  }

  async processResults(
    rawResult: ValidationResult,
    session: ValidationSession
  ): Promise<ValidationResult> {
    // Enhance the raw validation result with additional processing
    const enhancedResult: ValidationResult = {
      ...rawResult,
      sessionId: session.id,
      timestamp: new Date().toISOString(),
      metadata: {
        ...rawResult.metadata,
        prInfo: session.prInfo,
        taskContext: session.taskContext,
        validationOptions: session.options,
      },
    };

    // Apply custom scoring weights
    enhancedResult.scores = this.applyCustomWeights(rawResult.scores);
    
    // Recalculate overall score based on custom weights
    enhancedResult.overallScore = this.calculateOverallScore(enhancedResult.scores);
    
    // Determine grade based on overall score
    enhancedResult.grade = this.calculateGrade(enhancedResult.overallScore);
    
    // Enhance feedback with additional context
    enhancedResult.feedback = await this.enhanceFeedback(
      rawResult.feedback,
      session
    );
    
    // Generate actionable recommendations
    enhancedResult.strengths = this.generateStrengths(enhancedResult);
    enhancedResult.weaknesses = this.generateWeaknesses(enhancedResult);

    return enhancedResult;
  }

  private applyCustomWeights(scores: ValidationResult['scores']): ValidationResult['scores'] {
    // Apply custom weights from configuration
    return {
      codeQuality: scores.codeQuality * this.config.codeQualityWeight,
      functionality: scores.functionality * this.config.functionalityWeight,
      testing: scores.testing * this.config.testingWeight,
      documentation: scores.documentation * this.config.documentationWeight,
    };
  }

  private calculateOverallScore(scores: ValidationResult['scores']): number {
    const totalWeight = 
      this.config.codeQualityWeight +
      this.config.functionalityWeight +
      this.config.testingWeight +
      this.config.documentationWeight;

    return (
      scores.codeQuality +
      scores.functionality +
      scores.testing +
      scores.documentation
    ) / totalWeight;
  }

  private calculateGrade(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 55) return 'C';
    if (score >= 50) return 'C-';
    if (score >= 45) return 'D+';
    if (score >= 40) return 'D';
    return 'F';
  }

  private async enhanceFeedback(
    feedback: ValidationFeedback[],
    session: ValidationSession
  ): Promise<ValidationFeedback[]> {
    return feedback.map(item => ({
      ...item,
      // Add context-specific suggestions
      suggestions: [
        ...item.suggestions,
        ...this.generateContextualSuggestions(item, session),
      ],
      // Mark items as fixable if they have automated fixes
      fixable: this.isFixable(item),
    }));
  }

  private generateContextualSuggestions(
    feedback: ValidationFeedback,
    session: ValidationSession
  ): string[] {
    const suggestions: string[] = [];

    // Add project-specific suggestions based on the PR context
    if (session.prInfo.title?.toLowerCase().includes('test')) {
      if (feedback.category === 'testing') {
        suggestions.push('Consider adding integration tests for this feature');
      }
    }

    if (session.prInfo.title?.toLowerCase().includes('security')) {
      if (feedback.category === 'security') {
        suggestions.push('Review security best practices for this change');
      }
    }

    // Add language-specific suggestions
    if (feedback.filePath?.endsWith('.ts') || feedback.filePath?.endsWith('.js')) {
      if (feedback.type === 'complexity') {
        suggestions.push('Consider breaking this function into smaller, more focused functions');
      }
    }

    return suggestions;
  }

  private isFixable(feedback: ValidationFeedback): boolean {
    // Determine if the feedback item can be automatically fixed
    const fixableTypes = [
      'formatting',
      'import-order',
      'unused-variable',
      'missing-semicolon',
      'trailing-whitespace',
    ];

    return fixableTypes.includes(feedback.type);
  }

  private generateStrengths(result: ValidationResult): string[] {
    const strengths: string[] = [];

    if (result.scores.codeQuality >= 80) {
      strengths.push('Excellent code quality with clean, maintainable structure');
    }

    if (result.scores.functionality >= 80) {
      strengths.push('Robust functionality with proper error handling');
    }

    if (result.scores.testing >= 80) {
      strengths.push('Comprehensive test coverage with quality test cases');
    }

    if (result.scores.documentation >= 80) {
      strengths.push('Well-documented code with clear explanations');
    }

    // Add specific strengths based on feedback
    const securityIssues = result.feedback.filter(f => f.category === 'security');
    if (securityIssues.length === 0) {
      strengths.push('No security vulnerabilities detected');
    }

    const performanceIssues = result.feedback.filter(f => f.category === 'performance');
    if (performanceIssues.length === 0) {
      strengths.push('Good performance characteristics');
    }

    return strengths;
  }

  private generateWeaknesses(result: ValidationResult): string[] {
    const weaknesses: string[] = [];

    if (result.scores.codeQuality < 60) {
      weaknesses.push('Code quality needs improvement - focus on structure and maintainability');
    }

    if (result.scores.functionality < 60) {
      weaknesses.push('Functionality issues detected - review error handling and edge cases');
    }

    if (result.scores.testing < 60) {
      weaknesses.push('Insufficient test coverage - add more comprehensive tests');
    }

    if (result.scores.documentation < 60) {
      weaknesses.push('Documentation is lacking - add comments and explanations');
    }

    // Add specific weaknesses based on critical feedback
    const criticalIssues = result.feedback.filter(f => f.severity === 'critical');
    if (criticalIssues.length > 0) {
      weaknesses.push(`${criticalIssues.length} critical issues require immediate attention`);
    }

    const highIssues = result.feedback.filter(f => f.severity === 'high');
    if (highIssues.length > 3) {
      weaknesses.push(`${highIssues.length} high-priority issues should be addressed`);
    }

    return weaknesses;
  }

  updateConfig(newConfig: ClaudeCodeConfig['validation']): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Utility methods for validation analysis
  async generateSummaryReport(result: ValidationResult): Promise<string> {
    const report = `
# Validation Summary Report

**Overall Score:** ${result.overallScore.toFixed(1)}/100 (Grade: ${result.grade})
**Duration:** ${(result.duration / 1000).toFixed(1)} seconds

## Score Breakdown
- **Code Quality:** ${result.scores.codeQuality.toFixed(1)}/100
- **Functionality:** ${result.scores.functionality.toFixed(1)}/100
- **Testing:** ${result.scores.testing.toFixed(1)}/100
- **Documentation:** ${result.scores.documentation.toFixed(1)}/100

## Strengths
${result.strengths.map(s => `- ${s}`).join('\n')}

## Areas for Improvement
${result.weaknesses.map(w => `- ${w}`).join('\n')}

## Critical Issues
${result.feedback
  .filter(f => f.severity === 'critical')
  .map(f => `- **${f.title}**: ${f.message}`)
  .join('\n') || 'None detected'}

## Recommendations
${result.feedback
  .slice(0, 5) // Top 5 recommendations
  .map(f => `- ${f.suggestions[0] || f.message}`)
  .join('\n')}
`;

    return report.trim();
  }

  async exportResults(result: ValidationResult, format: 'json' | 'csv' | 'xml' = 'json'): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(result, null, 2);
      
      case 'csv':
        return this.convertToCSV(result);
      
      case 'xml':
        return this.convertToXML(result);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private convertToCSV(result: ValidationResult): string {
    const headers = ['Type', 'Category', 'Severity', 'File', 'Line', 'Message'];
    const rows = result.feedback.map(f => [
      f.type,
      f.category,
      f.severity,
      f.filePath || '',
      f.lineNumber?.toString() || '',
      f.message.replace(/"/g, '""'), // Escape quotes
    ]);

    return [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
  }

  private convertToXML(result: ValidationResult): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<validation-result>
  <session-id>${result.sessionId}</session-id>
  <overall-score>${result.overallScore}</overall-score>
  <grade>${result.grade}</grade>
  <duration>${result.duration}</duration>
  <scores>
    <code-quality>${result.scores.codeQuality}</code-quality>
    <functionality>${result.scores.functionality}</functionality>
    <testing>${result.scores.testing}</testing>
    <documentation>${result.scores.documentation}</documentation>
  </scores>
  <feedback>
    ${result.feedback.map(f => `
    <item>
      <type>${f.type}</type>
      <category>${f.category}</category>
      <severity>${f.severity}</severity>
      <title><![CDATA[${f.title}]]></title>
      <message><![CDATA[${f.message}]]></message>
      <file-path>${f.filePath || ''}</file-path>
      <line-number>${f.lineNumber || ''}</line-number>
    </item>`).join('')}
  </feedback>
</validation-result>`;
  }
}

