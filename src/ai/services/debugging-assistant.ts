/**
 * Debugging Assistant Service
 * 
 * Error analysis and debugging assistance using Codegen SDK
 */

import { CodegenSDKClient } from '../../middleware/codegen/sdk-client.js';

export interface DebugRequest {
  errorMessage?: string;
  stackTrace?: string;
  code?: string;
  filePath?: string;
  context?: DebugContext;
  reproductionSteps?: string[];
}

export interface DebugContext {
  language: string;
  framework?: string;
  environment?: 'development' | 'staging' | 'production';
  dependencies?: string[];
  recentChanges?: string[];
  logs?: string[];
  userAgent?: string;
  operatingSystem?: string;
}

export interface DebugResult {
  analysis: ErrorAnalysis;
  solutions: Solution[];
  preventionTips: PreventionTip[];
  testCases: TestCase[];
  relatedIssues?: RelatedIssue[];
}

export interface ErrorAnalysis {
  errorType: ErrorType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  rootCause: string;
  affectedComponents: string[];
  impact: string;
  confidence: number; // 0-1
}

export interface Solution {
  id: string;
  title: string;
  description: string;
  steps: string[];
  codeChanges?: CodeChange[];
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedTime: string;
  confidence: number; // 0-1
  tested: boolean;
}

export interface CodeChange {
  file: string;
  operation: 'add' | 'modify' | 'delete';
  lineNumber?: number;
  oldCode?: string;
  newCode: string;
  explanation: string;
}

export interface PreventionTip {
  category: 'testing' | 'validation' | 'monitoring' | 'architecture';
  title: string;
  description: string;
  implementation: string;
}

export interface TestCase {
  name: string;
  description: string;
  code: string;
  expectedBehavior: string;
  language: string;
}

export interface RelatedIssue {
  title: string;
  description: string;
  url?: string;
  similarity: number; // 0-1
}

export enum ErrorType {
  SYNTAX_ERROR = 'syntax_error',
  RUNTIME_ERROR = 'runtime_error',
  LOGIC_ERROR = 'logic_error',
  PERFORMANCE_ISSUE = 'performance_issue',
  SECURITY_VULNERABILITY = 'security_vulnerability',
  MEMORY_LEAK = 'memory_leak',
  NETWORK_ERROR = 'network_error',
  DATABASE_ERROR = 'database_error',
  CONFIGURATION_ERROR = 'configuration_error',
  DEPENDENCY_ERROR = 'dependency_error'
}

export class DebuggingAssistantService {
  private client: CodegenSDKClient;
  private knownPatterns: Map<string, ErrorPattern> = new Map();

  constructor(client: CodegenSDKClient) {
    this.client = client;
    this.initializeErrorPatterns();
  }

  /**
   * Analyze error and provide debugging assistance
   */
  async debugError(request: DebugRequest): Promise<DebugResult> {
    const debugPrompt = this.buildDebugPrompt(request);
    
    const task = await this.client.generateCode({
      prompt: debugPrompt,
      context: JSON.stringify(request.context),
      options: {
        language: request.context?.language || 'javascript'
      }
    });

    await task.waitForCompletion();

    if (task.status === 'failed') {
      throw new Error(`Debugging analysis failed: ${task.error}`);
    }

    return this.parseDebugResult(task.result, request);
  }

  /**
   * Quick error analysis for common patterns
   */
  async quickAnalysis(errorMessage: string, language: string): Promise<ErrorAnalysis> {
    // Check known patterns first
    const pattern = this.findMatchingPattern(errorMessage, language);
    if (pattern) {
      return {
        errorType: pattern.type,
        severity: pattern.severity,
        rootCause: pattern.commonCause,
        affectedComponents: [],
        impact: pattern.impact,
        confidence: 0.8
      };
    }

    // Fallback to AI analysis
    const request: DebugRequest = {
      errorMessage,
      context: { language }
    };

    const result = await this.debugError(request);
    return result.analysis;
  }

