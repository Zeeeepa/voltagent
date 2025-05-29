import {
  LanguageParser,
  SupportedLanguage,
  FunctionSignature,
  ParameterInfo,
  ParameterUsageInfo,
  ValidationFinding,
  ValidationIssueType,
  ValidationSeverity
} from "../types";

/**
 * JavaScript-specific parser for parameter validation
 * Extends TypeScript parser with JavaScript-specific handling
 */
export class JavaScriptParser implements LanguageParser {
  readonly language = SupportedLanguage.JAVASCRIPT;

  /**
   * Extract function signatures from JavaScript source code
   */
  async extractFunctions(sourceCode: string, filePath: string): Promise<FunctionSignature[]> {
    const functions: FunctionSignature[] = [];
    const lines = sourceCode.split('\n');

    // JavaScript function patterns (no type annotations)
    const functionPatterns = [
      // Regular function declarations: function name(params)
      /^(\s*)(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*\{/,
      // Arrow functions: const name = (params) => 
      /^(\s*)(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/,
      // Method definitions: methodName(params)
      /^(\s*)(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*\{/
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const pattern of functionPatterns) {
        const match = line.match(pattern);
        if (match) {
          const [, indent, functionName, paramString] = match;
          
          // Skip if it's likely not a function
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
            continue;
          }

          // Parse parameters (no types in JavaScript)
          const parameters = this.parseParameters(paramString, i + 1);
          
          // Find function end
          const endLine = this.findFunctionEnd(lines, i);
          
          const isExported = line.includes('export');
          const isAsync = line.includes('async');

          functions.push({
            name: functionName,
            parameters,
            returnType: undefined, // No return types in JavaScript
            isAsync,
            isExported,
            startLine: i + 1,
            endLine,
            filePath
          });
          
          break;
        }
      }
    }

    return functions;
  }

  /**
   * Parse JavaScript parameters (no type annotations)
   */
  private parseParameters(paramString: string, lineNumber: number): ParameterInfo[] {
    if (!paramString.trim()) {
      return [];
    }

    const parameters: ParameterInfo[] = [];
    const paramParts = paramString.split(',').map(p => p.trim());

    paramParts.forEach((param, index) => {
      if (!param) return;

      // Parse parameter: name = defaultValue or destructuring
      const paramMatch = param.match(/^(\w+)(?:\s*=\s*(.+))?$/) || 
                        param.match(/^(\{[^}]+\})(?:\s*=\s*(.+))?$/) ||
                        param.match(/^(\[[^\]]+\])(?:\s*=\s*(.+))?$/);
      
      if (paramMatch) {
        const [, name, defaultValue] = paramMatch;
        
        parameters.push({
          name: name.replace(/[{}[\]]/g, ''), // Clean destructuring syntax
          type: undefined, // No types in JavaScript
          isOptional: !!defaultValue,
          defaultValue: defaultValue?.trim(),
          annotations: [],
          position: index,
          line: lineNumber,
          column: 0
        });
      }
    });

    return parameters;
  }

  /**
   * Find the end line of a function
   */
  private findFunctionEnd(lines: string[], startLine: number): number {
    let braceCount = 0;
    let foundOpenBrace = false;

    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          foundOpenBrace = true;
        } else if (char === '}') {
          braceCount--;
          if (foundOpenBrace && braceCount === 0) {
            return i + 1;
          }
        }
      }
    }

    return startLine + 10; // fallback
  }

  /**
   * Analyze parameter usage within function body
   */
  async analyzeParameterUsage(
    functionSignature: FunctionSignature, 
    sourceCode: string
  ): Promise<ParameterUsageInfo[]> {
    const lines = sourceCode.split('\n');
    const usageInfo: ParameterUsageInfo[] = [];

    for (const param of functionSignature.parameters) {
      const usages: any[] = [];
      let isValidated = false;
      const validationMethods: string[] = [];

      // Analyze each line in the function body
      for (let i = functionSignature.startLine; i < functionSignature.endLine; i++) {
        const line = lines[i - 1];
        if (!line) continue;

        const paramRegex = new RegExp(`\\b${param.name}\\b`, 'g');
        let match;

        while ((match = paramRegex.exec(line)) !== null) {
          const context = line.trim();
          const operation = this.inferOperation(line, match.index);

          usages.push({
            line: i,
            column: match.index,
            context,
            operation,
            inferredType: this.inferTypeFromUsage(line, param.name)
          });

          if (this.isValidationPattern(line, param.name)) {
            isValidated = true;
            validationMethods.push(this.extractValidationMethod(line));
          }
        }
      }

      usageInfo.push({
        parameter: param.name,
        usages,
        isValidated,
        validationMethods
      });
    }

    return usageInfo;
  }

  /**
   * Infer operation type from context
   */
  private inferOperation(line: string, paramIndex: number): string {
    const beforeParam = line.substring(0, paramIndex);
    const afterParam = line.substring(paramIndex);

    if (beforeParam.includes('=') && !beforeParam.includes('==')) {
      return 'assignment';
    }
    if (afterParam.match(/^\w+\s*\(/)) {
      return 'method_call';
    }
    if (beforeParam.includes('==') || beforeParam.includes('!=')) {
      return 'comparison';
    }
    if (afterParam.startsWith('.')) {
      return 'property_access';
    }
    if (afterParam.startsWith('[')) {
      return 'array_access';
    }

    return 'reference';
  }

  /**
   * Infer type from usage context in JavaScript
   */
  private inferTypeFromUsage(line: string, paramName: string): string | undefined {
    // Look for typeof checks
    const typeofMatch = line.match(new RegExp(`typeof\\s+${paramName}\\s*===\\s*['"]([^'"]+)['"]`));
    if (typeofMatch) {
      return typeofMatch[1];
    }

    // Look for instanceof checks
    const instanceofMatch = line.match(new RegExp(`${paramName}\\s+instanceof\\s+(\\w+)`));
    if (instanceofMatch) {
      return instanceofMatch[1];
    }

    // Infer from method calls
    if (line.includes(`${paramName}.length`)) {
      return 'string|array';
    }
    if (line.includes(`${paramName}.push`) || line.includes(`${paramName}.pop`)) {
      return 'array';
    }
    if (line.includes(`${paramName}.toString`) || line.includes(`${paramName}.charAt`)) {
      return 'string';
    }

    return undefined;
  }

  /**
   * Check if line contains parameter validation
   */
  private isValidationPattern(line: string, paramName: string): boolean {
    const validationPatterns = [
      `if\\s*\\(\\s*!${paramName}`,
      `if\\s*\\(\\s*${paramName}\\s*===?\\s*null`,
      `if\\s*\\(\\s*${paramName}\\s*===?\\s*undefined`,
      `if\\s*\\(\\s*typeof\\s+${paramName}`,
      `${paramName}\\.length`,
      `Array\\.isArray\\(${paramName}\\)`,
      `${paramName}\\s+instanceof`
    ];

    return validationPatterns.some(pattern => 
      new RegExp(pattern, 'i').test(line)
    );
  }

  /**
   * Extract validation method name
   */
  private extractValidationMethod(line: string): string {
    const methodMatch = line.match(/(typeof|instanceof|Array\.isArray)/i);
    return methodMatch ? methodMatch[1] : 'unknown';
  }

  /**
   * Validate type annotations (limited for JavaScript)
   */
  async validateTypeAnnotations(functionSignature: FunctionSignature): Promise<ValidationFinding[]> {
    const findings: ValidationFinding[] = [];

    // In JavaScript, we can only suggest adding JSDoc comments for type information
    for (const param of functionSignature.parameters) {
      findings.push({
        file: functionSignature.filePath,
        function: functionSignature.name,
        line: param.line,
        column: param.column,
        parameter: param.name,
        issue: ValidationIssueType.INVALID_TYPE_ANNOTATION,
        severity: ValidationSeverity.LOW,
        suggestion: `Consider adding JSDoc type annotation for parameter '${param.name}'`,
        confidence: 0.6,
        autoFixable: false
      });
    }

    return findings;
  }

  /**
   * Check for missing parameter validation
   */
  async checkMissingValidation(
    functionSignature: FunctionSignature, 
    sourceCode: string
  ): Promise<ValidationFinding[]> {
    const findings: ValidationFinding[] = [];
    const usageInfo = await this.analyzeParameterUsage(functionSignature, sourceCode);

    for (const usage of usageInfo) {
      const param = functionSignature.parameters.find(p => p.name === usage.parameter);
      if (!param) continue;

      // Check for risky operations without validation
      const riskyOperations = usage.usages.filter(u => 
        ['method_call', 'property_access', 'array_access'].includes(u.operation)
      );

      if (riskyOperations.length > 0 && !usage.isValidated) {
        findings.push({
          file: functionSignature.filePath,
          function: functionSignature.name,
          line: riskyOperations[0].line,
          column: riskyOperations[0].column,
          parameter: param.name,
          issue: ValidationIssueType.MISSING_VALIDATION,
          severity: ValidationSeverity.MEDIUM,
          suggestion: `Add validation for parameter '${param.name}' before ${riskyOperations[0].operation}`,
          confidence: 0.8,
          autoFixable: true
        });
      }
    }

    return findings;
  }
}

