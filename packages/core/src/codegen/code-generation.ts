/**
 * Codegen Code Generation Services
 * Handles natural language code requests, template management, and code analysis
 */

import { CodegenSDKClient } from './sdk-client';
import { 
  CodeGenerationRequest, 
  CodeAnalysisResult, 
  CodebaseContext,
  CodeGenerationParameters,
  CodeIssue,
  CodeMetrics
} from './types';
import NodeCache from 'node-cache';

export interface CodeTemplate {
  /** Template ID */
  id: string;
  /** Template name */
  name: string;
  /** Template description */
  description: string;
  /** Programming language */
  language: string;
  /** Framework/library */
  framework?: string;
  /** Template content with placeholders */
  content: string;
  /** Template variables */
  variables: TemplateVariable[];
  /** Template metadata */
  metadata: {
    version: string;
    author: string;
    createdAt: string;
    updatedAt: string;
    tags: string[];
    category: string;
  };
}

export interface TemplateVariable {
  /** Variable name */
  name: string;
  /** Variable type */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  /** Variable description */
  description: string;
  /** Default value */
  defaultValue?: any;
  /** Whether variable is required */
  required: boolean;
  /** Validation pattern (for string types) */
  pattern?: string;
  /** Possible values (for enum-like variables) */
  options?: string[];
}

export interface CodeGenerationResult {
  /** Generated code */
  code: string;
  /** Explanation of the generated code */
  explanation: string;
  /** Suggestions for improvement */
  suggestions: string[];
  /** Files that should be created/modified */
  files: GeneratedFile[];
  /** Dependencies that should be installed */
  dependencies: string[];
  /** Additional setup instructions */
  setupInstructions: string[];
  /** Quality metrics */
  quality: {
    score: number;
    issues: CodeIssue[];
    metrics: CodeMetrics;
  };
}

export interface GeneratedFile {
  /** File path relative to project root */
  path: string;
  /** File content */
  content: string;
  /** File type/language */
  language: string;
  /** File description */
  description: string;
  /** Whether this is a test file */
  isTest: boolean;
  /** Whether this is a configuration file */
  isConfig: boolean;
}

export interface CodeRefactoringRequest {
  /** Code to refactor */
  code: string;
  /** Programming language */
  language: string;
  /** Refactoring goals */
  goals: RefactoringGoal[];
  /** Context about the codebase */
  context?: CodebaseContext;
  /** Refactoring parameters */
  parameters?: RefactoringParameters;
}

export type RefactoringGoal = 
  | 'improve_readability'
  | 'reduce_complexity'
  | 'optimize_performance'
  | 'add_error_handling'
  | 'add_logging'
  | 'add_tests'
  | 'modernize_syntax'
  | 'extract_functions'
  | 'remove_duplication';

export interface RefactoringParameters {
  /** Maximum function length */
  maxFunctionLength?: number;
  /** Maximum cyclomatic complexity */
  maxComplexity?: number;
  /** Preferred coding style */
  codingStyle?: 'functional' | 'object_oriented' | 'procedural';
  /** Whether to preserve comments */
  preserveComments?: boolean;
  /** Whether to add type annotations */
  addTypes?: boolean;
}

export interface CodeReviewRequest {
  /** Code to review */
  code: string;
  /** Programming language */
  language: string;
  /** Review criteria */
  criteria: ReviewCriteria;
  /** Context about the codebase */
  context?: CodebaseContext;
}

export interface ReviewCriteria {
  /** Check for security issues */
  security: boolean;
  /** Check for performance issues */
  performance: boolean;
  /** Check for maintainability */
  maintainability: boolean;
  /** Check for best practices */
  bestPractices: boolean;
  /** Check for test coverage */
  testCoverage: boolean;
  /** Custom rules to check */
  customRules?: string[];
}

export interface CodeReviewResult {
  /** Overall review score (0-100) */
  score: number;
  /** Review summary */
  summary: string;
  /** Detailed findings */
  findings: ReviewFinding[];
  /** Recommendations */
  recommendations: string[];
  /** Approval status */
  approved: boolean;
}

