import type { BaseMessage } from "../providers";
import type { ToolManager } from "../../tool";
import type { SubAgentManager } from "../subagent";
import type { BaseRetriever } from "../../retriever/retriever";

/**
 * Handles message processing and system message generation for agents
 */
export class MessageProcessor {
  constructor(
    private instructions: string,
    private markdown: boolean,
    private toolManager: ToolManager,
    private subAgentManager: SubAgentManager,
    private retriever?: BaseRetriever,
  ) {}

  /**
   * Get the system message for the agent
   */
  async getSystemMessage({
    input,
    historyEntryId,
    contextMessages,
  }: {
    input?: string | BaseMessage[];
    historyEntryId: string;
    contextMessages: BaseMessage[];
  }): Promise<BaseMessage> {
    let baseInstructions = this.instructions || ""; // Ensure baseInstructions is a string

    // --- Add Instructions from Toolkits --- (Simplified Logic)
    let toolInstructions = "";
    // Get only the toolkits
    const toolkits = this.toolManager.getToolkits();
    for (const toolkit of toolkits) {
      // Check if the toolkit wants its instructions added
      if (toolkit.addInstructions && toolkit.instructions) {
        // Append toolkit instructions
        toolInstructions += `\n\n${toolkit.instructions}`;
      }
    }
    if (toolInstructions) {
      baseInstructions += toolInstructions;
    }

    if (this.markdown) {
      baseInstructions += "\n\nFormat your responses using Markdown.";
    }

    // Add retrieval context if available
    if (this.retriever && input && historyEntryId) {
      try {
        const retrievalResults = await this.retriever.retrieve({
          query: typeof input === "string" ? input : input.map((m) => m.content).join(" "),
          historyEntryId,
        });

        if (retrievalResults && retrievalResults.length > 0) {
          const context = retrievalResults.map((result) => result.content).join("\n\n");
          if (context?.trim()) {
            baseInstructions += `\n\nRelevant context:\n${context}`;
          }
        }
      } catch (error) {
        console.warn("Failed to retrieve context:", error);
      }
    }

    // Add sub-agent context
    const subAgentContext = await this.prepareAgentsMemory(contextMessages);
    if (subAgentContext) {
      baseInstructions += `\n\n${subAgentContext}`;
    }

    return {
      role: "system",
      content: baseInstructions,
    };
  }

  /**
   * Prepare sub-agents memory context
   */
  private async prepareAgentsMemory(contextMessages: BaseMessage[]): Promise<string> {
    if (this.subAgentManager.hasSubAgents()) {
      const subAgents = this.subAgentManager.getSubAgents();
      
      // Get memory from all sub-agents
      const subAgentMemories = await Promise.all(
        subAgents.map(async (agent) => {
          const history = await agent.getHistory();
          return {
            agentName: agent.name,
            memory: history.slice(-5), // Get last 5 entries
          };
        }),
      );

      if (subAgents.length === 0) return "";

      // Format sub-agent memories
      const formattedMemories = subAgentMemories
        .filter((memory) => memory.memory.length > 0)
        .map((memory) => {
          const memoryText = memory.memory
            .map((entry) => `${entry.role}: ${entry.content}`)
            .join("\n");
          return `Sub-agent ${memory.agentName}:\n${memoryText}`;
        })
        .join("\n\n");

      return formattedMemories ? `Sub-agent context:\n${formattedMemories}` : "";
    }

    return "";
  }

  /**
   * Format input messages for processing
   */
  async formatInputMessages(
    input: string | BaseMessage[],
    contextMessages: BaseMessage[],
  ): Promise<BaseMessage[]> {
    if (typeof input === "string") {
      return [
        ...contextMessages,
        {
          role: "user",
          content: input,
        },
      ];
    }

    return [...contextMessages, ...input];
  }
}

