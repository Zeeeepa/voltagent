/**
 * Naming Convention Validator
 * Validates naming conventions for variables, functions, classes, etc.
 */

import { FileInfo, Finding } from '../../types/index.js';

interface NamingRule {
  pattern: RegExp;
  description: string;
  severity: 'low' | 'medium' | 'high';
  autoFixable: boolean;
  suggestion?: string;
}

export class NamingConventionValidator {
  private namingRules = new Map<string, Map<string, NamingRule>>();

  constructor() {
    this.initializeNamingRules();
  }

  async validate(file: FileInfo): Promise<Finding[]> {
    const findings: Finding[] = [];
    const language = this.detectLanguage(file.path);
    const rules = this.namingRules.get(language);

    if (!rules) {
      return findings; // No naming rules for this language
    }

    const content = file.content;
    const lines = content.split('\n');

    // Analyze each line for naming violations
    lines.forEach((line, index) => {
      findings.push(...this.validateLineNaming(line, index + 1, file.path, language, rules));
    });

    return findings;
  }

  private validateLineNaming(
    line: string, 
    lineNumber: number, 
    filePath: string, 
    language: string, 
    rules: Map<string, NamingRule>
  ): Finding[] {
    const findings: Finding[] = [];

    switch (language) {
      case 'typescript':
      case 'javascript':
        findings.push(...this.validateJSNaming(line, lineNumber, filePath, rules));
        break;
      case 'python':
        findings.push(...this.validatePythonNaming(line, lineNumber, filePath, rules));
        break;
      case 'go':
        findings.push(...this.validateGoNaming(line, lineNumber, filePath, rules));
        break;
      case 'java':
        findings.push(...this.validateJavaNaming(line, lineNumber, filePath, rules));
        break;
    }

    return findings;
  }

