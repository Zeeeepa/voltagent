import { EventEmitter } from 'events';
import type {
  Workflow,
  WorkflowState,
  WorkflowStateTransition,
  WorkflowStatus,
  WorkflowStep,
  WorkflowStepStatus,
  WorkflowError
} from '../types';

/**
 * Workflow State Manager - Manages workflow states and transitions
 */
export class WorkflowStateManager extends EventEmitter {
  private workflows: Map<string, Workflow> = new Map();
  private stateTransitions: Map<string, WorkflowStateTransition[]> = new Map();
  private maxHistoryEntries: number;
  private enableSnapshots: boolean;
  private snapshotInterval: number;

  constructor(options: {
    maxHistoryEntries?: number;
    enableSnapshots?: boolean;
    snapshotInterval?: number;
  } = {}) {
    super();
    this.maxHistoryEntries = options.maxHistoryEntries || 1000;
    this.enableSnapshots = options.enableSnapshots || true;
    this.snapshotInterval = options.snapshotInterval || 3600; // 1 hour in seconds
  }

  /**
   * Initialize workflow state
   */
  async initializeWorkflowState(
    workflowId: string,
    initialState: {
      current_state: WorkflowState;
      context: Record<string, any>;
    }
  ): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Update workflow state
    workflow.currentState = initialState.current_state;
    workflow.metadata = { ...workflow.metadata, ...initialState.context };
    workflow.updatedAt = new Date();

    // Record state transition
    await this.recordStateTransition(workflowId, undefined, initialState.current_state, 'initialization');

