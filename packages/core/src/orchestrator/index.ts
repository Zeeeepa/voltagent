/**
 * Core System Orchestrator - Unified Architecture
 * 
 * This module consolidates core orchestrator fixes and architecture improvements
 * into a single unified core system architecture, eliminating duplication and
 * standardizing architecture patterns across the VoltAgent system.
 */

import type { Agent } from "../agent";
import { AgentRegistry } from "../server/registry";
import { AgentEventEmitter } from "../events";
import type { EventStatus, EventUpdater } from "../events";
import { MemoryManager } from "../memory";
import { ToolManager } from "../tool";
import type { VoltAgentExporter } from "../telemetry/exporter";
import type { BaseMessage, OperationContext } from "../agent/types";
import { NodeType, createNodeId } from "../utils/node-utils";

/**
 * Core orchestration configuration
 */
export interface OrchestratorConfig {
  /** Maximum number of concurrent operations */
  maxConcurrentOperations?: number;
  /** Default timeout for operations (ms) */
  defaultTimeout?: number;
  /** Enable automatic cleanup of completed operations */
  autoCleanup?: boolean;
  /** Cleanup interval (ms) */
  cleanupInterval?: number;
  /** Enable telemetry collection */
  enableTelemetry?: boolean;
  /** Enable event propagation to parent agents */
  enableEventPropagation?: boolean;
}

/**
 * Operation status tracking
 */
export interface OperationStatus {
  id: string;
  agentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  error?: Error;
  result?: any;
  context?: OperationContext;
}

/**
 * Core System Orchestrator
 * 
 * Provides unified orchestration for:
 * - Agent lifecycle management
 * - Operation coordination
 * - Event propagation
 * - Resource management
 * - Error handling and recovery
 */
export class CoreOrchestrator {
  private static instance: CoreOrchestrator | null = null;
  
  private config: Required<OrchestratorConfig>;
  private registry: AgentRegistry;
  private eventEmitter: AgentEventEmitter;
  private operations: Map<string, OperationStatus> = new Map();
  private cleanupTimer?: NodeJS.Timeout;
  private isInitialized = false;

  private constructor(config: OrchestratorConfig = {}) {
    this.config = {
      maxConcurrentOperations: config.maxConcurrentOperations ?? 50,
      defaultTimeout: config.defaultTimeout ?? 30000,
      autoCleanup: config.autoCleanup ?? true,
      cleanupInterval: config.cleanupInterval ?? 60000,
      enableTelemetry: config.enableTelemetry ?? true,
      enableEventPropagation: config.enableEventPropagation ?? true,
    };
    
    this.registry = AgentRegistry.getInstance();
    this.eventEmitter = AgentEventEmitter.getInstance();
  }

  /**
   * Get the singleton instance of CoreOrchestrator
   */
  public static getInstance(config?: OrchestratorConfig): CoreOrchestrator {
    if (!CoreOrchestrator.instance) {
      CoreOrchestrator.instance = new CoreOrchestrator(config);
    }
    return CoreOrchestrator.instance;
  }

  /**
   * Initialize the orchestrator
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Initialize registry
    this.registry.initialize();

    // Set up event listeners
    this.setupEventListeners();

    // Start cleanup timer if enabled
    if (this.config.autoCleanup) {
      this.startCleanupTimer();
    }

    this.isInitialized = true;
  }

  /**
   * Shutdown the orchestrator
   */
  public async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    // Cancel all pending operations
    await this.cancelAllOperations();