  /**
   * Generate automated fix for error
   */
  async generateFix(
    request: DebugRequest,
    solutionId?: string
  ): Promise<{ code: string; explanation: string }> {
    const debugResult = await this.debugError(request);
    
    let selectedSolution: Solution;
    if (solutionId) {
      selectedSolution = debugResult.solutions.find(s => s.id === solutionId) || debugResult.solutions[0];
    } else {
      // Select highest confidence solution
      selectedSolution = debugResult.solutions.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
    }

    if (!selectedSolution) {
      throw new Error('No solution found for the error');
    }

    // Generate code fix
    const fixPrompt = `Generate code to fix the following error: ${request.errorMessage}
    
Solution to implement: ${selectedSolution.description}
Steps: ${selectedSolution.steps.join(', ')}

${request.code ? `Current code:\n${request.code}` : ''}

Provide the corrected code with explanation.`;

    const task = await this.client.generateCode({
      prompt: fixPrompt,
      context: JSON.stringify(request.context),
      options: {
        language: request.context?.language || 'javascript'
      }
    });

    await task.waitForCompletion();

    if (task.status === 'failed') {
      throw new Error(`Fix generation failed: ${task.error}`);
    }

    return this.parseFixResult(task.result);
  }

  /**
   * Generate test cases to reproduce the error
   */
  async generateReproductionTests(request: DebugRequest): Promise<TestCase[]> {
    const testPrompt = `Generate test cases to reproduce the following error:
    
Error: ${request.errorMessage}
${request.stackTrace ? `Stack trace: ${request.stackTrace}` : ''}
${request.reproductionSteps ? `Reproduction steps: ${request.reproductionSteps.join(', ')}` : ''}

Generate comprehensive test cases that can reliably reproduce this error.`;

    const task = await this.client.generateCode({
      prompt: testPrompt,
      context: JSON.stringify(request.context),
      options: {
        language: request.context?.language || 'javascript'
      }
    });

    await task.waitForCompletion();

    if (task.status === 'failed') {
      throw new Error(`Test generation failed: ${task.error}`);
    }

    return this.parseTestCases(task.result, request.context?.language || 'javascript');
  }

  /**
   * Analyze performance issues
   */
  async analyzePerformanceIssue(
    code: string,
    performanceMetrics: {
      executionTime?: number;
      memoryUsage?: number;
      cpuUsage?: number;
    },
    context?: DebugContext
  ): Promise<DebugResult> {
    const request: DebugRequest = {
      code,
      context: {
        ...context,
        language: context?.language || 'javascript'
      },
      errorMessage: `Performance issue detected. Execution time: ${performanceMetrics.executionTime}ms, Memory: ${performanceMetrics.memoryUsage}MB`
    };

    return this.debugError(request);
  }

  /**
   * Analyze memory leaks
   */
  async analyzeMemoryLeak(
    code: string,
    memoryProfile: {
      heapUsed: number;
      heapTotal: number;
      external: number;
    },
    context?: DebugContext
  ): Promise<DebugResult> {
    const request: DebugRequest = {
      code,
      context: {
        ...context,
        language: context?.language || 'javascript'
      },
      errorMessage: `Memory leak detected. Heap used: ${memoryProfile.heapUsed}MB, Total: ${memoryProfile.heapTotal}MB`
    };

    return this.debugError(request);
  }

  /**
   * Debug network-related errors
   */
  async debugNetworkError(
    errorMessage: string,
    networkDetails: {
      url?: string;
      method?: string;
      statusCode?: number;
      responseTime?: number;
      headers?: Record<string, string>;
    },
    context?: DebugContext
  ): Promise<DebugResult> {
    const request: DebugRequest = {
      errorMessage,
      context: {
        ...context,
        language: context?.language || 'javascript',
        logs: [`Network request failed: ${JSON.stringify(networkDetails)}`]
      }
    };

    return this.debugError(request);
  }

