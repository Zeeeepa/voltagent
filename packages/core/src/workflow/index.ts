/**
 * VoltAgent Workflow Orchestration System
 * 
 * This module provides comprehensive workflow orchestration capabilities for AI-driven CI/CD pipelines.
 * It integrates with the existing VoltAgent architecture to provide:
 * 
 * - Workflow creation and management
 * - Step-by-step execution with dependency management
 * - State management and transitions
 * - Event-driven component coordination
 * - Real-time monitoring and analytics
 * - Error handling and recovery
 * - Parallel execution support
 */

// Core types
export type {
  Workflow,
  WorkflowStep,
  WorkflowStatus,
  WorkflowState,
  WorkflowStepStatus,
  WorkflowStepType,
  WorkflowPriority,
  WorkflowStateTransition,
  WorkflowEvent,
  WorkflowMetric,
  WorkflowCreateOptions,
  WorkflowExecutionOptions,
  WorkflowStepExecutionContext,
  WorkflowStepExecutionResult,
  WorkflowOrchestratorConfig,
  WorkflowProgressEvent,
  WorkflowCompletionEvent,
  WorkflowError,
  WorkflowAnalytics
} from './types';

// Main orchestrator
export { WorkflowOrchestrator } from './orchestrator';

// Workflow engine
export { WorkflowEngine, type StepExecutor } from './engine';

// State management
export { WorkflowStateManager } from './state';

// Event system
export {
  WorkflowEventBus,
  WorkflowEventCoordinator,
  WorkflowMonitor,
  type WorkflowEventType
} from './events';

/**
 * Create a new workflow orchestrator with default configuration
 */
export function createWorkflowOrchestrator(config?: {
  nlpEngine?: any;
  codegenIntegration?: any;
  validationEngine?: any;
  taskStorage?: any;
  maxConcurrentSteps?: number;
  stepTimeout?: number;
  enableParallelExecution?: boolean;
  retryDelay?: number;
}): WorkflowOrchestrator {
  const { WorkflowOrchestrator } = require('./orchestrator');
  
  return new WorkflowOrchestrator({
    nlpEngine: config?.nlpEngine,
    codegenIntegration: config?.codegenIntegration,
    validationEngine: config?.validationEngine,
    taskStorage: config?.taskStorage,
    executionOptions: {
      maxConcurrentSteps: config?.maxConcurrentSteps || 10,
      stepTimeout: config?.stepTimeout || 300000,
      enableParallelExecution: config?.enableParallelExecution !== false,
      retryDelay: config?.retryDelay || 5000
    }
  });
}

/**
 * Create a workflow event bus for component coordination
 */
export function createWorkflowEventBus(options?: {
  maxQueueSize?: number;
  processingBatchSize?: number;
  retentionDays?: number;
}): WorkflowEventBus {
  const { WorkflowEventBus } = require('./events');
  return WorkflowEventBus.getInstance(options);
}

/**
 * Integration helper for VoltAgent
 */
export class VoltAgentWorkflowIntegration {
  private orchestrator: WorkflowOrchestrator;
  private eventBus: WorkflowEventBus;
  private coordinator: WorkflowEventCoordinator;
  private monitor: WorkflowMonitor;

  constructor(config?: {
    nlpEngine?: any;
    codegenIntegration?: any;
    validationEngine?: any;
    taskStorage?: any;
    executionOptions?: any;
  }) {
    const { WorkflowOrchestrator } = require('./orchestrator');
    const { WorkflowEventBus, WorkflowEventCoordinator, WorkflowMonitor } = require('./events');

    this.orchestrator = new WorkflowOrchestrator(config);
    this.eventBus = WorkflowEventBus.getInstance();
    this.coordinator = new WorkflowEventCoordinator(this.eventBus);
    this.monitor = new WorkflowMonitor(this.eventBus);

    this.setupIntegration();
  }

  /**
   * Get the workflow orchestrator
   */
  getOrchestrator(): WorkflowOrchestrator {
    return this.orchestrator;
  }

  /**
   * Get the event bus
   */
  getEventBus(): WorkflowEventBus {
    return this.eventBus;
  }

  /**
   * Get the event coordinator
   */
  getCoordinator(): WorkflowEventCoordinator {
    return this.coordinator;
  }

