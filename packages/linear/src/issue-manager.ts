import { Issue, IssueCreateInput, IssueUpdateInput } from "@linear/sdk";
import { EventEmitter } from "events";
import { LinearApiClient } from "./api-client";
import type {
  LinearConfig,
  LinearIssue,
  VoltAgentIssueInput,
  VoltAgentIssueUpdate,
  RequirementAnalysis,
  RequirementItem,
  DependencyNode,
  ProgressData,
} from "./types";

/**
 * Issue Manager for creating and managing Linear issues with hierarchical structure
 */
export class IssueManager extends EventEmitter {
  private apiClient: LinearApiClient;
  private config: LinearConfig;
  private issueTemplates: Map<string, Partial<IssueCreateInput>> = new Map();
  private dependencyGraph: Map<string, DependencyNode> = new Map();

  constructor(apiClient: LinearApiClient, config: LinearConfig) {
    super();
    this.apiClient = apiClient;
    this.config = config;
    this.setupEventListeners();
  }

  /**
   * Setup event listeners for API client events
   */
  private setupEventListeners(): void {
    this.apiClient.on("issue.created", (data) => {
      this.updateDependencyGraph(data.issue);
      this.emit("issue.created", data);
    });

    this.apiClient.on("issue.updated", (data) => {
      this.updateDependencyGraph(data.issue);
      this.emit("issue.updated", data);
    });
  }

  /**
   * Create a main issue from requirements analysis
   */
  async createMainIssue(
    title: string,
    description: string,
    options: Partial<VoltAgentIssueInput> = {}
  ): Promise<LinearIssue> {
    const issueInput: IssueCreateInput = {
      title,
      description,
      teamId: options.teamId || this.config.teamId,
      priority: this.mapPriorityToNumber(options.priority),
      assigneeId: options.assigneeId,
      labelIds: options.labelIds,
      stateId: options.stateId,
      projectId: options.projectId,
      ...options,
    };

    const issue = await this.apiClient.createIssue(issueInput);
    
    const linearIssue: LinearIssue = {
      ...issue,
      estimatedHours: options.estimatedHours,
      dependencies: options.dependencies || [],
      subIssues: [],
    };

    this.emit("main.issue.created", { issue: linearIssue });
    return linearIssue;
  }