  private validateJSNaming(line: string, lineNumber: number, filePath: string, rules: Map<string, NamingRule>): Finding[] {
    const findings: Finding[] = [];

    // Variable declarations
    const varMatch = line.match(/(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/g);
    if (varMatch) {
      varMatch.forEach(match => {
        const varName = match.split(/\s+/)[1];
        const rule = rules.get('variable');
        if (rule && !rule.pattern.test(varName)) {
          findings.push({
            type: 'naming_convention',
            file: filePath,
            line: lineNumber,
            message: `Variable '${varName}' does not follow camelCase convention`,
            rule: 'js_variable_naming',
            severity: rule.severity,
            autoFixable: rule.autoFixable,
            suggestion: `Use camelCase: ${this.toCamelCase(varName)}`,
            context: {
              variable: varName,
              expected: this.toCamelCase(varName)
            }
          });
        }
      });
    }

    // Function declarations
    const funcMatch = line.match(/function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const rule = rules.get('function');
      if (rule && !rule.pattern.test(funcName)) {
        findings.push({
          type: 'naming_convention',
          file: filePath,
          line: lineNumber,
          message: `Function '${funcName}' does not follow camelCase convention`,
          rule: 'js_function_naming',
          severity: rule.severity,
          autoFixable: rule.autoFixable,
          suggestion: `Use camelCase: ${this.toCamelCase(funcName)}`,
          context: {
            function: funcName,
            expected: this.toCamelCase(funcName)
          }
        });
      }
    }

    // Class declarations
    const classMatch = line.match(/class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    if (classMatch) {
      const className = classMatch[1];
      const rule = rules.get('class');
      if (rule && !rule.pattern.test(className)) {
        findings.push({
          type: 'naming_convention',
          file: filePath,
          line: lineNumber,
          message: `Class '${className}' does not follow PascalCase convention`,
          rule: 'js_class_naming',
          severity: rule.severity,
          autoFixable: rule.autoFixable,
          suggestion: `Use PascalCase: ${this.toPascalCase(className)}`,
          context: {
            variable: className,
            expected: this.toPascalCase(className)
          }
        });
      }
    }

    // Interface declarations (TypeScript)
    const interfaceMatch = line.match(/interface\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    if (interfaceMatch) {
      const interfaceName = interfaceMatch[1];
      const rule = rules.get('interface');
      if (rule && !rule.pattern.test(interfaceName)) {
        findings.push({
          type: 'naming_convention',
          file: filePath,
          line: lineNumber,
          message: `Interface '${interfaceName}' does not follow PascalCase convention`,
          rule: 'ts_interface_naming',
          severity: rule.severity,
          autoFixable: rule.autoFixable,
          suggestion: `Use PascalCase: ${this.toPascalCase(interfaceName)}`,
          context: {
            variable: interfaceName,
            expected: this.toPascalCase(interfaceName)
          }
        });
      }
    }

    return findings;
  }

  private validatePythonNaming(line: string, lineNumber: number, filePath: string, rules: Map<string, NamingRule>): Finding[] {
    const findings: Finding[] = [];

    // Variable assignments
    const varMatch = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*=/);
    if (varMatch) {
      const varName = varMatch[2];
      const rule = rules.get('variable');
      if (rule && !rule.pattern.test(varName)) {
        findings.push({
          type: 'naming_convention',
          file: filePath,
          line: lineNumber,
          message: `Variable '${varName}' does not follow snake_case convention`,
          rule: 'py_variable_naming',
          severity: rule.severity,
          autoFixable: rule.autoFixable,
          suggestion: `Use snake_case: ${this.toSnakeCase(varName)}`,
          context: {
            variable: varName,
            expected: this.toSnakeCase(varName)
          }
        });
      }
    }

    // Function definitions
    const funcMatch = line.match(/def\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const rule = rules.get('function');
      if (rule && !rule.pattern.test(funcName)) {
        findings.push({
          type: 'naming_convention',
          file: filePath,
          line: lineNumber,
          message: `Function '${funcName}' does not follow snake_case convention`,
          rule: 'py_function_naming',
          severity: rule.severity,
          autoFixable: rule.autoFixable,
          suggestion: `Use snake_case: ${this.toSnakeCase(funcName)}`,
          context: {
            function: funcName,
            expected: this.toSnakeCase(funcName)
          }
        });
      }
    }

    // Class definitions
    const classMatch = line.match(/class\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (classMatch) {
      const className = classMatch[1];
      const rule = rules.get('class');
      if (rule && !rule.pattern.test(className)) {
        findings.push({
          type: 'naming_convention',
          file: filePath,
          line: lineNumber,
          message: `Class '${className}' does not follow PascalCase convention`,
          rule: 'py_class_naming',
          severity: rule.severity,
          autoFixable: rule.autoFixable,
          suggestion: `Use PascalCase: ${this.toPascalCase(className)}`,
          context: {
            variable: className,
            expected: this.toPascalCase(className)
          }
        });
      }
    }

    return findings;
  }

  private validateGoNaming(line: string, lineNumber: number, filePath: string, rules: Map<string, NamingRule>): Finding[] {
    const findings: Finding[] = [];

    // Variable declarations
    const varMatch = line.match(/var\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (varMatch) {
      const varName = varMatch[1];
      const rule = rules.get('variable');
      if (rule && !rule.pattern.test(varName)) {
        const isExported = /^[A-Z]/.test(varName);
        const expected = isExported ? this.toPascalCase(varName) : this.toCamelCase(varName);
        findings.push({
          type: 'naming_convention',
          file: filePath,
          line: lineNumber,
          message: `Variable '${varName}' does not follow Go naming convention`,
          rule: 'go_variable_naming',
          severity: rule.severity,
          autoFixable: rule.autoFixable,
          suggestion: `Use ${isExported ? 'PascalCase' : 'camelCase'}: ${expected}`,
          context: {
            variable: varName,
            expected: expected
          }
        });
      }
    }

    // Function declarations
    const funcMatch = line.match(/func\s+([a-zA-Z_][a-zA-Z0-9_]*)/);
    if (funcMatch) {
      const funcName = funcMatch[1];
      const rule = rules.get('function');
      if (rule && !rule.pattern.test(funcName)) {
        const isExported = /^[A-Z]/.test(funcName);
        const expected = isExported ? this.toPascalCase(funcName) : this.toCamelCase(funcName);
        findings.push({
          type: 'naming_convention',
          file: filePath,
          line: lineNumber,
          message: `Function '${funcName}' does not follow Go naming convention`,
          rule: 'go_function_naming',
          severity: rule.severity,
          autoFixable: rule.autoFixable,
          suggestion: `Use ${isExported ? 'PascalCase' : 'camelCase'}: ${expected}`,
          context: {
            function: funcName,
            expected: expected
          }
        });
      }
    }

    return findings;
  }

  private validateJavaNaming(line: string, lineNumber: number, filePath: string, rules: Map<string, NamingRule>): Finding[] {
    const findings: Finding[] = [];

    // Variable declarations
    const varMatch = line.match(/(private|public|protected)?\s*(static)?\s*(final)?\s*\w+\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    if (varMatch) {
      const varName = varMatch[4];
      const isFinal = varMatch[3] === 'final';
      const rule = rules.get(isFinal ? 'constant' : 'variable');
      if (rule && !rule.pattern.test(varName)) {
        const expected = isFinal ? this.toConstantCase(varName) : this.toCamelCase(varName);
        findings.push({
          type: 'naming_convention',
          file: filePath,
          line: lineNumber,
          message: `Variable '${varName}' does not follow Java naming convention`,
          rule: 'java_variable_naming',
          severity: rule.severity,
          autoFixable: rule.autoFixable,
          suggestion: `Use ${isFinal ? 'CONSTANT_CASE' : 'camelCase'}: ${expected}`,
          context: {
            variable: varName,
            expected: expected
          }
        });
      }
    }

    return findings;
  }

  private initializeNamingRules(): void {
    // TypeScript/JavaScript naming rules
    const jsRules = new Map<string, NamingRule>();
    jsRules.set('variable', {
      pattern: /^[a-z][a-zA-Z0-9]*$/,
      description: 'Variables should use camelCase',
      severity: 'low',
      autoFixable: true,
      suggestion: 'Use camelCase for variables'
    });
    jsRules.set('function', {
      pattern: /^[a-z][a-zA-Z0-9]*$/,
      description: 'Functions should use camelCase',
      severity: 'low',
      autoFixable: true,
      suggestion: 'Use camelCase for functions'
    });
    jsRules.set('class', {
      pattern: /^[A-Z][a-zA-Z0-9]*$/,
      description: 'Classes should use PascalCase',
      severity: 'medium',
      autoFixable: true,
      suggestion: 'Use PascalCase for classes'
    });
    jsRules.set('interface', {
      pattern: /^[A-Z][a-zA-Z0-9]*$/,
      description: 'Interfaces should use PascalCase',
      severity: 'medium',
      autoFixable: true,
      suggestion: 'Use PascalCase for interfaces'
    });
    this.namingRules.set('typescript', jsRules);
    this.namingRules.set('javascript', jsRules);

    // Python naming rules
    const pyRules = new Map<string, NamingRule>();
    pyRules.set('variable', {
      pattern: /^[a-z][a-z0-9_]*$/,
      description: 'Variables should use snake_case',
      severity: 'low',
      autoFixable: true,
      suggestion: 'Use snake_case for variables'
    });
    pyRules.set('function', {
      pattern: /^[a-z][a-z0-9_]*$/,
      description: 'Functions should use snake_case',
      severity: 'low',
      autoFixable: true,
      suggestion: 'Use snake_case for functions'
    });
    pyRules.set('class', {
      pattern: /^[A-Z][a-zA-Z0-9]*$/,
      description: 'Classes should use PascalCase',
      severity: 'medium',
      autoFixable: true,
      suggestion: 'Use PascalCase for classes'
    });
    this.namingRules.set('python', pyRules);

    // Go naming rules
    const goRules = new Map<string, NamingRule>();
    goRules.set('variable', {
      pattern: /^[a-zA-Z][a-zA-Z0-9]*$/,
      description: 'Variables should use camelCase or PascalCase (if exported)',
      severity: 'medium',
      autoFixable: true,
      suggestion: 'Use camelCase for private, PascalCase for exported'
    });
    goRules.set('function', {
      pattern: /^[a-zA-Z][a-zA-Z0-9]*$/,
      description: 'Functions should use camelCase or PascalCase (if exported)',
      severity: 'medium',
      autoFixable: true,
      suggestion: 'Use camelCase for private, PascalCase for exported'
    });
    this.namingRules.set('go', goRules);

    // Java naming rules
    const javaRules = new Map<string, NamingRule>();
    javaRules.set('variable', {
      pattern: /^[a-z][a-zA-Z0-9]*$/,
      description: 'Variables should use camelCase',
      severity: 'low',
      autoFixable: true,
      suggestion: 'Use camelCase for variables'
    });
    javaRules.set('constant', {
      pattern: /^[A-Z][A-Z0-9_]*$/,
      description: 'Constants should use CONSTANT_CASE',
      severity: 'medium',
      autoFixable: true,
      suggestion: 'Use CONSTANT_CASE for constants'
    });
    this.namingRules.set('java', javaRules);
  }

  private detectLanguage(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'py':
        return 'python';
      case 'go':
        return 'go';
      case 'java':
        return 'java';
      default:
        return 'unknown';
    }
  }

  private toCamelCase(str: string): string {
    return str.replace(/[-_](.)/g, (_, char) => char.toUpperCase())
              .replace(/^[A-Z]/, char => char.toLowerCase());
  }

  private toPascalCase(str: string): string {
    return str.replace(/[-_](.)/g, (_, char) => char.toUpperCase())
              .replace(/^[a-z]/, char => char.toUpperCase());
  }

  private toSnakeCase(str: string): string {
    return str.replace(/([A-Z])/g, '_$1')
              .toLowerCase()
              .replace(/^_/, '');
  }

  private toConstantCase(str: string): string {
    return this.toSnakeCase(str).toUpperCase();
  }
}

