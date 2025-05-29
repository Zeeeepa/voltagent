import { 
  ValidationConfig, 
  ParameterValidationResult, 
  ValidationFinding, 
  ValidationSeverity, 
  SupportedLanguage,
  LanguageParser,
  FunctionSignature,
  ValidationIssueType
} from "./types";
import { TypeScriptParser } from "./parsers/typescript";
import { JavaScriptParser } from "./parsers/javascript";
import { GoParser } from "./parsers/go";
import { PythonParser } from "./parsers/python";

/**
 * Core parameter validation analysis engine
 */
export class ParameterValidationEngine {
  private parsers: Map<SupportedLanguage, LanguageParser> = new Map();
  private config: ValidationConfig;

  constructor(config: ValidationConfig) {
    this.config = config;
    this.initializeParsers();
  }

  /**
   * Initialize language-specific parsers
   */
  private initializeParsers(): void {
    this.parsers.set(SupportedLanguage.TYPESCRIPT, new TypeScriptParser());
    this.parsers.set(SupportedLanguage.JAVASCRIPT, new JavaScriptParser());
    this.parsers.set(SupportedLanguage.GO, new GoParser());
    this.parsers.set(SupportedLanguage.PYTHON, new PythonParser());
  }

  /**
   * Analyze source code for parameter validation issues
   */
  async analyzeCode(sourceCode: string, filePath: string): Promise<ParameterValidationResult> {
    const startTime = Date.now();
    const language = this.detectLanguage(filePath);
    const parser = this.parsers.get(language);

    if (!parser) {
      throw new Error(`Unsupported language: ${language}`);
    }

    try {
      // Extract function signatures
      const functions = await parser.extractFunctions(sourceCode, filePath);
      
      // Analyze each function for parameter validation issues
      const allFindings: ValidationFinding[] = [];
      
      for (const func of functions) {
        const findings = await this.analyzeFunctionParameters(func, sourceCode, parser);
        allFindings.push(...findings);
      }

      // Filter findings by confidence threshold
      const filteredFindings = allFindings.filter(
        finding => finding.confidence >= this.config.minimumConfidence
      );

      // Calculate metrics and summary
      const summary = this.calculateSummary(filteredFindings);
      const metrics = {
        analysisTimeMs: Date.now() - startTime,
        filesAnalyzed: 1,
        linesOfCode: sourceCode.split('\n').length
      };

      return {
        module: "parameter_validation",
        severity: this.calculateOverallSeverity(filteredFindings),
        language,
        analysisTimestamp: new Date().toISOString(),
        totalFunctions: functions.length,
        totalParameters: functions.reduce((sum, func) => sum + func.parameters.length, 0),
        findings: filteredFindings,
        summary,
        metrics
      };

    } catch (error) {
      throw new Error(`Analysis failed for ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Analyze multiple files
   */
  async analyzeFiles(files: Array<{ content: string; path: string }>): Promise<ParameterValidationResult> {
    const startTime = Date.now();
    const allFindings: ValidationFinding[] = [];
    let totalFunctions = 0;
    let totalParameters = 0;
    let totalLinesOfCode = 0;

    for (const file of files) {
      try {
        const result = await this.analyzeCode(file.content, file.path);
        allFindings.push(...result.findings);
        totalFunctions += result.totalFunctions;
        totalParameters += result.totalParameters;
        totalLinesOfCode += result.metrics.linesOfCode;
      } catch (error) {
        console.warn(`Failed to analyze ${file.path}:`, error);
      }
    }

    // Filter findings by confidence threshold
    const filteredFindings = allFindings.filter(
      finding => finding.confidence >= this.config.minimumConfidence
    );

    const summary = this.calculateSummary(filteredFindings);
    const metrics = {
      analysisTimeMs: Date.now() - startTime,
      filesAnalyzed: files.length,
      linesOfCode: totalLinesOfCode
    };

    return {
      module: "parameter_validation",
      severity: this.calculateOverallSeverity(filteredFindings),
      language: this.config.language,
      analysisTimestamp: new Date().toISOString(),
      totalFunctions,
      totalParameters,
      findings: filteredFindings,
      summary,
      metrics
    };
  }

  /**
   * Analyze parameters for a specific function
   */
  private async analyzeFunctionParameters(
    func: FunctionSignature, 
    sourceCode: string, 
    parser: LanguageParser
  ): Promise<ValidationFinding[]> {
    const findings: ValidationFinding[] = [];

    // Check type annotations
    if (this.config.strictMode) {
      const typeFindings = await parser.validateTypeAnnotations(func);
      findings.push(...typeFindings);
    }

    // Check for missing validation
    if (this.config.checkOptionalParameters) {
      const validationFindings = await parser.checkMissingValidation(func, sourceCode);
      findings.push(...validationFindings);
    }

    // Analyze parameter usage patterns
    const usageInfo = await parser.analyzeParameterUsage(func, sourceCode);
    
    for (const usage of usageInfo) {
      // Check for type mismatches in usage
      const usageFindings = this.analyzeParameterUsagePatterns(func, usage);
      findings.push(...usageFindings);
    }

    // Apply custom rules
    const customFindings = this.applyCustomRules(func, sourceCode);
    findings.push(...customFindings);

    return findings;
  }

  /**
   * Analyze parameter usage patterns for type safety issues
   */
  private analyzeParameterUsagePatterns(
    func: FunctionSignature, 
    usage: any
  ): ValidationFinding[] {
    const findings: ValidationFinding[] = [];
    
    // Find the parameter definition
    const param = func.parameters.find(p => p.name === usage.parameter);
    if (!param) return findings;

    // Check for unsafe operations on potentially undefined parameters
    if (param.isOptional && !usage.isValidated) {
      findings.push({
        file: func.filePath,
        function: func.name,
        line: usage.usages[0]?.line || param.line,
        column: usage.usages[0]?.column,
        parameter: param.name,
        issue: ValidationIssueType.MISSING_NULL_CHECK,
        severity: ValidationSeverity.HIGH,
        suggestion: `Add null/undefined check for optional parameter '${param.name}' before use`,
        confidence: 0.9,
        autoFixable: true,
        context: {
          functionSignature: this.generateFunctionSignature(func),
          surroundingCode: usage.usages[0]?.context
        }
      });
    }

    // Check for type coercion issues
    for (const usageInstance of usage.usages) {
      if (usageInstance.inferredType && param.type && 
          usageInstance.inferredType !== param.type) {
        findings.push({
          file: func.filePath,
          function: func.name,
          line: usageInstance.line,
          column: usageInstance.column,
          parameter: param.name,
          issue: ValidationIssueType.TYPE_MISMATCH,
          severity: ValidationSeverity.MEDIUM,
          expectedType: param.type,
          actualUsage: usageInstance.inferredType,
          suggestion: `Type mismatch: expected '${param.type}' but used as '${usageInstance.inferredType}'`,
          confidence: 0.8,
          autoFixable: false,
          context: {
            functionSignature: this.generateFunctionSignature(func),
            surroundingCode: usageInstance.context
          }
        });
      }
    }

    return findings;
  }

  /**
   * Apply custom validation rules
   */
  private applyCustomRules(func: FunctionSignature, sourceCode: string): ValidationFinding[] {
    const findings: ValidationFinding[] = [];

    for (const rule of this.config.customRules) {
      try {
        const regex = new RegExp(rule.pattern, 'g');
        const lines = sourceCode.split('\n');
        
        for (let i = func.startLine - 1; i < func.endLine; i++) {
          const line = lines[i];
          if (regex.test(line)) {
            findings.push({
              file: func.filePath,
              function: func.name,
              line: i + 1,
              parameter: "custom_rule",
              issue: ValidationIssueType.API_SCHEMA_VIOLATION,
              severity: rule.severity,
              suggestion: rule.message,
              confidence: 0.7,
              autoFixable: false
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to apply custom rule '${rule.name}':`, error);
      }
    }

