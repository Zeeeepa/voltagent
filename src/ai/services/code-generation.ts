/**
 * Code Generation Service
 * 
 * High-level code generation requests through Codegen SDK
 */

import { CodegenSDKClient, CodeGenerationRequest } from '../../middleware/codegen/sdk-client.js';
import { TaskRouter, TaskRequest, TaskType, TaskPriority } from '../coordination/task-router.js';

export interface CodeGenerationOptions {
  language?: string;
  framework?: string;
  style?: 'functional' | 'object-oriented' | 'procedural';
  testGeneration?: boolean;
  documentation?: boolean;
  errorHandling?: boolean;
  performance?: 'standard' | 'optimized';
}

export interface CodeContext {
  existingCode?: string;
  dependencies?: string[];
  projectStructure?: string;
  conventions?: string;
  constraints?: string[];
}

export interface GenerationResult {
  code: string;
  tests?: string;
  documentation?: string;
  dependencies?: string[];
  warnings?: string[];
  suggestions?: string[];
}

export interface CodeTemplate {
  name: string;
  description: string;
  language: string;
  framework?: string;
  template: string;
  variables: string[];
}

export class CodeGenerationService {
  private client: CodegenSDKClient;
  private taskRouter: TaskRouter;
  private templates: Map<string, CodeTemplate> = new Map();

  constructor(client: CodegenSDKClient, taskRouter: TaskRouter) {
    this.client = client;
    this.taskRouter = taskRouter;
    this.initializeTemplates();
  }

  /**
   * Initialize code templates
   */
  private initializeTemplates(): void {
    const templates: CodeTemplate[] = [
      {
        name: 'react-component',
        description: 'React functional component with TypeScript',
        language: 'typescript',
        framework: 'react',
        template: `
import React from 'react';

interface {{componentName}}Props {
  {{props}}
}

export const {{componentName}}: React.FC<{{componentName}}Props> = ({{propParams}}) => {
  {{componentBody}}
};

export default {{componentName}};
        `,
        variables: ['componentName', 'props', 'propParams', 'componentBody']
      },
      {
        name: 'express-route',
        description: 'Express.js route handler with TypeScript',
        language: 'typescript',
        framework: 'express',
        template: `
import { Request, Response } from 'express';

export const {{routeName}} = async (req: Request, res: Response) => {
  try {
    {{routeBody}}
    
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('{{routeName}} error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
        `,
        variables: ['routeName', 'routeBody']
      },
      {
        name: 'python-class',
        description: 'Python class with type hints',
        language: 'python',
        template: `
from typing import {{imports}}

class {{className}}:
    """{{classDescription}}"""
    
    def __init__(self{{initParams}}):
        {{initBody}}
    
    {{classMethods}}
        `,
        variables: ['imports', 'className', 'classDescription', 'initParams', 'initBody', 'classMethods']
      }
    ];

    for (const template of templates) {
      this.templates.set(template.name, template);
    }
  }

  /**
   * Generate code from natural language description
   */
  async generateCode(
    description: string,
    options: CodeGenerationOptions = {},
    context: CodeContext = {}
  ): Promise<GenerationResult> {
    const request: CodeGenerationRequest = {
      prompt: this.buildPrompt(description, options, context),
      context: JSON.stringify(context),
      options: {
        language: options.language,
        framework: options.framework,
        style: options.style
      }
    };

    const task = await this.client.generateCode(request);
    await task.waitForCompletion();

    if (task.status === 'failed') {
      throw new Error(`Code generation failed: ${task.error}`);
    }

    return this.parseGenerationResult(task.result, options);
  }

  /**
   * Generate code from template
   */
  async generateFromTemplate(
    templateName: string,
    variables: Record<string, string>,
    options: CodeGenerationOptions = {}
  ): Promise<GenerationResult> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    let code = template.template;
    