    // Stop cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    this.isInitialized = false;
  }

  /**
   * Register an agent with the orchestrator
   */
  public registerAgent(agent: Agent<any>): void {
    this.registry.registerAgent(agent);
    
    // Register sub-agents recursively
    const subAgents = agent.getSubAgents();
    if (subAgents && subAgents.length > 0) {
      subAgents.forEach(subAgent => {
        this.registerAgent(subAgent);
        this.registry.registerSubAgent(agent.id, subAgent.id);
      });
    }
  }

  /**
   * Unregister an agent from the orchestrator
   */
  public unregisterAgent(agentId: string): boolean {
    // Cancel any operations for this agent
    this.cancelAgentOperations(agentId);
    
    // Clear relationships
    this.registry.clearAgentRelationships(agentId);
    
    // Remove from registry
    return this.registry.removeAgent(agentId);
  }

  /**
   * Start a new operation
   */
  public async startOperation(
    agentId: string,
    operationType: string,
    input: string | BaseMessage[],
    context?: Partial<OperationContext>
  ): Promise<string> {
    const agent = this.registry.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Check concurrent operation limit
    const runningOps = Array.from(this.operations.values())
      .filter(op => op.status === 'running').length;
    
    if (runningOps >= this.config.maxConcurrentOperations) {
      throw new Error('Maximum concurrent operations limit reached');
    }

    const operationId = createNodeId(NodeType.OPERATION, operationType, agentId);
    
    const operation: OperationStatus = {
      id: operationId,
      agentId,
      status: 'pending',
      startTime: new Date(),
      context: context as OperationContext,
    };

    this.operations.set(operationId, operation);

    // Emit operation started event
    this.eventEmitter.emitOperationStarted(operationId, agentId, operationType);

    return operationId;
  }

  /**
   * Update operation status
   */
  public updateOperationStatus(
    operationId: string,
    status: OperationStatus['status'],
    result?: any,
    error?: Error
  ): void {
    const operation = this.operations.get(operationId);
    if (!operation) {
      return;
    }

    operation.status = status;
    operation.result = result;
    operation.error = error;

    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      operation.endTime = new Date();
    }

    // Emit operation status change event
    this.eventEmitter.emitOperationStatusChanged(operationId, status);
  }

  /**
   * Get operation status
   */
  public getOperationStatus(operationId: string): OperationStatus | undefined {
    return this.operations.get(operationId);
  }

  /**
   * Get all operations for an agent
   */
  public getAgentOperations(agentId: string): OperationStatus[] {
    return Array.from(this.operations.values())
      .filter(op => op.agentId === agentId);
  }

  /**
   * Cancel an operation
   */
  public async cancelOperation(operationId: string): Promise<boolean> {
    const operation = this.operations.get(operationId);
    if (!operation || operation.status === 'completed' || operation.status === 'failed') {
      return false;
    }

    this.updateOperationStatus(operationId, 'cancelled');
    return true;
  }

  /**
   * Cancel all operations for an agent
   */
  public async cancelAgentOperations(agentId: string): Promise<void> {
    const operations = this.getAgentOperations(agentId);
    await Promise.all(
      operations.map(op => this.cancelOperation(op.id))
    );
  }

  /**
   * Cancel all operations
   */
  public async cancelAllOperations(): Promise<void> {
    const operationIds = Array.from(this.operations.keys());
    await Promise.all(
      operationIds.map(id => this.cancelOperation(id))
    );
  }

  /**
   * Create a unified event updater
   */
  public createEventUpdater(
    operationId: string,
    eventType: string,
    agentId: string
  ): EventUpdater {
    return async (update: {
      status?: any;
      data?: Record<string, unknown>;
    }): Promise<any> => {
      const operation = this.operations.get(operationId);
      if (!operation) {
        return;
      }

      // Update operation context if available
      if (operation.context && update.data) {
        Object.assign(operation.context, update.data);
      }

      // Propagate event to parent agents if enabled
      if (this.config.enableEventPropagation) {
        const parentIds = this.registry.getParentAgentIds(agentId);
        for (const parentId of parentIds) {
          this.eventEmitter.addHistoryEvent({
            agentId: parentId,
            historyId: operation.context?.historyEntry?.id || operationId,
            eventName: eventType,
            status: update.status || 'working',
            additionalData: {
              sourceAgentId: agentId,
              operationId,
              ...update.data,
            },
            type: 'agent',
          });
        }
      }

      return operation.context?.historyEntry;
    };
  }

  /**
   * Get orchestrator statistics
   */
  public getStatistics(): {
    totalOperations: number;
    runningOperations: number;
    completedOperations: number;
    failedOperations: number;
    registeredAgents: number;
  } {
    const operations = Array.from(this.operations.values());
    
    return {
      totalOperations: operations.length,
      runningOperations: operations.filter(op => op.status === 'running').length,
      completedOperations: operations.filter(op => op.status === 'completed').length,
      failedOperations: operations.filter(op => op.status === 'failed').length,
      registeredAgents: this.registry.getAgentCount(),
    };
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Listen for agent registration events
    this.eventEmitter.on('agent:registered', (agentId: string) => {
      console.log(`[CoreOrchestrator] Agent registered: ${agentId}`);
    });

    // Listen for agent unregistration events
    this.eventEmitter.on('agent:unregistered', (agentId: string) => {
      console.log(`[CoreOrchestrator] Agent unregistered: ${agentId}`);
      this.cancelAgentOperations(agentId);
    });
  }

  /**
   * Start the cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupCompletedOperations();
    }, this.config.cleanupInterval);
  }

  /**
   * Clean up completed operations
   */
  private cleanupCompletedOperations(): void {
    const cutoffTime = new Date(Date.now() - this.config.cleanupInterval * 2);
    
    for (const [operationId, operation] of this.operations.entries()) {
      if (
        (operation.status === 'completed' || operation.status === 'failed' || operation.status === 'cancelled') &&
        operation.endTime &&
        operation.endTime < cutoffTime
      ) {
        this.operations.delete(operationId);
      }
    }
  }
}

/**
 * Factory function to create and configure the core orchestrator
 */
export function createCoreOrchestrator(config?: OrchestratorConfig): CoreOrchestrator {
  return CoreOrchestrator.getInstance(config);
}

/**
 * Get the global core orchestrator instance
 */
export function getCoreOrchestrator(): CoreOrchestrator {
  return CoreOrchestrator.getInstance();
}

// Re-export all orchestrator components
export * from "./initialization";
export * from "./config";
export * from "./events";

// Export types
export type { OrchestratorConfig, OperationStatus };

