/**
 * Style Guide Engine
 * Validates code formatting, structure, and style conventions
 */

import { FileInfo, Finding, ComplianceRule, StyleGuide } from '../../types/index.js';

export class StyleGuideEngine {
  private styleGuides: Map<string, StyleGuide> = new Map();

  constructor() {
    this.initializeStyleGuides();
  }

  async validate(file: FileInfo): Promise<Finding[]> {
    const findings: Finding[] = [];
    const language = this.detectLanguage(file.path);
    const styleGuide = this.styleGuides.get(language);

    if (!styleGuide) {
      return findings; // No style guide for this language
    }

    for (const rule of styleGuide.rules) {
      if (rule.category === 'style') {
        const ruleFindings = await this.applyRule(rule, file);
        findings.push(...ruleFindings);
      }
    }

    return findings;
  }

  private async applyRule(rule: ComplianceRule, file: FileInfo): Promise<Finding[]> {
    const findings: Finding[] = [];

    if (rule.validator) {
      return rule.validator(file.content, file);
    }

    if (rule.pattern) {
      const lines = file.content.split('\n');
      lines.forEach((line, index) => {
        if (rule.pattern!.test(line)) {
          findings.push({
            type: rule.id,
            file: file.path,
            line: index + 1,
            message: rule.description,
            rule: rule.id,
            severity: rule.severity,
            autoFixable: rule.autoFixable
          });
        }
      });
    }

    return findings;
  }

  private initializeStyleGuides(): void {
    // TypeScript/JavaScript Style Guide
    this.styleGuides.set('typescript', {
      name: 'TypeScript Style Guide',
      language: 'typescript',
      rules: [
        {
          id: 'ts_semicolon_required',
          name: 'Semicolon Required',
          description: 'Statements must end with semicolons',
          category: 'style',
          severity: 'low',
          autoFixable: true,
          languages: ['typescript', 'javascript'],
          pattern: /^(?!.*[;}])\s*[^\/\*\s].*[^;}]\s*$/
        },
        {
          id: 'ts_indent_spaces',
          name: 'Consistent Indentation',
          description: 'Use 2 spaces for indentation',
          category: 'style',
          severity: 'low',
          autoFixable: true,
          languages: ['typescript', 'javascript'],
          validator: (content: string, file: FileInfo) => {
            const findings: Finding[] = [];
            const lines = content.split('\n');
            
            lines.forEach((line, index) => {
              if (line.match(/^\t/) || line.match(/^ {1}[^ ]/) || line.match(/^ {3}[^ ]/) || line.match(/^ {5,}[^ ]/)) {
                findings.push({
                  type: 'ts_indent_spaces',
                  file: file.path,
                  line: index + 1,
                  message: 'Use 2 spaces for indentation',
                  rule: 'ts_indent_spaces',
                  severity: 'low',
                  autoFixable: true
                });
              }
            });
            
            return findings;
          }
        },
        {
          id: 'ts_trailing_whitespace',
          name: 'No Trailing Whitespace',
          description: 'Lines should not have trailing whitespace',
          category: 'style',
          severity: 'low',
          autoFixable: true,
          languages: ['typescript', 'javascript'],
          pattern: /\s+$/
        },
        {
          id: 'ts_max_line_length',
          name: 'Maximum Line Length',
          description: 'Lines should not exceed 120 characters',
          category: 'style',
          severity: 'medium',
          autoFixable: false,
          languages: ['typescript', 'javascript'],
          validator: (content: string, file: FileInfo) => {
            const findings: Finding[] = [];
            const lines = content.split('\n');
            
            lines.forEach((line, index) => {
              if (line.length > 120) {
                findings.push({
                  type: 'ts_max_line_length',
                  file: file.path,
                  line: index + 1,
                  message: `Line exceeds 120 characters (${line.length})`,
                  rule: 'ts_max_line_length',
                  severity: 'medium',
                  autoFixable: false
                });
              }
            });
            
            return findings;
          }
        }
      ]
    });

    // Python Style Guide (PEP 8)
    this.styleGuides.set('python', {
      name: 'Python PEP 8 Style Guide',
      language: 'python',
      rules: [
        {
          id: 'py_indent_spaces',
          name: 'PEP 8 Indentation',
          description: 'Use 4 spaces for indentation',
          category: 'style',
          severity: 'medium',
          autoFixable: true,
          languages: ['python'],
          validator: (content: string, file: FileInfo) => {
            const findings: Finding[] = [];
            const lines = content.split('\n');
            
            lines.forEach((line, index) => {
              if (line.match(/^\t/) || (line.match(/^ +/) && line.match(/^ +/)![0].length % 4 !== 0)) {
                findings.push({
                  type: 'py_indent_spaces',
                  file: file.path,
                  line: index + 1,
                  message: 'Use 4 spaces for indentation (PEP 8)',
                  rule: 'py_indent_spaces',
                  severity: 'medium',
                  autoFixable: true
                });
              }
            });
            
            return findings;
          }
        },
        {
          id: 'py_max_line_length',
          name: 'PEP 8 Line Length',
          description: 'Lines should not exceed 79 characters',
          category: 'style',
          severity: 'medium',
          autoFixable: false,
          languages: ['python'],
          validator: (content: string, file: FileInfo) => {
            const findings: Finding[] = [];
            const lines = content.split('\n');
            
            lines.forEach((line, index) => {
              if (line.length > 79) {
                findings.push({
                  type: 'py_max_line_length',
                  file: file.path,
                  line: index + 1,
                  message: `Line exceeds 79 characters (${line.length}) - PEP 8`,
                  rule: 'py_max_line_length',
                  severity: 'medium',
                  autoFixable: false
                });
              }
            });
            
            return findings;
          }
        }
      ]
    });

    // Go Style Guide
    this.styleGuides.set('go', {
      name: 'Go Style Guide',
      language: 'go',
      rules: [
        {
          id: 'go_gofmt',
          name: 'Go Format',
          description: 'Code should be formatted with gofmt',
          category: 'style',
          severity: 'high',
          autoFixable: true,
          languages: ['go'],
          validator: (content: string, file: FileInfo) => {
            const findings: Finding[] = [];
            
            // Check for tabs (gofmt uses tabs)
            const lines = content.split('\n');
            lines.forEach((line, index) => {
              if (line.match(/^ +/) && !line.match(/^\t/)) {
                findings.push({
                  type: 'go_gofmt',
                  file: file.path,
                  line: index + 1,
                  message: 'Use tabs for indentation (gofmt standard)',
                  rule: 'go_gofmt',
                  severity: 'high',
                  autoFixable: true
                });
              }
            });
            
            return findings;
          }
        }
      ]
    });
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
      case 'cs':
        return 'csharp';
      case 'cpp':
      case 'cc':
      case 'cxx':
        return 'cpp';
      case 'c':
        return 'c';
      default:
        return 'unknown';
    }
  }
}

