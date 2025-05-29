import { EventEmitter } from 'events';
import { z } from 'zod';

const CodegenConfigSchema = z.object({
  apiKey: z.string(),
  orgId: z.string(),
  baseUrl: z.string().default('https://api.codegen.sh'),
  timeout: z.number().default(30000),
});

export type CodegenConfig = z.infer<typeof CodegenConfigSchema>;

export interface CodegenRequest {
  type: 'fix' | 'generate' | 'analyze' | 'refactor';
  context: string;
  files: string[];
  error?: string;
  requirements?: string;
}

export interface CodegenResult {
  success: boolean;
  code?: string;
  analysis?: string;
  suggestions: string[];
  files: GeneratedFile[];
  logs: string[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  type: 'new' | 'modified';
}

export class WSL2CodegenFallback extends EventEmitter {
  private config: CodegenConfig;

  constructor(config: CodegenConfig) {
    super();
    this.config = CodegenConfigSchema.parse(config);
  }

  /**
   * Fallback to Codegen SDK for complex issues
   */
  async handleComplexIssue(
    environmentId: string,
    request: CodegenRequest
  ): Promise<CodegenResult> {
    this.emit('codegen:started', { environmentId, type: request.type });

    try {
      let result: CodegenResult;

      switch (request.type) {
        case 'fix':
          result = await this.fixCode(environmentId, request);
          break;
        case 'generate':
          result = await this.generateCode(environmentId, request);
          break;
        case 'analyze':
          result = await this.analyzeCode(environmentId, request);
          break;
        case 'refactor':
          result = await this.refactorCode(environmentId, request);
          break;
        default:
          throw new Error(`Unknown request type: ${request.type}`);
      }

      this.emit('codegen:completed', { environmentId, type: request.type, result });
      return result;
    } catch (error) {
      this.emit('codegen:failed', { environmentId, type: request.type, error });
      throw error;
    }
  }

  /**
   * Fix code using Codegen SDK
   */
  private async fixCode(environmentId: string, request: CodegenRequest): Promise<CodegenResult> {
    const payload = {
      action: 'fix',
      context: request.context,
      files: request.files,
      error: request.error,
    };

    const response = await this.callCodegenAPI('/v1/fix', payload);
    
    return {
      success: response.success,
      code: response.fixedCode,
      suggestions: response.suggestions || [],
      files: response.files || [],
      logs: response.logs || [],
    };
  }

  /**
   * Generate code using Codegen SDK
   */
  private async generateCode(environmentId: string, request: CodegenRequest): Promise<CodegenResult> {
    const payload = {
      action: 'generate',
      requirements: request.requirements,
      context: request.context,
      files: request.files,
    };

    const response = await this.callCodegenAPI('/v1/generate', payload);
    
    return {
      success: response.success,
      code: response.generatedCode,
      suggestions: response.suggestions || [],
      files: response.files || [],
      logs: response.logs || [],
    };
  }

  /**
   * Analyze code using Codegen SDK
   */
  private async analyzeCode(environmentId: string, request: CodegenRequest): Promise<CodegenResult> {
    const payload = {
      action: 'analyze',
      context: request.context,
      files: request.files,
    };

    const response = await this.callCodegenAPI('/v1/analyze', payload);
    
    return {
      success: response.success,
      analysis: response.analysis,
      suggestions: response.suggestions || [],
      files: [],
      logs: response.logs || [],
    };
  }

  /**
   * Refactor code using Codegen SDK
   */
  private async refactorCode(environmentId: string, request: CodegenRequest): Promise<CodegenResult> {
    const payload = {
      action: 'refactor',
      context: request.context,
      files: request.files,
      requirements: request.requirements,
    };

    const response = await this.callCodegenAPI('/v1/refactor', payload);
    
    return {
      success: response.success,
      code: response.refactoredCode,
      suggestions: response.suggestions || [],
      files: response.files || [],
      logs: response.logs || [],
    };
  }

  /**
   * Call Codegen API
   */
  private async callCodegenAPI(endpoint: string, payload: any): Promise<any> {
    try {
      const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Org-ID': this.config.orgId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Codegen API error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Failed to call Codegen API: ${error}`);
    }
  }

  /**
   * Check if Codegen SDK is available
   */
  async checkAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export default WSL2CodegenFallback;

