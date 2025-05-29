import type { ComplexityMetrics, FunctionInfo, ASTNode } from "./types";

/**
 * Core complexity calculator that implements various complexity metrics
 */
export class ComplexityCalculator {
  /**
   * Calculate cyclomatic complexity
   * Formula: Number of decision points + 1
   */
  static calculateCyclomaticComplexity(functionBody: string): number {
    // Decision points in JavaScript/TypeScript
    const decisionPatterns = [
      /\bif\s*\(/g,           // if statements
      /\belse\s+if\s*\(/g,    // else if statements
      /\bwhile\s*\(/g,        // while loops
      /\bfor\s*\(/g,          // for loops
      /\bdo\s*\{/g,           // do-while loops
      /\bswitch\s*\(/g,       // switch statements
      /\bcase\s+/g,           // case statements
      /\bcatch\s*\(/g,        // catch blocks
      /\?\s*[^:]*:/g,         // ternary operators
      /&&/g,                  // logical AND
      /\|\|/g,                // logical OR
      /\bthrow\s+/g,          // throw statements
      /\breturn\s+.*\?/g,     // return with ternary
    ];

    let complexity = 1; // Base complexity

    for (const pattern of decisionPatterns) {
      const matches = functionBody.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }

    return complexity;
  }

  /**
   * Calculate cognitive complexity
   * More sophisticated than cyclomatic - considers nesting and control flow
   */
  static calculateCognitiveComplexity(functionBody: string): number {
    let complexity = 0;
    let nestingLevel = 0;
    
    // Split into lines for analysis
    const lines = functionBody.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Track nesting level
      const openBraces = (line.match(/\{/g) || []).length;
      const closeBraces = (line.match(/\}/g) || []).length;
      
      // Increment complexity for control structures
      if (this.isControlStructure(trimmedLine)) {
        complexity += 1 + nestingLevel; // Add nesting penalty
      }
      
      // Update nesting level
      nestingLevel += openBraces - closeBraces;
      nestingLevel = Math.max(0, nestingLevel); // Prevent negative nesting
    }

    return complexity;
  }

  /**
   * Calculate Halstead metrics
   */
  static calculateHalsteadMetrics(functionBody: string): {
    volume: number;
    difficulty: number;
    effort: number;
  } {
    const operators = this.extractOperators(functionBody);
    const operands = this.extractOperands(functionBody);
    
    const n1 = new Set(operators).size; // Unique operators
    const n2 = new Set(operands).size;  // Unique operands
    const N1 = operators.length;        // Total operators
    const N2 = operands.length;         // Total operands
    
    const vocabulary = n1 + n2;
    const length = N1 + N2;
    
    const volume = length * Math.log2(vocabulary || 1);
    const difficulty = (n1 / 2) * (N2 / (n2 || 1));
    const effort = difficulty * volume;
    
    return { volume, difficulty, effort };
  }

  /**
   * Calculate maintainability index
   * Formula: 171 - 5.2 * ln(Halstead Volume) - 0.23 * (Cyclomatic Complexity) - 16.2 * ln(Lines of Code)
   */
  static calculateMaintainabilityIndex(
    halsteadVolume: number,
    cyclomaticComplexity: number,
    linesOfCode: number
  ): number {
    const logVolume = Math.log(halsteadVolume || 1);
    const logLoc = Math.log(linesOfCode || 1);
    
    let mi = 171 - 5.2 * logVolume - 0.23 * cyclomaticComplexity - 16.2 * logLoc;
    
    // Normalize to 0-100 scale
    mi = Math.max(0, Math.min(100, mi));
    
    return Math.round(mi * 100) / 100;
  }

  /**
   * Calculate maximum nesting depth
   */
  static calculateNestingDepth(functionBody: string): number {
    let maxDepth = 0;
    let currentDepth = 0;
    
    for (const char of functionBody) {
      if (char === '{') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}') {
        currentDepth = Math.max(0, currentDepth - 1);
      }
    }
    
    return maxDepth;
  }

  /**
   * Calculate all complexity metrics for a function
   */
  static calculateAllMetrics(functionInfo: FunctionInfo): ComplexityMetrics {
    const { body, parameters } = functionInfo;
    const linesOfCode = body.split('\n').filter(line => line.trim().length > 0).length;
    
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(body);
    const cognitiveComplexity = this.calculateCognitiveComplexity(body);
    const halsteadMetrics = this.calculateHalsteadMetrics(body);
    const nestingDepth = this.calculateNestingDepth(body);
    const maintainabilityIndex = this.calculateMaintainabilityIndex(
      halsteadMetrics.volume,
      cyclomaticComplexity,
      linesOfCode
    );

    return {
      cyclomatic_complexity: cyclomaticComplexity,
      cognitive_complexity: cognitiveComplexity,
      maintainability_index: maintainabilityIndex,
      lines_of_code: linesOfCode,
      halstead_volume: halsteadMetrics.volume,
      halstead_difficulty: halsteadMetrics.difficulty,
      halstead_effort: halsteadMetrics.effort,
      nesting_depth: nestingDepth,
      parameter_count: parameters.length,
    };
  }

  /**
   * Check if a line contains a control structure
   */
  private static isControlStructure(line: string): boolean {
    const controlPatterns = [
      /^\s*if\s*\(/,
      /^\s*else\s*if\s*\(/,
      /^\s*else\s*\{/,
      /^\s*while\s*\(/,
      /^\s*for\s*\(/,
      /^\s*do\s*\{/,
      /^\s*switch\s*\(/,
      /^\s*case\s+/,
      /^\s*catch\s*\(/,
      /^\s*try\s*\{/,
      /^\s*finally\s*\{/,
    ];

    return controlPatterns.some(pattern => pattern.test(line));
  }

  /**
   * Extract operators from function body
   */
  private static extractOperators(code: string): string[] {
    const operatorPatterns = [
      /\+\+|--|==|!=|<=|>=|&&|\|\||<<|>>|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|<<=|>>=|\?\?/g,
      /[+\-*/%=<>&|^~!?:]/g,
    ];

    const operators: string[] = [];
    for (const pattern of operatorPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        operators.push(...matches);
      }
    }

    return operators;
  }

  /**
   * Extract operands from function body
   */
  private static extractOperands(code: string): string[] {
    // Remove strings and comments to avoid false positives
    const cleanCode = code
      .replace(/"[^"]*"/g, '""')
      .replace(/'[^']*'/g, "''")
      .replace(/`[^`]*`/g, '``')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');

    // Extract identifiers, numbers, and literals
    const operandPattern = /\b[a-zA-Z_$][a-zA-Z0-9_$]*\b|\b\d+\.?\d*\b/g;
    const matches = cleanCode.match(operandPattern);
    
    return matches || [];
  }
}