  /**
   * Get the workflow monitor
   */
  getMonitor(): WorkflowMonitor {
    return this.monitor;
  }

  /**
   * Create and start a workflow
   */
  async createAndStartWorkflow(
    requirementText: string,
    projectContext?: Record<string, any>,
    options?: any
  ): Promise<{
    workflowId: string;
    workflow: Workflow;
    stopMonitoring: () => void;
  }> {
    // Create workflow
    const result = await this.orchestrator.createWorkflow(
      requirementText,
      projectContext,
      options
    );

    // Start monitoring
    const stopMonitoring = this.monitor.startMonitoring(result.workflow_id);

    // Start workflow execution
    await this.orchestrator.startWorkflow(result.workflow_id);

    return {
      workflowId: result.workflow_id,
      workflow: result.workflow,
      stopMonitoring
    };
  }

  /**
   * Get workflow status with real-time updates
   */
  async getWorkflowStatusWithUpdates(
    workflowId: string,
    onUpdate?: (status: any) => void
  ): Promise<{
    status: any;
    unsubscribe: () => void;
  }> {
    // Get current status
    const status = await this.orchestrator.getWorkflowStatus(workflowId);

    // Subscribe to updates if callback provided
    let unsubscribe = () => {};
    if (onUpdate) {
      unsubscribe = this.eventBus.subscribeToWorkflow(workflowId, (event) => {
        if (event.eventType === 'workflow_progress') {
          onUpdate(event.eventData);
        }
      });
    }

    return { status, unsubscribe };
  }

  /**
   * Setup integration with VoltAgent components
   */
  private setupIntegration(): void {
    // Register workflow orchestrator as a component
    this.coordinator.registerComponent('workflow_orchestrator', {
      workflow_created: (event) => {
        console.log('Workflow created:', event.workflowId);
      },
      workflow_completed: (event) => {
        console.log('Workflow completed:', event.workflowId);
      },
      workflow_failed: (event) => {
        console.log('Workflow failed:', event.workflowId, event.eventData);
      },
      step_completed: (event) => {
        console.log('Step completed:', event.eventData);
      },
      step_failed: (event) => {
        console.log('Step failed:', event.eventData);
      },
      workflow_progress: (event) => {
        // Handle progress updates
      },
      workflow_started: (event) => {
        console.log('Workflow started:', event.workflowId);
      },
      workflow_paused: (event) => {
        console.log('Workflow paused:', event.workflowId);
      },
      workflow_resumed: (event) => {
        console.log('Workflow resumed:', event.workflowId);
      },
      workflow_cancelled: (event) => {
        console.log('Workflow cancelled:', event.workflowId);
      },
      step_started: (event) => {
        console.log('Step started:', event.eventData);
      },
      step_retry: (event) => {
        console.log('Step retry:', event.eventData);
      },
      component_event: (event) => {
        // Handle component-specific events
      }
    });

    // Forward orchestrator events to event bus
    this.orchestrator.on('workflow_created', (data) => {
      this.eventBus.publishEvent(
        data.workflow_id,
        'workflow_created',
        'Workflow Created',
        data,
        'workflow_orchestrator'
      );
    });

    this.orchestrator.on('workflow_started', (data) => {
      this.eventBus.publishEvent(
        data.workflow_id,
        'workflow_started',
        'Workflow Started',
        data,
        'workflow_orchestrator'
      );
    });

    this.orchestrator.on('workflow_completed', (data) => {
      this.eventBus.publishEvent(
        data.workflowId,
        'workflow_completed',
        'Workflow Completed',
        data,
        'workflow_orchestrator'
      );
    });

    this.orchestrator.on('workflow_failed', (data) => {
      this.eventBus.publishEvent(
        data.workflow_id,
        'workflow_failed',
        'Workflow Failed',
        data,
        'workflow_orchestrator'
      );
    });

    this.orchestrator.on('workflow_progress', (data) => {
      this.eventBus.publishEvent(
        data.workflow_id,
        'workflow_progress',
        'Workflow Progress',
        data,
        'workflow_orchestrator'
      );
    });
  }
}

/**
 * Default export for easy integration
 */
export default VoltAgentWorkflowIntegration;

