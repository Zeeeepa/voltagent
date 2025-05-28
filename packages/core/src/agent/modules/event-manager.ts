import type { Span } from "@opentelemetry/api";
import { AgentEventEmitter } from "../../events";
import type { EventStatus, EventUpdater } from "../../events";
import type { StandardEventData } from "../../events/types";
import type { OperationContext } from "../types";
import type { StepWithContent } from "../providers";
import { NodeType, createNodeId } from "../../utils/node-utils";
import { serializeValueForDebug } from "../../utils/serialization";
import { startToolSpan, endToolSpan } from "../open-telemetry";

/**
 * Manages events and telemetry for agent operations
 */
export class EventManager {
  private eventEmitter: AgentEventEmitter;

  constructor(private agentId: string, private agentName: string) {
    this.eventEmitter = AgentEventEmitter.getInstance();
  }

  /**
   * Create a standard timeline event
   */
  createStandardTimelineEvent = (
    type: "agent" | "tool",
    status: EventStatus,
    data: any,
    context: OperationContext,
  ): StandardEventData => {
    return {
      id: createNodeId(NodeType.Event),
      type,
      status,
      agentId: this.agentId,
      agentName: this.agentName,
      historyEntryId: context.historyEntryId || "unknown",
      parentAgentId: context.parentAgentId,
      parentHistoryEntryId: context.parentHistoryEntryId,
      data: serializeValueForDebug(data),
      timestamp: new Date().toISOString(),
      userContext: context.userContext ? Object.fromEntries(context.userContext) : undefined,
    };
  };

  /**
   * Add tool execution event
   */
  addToolEvent = async (
    toolCallId: string,
    status: EventStatus,
    resultData?: any,
    context?: OperationContext,
  ): Promise<void> => {
    if (!context) return;

    // Handle user context
    const userContextData: Record<string, any> = {};
    if (context?.userContext && context.userContext.size > 0) {
      // Convert Map to object for serialization
      for (const [key, value] of context.userContext.entries()) {
        userContextData[key] = value;
      }
    }

    const eventData = this.createStandardTimelineEvent(
      "tool",
      status,
      {
        toolCallId,
        result: resultData,
        userContext: Object.keys(userContextData).length > 0 ? userContextData : undefined,
      },
      context,
    );

    // Emit the event
    this.eventEmitter.emit("standardEvent", eventData);

    // Handle parent agent updates
    if (context.parentAgentId && context.parentHistoryEntryId) {
      const parentUpdater = this.eventEmitter.getParentUpdater(
        context.parentAgentId,
        context.parentHistoryEntryId,
      );
      if (parentUpdater) {
        await parentUpdater({
          type: "tool",
          status,
          data: {
            toolCallId,
            result: resultData,
            agentId: this.agentId,
            agentName: this.agentName,
          },
        });
      }
    }
  };

  /**
   * Create event updater function
   */
  createEventUpdater = (context: OperationContext): EventUpdater => {
    return async (update: {
      type: "agent" | "tool";
      status: EventStatus;
      data?: any;
    }) => {
      const eventData = this.createStandardTimelineEvent(
        update.type,
        update.status,
        update.data,
        context,
      );

      this.eventEmitter.emit("standardEvent", eventData);
    };
  };

  /**
   * Add agent event
   */
  addAgentEvent = (
    status: EventStatus,
    data: any,
    context: OperationContext,
  ): void => {
    const eventData = this.createStandardTimelineEvent("agent", status, data, context);
    this.eventEmitter.emit("standardEvent", eventData);
  };

  /**
   * End OpenTelemetry tool span
   */
  endOtelToolSpan(
    toolCallId: string,
    resultData?: any,
    context?: OperationContext,
  ): void {
    if (!context?.toolSpans) {
      return;
    }

    const toolSpan = context.toolSpans.get(toolCallId);
    if (toolSpan) {
      endToolSpan({ span: toolSpan, resultData });
      context.toolSpans.delete(toolCallId);
    }
  }

  /**
   * Start OpenTelemetry tool span
   */
  startOtelToolSpan(
    toolCallId: string,
    toolName: string,
    context: OperationContext,
  ): void {
    if (context?.userContext && context.userContext.size > 0) {
      const userContextData: Record<string, any> = {};
      for (const [key, value] of context.userContext.entries()) {
        userContextData[key] = value;
      }
    }

    if (context.parentAgentId && context.parentHistoryEntryId) {
      // Handle parent agent context
    }

    if (!context.toolSpans) {
      context.toolSpans = new Map<string, Span>();
    }

    if (toolCallId && !context.toolSpans.has(toolCallId)) {
      const toolSpan = startToolSpan({
        toolName,
        agentId: this.agentId,
        agentName: this.agentName,
        historyEntryId: context.historyEntryId || "unknown",
      });
      context.toolSpans.set(toolCallId, toolSpan);
    }
  }

  /**
   * Get event emitter instance
   */
  getEventEmitter(): AgentEventEmitter {
    return this.eventEmitter;
  }
}

