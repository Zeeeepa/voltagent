import type { FunctionInfo } from "./types";

/**
 * Simple AST parser for extracting function information from TypeScript/JavaScript code
 * This is a lightweight implementation that doesn't require external AST libraries
 */
export class CodeParser {
  /**
   * Extract all functions from a source code string
   */
  static extractFunctions(code: string, filePath: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const lines = code.split('\n');
    
    // Patterns for different function types
    const functionPatterns = [
      // Regular function declarations
      /^\s*(?:export\s+)?(?:async\s+)?function\s*\*?\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/,
      // Arrow functions assigned to variables/constants
      /^\s*(?:export\s+)?(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:async\s+)?\(/,
      // Method definitions in classes
      /^\s*(?:public|private|protected|static)?\s*(?:async\s+)?(?:get\s+|set\s+)?([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/,
      // Object method shorthand
      /^\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/,
    ];

    let currentClass: string | undefined;
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Track class context
      const classMatch = trimmedLine.match(/^\s*(?:export\s+)?class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)/);
      if (classMatch) {
        currentClass = classMatch[1];
        i++;
        continue;
      }

      // Reset class context when leaving class
      if (trimmedLine === '}' && currentClass) {
        const braceCount = this.countBraces(lines.slice(0, i + 1).join('\n'));
        if (braceCount === 0) {
          currentClass = undefined;
        }
      }

      // Check for function patterns
      for (const pattern of functionPatterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          const functionName = match[1];
          const functionInfo = this.extractFunctionDetails(
            lines,
            i,
            functionName,
            filePath,
            currentClass
          );
          
          if (functionInfo) {
            functions.push(functionInfo);
            i = functionInfo.lineEnd; // Skip to end of function
            break;
          }
        }
      }

      i++;
    }

    return functions;
  }

  /**
   * Extract detailed information about a specific function
   */
  private static extractFunctionDetails(
    lines: string[],
    startLine: number,
    functionName: string,
    filePath: string,
    className?: string
  ): FunctionInfo | null {
    const functionLine = lines[startLine];
    
    // Extract parameters
    const parameters = this.extractParameters(functionLine, lines, startLine);
    
    // Find function body boundaries
    const bodyBounds = this.findFunctionBody(lines, startLine);
    if (!bodyBounds) {
      return null;
    }

    const { start, end } = bodyBounds;
    const body = lines.slice(start, end + 1).join('\n');

    // Determine function characteristics
    const isAsync = /\basync\b/.test(functionLine);
    const isGenerator = /\*/.test(functionLine);
    const isMethod = className !== undefined || /^\s*(?:public|private|protected|static)/.test(functionLine);

    return {
      name: functionName,
      file: filePath,
      lineStart: startLine + 1, // Convert to 1-based line numbers
      lineEnd: end + 1,
      parameters,
      body,
      isAsync,
      isGenerator,
      isMethod,
      className,
    };
  }

  /**
   * Extract parameter names from function signature
   */
  private static extractParameters(functionLine: string, lines: string[], startLine: number): string[] {
    // Handle multi-line function signatures
    let fullSignature = functionLine;
    let lineIndex = startLine;
    
    // If the line doesn't contain closing parenthesis, look for it in subsequent lines
    while (!fullSignature.includes(')') && lineIndex < lines.length - 1) {
      lineIndex++;
      fullSignature += ' ' + lines[lineIndex].trim();
    }

    // Extract content between parentheses
    const paramMatch = fullSignature.match(/\(([^)]*)\)/);
    if (!paramMatch || !paramMatch[1].trim()) {
      return [];
    }

    const paramString = paramMatch[1];
    
    // Split by comma and clean up
    return paramString
      .split(',')
      .map(param => {
        // Remove type annotations, default values, and destructuring
        return param
          .trim()
          .replace(/:\s*[^=,]+/g, '') // Remove type annotations
          .replace(/\s*=\s*[^,]+/g, '') // Remove default values
          .replace(/[{}[\]]/g, '') // Remove destructuring brackets
          .split(/\s+/)[0] // Take first word (parameter name)
          .replace(/[^a-zA-Z0-9_$]/g, ''); // Clean up
      })
      .filter(param => param.length > 0 && /^[a-zA-Z_$]/.test(param));
  }

  /**
   * Find the start and end lines of a function body
   */
  private static findFunctionBody(lines: string[], startLine: number): { start: number; end: number } | null {
    let braceCount = 0;
    let foundOpenBrace = false;
    let start = startLine;
    
    // Find the opening brace
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      
      for (const char of line) {
        if (char === '{') {
          if (!foundOpenBrace) {
            foundOpenBrace = true;
            start = i;
          }
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          
          if (foundOpenBrace && braceCount === 0) {
            return { start, end: i };
          }
        }
      }
      
      // Handle arrow functions without braces (single expression)
      if (!foundOpenBrace && line.includes('=>')) {
        const arrowIndex = line.indexOf('=>');
        const afterArrow = line.substring(arrowIndex + 2).trim();
        
        if (!afterArrow.startsWith('{')) {
          // Single expression arrow function
          return { start: i, end: i };
        }
      }
    }

    return null;
  }

  /**
   * Count the number of unmatched opening braces
   */
  private static countBraces(code: string): number {
    let count = 0;
    for (const char of code) {
      if (char === '{') count++;
      else if (char === '}') count--;
    }
    return count;
  }

  /**
   * Check if a line is inside a string or comment
   */
  private static isInStringOrComment(code: string, position: number): boolean {
    const beforePosition = code.substring(0, position);
    
    // Check for single-line comments
    const lastNewline = beforePosition.lastIndexOf('\n');
    const currentLine = beforePosition.substring(lastNewline + 1);
    if (currentLine.includes('//')) {
      return true;
    }

    // Check for multi-line comments
    const commentStart = beforePosition.lastIndexOf('/*');
    const commentEnd = beforePosition.lastIndexOf('*/');
    if (commentStart > commentEnd) {
      return true;
    }

    // Check for strings (simplified - doesn't handle escaped quotes)
    const singleQuotes = (beforePosition.match(/'/g) || []).length;
    const doubleQuotes = (beforePosition.match(/"/g) || []).length;
    const backticks = (beforePosition.match(/`/g) || []).length;
    
    return (singleQuotes % 2 === 1) || (doubleQuotes % 2 === 1) || (backticks % 2 === 1);
  }
}

