import { Agent } from '@voltagent/core';
import { AnthropicProvider } from '@voltagent/anthropic-ai';
import { 
  CodeGenerationRequest, 
  CodeGenerationResult, 
  GeneratedFile, 
  GenerationMetadata, 
  ArtifactType,
  Task,
  TaskContext,
  NaturalLanguageRequirement 
} from '../types';

export interface CodegenConfig {
  anthropicApiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  enableCodeReview: boolean;
  enableTestGeneration: boolean;
  enableDocumentationGeneration: boolean;
  codeStyle: CodeStyle;
}

export interface CodeStyle {
  language: string;
  framework: string;
  indentation: 'tabs' | 'spaces';
  indentSize: number;
  lineLength: number;
  namingConvention: 'camelCase' | 'snake_case' | 'PascalCase' | 'kebab-case';
  includeComments: boolean;
  includeTypeAnnotations: boolean;
}

export interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  framework: string;
  template: string;
  variables: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  required: boolean;
  defaultValue?: any;
}

export class CodegenIntegration {
  private agent: Agent;
  private config: CodegenConfig;
  private templates: Map<string, CodeTemplate>;

  constructor(config: CodegenConfig) {
    this.config = config;
    this.templates = new Map();
    
    // Initialize VoltAgent with Anthropic provider
    this.agent = new Agent({
      llm: new AnthropicProvider({
        apiKey: config.anthropicApiKey
      }),
      model: config.model,
      maxTokens: config.maxTokens,
      temperature: config.temperature
    });

    this.initializeTemplates();
  }

  /**
   * Generate code based on a task and context
   */
  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResult> {
    const startTime = Date.now();
    
    try {
      // Prepare the generation context
      const generationContext = await this.prepareGenerationContext(request);
      
      // Generate main code files
      const files = await this.generateMainFiles(generationContext);
      
      // Generate tests if enabled
      const tests = this.config.enableTestGeneration 
        ? await this.generateTests(generationContext, files)
        : [];
      
      // Generate documentation if enabled
      const documentation = this.config.enableDocumentationGeneration
        ? await this.generateDocumentation(generationContext, files)
        : [];

      // Calculate metadata
      const metadata = this.calculateGenerationMetadata(startTime, files, tests, documentation);

      return {
        taskId: request.taskId,
        files,
        tests,
        documentation,
        metadata
      };
    } catch (error) {
      throw new Error(`Code generation failed: ${error.message}`);
    }
  }

  /**
   * Generate code from natural language requirements
   */
  async generateFromRequirements(requirements: NaturalLanguageRequirement, context: TaskContext): Promise<CodeGenerationResult> {
    const request: CodeGenerationRequest = {
      taskId: `gen_${Date.now()}`,
      context,
      parameters: {
        requirements: requirements.text,
        intent: requirements.intent,
        entities: requirements.entities,
        complexity: requirements.complexity
      }
    };

    return this.generateCode(request);
  }

  /**
   * Refine generated code based on feedback
   */
  async refineCode(
    originalResult: CodeGenerationResult, 
    feedback: string, 
    context: TaskContext
  ): Promise<CodeGenerationResult> {
    const refinementPrompt = this.buildRefinementPrompt(originalResult, feedback, context);
    
    const response = await this.agent.run({
      messages: [{ role: 'user', content: refinementPrompt }]
    });

    return this.parseCodeGenerationResponse(response.content, originalResult.taskId);
  }

