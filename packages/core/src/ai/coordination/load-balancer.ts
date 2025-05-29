import { EventEmitter } from "events";
import type { Agent } from "../../agent";
import type {
  LoadBalancingStrategy,
  AgentAssignment,
  PerformanceMetrics,
  OrchestratorConfig,
} from "../../orchestrator/types";

/**
 * Agent load information
 */
interface AgentLoad {
  agentId: string;
  agent: Agent<any>;
  currentLoad: number;
  maxCapacity: number;
  averageResponseTime: number;
  successRate: number;
  totalRequests: number;
  activeRequests: number;
  lastRequestTime: Date;
  weight: number;
  isHealthy: boolean;
  capabilities: string[];
  metadata?: Record<string, any>;
}

/**
 * Load balancing result
 */
interface LoadBalancingResult {
  selectedAgent: Agent<any> | null;
  reason: string;
  loadDistribution: Record<string, number>;
  estimatedWaitTime?: number;
}

/**
 * Queue entry for pending requests
 */
interface QueueEntry {
  id: string;
  assignment: AgentAssignment;
  timestamp: Date;
  priority: number;
  requirements?: string[];
  timeout?: number;
}

/**
 * Load Balancer for AI agent workload distribution and resource allocation optimization
 */
export class LoadBalancer extends EventEmitter {
  private agents: Map<string, AgentLoad> = new Map();
  private requestQueue: QueueEntry[] = [];
  private strategy: LoadBalancingStrategy;
  private config: OrchestratorConfig;
  private roundRobinIndex = 0;
  private isRunning = false;
  private monitoringInterval?: NodeJS.Timeout;
  private queueProcessingInterval?: NodeJS.Timeout;

  constructor(strategy: LoadBalancingStrategy, config: OrchestratorConfig) {
    super();
    this.strategy = strategy;
    this.config = config;
  }

  /**
   * Start the load balancer
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.startMonitoring();
    this.startQueueProcessing();
    
    this.emit("load_balancer:started", { strategy: this.strategy });
  }

  /**
   * Stop the load balancer
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    if (this.queueProcessingInterval) {
      clearInterval(this.queueProcessingInterval);
      this.queueProcessingInterval = undefined;
    }

    this.emit("load_balancer:stopped");
  }

  /**
   * Register an agent with the load balancer
   */
  public registerAgent(
    agent: Agent<any>,
    options: {
      maxCapacity?: number;
      weight?: number;
      capabilities?: string[];
    } = {}
  ): void {
    const agentLoad: AgentLoad = {
      agentId: agent.id,
      agent,
      currentLoad: 0,
      maxCapacity: options.maxCapacity || 10,
      averageResponseTime: 0,
      successRate: 1.0,
      totalRequests: 0,
      activeRequests: 0,
      lastRequestTime: new Date(),
      weight: options.weight || 1,
      isHealthy: true,
      capabilities: options.capabilities || this.extractAgentCapabilities(agent),
    };

    this.agents.set(agent.id, agentLoad);
    this.emit("agent:registered", { agentId: agent.id, capabilities: agentLoad.capabilities });
  }

  /**
   * Unregister an agent from the load balancer
   */
  public unregisterAgent(agentId: string): void {
    const agentLoad = this.agents.get(agentId);
    if (agentLoad) {
      this.agents.delete(agentId);
      this.emit("agent:unregistered", { agentId });
    }
  }

