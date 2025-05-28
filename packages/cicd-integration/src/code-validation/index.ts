import { Agent } from '@voltagent/core';
import { AnthropicProvider } from '@voltagent/anthropic-ai';
import { 
  ValidationRequest, 
  ValidationResult, 
  ValidationRule, 
  ValidationRuleType, 
  ValidationStatus, 
  ValidationIssue, 
  ValidationMetrics, 
  ValidationSuggestion,
  GeneratedFile,
  TaskContext 
} from '../types';

export interface CodeValidationConfig {
  anthropicApiKey: string;
  model: string;
  enableStaticAnalysis: boolean;
  enableSecurityScan: boolean;
  enablePerformanceAnalysis: boolean;
  enableBestPracticesCheck: boolean;
  customRules: ValidationRule[];
  severityThresholds: {
    error: number;
    warning: number;
  };
}

export interface ValidationContext {
  language: string;
  framework: string;
  codeStyle: any;
  projectStandards: ProjectStandards;
  securityRequirements: SecurityRequirement[];
  performanceTargets: PerformanceTarget[];
}

export interface ProjectStandards {
  codingConventions: string[];
  architecturalPatterns: string[];
  testingRequirements: TestingRequirement[];
  documentationStandards: string[];
}

export interface SecurityRequirement {
  type: 'authentication' | 'authorization' | 'encryption' | 'input_validation' | 'output_encoding';
  description: string;
  mandatory: boolean;
}

export interface PerformanceTarget {
  metric: 'response_time' | 'memory_usage' | 'cpu_usage' | 'throughput';
  target: number;
  unit: string;
}

export interface TestingRequirement {
  type: 'unit' | 'integration' | 'e2e';
  coverage: number;
  mandatory: boolean;
}

export class ClaudeCodeValidation {
  private agent: Agent;
  private config: CodeValidationConfig;
  private rules: Map<string, ValidationRule>;
  private staticAnalyzers: Map<string, StaticAnalyzer>;

  constructor(config: CodeValidationConfig) {
    this.config = config;
    this.rules = new Map();
    this.staticAnalyzers = new Map();
    
    // Initialize Claude agent
    this.agent = new Agent({
      llm: new AnthropicProvider({
        apiKey: config.anthropicApiKey
      }),
      model: config.model
    });

    this.initializeRules();
    this.initializeStaticAnalyzers();
  }

