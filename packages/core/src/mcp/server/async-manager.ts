import { v4 as uuidv4 } from "uuid";

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
  reportProgress: (progress: { progress: number; total?: number }) => void;
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
 * Operation data
 */
interface Operation<T = unknown> {
  id: string;
  status: OperationStatus;
  startTime: number;
  endTime: number | null;
  result: T | null;
  error: {
    code: string;
    message: string;
  } | null;
  log: OperationContext["log"];
  reportProgress: OperationContext["reportProgress"];
  session: OperationContext["session"];
}

/**
 * Completed operation data
 */
interface CompletedOperation<T = unknown> {
  id: string;
  status: OperationStatus;
  startTime: number;
  endTime: number;
  result: T | null;
  error: {
    code: string;
    message: string;
  } | null;
}

/**
 * Event listener type
 */
type EventListener = (data: unknown) => void;

/**
 * Async operation manager for handling long-running operations
 */
export class AsyncOperationManager {
  /**
   * Active operations
   */
  private operations = new Map<string, Operation>();

  /**
   * Completed operations
   */
  private completedOperations = new Map<string, CompletedOperation>();

  /**
   * Maximum number of completed operations to store
   */
  private maxCompletedOperations = 100;

  /**
   * Event listeners
   */
  private listeners = new Map<string, EventListener[]>();

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
  ): string {
    const operationId = `op-${uuidv4()}`;
    const operation: Operation<T> = {
      id: operationId,
      status: "pending",
      startTime: Date.now(),
      endTime: null,
      result: null,
      error: null,
      log: context.log,
      reportProgress: context.reportProgress,
      session: context.session,
    };
    this.operations.set(operationId, operation);
    this.log(operationId, "info", "Operation added.");

    // Start execution in the background (don't await here)
    this._runOperation(operationId, operationFn, args).catch((err) => {
      // Catch unexpected errors during the async execution setup itself
      this.log(operationId, "error", `Critical error starting operation: ${err.message}`, {
        stack: err.stack,
      });
      operation.status = "failed";
      operation.error = {
        code: "MANAGER_EXECUTION_ERROR",
        message: err.message,
      };
      operation.endTime = Date.now();

      // Move to completed operations
      this._moveToCompleted(operationId);
    });

    return operationId;
  }

  /**
   * Internal function to execute the operation
   * @param operationId The ID of the operation
   * @param operationFn The async function to execute
   * @param args Arguments for the function
   */
  private async _runOperation<T = unknown, A = unknown>(
    operationId: string,
    operationFn: OperationFn<T, A>,
    args: A,
  ): Promise<void> {
    const operation = this.operations.get(operationId) as Operation<T> | undefined;
    if (!operation) return; // Should not happen

    operation.status = "running";
    this.log(operationId, "info", "Operation running.");
    this.emit("statusChanged", { operationId, status: "running" });

    try {
      // Pass the necessary context parts to the direct function
      // The direct function needs to be adapted if it needs reportProgress
      // We pass the original context's log, plus our wrapped reportProgress
      const result = await operationFn(args, operation.log, {
        reportProgress: (progress) => this._handleProgress(operationId, progress),
        mcpLog: operation.log, // Pass log as mcpLog if direct fn expects it
        session: operation.session,
      });

      operation.status = result.success ? "completed" : "failed";
      operation.result = result.success ? (result.data as T) : null;
      operation.error = result.success ? null : result.error || null;
      this.log(operationId, "info", `Operation finished with status: ${operation.status}`);
    } catch (error) {
      this.log(
        operationId,
        "error",
        `Operation failed with error: ${error instanceof Error ? error.message : String(error)}`,
        { stack: error instanceof Error ? error.stack : undefined },
      );
      operation.status = "failed";
      operation.error = {
        code: "OPERATION_EXECUTION_ERROR",
        message: error instanceof Error ? error.message : String(error),
      };
    } finally {
      operation.endTime = Date.now();
      this.emit("statusChanged", {
        operationId,
        status: operation.status,
        result: operation.result,
        error: operation.error,
      });

      // Move to completed operations if done or failed
      if (operation.status === "completed" || operation.status === "failed") {
        this._moveToCompleted(operationId);
      }
    }
  }

  /**
   * Move an operation from active operations to completed operations history
   * @param operationId The ID of the operation to move
   */
  private _moveToCompleted(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (!operation) return;

    // Store only the necessary data in completed operations
    const completedData: CompletedOperation = {
      id: operation.id,
      status: operation.status,
      startTime: operation.startTime,
      endTime: operation.endTime as number, // We know it's not null at this point
      result: operation.result,
      error: operation.error,
    };

    this.completedOperations.set(operationId, completedData);
    this.operations.delete(operationId);

    // Trim completed operations if exceeding maximum
    if (this.completedOperations.size > this.maxCompletedOperations) {
      // Get the oldest operation (sorted by endTime)
      const oldest = [...this.completedOperations.entries()].sort(
        (a, b) => a[1].endTime - b[1].endTime,
      )[0];

      if (oldest) {
        this.completedOperations.delete(oldest[0]);
      }
    }
  }

  /**
   * Handles progress updates from the running operation and forwards them
   * @param operationId The ID of the operation reporting progress
   * @param progress The progress object { progress, total? }
   */
  private _handleProgress(
    operationId: string,
    progress: { progress: number; total?: number },
  ): void {
    const operation = this.operations.get(operationId);
    if (operation?.reportProgress) {
      try {
        // Use the reportProgress function captured from the original context
        operation.reportProgress(progress);
        this.log(operationId, "debug", `Reported progress: ${JSON.stringify(progress)}`);
      } catch (err) {
        this.log(
          operationId,
          "warn",
          `Failed to report progress: ${err instanceof Error ? err.message : String(err)}`,
        );
        // Don't stop the operation, just log the reporting failure
      }
    }
  }

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
  } {
    // First check active operations
    const operation = this.operations.get(operationId);
    if (operation) {
      return {
        id: operation.id,
        status: operation.status,
        startTime: operation.startTime,
        endTime: operation.endTime,
        result: operation.result,
        error: operation.error,
      };
    }

    // Then check completed operations
    const completedOperation = this.completedOperations.get(operationId);
    if (completedOperation) {
      return completedOperation;
    }

    // Operation not found in either active or completed
    return {
      error: {
        code: "OPERATION_NOT_FOUND",
        message: `Operation ID ${operationId} not found. It may have been completed and removed from history, or the ID may be invalid.`,
      },
      status: "not_found",
    };
  }

  /**
   * Internal logging helper to prefix logs with the operation ID
   * @param operationId The ID of the operation
   * @param level Log level
   * @param message Log message
   * @param meta Additional metadata
   */
  private log(
    operationId: string,
    level: "info" | "warn" | "error" | "debug",
    message: string,
    meta: Record<string, unknown> = {},
  ): void {
    const operation = this.operations.get(operationId);
    // Use the logger instance associated with the operation if available, otherwise console
    const logger = operation?.log || console;

    // Handle different logger types
    if (typeof logger[level] === "function") {
      logger[level](`[AsyncOp ${operationId}] ${message}`, meta);
    } else if (typeof console[level] === "function") {
      console[level](`[AsyncOp ${operationId}] ${message}`, meta);
    } else {
      // Fallback to console.log
      console.log(`[AsyncOp ${operationId}] [${level}] ${message}`, meta);
    }
  }

  /**
   * Register an event listener
   * @param eventName Event name
   * @param listener Event listener
   */
  on(eventName: string, listener: EventListener): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName)?.push(listener);
  }

  /**
   * Emit an event
   * @param eventName Event name
   * @param data Event data
   */
  emit(eventName: string, data: unknown): void {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName)?.forEach((listener) => listener(data));
    }
  }
}

// Export a singleton instance
export const asyncOperationManager = new AsyncOperationManager();
