/**
 * events/types.ts
 *
 * Types for the event system
 */

import { BaseMessage } from "../agent/types";
import { EventStatus } from "./agent-event-emitter";

/**
 * Standard event data interface
 */
export interface StandardEventData {
  data: {
    status: EventStatus;
    updatedAt: string;
    error?: string;
    errorMessage?: string;
    output?: {
      success?: boolean;
      messages?: BaseMessage[];
    };
  };
}
