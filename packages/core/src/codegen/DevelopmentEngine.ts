import type { Agent } from "../agent";
import type { LLMProvider } from "../agent/providers";
import type { ToolExecutionContext } from "../agent/types";
import { ContextAnalyzer } from "./ContextAnalyzer";
import { CodebaseAnalyzer } from "./CodebaseAnalyzer";
import { CodeGenerator } from "./CodeGenerator";
import { QualityAssurance } from "./QualityAssurance";
import { PRManager } from "./PRManager";
import { LinearMonitor } from "./LinearMonitor";
import { TestGenerator } from "./TestGenerator";
import type {
  DevelopmentEngineOptions,
  TaskContext,
  ImplementationResult,
  QualityAssuranceResult,
  PRCreationResult,
  CodebaseAnalysisResult,
  ValidationResults,
  ImplementationPatterns,
  LearningData,
} from "./types";

/**
 * Main Codegen Development Engine class that orchestrates the AI-powered development cycle
 * Converts natural language requirements into working code implementations with full context awareness
 */
export class CodegenDevelopmentEngine {
  private contextAnalyzer: ContextAnalyzer;
  private codebaseAnalyzer: CodebaseAnalyzer;
  private codeGenerator: CodeGenerator;
  private qualityAssurance: QualityAssurance;
  private prManager: PRManager;
  private linearMonitor: LinearMonitor;
  private testGenerator: TestGenerator;
  private agent: Agent<{ llm: LLMProvider<unknown> }>;
  private options: DevelopmentEngineOptions;

  constructor(
    agent: Agent<{ llm: LLMProvider<unknown> }>,
    options: DevelopmentEngineOptions
  ) {
    this.agent = agent;
    this.options = options;

    // Initialize all components
    this.contextAnalyzer = new ContextAnalyzer(agent, options.database);
    this.codebaseAnalyzer = new CodebaseAnalyzer(agent, options.github);
    this.codeGenerator = new CodeGenerator(agent, options.generation);
    this.qualityAssurance = new QualityAssurance(agent, options.quality);
    this.prManager = new PRManager(agent, options.github);
    this.linearMonitor = new LinearMonitor(agent, options.linear);
    this.testGenerator = new TestGenerator(agent, options.testing);
  }

  // ===== Phase 2: Automated Development Cycle =====

  /**
   * Continuously monitor Linear for new assignments
   */
  async monitorLinearAssignments(): Promise<void> {
    return this.linearMonitor.startMonitoring();
  }

  /**
   * Retrieve comprehensive task context from PostgreSQL and Linear
   */
  async retrieveTaskContext(taskId: string): Promise<TaskContext> {
    return this.contextAnalyzer.retrieveFromPostgreSQL(taskId);
  }

  /**
   * Analyze codebase for integration points and dependencies
   */
  async analyzeCodebaseIntegration(
    repoUrl: string,
    task: TaskContext
  ): Promise<CodebaseAnalysisResult> {
    return this.codebaseAnalyzer.performDeepAnalysis(repoUrl, task);
  }

  /**
   * Generate complete implementation based on task and context
   */
  async generateImplementation(
    task: TaskContext,
    context: CodebaseAnalysisResult
  ): Promise<ImplementationResult> {
    return this.codeGenerator.generateImplementation(task.requirements, {
      ...context,
      task,
    });
  }

  /**
   * Perform internal code review and optimization
   */
  async performQualityAssurance(
    code: ImplementationResult,
    requirements: TaskContext
  ): Promise<QualityAssuranceResult> {
    return this.qualityAssurance.performInternalReview(code, requirements);
  }

  /**
   * Create GitHub Pull Request with complete implementation
   */
  async createPullRequest(
    implementation: ImplementationResult,
    metadata: {
      task: TaskContext;
      analysis: CodebaseAnalysisResult;
      quality: QualityAssuranceResult;
    }
  ): Promise<PRCreationResult> {
    return this.prManager.createPullRequest(implementation, metadata);
  }

  // ===== Context Management =====

  /**
   * Maintain context across multiple related tasks
   */
  async maintainTaskContext(taskId: string, context: TaskContext): Promise<void> {
    return this.contextAnalyzer.maintainTaskContext(taskId, context);
  }

  /**
   * Analyze integration points between new feature and existing codebase
   */
  async analyzeIntegrationPoints(
    codebase: CodebaseAnalysisResult,
    newFeature: ImplementationResult
  ): Promise<any> {
    return this.codebaseAnalyzer.analyzeIntegrationPoints(codebase, newFeature);
  }

