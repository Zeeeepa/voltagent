import type { Agent } from "../agent";
import type { SubAgentManager } from "../agent/subagent";
import { WorkflowOrchestrationEngine } from "./engine";
import type {
  WorkflowDefinition,
  WorkflowExecutionOptions,
  WorkflowExecutionResult,
} from "./types";

/**
 * Integration layer between the new Workflow Orchestration Engine
 * and the existing SubAgentManager to ensure backward compatibility
 * and provide a migration path.
 */
export class OrchestrationIntegration {
  private orchestrationEngine: WorkflowOrchestrationEngine;
  private subAgentManager: SubAgentManager;
  private parentAgent: Agent<any>;

  constructor(
    parentAgent: Agent<any>,
    subAgentManager: SubAgentManager,
    orchestrationEngine?: WorkflowOrchestrationEngine
  ) {
    this.parentAgent = parentAgent;
    this.subAgentManager = subAgentManager;
    
    // Create orchestration engine if not provided
    this.orchestrationEngine = orchestrationEngine || new WorkflowOrchestrationEngine(
      subAgentManager.getSubAgents(),
      {
        maxConcurrentWorkflows: 5,
        maxConcurrentTasks: 20,
        persistenceEnabled: false,
      }
    );
  }

  /**
   * Start the orchestration integration
   */
  public async start(): Promise<void> {
    await this.orchestrationEngine.start();
    
    // Register default workflows based on sub-agents
    await this.registerDefaultWorkflows();
  }

  /**
   * Stop the orchestration integration
   */
  public async stop(): Promise<void> {
    await this.orchestrationEngine.stop();
  }

  /**
   * Enhanced delegate task that can use either simple delegation or workflow orchestration
   */
  public async enhancedDelegateTask(options: {
    task: string;
    targetAgents: string[];
    context?: Record<string, unknown>;
    useOrchestration?: boolean;
    executionMode?: "sequential" | "parallel";
    timeout?: number;
    retries?: number;
    userContext?: Map<string | symbol, unknown>;
    conversationId?: string;
    userId?: string;
    parentAgentId?: string;
    parentHistoryEntryId?: string;
  }): Promise<any> {
    const {
      task,
      targetAgents,
      context = {},
      useOrchestration = false,
      executionMode = "parallel",
      timeout,
      retries,
      userContext,
      conversationId,
      userId,
      parentAgentId,
      parentHistoryEntryId,
    } = options;

    if (!useOrchestration || targetAgents.length === 1) {
      // Use traditional SubAgentManager for simple cases
      return this.delegateUsingSubAgentManager(options);
    }

    // Use workflow orchestration for complex cases
    return this.delegateUsingOrchestration(options);
  }

