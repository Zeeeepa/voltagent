import { 
  CodegenSDKConfig,
  CodegenIntegrationConfig,
  CodeGenerationRequest,
  CodeGenerationResult,
  NLPProcessingOptions,
  NLPResult,
  PRCreationOptions,
  PRCreationResult,
  ClaudeCodeRequest,
  ClaudeCodeResult,
  AgentAPIRequest,
  AgentAPIResponse,
  CodegenSDKError
} from '../types';
import { UnifiedNLPEngine } from '../nlp/engine';
import { UnifiedPRCreator } from '../automation/pr-creator';
import { ClaudeCodeOrchestrator } from '../middleware/claude-orchestrator';
import { AgentAPIMiddleware } from '../middleware/agent-api';

/**
 * Unified Codegen SDK Client
 * Single entry point for all Codegen SDK functionality
 * Consolidates NLP, PR automation, Claude Code orchestration, and AgentAPI middleware
 */
export class CodegenSDKClient {
  private config: CodegenIntegrationConfig;
  private nlpEngine: UnifiedNLPEngine;
  private prCreator: UnifiedPRCreator;
  private claudeOrchestrator: ClaudeCodeOrchestrator;
  private agentMiddleware: AgentAPIMiddleware;
  private initialized: boolean = false;

  constructor(config: CodegenIntegrationConfig) {
    this.config = config;
    this.validateConfig(config);
    this.initializeComponents();
  }

  /**
   * Initialize all SDK components
   */
  private initializeComponents(): void {
    try {
      // Initialize NLP Engine
      this.nlpEngine = new UnifiedNLPEngine();

      // Initialize PR Creator
      this.prCreator = new UnifiedPRCreator(
        this.config.prAutomation.github.token,
        {
          repository: `${this.config.prAutomation.github.owner}/${this.config.prAutomation.github.repo}`
        }
      );

      // Initialize Claude Code Orchestrator
      this.claudeOrchestrator = new ClaudeCodeOrchestrator(
        process.env.ANTHROPIC_API_KEY || '',
        this.config.claudeCode
      );

      // Initialize Agent API Middleware
      this.agentMiddleware = new AgentAPIMiddleware(this.config.middleware);

      this.initialized = true;
    } catch (error) {
      throw new CodegenSDKError(
        'Failed to initialize Codegen SDK components',
        'INITIALIZATION_ERROR',
        { originalError: error }
      );
    }
  }

  /**
   * Validate configuration
   */
  private validateConfig(config: CodegenIntegrationConfig): void {
    if (!config.prAutomation?.github?.token) {
      throw new CodegenSDKError(
        'GitHub token is required for PR automation',
        'INVALID_CONFIG'
      );
    }

    if (!config.prAutomation?.github?.owner || !config.prAutomation?.github?.repo) {
      throw new CodegenSDKError(
        'GitHub owner and repository are required',
        'INVALID_CONFIG'
      );
    }
  }

  /**
   * Process natural language text with comprehensive analysis
   */
  async processNaturalLanguage(
    text: string,
    options?: NLPProcessingOptions
  ): Promise<NLPResult> {
    this.ensureInitialized();
    
    const request: AgentAPIRequest = {
      id: this.generateRequestId(),
      type: 'nlp',
      payload: { text, options }
    };

    return this.agentMiddleware.processRequest(request, async () => {
      return await this.nlpEngine.processText(text, options);
    });
  }

  /**
   * Process code-specific text with specialized NLP
   */
  async processCodeText(text: string): Promise<NLPResult> {
    this.ensureInitialized();
    
    const request: AgentAPIRequest = {
      id: this.generateRequestId(),
      type: 'nlp',
      payload: { text, codeSpecific: true }
    };

    return this.agentMiddleware.processRequest(request, async () => {
      return await this.nlpEngine.processCodeText(text);
    });
  }

