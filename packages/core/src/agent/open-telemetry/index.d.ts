import { type Span } from "@opentelemetry/api";
import type { EventStatus, StandardEventData } from "../../events/types";
interface StartOperationSpanOptions {
  agentId: string;
  agentName: string;
  operationName: string;
  userId?: string;
  sessionId?: string;
  parentAgentId?: string;
  parentHistoryEntryId?: string;
  modelName?: string;
}
export declare function startOperationSpan(options: StartOperationSpanOptions): Span;
interface EndOperationSpanOptions {
  span: Span;
  status: EventStatus;
  data: Partial<StandardEventData> & Record<string, unknown>;
}
export declare function endOperationSpan(options: EndOperationSpanOptions): void;
interface StartToolSpanOptions {
  toolName: string;
  toolCallId: string;
  toolInput?: unknown;
  agentId: string;
  parentSpan?: Span;
}
export declare function startToolSpan(options: StartToolSpanOptions): Span;
interface EndToolSpanOptions {
  span: Span;
  resultData: {
    result?: any;
    content?: any;
    error?: any;
  };
}
export declare function endToolSpan(options: EndToolSpanOptions): void;
export {};
