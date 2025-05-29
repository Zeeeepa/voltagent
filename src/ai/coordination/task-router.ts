/**
 * AI Task Router
 * 
 * Intelligent task routing between Codegen SDK and Claude Code
 */

export interface TaskRequest {
  id: string;
  type: TaskType;
  description: string;
  context?: any;
  priority: TaskPriority;
  requirements?: TaskRequirements;
  metadata?: Record<string, any>;
}

export enum TaskType {
  CODE_GENERATION = 'code_generation',
  CODE_MODIFICATION = 'code_modification',
  CODE_REVIEW = 'code_review',
  DEBUGGING = 'debugging',
  REPOSITORY_OPERATION = 'repository_operation',
  PULL_REQUEST_MANAGEMENT = 'pull_request_management',
  ISSUE_MANAGEMENT = 'issue_management',
  DOCUMENTATION = 'documentation',
  TESTING = 'testing',
  REFACTORING = 'refactoring'
}

export enum TaskPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

export enum AgentType {
  CODEGEN_SDK = 'codegen_sdk',
  CLAUDE_CODE = 'claude_code'
}

export interface TaskRequirements {
  codebaseAccess?: boolean;
  repositoryAccess?: boolean;
  internetAccess?: boolean;
  fileSystemAccess?: boolean;
  apiAccess?: boolean;
  complexity?: 'simple' | 'medium' | 'complex';
  estimatedDuration?: number; // in minutes
}

export interface AgentCapability {
  type: AgentType;
  supportedTaskTypes: TaskType[];
  strengths: string[];
  limitations: string[];
  maxComplexity: 'simple' | 'medium' | 'complex';
  averageResponseTime: number; // in seconds
  currentLoad: number; // 0-100
  available: boolean;
}

export interface RoutingDecision {
  selectedAgent: AgentType;
  confidence: number; // 0-1
  reasoning: string;
  fallbackAgent?: AgentType;
  estimatedDuration?: number;
}

export class TaskRouter {
  private agents: Map<AgentType, AgentCapability> = new Map();
  private routingHistory: Array<{
    taskId: string;
    decision: RoutingDecision;
    actualDuration?: number;
    success: boolean;
    timestamp: Date;
  }> = [];

  constructor() {
    this.initializeAgentCapabilities();
  }

  /**
   * Initialize agent capabilities
   */
  private initializeAgentCapabilities(): void {
    // Codegen SDK capabilities
    this.agents.set(AgentType.CODEGEN_SDK, {
      type: AgentType.CODEGEN_SDK,
      supportedTaskTypes: [
        TaskType.CODE_GENERATION,
        TaskType.CODE_MODIFICATION,
        TaskType.CODE_REVIEW,
        TaskType.REPOSITORY_OPERATION,
        TaskType.PULL_REQUEST_MANAGEMENT,
        TaskType.ISSUE_MANAGEMENT,
        TaskType.DEBUGGING
      ],
      strengths: [
        'Large-scale code generation',
        'Repository management',
        'GitHub integration',
        'Automated workflows',
        'Multi-file operations',
        'Complex refactoring'
      ],
      limitations: [
        'API rate limits',
        'Network dependency',
        'Limited real-time interaction'
      ],
      maxComplexity: 'complex',
      averageResponseTime: 30,
      currentLoad: 0,
      available: true
    });

    // Claude Code capabilities
    this.agents.set(AgentType.CLAUDE_CODE, {
      type: AgentType.CLAUDE_CODE,
      supportedTaskTypes: [
        TaskType.CODE_GENERATION,
        TaskType.CODE_MODIFICATION,
        TaskType.CODE_REVIEW,
        TaskType.DEBUGGING,
        TaskType.DOCUMENTATION,
        TaskType.TESTING,
        TaskType.REFACTORING
      ],
      strengths: [
        'Real-time interaction',
        'Context understanding',
        'Code explanation',
        'Quick iterations',
        'Local file access',
        'Interactive debugging'
      ],
      limitations: [
        'Single-session context',
        'Limited repository operations',
        'No direct GitHub integration'
      ],
      maxComplexity: 'medium',
      averageResponseTime: 5,
      currentLoad: 0,
      available: true
    });
  }

  /**
   * Route task to appropriate agent
   */
  async routeTask(task: TaskRequest): Promise<RoutingDecision> {
    const decision = this.analyzeTask(task);
    
    // Record routing decision
    this.routingHistory.push({
      taskId: task.id,
      decision,
      success: false, // Will be updated later
      timestamp: new Date()
    });

    return decision;
  }

  /**
   * Analyze task and determine best agent
   */
  private analyzeTask(task: TaskRequest): RoutingDecision {
    const scores = new Map<AgentType, number>();
    const reasoning: string[] = [];

    for (const [agentType, capability] of this.agents) {
      if (!capability.available) {
        scores.set(agentType, 0);
        continue;
      }

      let score = 0;

      // Task type compatibility
      if (capability.supportedTaskTypes.includes(task.type)) {
        score += 30;
        reasoning.push(`${agentType} supports ${task.type}`);
      }

      // Complexity matching
      if (task.requirements?.complexity) {
        const complexityScore = this.getComplexityScore(
          task.requirements.complexity,
          capability.maxComplexity
        );
        score += complexityScore;
        reasoning.push(`${agentType} complexity match: ${complexityScore}/20`);
      }

      // Load balancing
      const loadPenalty = capability.currentLoad * 0.3;
      score -= loadPenalty;
      reasoning.push(`${agentType} load penalty: -${loadPenalty.toFixed(1)}`);

      // Task-specific scoring
      score += this.getTaskSpecificScore(task, capability);

      // Priority boost
      if (task.priority === TaskPriority.CRITICAL) {
        score += 10;
      } else if (task.priority === TaskPriority.HIGH) {
        score += 5;
      }

      scores.set(agentType, score);
    }

    // Select best agent
    const sortedAgents = Array.from(scores.entries())
      .sort(([, a], [, b]) => b - a);

    const [selectedAgent, bestScore] = sortedAgents[0];
    const [fallbackAgent] = sortedAgents[1] || [undefined];

    const confidence = Math.min(bestScore / 100, 1);

    return {
      selectedAgent,
      confidence,
      reasoning: reasoning.join('; '),
      fallbackAgent,
      estimatedDuration: this.estimateDuration(task, selectedAgent)
    };
  }