  /**
   * Initialize common error patterns
   */
  private initializeErrorPatterns(): void {
    const patterns: ErrorPattern[] = [
      {
        pattern: /Cannot read property '.*' of undefined/,
        type: ErrorType.RUNTIME_ERROR,
        severity: 'high',
        commonCause: 'Attempting to access property of undefined object',
        impact: 'Application crash',
        language: 'javascript'
      },
      {
        pattern: /ReferenceError: .* is not defined/,
        type: ErrorType.RUNTIME_ERROR,
        severity: 'high',
        commonCause: 'Variable or function not declared or out of scope',
        impact: 'Application crash',
        language: 'javascript'
      },
      {
        pattern: /SyntaxError: Unexpected token/,
        type: ErrorType.SYNTAX_ERROR,
        severity: 'critical',
        commonCause: 'Invalid syntax in code',
        impact: 'Code compilation failure',
        language: 'javascript'
      },
      {
        pattern: /TypeError: .* is not a function/,
        type: ErrorType.RUNTIME_ERROR,
        severity: 'high',
        commonCause: 'Attempting to call non-function as function',
        impact: 'Application crash',
        language: 'javascript'
      },
      {
        pattern: /NameError: name '.*' is not defined/,
        type: ErrorType.RUNTIME_ERROR,
        severity: 'high',
        commonCause: 'Variable not defined in current scope',
        impact: 'Application crash',
        language: 'python'
      },
      {
        pattern: /IndentationError: expected an indented block/,
        type: ErrorType.SYNTAX_ERROR,
        severity: 'critical',
        commonCause: 'Incorrect indentation in Python code',
        impact: 'Code compilation failure',
        language: 'python'
      }
    ];

    for (const pattern of patterns) {
      this.knownPatterns.set(pattern.pattern.source, pattern);
    }
  }

  /**
   * Find matching error pattern
   */
  private findMatchingPattern(errorMessage: string, language: string): ErrorPattern | null {
    for (const [patternStr, pattern] of this.knownPatterns) {
      if (pattern.language === language || !pattern.language) {
        const regex = new RegExp(patternStr, 'i');
        if (regex.test(errorMessage)) {
          return pattern;
        }
      }
    }
    return null;
  }

  /**
   * Build debug prompt
   */
  private buildDebugPrompt(request: DebugRequest): string {
    let prompt = 'Analyze the following error and provide debugging assistance:\n\n';

    if (request.errorMessage) {
      prompt += `Error Message: ${request.errorMessage}\n`;
    }

    if (request.stackTrace) {
      prompt += `Stack Trace:\n${request.stackTrace}\n`;
    }

    if (request.code) {
      prompt += `Code:\n${request.code}\n`;
    }

    if (request.reproductionSteps?.length) {
      prompt += `Reproduction Steps:\n${request.reproductionSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n`;
    }

    if (request.context) {
      prompt += `\nContext:\n`;
      prompt += `Language: ${request.context.language}\n`;
      if (request.context.framework) {
        prompt += `Framework: ${request.context.framework}\n`;
      }
      if (request.context.environment) {
        prompt += `Environment: ${request.context.environment}\n`;
      }
      if (request.context.recentChanges?.length) {
        prompt += `Recent Changes: ${request.context.recentChanges.join(', ')}\n`;
      }
    }

    prompt += `\nProvide:
1. Detailed error analysis including root cause and impact
2. Multiple solution options with step-by-step instructions
3. Prevention tips to avoid similar issues
4. Test cases to verify the fix
5. Related issues or documentation links if applicable`;

    return prompt;
  }

  /**
   * Parse debug result from API response
   */
  private parseDebugResult(result: any, request: DebugRequest): DebugResult {
    if (typeof result === 'string') {
      return this.parseTextDebugResult(result, request);
    }

    return {
      analysis: this.parseAnalysis(result.analysis || {}),
      solutions: this.parseSolutions(result.solutions || []),
      preventionTips: this.parsePreventionTips(result.preventionTips || []),
      testCases: this.parseTestCases(result.testCases || [], request.context?.language || 'javascript'),
      relatedIssues: this.parseRelatedIssues(result.relatedIssues || [])
    };
  }

  /**
   * Parse text-based debug result
   */
  private parseTextDebugResult(text: string, request: DebugRequest): DebugResult {
    // Simple text parsing - in a real implementation, this would be more sophisticated
    const analysis: ErrorAnalysis = {
      errorType: this.inferErrorType(request.errorMessage || ''),
      severity: 'medium',
      rootCause: 'Analysis from text response',
      affectedComponents: [],
      impact: 'Unknown impact',
      confidence: 0.6
    };

    const solutions: Solution[] = [{
      id: 'solution-1',
      title: 'General Solution',
      description: text.substring(0, 200) + '...',
      steps: ['Review the analysis', 'Apply suggested changes'],
      difficulty: 'medium',
      estimatedTime: '30 minutes',
      confidence: 0.6,
      tested: false
    }];

    return {
      analysis,
      solutions,
      preventionTips: [],
      testCases: []
    };
  }

