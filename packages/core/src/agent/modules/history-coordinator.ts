import type { AgentHistoryEntry, HistoryManager } from "../history";
import type { MemoryManager } from "../../memory";
import type { StepWithContent } from "../providers";
import type { OperationContext } from "../types";
import { NodeType, createNodeId } from "../../utils/node-utils";

/**
 * Coordinates history management and memory operations for agents
 */
export class HistoryCoordinator {
  constructor(
    private agentId: string,
    private historyManager: HistoryManager,
    private memoryManager: MemoryManager,
  ) {}

  /**
   * Initialize history for a new operation
   */
  async initializeHistory(
    input: string | any[],
    context: OperationContext,
    eventUpdater: (update: any) => Promise<void>,
  ): Promise<void> {
    const historyId = context.historyEntryId;
    if (!historyId) return;

    // Create initial history entry
    const historyEntry: AgentHistoryEntry = {
      id: historyId,
      agentId: this.agentId,
      input: typeof input === "string" ? input : JSON.stringify(input),
      output: "",
      status: "running",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      steps: [],
      timeline: [],
      parentAgentId: context.parentAgentId,
      parentHistoryEntryId: context.parentHistoryEntryId,
    };

    // Handle user context
    if (context?.userContext && context.userContext.size > 0) {
      const userContextData: Record<string, any> = {};
      for (const [key, value] of context.userContext.entries()) {
        userContextData[key] = value;
      }
      historyEntry.userContext = userContextData;
    }

    await this.historyManager.addEntry(historyEntry);

    // Emit initialization event
    await eventUpdater({
      type: "agent",
      status: "started",
      data: {
        input: typeof input === "string" ? input : JSON.stringify(input),
        historyEntryId: historyId,
      },
    });
  }

  /**
   * Get agent history
   */
  async getHistory(): Promise<AgentHistoryEntry[]> {
    return await this.historyManager.getHistory();
  }

  /**
   * Add step to history
   */
  addStepToHistory(step: StepWithContent, context: OperationContext): void {
    if (!context.historyEntryId) return;
    
    this.historyManager.addStep(context.historyEntryId, step);
  }

  /**
   * Update history entry
   */
  updateHistoryEntry(context: OperationContext, updates: Partial<AgentHistoryEntry>): void {
    if (!context.historyEntryId) return;
    
    this.historyManager.updateEntry(context.historyEntryId, updates);
  }

  /**
   * Finalize history entry
   */
  async finalizeHistory(
    context: OperationContext,
    result: any,
    status: "completed" | "failed" = "completed",
  ): Promise<void> {
    if (!context.historyEntryId) return;

    const updates: Partial<AgentHistoryEntry> = {
      output: typeof result === "string" ? result : JSON.stringify(result),
      status,
      updatedAt: new Date().toISOString(),
    };

    this.updateHistoryEntry(context, updates);

    // Save to memory if configured
    try {
      const historyEntry = await this.historyManager.getEntry(context.historyEntryId);
      if (historyEntry) {
        await this.memoryManager.saveConversation(
          context.historyEntryId,
          [
            {
              role: "user",
              content: historyEntry.input,
            },
            {
              role: "assistant", 
              content: historyEntry.output || "",
            },
          ],
          context,
        );
      }
    } catch (error) {
      console.warn("Failed to save conversation to memory:", error);
    }
  }

  /**
   * Get full agent state including history
   */
  getFullState() {
    return {
      agentId: this.agentId,
      historyManager: this.historyManager,
      memoryManager: this.memoryManager,
    };
  }

  /**
   * Get history manager instance
   */
  getHistoryManager(): HistoryManager {
    return this.historyManager;
  }
}

