/**
 * Integration layer between existing event system and new database event storage
 */

import { AgentEventEmitter } from '../events';
import { EventStore, SystemEvent, TaskEvent, AgentEvent } from './event-store';
import type { AgentHistoryEntry, TimelineEvent } from '../agent/history';

export class EventStorageIntegration {
  private eventStore: EventStore;
  private agentEventEmitter: AgentEventEmitter;
  private isEnabled: boolean = true;

  constructor(eventStore: EventStore) {
    this.eventStore = eventStore;
    this.agentEventEmitter = AgentEventEmitter.getInstance();
    this.setupEventListeners();
  }

  /**
   * Enable or disable event storage integration
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Setup event listeners to capture and store events
   */
  private setupEventListeners(): void {
    // Listen for history updates and store them as system events
    this.agentEventEmitter.onHistoryUpdate((agentId: string, historyEntry: AgentHistoryEntry) => {
      if (!this.isEnabled) return;

      this.storeHistoryUpdateEvent(agentId, historyEntry);
    });

    // Listen for history entry creation
    this.agentEventEmitter.onHistoryEntryCreated((agentId: string, historyEntry: AgentHistoryEntry) => {
      if (!this.isEnabled) return;

      this.storeHistoryCreatedEvent(agentId, historyEntry);
    });

    // Listen for agent registration
    this.agentEventEmitter.onAgentRegistered((agentId: string) => {
      if (!this.isEnabled) return;

      this.storeAgentRegisteredEvent(agentId);
    });

    // Listen for agent unregistration
    this.agentEventEmitter.onAgentUnregistered((agentId: string) => {
      if (!this.isEnabled) return;

      this.storeAgentUnregisteredEvent(agentId);
    });
  }

  /**
   * Store history update event
   */
  private async storeHistoryUpdateEvent(agentId: string, historyEntry: AgentHistoryEntry): Promise<void> {
    try {
      const systemEvent: SystemEvent = {
        event_type: 'agent_history',
        event_name: 'history_updated',
        agent_id: agentId,
        session_id: historyEntry.id,
        data: {
          historyId: historyEntry.id,
          status: historyEntry.status,
          eventCount: historyEntry.events?.length || 0,
          stepCount: historyEntry.steps?.length || 0,
        },
        metadata: {
          source: 'AgentEventEmitter',
          historyEntry: {
            id: historyEntry.id,
            status: historyEntry.status,
            createdAt: historyEntry.createdAt,
            updatedAt: historyEntry.updatedAt,
          },
        },
        status: 'completed',
      };

      await this.eventStore.logSystemEvent(systemEvent);

      // Also store individual timeline events as task events
      if (historyEntry.events) {
        for (const timelineEvent of historyEntry.events) {
          await this.storeTimelineEvent(agentId, historyEntry.id, timelineEvent);
        }
      }
    } catch (error) {
      console.error('[EventStorageIntegration] Failed to store history update event:', error);
    }
  }

  /**
   * Store timeline event as task event
   */
  private async storeTimelineEvent(agentId: string, historyId: string, timelineEvent: TimelineEvent): Promise<void> {
    try {
      const taskEvent: TaskEvent = {
        task_id: timelineEvent.id,
        task_name: timelineEvent.name,
        agent_id: agentId,
        event_type: timelineEvent.type || 'unknown',
        event_name: timelineEvent.name,
        status: 'completed',
        input_data: timelineEvent.data || {},
        metadata: {
          source: 'TimelineEvent',
          historyId,
          originalTimestamp: timelineEvent.timestamp,
        },
        started_at: new Date(timelineEvent.timestamp),
        completed_at: new Date(timelineEvent.timestamp),
      };

      await this.eventStore.logTaskEvent(taskEvent);
    } catch (error) {
      console.error('[EventStorageIntegration] Failed to store timeline event:', error);
    }
  }

  /**
   * Store history created event
   */
  private async storeHistoryCreatedEvent(agentId: string, historyEntry: AgentHistoryEntry): Promise<void> {
    try {
      const systemEvent: SystemEvent = {
        event_type: 'agent_history',
        event_name: 'history_created',
        agent_id: agentId,
        session_id: historyEntry.id,
        data: {
          historyId: historyEntry.id,
          status: historyEntry.status,
        },
        metadata: {
          source: 'AgentEventEmitter',
          historyEntry: {
            id: historyEntry.id,
            status: historyEntry.status,
            createdAt: historyEntry.createdAt,
          },
        },
        status: 'completed',
      };

      await this.eventStore.logSystemEvent(systemEvent);
    } catch (error) {
      console.error('[EventStorageIntegration] Failed to store history created event:', error);
    }
  }

  /**
   * Store agent registered event
   */
  private async storeAgentRegisteredEvent(agentId: string): Promise<void> {
    try {
      const agentEvent: AgentEvent = {
        agent_id: agentId,
        event_type: 'agent_lifecycle',
        event_name: 'agent_registered',
        action: 'register',
        status: 'completed',
        metadata: {
          source: 'AgentEventEmitter',
        },
      };

      await this.eventStore.logAgentEvent(agentEvent);
    } catch (error) {
      console.error('[EventStorageIntegration] Failed to store agent registered event:', error);
    }
  }

  /**
   * Store agent unregistered event
   */
  private async storeAgentUnregisteredEvent(agentId: string): Promise<void> {
    try {
      const agentEvent: AgentEvent = {
        agent_id: agentId,
        event_type: 'agent_lifecycle',
        event_name: 'agent_unregistered',
        action: 'unregister',
        status: 'completed',
        metadata: {
          source: 'AgentEventEmitter',
        },
      };

      await this.eventStore.logAgentEvent(agentEvent);
    } catch (error) {
      console.error('[EventStorageIntegration] Failed to store agent unregistered event:', error);
    }
  }

  /**
   * Manually log a custom system event
   */
  async logCustomEvent(event: Partial<SystemEvent>): Promise<string | null> {
    if (!this.isEnabled) return null;

    try {
      const systemEvent: SystemEvent = {
        event_type: event.event_type || 'custom',
        event_name: event.event_name || 'custom_event',
        ...event,
        metadata: {
          ...event.metadata,
          source: 'EventStorageIntegration',
        },
      };

      return await this.eventStore.logSystemEvent(systemEvent);
    } catch (error) {
      console.error('[EventStorageIntegration] Failed to log custom event:', error);
      return null;
    }
  }

  /**
   * Get event statistics
   */
  async getEventStatistics(options?: { startDate?: Date; endDate?: Date }) {
    return await this.eventStore.getEventStatistics(options);
  }

  /**
   * Query events with filtering
   */
  async queryEvents(options: any) {
    return await this.eventStore.querySystemEvents(options);
  }

  /**
   * Get health status
   */
  async getHealthStatus() {
    return await this.eventStore.getHealthStatus();
  }
}

