import { ValidationResult, ValidationFeedback } from '../types/index.js';

export class ValidationUtils {
  static calculateGrade(score: number): string {
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

  static categorizeIssues(feedback: ValidationFeedback[]): {
    critical: ValidationFeedback[];
    high: ValidationFeedback[];
    medium: ValidationFeedback[];
    low: ValidationFeedback[];
  } {
    return {
      critical: feedback.filter(f => f.severity === 'critical'),
      high: feedback.filter(f => f.severity === 'high'),
      medium: feedback.filter(f => f.severity === 'medium'),
      low: feedback.filter(f => f.severity === 'low'),
    };
  }

  static generateSummary(result: ValidationResult): string {
    const issues = this.categorizeIssues(result.feedback);
    
    return `
Validation Summary:
- Overall Score: ${result.overallScore}/100 (${result.grade})
- Critical Issues: ${issues.critical.length}
- High Priority Issues: ${issues.high.length}
- Medium Priority Issues: ${issues.medium.length}
- Low Priority Issues: ${issues.low.length}
- Duration: ${(result.duration / 1000).toFixed(1)}s
`;
  }

  static filterByCategory(feedback: ValidationFeedback[], category: string): ValidationFeedback[] {
    return feedback.filter(f => f.category === category);
  }

  static filterBySeverity(feedback: ValidationFeedback[], severity: string): ValidationFeedback[] {
    return feedback.filter(f => f.severity === severity);
  }

  static getTopIssues(feedback: ValidationFeedback[], limit: number = 5): ValidationFeedback[] {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    
    return feedback
      .sort((a, b) => (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0))
      .slice(0, limit);
  }

  static calculateTrend(results: ValidationResult[]): {
    scoreImprovement: number;
    issueReduction: number;
    trend: 'improving' | 'declining' | 'stable';
  } {
    if (results.length < 2) {
      return { scoreImprovement: 0, issueReduction: 0, trend: 'stable' };
    }

    const latest = results[results.length - 1];
    const previous = results[results.length - 2];

    const scoreImprovement = latest.overallScore - previous.overallScore;
    const issueReduction = previous.feedback.length - latest.feedback.length;

    let trend: 'improving' | 'declining' | 'stable' = 'stable';
    if (scoreImprovement > 5 || issueReduction > 2) {
      trend = 'improving';
    } else if (scoreImprovement < -5 || issueReduction < -2) {
      trend = 'declining';
    }

    return { scoreImprovement, issueReduction, trend };
  }
}

