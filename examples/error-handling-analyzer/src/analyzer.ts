import {
  ErrorHandlingAnalysisResult,
  ErrorFinding,
  ErrorFindingType,
  ErrorCategory,
  SeverityLevel,
  CodeAnalysisInput
} from "./types";
import { getAnalysisContext, detectLanguage } from "./patterns";

export class ErrorHandlingAnalyzer {
  private findings: ErrorFinding[] = [];
  private analyzedFiles: string[] = [];

  async analyzeCode(input: CodeAnalysisInput): Promise<ErrorHandlingAnalysisResult> {
    this.findings = [];
    this.analyzedFiles = [];

    for (const file of input.files) {
      await this.analyzeFile(file.path, file.content, file.language);
    }

    return this.generateReport(input.analysis_depth);
  }

  private async analyzeFile(filePath: string, content: string, language?: string): Promise<void> {
    const detectedLanguage = language || detectLanguage(filePath);
    const context = getAnalysisContext(detectedLanguage);
    
    this.analyzedFiles.push(filePath);

    // Split content into lines for line-by-line analysis
    const lines = content.split('\n');

    // Analyze different aspects of error handling
    await this.analyzeMissingErrorHandling(filePath, content, lines, context);
    await this.analyzeUnhandledExceptions(filePath, content, lines, context);
    await this.analyzeErrorPropagation(filePath, content, lines, context);
    await this.analyzeErrorLogging(filePath, content, lines, context);
    await this.analyzeAsyncErrorHandling(filePath, content, lines, context);
    await this.analyzeResourceManagement(filePath, content, lines, context);
  }

  private async analyzeMissingErrorHandling(
    filePath: string,
    content: string,
    lines: string[],
    context: any
  ): Promise<void> {
    // Check for error-prone operations without proper error handling
    for (const operation of context.errorProneOperations) {
      const operationRegex = new RegExp(`\\b${operation.replace('.', '\\.')}\\s*\\(`, 'g');
      let match;

      while ((match = operationRegex.exec(content)) !== null) {
        const lineNumber = this.getLineNumber(content, match.index);
        const lineContent = lines[lineNumber - 1];

        // Check if this operation is wrapped in error handling
        if (!this.hasErrorHandling(content, match.index, context)) {
          this.findings.push({
            type: "missing_error_handling" as ErrorFindingType,
            file: filePath,
            function: this.extractFunctionName(content, match.index),
            line: lineNumber,
            operation,
            suggestion: `Add error handling for ${operation} operation`,
            category: this.categorizeOperation(operation),
            severity: this.calculateSeverity(operation, lineContent),
            code_snippet: lineContent.trim(),
            confidence: 0.85
          });
        }
      }
    }
  }