    this.emit('workflow_state_initialized', {
      workflowId,
      state: initialState.current_state,
      context: initialState.context
    });
  }

  /**
   * Transition workflow state
   */
  async transitionState(
    workflowId: string,
    fromState: WorkflowState,
    toState: WorkflowState,
    trigger: string = 'manual'
  ): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Validate state transition
    if (workflow.currentState !== fromState) {
      throw new Error(
        `Invalid state transition: expected ${fromState}, current state is ${workflow.currentState}`
      );
    }

    if (!this.isValidStateTransition(fromState, toState)) {
      throw new Error(`Invalid state transition from ${fromState} to ${toState}`);
    }

    // Update workflow state
    const previousState = workflow.currentState;
    workflow.currentState = toState;
    workflow.updatedAt = new Date();

    // Update status based on state
    workflow.status = this.mapStateToStatus(toState);

    // Set timestamps
    if (toState === 'running' && !workflow.startedAt) {
      workflow.startedAt = new Date();
    }
    if (['completed', 'failed', 'cancelled'].includes(toState)) {
      workflow.completedAt = new Date();
    }

    // Record state transition
    await this.recordStateTransition(workflowId, fromState, toState, trigger);

    this.emit('workflow_state_changed', {
      workflowId,
      fromState: previousState,
      toState,
      trigger,
      workflow
    });
  }

  /**
   * Get current workflow state
   */
  getWorkflowState(workflowId: string): WorkflowState | undefined {
    const workflow = this.workflows.get(workflowId);
    return workflow?.currentState;
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  /**
   * Set workflow
   */
  setWorkflow(workflow: Workflow): void {
    this.workflows.set(workflow.id, workflow);
  }

  /**
   * Update workflow step status
   */
  async updateStepStatus(
    workflowId: string,
    stepId: string,
    status: WorkflowStepStatus,
    outputData?: Record<string, any>,
    errorData?: Record<string, any>
  ): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const step = workflow.steps.find(s => s.id === stepId);
    if (!step) {
      throw new Error(`Step ${stepId} not found in workflow ${workflowId}`);
    }

    // Update step status
    const previousStatus = step.status;
    step.status = status;

    // Set timestamps
    if (status === 'running' && !step.startedAt) {
      step.startedAt = new Date();
    }
    if (['completed', 'failed', 'skipped'].includes(status)) {
      step.completedAt = new Date();
    }

    // Update data
    if (outputData) {
      step.outputData = { ...step.outputData, ...outputData };
    }
    if (errorData) {
      step.errorData = { ...step.errorData, ...errorData };
    }

    // Update retry count for failed steps
    if (status === 'failed') {
      step.retryCount += 1;
    }

    workflow.updatedAt = new Date();

    this.emit('workflow_step_status_changed', {
      workflowId,
      stepId,
      fromStatus: previousStatus,
      toStatus: status,
      step,
      workflow
    });
  }

  /**
   * Get workflow state history
   */
  getStateHistory(workflowId: string): WorkflowStateTransition[] {
    return this.stateTransitions.get(workflowId) || [];
  }

  /**
   * Check if all workflow steps are completed
   */
  areAllStepsCompleted(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return false;
    }

    return workflow.steps.every(step => 
      ['completed', 'skipped'].includes(step.status)
    );
  }

  /**
   * Check if any workflow step has failed
   */
  hasFailedSteps(workflowId: string): boolean {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      return false;
    }

    return workflow.steps.some(step => step.status === 'failed');
  }

  /**
   * Get workflow progress (0-100)
   */
  getWorkflowProgress(workflowId: string): number {
    const workflow = this.workflows.get(workflowId);
    if (!workflow || workflow.steps.length === 0) {
      return 0;
    }

    const completedSteps = workflow.steps.filter(step => 
      ['completed', 'skipped'].includes(step.status)
    ).length;

    return Math.round((completedSteps / workflow.steps.length) * 100);
  }

  /**
   * Get workflow analytics
   */
  getWorkflowAnalytics(): {
    totalWorkflows: number;
    activeWorkflows: number;
    completedWorkflows: number;
    failedWorkflows: number;
    averageDuration: number;
  } {
    const workflows = Array.from(this.workflows.values());
    
    const totalWorkflows = workflows.length;
    const activeWorkflows = workflows.filter(w => 
      ['running', 'paused'].includes(w.status)
    ).length;
    const completedWorkflows = workflows.filter(w => 
      w.status === 'completed'
    ).length;
    const failedWorkflows = workflows.filter(w => 
      w.status === 'failed'
    ).length;

    // Calculate average duration for completed workflows
    const completedWithDuration = workflows.filter(w => 
      w.status === 'completed' && w.startedAt && w.completedAt
    );
    
    const averageDuration = completedWithDuration.length > 0
      ? completedWithDuration.reduce((sum, w) => {
          const duration = w.completedAt!.getTime() - w.startedAt!.getTime();
          return sum + duration;
        }, 0) / completedWithDuration.length
      : 0;

    return {
      totalWorkflows,
      activeWorkflows,
      completedWorkflows,
      failedWorkflows,
      averageDuration
    };
  }

  /**
   * Record state transition
   */
  private async recordStateTransition(
    workflowId: string,
    fromState: WorkflowState | undefined,
    toState: WorkflowState,
    trigger: string
  ): Promise<void> {
    const transition: WorkflowStateTransition = {
      id: `${workflowId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      fromState,
      toState,
      trigger,
      timestamp: new Date(),
      metadata: {}
    };

    let transitions = this.stateTransitions.get(workflowId) || [];
    transitions.push(transition);

    // Limit history size
    if (transitions.length > this.maxHistoryEntries) {
      transitions = transitions.slice(-this.maxHistoryEntries);
    }

    this.stateTransitions.set(workflowId, transitions);
  }

  /**
   * Validate state transition
   */
  private isValidStateTransition(fromState: WorkflowState, toState: WorkflowState): boolean {
    const validTransitions: Record<WorkflowState, WorkflowState[]> = {
      'created': ['initialized', 'cancelled'],
      'initialized': ['running', 'cancelled'],
      'running': ['paused', 'completed', 'failed', 'cancelled'],
      'paused': ['running', 'cancelled'],
      'completed': [], // Terminal state
      'failed': ['running'], // Can retry
      'cancelled': [] // Terminal state
    };

    return validTransitions[fromState]?.includes(toState) || false;
  }

  /**
   * Map workflow state to status
   */
  private mapStateToStatus(state: WorkflowState): WorkflowStatus {
    const stateToStatusMap: Record<WorkflowState, WorkflowStatus> = {
      'created': 'pending',
      'initialized': 'pending',
      'running': 'running',
      'paused': 'paused',
      'completed': 'completed',
      'failed': 'failed',
      'cancelled': 'cancelled'
    };

    return stateToStatusMap[state];
  }
}

