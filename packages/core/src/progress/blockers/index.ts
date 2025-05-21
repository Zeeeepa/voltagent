/**
 * Blocker Detection Module
 * Detects and manages blockers in workflow progress
 */

import { EventEmitter } from 'events';
import { Blocker, MilestoneStatus } from '../types';
import { MilestoneManager } from '../milestones';

/**
 * BlockerDetector is responsible for detecting and managing blockers in workflow progress
 */
export class BlockerDetector {
  private blockers: Map<string, Blocker> = new Map();
  private workflowBlockers: Map<string, Set<string>> = new Map();
  private milestoneManager: MilestoneManager;
  private eventEmitter: EventEmitter;

  /**
   * Create a new BlockerDetector
   * @param milestoneManager The milestone manager to use for detection
   * @param eventEmitter Event emitter for publishing blocker events
   */
  constructor(milestoneManager: MilestoneManager, eventEmitter: EventEmitter) {
    this.milestoneManager = milestoneManager;
    this.eventEmitter = eventEmitter;

    // Listen for milestone updates to detect blockers
    this.eventEmitter.on('milestone_updated', this.handleMilestoneUpdate.bind(this));
  }

  /**
   * Handle milestone update events to detect blockers
   * @param event The milestone update event
   */
  private async handleMilestoneUpdate(event: any): Promise<void> {
    const { milestone, state, previousState } = event.data;
    
    // If milestone is now blocked, create a blocker if one doesn't exist
    if (state.status === MilestoneStatus.BLOCKED && previousState.status !== MilestoneStatus.BLOCKED) {
      // Check if a blocker already exists for this milestone
      const existingBlockers = await this.getActiveBlockers(milestone.workflowId);
      const existingBlocker = existingBlockers.find(b => 
        b.affectedMilestoneIds.includes(milestone.id) && !b.resolvedAt
      );
      
      if (!existingBlocker) {
        // Create a new blocker
        const blocker: Blocker = {
          id: `blocker_${milestone.id}_${Date.now()}`,
          name: `Blocker for ${milestone.name}`,
          description: state.blockerReason || 'Unknown blocker',
          severity: 'medium',
          workflowId: milestone.workflowId,
          affectedMilestoneIds: [milestone.id],
          detectedAt: Date.now(),
          metadata: {
            autoDetected: true,
            blockedBy: state.blockedBy,
          },
        };
        
        await this.registerBlocker(blocker);
      }
    }
    
    // If milestone was blocked but is no longer blocked, resolve any blockers
    if (previousState.status === MilestoneStatus.BLOCKED && state.status !== MilestoneStatus.BLOCKED) {
      const existingBlockers = await this.getActiveBlockers(milestone.workflowId);
      
      for (const blocker of existingBlockers) {
        if (blocker.affectedMilestoneIds.includes(milestone.id) && !blocker.resolvedAt) {
          await this.resolveBlocker(blocker.id, 'Milestone is no longer blocked');
        }
      }
    }
  }

  /**
   * Register a new blocker
   * @param blocker The blocker to register
   * @returns The registered blocker
   */
  async registerBlocker(blocker: Blocker): Promise<Blocker> {
    // Validate blocker
    this.validateBlocker(blocker);

    // Store the blocker
    this.blockers.set(blocker.id, blocker);

    // Add to workflow blockers
    if (!this.workflowBlockers.has(blocker.workflowId)) {
      this.workflowBlockers.set(blocker.workflowId, new Set());
    }
    this.workflowBlockers.get(blocker.workflowId)?.add(blocker.id);

    // Emit blocker detected event
    this.eventEmitter.emit('blocker_detected', {
      type: 'blocker_detected',
      workflowId: blocker.workflowId,
      timestamp: Date.now(),
      data: blocker,
    });

    return blocker;
  }

  /**
   * Resolve an existing blocker
   * @param blockerId The ID of the blocker to resolve
   * @param resolution Optional resolution details
   * @returns The resolved blocker
   */
  async resolveBlocker(blockerId: string, resolution?: string): Promise<Blocker> {
    // Check if blocker exists
    if (!this.blockers.has(blockerId)) {
      throw new Error(`Blocker with ID ${blockerId} not found`);
    }

    // Get current blocker
    const blocker = this.blockers.get(blockerId)!;

    // Check if already resolved
    if (blocker.resolvedAt) {
      return blocker;
    }

    // Update blocker
    const resolvedBlocker: Blocker = {
      ...blocker,
      resolvedAt: Date.now(),
      metadata: {
        ...blocker.metadata,
        resolution,
      },
    };

    // Store updated blocker
    this.blockers.set(blockerId, resolvedBlocker);

    // Emit blocker resolved event
    this.eventEmitter.emit('blocker_resolved', {
      type: 'blocker_resolved',
      workflowId: resolvedBlocker.workflowId,
      timestamp: Date.now(),
      data: resolvedBlocker,
    });

    return resolvedBlocker;
  }

  /**
   * Get all active blockers for a workflow
   * @param workflowId The ID of the workflow
   * @returns All active blockers for the workflow
   */
  async getActiveBlockers(workflowId: string): Promise<Blocker[]> {
    const blockerIds = this.workflowBlockers.get(workflowId) || new Set();
    const activeBlockers: Blocker[] = [];

    for (const id of blockerIds) {
      const blocker = this.blockers.get(id);
      if (blocker && !blocker.resolvedAt) {
        activeBlockers.push(blocker);
      }
    }

    return activeBlockers;
  }