    return findings;
  }

  /**
   * Detect programming language from file path
   */
  private detectLanguage(filePath: string): SupportedLanguage {
    const extension = filePath.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'ts':
      case 'tsx':
        return SupportedLanguage.TYPESCRIPT;
      case 'js':
      case 'jsx':
        return SupportedLanguage.JAVASCRIPT;
      case 'go':
        return SupportedLanguage.GO;
      case 'py':
        return SupportedLanguage.PYTHON;
      case 'java':
        return SupportedLanguage.JAVA;
      case 'rs':
        return SupportedLanguage.RUST;
      default:
        return this.config.language; // fallback to configured language
    }
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(findings: ValidationFinding[]) {
    const criticalIssues = findings.filter(f => f.severity === ValidationSeverity.CRITICAL).length;
    const highIssues = findings.filter(f => f.severity === ValidationSeverity.HIGH).length;
    const mediumIssues = findings.filter(f => f.severity === ValidationSeverity.MEDIUM).length;
    const lowIssues = findings.filter(f => f.severity === ValidationSeverity.LOW).length;
    const autoFixableCount = findings.filter(f => f.autoFixable).length;

    return {
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      autoFixableCount,
      coveragePercentage: findings.length > 0 ? 
        Math.round((autoFixableCount / findings.length) * 100) : 100
    };
  }

  /**
   * Calculate overall severity based on findings
   */
  private calculateOverallSeverity(findings: ValidationFinding[]): ValidationSeverity {
    if (findings.some(f => f.severity === ValidationSeverity.CRITICAL)) {
      return ValidationSeverity.CRITICAL;
    }
    if (findings.some(f => f.severity === ValidationSeverity.HIGH)) {
      return ValidationSeverity.HIGH;
    }
    if (findings.some(f => f.severity === ValidationSeverity.MEDIUM)) {
      return ValidationSeverity.MEDIUM;
    }
    return ValidationSeverity.LOW;
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

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): ValidationConfig {
    return { ...this.config };
  }
}