  /**
   * Select the best agent for a request
   */
  public selectAgent(assignment: AgentAssignment): LoadBalancingResult {
    const availableAgents = this.getAvailableAgents(assignment.requirements);
    
    if (availableAgents.length === 0) {
      return {
        selectedAgent: null,
        reason: "No available agents",
        loadDistribution: this.getLoadDistribution(),
      };
    }

    let selectedAgent: Agent<any>;
    let reason: string;

    switch (this.strategy) {
      case "round_robin":
        selectedAgent = this.selectRoundRobin(availableAgents);
        reason = "Round robin selection";
        break;
      case "least_connections":
        selectedAgent = this.selectLeastConnections(availableAgents);
        reason = "Least connections selection";
        break;
      case "weighted":
        selectedAgent = this.selectWeighted(availableAgents);
        reason = "Weighted selection";
        break;
      case "performance_based":
        selectedAgent = this.selectPerformanceBased(availableAgents);
        reason = "Performance-based selection";
        break;
      default:
        selectedAgent = availableAgents[0].agent;
        reason = "Default selection";
    }

    return {
      selectedAgent,
      reason,
      loadDistribution: this.getLoadDistribution(),
      estimatedWaitTime: this.calculateEstimatedWaitTime(selectedAgent.id),
    };
  }

  /**
   * Add a request to the queue
   */
  public queueRequest(assignment: AgentAssignment, timeout?: number): string {
    const queueEntry: QueueEntry = {
      id: this.generateRequestId(),
      assignment,
      timestamp: new Date(),
      priority: assignment.priority || 1,
      requirements: assignment.requirements,
      timeout,
    };

    // Insert based on priority
    const insertIndex = this.findInsertIndex(queueEntry);
    this.requestQueue.splice(insertIndex, 0, queueEntry);

    this.emit("request:queued", {
      requestId: queueEntry.id,
      queuePosition: insertIndex,
      queueSize: this.requestQueue.length,
    });

    return queueEntry.id;
  }

  /**
   * Remove a request from the queue
   */
  public dequeueRequest(requestId: string): boolean {
    const index = this.requestQueue.findIndex(entry => entry.id === requestId);
    if (index > -1) {
      this.requestQueue.splice(index, 1);
      this.emit("request:dequeued", { requestId });
      return true;
    }
    return false;
  }

  /**
   * Update agent load after request completion
   */
  public updateAgentLoad(
    agentId: string,
    metrics: {
      responseTime: number;
      success: boolean;
      requestSize?: number;
    }
  ): void {
    const agentLoad = this.agents.get(agentId);
    if (!agentLoad) {
      return;
    }

    // Update metrics
    agentLoad.totalRequests++;
    agentLoad.activeRequests = Math.max(0, agentLoad.activeRequests - 1);
    agentLoad.currentLoad = agentLoad.activeRequests / agentLoad.maxCapacity;
    agentLoad.lastRequestTime = new Date();

    // Update average response time
    if (agentLoad.averageResponseTime === 0) {
      agentLoad.averageResponseTime = metrics.responseTime;
    } else {
      agentLoad.averageResponseTime = 
        (agentLoad.averageResponseTime * 0.8) + (metrics.responseTime * 0.2);
    }

    // Update success rate
    const successCount = Math.round(agentLoad.successRate * (agentLoad.totalRequests - 1));
    const newSuccessCount = successCount + (metrics.success ? 1 : 0);
    agentLoad.successRate = newSuccessCount / agentLoad.totalRequests;

    this.emit("agent:load_updated", {
      agentId,
      currentLoad: agentLoad.currentLoad,
      averageResponseTime: agentLoad.averageResponseTime,
      successRate: agentLoad.successRate,
    });
  }

  /**
   * Update agent health status
   */
  public updateAgentHealth(agentId: string, isHealthy: boolean): void {
    const agentLoad = this.agents.get(agentId);
    if (agentLoad) {
      agentLoad.isHealthy = isHealthy;
      this.emit("agent:health_updated", { agentId, isHealthy });
    }
  }

  /**
   * Get load balancing statistics
   */
  public getStats(): {
    totalAgents: number;
    healthyAgents: number;
    totalRequests: number;
    queueSize: number;
    averageLoad: number;
    loadDistribution: Record<string, number>;
    strategy: LoadBalancingStrategy;
  } {
    const healthyAgents = Array.from(this.agents.values()).filter(a => a.isHealthy);
    const totalRequests = Array.from(this.agents.values()).reduce((sum, a) => sum + a.totalRequests, 0);
    const averageLoad = healthyAgents.length > 0 
      ? healthyAgents.reduce((sum, a) => sum + a.currentLoad, 0) / healthyAgents.length 
      : 0;

    return {
      totalAgents: this.agents.size,
      healthyAgents: healthyAgents.length,
      totalRequests,
      queueSize: this.requestQueue.length,
      averageLoad,
      loadDistribution: this.getLoadDistribution(),
      strategy: this.strategy,
    };
  }