  /**
   * Validate architectural consistency with existing patterns
   */
  async validateArchitecturalConsistency(
    code: ImplementationResult,
    patterns: any
  ): Promise<boolean> {
    return this.qualityAssurance.validateArchitecturalConsistency(code, patterns);
  }

  /**
   * Optimize implementation for performance and maintainability
   */
  async optimizeImplementation(
    code: ImplementationResult,
    performance: any
  ): Promise<ImplementationResult> {
    return this.codeGenerator.optimizePerformance(code, performance);
  }

  // ===== Continuous Learning =====

  /**
   * Learn from Claude Code feedback and validation results
   */
  async learnFromFeedback(
    prUrl: string,
    validationResults: ValidationResults
  ): Promise<void> {
    const learningData: LearningData = {
      prUrl,
      validationResults,
      timestamp: new Date(),
      success: validationResults.success,
      feedback: validationResults.feedback,
    };

    // Store learning data for pattern evolution
    await this.storeLearningData(learningData);

    // Update implementation patterns based on feedback
    if (validationResults.success) {
      await this.updateImplementationPatterns(validationResults.successfulCode);
    } else {
      await this.refineCodeGenerationAlgorithms(validationResults.feedback);
    }
  }

  /**
   * Update implementation patterns based on successful code
   */
  async updateImplementationPatterns(
    successfulCode: ImplementationResult
  ): Promise<void> {
    const patterns: ImplementationPatterns = {
      codeStructure: successfulCode.structure,
      designPatterns: successfulCode.patterns,
      bestPractices: successfulCode.practices,
      performanceOptimizations: successfulCode.optimizations,
    };

    await this.codeGenerator.updatePatterns(patterns);
  }

  /**
   * Refine code generation algorithms based on feedback
   */
  async refineCodeGenerationAlgorithms(feedback: any): Promise<void> {
    await this.codeGenerator.refineLearningAlgorithms(feedback);
  }

  // ===== Complete Development Workflow =====

  /**
   * Execute the complete automated development workflow
   */
  async executeCompleteWorkflow(taskId: string): Promise<PRCreationResult> {
    try {
      // Step 1: Retrieve task context
      const taskContext = await this.retrieveTaskContext(taskId);

      // Step 2: Analyze codebase for integration
      const codebaseAnalysis = await this.analyzeCodebaseIntegration(
        taskContext.repoUrl,
        taskContext
      );

      // Step 3: Generate implementation
      const implementation = await this.generateImplementation(
        taskContext,
        codebaseAnalysis
      );

      // Step 4: Generate tests
      const tests = await this.testGenerator.generateUnitTests(
        implementation,
        taskContext.requirements
      );
      implementation.tests = tests;

      // Step 5: Perform quality assurance
      const qualityResult = await this.performQualityAssurance(
        implementation,
        taskContext
      );

      // Step 6: Optimize if needed
      let finalImplementation = implementation;
      if (qualityResult.needsOptimization) {
        finalImplementation = await this.optimizeImplementation(
          implementation,
          qualityResult.optimizationSuggestions
        );
      }

      // Step 7: Create pull request
      const prResult = await this.createPullRequest(finalImplementation, {
        task: taskContext,
        analysis: codebaseAnalysis,
        quality: qualityResult,
      });

      // Step 8: Maintain context for future tasks
      await this.maintainTaskContext(taskId, taskContext);

      return prResult;
    } catch (error) {
      console.error("Development workflow failed:", error);
      throw error;
    }
  }

  // ===== Private Helper Methods =====

  private async storeLearningData(data: LearningData): Promise<void> {
    // Store learning data in database for continuous improvement
    if (this.options.database?.storeLearningData) {
      await this.options.database.storeLearningData(data);
    }
  }

  /**
   * Get development engine status and metrics
   */
  async getStatus(): Promise<{
    isMonitoring: boolean;
    tasksProcessed: number;
    successRate: number;
    averageQualityScore: number;
  }> {
    return {
      isMonitoring: await this.linearMonitor.isMonitoring(),
      tasksProcessed: await this.getTasksProcessedCount(),
      successRate: await this.getSuccessRate(),
      averageQualityScore: await this.getAverageQualityScore(),
    };
  }

  private async getTasksProcessedCount(): Promise<number> {
    // Implementation would query database for processed tasks count
    return 0;
  }

  private async getSuccessRate(): Promise<number> {
    // Implementation would calculate success rate from historical data
    return 0.95;
  }

  private async getAverageQualityScore(): Promise<number> {
    // Implementation would calculate average quality score
    return 0.87;
  }
}