  /**
   * Validate generated code files
   */
  async validateCode(request: ValidationRequest): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];
    const metrics: ValidationMetrics = {
      totalIssues: 0,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      codeQualityScore: 0,
      securityScore: 0,
      performanceScore: 0
    };

    // Run different types of validation
    if (this.config.enableStaticAnalysis) {
      const staticIssues = await this.runStaticAnalysis(request.files);
      issues.push(...staticIssues);
    }

    if (this.config.enableSecurityScan) {
      const securityIssues = await this.runSecurityScan(request.files, request.context);
      issues.push(...securityIssues);
    }

    if (this.config.enablePerformanceAnalysis) {
      const performanceIssues = await this.runPerformanceAnalysis(request.files, request.context);
      issues.push(...performanceIssues);
    }

    if (this.config.enableBestPracticesCheck) {
      const bestPracticeIssues = await this.runBestPracticesCheck(request.files, request.context);
      issues.push(...bestPracticeIssues);
    }

    // Run custom rules
    const customIssues = await this.runCustomRules(request.files, request.rules);
    issues.push(...customIssues);

    // Run AI-powered validation
    const aiIssues = await this.runAIValidation(request.files, request.context);
    issues.push(...aiIssues);

    // Calculate metrics
    this.calculateMetrics(issues, metrics);

    // Generate suggestions
    const suggestions = await this.generateSuggestions(issues, request.files, request.context);

    // Determine overall status
    const overall = this.determineOverallStatus(issues, metrics);

    return {
      taskId: request.files[0]?.path || 'unknown',
      overall,
      issues,
      metrics,
      suggestions
    };
  }

  /**
   * Validate a single file
   */
  async validateFile(file: GeneratedFile, context: TaskContext): Promise<ValidationIssue[]> {
    const request: ValidationRequest = {
      files: [file],
      context,
      rules: Array.from(this.rules.values())
    };

    const result = await this.validateCode(request);
    return result.issues;
  }

  /**
   * Add custom validation rule
   */
  addRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove validation rule
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Get all validation rules
   */
  getRules(): ValidationRule[] {
    return Array.from(this.rules.values());
  }

  private async runStaticAnalysis(files: GeneratedFile[]): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    for (const file of files) {
      const analyzer = this.staticAnalyzers.get(file.language);
      if (analyzer) {
        const fileIssues = await analyzer.analyze(file);
        issues.push(...fileIssues);
      }
    }

    return issues;
  }

  private async runSecurityScan(files: GeneratedFile[], context: TaskContext): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    for (const file of files) {
      // Check for common security vulnerabilities
      const securityIssues = await this.checkSecurityVulnerabilities(file, context);
      issues.push(...securityIssues);
    }

    return issues;
  }

  private async runPerformanceAnalysis(files: GeneratedFile[], context: TaskContext): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    for (const file of files) {
      const performanceIssues = await this.analyzePerformance(file, context);
      issues.push(...performanceIssues);
    }

    return issues;
  }

  private async runBestPracticesCheck(files: GeneratedFile[], context: TaskContext): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    for (const file of files) {
      const bestPracticeIssues = await this.checkBestPractices(file, context);
      issues.push(...bestPracticeIssues);
    }

    return issues;
  }

  private async runCustomRules(files: GeneratedFile[], rules: ValidationRule[]): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    for (const file of files) {
      for (const rule of rules) {
        const ruleIssues = await this.applyRule(file, rule);
        issues.push(...ruleIssues);
      }
    }

    return issues;
  }

  private async runAIValidation(files: GeneratedFile[], context: TaskContext): Promise<ValidationIssue[]> {
    const prompt = this.buildAIValidationPrompt(files, context);
    
    const response = await this.agent.run({
      messages: [{ role: 'user', content: prompt }]
    });

    return this.parseAIValidationResponse(response.content);
  }

  private async checkSecurityVulnerabilities(file: GeneratedFile, context: TaskContext): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];
    const content = file.content.toLowerCase();

    // Check for common security issues
    const securityChecks = [
      {
        pattern: /eval\s*\(/g,
        message: 'Use of eval() can lead to code injection vulnerabilities',
        severity: 'error' as const
      },
      {
        pattern: /innerHTML\s*=/g,
        message: 'Direct innerHTML assignment can lead to XSS vulnerabilities',
        severity: 'warning' as const
      },
      {
        pattern: /document\.write\s*\(/g,
        message: 'document.write() can be dangerous and should be avoided',
        severity: 'warning' as const
      },
      {
        pattern: /password.*=.*['"]/g,
        message: 'Hardcoded passwords detected',
        severity: 'error' as const
      },
      {
        pattern: /api[_-]?key.*=.*['"]/g,
        message: 'Hardcoded API keys detected',
        severity: 'error' as const
      }
    ];

    securityChecks.forEach(check => {
      const matches = file.content.match(check.pattern);
      if (matches) {
        matches.forEach(match => {
          issues.push({
            id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            rule: 'security-scan',
            severity: check.severity,
            message: check.message,
            file: file.path,
            suggestion: this.getSecuritySuggestion(match)
          });
        });
      }
    });

    return issues;
  }

  private async analyzePerformance(file: GeneratedFile, context: TaskContext): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Check for performance anti-patterns
    const performanceChecks = [
      {
        pattern: /for\s*\(.*\.length.*\)/g,
        message: 'Avoid accessing .length in loop condition for better performance',
        severity: 'warning' as const
      },
      {
        pattern: /\+\s*=.*\+/g,
        message: 'String concatenation in loops can be inefficient',
        severity: 'info' as const
      },
      {
        pattern: /document\.getElementById.*loop/g,
        message: 'DOM queries in loops can impact performance',
        severity: 'warning' as const
      }
    ];

    performanceChecks.forEach(check => {
      const matches = file.content.match(check.pattern);
      if (matches) {
        matches.forEach(match => {
          issues.push({
            id: `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            rule: 'performance-analysis',
            severity: check.severity,
            message: check.message,
            file: file.path,
            suggestion: this.getPerformanceSuggestion(match)
          });
        });
      }
    });

    return issues;
  }

  private async checkBestPractices(file: GeneratedFile, context: TaskContext): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    // Language-specific best practices
    if (file.language === 'typescript' || file.language === 'javascript') {
      const jsIssues = await this.checkJavaScriptBestPractices(file);
      issues.push(...jsIssues);
    }

    return issues;
  }

  private async checkJavaScriptBestPractices(file: GeneratedFile): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    const bestPracticeChecks = [
      {
        pattern: /var\s+/g,
        message: 'Use const or let instead of var',
        severity: 'warning' as const
      },
      {
        pattern: /==\s*[^=]/g,
        message: 'Use strict equality (===) instead of loose equality (==)',
        severity: 'warning' as const
      },
      {
        pattern: /console\.log\(/g,
        message: 'Remove console.log statements before production',
        severity: 'info' as const
      }
    ];

    bestPracticeChecks.forEach(check => {
      const matches = file.content.match(check.pattern);
      if (matches) {
        matches.forEach(match => {
          issues.push({
            id: `bp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            rule: 'best-practices',
            severity: check.severity,
            message: check.message,
            file: file.path,
            suggestion: this.getBestPracticeSuggestion(match)
          });
        });
      }
    });

    return issues;
  }

  private async applyRule(file: GeneratedFile, rule: ValidationRule): Promise<ValidationIssue[]> {
    const issues: ValidationIssue[] = [];

    if (rule.pattern) {
      const regex = new RegExp(rule.pattern, 'g');
      const matches = file.content.match(regex);
      
      if (matches) {
        matches.forEach(match => {
          issues.push({
            id: `rule_${rule.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            rule: rule.id,
            severity: rule.severity,
            message: rule.description,
            file: file.path
          });
        });
      }
    }

    return issues;
  }

  private buildAIValidationPrompt(files: GeneratedFile[], context: TaskContext): string {
    const fileDescriptions = files.map(f => `${f.path} (${f.language})`).join(', ');
    
    return `
You are an expert code reviewer. Please analyze the following generated code files and identify any issues:

## Files to Review
${fileDescriptions}

## Context
- Language: ${context.codebase.language}
- Framework: ${context.codebase.framework}
- Project Type: ${context.requirements.intent}

## Code Files
${files.map(f => `
### ${f.path}
\`\`\`${f.language}
${f.content}
\`\`\`
`).join('\n')}

## Review Criteria
1. Code quality and maintainability
2. Security vulnerabilities
3. Performance issues
4. Best practices adherence
5. Error handling
6. Code structure and organization
7. Documentation and comments

Please provide your analysis in the following JSON format:

{
  "issues": [
    {
      "severity": "error|warning|info",
      "message": "Description of the issue",
      "file": "filename",
      "line": 10,
      "suggestion": "How to fix this issue"
    }
  ]
}

Focus on actionable feedback that will improve code quality.
    `;
  }

  private parseAIValidationResponse(content: string): ValidationIssue[] {
    try {
      const response = JSON.parse(content);
      return response.issues.map((issue: any) => ({
        id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        rule: 'ai-validation',
        severity: issue.severity,
        message: issue.message,
        file: issue.file,
        line: issue.line,
        suggestion: issue.suggestion
      }));
    } catch (error) {
      console.warn('Failed to parse AI validation response:', error);
      return [];
    }
  }

  private calculateMetrics(issues: ValidationIssue[], metrics: ValidationMetrics): void {
    metrics.totalIssues = issues.length;
    metrics.errorCount = issues.filter(i => i.severity === 'error').length;
    metrics.warningCount = issues.filter(i => i.severity === 'warning').length;
    metrics.infoCount = issues.filter(i => i.severity === 'info').length;

    // Calculate quality scores (0-100)
    const maxIssues = 50; // Baseline for scoring
    metrics.codeQualityScore = Math.max(0, 100 - (metrics.totalIssues / maxIssues) * 100);
    metrics.securityScore = Math.max(0, 100 - (metrics.errorCount * 20));
    metrics.performanceScore = Math.max(0, 100 - (metrics.warningCount * 10));
  }

  private async generateSuggestions(
    issues: ValidationIssue[], 
    files: GeneratedFile[], 
    context: TaskContext
  ): Promise<ValidationSuggestion[]> {
    const suggestions: ValidationSuggestion[] = [];

    // Generate suggestions based on issue patterns
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;

    if (errorCount > 5) {
      suggestions.push({
        type: 'improvement',
        description: 'Consider refactoring to address multiple error-level issues',
        impact: 'high',
        effort: 'medium'
      });
    }

    if (warningCount > 10) {
      suggestions.push({
        type: 'optimization',
        description: 'Review and address warning-level issues to improve code quality',
        impact: 'medium',
        effort: 'low'
      });
    }

    // Add more sophisticated suggestion logic here

    return suggestions;
  }

  private determineOverallStatus(issues: ValidationIssue[], metrics: ValidationMetrics): ValidationStatus {
    const errorCount = metrics.errorCount;
    const warningCount = metrics.warningCount;

    if (errorCount > this.config.severityThresholds.error) {
      return ValidationStatus.FAILED;
    }

    if (warningCount > this.config.severityThresholds.warning) {
      return ValidationStatus.PASSED_WITH_WARNINGS;
    }

    return ValidationStatus.PASSED;
  }

  private getSecuritySuggestion(match: string): string {
    if (match.includes('eval')) {
      return 'Use JSON.parse() for parsing JSON or implement proper input validation';
    }
    if (match.includes('innerHTML')) {
      return 'Use textContent or implement proper sanitization';
    }
    if (match.includes('password')) {
      return 'Use environment variables or secure configuration management';
    }
    return 'Review security implications and implement proper safeguards';
  }

  private getPerformanceSuggestion(match: string): string {
    if (match.includes('.length')) {
      return 'Cache the length value outside the loop';
    }
    if (match.includes('+=')) {
      return 'Use array.join() or template literals for string concatenation';
    }
    return 'Consider optimizing this code for better performance';
  }

  private getBestPracticeSuggestion(match: string): string {
    if (match.includes('var')) {
      return 'Replace var with const for constants or let for variables';
    }
    if (match.includes('==')) {
      return 'Use === for strict equality comparison';
    }
    if (match.includes('console.log')) {
      return 'Use a proper logging library or remove debug statements';
    }
    return 'Follow established best practices for this pattern';
  }

  private initializeRules(): void {
    // Add default validation rules
    const defaultRules: ValidationRule[] = [
      {
        id: 'no-hardcoded-secrets',
        name: 'No Hardcoded Secrets',
        type: ValidationRuleType.SECURITY,
        severity: 'error',
        description: 'Hardcoded secrets detected',
        pattern: '(password|api[_-]?key|secret|token).*=.*[\'"][^\'"]{8,}'
      },
      {
        id: 'no-eval',
        name: 'No eval()',
        type: ValidationRuleType.SECURITY,
        severity: 'error',
        description: 'Use of eval() is dangerous',
        pattern: 'eval\\s*\\('
      },
      {
        id: 'prefer-const',
        name: 'Prefer const',
        type: ValidationRuleType.BEST_PRACTICE,
        severity: 'warning',
        description: 'Use const instead of var',
        pattern: 'var\\s+'
      }
    ];

    defaultRules.forEach(rule => this.addRule(rule));
    this.config.customRules.forEach(rule => this.addRule(rule));
  }

  private initializeStaticAnalyzers(): void {
    this.staticAnalyzers.set('typescript', new TypeScriptAnalyzer());
    this.staticAnalyzers.set('javascript', new JavaScriptAnalyzer());
    this.staticAnalyzers.set('python', new PythonAnalyzer());
  }
}

// Static analyzer interfaces and implementations
interface StaticAnalyzer {
  analyze(file: GeneratedFile): Promise<ValidationIssue[]>;
}

class TypeScriptAnalyzer implements StaticAnalyzer {
  async analyze(file: GeneratedFile): Promise<ValidationIssue[]> {
    // Implement TypeScript-specific static analysis
    return [];
  }
}

class JavaScriptAnalyzer implements StaticAnalyzer {
  async analyze(file: GeneratedFile): Promise<ValidationIssue[]> {
    // Implement JavaScript-specific static analysis
    return [];
  }
}

class PythonAnalyzer implements StaticAnalyzer {
  async analyze(file: GeneratedFile): Promise<ValidationIssue[]> {
    // Implement Python-specific static analysis
    return [];
  }
}

export { 
  CodeValidationConfig, 
  ValidationContext, 
  ProjectStandards, 
  SecurityRequirement, 
  PerformanceTarget, 
  TestingRequirement 
};