  /**
   * Parse analysis from result
   */
  private parseAnalysis(analysis: any): ErrorAnalysis {
    return {
      errorType: analysis.errorType || ErrorType.RUNTIME_ERROR,
      severity: analysis.severity || 'medium',
      rootCause: analysis.rootCause || 'Unknown root cause',
      affectedComponents: analysis.affectedComponents || [],
      impact: analysis.impact || 'Unknown impact',
      confidence: analysis.confidence || 0.5
    };
  }

  /**
   * Parse solutions from result
   */
  private parseSolutions(solutions: any[]): Solution[] {
    return solutions.map((solution, index) => ({
      id: solution.id || `solution-${index}`,
      title: solution.title || `Solution ${index + 1}`,
      description: solution.description || '',
      steps: solution.steps || [],
      codeChanges: solution.codeChanges || [],
      difficulty: solution.difficulty || 'medium',
      estimatedTime: solution.estimatedTime || '30 minutes',
      confidence: solution.confidence || 0.5,
      tested: solution.tested || false
    }));
  }

  /**
   * Parse prevention tips from result
   */
  private parsePreventionTips(tips: any[]): PreventionTip[] {
    return tips.map(tip => ({
      category: tip.category || 'testing',
      title: tip.title || 'Prevention Tip',
      description: tip.description || '',
      implementation: tip.implementation || ''
    }));
  }

  /**
   * Parse test cases from result
   */
  private parseTestCases(testCases: any, language: string): TestCase[] {
    if (typeof testCases === 'string') {
      return [{
        name: 'Generated Test',
        description: 'Test case to reproduce the error',
        code: testCases,
        expectedBehavior: 'Should reproduce the error',
        language
      }];
    }

    if (Array.isArray(testCases)) {
      return testCases.map((testCase, index) => ({
        name: testCase.name || `Test Case ${index + 1}`,
        description: testCase.description || '',
        code: testCase.code || '',
        expectedBehavior: testCase.expectedBehavior || '',
        language: testCase.language || language
      }));
    }

    return [];
  }

  /**
   * Parse related issues from result
   */
  private parseRelatedIssues(issues: any[]): RelatedIssue[] {
    return issues.map(issue => ({
      title: issue.title || 'Related Issue',
      description: issue.description || '',
      url: issue.url,
      similarity: issue.similarity || 0.5
    }));
  }

  /**
   * Parse fix result
   */
  private parseFixResult(result: any): { code: string; explanation: string } {
    if (typeof result === 'string') {
      return {
        code: result,
        explanation: 'Generated fix code'
      };
    }

    return {
      code: result.code || result.fix || '',
      explanation: result.explanation || result.description || 'Generated fix code'
    };
  }

  /**
   * Infer error type from error message
   */
  private inferErrorType(errorMessage: string): ErrorType {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('syntax')) return ErrorType.SYNTAX_ERROR;
    if (message.includes('network') || message.includes('fetch')) return ErrorType.NETWORK_ERROR;
    if (message.includes('database') || message.includes('sql')) return ErrorType.DATABASE_ERROR;
    if (message.includes('memory') || message.includes('heap')) return ErrorType.MEMORY_LEAK;
    if (message.includes('performance') || message.includes('slow')) return ErrorType.PERFORMANCE_ISSUE;
    if (message.includes('security') || message.includes('unauthorized')) return ErrorType.SECURITY_VULNERABILITY;
    if (message.includes('config') || message.includes('environment')) return ErrorType.CONFIGURATION_ERROR;
    if (message.includes('dependency') || message.includes('module')) return ErrorType.DEPENDENCY_ERROR;
    
    return ErrorType.RUNTIME_ERROR;
  }
}

interface ErrorPattern {
  pattern: RegExp;
  type: ErrorType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  commonCause: string;
  impact: string;
  language?: string;
}

