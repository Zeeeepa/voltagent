import type {
  IWorkflowStateManager,
  WorkflowExecutionContext,
  TaskExecutionResult,
} from "./types";

/**
 * Workflow State Manager for persistence and recovery
 */
export class WorkflowStateManager implements IWorkflowStateManager {
  private persistenceEnabled: boolean;
  private inMemoryStore = new Map<string, WorkflowExecutionContext>();
  private activeWorkflows = new Set<string>();

  constructor(persistenceEnabled = false) {
    this.persistenceEnabled = persistenceEnabled;
  }

  /**
   * Check if persistence is enabled
   */
  public isPersistenceEnabled(): boolean {
    return this.persistenceEnabled;
  }

  /**
   * Save workflow execution state
   */
  public async saveWorkflowState(context: WorkflowExecutionContext): Promise<void> {
    if (!this.persistenceEnabled) {
      // Store in memory for non-persistent mode
      this.inMemoryStore.set(context.executionId, this.cloneContext(context));
      
      if (context.status === "running" || context.status === "paused") {
        this.activeWorkflows.add(context.executionId);
      } else {
        this.activeWorkflows.delete(context.executionId);
      }
      
      return;
    }

    try {
      // In a real implementation, this would save to a database
      // For now, we'll use localStorage in browser or file system in Node.js
      const serializedContext = this.serializeContext(context);
      
      if (typeof window !== "undefined" && window.localStorage) {
        // Browser environment
        localStorage.setItem(`workflow_${context.executionId}`, serializedContext);
        
        // Update active workflows list
        const activeList = this.getActiveWorkflowsList();
        if (context.status === "running" || context.status === "paused") {
          activeList.add(context.executionId);
        } else {
          activeList.delete(context.executionId);
        }
        localStorage.setItem("active_workflows", JSON.stringify(Array.from(activeList)));
        
      } else {
        // Node.js environment - use file system
        const fs = await import("fs/promises");
        const path = await import("path");
        
        const stateDir = path.join(process.cwd(), ".voltagent", "workflow-state");
        await fs.mkdir(stateDir, { recursive: true });
        
        const filePath = path.join(stateDir, `${context.executionId}.json`);
        await fs.writeFile(filePath, serializedContext, "utf8");
        
        // Update active workflows list
        const activeListPath = path.join(stateDir, "active-workflows.json");
        const activeList = await this.loadActiveWorkflowsFromFile(activeListPath);
        
        if (context.status === "running" || context.status === "paused") {
          activeList.add(context.executionId);
        } else {
          activeList.delete(context.executionId);
        }
        
        await fs.writeFile(activeListPath, JSON.stringify(Array.from(activeList)), "utf8");
      }
      
    } catch (error) {
      console.error("Failed to save workflow state:", error);
      // Fall back to in-memory storage
      this.inMemoryStore.set(context.executionId, this.cloneContext(context));
    }
  }

  /**
   * Load workflow execution state
   */
  public async loadWorkflowState(executionId: string): Promise<WorkflowExecutionContext | null> {
    // Try in-memory store first
    const inMemoryContext = this.inMemoryStore.get(executionId);
    if (inMemoryContext) {
      return this.cloneContext(inMemoryContext);
    }

    if (!this.persistenceEnabled) {
      return null;
    }

    try {
      let serializedContext: string | null = null;
      
      if (typeof window !== "undefined" && window.localStorage) {
        // Browser environment
        serializedContext = localStorage.getItem(`workflow_${executionId}`);
      } else {
        // Node.js environment
        const fs = await import("fs/promises");
        const path = await import("path");
        
        const filePath = path.join(process.cwd(), ".voltagent", "workflow-state", `${executionId}.json`);
        
        try {
          serializedContext = await fs.readFile(filePath, "utf8");
        } catch (error) {
          // File doesn't exist
          return null;
        }
      }
      
      if (!serializedContext) {
        return null;
      }
      
      return this.deserializeContext(serializedContext);
      
    } catch (error) {
      console.error("Failed to load workflow state:", error);
      return null;
    }
  }