  /**
   * Add a custom code template
   */
  addTemplate(template: CodeTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get available templates for a language/framework
   */
  getTemplates(language?: string, framework?: string): CodeTemplate[] {
    const templates = Array.from(this.templates.values());
    
    return templates.filter(template => {
      if (language && template.language !== language) return false;
      if (framework && template.framework !== framework) return false;
      return true;
    });
  }

  private async prepareGenerationContext(request: CodeGenerationRequest): Promise<any> {
    const { context, parameters } = request;
    
    return {
      task: request.taskId,
      codebase: context.codebase,
      requirements: context.requirements,
      constraints: context.constraints,
      preferences: context.preferences,
      parameters,
      codeStyle: this.config.codeStyle,
      templates: this.getRelevantTemplates(context)
    };
  }

  private async generateMainFiles(context: any): Promise<GeneratedFile[]> {
    const prompt = this.buildCodeGenerationPrompt(context);
    
    const response = await this.agent.run({
      messages: [{ role: 'user', content: prompt }]
    });

    return this.parseGeneratedFiles(response.content);
  }

  private async generateTests(context: any, mainFiles: GeneratedFile[]): Promise<GeneratedFile[]> {
    const testPrompt = this.buildTestGenerationPrompt(context, mainFiles);
    
    const response = await this.agent.run({
      messages: [{ role: 'user', content: testPrompt }]
    });

    return this.parseGeneratedFiles(response.content, ArtifactType.TEST_FILE);
  }

  private async generateDocumentation(context: any, files: GeneratedFile[]): Promise<GeneratedFile[]> {
    const docPrompt = this.buildDocumentationPrompt(context, files);
    
    const response = await this.agent.run({
      messages: [{ role: 'user', content: docPrompt }]
    });

    return this.parseGeneratedFiles(response.content, ArtifactType.DOCUMENTATION);
  }

  private buildCodeGenerationPrompt(context: any): string {
    return `
You are an expert software engineer. Generate high-quality code based on the following requirements:

## Requirements
${context.requirements.text}

## Intent
${context.requirements.intent}

## Codebase Context
- Language: ${context.codebase.language}
- Framework: ${context.codebase.framework}
- Repository: ${context.codebase.repositoryUrl}
- Branch: ${context.codebase.branch}

## Code Style Guidelines
- Language: ${context.codeStyle.language}
- Framework: ${context.codeStyle.framework}
- Indentation: ${context.codeStyle.indentation} (${context.codeStyle.indentSize})
- Line Length: ${context.codeStyle.lineLength}
- Naming Convention: ${context.codeStyle.namingConvention}
- Include Comments: ${context.codeStyle.includeComments}
- Include Type Annotations: ${context.codeStyle.includeTypeAnnotations}

## Constraints
${context.constraints.map((c: any) => `- ${c.description}`).join('\n')}

## User Preferences
- Testing Framework: ${context.preferences.testingFramework}
- Documentation Level: ${context.preferences.documentationLevel}

## Instructions
1. Generate clean, maintainable, and well-structured code
2. Follow the specified code style guidelines
3. Include appropriate error handling
4. Add meaningful comments where necessary
5. Ensure code is production-ready
6. Consider performance and security best practices

Please provide the generated code in the following format:

\`\`\`[language]:[filepath]
[code content]
\`\`\`

Generate all necessary files for the implementation.
    `;
  }

  private buildTestGenerationPrompt(context: any, mainFiles: GeneratedFile[]): string {
    const fileDescriptions = mainFiles.map(f => `- ${f.path}: ${f.type}`).join('\n');
    
    return `
Generate comprehensive tests for the following generated code files:

## Files to Test
${fileDescriptions}

## Testing Framework
${context.preferences.testingFramework}

## Test Requirements
1. Unit tests for all public functions/methods
2. Integration tests where appropriate
3. Edge case testing
4. Error handling tests
5. Mock external dependencies
6. Achieve high test coverage

## Code Style
Follow the same style guidelines as the main code:
- Language: ${context.codeStyle.language}
- Framework: ${context.codeStyle.framework}
- Naming Convention: ${context.codeStyle.namingConvention}

Please provide test files in the following format:

\`\`\`[language]:[filepath]
[test code content]
\`\`\`

Generate comprehensive test suites for all generated files.
    `;
  }

  private buildDocumentationPrompt(context: any, files: GeneratedFile[]): string {
    const fileDescriptions = files.map(f => `- ${f.path}: ${f.type}`).join('\n');
    
    return `
Generate comprehensive documentation for the following code files:

## Files to Document
${fileDescriptions}

## Documentation Level
${context.preferences.documentationLevel}

## Requirements
1. API documentation for public interfaces
2. Usage examples
3. Installation/setup instructions
4. Configuration options
5. Troubleshooting guide
6. Architecture overview

Please provide documentation in Markdown format:

\`\`\`markdown:[filepath]
[documentation content]
\`\`\`

Generate appropriate documentation files (README.md, API.md, etc.).
    `;
  }

  private buildRefinementPrompt(
    originalResult: CodeGenerationResult, 
    feedback: string, 
    context: TaskContext
  ): string {
    const fileList = originalResult.files.map(f => `- ${f.path}`).join('\n');
    
    return `
Please refine the following generated code based on the provided feedback:

## Original Files
${fileList}

## Feedback
${feedback}

## Requirements
- Maintain the overall structure and functionality
- Address all points mentioned in the feedback
- Ensure code quality and best practices
- Keep the same file structure unless explicitly requested to change

Please provide the refined code in the same format as before.
    `;
  }

  private parseGeneratedFiles(content: string, defaultType: ArtifactType = ArtifactType.CODE_FILE): GeneratedFile[] {
    const files: GeneratedFile[] = [];
    const codeBlockRegex = /```(\w+):([^\n]+)\n([\s\S]*?)```/g;
    
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      const [, language, filepath, code] = match;
      
      files.push({
        path: filepath.trim(),
        content: code.trim(),
        language: language,
        type: this.determineFileType(filepath, defaultType),
        dependencies: this.extractDependencies(code, language)
      });
    }
    
    return files;
  }