  /**
   * Get complexity matching score
   */
  private getComplexityScore(
    taskComplexity: string,
    agentMaxComplexity: string
  ): number {
    const complexityLevels = { simple: 1, medium: 2, complex: 3 };
    const taskLevel = complexityLevels[taskComplexity as keyof typeof complexityLevels];
    const agentLevel = complexityLevels[agentMaxComplexity as keyof typeof complexityLevels];

    if (agentLevel >= taskLevel) {
      return 20; // Perfect match or overkill
    } else {
      return Math.max(0, 20 - (taskLevel - agentLevel) * 10); // Penalty for insufficient capability
    }
  }

  /**
   * Get task-specific scoring
   */
  private getTaskSpecificScore(task: TaskRequest, capability: AgentCapability): number {
    let score = 0;

    switch (task.type) {
      case TaskType.REPOSITORY_OPERATION:
      case TaskType.PULL_REQUEST_MANAGEMENT:
      case TaskType.ISSUE_MANAGEMENT:
        if (capability.type === AgentType.CODEGEN_SDK) {
          score += 25; // Codegen SDK is better for repository operations
        }
        break;

      case TaskType.CODE_REVIEW:
      case TaskType.DEBUGGING:
        if (task.requirements?.codebaseAccess) {
          score += capability.type === AgentType.CODEGEN_SDK ? 15 : 10;
        } else {
          score += capability.type === AgentType.CLAUDE_CODE ? 15 : 10;
        }
        break;

      case TaskType.DOCUMENTATION:
      case TaskType.TESTING:
        if (capability.type === AgentType.CLAUDE_CODE) {
          score += 15; // Claude Code is better for documentation and testing
        }
        break;

      case TaskType.CODE_GENERATION:
        if (task.requirements?.complexity === 'complex') {
          score += capability.type === AgentType.CODEGEN_SDK ? 20 : 5;
        } else {
          score += capability.type === AgentType.CLAUDE_CODE ? 15 : 10;
        }
        break;
    }

    return score;
  }

  /**
   * Estimate task duration
   */
  private estimateDuration(task: TaskRequest, agentType: AgentType): number {
    const agent = this.agents.get(agentType);
    if (!agent) return 0;

    let baseDuration = agent.averageResponseTime;

    // Adjust based on complexity
    if (task.requirements?.complexity === 'complex') {
      baseDuration *= 3;
    } else if (task.requirements?.complexity === 'medium') {
      baseDuration *= 2;
    }

    // Adjust based on task type
    switch (task.type) {
      case TaskType.REPOSITORY_OPERATION:
      case TaskType.PULL_REQUEST_MANAGEMENT:
        baseDuration *= 2;
        break;
      case TaskType.CODE_GENERATION:
        if (task.requirements?.complexity === 'complex') {
          baseDuration *= 1.5;
        }
        break;
    }

    return Math.round(baseDuration);
  }

  /**
   * Update agent load
   */
  updateAgentLoad(agentType: AgentType, load: number): void {
    const agent = this.agents.get(agentType);
    if (agent) {
      agent.currentLoad = Math.max(0, Math.min(100, load));
    }
  }

  /**
   * Update agent availability
   */
  updateAgentAvailability(agentType: AgentType, available: boolean): void {
    const agent = this.agents.get(agentType);
    if (agent) {
      agent.available = available;
    }
  }

  /**
   * Record task completion for learning
   */
  recordTaskCompletion(
    taskId: string,
    success: boolean,
    actualDuration?: number
  ): void {
    const historyEntry = this.routingHistory.find(h => h.taskId === taskId);
    if (historyEntry) {
      historyEntry.success = success;
      historyEntry.actualDuration = actualDuration;
    }
  }

  /**
   * Get routing statistics
   */
  getRoutingStats(): {
    totalTasks: number;
    successRate: number;
    averageAccuracy: number;
    agentUtilization: Record<string, number>;
  } {
    const totalTasks = this.routingHistory.length;
    const successfulTasks = this.routingHistory.filter(h => h.success).length;
    const successRate = totalTasks > 0 ? successfulTasks / totalTasks : 0;

    const agentCounts = new Map<AgentType, number>();
    for (const entry of this.routingHistory) {
      const count = agentCounts.get(entry.decision.selectedAgent) || 0;
      agentCounts.set(entry.decision.selectedAgent, count + 1);
    }

    const agentUtilization: Record<string, number> = {};
    for (const [agent, count] of agentCounts) {
      agentUtilization[agent] = totalTasks > 0 ? count / totalTasks : 0;
    }

    const averageAccuracy = this.routingHistory.reduce(
      (sum, entry) => sum + entry.decision.confidence,
      0
    ) / totalTasks;

    return {
      totalTasks,
      successRate,
      averageAccuracy,
      agentUtilization
    };
  }

  /**
   * Get agent capabilities
   */
  getAgentCapabilities(): Map<AgentType, AgentCapability> {
    return new Map(this.agents);
  }
}

