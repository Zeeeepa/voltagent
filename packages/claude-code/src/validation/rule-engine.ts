import { ValidationRule, ValidationFeedback } from '../types/index.js';

export class ValidationRuleEngine {
  private rules: Map<string, ValidationRule> = new Map();

  constructor() {
    this.loadDefaultRules();
  }

  addRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  getRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }

  getEnabledRules(): ValidationRule[] {
    return this.getRules().filter(rule => rule.enabled);
  }

  applyRules(code: string, filePath: string): ValidationFeedback[] {
    const feedback: ValidationFeedback[] = [];
    const enabledRules = this.getEnabledRules();

    for (const rule of enabledRules) {
      const violations = this.checkRule(rule, code, filePath);
      feedback.push(...violations);
    }

    return feedback;
  }

  private checkRule(rule: ValidationRule, code: string, filePath: string): ValidationFeedback[] {
    // This is a simplified rule engine
    // In a real implementation, this would use AST parsing, regex patterns, etc.
    const feedback: ValidationFeedback[] = [];

    switch (rule.id) {
      case 'no-console-log':
        feedback.push(...this.checkConsoleLog(code, filePath, rule));
        break;
      case 'no-unused-variables':
        feedback.push(...this.checkUnusedVariables(code, filePath, rule));
        break;
      case 'max-line-length':
        feedback.push(...this.checkLineLength(code, filePath, rule));
        break;
      // Add more rule implementations
    }

    return feedback;
  }

  private checkConsoleLog(code: string, filePath: string, rule: ValidationRule): ValidationFeedback[] {
    const feedback: ValidationFeedback[] = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      if (line.includes('console.log')) {
        feedback.push({
          type: 'console-usage',
          category: 'style',
          title: 'Console.log usage detected',
          message: 'Avoid using console.log in production code',
          severity: rule.severity,
          filePath,
          lineNumber: index + 1,
          suggestions: [
            'Use a proper logging library instead',
            'Remove console.log statements before production',
            'Use conditional logging based on environment'
          ],
          fixable: true,
        });
      }
    });

    return feedback;
  }

  private checkUnusedVariables(code: string, filePath: string, rule: ValidationRule): ValidationFeedback[] {
    // Simplified unused variable detection
    const feedback: ValidationFeedback[] = [];
    // Implementation would use AST parsing for accurate detection
    return feedback;
  }

  private checkLineLength(code: string, filePath: string, rule: ValidationRule): ValidationFeedback[] {
    const feedback: ValidationFeedback[] = [];
    const lines = code.split('\n');
    const maxLength = 120; // Could be configurable

    lines.forEach((line, index) => {
      if (line.length > maxLength) {
        feedback.push({
          type: 'line-length',
          category: 'style',
          title: 'Line too long',
          message: `Line exceeds maximum length of ${maxLength} characters (${line.length})`,
          severity: rule.severity,
          filePath,
          lineNumber: index + 1,
          suggestions: [
            'Break long lines into multiple lines',
            'Extract complex expressions into variables',
            'Use proper indentation and formatting'
          ],
          fixable: true,
        });
      }
    });

    return feedback;
  }

  private loadDefaultRules(): void {
    const defaultRules: ValidationRule[] = [
      {
        id: 'no-console-log',
        name: 'No Console Log',
        description: 'Disallow console.log statements in production code',
        severity: 'medium',
        category: 'style',
        enabled: true,
      },
      {
        id: 'no-unused-variables',
        name: 'No Unused Variables',
        description: 'Disallow unused variables',
        severity: 'medium',
        category: 'maintainability',
        enabled: true,
      },
      {
        id: 'max-line-length',
        name: 'Maximum Line Length',
        description: 'Enforce maximum line length',
        severity: 'low',
        category: 'style',
        enabled: true,
      },
      {
        id: 'no-eval',
        name: 'No Eval',
        description: 'Disallow use of eval()',
        severity: 'critical',
        category: 'security',
        enabled: true,
      },
      {
        id: 'require-error-handling',
        name: 'Require Error Handling',
        description: 'Require proper error handling in async functions',
        severity: 'high',
        category: 'functionality',
        enabled: true,
      },
    ];

    defaultRules.forEach(rule => this.addRule(rule));
  }
}

