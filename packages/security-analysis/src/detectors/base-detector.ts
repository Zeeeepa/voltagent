/**
 * Base security detector implementation
 */

import { ISecurityDetector, CodeContext, VulnerabilityFinding, ScanOptions } from '../types';

export abstract class BaseSecurityDetector implements ISecurityDetector {
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly supportedLanguages: string[];
  abstract readonly owaspCategories: string[];

  abstract detect(context: CodeContext, options?: ScanOptions): Promise<VulnerabilityFinding[]>;

  isApplicable(context: CodeContext): boolean {
    return this.supportedLanguages.includes(context.language) || 
           this.supportedLanguages.includes('*');
  }

  protected getLanguageFromFile(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'java': 'java',
      'cs': 'csharp',
      'php': 'php',
      'go': 'go',
      'rb': 'ruby',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'c',
      'hpp': 'cpp',
      'rs': 'rust',
      'kt': 'kotlin',
      'swift': 'swift',
      'scala': 'scala',
      'sh': 'shell',
      'bash': 'shell',
      'ps1': 'powershell',
      'sql': 'sql',
      'html': 'html',
      'xml': 'xml',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml'
    };

    return languageMap[extension || ''] || 'unknown';
  }

  protected createFinding(
    type: VulnerabilityFinding['type'],
    file: string,
    line: number,
    vulnerability: string,
    suggestion: string,
    riskLevel: VulnerabilityFinding['risk_level'],
    options: {
      function?: string;
      column?: number;
      description?: string;
      cweId?: string;
      owaspCategory?: string;
      confidence?: number;
      evidence?: string;
      remediationEffort?: 'low' | 'medium' | 'high';
    } = {}
  ): VulnerabilityFinding {
    return {
      type,
      file,
      function: options.function,
      line,
      column: options.column,
      vulnerability,
      risk_level: riskLevel,
      suggestion,
      description: options.description || vulnerability,
      cwe_id: options.cweId,
      owasp_category: options.owaspCategory,
      confidence: options.confidence || 75,
      evidence: options.evidence,
      remediation_effort: options.remediationEffort || 'medium'
    };
  }

  protected findLineNumber(content: string, match: RegExpMatchArray): number {
    if (!match.index) return 1;
    
    const beforeMatch = content.substring(0, match.index);
    return beforeMatch.split('\n').length;
  }

  protected findColumnNumber(content: string, match: RegExpMatchArray): number {
    if (!match.index) return 1;
    
    const beforeMatch = content.substring(0, match.index);
    const lastNewline = beforeMatch.lastIndexOf('\n');
    return match.index - lastNewline;
  }

  protected extractFunctionContext(content: string, lineNumber: number): string | undefined {
    const lines = content.split('\n');
    
    // Look backwards from the current line to find function declaration
    for (let i = lineNumber - 1; i >= 0; i--) {
      const line = lines[i];
      const functionMatch = line.match(/(?:function\s+(\w+)|(\w+)\s*[:=]\s*(?:function|\()|class\s+(\w+)|def\s+(\w+)|public\s+\w+\s+(\w+)\s*\()/);
      if (functionMatch) {
        return functionMatch[1] || functionMatch[2] || functionMatch[3] || functionMatch[4] || functionMatch[5];
      }
    }
    
    return undefined;
  }

  protected isInComment(content: string, position: number): boolean {
    const beforePosition = content.substring(0, position);
    
    // Check for single-line comments
    const lastNewline = beforePosition.lastIndexOf('\n');
    const currentLine = content.substring(lastNewline + 1, position);
    if (currentLine.includes('//') || currentLine.includes('#')) {
      return true;
    }
    
    // Check for multi-line comments
    const lastCommentStart = beforePosition.lastIndexOf('/*');
    const lastCommentEnd = beforePosition.lastIndexOf('*/');
    
    return lastCommentStart > lastCommentEnd;
  }

  protected shouldSkipMatch(content: string, match: RegExpMatchArray): boolean {
    if (!match.index) return false;
    
    return this.isInComment(content, match.index);
  }
}

