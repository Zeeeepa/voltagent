/**
 * Agent Manager for handling multiple agents asynchronously
 */

import { Agent, AgentConfig, AgentResponse } from './agent';

export class AgentManager {
  private agents: Map<string, Agent> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  /**
   * Create and register a new agent
   */
  async createAgent(config: AgentConfig): Promise<Agent> {
    const agent = new Agent(config);
    await agent.initialize();
    this.agents.set(config.name, agent);
    this.emit('agentCreated', { agent: config.name });
    return agent;
  }

  /**
   * Get an agent by name
   */
  getAgent(name: string): Agent | undefined {
    return this.agents.get(name);
  }

  /**
   * Process request across multiple agents concurrently
   */
  async processAcrossAgents(
    agentNames: string[],
    input: string
  ): Promise<Map<string, AgentResponse>> {
    const results = new Map<string, AgentResponse>();
    
    const promises = agentNames.map(async (name) => {
      const agent = this.agents.get(name);
      if (!agent) {
        throw new Error(`Agent ${name} not found`);
      }
      
      const response = await agent.processRequest(input);
      results.set(name, response);
      return { name, response };
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Health check all agents
   */
  async healthCheckAll(): Promise<Map<string, { healthy: boolean; latency: number }>> {
    const results = new Map();
    
    const promises = Array.from(this.agents.entries()).map(async ([name, agent]) => {
      const health = await agent.healthCheck();
      results.set(name, health);
      return { name, health };
    });

    await Promise.allSettled(promises);
    return results;
  }

  /**
   * Cleanup all agents
   */
  async cleanup(): Promise<void> {
    const cleanupPromises = Array.from(this.agents.values()).map(agent => 
      agent.cleanup()
    );
    
    await Promise.allSettled(cleanupPromises);
    this.agents.clear();
    this.eventListeners.clear();
  }

  /**
   * Event system for async notifications
   */
  on(event: string, listener: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(listener);
  }

  private emit(event: string, data: any): void {
    const listeners = this.eventListeners.get(event) || [];
    listeners.forEach(listener => {
      // Async event handling
      setImmediate(() => listener(data));
    });
  }

  get agentCount(): number {
    return this.agents.size;
  }

  get agentNames(): string[] {
    return Array.from(this.agents.keys());
  }
}