  /**
   * Generate code using Claude Code orchestration
   */
  async generateCode(request: CodeGenerationRequest): Promise<CodeGenerationResult> {
    this.ensureInitialized();
    
    const agentRequest: AgentAPIRequest = {
      id: this.generateRequestId(),
      type: 'codegen',
      payload: request
    };

    return this.agentMiddleware.processRequest(agentRequest, async () => {
      const claudeRequest: ClaudeCodeRequest = {
        instruction: request.prompt,
        codeContext: request.context,
        outputFormat: 'both'
      };

      const claudeResult = await this.claudeOrchestrator.generateCode(claudeRequest);
      
      return this.transformClaudeResultToCodeGeneration(claudeResult, request);
    });
  }

  /**
   * Create automated pull request
   */
  async createAutomatedPR(options: PRCreationOptions): Promise<PRCreationResult> {
    this.ensureInitialized();
    
    const request: AgentAPIRequest = {
      id: this.generateRequestId(),
      type: 'pr-automation',
      payload: options
    };

    return this.agentMiddleware.processRequest(request, async () => {
      return await this.prCreator.createPR(options);
    });
  }

  /**
   * Create PR from code generation result
   */
  async createPRFromCodeGeneration(
    codeResult: CodeGenerationResult,
    prOptions: Omit<PRCreationOptions, 'title' | 'description'>
  ): Promise<PRCreationResult> {
    this.ensureInitialized();
    
    return await this.prCreator.createPRFromCodeGeneration(
      {
        code: codeResult.code,
        language: codeResult.language,
        explanation: codeResult.explanation,
        tests: codeResult.tests
      },
      prOptions
    );
  }

  /**
   * Create PR from NLP analysis result
   */
  async createPRFromNLPAnalysis(
    nlpResult: NLPResult,
    prOptions: Omit<PRCreationOptions, 'title' | 'description'>
  ): Promise<PRCreationResult> {
    this.ensureInitialized();
    
    return await this.prCreator.createPRFromNLPAnalysis(
      {
        summary: nlpResult.summary,
        keywords: nlpResult.keywords,
        confidence: nlpResult.confidence
      },
      prOptions
    );
  }

  /**
   * Review code using Claude Code orchestration
   */
  async reviewCode(
    code: string,
    language: string,
    criteria?: string[]
  ): Promise<ClaudeCodeResult> {
    this.ensureInitialized();
    
    const request: AgentAPIRequest = {
      id: this.generateRequestId(),
      type: 'claude-code',
      payload: { action: 'review', code, language, criteria }
    };

    return this.agentMiddleware.processRequest(request, async () => {
      return await this.claudeOrchestrator.reviewCode(code, language, criteria);
    });
  }

  /**
   * Explain code using Claude Code orchestration
   */
  async explainCode(
    code: string,
    language: string,
    audienceLevel: 'beginner' | 'intermediate' | 'advanced' = 'intermediate'
  ): Promise<ClaudeCodeResult> {
    this.ensureInitialized();
    
    const request: AgentAPIRequest = {
      id: this.generateRequestId(),
      type: 'claude-code',
      payload: { action: 'explain', code, language, audienceLevel }
    };

    return this.agentMiddleware.processRequest(request, async () => {
      return await this.claudeOrchestrator.explainCode(code, language, audienceLevel);
    });
  }

  /**
   * Refactor code using Claude Code orchestration
   */
  async refactorCode(
    code: string,
    language: string,
    goals: string[]
  ): Promise<ClaudeCodeResult> {
    this.ensureInitialized();
    
    const request: AgentAPIRequest = {
      id: this.generateRequestId(),
      type: 'claude-code',
      payload: { action: 'refactor', code, language, goals }
    };

    return this.agentMiddleware.processRequest(request, async () => {
      return await this.claudeOrchestrator.refactorCode(code, language, goals);
    });
  }