  /**
   * Get queue statistics
   */
  public getQueueStats(): {
    size: number;
    averageWaitTime: number;
    oldestRequest: Date | null;
    priorityDistribution: Record<number, number>;
  } {
    const priorityDistribution: Record<number, number> = {};
    let oldestRequest: Date | null = null;

    for (const entry of this.requestQueue) {
      priorityDistribution[entry.priority] = (priorityDistribution[entry.priority] || 0) + 1;
      if (!oldestRequest || entry.timestamp < oldestRequest) {
        oldestRequest = entry.timestamp;
      }
    }

    const averageWaitTime = oldestRequest 
      ? Date.now() - oldestRequest.getTime() 
      : 0;

    return {
      size: this.requestQueue.length,
      averageWaitTime,
      oldestRequest,
      priorityDistribution,
    };
  }

  /**
   * Change load balancing strategy
   */
  public setStrategy(strategy: LoadBalancingStrategy): void {
    this.strategy = strategy;
    this.roundRobinIndex = 0; // Reset round robin index
    this.emit("strategy:changed", { strategy });
  }

  /**
   * Get available agents that meet requirements
   */
  private getAvailableAgents(requirements?: string[]): AgentLoad[] {
    return Array.from(this.agents.values()).filter(agentLoad => {
      // Check if agent is healthy
      if (!agentLoad.isHealthy) {
        return false;
      }

      // Check if agent has capacity
      if (agentLoad.currentLoad >= 1.0) {
        return false;
      }

      // Check if agent meets requirements
      if (requirements && requirements.length > 0) {
        return requirements.every(req => agentLoad.capabilities.includes(req));
      }

      return true;
    });
  }

  /**
   * Round robin selection
   */
  private selectRoundRobin(agents: AgentLoad[]): Agent<any> {
    const agent = agents[this.roundRobinIndex % agents.length];
    this.roundRobinIndex = (this.roundRobinIndex + 1) % agents.length;
    return agent.agent;
  }

  /**
   * Least connections selection
   */
  private selectLeastConnections(agents: AgentLoad[]): Agent<any> {
    const sortedAgents = agents.sort((a, b) => a.activeRequests - b.activeRequests);
    return sortedAgents[0].agent;
  }

  /**
   * Weighted selection
   */
  private selectWeighted(agents: AgentLoad[]): Agent<any> {
    // Calculate effective weights based on current load
    const effectiveWeights = agents.map(agent => ({
      agent,
      effectiveWeight: agent.weight * (1 - agent.currentLoad),
    }));

    // Sort by effective weight (descending)
    effectiveWeights.sort((a, b) => b.effectiveWeight - a.effectiveWeight);
    
    return effectiveWeights[0].agent.agent;
  }

  /**
   * Performance-based selection
   */
  private selectPerformanceBased(agents: AgentLoad[]): Agent<any> {
    // Calculate performance score
    const scoredAgents = agents.map(agent => ({
      agent,
      score: this.calculatePerformanceScore(agent),
    }));

    // Sort by score (descending)
    scoredAgents.sort((a, b) => b.score - a.score);
    
    return scoredAgents[0].agent.agent;
  }

  /**
   * Calculate performance score for an agent
   */
  private calculatePerformanceScore(agentLoad: AgentLoad): number {
    const loadFactor = 1 - agentLoad.currentLoad;
    const responseFactor = agentLoad.averageResponseTime > 0 
      ? 1000 / agentLoad.averageResponseTime 
      : 1;
    const successFactor = agentLoad.successRate;
    
    return loadFactor * responseFactor * successFactor;
  }

