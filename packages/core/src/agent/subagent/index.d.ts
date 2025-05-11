import type { Agent } from "../index";
import type { BaseTool } from "../providers";
import type { AgentHandoffOptions, AgentHandoffResult } from "../types";
/**
 * SubAgentManager - Manages sub-agents and delegation functionality for an Agent
 */
export declare class SubAgentManager {
  /**
   * The name of the agent that owns this sub-agent manager
   */
  private agentName;
  /**
   * Sub-agents that the parent agent can delegate tasks to
   */
  private subAgents;
  /**
   * Creates a new SubAgentManager instance
   *
   * @param agentName - The name of the agent that owns this sub-agent manager
   * @param subAgents - Initial sub-agents to add
   */
  constructor(agentName: string, subAgents?: Agent<any>[]);
  /**
   * Add a sub-agent that the parent agent can delegate tasks to
   */
  addSubAgent(agent: Agent<any>): void;
  /**
   * Remove a sub-agent
   */
  removeSubAgent(agentId: string): void;
  /**
   * Unregister all sub-agents when parent agent is destroyed
   */
  unregisterAllSubAgents(): void;
  /**
   * Get all sub-agents
   */
  getSubAgents(): Agent<any>[];
  /**
   * Calculate maximum number of steps based on sub-agents
   * More sub-agents means more potential steps
   */
  calculateMaxSteps(): number;
  /**
   * Generate enhanced system message for supervisor role
   * @param baseDescription - The base description of the agent
   * @param agentsMemory - Optional string containing formatted memory from previous agent interactions
   */
  generateSupervisorSystemMessage(baseInstructions: string, agentsMemory?: string): string;
  /**
   * Check if the agent has sub-agents
   */
  hasSubAgents(): boolean;
  /**
   * Hand off a task to another agent
   */
  handoffTask(options: AgentHandoffOptions): Promise<AgentHandoffResult>;
  /**
   * Hand off a task to multiple agents in parallel
   */
  handoffToMultiple(
    options: Omit<AgentHandoffOptions, "targetAgent"> & {
      targetAgents: Agent<any>[];
      userContext?: Map<string | symbol, unknown>;
    },
  ): Promise<AgentHandoffResult[]>;
  /**
   * Create a delegate tool for sub-agents
   */
  createDelegateTool(options?: Record<string, any>): BaseTool;
  /**
   * Get sub-agent details for API exposure
   */
  getSubAgentDetails(): Array<Record<string, any>>;
}
