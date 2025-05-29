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
 * Python-specific parser for parameter validation
 */
export class PythonParser implements LanguageParser {
  readonly language = SupportedLanguage.PYTHON;

  /**
   * Extract function signatures from Python source code
   */
  async extractFunctions(sourceCode: string, filePath: string): Promise<FunctionSignature[]> {
    const functions: FunctionSignature[] = [];
    const lines = sourceCode.split('\n');

    // Python function patterns
    const functionPatterns = [
      // def name(params) -> returnType:
      /^(\s*)(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([^:]+))?\s*:/,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const pattern of functionPatterns) {
        const match = line.match(pattern);
        if (match) {
          const [, indent, functionName, paramString, returnType] = match;
          
          // Skip comments
          if (line.trim().startsWith('#')) {
            continue;
          }

          // Parse parameters
          const parameters = this.parseParameters(paramString, i + 1);
          
          // Find function end (based on indentation)
          const endLine = this.findFunctionEnd(lines, i, indent.length);
          
          // Check if function is "exported" (not starting with _)
          const isExported = !functionName.startsWith('_');
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
          
          break;
        }
      }
    }

    return functions;
  }

  /**
   * Parse Python parameters
   */
  private parseParameters(paramString: string, lineNumber: number): ParameterInfo[] {
    if (!paramString.trim()) {
      return [];
    }

    const parameters: ParameterInfo[] = [];
    const paramParts = this.splitPythonParameters(paramString);

    paramParts.forEach((param, index) => {
      const trimmed = param.trim();
      if (!trimmed || trimmed === 'self' || trimmed === 'cls') return;

      // Python parameter format: name: type = default or name = default
      const paramMatch = trimmed.match(/^(\w+)(?:\s*:\s*([^=]+))?(?:\s*=\s*(.+))?$/) ||
                        trimmed.match(/^(\*\w+)(?:\s*:\s*([^=]+))?$/) ||
                        trimmed.match(/^(\*\*\w+)(?:\s*:\s*([^=]+))?$/);
      
      if (paramMatch) {
        const [, name, type, defaultValue] = paramMatch;
        
        parameters.push({
          name: name.replace(/^\*+/, ''), // Remove * and ** prefixes
          type: type?.trim(),
          isOptional: !!defaultValue || name.startsWith('*'),
          defaultValue: defaultValue?.trim(),
          annotations: this.extractPythonAnnotations(trimmed),
          position: index,
          line: lineNumber,
          column: 0
        });
      }
    });

    return parameters;
  }

  /**
   * Split Python parameters handling complex types and defaults
   */
  private splitPythonParameters(paramString: string): string[] {
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
        // Track nesting depth
        if (char === '[' || char === '{' || char === '(') {
          depth++;
        } else if (char === ']' || char === '}' || char === ')') {
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
   * Extract Python annotations and decorators
   */
  private extractPythonAnnotations(paramString: string): string[] {
    const annotations: string[] = [];
    
    // Look for type hints
    if (paramString.includes(':')) {
      const typeMatch = paramString.match(/:\s*([^=]+)/);
      if (typeMatch) {
        annotations.push(`type:${typeMatch[1].trim()}`);
      }
    }

    return annotations;
  }

  /**
   * Find function end based on Python indentation
   */
  private findFunctionEnd(lines: string[], startLine: number, baseIndent: number): number {
    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i];
      
      // Empty lines don't count
      if (!line.trim()) continue;
      
      // If we find a line with same or less indentation, function ends
      const currentIndent = line.length - line.trimStart().length;
      if (currentIndent <= baseIndent && line.trim()) {
        return i;
      }
    }

    return lines.length;
  }

  /**
   * Analyze parameter usage in Python
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
   * Infer operation in Python
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
   * Infer type from usage in Python
   */
  private inferTypeFromUsage(line: string, paramName: string): string | undefined {
    // Look for isinstance checks
    const isinstanceMatch = line.match(new RegExp(`isinstance\\(${paramName},\\s*(\\w+)`));
    if (isinstanceMatch) {
      return isinstanceMatch[1];
    }

    // Look for type checks
    const typeMatch = line.match(new RegExp(`type\\(${paramName}\\)\\s*==\\s*(\\w+)`));
    if (typeMatch) {
      return typeMatch[1];
    }

    // Infer from method calls
    if (line.includes(`len(${paramName})`)) {
      return 'sequence';
    }
    if (line.includes(`${paramName}.append`) || line.includes(`${paramName}.extend`)) {
      return 'list';
    }
    if (line.includes(`${paramName}.keys`) || line.includes(`${paramName}.values`)) {
      return 'dict';
    }

    return undefined;
  }

  /**
   * Check for validation patterns in Python
   */
  private isValidationPattern(line: string, paramName: string): boolean {
    const validationPatterns = [
      `if\\s+not\\s+${paramName}`,
      `if\\s+${paramName}\\s+is\\s+None`,
      `if\\s+${paramName}\\s+is\\s+not\\s+None`,
      `isinstance\\(${paramName}`,
      `type\\(${paramName}\\)`,
      `len\\(${paramName}\\)`,
      `assert\\s+${paramName}`,
      `raise\\s+.*${paramName}`,
      `${paramName}\\s+or\\s+`,
      `${paramName}\\s+and\\s+`
    ];

    return validationPatterns.some(pattern => 
      new RegExp(pattern, 'i').test(line)
    );
  }

  /**
   * Extract validation method
   */
  private extractValidationMethod(line: string): string {
    if (line.includes('isinstance')) return 'isinstance';
    if (line.includes('type(')) return 'type_check';
    if (line.includes('len(')) return 'length_check';
    if (line.includes('assert')) return 'assert';
    if (line.includes('is None')) return 'none_check';
    if (line.includes('not ')) return 'truthiness_check';
    return 'unknown';
  }

  /**
   * Validate type annotations in Python
   */
  async validateTypeAnnotations(functionSignature: FunctionSignature): Promise<ValidationFinding[]> {
    const findings: ValidationFinding[] = [];

    for (const param of functionSignature.parameters) {
      // Check for missing type hints
      if (!param.type) {
        findings.push({
          file: functionSignature.filePath,
          function: functionSignature.name,
          line: param.line,
          column: param.column,
          parameter: param.name,
          issue: ValidationIssueType.INVALID_TYPE_ANNOTATION,
          severity: ValidationSeverity.LOW,
          suggestion: `Add type hint for parameter '${param.name}'`,
          confidence: 0.7,
          autoFixable: false
        });
      }

      // Check for 'Any' type usage
      if (param.type === 'Any') {
        findings.push({
          file: functionSignature.filePath,
          function: functionSignature.name,
          line: param.line,
          column: param.column,
          parameter: param.name,
          issue: ValidationIssueType.INVALID_TYPE_ANNOTATION,
          severity: ValidationSeverity.MEDIUM,
          suggestion: `Consider using a more specific type instead of 'Any' for parameter '${param.name}'`,
          confidence: 0.8,
          autoFixable: false
        });
      }

      // Check for Optional types without None default
      if (param.type?.includes('Optional') && param.defaultValue !== 'None') {
        findings.push({
          file: functionSignature.filePath,
          function: functionSignature.name,
          line: param.line,
          column: param.column,
          parameter: param.name,
          issue: ValidationIssueType.OPTIONAL_REQUIRED_MISMATCH,
          severity: ValidationSeverity.MEDIUM,
          suggestion: `Optional parameter '${param.name}' should have default value of None`,
          confidence: 0.9,
          autoFixable: true
        });
      }
    }

    return findings;
  }

  /**
   * Check for missing validation in Python
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

      // Check Optional parameters for None validation
      if (param.type?.includes('Optional') && !usage.isValidated) {
        findings.push({
          file: functionSignature.filePath,
          function: functionSignature.name,
          line: usage.usages[0]?.line || param.line,
          column: usage.usages[0]?.column,
          parameter: param.name,
          issue: ValidationIssueType.MISSING_NULL_CHECK,
          severity: ValidationSeverity.HIGH,
          suggestion: `Add None check for Optional parameter '${param.name}'`,
          confidence: 0.9,
          autoFixable: true
        });
      }

      // Check for risky operations without validation
      const riskyOperations = usage.usages.filter(u => 
        ['method_call', 'property_access', 'array_access'].includes(u.operation)
      );

      if (riskyOperations.length > 0 && !usage.isValidated && !param.defaultValue) {
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

      // Check for list/dict operations without length/key checks
      if (param.type?.includes('List') || param.type?.includes('Dict')) {
        const arrayAccess = usage.usages.filter(u => u.operation === 'array_access');
        if (arrayAccess.length > 0 && !usage.isValidated) {
          findings.push({
            file: functionSignature.filePath,
            function: functionSignature.name,
            line: arrayAccess[0].line,
            column: arrayAccess[0].column,
            parameter: param.name,
            issue: ValidationIssueType.MISSING_VALIDATION,
            severity: ValidationSeverity.MEDIUM,
            suggestion: `Add bounds/key check for ${param.type?.includes('List') ? 'list' : 'dict'} parameter '${param.name}'`,
            confidence: 0.8,
            autoFixable: true
          });
        }
      }
    }

    return findings;
  }
}

