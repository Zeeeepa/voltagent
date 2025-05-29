import type { PerformanceFinding } from "../types";

/**
 * Static code analysis for performance issues
 */
export class StaticPerformanceAnalyzer {
  
  /**
   * Analyze source code for potential performance issues
   */
  async analyzeSourceCode(filePath: string, sourceCode: string): Promise<PerformanceFinding[]> {
    const findings: PerformanceFinding[] = [];
    const lines = sourceCode.split('\n');
    
    // Analyze each line for performance anti-patterns
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNumber = i + 1;
      
      // Check for nested loops
      const nestedLoopFindings = this.detectNestedLoops(lines, i, filePath);
      findings.push(...nestedLoopFindings);
      
      // Check for inefficient operations
      const inefficientOps = this.detectInefficientOperations(line, lineNumber, filePath);
      findings.push(...inefficientOps);
      
      // Check for memory allocation patterns
      const memoryIssues = this.detectMemoryAllocationIssues(line, lineNumber, filePath);
      findings.push(...memoryIssues);
      
      // Check for synchronous I/O operations
      const syncIoIssues = this.detectSynchronousIo(line, lineNumber, filePath);
      findings.push(...syncIoIssues);
    }
    
    return findings;
  }

  /**
   * Detect nested loops that could cause O(n²) or worse complexity
   */
  private detectNestedLoops(lines: string[], startIndex: number, filePath: string): PerformanceFinding[] {
    const findings: PerformanceFinding[] = [];
    const line = lines[startIndex].trim();
    
    // Simple detection for nested loops (for, while, forEach)
    const loopPatterns = [
      /\bfor\s*\(/,
      /\bwhile\s*\(/,
      /\.forEach\s*\(/,
      /\.map\s*\(/,
      /\.filter\s*\(/,
      /\.reduce\s*\(/
    ];
    
    if (loopPatterns.some(pattern => pattern.test(line))) {
      // Look ahead for nested loops within reasonable scope
      let braceCount = 0;
      let foundNested = false;
      
      for (let i = startIndex; i < Math.min(startIndex + 50, lines.length); i++) {
        const currentLine = lines[i].trim();
        
        // Count braces to track scope
        braceCount += (currentLine.match(/\{/g) || []).length;
        braceCount -= (currentLine.match(/\}/g) || []).length;
        
        if (braceCount > 0 && i > startIndex && loopPatterns.some(pattern => pattern.test(currentLine))) {
          foundNested = true;
          break;
        }
        
        if (braceCount <= 0 && i > startIndex) break;
      }
      
      if (foundNested) {
        findings.push({
          type: "algorithm_complexity",
          file: filePath,
          line_start: startIndex + 1,
          metrics: {
            complexity_score: 8,
          },
          suggestion: "Nested loops detected - consider optimizing algorithm complexity or using more efficient data structures",
          impact_score: 7,
          confidence: 0.8,
        });
      }
    }
    
    return findings;
  }

  /**
   * Detect inefficient operations
   */
  private detectInefficientOperations(line: string, lineNumber: number, filePath: string): PerformanceFinding[] {
    const findings: PerformanceFinding[] = [];
    
    // Check for inefficient string concatenation in loops
    if (line.includes('+=') && line.includes('"')) {
      findings.push({
        type: "algorithm_complexity",
        file: filePath,
        line_start: lineNumber,
        metrics: {
          complexity_score: 6,
        },
        suggestion: "String concatenation in loop detected - consider using array join or StringBuilder pattern",
        impact_score: 5,
        confidence: 0.7,
      });
    }
    
    // Check for inefficient array operations
    const inefficientArrayOps = [
      { pattern: /\.indexOf\s*\(.*\)\s*>\s*-1/, suggestion: "Use .includes() instead of .indexOf() > -1" },
      { pattern: /\.splice\s*\(\s*0\s*,\s*1\s*\)/, suggestion: "Use .shift() instead of .splice(0, 1)" },
      { pattern: /new Array\s*\(/, suggestion: "Use array literal [] instead of new Array()" },
    ];
    
    for (const op of inefficientArrayOps) {
      if (op.pattern.test(line)) {
        findings.push({
          type: "algorithm_complexity",
          file: filePath,
          line_start: lineNumber,
          metrics: {
            complexity_score: 4,
          },
          suggestion: op.suggestion,
          impact_score: 3,
          confidence: 0.9,
        });
      }
    }
    
    return findings;
  }

  /**
   * Detect memory allocation issues
   */
  private detectMemoryAllocationIssues(line: string, lineNumber: number, filePath: string): PerformanceFinding[] {
    const findings: PerformanceFinding[] = [];
    
    // Check for large object creation in loops
    const largeObjectPatterns = [
      /new\s+\w+\s*\(/,
      /\{\s*[\w\s:,'"]+\}/,
      /\[\s*.*\s*\]/
    ];
    
    if (largeObjectPatterns.some(pattern => pattern.test(line))) {
      // This is a simplified check - in real implementation, you'd want to detect if this is inside a loop
      findings.push({
        type: "memory_allocation",
        file: filePath,
        line_start: lineNumber,
        metrics: {
          allocation_rate: "Unknown",
        },
        suggestion: "Consider object pooling or reusing objects to reduce garbage collection pressure",
        impact_score: 4,
        confidence: 0.6,
      });
    }
    
    return findings;
  }

  /**
   * Detect synchronous I/O operations
   */
  private detectSynchronousIo(line: string, lineNumber: number, filePath: string): PerformanceFinding[] {
    const findings: PerformanceFinding[] = [];
    
    const syncIoPatterns = [
      { pattern: /fs\.readFileSync/, suggestion: "Use fs.readFile() or fs.promises.readFile() for async I/O" },
      { pattern: /fs\.writeFileSync/, suggestion: "Use fs.writeFile() or fs.promises.writeFile() for async I/O" },
      { pattern: /\.execSync\s*\(/, suggestion: "Use .exec() or .spawn() for async process execution" },
      { pattern: /XMLHttpRequest/, suggestion: "Use fetch() or axios for async HTTP requests" },
    ];
    
    for (const pattern of syncIoPatterns) {
      if (pattern.pattern.test(line)) {
        findings.push({
          type: "io_bottleneck",
          file: filePath,
          line_start: lineNumber,
          metrics: {
            io_wait_time: "Blocking operation",
          },
          suggestion: pattern.suggestion,
          impact_score: 6,
          confidence: 0.9,
        });
      }
    }
    
    return findings;
  }

  /**
   * Calculate cyclomatic complexity for a function
   */
  calculateCyclomaticComplexity(functionCode: string): number {
    // Simplified cyclomatic complexity calculation
    let complexity = 1; // Base complexity
    
    const complexityPatterns = [
      /\bif\s*\(/g,
      /\belse\s+if\s*\(/g,
      /\bwhile\s*\(/g,
      /\bfor\s*\(/g,
      /\bswitch\s*\(/g,
      /\bcase\s+/g,
      /\bcatch\s*\(/g,
      /\?\s*.*\s*:/g, // Ternary operator
      /&&/g,
      /\|\|/g,
    ];
    
    for (const pattern of complexityPatterns) {
      const matches = functionCode.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
    
    return complexity;
  }

  /**
   * Analyze function complexity and suggest optimizations
   */
  analyzeFunctionComplexity(functionCode: string, functionName: string, filePath: string, startLine: number): PerformanceFinding[] {
    const findings: PerformanceFinding[] = [];
    const complexity = this.calculateCyclomaticComplexity(functionCode);
    
    if (complexity > 10) {
      const severity = complexity > 20 ? 8 : complexity > 15 ? 6 : 4;
      
      findings.push({
        type: "algorithm_complexity",
        file: filePath,
        function: functionName,
        line_start: startLine,
        metrics: {
          complexity_score: complexity,
        },
        suggestion: `High cyclomatic complexity (${complexity}) - consider breaking function into smaller functions`,
        impact_score: severity,
        confidence: 0.9,
      });
    }
    
    return findings;
  }
}

