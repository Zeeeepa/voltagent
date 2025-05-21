import { EventEmitter } from 'events';
import { logger } from '../common/logger';
import { triggerWebhooks } from '../webhooks/webhookManager';

/**
 * Event types for the workflow orchestration system
 */
export enum EventType {
  // Workflow definition events
  WORKFLOW_DEFINITION_CREATED = 'workflow.definition.created',
  WORKFLOW_DEFINITION_UPDATED = 'workflow.definition.updated',
  WORKFLOW_DEFINITION_DELETED = 'workflow.definition.deleted',
  
  // Workflow execution events
  WORKFLOW_EXECUTION_STARTED = 'workflow.execution.started',
  WORKFLOW_EXECUTION_COMPLETED = 'workflow.execution.completed',
  WORKFLOW_EXECUTION_FAILED = 'workflow.execution.failed',
  WORKFLOW_EXECUTION_CANCELLED = 'workflow.execution.cancelled',
  
  // Task execution events
  TASK_EXECUTION_STARTED = 'task.execution.started',
  TASK_EXECUTION_COMPLETED = 'task.execution.completed',
  TASK_EXECUTION_FAILED = 'task.execution.failed',
  TASK_EXECUTION_CANCELLED = 'task.execution.cancelled',
  
  // Progress tracking events
  PROGRESS_UPDATED = 'progress.updated',
  BLOCKER_DETECTED = 'blocker.detected',
  BLOCKER_RESOLVED = 'blocker.resolved',
  MILESTONE_ACHIEVED = 'milestone.achieved',
  
  // Resource management events
  RESOURCE_ALLOCATED = 'resource.allocated',
  RESOURCE_RELEASED = 'resource.released',
  RESOURCE_SHORTAGE = 'resource.shortage',
  
  // Synchronization events
  SYNCHRONIZATION_POINT_REACHED = 'synchronization.point.reached',
  SYNCHRONIZATION_POINT_COMPLETED = 'synchronization.point.completed',
  SYNCHRONIZATION_POINT_FAILED = 'synchronization.point.failed',
  
  // System events
  SYSTEM_ERROR = 'system.error',
  SYSTEM_WARNING = 'system.warning',
  SYSTEM_INFO = 'system.info'
}

/**
 * Interface for event data
 */
export interface EventData {
  timestamp: Date;
  type: EventType;
  payload: any;
}

/**
 * Singleton event emitter for the workflow orchestration system
 */
export class WorkflowEventEmitter {
  private static instance: WorkflowEventEmitter;
  private emitter: EventEmitter;
  
  private constructor() {
    this.emitter = new EventEmitter();
    // Set a higher limit for event listeners
    this.emitter.setMaxListeners(100);
  }
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): WorkflowEventEmitter {
    if (!WorkflowEventEmitter.instance) {
      WorkflowEventEmitter.instance = new WorkflowEventEmitter();
    }
    
    return WorkflowEventEmitter.instance;
  }
  
  /**
   * Emit an event
   */
  public emit(type: EventType, payload: any): void {
    const eventData: EventData = {
      timestamp: new Date(),
      type,
      payload
    };
    
    logger.debug(`Emitting event: ${type}`, { payload });
    
    // Emit the event
    this.emitter.emit(type, eventData);
    
    // Also emit to a wildcard event for listeners that want all events
    this.emitter.emit('*', eventData);
    
    // Trigger webhooks for this event
    this.triggerWebhooks(type, payload);
  }
  
  /**
   * Subscribe to an event
   */
  public on(type: EventType | '*', listener: (eventData: EventData) => void): () => void {
    this.emitter.on(type, listener);
    
    // Return a function to unsubscribe
    return () => {
      this.emitter.off(type, listener);
    };
  }
  
  /**
   * Subscribe to an event once
   */
  public once(type: EventType | '*', listener: (eventData: EventData) => void): void {
    this.emitter.once(type, listener);
  }
  
  /**
   * Trigger webhooks for an event
   */
  private async triggerWebhooks(type: EventType, payload: any): Promise<void> {
    try {
      await triggerWebhooks(type, payload);
    } catch (error) {
      logger.error(`Error triggering webhooks for event ${type}:`, error);
    }
  }
}

/**
 * Get the workflow event emitter instance
 */
export function getEventEmitter(): WorkflowEventEmitter {
  return WorkflowEventEmitter.getInstance();
}

