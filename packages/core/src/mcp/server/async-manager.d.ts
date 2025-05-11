/**
 * Operation status
 */
export type OperationStatus = "pending" | "running" | "completed" | "failed";
/**
 * Operation context
 */
export interface OperationContext {
  log: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
    debug: (message: string, meta?: Record<string, unknown>) => void;
  };
  reportProgress: (progress: {
    progress: number;
    total?: number;
  }) => void;
  session: unknown;
}
/**
 * Operation result
 */
export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
/**
 * Operation function type
 */
export type OperationFn<T = unknown, A = unknown> = (
  args: A,
  log: OperationContext["log"],
  context: {
    reportProgress: OperationContext["reportProgress"];
    mcpLog: OperationContext["log"];
    session: OperationContext["session"];
  },
) => Promise<OperationResult<T>>;
/**
 * Event listener type
 */
type EventListener = (data: unknown) => void;
/**
 * Async operation manager for handling long-running operations
 */
export declare class AsyncOperationManager {
  /**
   * Active operations
   */
  private operations;
  /**
   * Completed operations
   */
  private completedOperations;
  /**
   * Maximum number of completed operations to store
   */
  private maxCompletedOperations;
  /**
   * Event listeners
   */
  private listeners;
  /**
   * Add an operation to be executed asynchronously
   * @param operationFn The async function to execute
   * @param args Arguments to pass to the operationFn
   * @param context The MCP tool context
   * @returns The unique ID assigned to this operation
   */
  addOperation<T = unknown, A = unknown>(
    operationFn: OperationFn<T, A>,
    args: A,
    context: OperationContext,
  ): string;
  /**
   * Internal function to execute the operation
   * @param operationId The ID of the operation
   * @param operationFn The async function to execute
   * @param args Arguments for the function
   */
  private _runOperation;
  /**
   * Move an operation from active operations to completed operations history
   * @param operationId The ID of the operation to move
   */
  private _moveToCompleted;
  /**
   * Handles progress updates from the running operation and forwards them
   * @param operationId The ID of the operation reporting progress
   * @param progress The progress object { progress, total? }
   */
  private _handleProgress;
  /**
   * Retrieves the status and result/error of an operation
   * @param operationId The ID of the operation
   * @returns The operation details or null if not found
   */
  getStatus(operationId: string): {
    id?: string;
    status: OperationStatus | "not_found";
    startTime?: number;
    endTime?: number | null;
    result?: unknown;
    error?: {
      code: string;
      message: string;
    } | null;
  };
  /**
   * Internal logging helper to prefix logs with the operation ID
   * @param operationId The ID of the operation
   * @param level Log level
   * @param message Log message
   * @param meta Additional metadata
   */
  private log;
  /**
   * Register an event listener
   * @param eventName Event name
   * @param listener Event listener
   */
  on(eventName: string, listener: EventListener): void;
  /**
   * Emit an event
   * @param eventName Event name
   * @param data Event data
   */
  emit(eventName: string, data: unknown): void;
}
export declare const asyncOperationManager: AsyncOperationManager;
