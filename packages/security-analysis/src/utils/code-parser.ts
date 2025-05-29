/**
 * Code parsing utilities for security analysis
 */

import { CodeContext, FunctionInfo } from '../types';
import * as fs from 'fs';
import * as path from 'path';

export class CodeParser {
  /**
   * Parse a file and create a CodeContext
   */
  static async parseFile(filePath: string): Promise<CodeContext> {
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const language = this.getLanguageFromExtension(filePath);
    const lines = content.split('\n');
    const functions = this.extractFunctions(content, language);
    const imports = this.extractImports(content, language);
    const exports = this.extractExports(content, language);

    return {
      file: filePath,
      content,
      language,
      lines,
      functions,
      imports,
      exports
    };
  }

  /**
   * Create CodeContext from content string
   */
  static parseContent(content: string, filePath: string): CodeContext {
    const language = this.getLanguageFromExtension(filePath);
    const lines = content.split('\n');
    const functions = this.extractFunctions(content, language);
    const imports = this.extractImports(content, language);
    const exports = this.extractExports(content, language);

    return {
      file: filePath,
      content,
      language,
      lines,
      functions,
      imports,
      exports
    };
  }

  /**
   * Get programming language from file extension
   */
  private static getLanguageFromExtension(filePath: string): string {
    const extension = path.extname(filePath).toLowerCase();
    
    const languageMap: Record<string, string> = {
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.py': 'python',
      '.java': 'java',
      '.cs': 'csharp',
      '.php': 'php',
      '.go': 'go',
      '.rb': 'ruby',
      '.cpp': 'cpp',
      '.c': 'c',
      '.h': 'c',
      '.hpp': 'cpp',
      '.rs': 'rust',
      '.kt': 'kotlin',
      '.swift': 'swift',
      '.scala': 'scala',
      '.sh': 'shell',
      '.bash': 'shell',
      '.ps1': 'powershell',
      '.sql': 'sql',
      '.html': 'html',
      '.xml': 'xml',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml'
    };

    return languageMap[extension] || 'unknown';
  }

  /**
   * Extract function information from code
   */
  private static extractFunctions(content: string, language: string): FunctionInfo[] {
    const functions: FunctionInfo[] = [];
    const lines = content.split('\n');

    const patterns = this.getFunctionPatterns(language);
    
    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(content)) !== null) {
        const functionName = match[pattern.nameGroup] || 'anonymous';
        const startLine = this.getLineNumber(content, match.index);
        const endLine = this.findFunctionEndLine(lines, startLine, language);
        const parameters = this.extractParameters(match[0], language);
        const isAsync = /async\s+/.test(match[0]);
        const isExported = /export\s+/.test(match[0]) || /module\.exports/.test(match[0]);

        functions.push({
          name: functionName,
          startLine,
          endLine,
          parameters,
          isAsync,
          isExported
        });

        // Prevent infinite loops
        if (match.index === pattern.regex.lastIndex) {
          pattern.regex.lastIndex++;
        }
      }
    }

    return functions;
  }

  /**
   * Get function detection patterns for different languages
   */
  private static getFunctionPatterns(language: string): Array<{regex: RegExp, nameGroup: number}> {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return [
          { regex: /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(/g, nameGroup: 1 },
          { regex: /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\()/g, nameGroup: 1 },
          { regex: /(\w+)\s*:\s*(?:async\s+)?function/g, nameGroup: 1 },
          { regex: /(?:async\s+)?(\w+)\s*\([^)]*\)\s*=>/g, nameGroup: 1 }
        ];
      case 'python':
        return [
          { regex: /def\s+(\w+)\s*\(/g, nameGroup: 1 },
          { regex: /async\s+def\s+(\w+)\s*\(/g, nameGroup: 1 }
        ];
      case 'java':
      case 'csharp':
        return [
          { regex: /(?:public|private|protected|static|\s)+\w+\s+(\w+)\s*\(/g, nameGroup: 1 }
        ];
      case 'php':
        return [
          { regex: /function\s+(\w+)\s*\(/g, nameGroup: 1 }
        ];
      case 'go':
        return [
          { regex: /func\s+(\w+)\s*\(/g, nameGroup: 1 }
        ];
      default:
        return [];
    }
  }

  /**
   * Extract function parameters
   */
  private static extractParameters(functionDeclaration: string, language: string): string[] {
    const paramMatch = functionDeclaration.match(/\(([^)]*)\)/);
    if (!paramMatch || !paramMatch[1]) return [];

    const paramString = paramMatch[1].trim();
    if (!paramString) return [];

    // Split by comma, but be careful of nested structures
    const params = paramString.split(',').map(p => p.trim());
    
    return params.filter(p => p.length > 0).map(p => {
      // Extract just the parameter name (remove types, defaults, etc.)
      const nameMatch = p.match(/(\w+)/);
      return nameMatch ? nameMatch[1] : p;
    });
  }

  /**
   * Find the end line of a function
   */
  private static findFunctionEndLine(lines: string[], startLine: number, language: string): number {
    let braceCount = 0;
    let inFunction = false;

    for (let i = startLine - 1; i < lines.length; i++) {
      const line = lines[i];
      
      for (const char of line) {
        if (char === '{') {
          braceCount++;
          inFunction = true;
        } else if (char === '}') {
          braceCount--;
          if (inFunction && braceCount === 0) {
            return i + 1;
          }
        }
      }
    }

    return startLine + 10; // Default fallback
  }

  /**
   * Extract import statements
   */
  private static extractImports(content: string, language: string): string[] {
    const imports: string[] = [];
    const patterns = this.getImportPatterns(language);

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        imports.push(match[0]);
      }
    }

    return imports;
  }

  /**
   * Extract export statements
   */
  private static extractExports(content: string, language: string): string[] {
    const exports: string[] = [];
    const patterns = this.getExportPatterns(language);

    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(content)) !== null) {
        exports.push(match[0]);
      }
    }

    return exports;
  }

  /**
   * Get import patterns for different languages
   */
  private static getImportPatterns(language: string): RegExp[] {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return [
          /import\s+.*?from\s+['"][^'"]+['"]/g,
          /import\s+['"][^'"]+['"]/g,
          /require\s*\(\s*['"][^'"]+['"]\s*\)/g
        ];
      case 'python':
        return [
          /import\s+\w+/g,
          /from\s+\w+\s+import\s+.*/g
        ];
      case 'java':
        return [
          /import\s+[\w.]+;/g
        ];
      case 'csharp':
        return [
          /using\s+[\w.]+;/g
        ];
      case 'go':
        return [
          /import\s+\(\s*[\s\S]*?\)/g,
          /import\s+"[^"]+"/g
        ];
      default:
        return [];
    }
  }

  /**
   * Get export patterns for different languages
   */
  private static getExportPatterns(language: string): RegExp[] {
    switch (language) {
      case 'javascript':
      case 'typescript':
        return [
          /export\s+(?:default\s+)?(?:const|let|var|function|class)\s+\w+/g,
          /export\s+\{[^}]+\}/g,
          /module\.exports\s*=\s*.*/g
        ];
      case 'python':
        return [
          /__all__\s*=\s*\[.*?\]/g
        ];
      default:
        return [];
    }
  }

  /**
   * Get line number from character position
   */
  private static getLineNumber(content: string, position: number): number {
    const beforePosition = content.substring(0, position);
    return beforePosition.split('\n').length;
  }
}

