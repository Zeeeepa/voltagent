import Anthropic from '@anthropic-ai/sdk';
import { 
  ClaudeCodeOrchestrationConfig,
  ClaudeCodeRequest,
  ClaudeCodeResult,
  ClaudeCodeError,
  ClaudeCodeRequestSchema
} from '../types';

/**
 * AgentAPI Middleware for Claude Code Orchestration
 * Unified system for orchestrating Claude Code interactions
 */
export class ClaudeCodeOrchestrator {
  private anthropic: Anthropic;
  private config: ClaudeCodeOrchestrationConfig;
  private requestHistory: Map<string, ClaudeCodeRequest> = new Map();

  constructor(
    apiKey: string,
    config: ClaudeCodeOrchestrationConfig = {
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4096,
      temperature: 0.1
    }
  ) {
    this.anthropic = new Anthropic({ apiKey });
    this.config = config;
  }

  /**
   * Orchestrate code generation with Claude
   */
  async generateCode(request: ClaudeCodeRequest): Promise<ClaudeCodeResult> {
    try {
      // Validate request
      const validatedRequest = ClaudeCodeRequestSchema.parse(request);
      
      // Store request for history tracking
      const requestId = this.generateRequestId();
      this.requestHistory.set(requestId, validatedRequest);

      const startTime = Date.now();

      // Build system prompt for code generation
      const systemPrompt = this.buildSystemPrompt(validatedRequest);
      
      // Build user message with context
      const userMessage = this.buildUserMessage(validatedRequest);

      // Call Claude API
      const response = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature || 0.1,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userMessage
          }
        ]
      });

      const processingTime = Date.now() - startTime;

      // Process response
      const result = this.processClaudeResponse(
        response,
        validatedRequest,
        processingTime
      );

      return result;

    } catch (error) {
      if (error instanceof ClaudeCodeError) {
        throw error;
      }
      
      throw new ClaudeCodeError(
        `Failed to generate code with Claude: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error, request }
      );
    }
  }

  /**
   * Orchestrate code review with Claude
   */
  async reviewCode(
    code: string,
    language: string,
    reviewCriteria?: string[]
  ): Promise<ClaudeCodeResult> {
    const request: ClaudeCodeRequest = {
      instruction: `Review the following ${language} code and provide detailed feedback`,
      codeContext: code,
      outputFormat: 'explanation'
    };

    const systemPrompt = this.buildCodeReviewSystemPrompt(reviewCriteria);
    
    try {
      const startTime = Date.now();

      const response = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens || 4096,
        temperature: 0.1,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Please review this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``
          }
        ]
      });

      const processingTime = Date.now() - startTime;

      return this.processClaudeResponse(response, request, processingTime);

    } catch (error) {
      throw new ClaudeCodeError(
        `Failed to review code with Claude: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error, code: code.substring(0, 200) }
      );
    }
  }

  /**
   * Orchestrate code explanation with Claude
   */
  async explainCode(
    code: string,
    language: string,
    audienceLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ): Promise<ClaudeCodeResult> {
    const request: ClaudeCodeRequest = {
      instruction: `Explain this ${language} code for a ${audienceLevel} developer`,
      codeContext: code,
      outputFormat: 'explanation'
    };

    const systemPrompt = this.buildCodeExplanationSystemPrompt(audienceLevel);
    
    try {
      const startTime = Date.now();

      const response = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens || 4096,
        temperature: 0.2,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Please explain this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``
          }
        ]
      });

      const processingTime = Date.now() - startTime;

      return this.processClaudeResponse(response, request, processingTime);

    } catch (error) {
      throw new ClaudeCodeError(
        `Failed to explain code with Claude: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error, code: code.substring(0, 200) }
      );
    }
  }

  /**
   * Orchestrate code refactoring with Claude
   */
  async refactorCode(
    code: string,
    language: string,
    refactoringGoals: string[]
  ): Promise<ClaudeCodeResult> {
    const request: ClaudeCodeRequest = {
      instruction: `Refactor this ${language} code with the following goals: ${refactoringGoals.join(', ')}`,
      codeContext: code,
      outputFormat: 'both'
    };

    const systemPrompt = this.buildRefactoringSystemPrompt(refactoringGoals);
    
    try {
      const startTime = Date.now();

      const response = await this.anthropic.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens || 4096,
        temperature: 0.1,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: `Please refactor this ${language} code:\n\n\`\`\`${language}\n${code}\n\`\`\``
          }
        ]
      });

      const processingTime = Date.now() - startTime;

      return this.processClaudeResponse(response, request, processingTime);

    } catch (error) {
      throw new ClaudeCodeError(
        `Failed to refactor code with Claude: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error, code: code.substring(0, 200) }
      );
    }
  }

  /**
   * Build system prompt for code generation
   */
  private buildSystemPrompt(request: ClaudeCodeRequest): string {
    let prompt = this.config.systemPrompt || `You are an expert software engineer and code generator. `;
    
    prompt += `Your task is to generate high-quality, production-ready code based on user instructions. `;
    prompt += `Always follow best practices, include proper error handling, and write clean, maintainable code. `;
    
    if (request.outputFormat === 'code') {
      prompt += `Respond only with the requested code, properly formatted with syntax highlighting. `;
    } else if (request.outputFormat === 'explanation') {
      prompt += `Provide a detailed explanation of the code without including the actual code. `;
    } else {
      prompt += `Provide both the code and a detailed explanation. `;
    }

    if (request.files && request.files.length > 0) {
      prompt += `Consider the provided file context when generating your response. `;
    }

    return prompt;
  }

  /**
   * Build user message with context
   */
  private buildUserMessage(request: ClaudeCodeRequest): string {
    let message = request.instruction;

    if (request.codeContext) {
      message += `\n\nExisting code context:\n\`\`\`\n${request.codeContext}\n\`\`\``;
    }

    if (request.files && request.files.length > 0) {
      message += `\n\nRelated files:`;
      request.files.forEach(file => {
        message += `\n\n**${file.path}:**\n\`\`\`\n${file.content}\n\`\`\``;
      });
    }

    return message;
  }

  /**
   * Build system prompt for code review
   */
  private buildCodeReviewSystemPrompt(criteria?: string[]): string {
    let prompt = `You are an expert code reviewer. Analyze the provided code and give constructive feedback. `;
    prompt += `Focus on code quality, security, performance, maintainability, and best practices. `;
    
    if (criteria && criteria.length > 0) {
      prompt += `Pay special attention to: ${criteria.join(', ')}. `;
    }
    
    prompt += `Provide specific suggestions for improvement and highlight any potential issues.`;
    
    return prompt;
  }

  /**
   * Build system prompt for code explanation
   */
  private buildCodeExplanationSystemPrompt(audienceLevel: string): string {
    let prompt = `You are an expert programming instructor. Explain the provided code clearly and comprehensively. `;
    
    switch (audienceLevel) {
      case 'beginner':
        prompt += `Use simple language and explain basic concepts. Avoid jargon and provide context for programming terms.`;
        break;
      case 'advanced':
        prompt += `Provide deep technical insights, discuss design patterns, and explain complex implementation details.`;
        break;
      default:
        prompt += `Assume intermediate programming knowledge. Explain the logic and structure clearly.`;
    }
    
    return prompt;
  }

  /**
   * Build system prompt for refactoring
   */
  private buildRefactoringSystemPrompt(goals: string[]): string {
    let prompt = `You are an expert at code refactoring. Improve the provided code while maintaining its functionality. `;
    prompt += `Focus on: ${goals.join(', ')}. `;
    prompt += `Ensure the refactored code is cleaner, more efficient, and follows best practices. `;
    prompt += `Explain the changes you made and why they improve the code.`;
    
    return prompt;
  }

  /**
   * Process Claude API response
   */
  private processClaudeResponse(
    response: any,
    request: ClaudeCodeRequest,
    processingTime: number
  ): ClaudeCodeResult {
    const content = response.content[0]?.text || '';
    
    // Extract code and explanation based on output format
    let code: string | undefined;
    let explanation: string | undefined;
    let suggestions: string[] = [];

    if (request.outputFormat === 'code') {
      code = this.extractCodeFromResponse(content);
    } else if (request.outputFormat === 'explanation') {
      explanation = content;
      suggestions = this.extractSuggestions(content);
    } else {
      // Both code and explanation
      code = this.extractCodeFromResponse(content);
      explanation = this.extractExplanationFromResponse(content);
      suggestions = this.extractSuggestions(content);
    }

    // Calculate confidence based on response quality
    const confidence = this.calculateResponseConfidence(content, request);

    return {
      code,
      explanation,
      suggestions,
      confidence,
      metadata: {
        model: this.config.model,
        tokensUsed: response.usage?.input_tokens + response.usage?.output_tokens || 0,
        processingTime
      }
    };
  }

  /**
   * Extract code blocks from response
   */
  private extractCodeFromResponse(content: string): string | undefined {
    const codeBlockRegex = /```[\w]*\n([\s\S]*?)\n```/g;
    const matches = content.match(codeBlockRegex);
    
    if (matches && matches.length > 0) {
      // Remove the ``` markers and language identifier
      return matches[0].replace(/```[\w]*\n/, '').replace(/\n```$/, '');
    }
    
    return undefined;
  }

  /**
   * Extract explanation from response (when both code and explanation are present)
   */
  private extractExplanationFromResponse(content: string): string | undefined {
    // Remove code blocks and return the remaining text
    const withoutCodeBlocks = content.replace(/```[\w]*\n[\s\S]*?\n```/g, '');
    return withoutCodeBlocks.trim() || undefined;
  }

  /**
   * Extract suggestions from response
   */
  private extractSuggestions(content: string): string[] {
    const suggestions: string[] = [];
    
    // Look for bullet points or numbered lists
    const bulletRegex = /^[•\-\*]\s+(.+)$/gm;
    const numberedRegex = /^\d+\.\s+(.+)$/gm;
    
    let match;
    while ((match = bulletRegex.exec(content)) !== null) {
      suggestions.push(match[1].trim());
    }
    
    while ((match = numberedRegex.exec(content)) !== null) {
      suggestions.push(match[1].trim());
    }
    
    return suggestions;
  }

  /**
   * Calculate confidence score for the response
   */
  private calculateResponseConfidence(content: string, request: ClaudeCodeRequest): number {
    let confidence = 0.5; // Base confidence
    
    // Increase confidence based on response completeness
    if (content.length > 100) confidence += 0.2;
    if (content.includes('```')) confidence += 0.1; // Contains code blocks
    if (content.includes('function') || content.includes('class')) confidence += 0.1;
    
    // Adjust based on request complexity
    if (request.files && request.files.length > 0) confidence += 0.1;
    if (request.codeContext) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `claude-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get request history
   */
  getRequestHistory(): Array<{ id: string; request: ClaudeCodeRequest }> {
    return Array.from(this.requestHistory.entries()).map(([id, request]) => ({
      id,
      request
    }));
  }

  /**
   * Clear request history
   */
  clearHistory(): void {
    this.requestHistory.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ClaudeCodeOrchestrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

