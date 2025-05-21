/**
 * Milestone Management Module
 * Handles the creation, tracking, and management of workflow milestones
 */

import { EventEmitter } from 'events';
import { Milestone, MilestoneState, MilestoneStatus } from '../types';

/**
 * MilestoneManager is responsible for managing workflow milestones
 */
export class MilestoneManager {
  private milestones: Map<string, Milestone> = new Map();
  private milestoneStates: Map<string, MilestoneState> = new Map();
  private workflowMilestones: Map<string, Set<string>> = new Map();
  private eventEmitter: EventEmitter;

  /**
   * Create a new MilestoneManager
   * @param eventEmitter Event emitter for publishing milestone events
   */
  constructor(eventEmitter: EventEmitter) {
    this.eventEmitter = eventEmitter;
  }

  /**
   * Register a new milestone
   * @param milestone The milestone to register
   * @returns The registered milestone
   */
  async registerMilestone(milestone: Milestone): Promise<Milestone> {
    // Validate milestone
    this.validateMilestone(milestone);

    // Store the milestone
    this.milestones.set(milestone.id, milestone);

    // Initialize milestone state
    const initialState: MilestoneState = {
      milestoneId: milestone.id,
      status: MilestoneStatus.NOT_STARTED,
    };
    this.milestoneStates.set(milestone.id, initialState);

    // Add to workflow milestones
    if (!this.workflowMilestones.has(milestone.workflowId)) {
      this.workflowMilestones.set(milestone.workflowId, new Set());
    }
    this.workflowMilestones.get(milestone.workflowId)?.add(milestone.id);

    // Emit milestone registered event
    this.eventEmitter.emit('milestone_registered', {
      type: 'milestone_registered',
      workflowId: milestone.workflowId,
      timestamp: Date.now(),
      data: milestone,
    });

    return milestone;
  }

  /**
   * Update the state of a milestone
   * @param milestoneId The ID of the milestone to update
   * @param stateUpdate The new state of the milestone
   * @returns The updated milestone state
   */
  async updateMilestoneState(milestoneId: string, stateUpdate: Partial<MilestoneState>): Promise<MilestoneState> {
    // Check if milestone exists
    if (!this.milestones.has(milestoneId)) {
      throw new Error(`Milestone with ID ${milestoneId} not found`);
    }

    // Get current state
    const currentState = this.milestoneStates.get(milestoneId);
    if (!currentState) {
      throw new Error(`State for milestone with ID ${milestoneId} not found`);
    }

    // Update state
    const updatedState: MilestoneState = {
      ...currentState,
      ...stateUpdate,
    };

    // Handle status transitions
    if (stateUpdate.status) {
      // If transitioning to IN_PROGRESS, set startedAt if not already set
      if (stateUpdate.status === MilestoneStatus.IN_PROGRESS && !updatedState.startedAt) {
        updatedState.startedAt = Date.now();
      }
      
      // If transitioning to COMPLETED, set completedAt if not already set
      if (stateUpdate.status === MilestoneStatus.COMPLETED && !updatedState.completedAt) {
        updatedState.completedAt = Date.now();
        updatedState.percentComplete = 100;
      }
    }

    // Store updated state
    this.milestoneStates.set(milestoneId, updatedState);

    // Get the milestone for the event
    const milestone = this.milestones.get(milestoneId);

    // Emit milestone updated event
    this.eventEmitter.emit('milestone_updated', {
      type: 'milestone_updated',
      workflowId: milestone?.workflowId || '',
      timestamp: Date.now(),
      data: {
        milestone,
        state: updatedState,
        previousState: currentState,
      },
    });

    return updatedState;
  }

  /**
   * Get the current state of a milestone
   * @param milestoneId The ID of the milestone
   * @returns The current state of the milestone
   */
  async getMilestoneState(milestoneId: string): Promise<MilestoneState> {
    // Check if milestone exists
    if (!this.milestones.has(milestoneId)) {
      throw new Error(`Milestone with ID ${milestoneId} not found`);
    }

    // Get current state
    const state = this.milestoneStates.get(milestoneId);
    if (!state) {
      throw new Error(`State for milestone with ID ${milestoneId} not found`);
    }

    return state;
  }

