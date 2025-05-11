"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRegistry = void 0;
const events_1 = require("../events");
/**
 * Registry to manage and track agents
 */
class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.isInitialized = false;
    /**
     * Track parent-child relationships between agents (child -> parents)
     */
    this.agentRelationships = new Map();
  }
  /**
   * Get the singleton instance of AgentRegistry
   */
  static getInstance() {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }
  /**
   * Initialize the registry
   */
  initialize() {
    if (!this.isInitialized) {
      this.isInitialized = true;
    }
  }
  /**
   * Register a new agent
   */
  registerAgent(agent) {
    if (!this.isInitialized) {
      this.initialize();
    }
    this.agents.set(agent.id, agent);
    // Emit agent registered event
    events_1.AgentEventEmitter.getInstance().emitAgentRegistered(agent.id);
  }
  /**
   * Get an agent by ID
   */
  getAgent(id) {
    return this.agents.get(id);
  }
  /**
   * Get all registered agents
   */
  getAllAgents() {
    return Array.from(this.agents.values());
  }
  /**
   * Register a parent-child relationship between agents
   * @param parentId ID of the parent agent
   * @param childId ID of the child agent (sub-agent)
   */
  registerSubAgent(parentId, childId) {
    if (!this.agentRelationships.has(childId)) {
      this.agentRelationships.set(childId, []);
    }
    const parents = this.agentRelationships.get(childId);
    if (!parents.includes(parentId)) {
      parents.push(parentId);
    }
  }
  /**
   * Remove a parent-child relationship
   * @param parentId ID of the parent agent
   * @param childId ID of the child agent
   */
  unregisterSubAgent(parentId, childId) {
    if (this.agentRelationships.has(childId)) {
      const parents = this.agentRelationships.get(childId);
      const index = parents.indexOf(parentId);
      if (index !== -1) {
        parents.splice(index, 1);
      }
      // Remove the entry if there are no more parents
      if (parents.length === 0) {
        this.agentRelationships.delete(childId);
      }
    }
  }
  /**
   * Get all parent agent IDs for a given child agent
   * @param childId ID of the child agent
   * @returns Array of parent agent IDs
   */
  getParentAgentIds(childId) {
    return this.agentRelationships.get(childId) || [];
  }
  /**
   * Clear all parent-child relationships for an agent when it's removed
   * @param agentId ID of the agent being removed
   */
  clearAgentRelationships(agentId) {
    // Remove it as a child from any parents
    this.agentRelationships.delete(agentId);
    // Remove it as a parent from any children
    for (const [childId, parents] of this.agentRelationships.entries()) {
      const index = parents.indexOf(agentId);
      if (index !== -1) {
        parents.splice(index, 1);
        // Remove the entry if there are no more parents
        if (parents.length === 0) {
          this.agentRelationships.delete(childId);
        }
      }
    }
  }
  /**
   * Remove an agent by ID
   */
  removeAgent(id) {
    const result = this.agents.delete(id);
    if (result) {
      // Clear agent relationships
      this.clearAgentRelationships(id);
      // Emit agent unregistered event
      events_1.AgentEventEmitter.getInstance().emitAgentUnregistered(id);
    }
    return result;
  }
  /**
   * Get agent count
   */
  getAgentCount() {
    return this.agents.size;
  }
  /**
   * Check if registry is initialized
   */
  isRegistryInitialized() {
    return this.isInitialized;
  }
}
exports.AgentRegistry = AgentRegistry;
AgentRegistry.instance = null;
//# sourceMappingURL=registry.js.map