  /**
   * Get all blockers for a workflow (active and resolved)
   * @param workflowId The ID of the workflow
   * @returns All blockers for the workflow
   */
  async getAllWorkflowBlockers(workflowId: string): Promise<Blocker[]> {
    const blockerIds = this.workflowBlockers.get(workflowId) || new Set();
    const allBlockers: Blocker[] = [];

    for (const id of blockerIds) {
      const blocker = this.blockers.get(id);
      if (blocker) {
        allBlockers.push(blocker);
      }
    }

    return allBlockers;
  }

  /**
   * Get a blocker by ID
   * @param blockerId The ID of the blocker
   * @returns The blocker
   */
  async getBlocker(blockerId: string): Promise<Blocker> {
    const blocker = this.blockers.get(blockerId);
    if (!blocker) {
      throw new Error(`Blocker with ID ${blockerId} not found`);
    }
    return blocker;
  }

  /**
   * Detect blockers in a workflow
   * This method analyzes the workflow state to detect potential blockers
   * @param workflowId Optional workflow ID to detect blockers for (if not provided, detects for all workflows)
   */
  async detectBlockers(workflowId?: string): Promise<void> {
    const workflowIds = workflowId 
      ? [workflowId] 
      : Array.from(this.workflowBlockers.keys());

    for (const wfId of workflowIds) {
      await this.detectWorkflowBlockers(wfId);
    }
  }

  /**
   * Detect blockers in a specific workflow
   * @param workflowId The ID of the workflow
   */
  private async detectWorkflowBlockers(workflowId: string): Promise<void> {
    // Get all milestones and their states
    const milestones = await this.milestoneManager.getWorkflowMilestones(workflowId);
    const states = await this.milestoneManager.getWorkflowMilestoneStates(workflowId);
    
    // Create maps for quick lookup
    const stateMap = new Map();
    for (const state of states) {
      stateMap.set(state.milestoneId, state);
    }
    
    const milestoneMap = new Map();
    for (const milestone of milestones) {
      milestoneMap.set(milestone.id, milestone);
    }
    
    // Check for dependency-based blockers
    for (const milestone of milestones) {
      const state = stateMap.get(milestone.id);
      
      // Skip if milestone is already completed or already blocked
      if (state.status === MilestoneStatus.COMPLETED || state.status === MilestoneStatus.BLOCKED) {
        continue;
      }
      
      // Check if any dependencies are not completed
      if (milestone.dependencies && milestone.dependencies.length > 0) {
        const blockedByDependencies = milestone.dependencies.filter(depId => {
          const depState = stateMap.get(depId);
          return !depState || depState.status !== MilestoneStatus.COMPLETED;
        });
        
        if (blockedByDependencies.length > 0) {
          // Create a list of dependency names
          const dependencyNames = blockedByDependencies.map(depId => {
            const dep = milestoneMap.get(depId);
            return dep ? dep.name : depId;
          });
          
          // Update milestone state to blocked if not already
          if (state.status !== MilestoneStatus.BLOCKED) {
            await this.milestoneManager.updateMilestoneState(milestone.id, {
              status: MilestoneStatus.BLOCKED,
              blockerReason: `Blocked by dependencies: ${dependencyNames.join(', ')}`,
              blockedBy: blockedByDependencies.join(','),
            });
          }
        }
      }
    }
    
    // Check for stalled milestones (in progress for too long)
    const now = Date.now();
    for (const state of states) {
      if (state.status === MilestoneStatus.IN_PROGRESS && state.startedAt) {
        const milestone = milestoneMap.get(state.milestoneId);
        
        if (!milestone) continue;
        
        // If milestone has been in progress for longer than expected, flag as potential blocker
        if (milestone.expectedCompletionTime) {
          const expectedEndTime = state.startedAt + milestone.expectedCompletionTime;
          
          if (now > expectedEndTime && state.status !== MilestoneStatus.BLOCKED) {
            // Calculate how overdue the milestone is
            const overdueFactor = (now - expectedEndTime) / milestone.expectedCompletionTime;
            
            // Only create a blocker if significantly overdue (e.g., 50% over expected time)
            if (overdueFactor > 0.5) {
              const overduePercentage = Math.round(overdueFactor * 100);
              
              // Update milestone state to blocked
              await this.milestoneManager.updateMilestoneState(milestone.id, {
                status: MilestoneStatus.BLOCKED,
                blockerReason: `Milestone is ${overduePercentage}% overdue`,
                blockedBy: 'time_overrun',
              });
            }
          }
        }
      }
    }
  }

  /**
   * Validate a blocker
   * @param blocker The blocker to validate
   * @throws Error if the blocker is invalid
   */
  private validateBlocker(blocker: Blocker): void {
    if (!blocker.id) {
      throw new Error('Blocker ID is required');
    }
    
    if (!blocker.name) {
      throw new Error('Blocker name is required');
    }
    
    if (!blocker.description) {
      throw new Error('Blocker description is required');
    }
    
    if (!blocker.workflowId) {
      throw new Error('Workflow ID is required');
    }
    
    if (!blocker.affectedMilestoneIds || blocker.affectedMilestoneIds.length === 0) {
      throw new Error('At least one affected milestone ID is required');
    }
    
    if (!blocker.detectedAt) {
      throw new Error('Detection timestamp is required');
    }
    
    // Check if blocker already exists
    if (this.blockers.has(blocker.id)) {
      throw new Error(`Blocker with ID ${blocker.id} already exists`);
    }
    
    // Check if affected milestones exist
    for (const milestoneId of blocker.affectedMilestoneIds) {
      this.milestoneManager.getMilestone(milestoneId).catch(() => {
        throw new Error(`Affected milestone with ID ${milestoneId} not found`);
      });
    }
  }
}