  /**
   * Get load distribution across all agents
   */
  private getLoadDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    for (const [agentId, agentLoad] of this.agents.entries()) {
      distribution[agentId] = agentLoad.currentLoad;
    }
    
    return distribution;
  }

  /**
   * Calculate estimated wait time for an agent
   */
  private calculateEstimatedWaitTime(agentId: string): number {
    const agentLoad = this.agents.get(agentId);
    if (!agentLoad) {
      return 0;
    }

    // Simple estimation based on current load and average response time
    const queueTime = agentLoad.activeRequests * agentLoad.averageResponseTime;
    return queueTime;
  }

  /**
   * Find insert index for queue entry based on priority
   */
  private findInsertIndex(entry: QueueEntry): number {
    for (let i = 0; i < this.requestQueue.length; i++) {
      if (this.requestQueue[i].priority < entry.priority) {
        return i;
      }
    }
    return this.requestQueue.length;
  }

  /**
   * Extract agent capabilities
   */
  private extractAgentCapabilities(agent: Agent<any>): string[] {
    const capabilities: string[] = [];
    
    // Extract from agent tools
    const tools = agent.getTools();
    for (const tool of tools) {
      capabilities.push(tool.name);
    }
    
    // Add default capabilities
    capabilities.push("text_generation", "conversation");
    
    return capabilities;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Start monitoring loop
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(() => {
      this.updateLoadMetrics();
      this.checkAgentHealth();
      this.cleanupStaleRequests();
    }, 5000); // Every 5 seconds
  }

  /**
   * Start queue processing loop
   */
  private startQueueProcessing(): void {
    this.queueProcessingInterval = setInterval(() => {
      this.processQueue();
    }, 1000); // Every second
  }

  /**
   * Update load metrics for all agents
   */
  private updateLoadMetrics(): void {
    for (const agentLoad of this.agents.values()) {
      // Decay load over time if no recent requests
      const timeSinceLastRequest = Date.now() - agentLoad.lastRequestTime.getTime();
      if (timeSinceLastRequest > 60000) { // 1 minute
        agentLoad.currentLoad = Math.max(0, agentLoad.currentLoad * 0.9);
      }
    }
  }

  /**
   * Check agent health
   */
  private checkAgentHealth(): void {
    for (const agentLoad of this.agents.values()) {
      // Simple health check based on success rate and response time
      const isHealthy = agentLoad.successRate > 0.8 && agentLoad.averageResponseTime < 10000;
      
      if (agentLoad.isHealthy !== isHealthy) {
        this.updateAgentHealth(agentLoad.agentId, isHealthy);
      }
    }
  }

  /**
   * Clean up stale requests from queue
   */
  private cleanupStaleRequests(): void {
    const now = Date.now();
    const staleRequests: string[] = [];

    for (const entry of this.requestQueue) {
      const age = now - entry.timestamp.getTime();
      const timeout = entry.timeout || 300000; // 5 minutes default
      
      if (age > timeout) {
        staleRequests.push(entry.id);
      }
    }

    for (const requestId of staleRequests) {
      this.dequeueRequest(requestId);
      this.emit("request:timeout", { requestId });
    }
  }

  /**
   * Process queued requests
   */
  private processQueue(): void {
    if (this.requestQueue.length === 0) {
      return;
    }

    const processedRequests: string[] = [];

    for (const entry of this.requestQueue) {
      const result = this.selectAgent(entry.assignment);
      
      if (result.selectedAgent) {
        // Agent found, process the request
        const agentLoad = this.agents.get(result.selectedAgent.id);
        if (agentLoad) {
          agentLoad.activeRequests++;
          agentLoad.currentLoad = agentLoad.activeRequests / agentLoad.maxCapacity;
        }

        this.emit("request:assigned", {
          requestId: entry.id,
          agentId: result.selectedAgent.id,
          waitTime: Date.now() - entry.timestamp.getTime(),
        });

        processedRequests.push(entry.id);
      }
    }

    // Remove processed requests from queue
    for (const requestId of processedRequests) {
      this.dequeueRequest(requestId);
    }
  }
}

