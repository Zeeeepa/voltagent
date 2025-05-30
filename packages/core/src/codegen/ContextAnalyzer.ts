import type { Agent } from "../agent";
import type { LLMProvider } from "../agent/providers";
import type {
  TaskContext,
  Requirements,
  TechnicalSpecification,
  IntegrationPoint,
  Constraint,
  DatabaseOptions,
} from "./types";

/**
 * Context Analyzer for retrieving and analyzing task specifications
 * Handles context retrieval from PostgreSQL and requirement analysis
 */
export class ContextAnalyzer {
  private agent: Agent<{ llm: LLMProvider<unknown> }>;
  private databaseOptions?: DatabaseOptions;

  constructor(
    agent: Agent<{ llm: LLMProvider<unknown> }>,
    databaseOptions?: DatabaseOptions
  ) {
    this.agent = agent;
    this.databaseOptions = databaseOptions;
  }

  /**
   * Retrieve comprehensive task context from PostgreSQL
   */
  async retrieveFromPostgreSQL(taskId: string): Promise<TaskContext> {
    try {
      // Use custom retrieval function if provided
      if (this.databaseOptions?.retrieveContext) {
        return await this.databaseOptions.retrieveContext(taskId);
      }

      // Default implementation - would connect to actual database
      const context = await this.fetchTaskFromDatabase(taskId);
      
      // Analyze and enrich the context
      const enrichedContext = await this.enrichTaskContext(context);
      
      return enrichedContext;
    } catch (error) {
      console.error(`Failed to retrieve context for task ${taskId}:`, error);
      throw new Error(`Context retrieval failed: ${error}`);
    }
  }

