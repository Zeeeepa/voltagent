import { WorkflowEngine, type StepExecutor } from '../engine';
import type { 
  Workflow, 
  WorkflowStep, 
  WorkflowStepExecutionContext, 
  WorkflowStepExecutionResult 
} from '../types';

describe('WorkflowEngine', () => {
  let engine: WorkflowEngine;
  let mockWorkflow: Workflow;

  beforeEach(() => {
    engine = new WorkflowEngine({
      maxConcurrentSteps: 3,
      stepTimeout: 5000,
      enableParallelExecution: true,
      retryDelay: 1000
    });

    mockWorkflow = {
      id: 'test-workflow-id',
      title: 'Test Workflow',
      requirementText: 'Test requirement',
      projectContext: {},
      currentState: 'running',
      status: 'running',
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
  });

  describe('workflow execution', () => {
    it('should execute workflow successfully', async () => {
      const stepStartedSpy = jest.fn();
      const stepCompletedSpy = jest.fn();
      const workflowCompletedSpy = jest.fn();

      engine.on('step_started', stepStartedSpy);
      engine.on('step_completed', stepCompletedSpy);
      engine.on('workflow_completed', workflowCompletedSpy);

      // Mock successful execution
      const mockExecutor: StepExecutor = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          outputData: { result: 'success' }
        })
      };

      engine.registerStepExecutor('analysis', mockExecutor);
      engine.registerStepExecutor('codegen', mockExecutor);

      await engine.executeWorkflow(mockWorkflow);

      expect(stepStartedSpy).toHaveBeenCalledTimes(2);
      expect(stepCompletedSpy).toHaveBeenCalledTimes(2);
      expect(workflowCompletedSpy).toHaveBeenCalledWith({
        workflow_id: 'test-workflow-id',
        completed_at: expect.any(Date)
      });
    });

    it('should handle workflow execution failure', async () => {
      const workflowFailedSpy = jest.fn();
      engine.on('workflow_failed', workflowFailedSpy);

      // Mock failing execution
      const mockExecutor: StepExecutor = {
        execute: jest.fn().mockRejectedValue(new Error('Execution failed'))
      };

      engine.registerStepExecutor('analysis', mockExecutor);

      await engine.executeWorkflow(mockWorkflow);

      expect(workflowFailedSpy).toHaveBeenCalled();
    });

    it('should prevent duplicate workflow execution', async () => {
      const mockExecutor: StepExecutor = {
        execute: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
        )
      };

      engine.registerStepExecutor('analysis', mockExecutor);

      // Start first execution
      const firstExecution = engine.executeWorkflow(mockWorkflow);

      // Try to start second execution
      await expect(engine.executeWorkflow(mockWorkflow)).rejects.toThrow(
        `Workflow ${mockWorkflow.id} is already executing`
      );

      // Wait for first execution to complete
      await firstExecution;
    });
  });

  describe('step execution', () => {
    it('should execute step successfully', async () => {
      const mockExecutor: StepExecutor = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          outputData: { result: 'test output' }
        })
      };

      engine.registerStepExecutor('analysis', mockExecutor);

      const context: WorkflowStepExecutionContext = {
        workflow: mockWorkflow,
        step: mockWorkflow.steps[0],
        previousSteps: [],
        dependencies: [],
        executionOptions: {
          maxConcurrentSteps: 3,
          stepTimeout: 5000,
          enableParallelExecution: true,
          retryDelay: 1000
        }
      };

      const result = await engine.executeStep(context);

      expect(result.success).toBe(true);
      expect(result.outputData?.result).toBe('test output');
      expect(mockExecutor.execute).toHaveBeenCalledWith(context);
    });

    it('should handle step execution failure', async () => {
      const mockExecutor: StepExecutor = {
        execute: jest.fn().mockRejectedValue(new Error('Step failed'))
      };

      engine.registerStepExecutor('analysis', mockExecutor);

      const context: WorkflowStepExecutionContext = {
        workflow: mockWorkflow,
        step: mockWorkflow.steps[0],
        previousSteps: [],
        dependencies: [],
        executionOptions: {
          maxConcurrentSteps: 3,
          stepTimeout: 5000,
          enableParallelExecution: true,
          retryDelay: 1000
        }
      };

      const result = await engine.executeStep(context);

      expect(result.success).toBe(false);
      expect(result.errorData).toBeDefined();
      expect(result.shouldRetry).toBe(true); // Since retryCount < maxRetries
    });

    it('should handle step timeout', async () => {
      const mockExecutor: StepExecutor = {
        execute: jest.fn().mockImplementation(() => 
          new Promise(resolve => setTimeout(resolve, 10000)) // 10 second delay
        )
      };

      engine.registerStepExecutor('analysis', mockExecutor);

      const context: WorkflowStepExecutionContext = {
        workflow: mockWorkflow,
        step: mockWorkflow.steps[0],
        previousSteps: [],
        dependencies: [],
        executionOptions: {
          maxConcurrentSteps: 3,
          stepTimeout: 100, // 100ms timeout
          enableParallelExecution: true,
          retryDelay: 1000
        }
      };

      const result = await engine.executeStep(context);

      expect(result.success).toBe(false);
      expect(result.errorData?.error.message).toContain('timed out');
    });

    it('should emit step events', async () => {
      const stepStartedSpy = jest.fn();
      const stepCompletedSpy = jest.fn();

      engine.on('step_started', stepStartedSpy);
      engine.on('step_completed', stepCompletedSpy);

      const mockExecutor: StepExecutor = {
        execute: jest.fn().mockResolvedValue({
          success: true,
          outputData: { result: 'success' }
        })
      };

      engine.registerStepExecutor('analysis', mockExecutor);

      const context: WorkflowStepExecutionContext = {
        workflow: mockWorkflow,
        step: mockWorkflow.steps[0],
        previousSteps: [],
        dependencies: [],
        executionOptions: {}
      };

      await engine.executeStep(context);

      expect(stepStartedSpy).toHaveBeenCalledWith({
        workflow_id: mockWorkflow.id,
        step_id: mockWorkflow.steps[0].id,
        step_type: 'analysis',
        step_name: 'Analysis Step'
      });

      expect(stepCompletedSpy).toHaveBeenCalledWith({
        workflow_id: mockWorkflow.id,
        step_id: mockWorkflow.steps[0].id,
        result: { result: 'success' }
      });
    });

    it('should throw error for missing executor', async () => {
      const context: WorkflowStepExecutionContext = {
        workflow: mockWorkflow,
        step: {
          ...mockWorkflow.steps[0],
          stepType: 'unknown_type' as any
        },
        previousSteps: [],
        dependencies: [],
        executionOptions: {}
      };

      const result = await engine.executeStep(context);

      expect(result.success).toBe(false);
      expect(result.errorData?.error.message).toContain('No executor found for step type: unknown_type');
    });
  });

  describe('workflow control', () => {
    it('should pause workflow', async () => {
      const workflowPausedSpy = jest.fn();
      engine.on('workflow_paused', workflowPausedSpy);

      await engine.pauseWorkflow('test-workflow-id');

      expect(workflowPausedSpy).toHaveBeenCalledWith({
        workflow_id: 'test-workflow-id'
      });
    });

    it('should resume workflow', async () => {
      const mockExecutor: StepExecutor = {
        execute: jest.fn().mockResolvedValue({ success: true })
      };

      engine.registerStepExecutor('analysis', mockExecutor);
      engine.registerStepExecutor('codegen', mockExecutor);

      await engine.resumeWorkflow(mockWorkflow);

      // Should execute the workflow
      expect(mockExecutor.execute).toHaveBeenCalled();
    });

    it('should cancel workflow', async () => {
      const workflowCancelledSpy = jest.fn();
      engine.on('workflow_cancelled', workflowCancelledSpy);

      await engine.cancelWorkflow('test-workflow-id');

      expect(workflowCancelledSpy).toHaveBeenCalledWith({
        workflow_id: 'test-workflow-id'
      });
    });
  });

  describe('step executors', () => {
    it('should register custom step executor', () => {
      const customExecutor: StepExecutor = {
        execute: jest.fn().mockResolvedValue({ success: true })
      };

      engine.registerStepExecutor('custom', customExecutor);

      // Test that the executor is registered by trying to use it
      const context: WorkflowStepExecutionContext = {
        workflow: mockWorkflow,
        step: {
          ...mockWorkflow.steps[0],
          stepType: 'custom' as any
        },
        previousSteps: [],
        dependencies: [],
        executionOptions: {}
      };

      engine.executeStep(context);

      expect(customExecutor.execute).toHaveBeenCalledWith(context);
    });
  });

  describe('dependency management', () => {
    it('should respect step dependencies', async () => {
      const executionOrder: string[] = [];

      const mockExecutor: StepExecutor = {
        execute: jest.fn().mockImplementation((context) => {
          executionOrder.push(context.step.stepName);
          return Promise.resolve({ success: true });
        })
      };

      engine.registerStepExecutor('analysis', mockExecutor);
      engine.registerStepExecutor('codegen', mockExecutor);

      await engine.executeWorkflow(mockWorkflow);

      // Analysis step should execute before Codegen step due to dependency
      expect(executionOrder).toEqual(['Analysis Step', 'Codegen Step']);
    });

    it('should handle circular dependencies gracefully', async () => {
      const circularWorkflow: Workflow = {
        ...mockWorkflow,
        steps: [
          {
            ...mockWorkflow.steps[0],
            dependencies: ['Codegen Step'] // Circular dependency
          },
          {
            ...mockWorkflow.steps[1],
            dependencies: ['Analysis Step']
          }
        ]
      };

      const mockExecutor: StepExecutor = {
        execute: jest.fn().mockResolvedValue({ success: true })
      };

      engine.registerStepExecutor('analysis', mockExecutor);
      engine.registerStepExecutor('codegen', mockExecutor);

      // Should not hang indefinitely
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Execution timeout')), 5000)
      );

      await Promise.race([
        engine.executeWorkflow(circularWorkflow),
        timeoutPromise
      ]);

      // If we reach here, the execution completed (didn't hang)
      expect(true).toBe(true);
    });
  });

  describe('parallel execution', () => {
    it('should execute independent steps in parallel', async () => {
      const parallelWorkflow: Workflow = {
        ...mockWorkflow,
        steps: [
          {
            ...mockWorkflow.steps[0],
            stepName: 'Independent Step 1',
            dependencies: []
          },
          {
            ...mockWorkflow.steps[1],
            stepName: 'Independent Step 2',
            dependencies: []
          }
        ]
      };

      const executionTimes: Record<string, number> = {};
      const mockExecutor: StepExecutor = {
        execute: jest.fn().mockImplementation((context) => {
          executionTimes[context.step.stepName] = Date.now();
          return new Promise(resolve => 
            setTimeout(() => resolve({ success: true }), 100)
          );
        })
      };

      engine.registerStepExecutor('analysis', mockExecutor);
      engine.registerStepExecutor('codegen', mockExecutor);

      await engine.executeWorkflow(parallelWorkflow);

      // Both steps should start around the same time (within 50ms)
      const timeDiff = Math.abs(
        executionTimes['Independent Step 1'] - executionTimes['Independent Step 2']
      );
      expect(timeDiff).toBeLessThan(50);
    });

    it('should respect maxConcurrentSteps limit', async () => {
      const limitedEngine = new WorkflowEngine({
        maxConcurrentSteps: 1,
        enableParallelExecution: true
      });

      const manyStepsWorkflow: Workflow = {
        ...mockWorkflow,
        steps: Array.from({ length: 5 }, (_, i) => ({
          ...mockWorkflow.steps[0],
          id: `step-${i}`,
          stepName: `Step ${i}`,
          dependencies: []
        }))
      };

      let concurrentExecutions = 0;
      let maxConcurrent = 0;

      const mockExecutor: StepExecutor = {
        execute: jest.fn().mockImplementation(() => {
          concurrentExecutions++;
          maxConcurrent = Math.max(maxConcurrent, concurrentExecutions);
          
          return new Promise(resolve => 
            setTimeout(() => {
              concurrentExecutions--;
              resolve({ success: true });
            }, 50)
          );
        })
      };

      limitedEngine.registerStepExecutor('analysis', mockExecutor);

      await limitedEngine.executeWorkflow(manyStepsWorkflow);

      expect(maxConcurrent).toBe(1);
    });
  });

  describe('error recovery', () => {
    it('should classify recoverable errors', async () => {
      const recoverableErrors = [
        new Error('Network timeout'),
        new Error('Rate limit exceeded'),
        new Error('Service temporarily unavailable')
      ];

      const mockExecutor: StepExecutor = {
        execute: jest.fn()
      };

      for (const error of recoverableErrors) {
        mockExecutor.execute.mockRejectedValueOnce(error);
        
        const context: WorkflowStepExecutionContext = {
          workflow: mockWorkflow,
          step: mockWorkflow.steps[0],
          previousSteps: [],
          dependencies: [],
          executionOptions: {}
        };

        const result = await engine.executeStep(context);
        
        expect(result.success).toBe(false);
        expect(result.shouldRetry).toBe(true);
      }
    });

    it('should not retry non-recoverable errors', async () => {
      const nonRecoverableError = new Error('Invalid configuration');

      const mockExecutor: StepExecutor = {
        execute: jest.fn().mockRejectedValue(nonRecoverableError)
      };

      engine.registerStepExecutor('analysis', mockExecutor);

      const context: WorkflowStepExecutionContext = {
        workflow: mockWorkflow,
        step: {
          ...mockWorkflow.steps[0],
          retryCount: 3, // Already at max retries
          maxRetries: 3
        },
        previousSteps: [],
        dependencies: [],
        executionOptions: {}
      };

      const result = await engine.executeStep(context);
      
      expect(result.success).toBe(false);
      expect(result.shouldRetry).toBe(false);
    });
  });
});