  /**
   * Create sub-issues with proper hierarchy
   */
  async createSubIssues(
    parentIssueId: string,
    subRequirements: RequirementItem[]
  ): Promise<LinearIssue[]> {
    const subIssues: LinearIssue[] = [];

    for (const requirement of subRequirements) {
      const subIssueInput: IssueCreateInput = {
        title: requirement.title,
        description: this.formatSubIssueDescription(requirement),
        teamId: this.config.teamId,
        priority: this.mapPriorityToNumber(requirement.priority),
        parentId: parentIssueId,
      };

      const subIssue = await this.apiClient.createIssue(subIssueInput);
      
      const linearSubIssue: LinearIssue = {
        ...subIssue,
        estimatedHours: requirement.estimatedHours,
        dependencies: requirement.dependencies,
        subIssues: [],
      };

      subIssues.push(linearSubIssue);
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.emit("sub.issues.created", { 
      parentId: parentIssueId, 
      subIssues 
    });

    return subIssues;
  }

  /**
   * Generate issues from requirements analysis
   */
  async generateIssuesFromRequirements(
    analysis: RequirementAnalysis,
    projectTitle: string
  ): Promise<{
    mainIssue: LinearIssue;
    subIssues: LinearIssue[];
  }> {
    // Create main issue
    const mainIssue = await this.createMainIssue(
      projectTitle,
      this.formatMainIssueDescription(analysis),
      {
        priority: analysis.priority,
        estimatedHours: analysis.estimatedHours,
        labels: analysis.labels,
      }
    );

    // Create sub-issues
    const subIssues = await this.createSubIssues(
      mainIssue.id,
      analysis.subRequirements
    );

    // Update main issue with sub-issue references
    const updatedMainIssue: LinearIssue = {
      ...mainIssue,
      subIssues,
    };

    this.emit("issues.generated", {
      mainIssue: updatedMainIssue,
      subIssues,
      analysis,
    });

    return {
      mainIssue: updatedMainIssue,
      subIssues,
    };
  }

  /**
   * Update issue with VoltAgent extensions
   */
  async updateIssue(
    issueId: string,
    update: VoltAgentIssueUpdate
  ): Promise<LinearIssue> {
    const issueUpdate: IssueUpdateInput = {
      ...update,
      priority: update.priority ? this.mapPriorityToNumber(update.priority) : undefined,
    };

    const updatedIssue = await this.apiClient.updateIssue(issueId, issueUpdate);
    
    const linearIssue: LinearIssue = {
      ...updatedIssue,
      estimatedHours: update.estimatedHours,
      dependencies: update.dependencies,
    };

    return linearIssue;
  }

  /**
   * Get issue with sub-issues
   */
  async getIssueWithSubIssues(issueId: string): Promise<LinearIssue | null> {
    const issue = await this.apiClient.getIssue(issueId);
    if (!issue) return null;

    // Get sub-issues (children)
    const subIssues = await this.apiClient.getIssues({
      // Note: Linear SDK might need specific filtering for parent-child relationships
      // This is a simplified implementation
    });

    const linearIssue: LinearIssue = {
      ...issue,
      subIssues: subIssues.filter(sub => sub.parent?.id === issueId) as LinearIssue[],
    };

    return linearIssue;
  }

  /**
   * Create issue template
   */
  createIssueTemplate(
    name: string,
    template: Partial<IssueCreateInput>
  ): void {
    this.issueTemplates.set(name, template);
    this.emit("template.created", { name, template });
  }

  /**
   * Create issue from template
   */
  async createIssueFromTemplate(
    templateName: string,
    overrides: Partial<VoltAgentIssueInput> = {}
  ): Promise<LinearIssue> {
    const template = this.issueTemplates.get(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    const issueInput: IssueCreateInput = {
      ...template,
      ...overrides,
      teamId: overrides.teamId || template.teamId || this.config.teamId,
    };

    const issue = await this.apiClient.createIssue(issueInput);
    
    const linearIssue: LinearIssue = {
      ...issue,
      estimatedHours: overrides.estimatedHours,
      dependencies: overrides.dependencies || [],
    };

    this.emit("issue.created.from.template", {
      templateName,
      issue: linearIssue,
    });

    return linearIssue;
  }

  /**
   * Track issue status changes
   */
  async trackIssueStatus(issueId: string): Promise<void> {
    const issue = await this.apiClient.getIssue(issueId);
    if (!issue) return;

    const state = await issue.state;
    
    this.emit("issue.status.tracked", {
      issueId,
      status: state.name,
      timestamp: new Date(),
    });

    // Check if issue is completed
    if (state.type === "completed") {
      this.emit("issue.completed", {
        issue,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Calculate progress for a set of issues
   */
  async calculateProgress(issueIds: string[]): Promise<ProgressData> {
    const issues = await Promise.all(
      issueIds.map(id => this.apiClient.getIssue(id))
    );

    const validIssues = issues.filter(issue => issue !== null) as Issue[];
    const totalIssues = validIssues.length;

    let completedIssues = 0;
    let inProgressIssues = 0;
    let blockedIssues = 0;

    for (const issue of validIssues) {
      const state = await issue.state;
      
      switch (state.type) {
        case "completed":
          completedIssues++;
          break;
        case "started":
          inProgressIssues++;
          break;
        case "backlog":
          if (state.name.toLowerCase().includes("blocked")) {
            blockedIssues++;
          }
          break;
      }
    }

    const completionPercentage = totalIssues > 0 
      ? (completedIssues / totalIssues) * 100 
      : 0;

    // Simple velocity calculation (issues completed per week)
    // This would need historical data for accurate calculation
    const velocity = completedIssues; // Simplified

    const progressData: ProgressData = {
      totalIssues,
      completedIssues,
      inProgressIssues,
      blockedIssues,
      completionPercentage,
      velocity,
    };

    this.emit("progress.calculated", progressData);
    return progressData;
  }

  /**
   * Build dependency graph
   */
  buildDependencyGraph(issues: LinearIssue[]): Map<string, DependencyNode> {
    const graph = new Map<string, DependencyNode>();

    // Initialize nodes
    for (const issue of issues) {
      graph.set(issue.id, {
        issueId: issue.id,
        title: issue.title,
        status: issue.state?.name || "unknown",
        dependencies: issue.dependencies || [],
        dependents: [],
        depth: 0,
      });
    }

    // Build dependency relationships
    for (const issue of issues) {
      const node = graph.get(issue.id);
      if (!node) continue;

      for (const depId of issue.dependencies || []) {
        const depNode = graph.get(depId);
        if (depNode) {
          depNode.dependents.push(issue.id);
        }
      }
    }

    // Calculate depths
    this.calculateDependencyDepths(graph);

    this.dependencyGraph = graph;
    this.emit("dependency.graph.built", { graph });
    
    return graph;
  }

  /**
   * Detect circular dependencies
   */
  detectCircularDependencies(issues: LinearIssue[]): string[][] {
    const graph = this.buildDependencyGraph(issues);
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string, path: string[]): void => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = path.indexOf(nodeId);
        cycles.push(path.slice(cycleStart));
        return;
      }

      if (visited.has(nodeId)) return;

      visited.add(nodeId);
      recursionStack.add(nodeId);
      path.push(nodeId);

      const node = graph.get(nodeId);
      if (node) {
        for (const depId of node.dependencies) {
          dfs(depId, [...path]);
        }
      }

      recursionStack.delete(nodeId);
    };

    for (const [nodeId] of graph) {
      if (!visited.has(nodeId)) {
        dfs(nodeId, []);
      }
    }

    if (cycles.length > 0) {
      this.emit("circular.dependencies.detected", { cycles });
    }

    return cycles;
  }

  /**
   * Private helper methods
   */

  private mapPriorityToNumber(priority?: string): number | undefined {
    if (!priority) return undefined;
    
    const priorityMap: Record<string, number> = {
      low: 1,
      medium: 2,
      high: 3,
      urgent: 4,
    };

    return priorityMap[priority.toLowerCase()] || 2;
  }

  private formatMainIssueDescription(analysis: RequirementAnalysis): string {
    return `
## Project Overview

${analysis.mainRequirements.map(req => `- ${req.title}`).join('\n')}

## Complexity Analysis
- **Complexity Score**: ${analysis.complexity}/10
- **Estimated Hours**: ${analysis.estimatedHours}
- **Priority**: ${analysis.priority}

## Sub-Requirements
${analysis.subRequirements.length} sub-tasks will be created as child issues.

## Labels
${analysis.labels.join(', ')}
    `.trim();
  }

  private formatSubIssueDescription(requirement: RequirementItem): string {
    return `
## Description
${requirement.description}

## Acceptance Criteria
${requirement.acceptanceCriteria.map(criteria => `- [ ] ${criteria}`).join('\n')}

## Estimated Hours
${requirement.estimatedHours}

## Dependencies
${requirement.dependencies.length > 0 
  ? requirement.dependencies.map(dep => `- ${dep}`).join('\n')
  : 'None'
}

## Labels
${requirement.labels.join(', ')}
    `.trim();
  }

  private updateDependencyGraph(issue: Issue): void {
    // Update the dependency graph when issues are created/updated
    // This is a simplified implementation
    if (this.dependencyGraph.has(issue.id)) {
      const node = this.dependencyGraph.get(issue.id)!;
      node.status = issue.state?.name || "unknown";
    }
  }

  private calculateDependencyDepths(graph: Map<string, DependencyNode>): void {
    const visited = new Set<string>();

    const calculateDepth = (nodeId: string): number => {
      if (visited.has(nodeId)) return 0;
      visited.add(nodeId);

      const node = graph.get(nodeId);
      if (!node || node.dependencies.length === 0) {
        return 0;
      }

      let maxDepth = 0;
      for (const depId of node.dependencies) {
        const depDepth = calculateDepth(depId);
        maxDepth = Math.max(maxDepth, depDepth + 1);
      }

      node.depth = maxDepth;
      return maxDepth;
    };

    for (const [nodeId] of graph) {
      calculateDepth(nodeId);
    }
  }
}

