import { WorkflowStateManager } from '../state';
import type { Workflow, WorkflowState, WorkflowStepStatus } from '../types';

describe('WorkflowStateManager', () => {
  let stateManager: WorkflowStateManager;
  let mockWorkflow: Workflow;

  beforeEach(() => {
    stateManager = new WorkflowStateManager({
      maxHistoryEntries: 100,
      enableSnapshots: true,
      snapshotInterval: 3600
    });

    mockWorkflow = {
      id: 'test-workflow-id',
      title: 'Test Workflow',
      requirementText: 'Test requirement',
      projectContext: {},
      currentState: 'created',
      status: 'pending',
      priority: 'medium',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
      steps: [
        {
          id: 'step-1',
          workflowId: 'test-workflow-id',
          stepType: 'analysis',
          stepName: 'Analysis Step',
          stepOrder: 1,
          status: 'pending',
          inputData: {},
          outputData: {},
          errorData: {},
          retryCount: 0,
          maxRetries: 3,
          dependencies: [],
          metadata: {}
        },
        {
          id: 'step-2',
          workflowId: 'test-workflow-id',
          stepType: 'codegen',
          stepName: 'Codegen Step',
          stepOrder: 2,
          status: 'pending',
          inputData: {},
          outputData: {},
          errorData: {},
          retryCount: 0,
          maxRetries: 3,
          dependencies: ['Analysis Step'],
          metadata: {}
        }
      ]
    };

    stateManager.setWorkflow(mockWorkflow);
  });

  describe('workflow state management', () => {
    it('should initialize workflow state', async () => {
      const workflowId = 'test-workflow-id';
      const initialState = {
        current_state: 'created' as WorkflowState,
        context: { test: 'data' }
      };

      const eventSpy = jest.fn();
      stateManager.on('workflow_state_initialized', eventSpy);

      await stateManager.initializeWorkflowState(workflowId, initialState);

      const workflow = stateManager.getWorkflow(workflowId);
      expect(workflow?.currentState).toBe('created');
      expect(workflow?.metadata.test).toBe('data');
      expect(eventSpy).toHaveBeenCalledWith({
        workflowId,
        state: 'created',
        context: { test: 'data' }
      });
    });

    it('should transition workflow state successfully', async () => {
      const workflowId = 'test-workflow-id';
      
      const eventSpy = jest.fn();
      stateManager.on('workflow_state_changed', eventSpy);

      await stateManager.transitionState(workflowId, 'created', 'running');

      const workflow = stateManager.getWorkflow(workflowId);
      expect(workflow?.currentState).toBe('running');
      expect(workflow?.status).toBe('running');
      expect(workflow?.startedAt).toBeInstanceOf(Date);

      expect(eventSpy).toHaveBeenCalledWith({
        workflowId,
        fromState: 'created',
        toState: 'running',
        trigger: 'manual',
        workflow: expect.any(Object)
      });
    });

    it('should reject invalid state transitions', async () => {
      const workflowId = 'test-workflow-id';

      await expect(
        stateManager.transitionState(workflowId, 'running', 'created')
      ).rejects.toThrow('Invalid state transition: expected running, current state is created');
    });

    it('should reject transitions to invalid states', async () => {
      const workflowId = 'test-workflow-id';

      await expect(
        stateManager.transitionState(workflowId, 'created', 'completed')
      ).rejects.toThrow('Invalid state transition from created to completed');
    });

    it('should set completion timestamp for terminal states', async () => {
      const workflowId = 'test-workflow-id';

      // First transition to running
      await stateManager.transitionState(workflowId, 'created', 'running');
      
      // Then to completed
      await stateManager.transitionState(workflowId, 'running', 'completed');

      const workflow = stateManager.getWorkflow(workflowId);
      expect(workflow?.completedAt).toBeInstanceOf(Date);
      expect(workflow?.status).toBe('completed');
    });

    it('should get current workflow state', () => {
      const workflowId = 'test-workflow-id';
      const state = stateManager.getWorkflowState(workflowId);
      expect(state).toBe('created');
    });

    it('should return undefined for non-existent workflow', () => {
      const state = stateManager.getWorkflowState('non-existent');
      expect(state).toBeUndefined();
    });
  });

  describe('step status management', () => {
    it('should update step status successfully', async () => {
      const workflowId = 'test-workflow-id';
      const stepId = 'step-1';
      const outputData = { result: 'success' };

      const eventSpy = jest.fn();
      stateManager.on('workflow_step_status_changed', eventSpy);

      await stateManager.updateStepStatus(workflowId, stepId, 'completed', outputData);

      const workflow = stateManager.getWorkflow(workflowId);
      const step = workflow?.steps.find(s => s.id === stepId);
      
      expect(step?.status).toBe('completed');
      expect(step?.outputData.result).toBe('success');
      expect(step?.completedAt).toBeInstanceOf(Date);

      expect(eventSpy).toHaveBeenCalledWith({
        workflowId,
        stepId,
        fromStatus: 'pending',
        toStatus: 'completed',
        step: expect.any(Object),
        workflow: expect.any(Object)
      });
    });

    it('should update step with error data', async () => {
      const workflowId = 'test-workflow-id';
      const stepId = 'step-1';
      const errorData = { error: 'test error' };

      await stateManager.updateStepStatus(workflowId, stepId, 'failed', undefined, errorData);

      const workflow = stateManager.getWorkflow(workflowId);
      const step = workflow?.steps.find(s => s.id === stepId);
      
      expect(step?.status).toBe('failed');
      expect(step?.errorData.error).toBe('test error');
      expect(step?.retryCount).toBe(1);
    });

    it('should set started timestamp for running steps', async () => {
      const workflowId = 'test-workflow-id';
      const stepId = 'step-1';

      await stateManager.updateStepStatus(workflowId, stepId, 'running');

      const workflow = stateManager.getWorkflow(workflowId);
      const step = workflow?.steps.find(s => s.id === stepId);
      
      expect(step?.status).toBe('running');
      expect(step?.startedAt).toBeInstanceOf(Date);
    });

    it('should throw error for non-existent workflow', async () => {
      await expect(
        stateManager.updateStepStatus('non-existent', 'step-1', 'completed')
      ).rejects.toThrow('Workflow non-existent not found');
    });

    it('should throw error for non-existent step', async () => {
      const workflowId = 'test-workflow-id';
      
      await expect(
        stateManager.updateStepStatus(workflowId, 'non-existent-step', 'completed')
      ).rejects.toThrow('Step non-existent-step not found in workflow test-workflow-id');
    });
  });

  describe('workflow progress tracking', () => {
    it('should check if all steps are completed', () => {
      const workflowId = 'test-workflow-id';
      
      // Initially not all completed
      expect(stateManager.areAllStepsCompleted(workflowId)).toBe(false);

      // Complete all steps
      const workflow = stateManager.getWorkflow(workflowId)!;
      workflow.steps.forEach(step => step.status = 'completed');

      expect(stateManager.areAllStepsCompleted(workflowId)).toBe(true);
    });

    it('should check if workflow has failed steps', () => {
      const workflowId = 'test-workflow-id';
      
      // Initially no failed steps
      expect(stateManager.hasFailedSteps(workflowId)).toBe(false);

      // Fail one step
      const workflow = stateManager.getWorkflow(workflowId)!;
      workflow.steps[0].status = 'failed';

      expect(stateManager.hasFailedSteps(workflowId)).toBe(true);
    });

    it('should calculate workflow progress', () => {
      const workflowId = 'test-workflow-id';
      
      // Initially 0% progress
      expect(stateManager.getWorkflowProgress(workflowId)).toBe(0);

      // Complete one step (50% progress)
      const workflow = stateManager.getWorkflow(workflowId)!;
      workflow.steps[0].status = 'completed';

      expect(stateManager.getWorkflowProgress(workflowId)).toBe(50);

      // Complete all steps (100% progress)
      workflow.steps[1].status = 'completed';

      expect(stateManager.getWorkflowProgress(workflowId)).toBe(100);
    });

    it('should handle empty workflow for progress calculation', () => {
      const emptyWorkflow: Workflow = {
        ...mockWorkflow,
        id: 'empty-workflow',
        steps: []
      };
      
      stateManager.setWorkflow(emptyWorkflow);
      expect(stateManager.getWorkflowProgress('empty-workflow')).toBe(0);
    });
  });

  describe('state history', () => {
    it('should record state transitions', async () => {
      const workflowId = 'test-workflow-id';

      await stateManager.transitionState(workflowId, 'created', 'running');
      await stateManager.transitionState(workflowId, 'running', 'completed');

      const history = stateManager.getStateHistory(workflowId);
      
      expect(history).toHaveLength(2);
      expect(history[0].fromState).toBe('created');
      expect(history[0].toState).toBe('running');
      expect(history[1].fromState).toBe('running');
      expect(history[1].toState).toBe('completed');
    });

    it('should return empty history for non-existent workflow', () => {
      const history = stateManager.getStateHistory('non-existent');
      expect(history).toEqual([]);
    });
  });

  describe('analytics', () => {
    it('should return workflow analytics', () => {
      // Add more workflows for testing
      const completedWorkflow: Workflow = {
        ...mockWorkflow,
        id: 'completed-workflow',
        status: 'completed',
        startedAt: new Date(Date.now() - 300000), // 5 minutes ago
        completedAt: new Date()
      };

      const failedWorkflow: Workflow = {
        ...mockWorkflow,
        id: 'failed-workflow',
        status: 'failed'
      };

      const runningWorkflow: Workflow = {
        ...mockWorkflow,
        id: 'running-workflow',
        status: 'running'
      };

      stateManager.setWorkflow(completedWorkflow);
      stateManager.setWorkflow(failedWorkflow);
      stateManager.setWorkflow(runningWorkflow);

      const analytics = stateManager.getWorkflowAnalytics();

      expect(analytics.totalWorkflows).toBe(4);
      expect(analytics.completedWorkflows).toBe(1);
      expect(analytics.failedWorkflows).toBe(1);
      expect(analytics.activeWorkflows).toBe(1); // running workflow
      expect(analytics.averageDuration).toBe(300000); // 5 minutes
    });

    it('should handle analytics with no completed workflows', () => {
      const analytics = stateManager.getWorkflowAnalytics();

      expect(analytics.totalWorkflows).toBe(1);
      expect(analytics.completedWorkflows).toBe(0);
      expect(analytics.averageDuration).toBe(0);
    });
  });

  describe('workflow and step retrieval', () => {
    it('should get workflow by ID', () => {
      const workflow = stateManager.getWorkflow('test-workflow-id');
      expect(workflow).toBeDefined();
      expect(workflow?.id).toBe('test-workflow-id');
    });

    it('should return undefined for non-existent workflow', () => {
      const workflow = stateManager.getWorkflow('non-existent');
      expect(workflow).toBeUndefined();
    });

    it('should set workflow', () => {
      const newWorkflow: Workflow = {
        ...mockWorkflow,
        id: 'new-workflow',
        title: 'New Workflow'
      };

      stateManager.setWorkflow(newWorkflow);
      const retrieved = stateManager.getWorkflow('new-workflow');
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.title).toBe('New Workflow');
    });
  });
});

