/**
 * Documentation Validator
 * Validates documentation requirements and coverage
 */

import { FileInfo, Finding } from '../../types/index.js';

export class DocumentationValidator {
  async validate(file: FileInfo): Promise<Finding[]> {
    const findings: Finding[] = [];
    const language = this.detectLanguage(file.path);

    switch (language) {
      case 'typescript':
      case 'javascript':
        findings.push(...this.validateJSDocumentation(file));
        break;
      case 'python':
        findings.push(...this.validatePythonDocumentation(file));
        break;
      case 'go':
        findings.push(...this.validateGoDocumentation(file));
        break;
      case 'java':
        findings.push(...this.validateJavaDocumentation(file));
        break;
    }

    // Check for README files
    if (file.path.toLowerCase().includes('readme')) {
      findings.push(...this.validateReadmeContent(file));
    }

    return findings;
  }

  private validateJSDocumentation(file: FileInfo): Finding[] {
    const findings: Finding[] = [];
    const content = file.content;
    const lines = content.split('\n');

    // Find exported functions, classes, and interfaces
    const exportedItems = this.findExportedItems(content, 'typescript');

    exportedItems.forEach(item => {
      const hasDocumentation = this.hasJSDocComment(content, item.line);
      
      if (!hasDocumentation) {
        findings.push({
          type: 'missing_documentation',
          file: file.path,
          line: item.line,
          message: `Public ${item.type} '${item.name}' is missing JSDoc documentation`,
          rule: 'public_function_documentation',
          severity: 'medium',
          autoFixable: false,
          suggestion: `Add JSDoc comment above ${item.type} ${item.name}`,
          context: {
            function: item.name
          }
        });
      }
    });

    // Check for file-level documentation
    if (!this.hasFileDocumentation(content)) {
      findings.push({
        type: 'missing_file_documentation',
        file: file.path,
        line: 1,
        message: 'File is missing header documentation',
        rule: 'file_documentation',
        severity: 'low',
        autoFixable: false,
        suggestion: 'Add file-level JSDoc comment at the top of the file'
      });
    }

    return findings;
  }

  private validatePythonDocumentation(file: FileInfo): Finding[] {
    const findings: Finding[] = [];
    const content = file.content;

    // Find public functions and classes
    const publicItems = this.findExportedItems(content, 'python');

    publicItems.forEach(item => {
      const hasDocstring = this.hasPythonDocstring(content, item.line);
      
      if (!hasDocstring) {
        findings.push({
          type: 'missing_docstring',
          file: file.path,
          line: item.line,
          message: `Public ${item.type} '${item.name}' is missing docstring`,
          rule: 'python_docstring_required',
          severity: 'medium',
          autoFixable: false,
          suggestion: `Add docstring to ${item.type} ${item.name}`,
          context: {
            function: item.name
          }
        });
      }
    });

    // Check for module-level docstring
    if (!this.hasModuleDocstring(content)) {
      findings.push({
        type: 'missing_module_docstring',
        file: file.path,
        line: 1,
        message: 'Module is missing docstring',
        rule: 'module_docstring',
        severity: 'low',
        autoFixable: false,
        suggestion: 'Add module-level docstring at the top of the file'
      });
    }

    return findings;
  }

  private validateGoDocumentation(file: FileInfo): Finding[] {
    const findings: Finding[] = [];
    const content = file.content;

    // Find exported functions, types, and variables
    const exportedItems = this.findExportedItems(content, 'go');

    exportedItems.forEach(item => {
      const hasComment = this.hasGoComment(content, item.line);
      
      if (!hasComment) {
        findings.push({
          type: 'missing_go_comment',
          file: file.path,
          line: item.line,
          message: `Exported ${item.type} '${item.name}' is missing comment`,
          rule: 'go_exported_comment',
          severity: 'medium',
          autoFixable: false,
          suggestion: `Add comment starting with "${item.name}" above the ${item.type}`,
          context: {
            function: item.name
          }
        });
      }
    });

    return findings;
  }

  private validateJavaDocumentation(file: FileInfo): Finding[] {
    const findings: Finding[] = [];
    const content = file.content;

    // Find public methods and classes
    const publicItems = this.findExportedItems(content, 'java');

    publicItems.forEach(item => {
      const hasJavadoc = this.hasJavadocComment(content, item.line);
      
      if (!hasJavadoc) {
        findings.push({
          type: 'missing_javadoc',
          file: file.path,
          line: item.line,
          message: `Public ${item.type} '${item.name}' is missing Javadoc`,
          rule: 'javadoc_required',
          severity: 'medium',
          autoFixable: false,
          suggestion: `Add Javadoc comment above ${item.type} ${item.name}`,
          context: {
            function: item.name
          }
        });
      }
    });

    return findings;
  }

