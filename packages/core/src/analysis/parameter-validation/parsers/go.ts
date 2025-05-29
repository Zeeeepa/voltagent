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
 * Go-specific parser for parameter validation
 */
export class GoParser implements LanguageParser {
  readonly language = SupportedLanguage.GO;

  /**
   * Extract function signatures from Go source code
   */
  async extractFunctions(sourceCode: string, filePath: string): Promise<FunctionSignature[]> {
    const functions: FunctionSignature[] = [];
    const lines = sourceCode.split('\n');

    // Go function patterns
    const functionPatterns = [
      // func name(params) returnType
      /^(\s*)func\s+(\w+)\s*\(([^)]*)\)(?:\s*([^{]+))?\s*\{/,
      // func (receiver) name(params) returnType
      /^(\s*)func\s+\([^)]+\)\s+(\w+)\s*\(([^)]*)\)(?:\s*([^{]+))?\s*\{/
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const pattern of functionPatterns) {
        const match = line.match(pattern);
        if (match) {
          const [, indent, functionName, paramString, returnType] = match;
          
          // Skip comments
          if (line.trim().startsWith('//')) {
            continue;
          }

          // Parse parameters
          const parameters = this.parseParameters(paramString, i + 1);
          
          // Find function end
          const endLine = this.findFunctionEnd(lines, i);
          
          // Check if function is exported (starts with capital letter)
          const isExported = /^[A-Z]/.test(functionName);

          functions.push({
            name: functionName,
            parameters,
            returnType: returnType?.trim(),
            isAsync: false, // Go doesn't have async/await
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
   * Parse Go parameters
   */
  private parseParameters(paramString: string, lineNumber: number): ParameterInfo[] {
    if (!paramString.trim()) {
      return [];
    }

    const parameters: ParameterInfo[] = [];
    const paramParts = this.splitGoParameters(paramString);

    paramParts.forEach((param, index) => {
      const trimmed = param.trim();
      if (!trimmed) return;

      // Go parameter format: name type or name1, name2 type
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        const type = parts[parts.length - 1];
        const names = parts.slice(0, -1);
        
        names.forEach((name, nameIndex) => {
          const cleanName = name.replace(',', '');
          if (cleanName) {
            parameters.push({
              name: cleanName,
              type: type,
              isOptional: false, // Go doesn't have optional parameters
              defaultValue: undefined,
              annotations: [],
              position: index + nameIndex,
              line: lineNumber,
              column: 0
            });
          }
        });
      }
    });

    return parameters;
  }

  /**
   * Split Go parameters handling complex types
   */
  private splitGoParameters(paramString: string): string[] {
    const params: string[] = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < paramString.length; i++) {
      const char = paramString[i];

      if (char === '[' || char === '(' || char === '{') {
        depth++;
      } else if (char === ']' || char === ')' || char === '}') {
        depth--;
      }

      if (char === ',' && depth === 0) {
        params.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    if (current.trim()) {
      params.push(current.trim());
    }

    return params;
  }

  /**
   * Find function end in Go
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

    return startLine + 10;
  }

  /**
   * Analyze parameter usage in Go
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
            inferredType: param.type // Go has explicit types
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
   * Infer operation in Go
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
   * Check for validation patterns in Go
   */
  private isValidationPattern(line: string, paramName: string): boolean {
    const validationPatterns = [
      `if\\s+${paramName}\\s*==\\s*nil`,
      `if\\s+${paramName}\\s*!=\\s*nil`,
      `if\\s+len\\(${paramName}\\)`,
      `if\\s+${paramName}\\s*==\\s*""`,
      `if\\s+${paramName}\\s*==\\s*0`,
      `errors\\.New`,
      `fmt\\.Errorf`
    ];

    return validationPatterns.some(pattern => 
      new RegExp(pattern, 'i').test(line)
    );
  }

  /**
   * Extract validation method
   */
  private extractValidationMethod(line: string): string {
    if (line.includes('nil')) return 'nil_check';
    if (line.includes('len(')) return 'length_check';
    if (line.includes('errors.New')) return 'error_creation';
    return 'unknown';
  }

  /**
   * Validate type annotations in Go
   */
  async validateTypeAnnotations(functionSignature: FunctionSignature): Promise<ValidationFinding[]> {
    const findings: ValidationFinding[] = [];

    // Go has strong typing, so we check for common issues
    for (const param of functionSignature.parameters) {
      // Check for interface{} usage (equivalent to 'any')
      if (param.type === 'interface{}') {
        findings.push({
          file: functionSignature.filePath,
          function: functionSignature.name,
          line: param.line,
          column: param.column,
          parameter: param.name,
          issue: ValidationIssueType.INVALID_TYPE_ANNOTATION,
          severity: ValidationSeverity.MEDIUM,
          suggestion: `Consider using a more specific type instead of 'interface{}' for parameter '${param.name}'`,
          confidence: 0.8,
          autoFixable: false
        });
      }

      // Check for pointer types that might need nil checks
      if (param.type?.startsWith('*')) {
        findings.push({
          file: functionSignature.filePath,
          function: functionSignature.name,
          line: param.line,
          column: param.column,
          parameter: param.name,
          issue: ValidationIssueType.MISSING_NULL_CHECK,
          severity: ValidationSeverity.HIGH,
          suggestion: `Pointer parameter '${param.name}' should be checked for nil`,
          confidence: 0.9,
          autoFixable: true
        });
      }
    }

    return findings;
  }

  /**
   * Check for missing validation in Go
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

      // Check pointer parameters for nil validation
      if (param.type?.startsWith('*') && !usage.isValidated) {
        findings.push({
          file: functionSignature.filePath,
          function: functionSignature.name,
          line: usage.usages[0]?.line || param.line,
          column: usage.usages[0]?.column,
          parameter: param.name,
          issue: ValidationIssueType.MISSING_NULL_CHECK,
          severity: ValidationSeverity.HIGH,
          suggestion: `Add nil check for pointer parameter '${param.name}'`,
          confidence: 0.9,
          autoFixable: true
        });
      }

      // Check slice/map parameters for length validation
      if ((param.type?.includes('[]') || param.type?.includes('map[')) && !usage.isValidated) {
        const riskyOps = usage.usages.filter(u => u.operation === 'array_access');
        if (riskyOps.length > 0) {
          findings.push({
            file: functionSignature.filePath,
            function: functionSignature.name,
            line: riskyOps[0].line,
            column: riskyOps[0].column,
            parameter: param.name,
            issue: ValidationIssueType.MISSING_VALIDATION,
            severity: ValidationSeverity.MEDIUM,
            suggestion: `Add length check for ${param.type?.includes('[]') ? 'slice' : 'map'} parameter '${param.name}'`,
            confidence: 0.8,
            autoFixable: true
          });
        }
      }
    }

    return findings;
  }
}

