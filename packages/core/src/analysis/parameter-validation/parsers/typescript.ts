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
 * TypeScript-specific parser for parameter validation
 */
export class TypeScriptParser implements LanguageParser {
  readonly language = SupportedLanguage.TYPESCRIPT;

  /**
   * Extract function signatures from TypeScript source code
   */
  async extractFunctions(sourceCode: string, filePath: string): Promise<FunctionSignature[]> {
    const functions: FunctionSignature[] = [];
    const lines = sourceCode.split('\n');

    // Regular expressions for different function patterns
    const functionPatterns = [
      // Regular function declarations: function name(params): returnType
      /^(\s*)(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*\{/,
      // Arrow functions: const name = (params): returnType => 
      /^(\s*)(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(([^)]*)\)(?:\s*:\s*([^=]+?))?\s*=>/,
      // Method definitions: methodName(params): returnType
      /^(\s*)(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*\{/,
      // Class methods: async methodName(params): returnType
      /^(\s*)(?:async\s+)?(\w+)\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*\{/
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const pattern of functionPatterns) {
        const match = line.match(pattern);
        if (match) {
          const [, indent, functionName, paramString, returnType] = match;
          
          // Skip if it's likely not a function (e.g., inside a comment)
          if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
            continue;
          }

          // Parse parameters
          const parameters = this.parseParameters(paramString, i + 1);
          
          // Find function end (simplified - looks for matching braces)
          const endLine = this.findFunctionEnd(lines, i);
          
          // Check if function is exported
          const isExported = line.includes('export');
          const isAsync = line.includes('async');

          functions.push({
            name: functionName,
            parameters,
            returnType: returnType?.trim(),
            isAsync,
            isExported,
            startLine: i + 1,
            endLine,
            filePath
          });
          
          break; // Found a match, no need to check other patterns
        }
      }
    }

    return functions;
  }

  /**
   * Parse parameter string into ParameterInfo objects
   */
  private parseParameters(paramString: string, lineNumber: number): ParameterInfo[] {
    if (!paramString.trim()) {
      return [];
    }

    const parameters: ParameterInfo[] = [];
    const paramParts = this.splitParameters(paramString);

    paramParts.forEach((param, index) => {
      const trimmed = param.trim();
      if (!trimmed) return;

      // Parse parameter: name?: type = defaultValue
      const paramMatch = trimmed.match(/^(\w+)(\?)?(?:\s*:\s*([^=]+))?(?:\s*=\s*(.+))?$/);
      
      if (paramMatch) {
        const [, name, optional, type, defaultValue] = paramMatch;
        
        parameters.push({
          name,
          type: type?.trim(),
          isOptional: !!optional || !!defaultValue,
          defaultValue: defaultValue?.trim(),
          annotations: this.extractAnnotations(trimmed),
          position: index,
          line: lineNumber,
          column: 0 // Would need more sophisticated parsing for exact column
        });
      }
    });

    return parameters;
  }

  /**
   * Split parameter string handling nested generics and complex types
   */
  private splitParameters(paramString: string): string[] {
    const params: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < paramString.length; i++) {
      const char = paramString[i];
      const prevChar = i > 0 ? paramString[i - 1] : '';

      // Handle string literals
      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
          stringChar = '';
        }
      }

      if (!inString) {
        // Track nesting depth for generics and objects
        if (char === '<' || char === '{' || char === '(' || char === '[') {
          depth++;
        } else if (char === '>' || char === '}' || char === ')' || char === ']') {
          depth--;
        }

        // Split on comma only at top level
        if (char === ',' && depth === 0) {
          params.push(current.trim());
          current = '';
          continue;
        }
      }

      current += char;
    }

    if (current.trim()) {
      params.push(current.trim());
    }

    return params;
  }

  /**
   * Extract type annotations and decorators
   */
  private extractAnnotations(paramString: string): string[] {
    const annotations: string[] = [];
    
    // Look for decorators like @Param, @Body, etc.
    const decoratorMatches = paramString.match(/@\w+(?:\([^)]*\))?/g);
    if (decoratorMatches) {
      annotations.push(...decoratorMatches);
    }

