Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncOperationManager = exports.AsyncOperationManager = void 0;
const uuid_1 = require("uuid");
/**
 * Async operation manager for handling long-running operations
 */
class AsyncOperationManager {
  constructor() {
    /**
     * Active operations
     */
    this.operations = new Map();
    /**
     * Completed operations
     */
    this.completedOperations = new Map();
    /**
     * Maximum number of completed operations to store
     */
    this.maxCompletedOperations = 100;
    /**
     * Event listeners
     */
    this.listeners = new Map();
  }
  /**
   * Add an operation to be executed asynchronously
   * @param operationFn The async function to execute
   * @param args Arguments to pass to the operationFn
   * @param context The MCP tool context
   * @returns The unique ID assigned to this operation
   */
  addOperation(operationFn, args, context) {
    const operationId = `op-${(0, uuid_1.v4)()}`;
    const operation = {
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
  async _runOperation(operationId, operationFn, args) {
    const operation = this.operations.get(operationId);
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
      operation.result = result.success ? result.data : null;
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
  _moveToCompleted(operationId) {
    const operation = this.operations.get(operationId);
    if (!operation) return;
    // Store only the necessary data in completed operations
    const completedData = {
      id: operation.id,
      status: operation.status,
      startTime: operation.startTime,
      endTime: operation.endTime, // We know it's not null at this point
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
  _handleProgress(operationId, progress) {
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
  getStatus(operationId) {
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
  log(operationId, level, message, meta = {}) {
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
  on(eventName, listener) {
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
  emit(eventName, data) {
    if (this.listeners.has(eventName)) {
      this.listeners.get(eventName)?.forEach((listener) => listener(data));
    }
  }
}
exports.AsyncOperationManager = AsyncOperationManager;
// Export a singleton instance
exports.asyncOperationManager = new AsyncOperationManager();
//# sourceMappingURL=async-manager.js.map
