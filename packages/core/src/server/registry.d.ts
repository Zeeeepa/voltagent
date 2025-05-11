import type { Agent } from "../agent";
/**
 * Registry to manage and track agents
 */
export declare class AgentRegistry {
  private static instance;
  private agents;
  private isInitialized;
  /**
   * Track parent-child relationships between agents (child -> parents)
   */
  private agentRelationships;
  private constructor();
  /**
   * Get the singleton instance of AgentRegistry
   */
  static getInstance(): AgentRegistry;
  /**
   * Initialize the registry
   */
  initialize(): void;
  /**
   * Register a new agent
   */
  registerAgent(agent: Agent<any>): void;
  /**
   * Get an agent by ID
   */
  getAgent(id: string): Agent<any> | undefined;
  /**
   * Get all registered agents
   */
  getAllAgents(): Agent<any>[];
  /**
   * Register a parent-child relationship between agents
   * @param parentId ID of the parent agent
   * @param childId ID of the child agent (sub-agent)
   */
  registerSubAgent(parentId: string, childId: string): void;
  /**
   * Remove a parent-child relationship
   * @param parentId ID of the parent agent
   * @param childId ID of the child agent
   */
  unregisterSubAgent(parentId: string, childId: string): void;
  /**
   * Get all parent agent IDs for a given child agent
   * @param childId ID of the child agent
   * @returns Array of parent agent IDs
   */
  getParentAgentIds(childId: string): string[];
  /**
   * Clear all parent-child relationships for an agent when it's removed
   * @param agentId ID of the agent being removed
   */
  clearAgentRelationships(agentId: string): void;
  /**
   * Remove an agent by ID
   */
  removeAgent(id: string): boolean;
  /**
   * Get agent count
   */
  getAgentCount(): number;
  /**
   * Check if registry is initialized
   */
  isRegistryInitialized(): boolean;
}