  private validateReadmeContent(file: FileInfo): Finding[] {
    const findings: Finding[] = [];
    const content = file.content.toLowerCase();

    const requiredSections = [
      { name: 'installation', pattern: /install/ },
      { name: 'usage', pattern: /usage|getting started|quick start/ },
      { name: 'description', pattern: /description|about|overview/ }
    ];

    requiredSections.forEach(section => {
      if (!section.pattern.test(content)) {
        findings.push({
          type: 'missing_readme_section',
          file: file.path,
          message: `README is missing ${section.name} section`,
          rule: 'readme_completeness',
          severity: 'low',
          autoFixable: false,
          suggestion: `Add ${section.name} section to README`
        });
      }
    });

    return findings;
  }

  private findExportedItems(content: string, language: string): Array<{name: string, type: string, line: number}> {
    const items: Array<{name: string, type: string, line: number}> = [];
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      switch (language) {
        case 'typescript':
        case 'javascript':
          // Export functions, classes, interfaces
          const exportMatch = line.match(/export\s+(function|class|interface|const|let|var)\s+(\w+)/);
          if (exportMatch) {
            items.push({
              name: exportMatch[2],
              type: exportMatch[1],
              line: index + 1
            });
          }
          break;

        case 'python':
          // Public functions and classes (not starting with _)
          const pythonMatch = line.match(/^(def|class)\s+([a-zA-Z][a-zA-Z0-9_]*)/);
          if (pythonMatch && !pythonMatch[2].startsWith('_')) {
            items.push({
              name: pythonMatch[2],
              type: pythonMatch[1],
              line: index + 1
            });
          }
          break;

        case 'go':
          // Exported functions, types, variables (starting with capital letter)
          const goMatch = line.match(/^(func|type|var|const)\s+([A-Z]\w*)/);
          if (goMatch) {
            items.push({
              name: goMatch[2],
              type: goMatch[1],
              line: index + 1
            });
          }
          break;

        case 'java':
          // Public methods and classes
          const javaMatch = line.match(/public\s+(class|interface|enum|\w+\s+\w+)\s+(\w+)/);
          if (javaMatch) {
            items.push({
              name: javaMatch[2],
              type: javaMatch[1],
              line: index + 1
            });
          }
          break;
      }
    });

    return items;
  }

  private hasJSDocComment(content: string, lineNumber: number): boolean {
    const lines = content.split('\n');
    const targetLine = lineNumber - 1;
    
    // Look for JSDoc comment above the target line
    for (let i = targetLine - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line === '') continue;
      if (line.startsWith('/**')) return true;
      if (line.startsWith('*') || line.startsWith('*/')) continue;
      break;
    }
    
    return false;
  }

  private hasPythonDocstring(content: string, lineNumber: number): boolean {
    const lines = content.split('\n');
    const targetLine = lineNumber - 1;
    
    // Look for docstring after function/class definition
    for (let i = targetLine + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line === '') continue;
      if (line.startsWith('"""') || line.startsWith("'''")) return true;
      break;
    }
    
    return false;
  }

  private hasGoComment(content: string, lineNumber: number): boolean {
    const lines = content.split('\n');
    const targetLine = lineNumber - 1;
    
    // Look for comment above the target line
    for (let i = targetLine - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line === '') continue;
      if (line.startsWith('//')) return true;
      break;
    }
    
    return false;
  }

  private hasJavadocComment(content: string, lineNumber: number): boolean {
    const lines = content.split('\n');
    const targetLine = lineNumber - 1;
    
    // Look for Javadoc comment above the target line
    for (let i = targetLine - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line === '') continue;
      if (line.startsWith('/**')) return true;
      if (line.startsWith('*') || line.startsWith('*/')) continue;
      break;
    }
    
    return false;
  }

  private hasFileDocumentation(content: string): boolean {
    const lines = content.split('\n');
    
    // Check first few lines for file documentation
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      if (line.startsWith('/**') || line.startsWith('/*')) return true;
    }
    
    return false;
  }

  private hasModuleDocstring(content: string): boolean {
    const lines = content.split('\n');
    
    // Check first few lines for module docstring
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      if (line.startsWith('"""') || line.startsWith("'''")) return true;
      if (line && !line.startsWith('#') && !line.startsWith('import') && !line.startsWith('from')) break;
    }
    
    return false;
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
}