  /**
   * Create a workflow from a simple task delegation
   */
  public createWorkflowFromDelegation(options: {
    task: string;
    targetAgents: string[];
    executionMode: "sequential" | "parallel";
    timeout?: number;
    retries?: number;
  }): WorkflowDefinition {
    const { task, targetAgents, executionMode, timeout, retries } = options;
    
    const workflowId = `delegation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: workflowId,
      name: `Delegated Task: ${task.substring(0, 50)}...`,
      version: "1.0.0",
      mode: executionMode,
      tasks: targetAgents.map((agentName, index) => ({
        id: `task_${index}`,
        name: `Execute with ${agentName}`,
        agentName,
        input: task,
        timeout,
        retries,
        metadata: {
          originalDelegation: true,
          parentAgent: this.parentAgent.name,
        },
      })),
      globalTimeout: timeout ? timeout * targetAgents.length : undefined,
    };
  }

  /**
   * Migrate existing sub-agent patterns to workflows
   */
  public async migrateToWorkflows(): Promise<void> {
    const subAgents = this.subAgentManager.getSubAgents();
    
    // Create common workflow patterns
    await this.createCommonWorkflowPatterns(subAgents);
  }

  /**
   * Get orchestration engine for advanced usage
   */
  public getOrchestrationEngine(): WorkflowOrchestrationEngine {
    return this.orchestrationEngine;
  }

  /**
   * Check if orchestration should be used based on task complexity
   */
  public shouldUseOrchestration(options: {
    targetAgents: string[];
    hasConditions?: boolean;
    hasDependencies?: boolean;
    requiresStateManagement?: boolean;
  }): boolean {
    const { targetAgents, hasConditions, hasDependencies, requiresStateManagement } = options;
    
    // Use orchestration for complex scenarios
    return (
      targetAgents.length > 3 ||
      hasConditions ||
      hasDependencies ||
      requiresStateManagement ||
      false
    );
  }

  /**
   * Delegate using traditional SubAgentManager
   */
  private async delegateUsingSubAgentManager(options: {
    task: string;
    targetAgents: string[];
    context?: Record<string, unknown>;
    userContext?: Map<string | symbol, unknown>;
    conversationId?: string;
    userId?: string;
    parentAgentId?: string;
    parentHistoryEntryId?: string;
  }): Promise<any> {
    const {
      task,
      targetAgents,
      context = {},
      userContext,
      conversationId,
      userId,
      parentAgentId,
      parentHistoryEntryId,
    } = options;

    // Find target agents
    const agents = targetAgents
      .map(name => this.subAgentManager.getSubAgents().find(agent => agent.name === name))
      .filter(agent => agent !== undefined) as Agent<any>[];

    if (agents.length === 0) {
      throw new Error(`No valid target agents found: ${targetAgents.join(", ")}`);
    }

    // Use SubAgentManager's handoffToMultiple method
    const results = await this.subAgentManager.handoffToMultiple({
      task,
      targetAgents: agents,
      context,
      sourceAgent: this.parentAgent,
      parentAgentId,
      parentHistoryEntryId,
      userContext,
      conversationId,
      userId,
    });

    return results.map((result, index) => ({
      agentName: agents[index].name,
      response: result.result,
      conversationId: result.conversationId,
      status: result.status,
      error: result.error,
    }));
  }

  /**
   * Delegate using workflow orchestration
   */
  private async delegateUsingOrchestration(options: {
    task: string;
    targetAgents: string[];
    context?: Record<string, unknown>;
    executionMode?: "sequential" | "parallel";
    timeout?: number;
    retries?: number;
    userContext?: Map<string | symbol, unknown>;
    conversationId?: string;
    userId?: string;
    parentAgentId?: string;
    parentHistoryEntryId?: string;
  }): Promise<WorkflowExecutionResult> {
    const {
      task,
      targetAgents,
      context = {},
      executionMode = "parallel",
      timeout,
      retries,
      userContext,
      conversationId,
      userId,
      parentAgentId,
      parentHistoryEntryId,
    } = options;

    // Create workflow definition
    const workflow = this.createWorkflowFromDelegation({
      task,
      targetAgents,
      executionMode,
      timeout,
      retries,
    });

    // Register workflow temporarily
    await this.orchestrationEngine.registerWorkflow(workflow);

    try {
      // Execute workflow
      const result = await this.orchestrationEngine.executeWorkflow(
        workflow.id,
        { task, ...context },
        {
          userContext,
          conversationId,
          userId,
          parentAgentId,
          parentHistoryEntryId,
          timeout,
        }
      );

      return result;
    } finally {
      // Clean up temporary workflow
      await this.orchestrationEngine.unregisterWorkflow(workflow.id);
    }
  }

  /**
   * Register default workflows based on sub-agents
   */
  private async registerDefaultWorkflows(): Promise<void> {
    const subAgents = this.subAgentManager.getSubAgents();
    
    if (subAgents.length === 0) return;

    // Create a parallel workflow for all agents
    const parallelWorkflow: WorkflowDefinition = {
      id: "parallel_all_agents",
      name: "Parallel Execution - All Agents",
      version: "1.0.0",
      mode: "parallel",
      tasks: subAgents.map((agent, index) => ({
        id: `parallel_task_${index}`,
        name: `Execute with ${agent.name}`,
        agentName: agent.name,
        input: "{{task}}", // Template that will be replaced
        timeout: 30000, // 30 seconds
        retries: 1,
      })),
    };

    // Create a sequential workflow for all agents
    const sequentialWorkflow: WorkflowDefinition = {
      id: "sequential_all_agents",
      name: "Sequential Execution - All Agents",
      version: "1.0.0",
      mode: "sequential",
      tasks: subAgents.map((agent, index) => ({
        id: `sequential_task_${index}`,
        name: `Execute with ${agent.name}`,
        agentName: agent.name,
        input: "{{task}}", // Template that will be replaced
        timeout: 30000, // 30 seconds
        retries: 1,
      })),
    };

    await this.orchestrationEngine.registerWorkflow(parallelWorkflow);
    await this.orchestrationEngine.registerWorkflow(sequentialWorkflow);
  }

  /**
   * Create common workflow patterns
   */
  private async createCommonWorkflowPatterns(subAgents: Agent<any>[]): Promise<void> {
    if (subAgents.length < 2) return;

    // Create a pipeline workflow if we have multiple agents
    const pipelineWorkflow: WorkflowDefinition = {
      id: "agent_pipeline",
      name: "Agent Pipeline",
      version: "1.0.0",
      mode: "pipeline",
      tasks: subAgents.map((agent, index) => ({
        id: `pipeline_task_${index}`,
        name: `Pipeline Step ${index + 1}: ${agent.name}`,
        agentName: agent.name,
        input: index === 0 ? "{{task}}" : "{{pipelineData}}",
        timeout: 30000,
        retries: 1,
        dependencies: index > 0 ? [`pipeline_task_${index - 1}`] : undefined,
      })),
    };

    await this.orchestrationEngine.registerWorkflow(pipelineWorkflow);

    // Create conditional workflows if we have specific agent types
    const analysisAgents = subAgents.filter(agent => 
      agent.name.toLowerCase().includes("analy") || 
      agent.instructions.toLowerCase().includes("analy")
    );

    const processingAgents = subAgents.filter(agent => 
      agent.name.toLowerCase().includes("process") || 
      agent.instructions.toLowerCase().includes("process")
    );

    if (analysisAgents.length > 0 && processingAgents.length > 0) {
      const conditionalWorkflow: WorkflowDefinition = {
        id: "analysis_then_processing",
        name: "Analysis Then Processing",
        version: "1.0.0",
        mode: "conditional",
        tasks: [
          {
            id: "analysis_task",
            name: "Analysis Phase",
            agentName: analysisAgents[0].name,
            input: "{{task}}",
            timeout: 30000,
            retries: 1,
          },
          {
            id: "processing_task",
            name: "Processing Phase",
            agentName: processingAgents[0].name,
            input: "Process based on analysis: {{task}}",
            timeout: 30000,
            retries: 1,
            conditions: [{
              type: "status",
              taskId: "analysis_task",
              operator: "equals",
              value: "completed",
            }],
          },
        ],
      };

      await this.orchestrationEngine.registerWorkflow(conditionalWorkflow);
    }
  }

  /**
   * Create a workflow-aware delegate tool that can be used as a drop-in replacement
   */
  public createEnhancedDelegateTool(): any {
    return {
      id: "enhanced_delegate_task",
      name: "enhanced_delegate_task",
      description: "Enhanced task delegation with workflow orchestration capabilities",
      parameters: {
        type: "object",
        properties: {
          task: {
            type: "string",
            description: "The task to delegate",
          },
          targetAgents: {
            type: "array",
            items: { type: "string" },
            description: "List of agent names to delegate the task to",
          },
          context: {
            type: "object",
            description: "Additional context for the task",
          },
          useOrchestration: {
            type: "boolean",
            description: "Whether to use workflow orchestration (default: auto-detect)",
          },
          executionMode: {
            type: "string",
            enum: ["sequential", "parallel"],
            description: "Execution mode when using orchestration",
          },
          timeout: {
            type: "number",
            description: "Task timeout in milliseconds",
          },
          retries: {
            type: "number",
            description: "Number of retries for failed tasks",
          },
        },
        required: ["task", "targetAgents"],
      },
      execute: async (params: any) => {
        return this.enhancedDelegateTask(params);
      },
    };
  }
}

