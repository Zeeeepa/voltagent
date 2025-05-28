import { WorkflowOrchestrator } from '../orchestrator';
import { WorkflowEngine } from '../engine';
import { WorkflowStateManager } from '../state';
import type { WorkflowCreateOptions } from '../types';

// Mock the engine and state manager
jest.mock('../engine');
jest.mock('../state');

describe('WorkflowOrchestrator', () => {
  let orchestrator: WorkflowOrchestrator;
  let mockEngine: jest.Mocked<WorkflowEngine>;
  let mockStateManager: jest.Mocked<WorkflowStateManager>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create orchestrator instance
    orchestrator = new WorkflowOrchestrator({
      nlpEngine: {
        analyzeRequirement: jest.fn().mockResolvedValue({
          requirement_text: 'test requirement',
          tasks: [{ id: 'task-1', title: 'Test Task' }],
          complexity: 'medium'
        })
      }
    });

    // Get mocked instances
    mockEngine = (orchestrator as any).workflowEngine;
    mockStateManager = (orchestrator as any).stateManager;
  });

  describe('createWorkflow', () => {
    it('should create a workflow successfully', async () => {
      const requirementText = 'Build a user authentication system';
      const projectContext = { framework: 'Express.js' };
      const options: WorkflowCreateOptions = { title: 'Auth System' };

      mockStateManager.setWorkflow = jest.fn();
      mockStateManager.initializeWorkflowState = jest.fn().mockResolvedValue(undefined);

      const result = await orchestrator.createWorkflow(requirementText, projectContext, options);

      expect(result).toHaveProperty('workflow_id');
      expect(result).toHaveProperty('workflow');
      expect(result).toHaveProperty('steps');
      expect(result.status).toBe('created');
      expect(result.workflow.title).toBe('Auth System');
      expect(result.workflow.requirementText).toBe(requirementText);
    });

    it('should handle NLP engine failure gracefully', async () => {
      const orchestratorWithFailingNLP = new WorkflowOrchestrator({
        nlpEngine: {
          analyzeRequirement: jest.fn().mockRejectedValue(new Error('NLP failed'))
        }
      });

      const mockStateManagerFailing = (orchestratorWithFailingNLP as any).stateManager;
      mockStateManagerFailing.setWorkflow = jest.fn();
      mockStateManagerFailing.initializeWorkflowState = jest.fn().mockResolvedValue(undefined);

      const result = await orchestratorWithFailingNLP.createWorkflow('test requirement');

      expect(result).toHaveProperty('workflow_id');
      expect(result.workflow.requirementText).toBe('test requirement');
      // Should use fallback analysis
      expect(result.steps.length).toBeGreaterThan(0);
    });

    it('should emit workflow_created event', async () => {
      const eventSpy = jest.fn();
      orchestrator.on('workflow_created', eventSpy);

      mockStateManager.setWorkflow = jest.fn();
      mockStateManager.initializeWorkflowState = jest.fn().mockResolvedValue(undefined);

      await orchestrator.createWorkflow('test requirement');

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow_id: expect.any(String),
          workflow: expect.any(Object),
          steps: expect.any(Array)
        })
      );
    });
  });

  describe('startWorkflow', () => {
    it('should start a workflow successfully', async () => {
      const workflowId = 'test-workflow-id';
      const mockWorkflow = {
        id: workflowId,
        title: 'Test Workflow',
        currentState: 'created',
        status: 'pending',
        steps: []
      };

      mockStateManager.getWorkflow = jest.fn().mockReturnValue(mockWorkflow);
      mockStateManager.transitionState = jest.fn().mockResolvedValue(undefined);
      mockEngine.executeWorkflow = jest.fn().mockResolvedValue(undefined);

      const result = await orchestrator.startWorkflow(workflowId);

      expect(result.success).toBe(true);
      expect(result.status).toBe('running');
      expect(mockStateManager.transitionState).toHaveBeenCalledWith(
        workflowId,
        'created',
        'running'
      );
      expect(mockEngine.executeWorkflow).toHaveBeenCalledWith(mockWorkflow);
    });

    it('should throw error for non-existent workflow', async () => {
      const workflowId = 'non-existent-workflow';
      mockStateManager.getWorkflow = jest.fn().mockReturnValue(undefined);

      await expect(orchestrator.startWorkflow(workflowId)).rejects.toThrow(
        `Workflow ${workflowId} not found`
      );
    });

    it('should emit workflow_started event', async () => {
      const workflowId = 'test-workflow-id';
      const mockWorkflow = {
        id: workflowId,
        currentState: 'created',
        steps: []
      };

      mockStateManager.getWorkflow = jest.fn().mockReturnValue(mockWorkflow);
      mockStateManager.transitionState = jest.fn().mockResolvedValue(undefined);
      mockEngine.executeWorkflow = jest.fn().mockResolvedValue(undefined);

      const eventSpy = jest.fn();
      orchestrator.on('workflow_started', eventSpy);

      await orchestrator.startWorkflow(workflowId);

      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow_id: workflowId,
          started_at: expect.any(Date)
        })
      );
    });
  });

  describe('getWorkflowStatus', () => {
    it('should return workflow status', async () => {
      const workflowId = 'test-workflow-id';
      const mockWorkflow = {
        id: workflowId,
        status: 'running',
        currentState: 'running',
        steps: [
          { status: 'completed' },
          { status: 'running' },
          { status: 'pending' }
        ]
      };

      mockStateManager.getWorkflow = jest.fn().mockReturnValue(mockWorkflow);
      mockStateManager.getWorkflowProgress = jest.fn().mockReturnValue(33);

      const status = await orchestrator.getWorkflowStatus(workflowId);

      expect(status.workflow_id).toBe(workflowId);
      expect(status.status).toBe('running');
      expect(status.current_state).toBe('running');
      expect(status.progress).toBe(33);
      expect(status.analytics.total_steps).toBe(3);
      expect(status.analytics.completed_steps).toBe(1);
      expect(status.analytics.running_steps).toBe(1);
    });

    it('should throw error for non-existent workflow', async () => {
      const workflowId = 'non-existent-workflow';
      mockStateManager.getWorkflow = jest.fn().mockReturnValue(undefined);

      await expect(orchestrator.getWorkflowStatus(workflowId)).rejects.toThrow(
        `Workflow ${workflowId} not found`
      );
    });
  });

  describe('pauseWorkflow', () => {
    it('should pause a workflow successfully', async () => {
      const workflowId = 'test-workflow-id';

      mockStateManager.transitionState = jest.fn().mockResolvedValue(undefined);
      mockEngine.pauseWorkflow = jest.fn().mockResolvedValue(undefined);

      const result = await orchestrator.pauseWorkflow(workflowId);

      expect(result.success).toBe(true);
      expect(result.status).toBe('paused');
      expect(mockStateManager.transitionState).toHaveBeenCalledWith(
        workflowId,
        'running',
        'paused'
      );
    });
  });

  describe('resumeWorkflow', () => {
    it('should resume a workflow successfully', async () => {
      const workflowId = 'test-workflow-id';
      const mockWorkflow = {
        id: workflowId,
        currentState: 'paused',
        steps: []
      };

      mockStateManager.getWorkflow = jest.fn().mockReturnValue(mockWorkflow);
      mockStateManager.transitionState = jest.fn().mockResolvedValue(undefined);
      mockEngine.resumeWorkflow = jest.fn().mockResolvedValue(undefined);

      const result = await orchestrator.resumeWorkflow(workflowId);

      expect(result.success).toBe(true);
      expect(result.status).toBe('running');
      expect(mockStateManager.transitionState).toHaveBeenCalledWith(
        workflowId,
        'paused',
        'running'
      );
    });
  });

  describe('cancelWorkflow', () => {
    it('should cancel a workflow successfully', async () => {
      const workflowId = 'test-workflow-id';
      const reason = 'User requested cancellation';
      const mockWorkflow = {
        id: workflowId,
        currentState: 'running',
        metadata: {}
      };

      mockStateManager.getWorkflow = jest.fn().mockReturnValue(mockWorkflow);
      mockStateManager.transitionState = jest.fn().mockResolvedValue(undefined);
      mockEngine.cancelWorkflow = jest.fn().mockResolvedValue(undefined);

      const result = await orchestrator.cancelWorkflow(workflowId, reason);

      expect(result.success).toBe(true);
      expect(result.status).toBe('cancelled');
      expect(mockWorkflow.metadata.cancellation_reason).toBe(reason);
    });
  });

  describe('step management', () => {
    it('should complete workflow step', async () => {
      const workflowId = 'test-workflow-id';
      const stepId = 'test-step-id';
      const result = { output: 'test result' };

      mockStateManager.updateStepStatus = jest.fn().mockResolvedValue(undefined);

      await orchestrator.completeWorkflowStep(workflowId, stepId, result);

      expect(mockStateManager.updateStepStatus).toHaveBeenCalledWith(
        workflowId,
        stepId,
        'completed',
        result
      );
    });

    it('should fail workflow step', async () => {
      const workflowId = 'test-workflow-id';
      const stepId = 'test-step-id';
      const error = { message: 'test error' };

      mockStateManager.updateStepStatus = jest.fn().mockResolvedValue(undefined);

      await orchestrator.failWorkflowStep(workflowId, stepId, error);

      expect(mockStateManager.updateStepStatus).toHaveBeenCalledWith(
        workflowId,
        stepId,
        'failed',
        undefined,
        error
      );
    });
  });

  describe('analytics', () => {
    it('should return workflow analytics', () => {
      mockStateManager.getWorkflowAnalytics = jest.fn().mockReturnValue({
        totalWorkflows: 10,
        completedWorkflows: 8,
        failedWorkflows: 1,
        activeWorkflows: 1,
        averageDuration: 300000
      });

      const analytics = orchestrator.getWorkflowAnalytics();

      expect(analytics.totalWorkflows).toBe(10);
      expect(analytics.completedWorkflows).toBe(8);
      expect(analytics.failedWorkflows).toBe(1);
      expect(analytics.activeWorkflows).toBe(1);
      expect(analytics.averageDuration).toBe(300000);
    });
  });

  describe('event handling', () => {
    it('should handle step completion events', async () => {
      const workflowId = 'test-workflow-id';
      const stepId = 'test-step-id';
      const result = { output: 'test' };

      mockStateManager.updateStepStatus = jest.fn().mockResolvedValue(undefined);
      mockStateManager.areAllStepsCompleted = jest.fn().mockReturnValue(false);

      const progressSpy = jest.fn();
      orchestrator.on('workflow_progress', progressSpy);

      // Simulate step completion event from engine
      mockEngine.emit('step_completed', {
        workflow_id: workflowId,
        step_id: stepId,
        result
      });

      // Wait for async event handling
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockStateManager.updateStepStatus).toHaveBeenCalledWith(
        stepId,
        'completed',
        result
      );
    });

    it('should handle workflow completion', async () => {
      const workflowId = 'test-workflow-id';

      mockStateManager.transitionState = jest.fn().mockResolvedValue(undefined);
      mockStateManager.getWorkflow = jest.fn().mockReturnValue({
        id: workflowId,
        steps: []
      });

      const completionSpy = jest.fn();
      orchestrator.on('workflow_completed', completionSpy);

      // Simulate workflow completion event from engine
      mockEngine.emit('workflow_completed', { workflow_id: workflowId });

      // Wait for async event handling
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockStateManager.transitionState).toHaveBeenCalledWith(
        workflowId,
        'running',
        'completed'
      );
    });
  });
});