  /**
   * Analyze task specifications and extract structured requirements
   */
  async analyzeTaskSpecifications(specifications: string): Promise<Requirements> {
    const prompt = `
Analyze the following task specifications and extract structured requirements:

Task Specifications:
${specifications}

Please extract and structure the following:
1. Natural language description
2. Technical specifications (API, database, UI, service, config, test)
3. Acceptance criteria
4. Constraints (performance, security, compatibility, resource)
5. Integration points (API, database, service, library)

Return the analysis in a structured format.
`;

    try {
      const response = await this.agent.generateText({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      return this.parseRequirementsFromResponse(response.text, specifications);
    } catch (error) {
      console.error("Failed to analyze task specifications:", error);
      throw new Error(`Specification analysis failed: ${error}`);
    }
  }

  /**
   * Extract technical requirements from context
   */
  async extractTechnicalRequirements(context: TaskContext): Promise<TechnicalSpecification[]> {
    const prompt = `
Extract technical requirements from the following task context:

Title: ${context.title}
Description: ${context.description}
Requirements: ${JSON.stringify(context.requirements, null, 2)}

Identify and categorize technical specifications into:
- API requirements
- Database requirements  
- UI/Frontend requirements
- Service/Backend requirements
- Configuration requirements
- Testing requirements

For each requirement, provide:
- Type
- Description
- Specific details and parameters
`;

    try {
      const response = await this.agent.generateText({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      });

      return this.parseTechnicalSpecifications(response.text);
    } catch (error) {
      console.error("Failed to extract technical requirements:", error);
      return [];
    }
  }

  /**
   * Identify integration constraints with existing codebase
   */
  async identifyIntegrationConstraints(
    context: TaskContext,
    codebase: any
  ): Promise<Constraint[]> {
    const prompt = `
Analyze integration constraints for implementing the following task in the existing codebase:

Task: ${context.title}
Requirements: ${context.requirements.naturalLanguage}

Existing Codebase Architecture:
${JSON.stringify(codebase.architecture, null, 2)}

Existing Dependencies:
${JSON.stringify(codebase.dependencies, null, 2)}

Identify constraints in these categories:
- Performance constraints
- Security constraints  
- Compatibility constraints
- Resource constraints

For each constraint, specify:
- Type
- Description
- Specific value or threshold if applicable
`;

    try {
      const response = await this.agent.generateText({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      });

      return this.parseConstraints(response.text);
    } catch (error) {
      console.error("Failed to identify integration constraints:", error);
      return [];
    }
  }

  /**
   * Build comprehensive implementation context
   */
  async buildImplementationContext(
    task: TaskContext,
    codebase: any,
    dependencies: any
  ): Promise<TaskContext> {
    try {
      // Extract technical requirements
      const technicalSpecs = await this.extractTechnicalRequirements(task);
      
      // Identify constraints
      const constraints = await this.identifyIntegrationConstraints(task, codebase);
      
      // Identify integration points
      const integrationPoints = await this.identifyIntegrationPoints(task, codebase);

      // Build enriched context
      const enrichedContext: TaskContext = {
        ...task,
        requirements: {
          ...task.requirements,
          technicalSpecs,
          constraints,
          integrationPoints,
        },
      };

      return enrichedContext;
    } catch (error) {
      console.error("Failed to build implementation context:", error);
      throw new Error(`Context building failed: ${error}`);
    }
  }

  /**
   * Validate context completeness
   */
  async validateContextCompleteness(context: TaskContext): Promise<boolean> {
    const requiredFields = [
      'id',
      'title', 
      'description',
      'requirements',
      'repoUrl'
    ];

    const missingFields = requiredFields.filter(field => !context[field as keyof TaskContext]);
    
    if (missingFields.length > 0) {
      console.warn(`Context missing required fields: ${missingFields.join(', ')}`);
      return false;
    }

    // Validate requirements structure
    if (!context.requirements.naturalLanguage) {
      console.warn("Context missing natural language requirements");
      return false;
    }

    return true;
  }

  /**
   * Maintain context across multiple related tasks
   */
  async maintainTaskContext(taskId: string, context: TaskContext): Promise<void> {
    try {
      // Store context for future reference
      if (this.databaseOptions?.storeLearningData) {
        await this.databaseOptions.storeLearningData({
          prUrl: `task-context-${taskId}`,
          validationResults: {
            success: true,
            feedback: [],
          },
          timestamp: new Date(),
          success: true,
          feedback: [],
          patterns: {
            codeStructure: {
              directories: [],
              files: [],
              conventions: [],
            },
            designPatterns: [],
            bestPractices: [],
            performanceOptimizations: [],
          },
        });
      }

      // Update related tasks if they exist
      if (context.parentTask || context.subTasks?.length) {
        await this.updateRelatedTasksContext(context);
      }
    } catch (error) {
      console.error("Failed to maintain task context:", error);
    }
  }

  // ===== Private Helper Methods =====

  private async fetchTaskFromDatabase(taskId: string): Promise<TaskContext> {
    // This would be implemented to fetch from actual PostgreSQL database
    // For now, return a mock context
    return {
      id: taskId,
      title: "Sample Task",
      description: "Sample task description",
      requirements: {
        naturalLanguage: "Implement a new feature",
      },
      repoUrl: "https://github.com/example/repo",
      priority: 1,
      labels: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  private async enrichTaskContext(context: TaskContext): Promise<TaskContext> {
    // Analyze and enrich the basic context with additional insights
    const requirements = await this.analyzeTaskSpecifications(
      context.description + "\n" + context.requirements.naturalLanguage
    );

    return {
      ...context,
      requirements,
    };
  }

  private parseRequirementsFromResponse(response: string, originalSpecs: string): Requirements {
    try {
      // Parse the AI response to extract structured requirements
      // This would use more sophisticated parsing in a real implementation
      return {
        naturalLanguage: originalSpecs,
        technicalSpecs: [],
        acceptanceCriteria: [],
        constraints: [],
        integrationPoints: [],
      };
    } catch (error) {
      console.error("Failed to parse requirements:", error);
      return {
        naturalLanguage: originalSpecs,
      };
    }
  }

  private parseTechnicalSpecifications(response: string): TechnicalSpecification[] {
    try {
      // Parse AI response to extract technical specifications
      // This would use more sophisticated parsing in a real implementation
      return [];
    } catch (error) {
      console.error("Failed to parse technical specifications:", error);
      return [];
    }
  }

  private parseConstraints(response: string): Constraint[] {
    try {
      // Parse AI response to extract constraints
      // This would use more sophisticated parsing in a real implementation
      return [];
    } catch (error) {
      console.error("Failed to parse constraints:", error);
      return [];
    }
  }

  private async identifyIntegrationPoints(
    task: TaskContext,
    codebase: any
  ): Promise<IntegrationPoint[]> {
    try {
      // Analyze codebase to identify integration points
      // This would be more sophisticated in a real implementation
      return [];
    } catch (error) {
      console.error("Failed to identify integration points:", error);
      return [];
    }
  }

  private async updateRelatedTasksContext(context: TaskContext): Promise<void> {
    // Update context for parent and sub-tasks
    // This would be implemented to maintain consistency across related tasks
  }
}