    // Replace template variables
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      code = code.replace(regex, value);
    }

    // Clean up any remaining template variables
    code = code.replace(/{{.*?}}/g, '// TODO: Implement');

    const result: GenerationResult = {
      code: code.trim(),
      dependencies: this.extractDependencies(code, template.language)
    };

    // Generate tests if requested
    if (options.testGeneration) {
      result.tests = await this.generateTests(code, template.language, template.framework);
    }

    // Generate documentation if requested
    if (options.documentation) {
      result.documentation = await this.generateDocumentation(code, template.language);
    }

    return result;
  }

  /**
   * Enhance existing code
   */
  async enhanceCode(
    existingCode: string,
    enhancement: string,
    options: CodeGenerationOptions = {}
  ): Promise<GenerationResult> {
    const description = `Enhance the following code: ${enhancement}`;
    const context: CodeContext = {
      existingCode,
      conventions: 'Follow existing code style and patterns'
    };

    return this.generateCode(description, options, context);
  }

  /**
   * Refactor code
   */
  async refactorCode(
    existingCode: string,
    refactoringGoal: string,
    options: CodeGenerationOptions = {}
  ): Promise<GenerationResult> {
    const description = `Refactor the following code to ${refactoringGoal}`;
    const context: CodeContext = {
      existingCode,
      constraints: ['Maintain existing functionality', 'Preserve public API']
    };

    return this.generateCode(description, options, context);
  }

  /**
   * Generate unit tests
   */
  async generateTests(
    code: string,
    language: string,
    framework?: string
  ): Promise<string> {
    const description = `Generate comprehensive unit tests for the provided code`;
    const context: CodeContext = {
      existingCode: code,
      conventions: `Use ${language} testing best practices`
    };

    const options: CodeGenerationOptions = {
      language,
      framework,
      testGeneration: true
    };

    const result = await this.generateCode(description, options, context);
    return result.tests || result.code;
  }

  /**
   * Generate documentation
   */
  async generateDocumentation(
    code: string,
    language: string
  ): Promise<string> {
    const description = `Generate comprehensive documentation for the provided code`;
    const context: CodeContext = {
      existingCode: code,
      conventions: `Use ${language} documentation standards`
    };

    const options: CodeGenerationOptions = {
      language,
      documentation: true
    };

    const result = await this.generateCode(description, options, context);
    return result.documentation || result.code;
  }

  /**
   * Build generation prompt
   */
  private buildPrompt(
    description: string,
    options: CodeGenerationOptions,
    context: CodeContext
  ): string {
    let prompt = description;

    // Add language and framework requirements
    if (options.language) {
      prompt += `\n\nLanguage: ${options.language}`;
    }
    if (options.framework) {
      prompt += `\nFramework: ${options.framework}`;
    }
    if (options.style) {
      prompt += `\nStyle: ${options.style}`;
    }

    // Add context information
    if (context.existingCode) {
      prompt += `\n\nExisting code context:\n${context.existingCode}`;
    }
    if (context.dependencies?.length) {
      prompt += `\n\nAvailable dependencies: ${context.dependencies.join(', ')}`;
    }
    if (context.conventions) {
      prompt += `\n\nCode conventions: ${context.conventions}`;
    }
    if (context.constraints?.length) {
      prompt += `\n\nConstraints: ${context.constraints.join(', ')}`;
    }

    // Add generation requirements
    const requirements: string[] = [];
    if (options.testGeneration) {
      requirements.push('Include unit tests');
    }
    if (options.documentation) {
      requirements.push('Include documentation');
    }
    if (options.errorHandling) {
      requirements.push('Include proper error handling');
    }
    if (options.performance === 'optimized') {
      requirements.push('Optimize for performance');
    }

    if (requirements.length > 0) {
      prompt += `\n\nRequirements: ${requirements.join(', ')}`;
    }

    return prompt;
  }

  /**
   * Parse generation result
   */
  private parseGenerationResult(
    result: any,
    options: CodeGenerationOptions
  ): GenerationResult {
    if (typeof result === 'string') {
      return { code: result };
    }

    const parsed: GenerationResult = {
      code: result.code || result.main || result.content || '',
      tests: result.tests,
      documentation: result.documentation || result.docs,
      dependencies: result.dependencies || [],
      warnings: result.warnings || [],
      suggestions: result.suggestions || []
    };

    return parsed;
  }

  /**
   * Extract dependencies from code
   */
  private extractDependencies(code: string, language: string): string[] {
    const dependencies: string[] = [];

    switch (language.toLowerCase()) {
      case 'typescript':
      case 'javascript':
        const importMatches = code.match(/import.*from\s+['"]([^'"]+)['"]/g);
        if (importMatches) {
          for (const match of importMatches) {
            const dep = match.match(/from\s+['"]([^'"]+)['"]/)?.[1];
            if (dep && !dep.startsWith('.')) {
              dependencies.push(dep);
            }
          }
        }
        break;

      case 'python':
        const pythonImports = code.match(/(?:from\s+(\S+)\s+import|import\s+(\S+))/g);
        if (pythonImports) {
          for (const match of pythonImports) {
            const dep = match.replace(/(?:from\s+|import\s+)/, '').split(/\s+/)[0];
            if (dep && !dep.startsWith('.')) {
              dependencies.push(dep);
            }
          }
        }
        break;
    }

    return [...new Set(dependencies)]; // Remove duplicates
  }

  /**
   * Get available templates
   */
  getTemplates(): CodeTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Add custom template
   */
  addTemplate(template: CodeTemplate): void {
    this.templates.set(template.name, template);
  }

  /**
   * Remove template
   */
  removeTemplate(name: string): boolean {
    return this.templates.delete(name);
  }
}