  /**
   * Complete workflow: NLP analysis → Code generation → PR creation
   */
  async completeCodeGenerationWorkflow(
    naturalLanguagePrompt: string,
    targetLanguage: string,
    prOptions: Omit<PRCreationOptions, 'title' | 'description'>
  ): Promise<{
    nlpResult: NLPResult;
    codeResult: CodeGenerationResult;
    prResult: PRCreationResult;
  }> {
    this.ensureInitialized();

    // Step 1: Analyze natural language prompt
    const nlpResult = await this.processNaturalLanguage(naturalLanguagePrompt, {
      enableIntentClassification: true,
      enableEntityExtraction: true
    });

    // Step 2: Generate code based on analysis
    const codeResult = await this.generateCode({
      prompt: naturalLanguagePrompt,
      language: targetLanguage,
      context: nlpResult.summary,
      includeComments: true,
      includeTests: true
    });

    // Step 3: Create PR with generated code
    const prResult = await this.createPRFromCodeGeneration(codeResult, prOptions);

    return {
      nlpResult,
      codeResult,
      prResult
    };
  }

  /**
   * Complete workflow: Code review → Analysis → PR with suggestions
   */
  async completeCodeReviewWorkflow(
    code: string,
    language: string,
    prOptions: Omit<PRCreationOptions, 'title' | 'description'>
  ): Promise<{
    reviewResult: ClaudeCodeResult;
    nlpResult: NLPResult;
    prResult: PRCreationResult;
  }> {
    this.ensureInitialized();

    // Step 1: Review code with Claude
    const reviewResult = await this.reviewCode(code, language);

    // Step 2: Analyze review feedback with NLP
    const nlpResult = await this.processNaturalLanguage(
      reviewResult.explanation || 'Code review completed',
      { enableSentimentAnalysis: true }
    );

    // Step 3: Create PR with review results
    const prResult = await this.createPRFromNLPAnalysis(nlpResult, {
      ...prOptions,
      labels: [...(prOptions.labels || []), 'code-review', 'automated-analysis']
    });

    return {
      reviewResult,
      nlpResult,
      prResult
    };
  }

  /**
   * Get comprehensive SDK status and metrics
   */
  getSDKStatus() {
    return {
      initialized: this.initialized,
      components: {
        nlpEngine: !!this.nlpEngine,
        prCreator: !!this.prCreator,
        claudeOrchestrator: !!this.claudeOrchestrator,
        agentMiddleware: !!this.agentMiddleware
      },
      config: {
        hasGitHubToken: !!this.config.prAutomation.github.token,
        repository: `${this.config.prAutomation.github.owner}/${this.config.prAutomation.github.repo}`,
        claudeModel: this.config.claudeCode.model,
        middlewareEnabled: this.config.middleware.enableLogging || false
      },
      metrics: this.agentMiddleware?.getMetrics() || null
    };
  }

  /**
   * Update SDK configuration
   */
  updateConfig(newConfig: Partial<CodegenIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Reinitialize components if necessary
    if (newConfig.prAutomation || newConfig.claudeCode || newConfig.middleware) {
      this.initializeComponents();
    }
  }

  /**
   * Transform Claude result to CodeGeneration format
   */
  private transformClaudeResultToCodeGeneration(
    claudeResult: ClaudeCodeResult,
    request: CodeGenerationRequest
  ): CodeGenerationResult {
    return {
      code: claudeResult.code || '',
      language: request.language,
      explanation: claudeResult.explanation,
      tests: undefined, // Could be extracted from code if present
      confidence: claudeResult.confidence,
      metadata: {
        tokensUsed: claudeResult.metadata.tokensUsed,
        processingTime: claudeResult.metadata.processingTime,
        model: claudeResult.metadata.model
      }
    };
  }

  /**
   * Ensure SDK is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new CodegenSDKError(
        'SDK not initialized. Please check configuration and try again.',
        'NOT_INITIALIZED'
      );
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `sdk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.claudeOrchestrator) {
      this.claudeOrchestrator.clearHistory();
    }
    
    if (this.agentMiddleware) {
      this.agentMiddleware.clearCache();
    }
    
    this.initialized = false;
  }
}