  /**
   * Get all milestones for a workflow
   * @param workflowId The ID of the workflow
   * @returns All milestones for the workflow
   */
  async getWorkflowMilestones(workflowId: string): Promise<Milestone[]> {
    const milestoneIds = this.workflowMilestones.get(workflowId) || new Set();
    const milestones: Milestone[] = [];

    for (const id of milestoneIds) {
      const milestone = this.milestones.get(id);
      if (milestone) {
        milestones.push(milestone);
      }
    }

    return milestones;
  }

  /**
   * Get all milestone states for a workflow
   * @param workflowId The ID of the workflow
   * @returns All milestone states for the workflow
   */
  async getWorkflowMilestoneStates(workflowId: string): Promise<MilestoneState[]> {
    const milestoneIds = this.workflowMilestones.get(workflowId) || new Set();
    const states: MilestoneState[] = [];

    for (const id of milestoneIds) {
      const state = this.milestoneStates.get(id);
      if (state) {
        states.push(state);
      }
    }

    return states;
  }

  /**
   * Get a milestone by ID
   * @param milestoneId The ID of the milestone
   * @returns The milestone
   */
  async getMilestone(milestoneId: string): Promise<Milestone> {
    const milestone = this.milestones.get(milestoneId);
    if (!milestone) {
      throw new Error(`Milestone with ID ${milestoneId} not found`);
    }
    return milestone;
  }

  /**
   * Calculate the overall progress of a workflow based on milestone weights
   * @param workflowId The ID of the workflow
   * @returns The overall progress as a percentage (0-100)
   */
  async calculateWorkflowProgress(workflowId: string): Promise<number> {
    const milestones = await this.getWorkflowMilestones(workflowId);
    const states = await this.getWorkflowMilestoneStates(workflowId);
    
    if (milestones.length === 0) {
      return 0;
    }

    let totalWeight = 0;
    let weightedProgress = 0;

    // Create a map of milestone states for quick lookup
    const stateMap = new Map<string, MilestoneState>();
    for (const state of states) {
      stateMap.set(state.milestoneId, state);
    }

    for (const milestone of milestones) {
      totalWeight += milestone.weight;
      
      const state = stateMap.get(milestone.id);
      if (state) {
        if (state.status === MilestoneStatus.COMPLETED) {
          weightedProgress += milestone.weight;
        } else if (state.status === MilestoneStatus.IN_PROGRESS && state.percentComplete !== undefined) {
          weightedProgress += (milestone.weight * state.percentComplete / 100);
        }
      }
    }

    // Avoid division by zero
    if (totalWeight === 0) {
      return 0;
    }

    return (weightedProgress / totalWeight) * 100;
  }

  /**
   * Get the critical path of milestones for a workflow
   * @param workflowId The ID of the workflow
   * @returns The critical path as an array of milestone IDs
   */
  async getWorkflowCriticalPath(workflowId: string): Promise<string[]> {
    const milestones = await this.getWorkflowMilestones(workflowId);
    
    // Build dependency graph
    const graph: Record<string, string[]> = {};
    const weights: Record<string, number> = {};
    
    for (const milestone of milestones) {
      graph[milestone.id] = milestone.dependencies || [];
      weights[milestone.id] = milestone.expectedCompletionTime || 0;
    }
    
    // Find all root nodes (milestones with no dependencies)
    const roots = milestones
      .filter(m => !m.dependencies || m.dependencies.length === 0)
      .map(m => m.id);
    
    // Find all leaf nodes (milestones that are not dependencies of any other milestone)
    const allDependencies = new Set<string>();
    for (const milestone of milestones) {
      if (milestone.dependencies) {
        for (const dep of milestone.dependencies) {
          allDependencies.add(dep);
        }
      }
    }
    
    const leaves = milestones
      .filter(m => !allDependencies.has(m.id))
      .map(m => m.id);
    
    // Calculate longest path from each root to each leaf
    let criticalPath: string[] = [];
    let maxLength = 0;
    
    for (const root of roots) {
      for (const leaf of leaves) {
        const path = this.findLongestPath(graph, weights, root, leaf);
        const pathLength = path.reduce((sum, id) => sum + (weights[id] || 0), 0);
        
        if (pathLength > maxLength) {
          maxLength = pathLength;
          criticalPath = path;
        }
      }
    }
    
    return criticalPath;
  }