export interface ReviewFinding {
  /** Finding type */
  type: 'security' | 'performance' | 'maintainability' | 'style' | 'bug';
  /** Severity level */
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  /** Finding message */
  message: string;
  /** File path (if applicable) */
  file?: string;
  /** Line number */
  line?: number;
  /** Column number */
  column?: number;
  /** Suggested fix */
  fix?: string;
  /** Rule that triggered this finding */
  rule?: string;
}

export class CodegenCodeGeneration {
  private client: CodegenSDKClient;
  private cache: NodeCache;
  private templates: Map<string, CodeTemplate> = new Map();

  constructor(client: CodegenSDKClient) {
    this.client = client;
    this.cache = new NodeCache({
      stdTTL: 600, // 10 minutes
      checkperiod: 60
    });

    // Initialize with default templates
    this.initializeDefaultTemplates();
  }

  /**
   * Generate code from natural language prompt
   */
  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResult> {
    // Enhance the request with context and parameters
    const enhancedRequest = this.enhanceGenerationRequest(request);

    // Generate code using the Codegen API
    const apiResult = await this.client.generateCode(enhancedRequest);

    // Analyze the generated code
    const analysis = await this.analyzeGeneratedCode(
      apiResult.code, 
      request.context?.language || 'typescript'
    );

    // Parse the result and create files
    const files = this.parseGeneratedCodeIntoFiles(apiResult.code, request);

    // Extract dependencies and setup instructions
    const dependencies = this.extractDependencies(apiResult.code, request.context?.language);
    const setupInstructions = this.generateSetupInstructions(files, dependencies);

    return {
      code: apiResult.code,
      explanation: apiResult.explanation,
      suggestions: apiResult.suggestions,
      files,
      dependencies,
      setupInstructions,
      quality: {
        score: analysis.qualityScore,
        issues: analysis.issues,
        metrics: analysis.metrics
      }
    };
  }

  /**
   * Refactor existing code
   */
  async refactorCode(request: CodeRefactoringRequest): Promise<CodeGenerationResult> {
    // Create a generation request for refactoring
    const prompt = this.createRefactoringPrompt(request);
    
    const generationRequest: CodeGenerationRequest = {
      prompt,
      context: {
        ...request.context,
        language: request.language,
        existingCode: [request.code]
      },
      parameters: {
        style: 'comprehensive',
        includeErrorHandling: request.goals.includes('add_error_handling'),
        includeLogging: request.goals.includes('add_logging'),
        includeTypes: request.parameters?.addTypes || false
      }
    };

    return this.generateCode(generationRequest);
  }

  /**
   * Review code quality and provide feedback
   */
  async reviewCode(request: CodeReviewRequest): Promise<CodeReviewResult> {
    // Analyze code quality
    const analysis = await this.client.analyzeCode(request.code, request.language);

    // Convert analysis to review findings
    const findings = this.convertAnalysisToFindings(analysis, request.criteria);

    // Calculate overall score
    const score = this.calculateReviewScore(findings);

    // Generate recommendations
    const recommendations = this.generateRecommendations(findings, request.criteria);

    // Determine approval status
    const approved = this.determineApprovalStatus(score, findings);

    return {
      score,
      summary: this.generateReviewSummary(score, findings),
      findings,
      recommendations,
      approved
    };
  }

  /**
   * Create a new code template
   */
  createTemplate(template: Omit<CodeTemplate, 'id' | 'metadata'>): CodeTemplate {
    const id = this.generateTemplateId(template.name);
    const fullTemplate: CodeTemplate = {
      ...template,
      id,
      metadata: {
        version: '1.0.0',
        author: 'VoltAgent',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        category: 'custom'
      }
    };

    this.templates.set(id, fullTemplate);
    return fullTemplate;
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): CodeTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * List all templates
   */
  listTemplates(filters?: {
    language?: string;
    framework?: string;
    category?: string;
    tags?: string[];
  }): CodeTemplate[] {
    let templates = Array.from(this.templates.values());

    if (filters) {
      if (filters.language) {
        templates = templates.filter(t => t.language === filters.language);
      }
      if (filters.framework) {
        templates = templates.filter(t => t.framework === filters.framework);
      }
      if (filters.category) {
        templates = templates.filter(t => t.metadata.category === filters.category);
      }
      if (filters.tags && filters.tags.length > 0) {
        templates = templates.filter(t => 
          filters.tags!.some(tag => t.metadata.tags.includes(tag))
        );
      }
    }

    return templates;
  }