  private async analyzeUnhandledExceptions(
    filePath: string,
    content: string,
    lines: string[],
    context: any
  ): Promise<void> {
    // Look for try-catch blocks with empty or generic catch handlers
    for (const pattern of context.patterns.trycatch) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const catchBlock = match[0];
        const lineNumber = this.getLineNumber(content, match.index);

        // Check for empty catch blocks
        if (this.isEmptyCatchBlock(catchBlock)) {
          this.findings.push({
            type: "error_swallowing" as ErrorFindingType,
            file: filePath,
            line: lineNumber,
            suggestion: "Empty catch block swallows errors. Add proper error handling or logging.",
            severity: "high" as SeverityLevel,
            code_snippet: this.extractCodeSnippet(lines, lineNumber, 3),
            confidence: 0.9
          });
        }

        // Check for generic error handling
        if (this.isGenericErrorHandling(catchBlock)) {
          this.findings.push({
            type: "generic_error_handling" as ErrorFindingType,
            file: filePath,
            line: lineNumber,
            suggestion: "Generic error handling may mask specific error conditions. Consider handling specific error types.",
            severity: "medium" as SeverityLevel,
            code_snippet: this.extractCodeSnippet(lines, lineNumber, 3),
            confidence: 0.7
          });
        }
      }
    }
  }

  private async analyzeErrorPropagation(
    filePath: string,
    content: string,
    lines: string[],
    context: any
  ): Promise<void> {
    // Analyze error propagation paths
    const functionCalls = this.extractFunctionCalls(content);
    const errorHandlingBlocks = this.extractErrorHandlingBlocks(content, context);

    for (const call of functionCalls) {
      if (this.isErrorProneFunction(call.name, context)) {
        const hasProperPropagation = this.checkErrorPropagation(
          content,
          call.position,
          errorHandlingBlocks
        );

        if (!hasProperPropagation) {
          this.findings.push({
            type: "error_propagation_issue" as ErrorFindingType,
            file: filePath,
            function: call.name,
            line: this.getLineNumber(content, call.position),
            suggestion: "Error from this operation may not be properly propagated to caller",
            severity: "medium" as SeverityLevel,
            confidence: 0.75
          });
        }
      }
    }
  }

  private async analyzeErrorLogging(
    filePath: string,
    content: string,
    lines: string[],
    context: any
  ): Promise<void> {
    // Check for error handling blocks without logging
    for (const pattern of context.patterns.trycatch) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const catchBlock = match[0];
        const lineNumber = this.getLineNumber(content, match.index);

        if (!this.hasLogging(catchBlock, context)) {
          this.findings.push({
            type: "inadequate_error_logging" as ErrorFindingType,
            file: filePath,
            line: lineNumber,
            suggestion: "Error handling block lacks proper logging for debugging and monitoring",
            severity: "medium" as SeverityLevel,
            code_snippet: this.extractCodeSnippet(lines, lineNumber, 2),
            confidence: 0.8
          });
        }
      }
    }
  }

  private async analyzeAsyncErrorHandling(
    filePath: string,
    content: string,
    lines: string[],
    context: any
  ): Promise<void> {
    // Check async functions and promises for proper error handling
    for (const pattern of context.patterns.asyncPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = this.getLineNumber(content, match.index);
        const functionBlock = this.extractFunctionBlock(content, match.index);

        if (!this.hasAsyncErrorHandling(functionBlock, context)) {
          this.findings.push({
            type: "async_error_handling" as ErrorFindingType,
            file: filePath,
            line: lineNumber,
            suggestion: "Async operation lacks proper error handling. Consider adding try-catch or .catch()",
            category: "async_errors" as ErrorCategory,
            severity: "high" as SeverityLevel,
            confidence: 0.8
          });
        }
      }
    }
  }

  private async analyzeResourceManagement(
    filePath: string,
    content: string,
    lines: string[],
    context: any
  ): Promise<void> {
    // Check for resource management without proper cleanup
    for (const pattern of context.patterns.resourceManagement) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const lineNumber = this.getLineNumber(content, match.index);
        const operation = match[0];

        if (!this.hasResourceCleanup(content, match.index, context)) {
          this.findings.push({
            type: "resource_leak_risk" as ErrorFindingType,
            file: filePath,
            line: lineNumber,
            operation,
            suggestion: "Resource allocation without proper cleanup may lead to resource leaks",
            category: "resource_errors" as ErrorCategory,
            severity: "medium" as SeverityLevel,
            confidence: 0.7
          });
        }
      }
    }
  }

  // Helper methods
  private getLineNumber(content: string, position: number): number {
    return content.substring(0, position).split('\n').length;
  }

  private extractFunctionName(content: string, position: number): string {
    const beforePosition = content.substring(0, position);
    const functionMatch = beforePosition.match(/(?:function\s+(\w+)|(\w+)\s*[:=]\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>))/g);
    return functionMatch ? functionMatch[functionMatch.length - 1].split(/\s+/)[1] || 'anonymous' : 'unknown';
  }

  private categorizeOperation(operation: string): ErrorCategory {
    if (operation.includes('db') || operation.includes('sql') || operation.includes('query')) {
      return "database_errors" as ErrorCategory;
    }
    if (operation.includes('http') || operation.includes('fetch') || operation.includes('request')) {
      return "network_errors" as ErrorCategory;
    }
    if (operation.includes('parse') || operation.includes('validate')) {
      return "validation_errors" as ErrorCategory;
    }
    if (operation.includes('fs') || operation.includes('file') || operation.includes('open')) {
      return "system_errors" as ErrorCategory;
    }
    return "business_logic_errors" as ErrorCategory;
  }

  private calculateSeverity(operation: string, lineContent: string): SeverityLevel {
    // Critical operations
    if (operation.includes('database') || operation.includes('sql') || 
        operation.includes('payment') || operation.includes('auth')) {
      return "critical" as SeverityLevel;
    }
    
    // High severity operations
    if (operation.includes('http') || operation.includes('fetch') || 
        operation.includes('file') || operation.includes('parse')) {
      return "high" as SeverityLevel;
    }
    
    // Medium severity for other operations
    return "medium" as SeverityLevel;
  }

  private hasErrorHandling(content: string, position: number, context: any): boolean {
    // Look for error handling patterns around the operation
    const surroundingCode = this.getSurroundingCode(content, position, 200);
    
    for (const pattern of context.patterns.trycatch) {
      if (pattern.test(surroundingCode)) {
        return true;
      }
    }
    
    for (const pattern of context.patterns.errorHandling) {
      if (pattern.test(surroundingCode)) {
        return true;
      }
    }
    
    return false;
  }

  private getSurroundingCode(content: string, position: number, radius: number): string {
    const start = Math.max(0, position - radius);
    const end = Math.min(content.length, position + radius);
    return content.substring(start, end);
  }

  private isEmptyCatchBlock(catchBlock: string): boolean {
    // Remove the catch declaration and check if the body is empty or only has comments
    const bodyMatch = catchBlock.match(/catch\s*\([^)]*\)\s*\{([\s\S]*)\}/);
    if (!bodyMatch) return false;
    
    const body = bodyMatch[1].trim();
    return body === '' || /^\/\/.*$|^\/\*[\s\S]*?\*\/$/.test(body);
  }

  private isGenericErrorHandling(catchBlock: string): boolean {
    // Check for generic catch(e) or catch(error) without specific handling
    return /catch\s*\(\s*\w*\s*\)\s*\{[\s\S]*?\}/.test(catchBlock) &&
           !/instanceof|typeof|\.name|\.code/.test(catchBlock);
  }

  private extractFunctionCalls(content: string): Array<{name: string, position: number}> {
    const calls: Array<{name: string, position: number}> = [];
    const functionCallRegex = /(\w+(?:\.\w+)*)\s*\(/g;
    let match;
    
    while ((match = functionCallRegex.exec(content)) !== null) {
      calls.push({
        name: match[1],
        position: match.index
      });
    }
    
    return calls;
  }

  private extractErrorHandlingBlocks(content: string, context: any): Array<{start: number, end: number}> {
    const blocks: Array<{start: number, end: number}> = [];
    
    for (const pattern of context.patterns.trycatch) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        blocks.push({
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }
    
    return blocks;
  }

  private isErrorProneFunction(functionName: string, context: any): boolean {
    return context.errorProneOperations.some((op: string) => 
      functionName.includes(op.split('.').pop() || op)
    );
  }

  private checkErrorPropagation(
    content: string,
    position: number,
    errorHandlingBlocks: Array<{start: number, end: number}>
  ): boolean {
    // Check if the position is within an error handling block
    return errorHandlingBlocks.some(block => 
      position >= block.start && position <= block.end
    );
  }

  private hasLogging(catchBlock: string, context: any): boolean {
    for (const pattern of context.patterns.logging) {
      if (pattern.test(catchBlock)) {
        return true;
      }
    }
    return false;
  }

  private extractFunctionBlock(content: string, position: number): string {
    // Extract the function block containing the position
    const lines = content.split('\n');
    const lineNumber = this.getLineNumber(content, position);
    
    let start = lineNumber - 1;
    let end = lineNumber - 1;
    let braceCount = 0;
    
    // Find function start
    while (start > 0 && !lines[start].includes('function') && !lines[start].includes('=>')) {
      start--;
    }
    
    // Find function end by counting braces
    for (let i = start; i < lines.length; i++) {
      const line = lines[i];
      braceCount += (line.match(/\{/g) || []).length;
      braceCount -= (line.match(/\}/g) || []).length;
      
      if (braceCount === 0 && i > start) {
        end = i;
        break;
      }
    }
    
    return lines.slice(start, end + 1).join('\n');
  }

  private hasAsyncErrorHandling(functionBlock: string, context: any): boolean {
    // Check for try-catch, .catch(), or error handling in async functions
    for (const pattern of context.patterns.trycatch) {
      if (pattern.test(functionBlock)) {
        return true;
      }
    }
    
    // Check for .catch() on promises
    if (/\.catch\s*\(/.test(functionBlock)) {
      return true;
    }
    
    return false;
  }

  private hasResourceCleanup(content: string, position: number, context: any): boolean {
    const functionBlock = this.extractFunctionBlock(content, position);
    
    // Check for cleanup patterns like .close(), .dispose(), finally blocks, defer statements
    const cleanupPatterns = [
      /\.close\s*\(/,
      /\.dispose\s*\(/,
      /finally\s*\{/,
      /defer\s+/,
      /with\s+\w+.*:/  // Python with statement
    ];
    
    return cleanupPatterns.some(pattern => pattern.test(functionBlock));
  }

  private extractCodeSnippet(lines: string[], lineNumber: number, context: number = 2): string {
    const start = Math.max(0, lineNumber - context - 1);
    const end = Math.min(lines.length, lineNumber + context);
    return lines.slice(start, end).join('\n');
  }

  private generateReport(analysisDepth: string): ErrorHandlingAnalysisResult {
    const severity = this.calculateOverallSeverity();
    const summary = this.generateSummary();
    const recommendations = this.generateRecommendations();

    return {
      module: "error_handling_analysis",
      severity,
      timestamp: new Date().toISOString(),
      analyzed_files: this.analyzedFiles,
      total_findings: this.findings.length,
      findings: this.findings,
      summary,
      recommendations
    };
  }

  private calculateOverallSeverity(): SeverityLevel {
    const severityCounts = {
      critical: this.findings.filter(f => f.severity === 'critical').length,
      high: this.findings.filter(f => f.severity === 'high').length,
      medium: this.findings.filter(f => f.severity === 'medium').length,
      low: this.findings.filter(f => f.severity === 'low').length
    };

    if (severityCounts.critical > 0) return "critical";
    if (severityCounts.high > 3) return "high";
    if (severityCounts.high > 0 || severityCounts.medium > 5) return "medium";
    return "low";
  }

  private generateSummary() {
    const findingsByType = this.findings.reduce((acc, finding) => {
      acc[finding.type] = (acc[finding.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalOperations = this.estimateTotalOperations();
    const coveredOperations = totalOperations - (findingsByType.missing_error_handling || 0);
    const coveragePercentage = totalOperations > 0 ? (coveredOperations / totalOperations) * 100 : 100;

    return {
      missing_error_handling: findingsByType.missing_error_handling || 0,
      unhandled_exceptions: findingsByType.unhandled_exception || 0,
      error_propagation_issues: findingsByType.error_propagation_issue || 0,
      missing_recovery_mechanisms: findingsByType.missing_recovery_mechanism || 0,
      inadequate_logging: findingsByType.inadequate_error_logging || 0,
      coverage_percentage: Math.round(coveragePercentage)
    };
  }

  private estimateTotalOperations(): number {
    // Estimate based on findings and typical code patterns
    return this.findings.length + Math.floor(this.findings.length * 0.3);
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const summary = this.generateSummary();

    if (summary.missing_error_handling > 0) {
      recommendations.push("Implement comprehensive error handling for all error-prone operations");
    }

    if (summary.inadequate_logging > 0) {
      recommendations.push("Add structured logging to all error handling blocks for better debugging");
    }

    if (summary.error_propagation_issues > 0) {
      recommendations.push("Ensure errors are properly propagated through the call stack with context");
    }

    if (summary.coverage_percentage < 80) {
      recommendations.push("Increase error handling coverage to at least 80% of error-prone operations");
    }

    if (this.findings.some(f => f.type === 'async_error_handling')) {
      recommendations.push("Implement proper error handling for all async operations and promises");
    }

    if (this.findings.some(f => f.type === 'resource_leak_risk')) {
      recommendations.push("Ensure proper resource cleanup using try-finally blocks or RAII patterns");
    }

    return recommendations;
  }
}