  /**
   * Find the longest path between two nodes in a directed acyclic graph
   * @param graph The graph as an adjacency list
   * @param weights The weights of each node
   * @param start The start node
   * @param end The end node
   * @returns The longest path as an array of node IDs
   */
  private findLongestPath(
    graph: Record<string, string[]>,
    weights: Record<string, number>,
    start: string,
    end: string
  ): string[] {
    // Use dynamic programming to find the longest path
    const distances: Record<string, number> = {};
    const predecessors: Record<string, string | null> = {};
    const visited = new Set<string>();
    
    // Initialize distances
    for (const node in graph) {
      distances[node] = node === start ? weights[node] || 0 : -Infinity;
      predecessors[node] = null;
    }
    
    // Topological sort
    const sorted = this.topologicalSort(graph);
    
    // Calculate longest paths
    for (const node of sorted) {
      if (distances[node] !== -Infinity) {
        for (const neighbor of graph[node] || []) {
          const newDistance = distances[node] + (weights[neighbor] || 0);
          if (newDistance > distances[neighbor]) {
            distances[neighbor] = newDistance;
            predecessors[neighbor] = node;
          }
        }
      }
    }
    
    // Reconstruct path
    const path: string[] = [];
    let current: string | null = end;
    
    while (current) {
      path.unshift(current);
      current = predecessors[current];
    }
    
    // Check if path starts with the start node
    if (path.length === 0 || path[0] !== start) {
      return [];
    }
    
    return path;
  }

  /**
   * Perform a topological sort on a directed acyclic graph
   * @param graph The graph as an adjacency list
   * @returns The topologically sorted nodes
   */
  private topologicalSort(graph: Record<string, string[]>): string[] {
    const result: string[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();
    
    function visit(node: string) {
      if (temp.has(node)) {
        throw new Error('Graph has a cycle');
      }
      
      if (!visited.has(node)) {
        temp.add(node);
        
        for (const neighbor of graph[node] || []) {
          visit(neighbor);
        }
        
        temp.delete(node);
        visited.add(node);
        result.unshift(node);
      }
    }
    
    for (const node in graph) {
      if (!visited.has(node)) {
        visit(node);
      }
    }
    
    return result;
  }

  /**
   * Validate a milestone
   * @param milestone The milestone to validate
   * @throws Error if the milestone is invalid
   */
  private validateMilestone(milestone: Milestone): void {
    if (!milestone.id) {
      throw new Error('Milestone ID is required');
    }
    
    if (!milestone.name) {
      throw new Error('Milestone name is required');
    }
    
    if (!milestone.workflowId) {
      throw new Error('Workflow ID is required');
    }
    
    if (milestone.weight < 0 || milestone.weight > 100) {
      throw new Error('Milestone weight must be between 0 and 100');
    }
    
    // Check if milestone already exists
    if (this.milestones.has(milestone.id)) {
      throw new Error(`Milestone with ID ${milestone.id} already exists`);
    }
    
    // Check if dependencies exist
    if (milestone.dependencies) {
      for (const depId of milestone.dependencies) {
        if (!this.milestones.has(depId)) {
          throw new Error(`Dependency milestone with ID ${depId} not found`);
        }
      }
    }
    
    // Check if parent exists
    if (milestone.parentId && !this.milestones.has(milestone.parentId)) {
      throw new Error(`Parent milestone with ID ${milestone.parentId} not found`);
    }
  }
}