  /**
   * Generate code from template
   */
  generateFromTemplate(templateId: string, variables: Record<string, any>): string {
    const template = this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Validate required variables
    for (const variable of template.variables) {
      if (variable.required && !(variable.name in variables)) {
        throw new Error(`Required variable ${variable.name} is missing`);
      }
    }

    // Replace placeholders in template content
    let content = template.content;
    for (const variable of template.variables) {
      const value = variables[variable.name] || variable.defaultValue;
      const placeholder = `{{${variable.name}}}`;
      content = content.replace(new RegExp(placeholder, 'g'), String(value));
    }

    return content;
  }

  /**
   * Validate template variables
   */
  validateTemplateVariables(templateId: string, variables: Record<string, any>): {
    valid: boolean;
    errors: string[];
  } {
    const template = this.getTemplate(templateId);
    if (!template) {
      return { valid: false, errors: [`Template ${templateId} not found`] };
    }

    const errors: string[] = [];

    for (const variable of template.variables) {
      const value = variables[variable.name];

      // Check required variables
      if (variable.required && (value === undefined || value === null)) {
        errors.push(`Required variable ${variable.name} is missing`);
        continue;
      }

      // Skip validation if value is not provided and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      if (!this.validateVariableType(value, variable.type)) {
        errors.push(`Variable ${variable.name} must be of type ${variable.type}`);
      }

      // Pattern validation for strings
      if (variable.type === 'string' && variable.pattern) {
        const regex = new RegExp(variable.pattern);
        if (!regex.test(String(value))) {
          errors.push(`Variable ${variable.name} does not match pattern ${variable.pattern}`);
        }
      }

      // Options validation
      if (variable.options && !variable.options.includes(String(value))) {
        errors.push(`Variable ${variable.name} must be one of: ${variable.options.join(', ')}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Initialize default templates
   */
  private initializeDefaultTemplates(): void {
    // React Component Template
    this.createTemplate({
      name: 'React Component',
      description: 'A basic React functional component with TypeScript',
      language: 'typescript',
      framework: 'react',
      content: `import React from 'react';

interface {{componentName}}Props {
  {{#if hasProps}}
  {{propName}}: {{propType}};
  {{/if}}
}

export const {{componentName}}: React.FC<{{componentName}}Props> = ({{#if hasProps}}{ {{propName}} }{{/if}}) => {
  return (
    <div className="{{cssClass}}">
      {{#if hasProps}}
      <p>{{{propName}}}</p>
      {{else}}
      <p>Hello from {{componentName}}!</p>
      {{/if}}
    </div>
  );
};

export default {{componentName}};`,
      variables: [
        {
          name: 'componentName',
          type: 'string',
          description: 'Name of the React component',
          required: true,
          pattern: '^[A-Z][a-zA-Z0-9]*$'
        },
        {
          name: 'hasProps',
          type: 'boolean',
          description: 'Whether the component has props',
          required: false,
          defaultValue: false
        },
        {
          name: 'propName',
          type: 'string',
          description: 'Name of the prop',
          required: false,
          defaultValue: 'text'
        },
        {
          name: 'propType',
          type: 'string',
          description: 'Type of the prop',
          required: false,
          defaultValue: 'string'
        },
        {
          name: 'cssClass',
          type: 'string',
          description: 'CSS class name',
          required: false,
          defaultValue: 'component'
        }
      ]
    });

    // Express API Route Template
    this.createTemplate({
      name: 'Express API Route',
      description: 'An Express.js API route with error handling',
      language: 'typescript',
      framework: 'express',
      content: `import { Request, Response, NextFunction } from 'express';
import { {{modelName}} } from '../models/{{modelName}}';

export const {{routeName}} = async (req: Request, res: Response, next: NextFunction) => {
  try {
    {{#if isGetRoute}}
    const {{resourceName}} = await {{modelName}}.findById(req.params.id);
    
    if (!{{resourceName}}) {
      return res.status(404).json({ error: '{{modelName}} not found' });
    }
    
    res.json({{resourceName}});
    {{else}}
    const {{resourceName}} = new {{modelName}}(req.body);
    await {{resourceName}}.save();
    
    res.status(201).json({{resourceName}});
    {{/if}}
  } catch (error) {
    next(error);
  }
};`,
      variables: [
        {
          name: 'routeName',
          type: 'string',
          description: 'Name of the route handler function',
          required: true
        },
        {
          name: 'modelName',
          type: 'string',
          description: 'Name of the data model',
          required: true
        },
        {
          name: 'resourceName',
          type: 'string',
          description: 'Name of the resource variable',
          required: true
        },
        {
          name: 'isGetRoute',
          type: 'boolean',
          description: 'Whether this is a GET route',
          required: false,
          defaultValue: true
        }
      ]
    });
  }

  /**
   * Enhance generation request with context
   */
  private enhanceGenerationRequest(request: CodeGenerationRequest): CodeGenerationRequest {
    return {
      ...request,
      context: {
        language: 'typescript',
        framework: 'node',
        ...request.context
      },
      parameters: {
        style: 'standard',
        includeErrorHandling: true,
        includeLogging: false,
        includeTypes: true,
        ...request.parameters
      }
    };
  }

  /**
   * Analyze generated code quality
   */
  private async analyzeGeneratedCode(code: string, language: string): Promise<CodeAnalysisResult> {
    const cacheKey = `analysis:${this.hashCode(code)}`;
    const cached = this.cache.get<CodeAnalysisResult>(cacheKey);
    
    if (cached) {
      return cached;
    }

    const result = await this.client.analyzeCode(code, language);
    this.cache.set(cacheKey, result);
    
    return result;
  }

  /**
   * Parse generated code into separate files
   */
  private parseGeneratedCodeIntoFiles(code: string, request: CodeGenerationRequest): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const language = request.context?.language || 'typescript';

    // Simple file parsing - in a real implementation, this would be more sophisticated
    if (code.includes('export')) {
      files.push({
        path: this.generateFileName(request.prompt, language),
        content: code,
        language,
        description: 'Main implementation file',
        isTest: false,
        isConfig: false
      });
    }

    // Generate test file if requested
    if (request.parameters?.includeTypes) {
      files.push({
        path: this.generateFileName(request.prompt, language, 'test'),
        content: this.generateTestFile(code, language),
        language,
        description: 'Test file',
        isTest: true,
        isConfig: false
      });
    }

    return files;
  }

  /**
   * Extract dependencies from generated code
   */
  private extractDependencies(code: string, language?: string): string[] {
    const dependencies: string[] = [];
    
    // Extract import statements
    const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(code)) !== null) {
      const dep = match[1];
      if (!dep.startsWith('.') && !dep.startsWith('/')) {
        dependencies.push(dep);
      }
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Generate setup instructions
   */
  private generateSetupInstructions(files: GeneratedFile[], dependencies: string[]): string[] {
    const instructions: string[] = [];

    if (dependencies.length > 0) {
      instructions.push(`Install dependencies: npm install ${dependencies.join(' ')}`);
    }

    const hasTests = files.some(f => f.isTest);
    if (hasTests) {
      instructions.push('Run tests: npm test');
    }

    instructions.push('Build the project: npm run build');

    return instructions;
  }

  /**
   * Create refactoring prompt
   */
  private createRefactoringPrompt(request: CodeRefactoringRequest): string {
    const goals = request.goals.map(goal => goal.replace(/_/g, ' ')).join(', ');
    
    return `Refactor the following ${request.language} code to ${goals}:

\`\`\`${request.language}
${request.code}
\`\`\`

Please provide the refactored code with explanations for the changes made.`;
  }

  /**
   * Convert analysis to review findings
   */
  private convertAnalysisToFindings(analysis: CodeAnalysisResult, criteria: ReviewCriteria): ReviewFinding[] {
    return analysis.issues.map(issue => ({
      type: this.mapIssueTypeToFindingType(issue.type),
      severity: this.mapIssueSeverity(issue.type),
      message: issue.message,
      file: issue.file,
      line: issue.line,
      column: issue.column,
      fix: issue.fix,
      rule: 'code_analysis'
    }));
  }

  /**
   * Calculate review score
   */
  private calculateReviewScore(findings: ReviewFinding[]): number {
    if (findings.length === 0) return 100;

    const severityWeights = {
      critical: 25,
      high: 15,
      medium: 10,
      low: 5,
      info: 1
    };

    const totalDeductions = findings.reduce((sum, finding) => {
      return sum + severityWeights[finding.severity];
    }, 0);

    return Math.max(0, 100 - totalDeductions);
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(findings: ReviewFinding[], criteria: ReviewCriteria): string[] {
    const recommendations: string[] = [];

    const criticalFindings = findings.filter(f => f.severity === 'critical');
    if (criticalFindings.length > 0) {
      recommendations.push('Address critical security and bug issues immediately');
    }

    const performanceFindings = findings.filter(f => f.type === 'performance');
    if (performanceFindings.length > 0 && criteria.performance) {
      recommendations.push('Optimize performance bottlenecks');
    }

    if (findings.length > 10) {
      recommendations.push('Consider breaking down the code into smaller, more manageable functions');
    }

    return recommendations;
  }

  /**
   * Determine approval status
   */
  private determineApprovalStatus(score: number, findings: ReviewFinding[]): boolean {
    const hasCriticalIssues = findings.some(f => f.severity === 'critical');
    return score >= 70 && !hasCriticalIssues;
  }

  /**
   * Generate review summary
   */
  private generateReviewSummary(score: number, findings: ReviewFinding[]): string {
    const issueCount = findings.length;
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    
    if (score >= 90) {
      return `Excellent code quality (${score}/100). ${issueCount} minor issues found.`;
    } else if (score >= 70) {
      return `Good code quality (${score}/100). ${issueCount} issues found, ${criticalCount} critical.`;
    } else {
      return `Code needs improvement (${score}/100). ${issueCount} issues found, ${criticalCount} critical.`;
    }
  }

  /**
   * Utility methods
   */
  private generateTemplateId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
  }

  private validateVariableType(value: any, type: string): boolean {
    switch (type) {
      case 'string': return typeof value === 'string';
      case 'number': return typeof value === 'number';
      case 'boolean': return typeof value === 'boolean';
      case 'array': return Array.isArray(value);
      case 'object': return typeof value === 'object' && !Array.isArray(value);
      default: return true;
    }
  }

  private hashCode(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private generateFileName(prompt: string, language: string, suffix?: string): string {
    const baseName = prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 30);
    
    const extension = language === 'typescript' ? 'ts' : 
                     language === 'javascript' ? 'js' : 
                     language;
    
    return suffix ? `${baseName}.${suffix}.${extension}` : `${baseName}.${extension}`;
  }

  private generateTestFile(code: string, language: string): string {
    return `// Test file for generated code
import { describe, it, expect } from '@jest/globals';

describe('Generated Code Tests', () => {
  it('should work correctly', () => {
    // TODO: Add actual tests
    expect(true).toBe(true);
  });
});`;
  }

  private mapIssueTypeToFindingType(issueType: string): ReviewFinding['type'] {
    switch (issueType) {
      case 'error': return 'bug';
      case 'warning': return 'maintainability';
      case 'info': return 'style';
      default: return 'maintainability';
    }
  }

  private mapIssueSeverity(issueType: string): ReviewFinding['severity'] {
    switch (issueType) {
      case 'error': return 'high';
      case 'warning': return 'medium';
      case 'info': return 'low';
      default: return 'medium';
    }
  }
}