  private parseCodeGenerationResponse(content: string, taskId: string): CodeGenerationResult {
    const files = this.parseGeneratedFiles(content);
    
    return {
      taskId,
      files,
      tests: [],
      documentation: [],
      metadata: {
        model: this.config.model,
        tokens: content.length, // Simplified token count
        duration: 0,
        confidence: 0.8,
        warnings: []
      }
    };
  }

  private determineFileType(filepath: string, defaultType: ArtifactType): ArtifactType {
    const extension = filepath.split('.').pop()?.toLowerCase();
    
    if (filepath.includes('test') || filepath.includes('spec')) {
      return ArtifactType.TEST_FILE;
    }
    
    if (extension === 'md' || extension === 'txt') {
      return ArtifactType.DOCUMENTATION;
    }
    
    if (extension === 'json' || extension === 'yaml' || extension === 'yml' || extension === 'toml') {
      return ArtifactType.CONFIGURATION;
    }
    
    if (extension === 'sql' || filepath.includes('schema')) {
      return ArtifactType.SCHEMA;
    }
    
    return defaultType;
  }

  private extractDependencies(code: string, language: string): string[] {
    const dependencies: string[] = [];
    
    // Extract imports/requires based on language
    switch (language.toLowerCase()) {
      case 'typescript':
      case 'javascript':
        const importRegex = /import.*from\s+['"]([^'"]+)['"]/g;
        const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
        
        let match;
        while ((match = importRegex.exec(code)) !== null) {
          dependencies.push(match[1]);
        }
        while ((match = requireRegex.exec(code)) !== null) {
          dependencies.push(match[1]);
        }
        break;
        
      case 'python':
        const pythonImportRegex = /(?:from\s+(\S+)\s+import|import\s+(\S+))/g;
        while ((match = pythonImportRegex.exec(code)) !== null) {
          dependencies.push(match[1] || match[2]);
        }
        break;
        
      // Add more languages as needed
    }
    
    return [...new Set(dependencies)]; // Remove duplicates
  }

  private getRelevantTemplates(context: TaskContext): CodeTemplate[] {
    return this.getTemplates(context.codebase.language, context.codebase.framework);
  }

  private calculateGenerationMetadata(
    startTime: number, 
    files: GeneratedFile[], 
    tests: GeneratedFile[], 
    documentation: GeneratedFile[]
  ): GenerationMetadata {
    const duration = Date.now() - startTime;
    const totalFiles = files.length + tests.length + documentation.length;
    const totalContent = [...files, ...tests, ...documentation]
      .map(f => f.content)
      .join('');
    
    return {
      model: this.config.model,
      tokens: Math.floor(totalContent.length / 4), // Rough token estimate
      duration,
      confidence: this.calculateConfidence(totalFiles, totalContent.length),
      warnings: this.generateWarnings(files, tests, documentation)
    };
  }

  private calculateConfidence(fileCount: number, contentLength: number): number {
    // Simple confidence calculation based on output quality indicators
    let confidence = 0.5;
    
    if (fileCount > 0) confidence += 0.2;
    if (contentLength > 1000) confidence += 0.2;
    if (fileCount > 3) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  private generateWarnings(
    files: GeneratedFile[], 
    tests: GeneratedFile[], 
    documentation: GeneratedFile[]
  ): string[] {
    const warnings: string[] = [];
    
    if (files.length === 0) {
      warnings.push('No code files were generated');
    }
    
    if (this.config.enableTestGeneration && tests.length === 0) {
      warnings.push('No test files were generated despite being enabled');
    }
    
    if (this.config.enableDocumentationGeneration && documentation.length === 0) {
      warnings.push('No documentation files were generated despite being enabled');
    }
    
    return warnings;
  }

  private initializeTemplates(): void {
    // Add some default templates
    this.addTemplate({
      id: 'react-component',
      name: 'React Component',
      description: 'Basic React functional component template',
      language: 'typescript',
      framework: 'react',
      template: `
import React from 'react';

interface {{componentName}}Props {
  // Define props here
}

export const {{componentName}}: React.FC<{{componentName}}Props> = (props) => {
  return (
    <div>
      {/* Component content */}
    </div>
  );
};

export default {{componentName}};
      `,
      variables: [
        {
          name: 'componentName',
          type: 'string',
          description: 'Name of the React component',
          required: true
        }
      ]
    });

    this.addTemplate({
      id: 'express-route',
      name: 'Express Route',
      description: 'Express.js route handler template',
      language: 'typescript',
      framework: 'express',
      template: `
import { Request, Response } from 'express';

export const {{routeName}} = async (req: Request, res: Response) => {
  try {
    // Route logic here
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
      `,
      variables: [
        {
          name: 'routeName',
          type: 'string',
          description: 'Name of the route handler function',
          required: true
        }
      ]
    });
  }
}

export { CodegenConfig, CodeStyle, CodeTemplate, TemplateVariable };