  /**
   * Delete workflow execution state
   */
  public async deleteWorkflowState(executionId: string): Promise<void> {
    // Remove from in-memory store
    this.inMemoryStore.delete(executionId);
    this.activeWorkflows.delete(executionId);

    if (!this.persistenceEnabled) {
      return;
    }

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        // Browser environment
        localStorage.removeItem(`workflow_${executionId}`);
        
        // Update active workflows list
        const activeList = this.getActiveWorkflowsList();
        activeList.delete(executionId);
        localStorage.setItem("active_workflows", JSON.stringify(Array.from(activeList)));
        
      } else {
        // Node.js environment
        const fs = await import("fs/promises");
        const path = await import("path");
        
        const filePath = path.join(process.cwd(), ".voltagent", "workflow-state", `${executionId}.json`);
        
        try {
          await fs.unlink(filePath);
        } catch (error) {
          // File might not exist, ignore error
        }
        
        // Update active workflows list
        const activeListPath = path.join(process.cwd(), ".voltagent", "workflow-state", "active-workflows.json");
        const activeList = await this.loadActiveWorkflowsFromFile(activeListPath);
        activeList.delete(executionId);
        
        await fs.writeFile(activeListPath, JSON.stringify(Array.from(activeList)), "utf8");
      }
      
    } catch (error) {
      console.error("Failed to delete workflow state:", error);
    }
  }

  /**
   * List all active workflow execution IDs
   */
  public async listActiveWorkflows(): Promise<string[]> {
    if (!this.persistenceEnabled) {
      return Array.from(this.activeWorkflows);
    }

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        // Browser environment
        const activeList = this.getActiveWorkflowsList();
        return Array.from(activeList);
      } else {
        // Node.js environment
        const path = await import("path");
        const activeListPath = path.join(process.cwd(), ".voltagent", "workflow-state", "active-workflows.json");
        const activeList = await this.loadActiveWorkflowsFromFile(activeListPath);
        return Array.from(activeList);
      }
    } catch (error) {
      console.error("Failed to list active workflows:", error);
      return Array.from(this.activeWorkflows);
    }
  }

  /**
   * Serialize workflow context for storage
   */
  private serializeContext(context: WorkflowExecutionContext): string {
    // Convert Maps to objects for JSON serialization
    const serializable = {
      ...context,
      taskResults: Array.from(context.taskResults.entries()).map(([key, value]) => ({
        key,
        value: {
          ...value,
          startTime: value.startTime.toISOString(),
          endTime: value.endTime?.toISOString(),
        },
      })),
      globalContext: Array.from(context.globalContext.entries()),
      userContext: context.userContext ? Array.from(context.userContext.entries()) : undefined,
      startTime: context.startTime.toISOString(),
      endTime: context.endTime?.toISOString(),
    };

    return JSON.stringify(serializable, null, 2);
  }

  /**
   * Deserialize workflow context from storage
   */
  private deserializeContext(serialized: string): WorkflowExecutionContext {
    const data = JSON.parse(serialized);
    
    // Convert objects back to Maps and Dates
    const taskResults = new Map<string, TaskExecutionResult>();
    if (data.taskResults) {
      for (const item of data.taskResults) {
        const result: TaskExecutionResult = {
          ...item.value,
          startTime: new Date(item.value.startTime),
          endTime: item.value.endTime ? new Date(item.value.endTime) : undefined,
        };
        taskResults.set(item.key, result);
      }
    }

    const globalContext = new Map(data.globalContext || []);
    const userContext = data.userContext ? new Map(data.userContext) : undefined;

    return {
      ...data,
      taskResults,
      globalContext,
      userContext,
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : undefined,
    };
  }

  /**
   * Clone workflow context for immutability
   */
  private cloneContext(context: WorkflowExecutionContext): WorkflowExecutionContext {
    return {
      ...context,
      taskResults: new Map(context.taskResults),
      globalContext: new Map(context.globalContext),
      userContext: context.userContext ? new Map(context.userContext) : undefined,
    };
  }

  /**
   * Get active workflows list from localStorage
   */
  private getActiveWorkflowsList(): Set<string> {
    try {
      const stored = localStorage.getItem("active_workflows");
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to parse active workflows list:", error);
    }
    return new Set();
  }

  /**
   * Load active workflows list from file
   */
  private async loadActiveWorkflowsFromFile(filePath: string): Promise<Set<string>> {
    try {
      const fs = await import("fs/promises");
      const content = await fs.readFile(filePath, "utf8");
      return new Set(JSON.parse(content));
    } catch (error) {
      // File doesn't exist or is invalid, return empty set
      return new Set();
    }
  }

  /**
   * Clear all workflow state (for testing/cleanup)
   */
  public async clearAllState(): Promise<void> {
    this.inMemoryStore.clear();
    this.activeWorkflows.clear();

    if (!this.persistenceEnabled) {
      return;
    }

    try {
      if (typeof window !== "undefined" && window.localStorage) {
        // Browser environment - remove all workflow-related items
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith("workflow_") || key === "active_workflows")) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
      } else {
        // Node.js environment - remove state directory
        const fs = await import("fs/promises");
        const path = await import("path");
        
        const stateDir = path.join(process.cwd(), ".voltagent", "workflow-state");
        try {
          await fs.rm(stateDir, { recursive: true, force: true });
        } catch (error) {
          // Directory might not exist, ignore error
        }
      }
    } catch (error) {
      console.error("Failed to clear workflow state:", error);
    }
  }

  /**
   * Get storage statistics
   */
  public async getStorageStats(): Promise<{
    totalWorkflows: number;
    activeWorkflows: number;
    storageSize: number;
  }> {
    const activeCount = this.activeWorkflows.size;
    let totalCount = this.inMemoryStore.size;
    let storageSize = 0;

    if (this.persistenceEnabled) {
      try {
        if (typeof window !== "undefined" && window.localStorage) {
          // Browser environment
          let size = 0;
          let count = 0;
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith("workflow_")) {
              const value = localStorage.getItem(key);
              if (value) {
                size += value.length;
                count++;
              }
            }
          }
          totalCount = count;
          storageSize = size;
        } else {
          // Node.js environment
          const fs = await import("fs/promises");
          const path = await import("path");
          
          const stateDir = path.join(process.cwd(), ".voltagent", "workflow-state");
          try {
            const files = await fs.readdir(stateDir);
            const workflowFiles = files.filter(file => file.endsWith(".json") && file !== "active-workflows.json");
            totalCount = workflowFiles.length;
            
            // Calculate total size
            for (const file of workflowFiles) {
              const filePath = path.join(stateDir, file);
              const stats = await fs.stat(filePath);
              storageSize += stats.size;
            }
          } catch (error) {
            // Directory doesn't exist
          }
        }
      } catch (error) {
        console.error("Failed to get storage stats:", error);
      }
    }

    return {
      totalWorkflows: totalCount,
      activeWorkflows: activeCount,
      storageSize,
    };
  }
}