    return annotations;
  }

  /**
   * Find the end line of a function (simplified brace matching)
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
        const line = lines[i - 1]; // Convert to 0-based index
        if (!line) continue;

        // Look for parameter usage
        const paramRegex = new RegExp(`\\b${param.name}\\b`, 'g');
        let match;

        while ((match = paramRegex.exec(line)) !== null) {
          const context = line.trim();
          const operation = this.inferOperation(line, match.index);
          const inferredType = this.inferTypeFromUsage(line, param.name);

          usages.push({
            line: i,
            column: match.index,
            context,
            operation,
            inferredType
          });

          // Check for validation patterns
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
   * Infer the operation being performed on a parameter
   */
  private inferOperation(line: string, paramIndex: number): string {
    const beforeParam = line.substring(0, paramIndex);
    const afterParam = line.substring(paramIndex);

    if (beforeParam.includes('=') && !beforeParam.includes('==') && !beforeParam.includes('!=')) {
      return 'assignment';
    }
    if (afterParam.match(/^\w+\s*\(/)) {
      return 'method_call';
    }
    if (beforeParam.includes('==') || beforeParam.includes('!=') || beforeParam.includes('===') || beforeParam.includes('!==')) {
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
   * Infer type from usage context
   */
  private inferTypeFromUsage(line: string, paramName: string): string | undefined {
    // Look for type assertions or explicit type checks
    const typeAssertionMatch = line.match(new RegExp(`${paramName}\\s+as\\s+(\\w+)`));
    if (typeAssertionMatch) {
      return typeAssertionMatch[1];
    }

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
      `${paramName}\\s+instanceof`,
      `validate\\w*\\(.*${paramName}`,
      `check\\w*\\(.*${paramName}`,
      `assert\\w*\\(.*${paramName}`
    ];

    return validationPatterns.some(pattern => 
      new RegExp(pattern, 'i').test(line)
    );
  }

  /**
   * Extract validation method name from line
   */
  private extractValidationMethod(line: string): string {
    const methodMatch = line.match(/(validate\w*|check\w*|assert\w*|typeof|instanceof|Array\.isArray)/i);
    return methodMatch ? methodMatch[1] : 'unknown';
  }

  /**
   * Validate type annotations and hints
   */
  async validateTypeAnnotations(functionSignature: FunctionSignature): Promise<ValidationFinding[]> {
    const findings: ValidationFinding[] = [];

    for (const param of functionSignature.parameters) {
      // Check for missing type annotations
      if (!param.type || param.type === 'any') {
        findings.push({
          file: functionSignature.filePath,
          function: functionSignature.name,
          line: param.line,
          column: param.column,
          parameter: param.name,
          issue: ValidationIssueType.INVALID_TYPE_ANNOTATION,
          severity: ValidationSeverity.MEDIUM,
          suggestion: `Add explicit type annotation for parameter '${param.name}'`,
          confidence: 0.9,
          autoFixable: false,
          context: {
            functionSignature: this.generateFunctionSignature(functionSignature)
          }
        });
      }

      // Check for inconsistent optional/required patterns
      if (param.isOptional && !param.defaultValue && !param.type?.includes('undefined')) {
        findings.push({
          file: functionSignature.filePath,
          function: functionSignature.name,
          line: param.line,
          column: param.column,
          parameter: param.name,
          issue: ValidationIssueType.OPTIONAL_REQUIRED_MISMATCH,
          severity: ValidationSeverity.LOW,
          suggestion: `Optional parameter '${param.name}' should include 'undefined' in type or provide default value`,
          confidence: 0.8,
          autoFixable: true
        });
      }

      // Check for problematic default values
      if (param.defaultValue && param.type) {
        const defaultValueIssue = this.validateDefaultValue(param.defaultValue, param.type);
        if (defaultValueIssue) {
          findings.push({
            file: functionSignature.filePath,
            function: functionSignature.name,
            line: param.line,
            column: param.column,
            parameter: param.name,
            issue: ValidationIssueType.INCORRECT_DEFAULT,
            severity: ValidationSeverity.HIGH,
            expectedType: param.type,
            actualUsage: param.defaultValue,
            suggestion: defaultValueIssue,
            confidence: 0.85,
            autoFixable: false
          });
        }
      }
    }

    return findings;
  }

  /**
   * Validate default value against parameter type
   */
  private validateDefaultValue(defaultValue: string, type: string): string | null {
    const trimmedDefault = defaultValue.trim();
    const trimmedType = type.trim();

    // Check for obvious type mismatches
    if (trimmedType === 'string' && !trimmedDefault.match(/^['"`]/)) {
      return `Default value '${trimmedDefault}' is not a string literal`;
    }
    
    if (trimmedType === 'number' && isNaN(Number(trimmedDefault))) {
      return `Default value '${trimmedDefault}' is not a valid number`;
    }
    
    if (trimmedType === 'boolean' && !['true', 'false'].includes(trimmedDefault)) {
      return `Default value '${trimmedDefault}' is not a boolean`;
    }

    if (trimmedType.includes('[]') && trimmedDefault !== '[]') {
      return `Default value for array type should be '[]'`;
    }

    return null;
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

      // Check if optional parameters are validated before use
      if (param.isOptional && !usage.isValidated && usage.usages.length > 0) {
        findings.push({
          file: functionSignature.filePath,
          function: functionSignature.name,
          line: usage.usages[0].line,
          column: usage.usages[0].column,
          parameter: param.name,
          issue: ValidationIssueType.MISSING_VALIDATION,
          severity: ValidationSeverity.HIGH,
          suggestion: `Add validation for optional parameter '${param.name}' before use`,
          confidence: 0.9,
          autoFixable: true,
          context: {
            functionSignature: this.generateFunctionSignature(functionSignature),
            surroundingCode: usage.usages[0].context
          }
        });
      }

      // Check for parameters that should be validated based on usage patterns
      const riskyOperations = usage.usages.filter(u => 
        ['method_call', 'property_access', 'array_access'].includes(u.operation)
      );

      if (riskyOperations.length > 0 && !usage.isValidated && !param.type?.includes('!')) {
        findings.push({
          file: functionSignature.filePath,
          function: functionSignature.name,
          line: riskyOperations[0].line,
          column: riskyOperations[0].column,
          parameter: param.name,
          issue: ValidationIssueType.MISSING_NULL_CHECK,
          severity: ValidationSeverity.MEDIUM,
          suggestion: `Add null/undefined check for parameter '${param.name}' before ${riskyOperations[0].operation}`,
          confidence: 0.8,
          autoFixable: true
        });
      }
    }

    return findings;
  }

  /**
   * Generate human-readable function signature
   */
  private generateFunctionSignature(func: FunctionSignature): string {
    const params = func.parameters.map(p => 
      `${p.name}${p.isOptional ? '?' : ''}: ${p.type || 'any'}`
    ).join(', ');
    
    return `${func.name}(${params})${func.returnType ? `: ${func.returnType}` : ''}`;
  }
}

